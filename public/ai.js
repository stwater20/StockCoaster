// 「AI 預言家」：技術指標 + 蒙地卡羅模擬的玩具模型。純屬娛樂，不構成投資建議。

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

  const signals = [];
  if (ma20 > ma60) signals.push('MA20 站上 MA60（多頭排列）');
  else signals.push('MA20 跌破 MA60（空頭排列）');
  if (r14 > 70) signals.push(`RSI ${r14.toFixed(0)} 過熱，小心有人下車`);
  else if (r14 < 30) signals.push(`RSI ${r14.toFixed(0)} 超賣，地板很硬？`);
  else signals.push(`RSI ${r14.toFixed(0)} 溫和`);
  signals.push(`近月動能 ${(mom * 100).toFixed(1)}%`);

  const mood = pUp > 0.55 ? '🔮 水晶球泛紅光' : pUp < 0.45 ? '🔮 水晶球冒綠煙' : '🔮 水晶球一片霧茫茫';
  const fortunes = pUp > 0.55
    ? ['前方坡道向上，記得拍照。', '天機：漲。但天機常常洩漏錯的。', '我看到紅色……也可能是我眼睛充血。']
    : pUp < 0.45
      ? ['前方有下坡，雙手舉高比較好玩。', '天機：跌。抱緊你旁邊的乘客。', '綠色的光芒……是不是草地？']
      : ['五五波。這不是預測，這是擲硬幣。', '多空交戰中，預言家去泡茶了。', '前方路況：雲霧繚繞，請慢行。'];

  return {
    horizon, sigma, pUp, last,
    median: med, p10: bands.p10[horizon], p90: bands.p90[horizon],
    bands, path: best, signals, mood,
    fortune: fortunes[Math.floor(Math.random() * fortunes.length)],
    confidence: Math.round(Math.abs(pUp - 0.5) * 200),
  };
}
