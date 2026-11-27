// 台股資料：熱門清單、期間計算、抓取（本機 Yahoo 代理 → FinMind → 離線模擬）
export const PRESETS = [
  { code: '2330', name: '台積電', tag: '護國神山' },
  { code: '0050', name: '元大台灣50', tag: 'ETF' },
  { code: '2317', name: '鴻海', tag: '' },
  { code: '2454', name: '聯發科', tag: '' },
  { code: '2603', name: '長榮', tag: '航海王' },
  { code: '2382', name: '廣達', tag: 'AI' },
  { code: '0056', name: '元大高股息', tag: 'ETF' },
  { code: '00878', name: '國泰永續高股息', tag: 'ETF' },
];

export const KNOWN = {
  '2330': '台積電', '0050': '元大台灣50', '2317': '鴻海', '2454': '聯發科', '2603': '長榮', '2382': '廣達',
  '0056': '元大高股息', '00878': '國泰永續高股息', '00919': '群益台灣精選高息', '006208': '富邦台50',
  '2308': '台達電', '2412': '中華電', '2881': '富邦金', '2882': '國泰金', '2891': '中信金', '2886': '兆豐金',
  '3008': '大立光', '2609': '陽明', '2615': '萬海', '3231': '緯創', '2357': '華碩', '2376': '技嘉',
  '3711': '日月光投控', '2303': '聯電', '6505': '台塑化', '1301': '台塑', '2002': '中鋼', '2618': '長榮航',
  '3661': '世芯-KY', '6488': '環球晶', '5274': '信驊', '8299': '群聯', '3529': '力旺', '6669': '緯穎',
  '1216': '統一', '2207': '和泰車', '2912': '統一超', '00940': '元大台灣價值高息', '00929': '復華台灣科技優息',
};

export const RANGES = {
  '3mo': { label: '3 個月', months: 3 },
  '6mo': { label: '半年', months: 6 },
  'ytd': { label: '今年', months: 0 },
  '1y': { label: '1 年', months: 12 },
  '2y': { label: '2 年', months: 24 },
  '5y': { label: '5 年', months: 60 },
  '10y': { label: '10 年', months: 120 },
};

const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const todayTPE = () => new Date(Date.now() + 8 * 3600 * 1000);

// 把 range / 自訂日期換成實際的起訖日（台北時間）
export function resolveDates(q) {
  const end = q.range === 'custom' && q.end ? q.end : ymd(todayTPE());
  if (q.range === 'custom' && q.start) return { start: q.start, end };
  const e = new Date(end + 'T00:00:00Z');
  let s;
  if (q.range === 'ytd') {
    s = new Date(Date.UTC(e.getUTCFullYear(), 0, 1));
    if ((e - s) / 86400000 < 20) s = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth() - 3, e.getUTCDate()));
  } else {
    const m = (RANGES[q.range] || RANGES['1y']).months;
    s = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth() - m, e.getUTCDate()));
  }
  return { start: ymd(s), end };
}
export const spanDays = (start, end) => (Date.parse(end) - Date.parse(start)) / 86400000;

const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || location.hostname.endsWith('.localhost');

export async function loadStock(code, q) {
  code = code.toUpperCase().replace(/\.TWO?$/, '');
  const { start, end } = resolveDates(q);
  if (spanDays(start, end) < 14) throw new Error('期間太短，至少選兩週');
  const weekly = spanDays(start, end) > 3 * 366;
  let j = null, lastErr = null;

  if (isLocal) {
    try {
      const r = await fetch(`/api/chart?code=${encodeURIComponent(code)}&start=${start}&end=${end}`);
      const body = await r.json();
      if (r.ok) j = body; else lastErr = new Error(body.error || r.statusText);
      // Yahoo 早期資料缺很多（例如 0050 只到 2009），開頭差超過一個月就改抓 FinMind
      if (j && j.points?.length && j.points[0].t * 1000 - Date.parse(start) > 35 * 864e5) j = null;
    } catch (e) { lastErr = e; }
  }
  if (!j) {
    try { j = await finmind(code, start, end, weekly); } catch (e) { lastErr = e; }
  }
  if (!j) {
    if (lastErr instanceof TypeError) return simulate(code, start, end, weekly);
    throw lastErr || new Error('查無資料');
  }
  j.code = code;
  const name = KNOWN[code] || j.zhName || j.name;
  j.zhName = name;
  j.displayName = `${name} ${code}`;
  j.start = start; j.end = end;
  j.simulated = false;
  return j;
}

async function finmind(code, start, end, weekly) {
  const base = 'https://api.finmindtrade.com/api/v4/data';
  const r = await fetch(`${base}?dataset=TaiwanStockPrice&data_id=${encodeURIComponent(code)}&start_date=${start}&end_date=${end}`);
  const body = await r.json();
  if (!r.ok || body.status !== 200) throw new Error(body.msg?.includes('limit') ? '資料源今天被問太多次了，稍後再試' : `抓不到 ${code}：${body.msg || r.status}`);
  let pts = body.data.filter((d) => d.close > 0).map((d) => ({
    t: Date.parse(d.date + 'T13:30:00+08:00') / 1000, o: d.open, h: d.max, l: d.min, c: d.close, v: d.Trading_Volume,
  }));
  if (pts.length < 10) throw new Error(`${code} 在這段期間的交易資料太少（可能代號不存在）`);
  pts = adjustSplits(pts);
  if (weekly) pts = toWeekly(pts);
  let name = KNOWN[code];
  if (!name) {
    try {
      const ir = await fetch(`${base}?dataset=TaiwanStockInfo&data_id=${encodeURIComponent(code)}`);
      name = (await ir.json()).data?.[0]?.stock_name;
    } catch { /* 名稱拿不到就算了 */ }
  }
  return { symbol: code, name: name || code, zhName: name, interval: weekly ? '1wk' : '1d', points: pts };
}

// 台股漲跌幅 10%，單日超出 ±40% 幾乎一定是分割／合併，往前還原
function adjustSplits(pts) {
  let m = 1;
  const out = pts.map((p) => ({ ...p }));
  for (let i = out.length - 1; i > 0; i--) {
    const r = pts[i].c / pts[i - 1].c;
    if (r < 0.6 || r > 1.7) m *= r;
    if (m !== 1) {
      const p = out[i - 1];
      p.o *= m; p.h *= m; p.l *= m; p.c *= m; p.v /= m;
    }
  }
  return out;
}

function toWeekly(pts) {
  const out = [];
  let cur = null, key = null;
  for (const p of pts) {
    const d = new Date((p.t + 8 * 3600) * 1000);
    const monday = Math.floor((d.getTime() / 86400000 - ((d.getUTCDay() + 6) % 7)));
    if (monday !== key) { if (cur) out.push(cur); key = monday; cur = { ...p }; }
    else { cur.h = Math.max(cur.h, p.h); cur.l = Math.min(cur.l, p.l); cur.c = p.c; cur.v += p.v; cur.t = p.t; }
  }
  if (cur) out.push(cur);
  return out;
}

function simulate(code, start, end, weekly) {
  const days = Math.max(20, Math.round((spanDays(start, end) / 7) * (weekly ? 1 : 5)));
  let seed = [...code].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
  let p = 100 + rnd() * 900;
  const vol = weekly ? 0.04 : 0.018;
  const pts = [];
  const t0 = Date.parse(start) / 1000, t1 = Date.parse(end) / 1000;
  for (let i = 0; i < days; i++) {
    const shock = rnd() < 0.02 ? gauss() * 4 : 0;
    p *= Math.exp(0.0004 + vol * (gauss() + shock));
    pts.push({ t: Math.round(t0 + ((t1 - t0) * i) / days), o: p, h: p * 1.01, l: p * 0.99, c: p, v: 1e6 * (1 + rnd() * 4) });
  }
  const name = KNOWN[code] || code;
  return { code, symbol: code, name, zhName: name, displayName: `${name}（模擬）`, interval: weekly ? '1wk' : '1d', points: pts, simulated: true, start, end };
}
