// 台股資料：熱門清單、抓取、離線模擬備援
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

export async function loadStock(code, range) {
  try {
    const r = await fetch(`/api/chart?code=${encodeURIComponent(code)}&range=${range}`);
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || r.statusText);
    const bare = j.symbol.replace(/\.TWO?$/, '');
    j.code = bare;
    j.displayName = KNOWN[bare] ? `${KNOWN[bare]} ${bare}` : `${j.name} ${bare}`;
    j.simulated = false;
    return j;
  } catch (e) {
    // 沒有伺服器（直接開 html）或網路不通 → 用模擬資料，照樣能玩
    if (e instanceof TypeError || String(e).includes('JSON')) return simulate(code, range);
    throw e;
  }
}

function simulate(code, range) {
  const days = { '3mo': 63, '6mo': 125, '1y': 245, '2y': 490, '5y': 260 }[range] || 245;
  const weekly = range === '5y';
  let seed = [...code].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
  let p = 100 + rnd() * 900;
  const vol = weekly ? 0.04 : 0.018;
  const pts = [];
  const now = Date.now() / 1000;
  const step = weekly ? 7 * 86400 : 86400 * 1.45;
  for (let i = 0; i < days; i++) {
    const shock = rnd() < 0.02 ? gauss() * 4 : 0;
    p *= Math.exp(0.0004 + vol * (gauss() + shock));
    pts.push({ t: Math.round(now - (days - i) * step), o: p, h: p * 1.01, l: p * 0.99, c: p, v: 1e6 * (1 + rnd() * 4) });
  }
  return { code, symbol: code, name: code, displayName: `${KNOWN[code] || code}（模擬）`, interval: weekly ? '1wk' : '1d', points: pts, simulated: true };
}
