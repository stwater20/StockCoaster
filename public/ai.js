// AI 走勢推演：技術指標 + 蒙地卡羅模擬的統計模型。純屬娛樂，不構成投資建議。

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sma = (a, n) => mean(a.slice(-n));

function rsi(closes, n = 14) {
  let g = 0, l = 0;
  for (let i = closes.length - n; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) g += d; else l -= d;
  }
  if (l === 0) return 100;
  return 100 - 100 / (1 + g / l);
}

function seeded(seed) {
  let s = seed >>> 0 || 1;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  return () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
}

export function predict(points, horizon = 30, nPaths = 600) {
  const c = points.map((p) => p.c);
  const last = c[c.length - 1];
  const rets = [];
  for (let i = 1; i < c.length; i++) rets.push(Math.log(c[i] / c[i - 1]));

  // EWMA 波動度
  let v = rets.slice(0, 20).reduce((s, r) => s + r * r, 0) / 20;
  for (const r of rets) v = 0.94 * v + 0.06 * r * r;
  const sigma = Math.sqrt(v);

  // 訊號
  const n = c.length;
  const ma20 = sma(c, Math.min(20, n));
  const ma60 = sma(c, Math.min(60, n));
  const r14 = n > 15 ? rsi(c) : 50;
  const mom = Math.log(last / c[Math.max(0, n - 21)]); // 近一個月動能
  const longDrift = mean(rets);

  // 混合漂移：長期均值 + 動能 + 均線 − RSI 過熱修正（再縮小，避免玩具太自信）
  let score = 0;
  score += Math.sign(ma20 - ma60) * 0.4;
  score += Math.tanh(mom / (sigma * 4.5)) * 0.6;
  score += r14 > 75 ? -0.5 : r14 < 25 ? 0.5 : 0;
  const drift = 0.5 * longDrift + score * sigma * 0.06;

  const gauss = seeded(Math.round(last * 1000) + n);
  const paths = [];
  for (let k = 0; k < nPaths; k++) {
    const p = [last];
    let x = last;
    for (let t = 0; t < horizon; t++) {
      const fat = Math.random() < 0.03 ? 2.2 : 1; // 偶爾來個黑天鵝
      x *= Math.exp(drift - 0.5 * sigma * sigma + sigma * fat * gauss());
      p.push(x);
    }
    paths.push(p);
  }

  const q = (arr, f) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(f * (s.length - 1))]; };
  const bands = { p10: [], p50: [], p90: [] };
  for (let t = 0; t <= horizon; t++) {
    const col = paths.map((p) => p[t]);
    bands.p10.push(q(col, 0.1)); bands.p50.push(q(col, 0.5)); bands.p90.push(q(col, 0.9));
  }
  const finals = paths.map((p) => p[horizon]);
  const med = bands.p50[horizon];
  // 挑一條最接近中位數終點、又有點起伏的路徑當作「AI 軌道」，看起來才像真的股價
  let best = paths[0], bestD = Infinity;
  for (const p of paths) {
    const d = Math.abs(p[horizon] - med);
    if (d < bestD) { bestD = d; best = p; }
  }
  const pUp = finals.filter((x) => x > last).length / finals.length;

  // 年化波動度（日線 252、週線 52）
  const stepDays = (points[points.length - 1].t - points[0].t) / 86400 / Math.max(1, points.length - 1);
  const annVol = sigma * Math.sqrt(stepDays > 3 ? 52 : 252);
  const p10 = bands.p10[horizon], p90 = bands.p90[horizon];
  const width = (p90 - p10) / last;

  // 訊號：短、白話、不賣弄
  const signals = [
    { k: '均線', v: ma20 > ma60 ? '多頭排列' : '空頭排列', tone: ma20 > ma60 ? 1 : -1 },
    { k: 'RSI', v: `${r14.toFixed(0)}・${r14 > 70 ? '過熱' : r14 < 30 ? '超賣' : '中性'}`, tone: r14 > 70 ? -1 : r14 < 30 ? 1 : 0 },
    { k: '近月動能', v: `${mom >= 0 ? '+' : ''}${(mom * 100).toFixed(1)}%`, tone: Math.sign(mom) },
    { k: '年化波動', v: `${(annVol * 100).toFixed(0)}%`, tone: 0 },
  ];
  const stance = pUp >= 0.55 ? '偏多' : pUp <= 0.45 ? '偏空' : '中性';
  let read;
  if (width > 0.35) read = `波動很大，80% 區間寬達 ${(width * 100).toFixed(0)}%，看區間比看方向實際。`;
  else if (stance === '偏多') read = ma20 > ma60 ? '均線與動能同向偏多，模擬多數收在今天之上。' : '模擬略偏多，但均線還沒翻多，訊號不太一致。';
  else if (stance === '偏空') read = ma20 < ma60 ? '均線與動能偏弱，模擬多數收在今天之下。' : '模擬略偏空，但均線仍是多頭排列，訊號分歧。';
  else read = '多空訊號互相抵銷，方向接近五五波。';

  return {
    horizon, sigma, pUp, last,
    median: med, p10: bands.p10[horizon], p90: bands.p90[horizon],
    bands, path: best, signals, stance, read, annVol,
  };
}
