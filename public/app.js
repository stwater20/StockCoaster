import { PRESETS, KNOWN, RANGES, loadStock, resolveDates, spanDays } from './data.js';
import { drawBackground } from './bg.js';
import { placeItems, collide, drawItems, popText, drawFloats, JUMP_V, JUMP_G } from './game.js';
import { LINKS, draw101, drawTemple, drawStore, drawBoba, drawLanterns, drawGacha, drawParking, drawNoodle, drawGas, drawBillboard } from './taiwan.js';
import { createStreet, updateStreet, drawBackdrop, drawRoad } from './street.js';
import { predict } from './ai.js';
import { ACHIEVEMENTS, store } from './achievements.js';
import { Sfx, Music } from './audio.js';
import { drawText, textWidth, carSprite } from './pixel.js';

const $ = (id) => document.getElementById(id);
const sfx = new Sfx();
const music = new Music(sfx);
music.useTracks({ up: new URL('music/bgm-up.m4a', import.meta.url).href, down: new URL('music/bgm-down.m4a', import.meta.url).href }); // 個股頁在 /2330/ 底下，路徑要以 app.js 為準
const PAX = ['🐻', '🐱', '🐸', '🧓', '🦖', '🐧'];

// ---- 世界座標（像素）----
const LH = 216;        // 世界高度
const GROUND = 192;    // 地面
const TOP = 36;        // 最高價軌道高度
const RANGE = 96;      // 最高到最低價的像素落差
const MPP = 0.5;       // 每像素幾公尺（物理用）
const LEADPX = 70, TAILPX = 90, PAD = 260;
const HORIZON = 30;
const G = 9.8;

const ui = { code: '2330', range: '1y', start: '', end: '', pax: '🐻', guess: 'skip', spd: 1, moon: false, mode: 'auto' };
const APP_ROOT = new URL('./', import.meta.url);
const CODE_RE = /^[0-9A-Z]{4,6}$/;
let NAMES = { ...KNOWN };

// 從網址讀初始設定：/2330/、?code=2330、?range=5y、?start=2020-01-01&end=2024-12-31
(function readURL() {
  const q = new URLSearchParams(location.search);
  const seg = decodeURIComponent(location.pathname.slice(APP_ROOT.pathname.length).split('/')[0] || '').toUpperCase();
  const code = (document.documentElement.dataset.code || q.get('code') || seg || '').toUpperCase();
  if (CODE_RE.test(code)) ui.code = code;
  const r = q.get('range');
  if (r && (RANGES[r] || r === 'custom')) ui.range = r;
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (re.test(q.get('start') || '') && re.test(q.get('end') || '')) { ui.range = 'custom'; ui.start = q.get('start'); ui.end = q.get('end'); }
})();
const rangeKey = () => `${ui.code}|${ui.range}|${ui.range === 'custom' ? ui.start + '~' + ui.end : ''}`;
function shareURL() {
  const u = new URL(`${ui.code}/`, APP_ROOT);
  if (ui.range === 'custom') { u.searchParams.set('start', ui.start); u.searchParams.set('end', ui.end); }
  else if (ui.range !== '1y') u.searchParams.set('range', ui.range);
  return u.href;
}
let mode = 'menu';
let track = null;
let ride = null;
let previewToken = 0;

// ---------- 主題 ----------
const THEMES = {
  dark: {
    sky: { base: ['#141633', '#3d2f63'], up: ['#3a1030', '#b0464c'], down: ['#061d27', '#1d6656'], ai: ['#170a35', '#5d34a3'] },
    mtn: ['#2a2b55', '#1f2045'], far: '#191b38', farWin: '#3b3f7a',
    bld: [0.66, 0.35, 0.16], win: ['#ffd76a', '#ffb347', '#9fd3ff'], roof: '#1d2148',
    grass: '#2f7d4f', grass2: '#245f3d', dirt: '#2e2236', dirt2: '#3a2c44',
    support: '#6b6f8f', brace: '#4a4d6a', tie: '#2a2d42', flat: '#a7acc4',
    label: '#c9cdf0', labelShadow: '#0b0c1c', stars: true,
  },
  light: {
    sky: { base: ['#5bb8ff', '#d9f2ff'], up: ['#ff8f7a', '#ffe8c8'], down: ['#4fc7b0', '#e0fff4'], ai: ['#a890ff', '#f1eaff'] },
    mtn: ['#9cc4ea', '#b9d8f2'], far: '#c8dcf0', farWin: '#e9f3ff',
    bld: [0.6, 0.35, 0.78], win: ['#ffffff', '#cfe8ff', '#fff3c4'], roof: '#ffffff',
    grass: '#5cc463', grass2: '#46a84e', dirt: '#c99868', dirt2: '#b5845a',
    support: '#8a90a8', brace: '#a9aec4', tie: '#5b6078', flat: '#6b7088',
    label: '#2d3150', labelShadow: '#ffffff', stars: false,
  },
};
let theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
const TH = () => THEMES[theme];

// ---------- 畫布 ----------
const cv = $('scene');
const ctx = cv.getContext('2d');
let W = 384, Hc = 256, offY = 40;
function resize() {
  const ps = Math.max(1, Math.min(innerHeight / (LH + 44), innerWidth / (innerWidth < innerHeight ? 150 : 250)));
  W = Math.ceil(innerWidth / ps);
  Hc = Math.ceil(innerHeight / ps);
  cv.width = W; cv.height = Hc;
  offY = Hc - LH;
  ctx.imageSmoothingEnabled = false;
}
resize();
addEventListener('resize', resize);

// ---------- 小工具 ----------
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const fmtP = (p) => p.toLocaleString('zh-TW', { minimumFractionDigits: p < 100 ? 2 : 1, maximumFractionDigits: p < 100 ? 2 : 1 });
const fmtPx = (p) => (p < 100 ? p.toFixed(2) : p < 1000 ? p.toFixed(1) : Math.round(p).toString());
const fmtPct = (r, d = 2) => `${r >= 0 ? '+' : ''}${(r * 100).toFixed(d)}%`;
const fmtDate = (t) => new Date(t * 1000).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' });
const cls = (r) => (r > 0 ? 'up' : r < 0 ? 'down' : '');
const tpe = (t) => new Date((t + 8 * 3600) * 1000);
function seeded(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

function pxLine(c, x0, y0, x1, y1) {
  x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy;
  for (;;) {
    c.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
}

// ---------- 鋪軌道 ----------
function buildTrack(data) {
  const pts = data.points;
  const N = pts.length;
  const pred = predict(pts, HORIZON);
  const closes = pts.map((p) => p.c).concat(pred.path.slice(1));
  const T = closes.length;
  const lo = Math.min(...closes), hi = Math.max(...closes);
  const yOf = (p) => TOP + (1 - (p - lo) / (hi - lo || 1)) * RANGE;
  const dx = clamp(Math.round(2600 / N), 6, 16); // 每個交易日的寬度：拉長一點，坡度才不會太陡
  const X0 = PAD + LEADPX;
  const Xend = X0 + (T - 1) * dx;
  const Xtoday = X0 + (N - 1) * dx;
  const worldW = Xend + TAILPX + PAD;
  const weekly = data.interval === '1wk';

  const times = pts.map((p) => p.t);
  let t = times[N - 1];
  for (let j = 0; j < HORIZON; j++) {
    do { t += weekly ? 7 * 86400 : 86400; } while (!weekly && [0, 6].includes(tpe(t).getUTCDay()));
    times.push(t);
  }

  // 每一像素欄的軌道高度（Catmull-Rom 平滑）
  const dayY = closes.map(yOf);
  const ys = new Float32Array(worldW);
  for (let x = 0; x < worldW; x++) {
    if (x <= X0) { ys[x] = dayY[0]; continue; }
    if (x >= Xend) { ys[x] = dayY[T - 1]; continue; }
    const u = (x - X0) / dx, i = Math.floor(u), f = u - i;
    const p0 = dayY[Math.max(0, i - 1)], p1 = dayY[i], p2 = dayY[Math.min(T - 1, i + 1)], p3 = dayY[Math.min(T - 1, i + 2)];
    ys[x] = 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
  }
  // 平滑兩次（移動平均），把單日尖刺磨圓，避免太陡、車子抖動
  const r = Math.max(2, Math.round(dx * 0.7));
  for (let pass = 0; pass < 2; pass++) {
    const src = ys.slice();
    for (let x = X0 + 1; x < Xend; x++) {
      let sum = 0, n = 0;
      for (let k = -r; k <= r; k++) { sum += src[clamp(x + k, X0, Xend)]; n++; }
      ys[x] = sum / n;
    }
  }
  const S = new Float64Array(worldW);
  for (let x = 1; x < worldW; x++) S[x] = S[x - 1] + Math.hypot(1, ys[x] - ys[x - 1]) * MPP;

  track = {
    data, pred, N, T, closes, times, lo, hi, dx, X0, Xend, Xtoday, worldW, ys, S, weekly, yOf,
    sStart: S[PAD + 24], sEnd: S[Xend], sStop: S[worldW - PAD - 20],
  };
  track.canvas = renderWorld(track);
  return track;
}

function xAtS(s) {
  const S = track.S;
  let a = 0, b = S.length - 1;
  if (s <= 0) return 0;
  if (s >= S[b]) return b;
  while (b - a > 1) { const m = (a + b) >> 1; if (S[m] <= s) a = m; else b = m; }
  return a + (s - S[a]) / (S[b] - S[a] || 1);
}
function yAtX(x) {
  const ys = track.ys, i = clamp(Math.floor(x), 0, ys.length - 2), f = x - i;
  return ys[i] + (ys[i + 1] - ys[i]) * f;
}
const dayAtX = (x) => (x - track.X0) / track.dx;

// 靜態世界預先畫在一張長畫布上
function renderWorld(tr) {
  const th = TH();
  const c = document.createElement('canvas');
  c.width = tr.worldW; c.height = LH;
  const g = c.getContext('2d');
  const { N, T, closes, dx, X0, Xtoday, Xend, worldW, ys, times, pred, yOf, weekly } = tr;
  const rnd = seeded(tr.data.code.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7));
  const cUp = hex('#ff4757'), cDown = hex('#2ed573'), cFlat = hex(th.flat), cAI = hex('#b57bff');
  const chgOf = (d) => (d <= 0 ? 0 : closes[d] / closes[d - 1] - 1);

  // 成交量城市：每個交易日一棟樓
  const vols = tr.data.points.map((p) => p.v || 0);
  const maxV = Math.max(...vols) || 1;
  const iMaxV = vols.indexOf(maxV);
  const dark = theme === 'dark';
  let skip = 0, lastTop = null;
  const worldSpots = [];
  let billboardDone = false;
  for (let i = 0; i < N; i++) {
    const w = Math.max(3, dx - 1);
    const bx = X0 + i * dx - Math.floor(w / 2);
    const h = Math.round(8 + Math.sqrt(vols[i] / maxV) * 58);
    const top = GROUND - h;
    const r = chgOf(i);
    if (skip) { skip--; continue; }
    // 台灣街景：成交量最大那天是 101，其餘偶爾是廟、超商
    if (i === iMaxV) { draw101(g, X0 + i * dx, GROUND, h + 22, dark); lastTop = null; continue; }
    const kind = rnd();
    if (h < 26 && kind < 0.09 && i + 2 < N && i + 2 !== iMaxV && i + 1 !== iMaxV) {
      drawTemple(g, bx, GROUND, dx * 3 - 1);
      worldSpots.push({ x: bx - 3, y: GROUND - 23, w: dx * 3 + 6, h: 23, ...LINKS.temple });
      skip = 2; lastTop = null; continue;
    }
    if (h < 30 && kind < 0.2) { drawStore(g, bx, GROUND, w, Math.max(10, h)); lastTop = null; continue; }
    const [hh, ss, ll] = th.bld;
    g.fillStyle = `hsl(${(hh * 360 + (rnd() - 0.5) * 18) | 0} ${ss * 100}% ${((ll + (rnd() - 0.5) * 0.06) * 100).toFixed(1)}%)`;
    g.fillRect(bx, top, w, h);
    g.fillStyle = rgb(mix(hex(th.roof), r >= 0 ? cUp : cDown, theme === 'dark' ? 0.35 : 0.45));
    g.fillRect(bx, top, w, 1);
    for (let wy = top + 3; wy < GROUND - 3; wy += 3)
      for (let wx = bx + 1; wx < bx + w - 1; wx += 2)
        if (rnd() < 0.38) { g.fillStyle = th.win[(rnd() * th.win.length) | 0]; g.fillRect(wx, wy, 1, 1); }
    if (!billboardDone && h > 44 && i > N * 0.15 && w * 4 >= 30) {
      billboardDone = true;
      worldSpots.push(drawBillboard(g, bx + (w >> 1) - 18, top));
    } else if (rnd() < 0.08 && h > 40) { g.fillStyle = '#ff4757'; g.fillRect(bx + (w >> 1), top - 4, 1, 4); }
    else if (rnd() < 0.06 && w >= 5) drawBoba(g, bx + (w >> 1) - 2, top);
    if (lastTop && rnd() < 0.12) drawLanterns(g, lastTop[0], lastTop[1] + 2, bx + 1, top + 2);
    lastTop = [bx + w - 1, top];
  }

  // 支架（AI 段沒有——未來本來就沒有根據）
  const posts = [];
  for (let x = PAD + 8; x <= Xtoday; x += 14) posts.push(x);
  g.fillStyle = th.brace;
  for (let k = 0; k < posts.length - 1; k++) {
    const a = posts[k], b = posts[k + 1];
    const top = Math.max(ys[a], ys[b]) + 6;
    for (let y = top; y < GROUND - 4; y += 14) {
      pxLine(g, a, y, b, Math.min(GROUND - 1, y + 14));
      pxLine(g, b, y, a, Math.min(GROUND - 1, y + 14));
    }
  }
  g.fillStyle = th.support;
  for (const x of posts) g.fillRect(x, Math.round(ys[x]) + 3, 2, GROUND - Math.round(ys[x]) - 3);

  // AI 機率布幕（p10~p90，網點）
  g.fillStyle = 'rgba(181,123,255,.55)';
  for (let x = Xtoday; x <= Xend; x++) {
    const j = (x - Xtoday) / dx, i = Math.floor(j), f = j - i;
    const at = (arr) => arr[Math.min(i, HORIZON)] + (arr[Math.min(i + 1, HORIZON)] - arr[Math.min(i, HORIZON)]) * f;
    const y1 = clamp(Math.round(yOf(at(pred.bands.p90))), 4, GROUND - 2), y2 = clamp(Math.round(yOf(at(pred.bands.p10))), 4, GROUND - 2);
    for (let y = y1; y <= y2; y++) if (((x + y) & 1) === 0) g.fillRect(x, y, 1, 1);
  }

  // 軌道：紅漲綠跌、AI 段紫色
  let prev = Math.round(ys[PAD]);
  for (let x = PAD; x < worldW - PAD; x++) {
    const y = Math.round(ys[x]);
    let col;
    if (x > Xtoday && x <= Xend) col = cAI;
    else if (x <= X0 || x > Xend) col = cFlat;
    else {
      const d = clamp(Math.ceil((x - X0) / dx), 0, N - 1);
      const r = chgOf(d);
      col = mix(cFlat, r >= 0 ? cUp : cDown, clamp(Math.abs(r) / (weekly ? 0.05 : 0.025), 0.25, 1));
    }
    const a = Math.min(prev, y), b = Math.max(prev, y);
    g.fillStyle = rgb(col);
    g.fillRect(x, a, 1, b - a + 2);
    g.fillStyle = rgb(mix(col, [255, 255, 255], 0.45));
    g.fillRect(x, y, 1, 1);
    if (x % 3 === 0) { g.fillStyle = th.tie; g.fillRect(x, y + 2, 1, 2); }
    prev = y;
  }

  // 地面：人行道、馬路、日期尺
  g.fillStyle = th.dirt; g.fillRect(0, GROUND, worldW, LH - GROUND);
  g.fillStyle = th.dirt2;
  for (let y = GROUND + 14; y < LH; y += 3) for (let x = (y * 7) % 5; x < worldW; x += 5) g.fillRect(x, y, 1, 1);
  g.fillStyle = th.grass; g.fillRect(0, GROUND, worldW, 2);
  g.fillStyle = dark ? '#2c2f40' : '#6d7385'; g.fillRect(0, GROUND + 2, worldW, 10);
  g.fillStyle = dark ? '#d8c070' : '#ffffff';
  for (let x = 0; x < worldW; x += 8) g.fillRect(x, GROUND + 7, 4, 1);
  g.fillStyle = dark ? '#555a70' : '#b7bccb'; g.fillRect(0, GROUND + 12, worldW, 1);
  g.fillStyle = th.grass2;
  for (let x = 0; x < worldW; x += 3) g.fillRect(x, GROUND - ((x * 13) % 7 === 0 ? 1 : 0), 1, 2);
  // 彩蛋：扭蛋機、停車場（可以點）
  tr.spots = [drawGacha(g, PAD + 34, GROUND), drawGacha(g, Xend + 64, GROUND), ...worldSpots];
  for (let x = X0 + 520; x < Xtoday; x += 1100) tr.spots.push(drawParking(g, x, GROUND));
  for (let x = X0 + 260; x < Xtoday; x += 900) tr.spots.push(drawNoodle(g, x, GROUND));
  tr.spots.push(drawGas(g, Math.round(X0 + (Xtoday - X0) * 0.55), GROUND));
  let lastKey = '', lastLabelX = -999;
  for (let i = 0; i < T; i++) {
    const d = tpe(times[i]);
    const key = weekly ? `${d.getUTCFullYear()}-${Math.floor(d.getUTCMonth() / 3)}` : `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    if (key === lastKey) continue;
    lastKey = key;
    const x = X0 + i * dx;
    const col = i >= N ? '#b57bff' : th.label;
    g.fillStyle = col;
    g.fillRect(x, GROUND + 13, 1, 2);
    const txt = `${String(d.getUTCFullYear()).slice(2)}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (x - lastLabelX > textWidth(txt) + 6) { drawText(g, txt, x + 2, GROUND + 15, col); lastLabelX = x; }
  }

  // 起點站
  const sy = Math.round(ys[PAD + 20]);
  g.fillStyle = th.support;
  g.fillRect(PAD, sy + 3, X0 - PAD - 4, 3);
  for (const x of [PAD + 2, X0 - 10]) g.fillRect(x, sy - 22, 2, 22);
  g.fillStyle = '#ffb020'; g.fillRect(PAD - 2, sy - 24, X0 - PAD - 4, 3);
  g.fillStyle = '#e83b4e'; for (let x = PAD; x < X0 - 8; x += 6) g.fillRect(x, sy - 21, 3, 2);
  drawText(g, 'START', PAD + 14, sy - 32, th.label, 1, th.labelShadow);

  // 終點旗
  const gx = Xend + 46, gy = Math.round(ys[gx]);
  g.fillStyle = th.support; g.fillRect(gx, gy - 26, 1, 26);
  for (let r = 0; r < 4; r++) for (let q = 0; q < 6; q++) { g.fillStyle = (r + q) % 2 ? '#111' : '#fff'; g.fillRect(gx + 1 + q * 2, gy - 26 + r * 2, 2, 2); }
  drawText(g, 'GOAL', gx - 6, gy - 34, th.label, 1, th.labelShadow);

  // NOW 拱門
  const ny = Math.round(ys[Xtoday]);
  g.fillStyle = '#b57bff';
  g.fillRect(Xtoday - 6, ny - 18, 1, 22); g.fillRect(Xtoday + 6, ny - 18, 1, 22);
  g.fillRect(Xtoday - 6, ny - 19, 13, 2);
  g.fillStyle = '#e3d0ff'; g.fillRect(Xtoday - 5, ny - 18, 11, 1);
  drawText(g, 'NOW', Xtoday - 5, ny - 27, '#b57bff', 1, th.labelShadow);
  drawText(g, 'AI', Xtoday + 12, ny - 27, '#b57bff', 1, th.labelShadow);

  // HI / LO 旗子
  const real = closes.slice(0, N);
  const iMax = real.indexOf(Math.max(...real)), iMin = real.indexOf(Math.min(...real));
  const flag = (i, color, txt) => {
    const x = X0 + i * dx, y = Math.round(ys[x]);
    g.fillStyle = th.support; g.fillRect(x, y - 14, 1, 12);
    g.fillStyle = color; g.fillRect(x + 1, y - 14, 6, 4);
    const tw = textWidth(txt);
    drawText(g, txt, clamp(x - tw / 2, PAD, worldW - PAD - tw), y - 22, color, 1, th.labelShadow);
  };
  flag(iMax, '#ff4757', `HI ${fmtPx(real[iMax])}`);
  if (iMin !== iMax) flag(iMin, '#2ed573', `LO ${fmtPx(real[iMin])}`);
  return c;
}

// ---------- 天空、背景 ----------
const sky = { top: hex(THEMES[theme].sky.base[0]), bot: hex(THEMES[theme].sky.base[1]) };

const bgSpots = {};
function drawSky(dt, camX, time) {
  const th = TH();
  let key = 'base';
  if (mode === 'ride' && ride && ride.day > 0) {
    if (ride.inFuture) key = 'ai';
    else {
      const d = Math.min(ride.day, track.N - 1), back = Math.max(0, d - 10);
      const r = track.closes[d] / track.closes[back] - 1;
      key = Math.abs(r) < 0.02 ? 'base' : r > 0 ? 'up' : 'down';
    }
  }
  music.setMood(key === 'base' ? 'calm' : key);
  const k = Math.min(1, dt * 1.2);
  sky.top = mix(sky.top, hex(th.sky[key][0]), k);
  sky.bot = mix(sky.bot, hex(th.sky[key][1]), k);
  let ticker = 'STOCKCOASTER  TW STOCKS';
  if (track) {
    const d = clamp(ride ? ride.day : track.N - 1, 0, track.T - 1);
    const p = track.closes[d], r = d > 0 ? p / track.closes[d - 1] - 1 : 0;
    ticker = `${track.data.code}  ${fmtPx(p)}  ${r >= 0 ? '+' : ''}${(r * 100).toFixed(2)}%`;
  }
  bgSpots.blimp = drawBackground(ctx, { W, offY, GROUND, camX, time, dt, theme, top: sky.top, bot: sky.bot, ticker });
}

// ---------- 粒子：煙火、金幣、雨、速度線 ----------
const parts = [];
function firework(wx, wy) {
  const hue = Math.random() < 0.6 ? Math.random() * 40 : Math.random() * 360;
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2, sp = 20 + Math.random() * 45;
    parts.push({ x: wx, y: wy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 1.2 + Math.random() * 0.6, col: `hsl(${(hue + Math.random() * 30) | 0} 100% ${(55 + Math.random() * 20) | 0}%)`, g: 30 });
  }
}
function coins(wx, wy) {
  for (let i = 0; i < 6; i++) parts.push({ x: wx, y: wy, vx: (Math.random() - 0.5) * 40, vy: -50 - Math.random() * 30, life: 0, max: 1.2, col: '#ffd23f', g: 120, coin: true });
}
function updateParts(dt, camX) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life += dt;
    p.vy += p.g * dt; p.vx *= 0.99;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.life > p.max) { parts.splice(i, 1); continue; }
    const sx = Math.round(p.x - camX), sy = Math.round(p.y + offY);
    if (p.coin) {
      const w = Math.abs(Math.sin(p.life * 12)) > 0.5 ? 3 : 1;
      ctx.fillStyle = '#b37a00'; ctx.fillRect(sx - (w >> 1), sy, w, 4);
      ctx.fillStyle = p.col; ctx.fillRect(sx - (w >> 1), sy, w, 3);
    } else if (p.life < p.max * 0.8 || Math.random() < 0.5) {
      ctx.fillStyle = p.col;
      const sz = p.life < 0.3 ? 2 : 1;
      ctx.fillRect(sx, sy, sz, sz);
    }
  }
}
const drops = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random() }));
let rainAmt = 0;
function drawRain(dt, strength) {
  rainAmt += (strength - rainAmt) * Math.min(1, dt * 1.5);
  if (rainAmt < 0.03) return;
  ctx.fillStyle = theme === 'dark' ? 'rgba(160,190,255,.7)' : 'rgba(60,110,200,.55)';
  const n = Math.floor(drops.length * rainAmt);
  for (let i = 0; i < n; i++) {
    const d = drops[i];
    d.y += dt * 1.4; d.x -= dt * 0.12;
    if (d.y > 1) { d.y -= 1; d.x = Math.random(); }
    if (d.x < 0) d.x += 1;
    ctx.fillRect((d.x * W) | 0, (d.y * Hc) | 0, 1, 3);
  }
}
function speedLines(v) {
  if (v < 20 || ride.paused) return;
  ctx.fillStyle = theme === 'dark' ? 'rgba(255,255,255,.35)' : 'rgba(40,60,120,.22)';
  const n = Math.floor((v - 20) / 3);
  for (let i = 0; i < n; i++) ctx.fillRect((Math.random() * W) | 0, (Math.random() * (offY + GROUND)) | 0, 8 + ((Math.random() * 18) | 0), 1);
}

// ---------- 列車 ----------
const carAng = Array(12).fill(0);
function drawTrain(camX) {
  const s = ride ? ride.s : track.sStart;
  const me = ui.moon ? '🚀' : ui.pax;
  const cars = ride ? ride.cars : [me, me, me];
  for (let k = cars.length - 1; k >= 0; k--) {
    const pax = k === 0 ? me : cars[k];
    const x = xAtS(Math.max(0, s - k * 9.5));
    const xi = Math.round(x);
    const ang = Math.atan2(track.ys[Math.min(xi + 6, track.worldW - 1)] - track.ys[Math.max(xi - 6, 0)], 12);
    carAng[k] += (ang - carAng[k]) * 0.25; // 角度緩動，不會一格一格抖
    const q = carAng[k];
    const jh = ride ? Math.round(ride.jumpH) : 0;
    if (ride && ride.inv > 0 && Math.floor(ride.inv * 10) % 2) continue; // 受傷閃爍
    const px = Math.round(x - camX), py = Math.round(yAtX(x) + offY) - jh;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(q);
    ctx.drawImage(carSprite(pax, k === 0), -7, -15);
    ctx.restore();
    if (k === 0) drawBubble(px, py - 27);
  }
}
function drawBubble(x, y) {
  if (!ride || !ride.bubble) return;
  const txt = ride.bubble;
  const w = textWidth(txt) + 4;
  ctx.fillStyle = '#111';
  ctx.fillRect(x - (w >> 1) - 1, y - 1, w + 2, 9);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - (w >> 1), y, w, 7);
  ctx.fillRect(x - 1, y + 7, 2, 2);
  const col = txt === '$' ? '#d18a00' : txt === '?' ? '#8a4dff' : txt.includes('!') ? '#e83b4e' : '#333';
  drawText(ctx, txt, x - (w >> 1) + 2, y + 1, col);
}

// ---------- 小地圖 ----------
const mm = $('minimap'), mctx = mm.getContext('2d');
function drawMinimap() {
  const Wm = mm.width, Hm = mm.height;
  mctx.clearRect(0, 0, Wm, Hm);
  const { closes, N, T, lo, hi } = track;
  const y = (p) => Math.round(2 + (1 - (p - lo) / (hi - lo || 1)) * (Hm - 5));
  let py = y(closes[0]);
  for (let x = 0; x < Wm; x++) {
    const i = Math.min(T - 1, Math.round((x / (Wm - 1)) * (T - 1)));
    const yy = y(closes[i]);
    const r = i > 0 ? closes[i] - closes[i - 1] : 0;
    mctx.fillStyle = i >= N ? '#b57bff' : r >= 0 ? '#ff4757' : '#2ed573';
    mctx.fillRect(x, Math.min(py, yy), 1, Math.abs(py - yy) + 1);
    py = yy;
  }
  const d = clamp(dayAtX(xAtS(ride.s)), 0, T - 1);
  const cx = Math.round((d / (T - 1)) * (Wm - 1));
  mctx.fillStyle = theme === 'dark' ? 'rgba(255,255,255,.8)' : 'rgba(0,0,0,.6)';
  mctx.fillRect(cx, 0, 1, Hm);
  mctx.fillStyle = '#ffb020';
  mctx.fillRect(cx - 1, y(closes[Math.round(d)]) - 1, 3, 3);
}

// ---------- 選單 ----------
function spriteURL(p) {
  const c = document.createElement('canvas');
  c.width = 14; c.height = 15;
  c.getContext('2d').drawImage(carSprite(p, true), 0, 0);
  return c.toDataURL();
}
function buildMenu() {
  const chips = $('presetChips');
  PRESETS.forEach((p) => {
    const b = document.createElement('button');
    b.className = 'chip' + (p.code === ui.code ? ' on' : '');
    b.innerHTML = `${p.name} <small>${p.code}${p.tag ? ' · ' + p.tag : ''}</small>`;
    b.onclick = () => { ui.code = p.code; $('codeInput').value = ''; syncChips(); preview(); };
    b.dataset.code = p.code;
    chips.appendChild(b);
  });
  const dl = $('codeList');
  const fill = () => {
    dl.innerHTML = '';
    Object.entries(NAMES).forEach(([c, n]) => { const o = document.createElement('option'); o.value = c; o.label = n; dl.appendChild(o); });
  };
  fill();
  fetch(new URL('stocks.json', APP_ROOT)).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) { NAMES = { ...j, ...KNOWN }; fill(); } }).catch(() => {});
  $('codeInput').addEventListener('change', (e) => {
    const v = e.target.value.trim().toUpperCase();
    if (v) { ui.code = v.split(/\s/)[0]; syncChips(); preview(); }
  });
  const pax = $('paxSeg');
  PAX.forEach((p) => {
    const b = document.createElement('button');
    b.dataset.v = p;
    b.innerHTML = `<img src="${spriteURL(p)}" alt="${p}">`;
    if (p === ui.pax) b.classList.add('on');
    pax.appendChild(b);
  });
  seg('paxSeg', (v) => { ui.pax = v; drawLogo(); });
  seg('rangeSeg', (v) => {
    ui.range = v;
    $('dateRow').classList.toggle('hidden', v !== 'custom');
    if (v !== 'custom') return preview();
    if (!ui.start) { const d = resolveDates({ range: '1y' }); ui.start = d.start; ui.end = d.end; }
    $('dateStart').value = ui.start; $('dateEnd').value = ui.end;
  });
  const today = resolveDates({ range: '1y' }).end;
  $('dateStart').max = today; $('dateEnd').max = today;
  $('dateApply').onclick = () => {
    const a = $('dateStart').value, b = $('dateEnd').value;
    if (!a || !b || a >= b) { $('menuMsg').textContent = '😵 開始日期要早於結束日期'; return; }
    if (spanDays(a, b) < 14) { $('menuMsg').textContent = '😵 期間太短，至少選兩週'; return; }
    ui.start = a; ui.end = b; preview();
  };
  // 套用網址帶進來的設定
  [...$('rangeSeg').children].forEach((b) => b.classList.toggle('on', b.dataset.v === ui.range));
  if (ui.range === 'custom') { $('dateRow').classList.remove('hidden'); $('dateStart').value = ui.start; $('dateEnd').value = ui.end; }
  if (!PRESETS.some((p) => p.code === ui.code)) $('codeInput').value = ui.code;
  seg('guessSeg', (v) => (ui.guess = v));
  seg('modeSeg', (v) => (ui.mode = v));
  $('btnGo').onclick = startRide;
}
function drawLogo() {
  const c = $('logoSprite').getContext('2d');
  c.clearRect(0, 0, 14, 15);
  c.drawImage(carSprite(ui.moon ? '🚀' : ui.pax, true), 0, 0);
}
function seg(id, fn) {
  $(id).addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    [...$(id).children].forEach((x) => x.classList.toggle('on', x === b));
    fn(b.dataset.v);
  });
}
function syncChips() { [...$('presetChips').children].forEach((b) => b.classList.toggle('on', b.dataset.code === ui.code)); }

async function preview() {
  const tok = ++previewToken;
  $('menuMsg').textContent = `正在鋪 ${ui.code} 的軌道…`;
  try {
    const d = await loadStock(ui.code, { range: ui.range, start: ui.start, end: ui.end });
    if (tok !== previewToken) return null;
    buildTrack(d);
    track.key = rangeKey();
    try { history.replaceState(null, '', shareURL()); } catch { /* file:// 之類 */ }
    document.title = `${d.zhName || d.code}（${d.code}）股價雲霄飛車｜StockCoaster`;
    const r = d.points[d.points.length - 1].c / d.points[0].c - 1;
    $('menuMsg').innerHTML = `${d.displayName}：${d.points.length} 個${d.interval === '1wk' ? '週' : '交易日'}，期間 <span class="${cls(r)}">${fmtPct(r)}</span>${d.simulated ? '　⚠️ 連不到資料源，使用模擬軌道（請用 python3 server.py 啟動）' : ''}`;
    return track;
  } catch (e) {
    if (tok === previewToken) $('menuMsg').textContent = '😵 ' + e.message;
    return null;
  }
}

// ---------- 成就 / 提示 ----------
function toast(ico, title, sub) {
  const t = document.createElement('div');
  t.className = 'toast glass';
  t.innerHTML = `<span class="gicon">${ico}</span><div><b>${title}</b><small>${sub}</small></div>`;
  $('toasts').appendChild(t);
  while ($('toasts').children.length > 3) $('toasts').firstElementChild.remove();
  setTimeout(() => t.remove(), 4000);
}
function unlock(id) {
  const a = store.unlock(id);
  if (!a) return;
  ride?.newAch.push(a);
  sfx.chime();
  toast(a.ico, `成就解鎖：${a.name}`, a.desc);
  renderAch();
}
function renderAch() {
  $('achCount').textContent = `${store.count()}/${ACHIEVEMENTS.length}`;
  $('achGrid').innerHTML = ACHIEVEMENTS.map((a) => {
    const got = store.has(a.id);
    return `<div class="ach ${got ? 'got' : ''}"><span class="gicon">${a.ico}</span><div><b>${got || !a.desc.startsWith('？') ? a.name : '？？？'}</b><small>${a.desc}</small></div></div>`;
  }).join('');
}
$('btnAch').onclick = (e) => {
  e.stopPropagation();
  const open = $('achPanel').classList.toggle('hidden') === false;
  if (open) $('oracleMini').classList.add('collapsed'); // 面板互斥，避免疊在一起
};
// 點面板外面就收起來
document.addEventListener('pointerdown', (e) => {
  if (!$('achPanel').classList.contains('hidden') && !e.target.closest('#achPanel, #btnAch')) $('achPanel').classList.add('hidden');
  if (!$('oracleMini').classList.contains('collapsed') && !e.target.closest('#oracleMini')) $('oracleMini').classList.add('collapsed');
});
$('achClose').onclick = () => $('achPanel').classList.add('hidden');
$('btnSound').onclick = () => {
  sfx.init();
  const on = sfx.toggle();
  $('btnSound').querySelector('use').setAttribute('href', on ? '#i-sound' : '#i-mute');
};
function applyTheme(t) {
  theme = t;
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('stockcoaster.theme', t); } catch { /* 隱私模式 */ }
  $('btnTheme').querySelector('use').setAttribute('href', t === 'light' ? '#i-moon' : '#i-sun');
  if (track) track.canvas = renderWorld(track);
}
$('btnTheme').onclick = () => applyTheme(theme === 'light' ? 'dark' : 'light');

// ---------- 搭乘 ----------
async function startRide() {
  sfx.init();
  $('btnGo').disabled = true;
  $('loading').classList.remove('hidden');
  $('loadingText').textContent = `正在鋪 ${ui.code} 的軌道…`;
  const need = !track || track.key !== rangeKey();
  const tr = need ? await preview() : track;
  $('loading').classList.add('hidden');
  $('btnGo').disabled = false;
  if (tr) beginRide();
}
function startMusic() { sfx.init(); music.start(); }

function beginRide() {
  ride = {
    s: track.sStart, v: 6, day: -99, paused: false, pauses: 0, t: 0,
    runMax: track.closes[0], maxDD: 0, highs: 0, screams: 0, topV: 0, maxG: 1, minG: 1,
    bestDay: 0, worstDay: 0, g: 1, scream: 0, lastSay: 0, inFuture: false, newAch: [], lastBoom: 0,
    bubble: null,
    cars: Array(3).fill(ui.moon ? '🚀' : ui.pax),
    // 遊戲模式
    game: ui.mode === 'game', items: ui.mode === 'game' ? placeItems(track) : [],
    score: 0, hearts: 3, combo: 0, maxCombo: 0, lastCoin: -9, coins: 0, hits: 0, jumpH: 0, jumpV: 0, jumps: 2, inv: 0,
  };
  mode = 'ride';
  startMusic();
  music.setMood('calm');
  $('menu').classList.add('hidden');
  $('summary').classList.add('hidden');
  $('hud').classList.remove('hidden');
  $('btnHome').classList.remove('hidden');
  setPauseBtn(false);
  $('hudName').textContent = track.data.displayName;
  renderOracle();
  if (new Date().getHours() < 5) unlock('night');
  if (store.addPax(ui.pax) >= PAX.length) unlock('allpax');
  $('scoreCard').classList.toggle('hidden', !ride.game);
  updateScoreHUD();
  if (ride.game) say('🎮 點畫面／空白鍵跳躍（可二段跳）：吃 🪙 金幣和 🧧 紅包，跳過 💣 利空炸彈！', 4500, true);
  else say(`🎢 ${track.data.displayName}，${fmtDate(track.times[0])} 出發！`, 2500, true);
}

function updateScoreHUD() {
  if (!ride || !ride.game) return;
  $('hudHearts').textContent = '❤️'.repeat(ride.hearts) + '🖤'.repeat(Math.max(0, 3 - ride.hearts));
  $('hudScore').textContent = ride.score.toLocaleString();
  const mult = comboMult();
  $('hudCombo').textContent = ride.combo >= 2 ? `${ride.combo} 連擊 ×${mult}` : '';
}
const comboMult = () => Math.min(5, 1 + Math.floor(ride.combo / 5));

function jump() {
  if (mode !== 'ride' || !ride || !ride.game || ride.paused || ride.jumps <= 0) return;
  ride.jumpV = ride.jumps === 2 ? JUMP_V : JUMP_V * 0.8;
  ride.jumps--;
  sfx.jump?.();
}

function gameStep(dt) {
  // 跳躍
  if (ride.jumpH > 0 || ride.jumpV > 0) {
    ride.jumpV -= JUMP_G * dt;
    ride.jumpH += ride.jumpV * dt;
    if (ride.jumpH <= 0) { ride.jumpH = 0; ride.jumpV = 0; ride.jumps = 2; }
  }
  ride.inv = Math.max(0, ride.inv - dt);
  const x = xAtS(ride.s), railY = yAtX(x);
  for (const it of collide(ride.items, x, railY, ride.jumpH)) {
    if (it.type === 'bomb') {
      if (ride.inv > 0) { it.taken = false; continue; }
      ride.hearts--; ride.hits++; ride.combo = 0; ride.inv = 1.6;
      sfx.boom(); firework(it.x, it.y - 4);
      popText(it.x, it.y - 10, '-1', '#ff4757');
      say(['💥 踩到利空！', '💥 被倒貨了！', '💥 黑天鵝來襲！'][ride.hits % 3], 1800, true);
      if (ride.hearts <= 0) { updateScoreHUD(); return finishRide(true); }
    } else {
      if (ride.t - ride.lastCoin < 1.6) ride.combo++; else ride.combo = 1;
      ride.lastCoin = ride.t;
      ride.maxCombo = Math.max(ride.maxCombo, ride.combo);
      const m = comboMult();
      let pts = 0, col = '#ffd23f';
      if (it.type === 'coin') { pts = 10 * m; ride.coins++; sfx.coin?.(); }
      else if (it.type === 'hongbao') { pts = 88 * m; col = '#ff5a68'; sfx.chime(); }
      else {
        const r = Math.random();
        if (r < 0.4 && ride.hearts < 3) { ride.hearts++; popText(it.x, it.y - 12, '+1UP', '#ff7aa8'); say('🍀 神秘箱：多一條命！', 2000, true); }
        else { pts = 300; say('🍀 神秘箱：AI 給你 300 分！', 2000, true); }
        sfx.chime(); col = '#b57bff';
      }
      if (pts) { ride.score += pts; popText(it.x, it.y - 6, `+${pts}`, col); }
      if (ride.coins >= 50) unlock('coins50');
      if (ride.combo >= 20) unlock('combo20');
    }
  }
  updateScoreHUD();
}

function renderOracle() {
  const p = track.pred, last = p.last;
  const up = Math.round(p.pUp * 100);
  const unit = track.weekly ? '週' : '個交易日';
  const r = p.median / last - 1;
  const st = p.stance === '偏多' ? 'up' : p.stance === '偏空' ? 'down' : '';
  $('oracleMini').innerHTML = `
    <div class="o-head"><svg><use href="#i-spark"/></svg><span class="o-long">AI 走勢推演 · 未來 ${p.horizon} ${unit}</span><span class="o-short">AI 推演</span><b class="${cls(r)}">${fmtPct(r, 1)}</b></div>
    <div class="o-body">
      <div class="o-top"><span class="o-stance ${st}">${p.stance}</span><span>中位數 <b class="${cls(r)}">${fmtP(p.median)}</b></span></div>
      <div class="bar2"><i style="width:${up}%"></i><i style="width:${100 - up}%"></i></div>
      <div class="o-row"><span>上漲機率</span><b class="up">${up}%</b><span>下跌機率</span><b class="down">${100 - up}%</b></div>
      <div class="o-row"><span>80% 區間</span><b>${fmtP(p.p10)} ~ ${fmtP(p.p90)}</b></div>
      <div class="o-chips">${p.signals.map((g) => `<span class="${g.tone > 0 ? 'up' : g.tone < 0 ? 'down' : ''}">${g.k} <b>${g.v}</b></span>`).join('')}</div>
      <div class="o-read">${p.read}</div>
      <div class="tiny">600 條蒙地卡羅模擬＋均線、RSI、動能。統計推估，不是預測保證，也不構成投資建議。</div>
    </div>`;
}
$('oracleMini').onclick = () => {
  const open = $('oracleMini').classList.toggle('collapsed') === false;
  if (open) $('achPanel').classList.add('hidden');
};

function say(text, ms = 2600, force = false) {
  const now = performance.now();
  if (!force && now - ride.lastSay < 3200) return;
  ride.lastSay = now;
  const el = $('commentary');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(say._t);
  say._t = setTimeout(() => el.classList.remove('show'), ms);
}

function onNewDay(d) {
  const { closes, N, weekly } = track;
  if (d < 0) return;
  const dd = Math.min(d, track.T - 1);
  const price = closes[dd];
  const chg = dd > 0 ? price / closes[dd - 1] - 1 : 0;
  $('hudDate').textContent = (dd >= N ? '🔮 預測 ' : '') + fmtDate(track.times[dd]);
  $('hudPrice').textContent = fmtP(price);
  $('hudPrice').className = cls(chg);
  $('hudChg').textContent = fmtPct(chg);
  $('hudChg').className = cls(chg);
  const ret = price / closes[0] - 1;
  $('hudRet').textContent = fmtPct(ret, 1);
  $('hudRet').className = cls(ret);

  if (dd >= N) {
    if (!ride.inFuture) {
      ride.inFuture = true;
      unlock('future');
      say('📈 駛過「今天」：接下來是 AI 推演的可能走勢（600 條模擬取中位數），沒有支架，僅供參考', 4200, true);
      checkGuess(closes[N - 1] / closes[0] - 1);
    }
    return;
  }
  const gap = !weekly && Math.abs(chg) > 0.105; // 超過漲跌幅限制 → 除權息、減資等缺口，不算漲跌停
  if (!weekly && !gap) {
    if (chg <= -0.05) unlock('drop5');
    if (chg <= -0.095) unlock('limitdown');
    if (chg >= 0.095) unlock('limitup');
  }
  ride.bestDay = Math.max(ride.bestDay, chg);
  ride.worstDay = Math.min(ride.worstDay, chg);

  if (price > ride.runMax) {
    ride.runMax = price;
    if (dd > 3) {
      ride.highs++;
      if (ride.highs >= 10) unlock('highs');
      const now = performance.now();
      const x = xAtS(ride.s), y = yAtX(x);
      coins(x, y - 14);
      if (now - ride.lastBoom > 700) {
        ride.lastBoom = now;
        firework(x + 30 + Math.random() * 60, Math.max(12, y - 40 - Math.random() * 30));
        sfx.boom();
      }
      if (ride.highs % 2 === 0 && ride.cars.length < 10) addCar();
      else if (ride.highs === 1 || ride.highs % 8 === 0) say(`🎆 創區間新高 ${fmtP(price)}！第 ${ride.highs} 次`);
    }
  }
  ride.maxDD = Math.min(ride.maxDD, price / ride.runMax - 1);

  if (chg <= (weekly ? -0.06 : -0.03) && ride.cars.length > 1) dropCar(chg);
  const ahead = Math.min(N - 1, dd + 6);
  const fwd = closes[ahead] / price - 1;
  const u = weekly ? '週' : '日';
  if (gap) say(chg < 0 ? `✂️ 除權息缺口 ${fmtPct(chg)}：股價往下跳，配到的股利會補回來` : `🔼 跳空缺口 ${fmtPct(chg)}（減資、分割後恢復交易之類）`, 3200, true);
  else if (!weekly && Math.abs(chg) >= 0.095) { say(chg > 0 ? `🧨 ${fmtDate(track.times[dd])} 漲停！${fmtPct(chg)}` : `🕳️ 跌停！${fmtPct(chg)}，有人在尖叫`, 3000, true) }
  else if (chg <= (weekly ? -0.08 : -0.04)) { say(`📉 單${u}重挫 ${fmtPct(chg)}，自由落體！`) }
  else if (chg >= (weekly ? 0.08 : 0.04)) say(`📈 單${u}大漲 ${fmtPct(chg)}，衝啊！`);
  else if (fwd <= -0.08) say(`⚠️ 前方 ${ahead - dd} ${weekly ? '週' : '天'}累跌 ${fmtPct(fwd, 1)}，抓緊扶手！`);
  else if (fwd >= 0.08) say(`⛰️ 前方是一段 ${fmtPct(fwd, 1)} 的爬坡，喀喀喀喀…`);
  else if (price / ride.runMax - 1 < -0.15 && Math.random() < 0.05) say(`🌧️ 距高點已跌 ${fmtPct(price / ride.runMax - 1, 1)}，開始下雨了`);
}

// ---------- 車廂上下車 ----------
const BOARDERS = ['🥬', '🥬', '🥬', '🧑', '👵', '🐶', '🐱', '🐸', '🐧'];
function addCar() {
  const p = pick(BOARDERS);
  ride.cars.push(p);
  const n = ride.cars.length;
  const lines = {
    '🥬': [`🥬 韭菜看到新高衝進來了！列車接到 ${n} 節`, `🥬 又一顆韭菜上車，排隊等著被割（${n} 節）`],
    '🧑': [`🧑 上班族看到新聞追高上車，現在 ${n} 節`, `🧑 「我同事說會漲」——第 ${n} 節車廂已掛上`],
    '👵': [`👵 菜籃族阿嬤也上車了，列車 ${n} 節`, `👵 阿嬤：「台積電我從 50 塊抱到現在」（${n} 節）`],
  }[p] || [`${p} 連路過的都忍不住上車，共 ${n} 節`];
  say(pick(lines), 2600, true);
  sfx.blip?.(400, 900, 0.18, 'square', 0.07);
  if (n >= 10) unlock('crowd');
}
const fallen = [];
function dropCar(chg) {
  const k = ride.cars.length - 1;
  const p = ride.cars.pop();
  const x = xAtS(Math.max(0, ride.s - k * 9.5)), y = yAtX(x);
  fallen.push({ x, y, vx: -25 - Math.random() * 20, vy: -70, ang: carAng[k], va: -3 - Math.random() * 4, pax: p, life: 0 });
  const n = ride.cars.length;
  say(pick([`🏃 停損下車！跌了 ${fmtPct(chg, 1)}，列車剩 ${n} 節`, `💸 受不了洗盤，最後一節直接脫鉤（剩 ${n} 節）`, `🫠 被甩下車了……剩 ${n} 節，抱緊的才是贏家？`, `${p} 喊著「我早就說會跌」跳車了，剩 ${n} 節`]), 2600, true);
  sfx.hop?.();
}
function drawFallingCars(dt, camX) {
  for (let i = fallen.length - 1; i >= 0; i--) {
    const f = fallen[i];
    f.life += dt; f.vy += 220 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.ang += f.va * dt;
    if (f.y > LH + 30) { fallen.splice(i, 1); continue; }
    ctx.save();
    ctx.translate(Math.round(f.x - camX), Math.round(f.y + offY));
    ctx.rotate(f.ang);
    ctx.drawImage(carSprite(f.pax, false), -7, -15);
    ctx.restore();
  }
}

function checkGuess(r) {
  ride.guessResult = null;
  if (ui.guess === 'skip') return;
  const right = (ui.guess === 'up') === (r > 0);
  ride.guessResult = right;
  if (right) { unlock('prophet'); if (store.addCorrect() >= 3) unlock('prophet3'); }
}

function slopeAt(x) {
  const ys = track.ys, i = clamp(Math.round(x), 3, ys.length - 4);
  return { h1: -(ys[i + 1] - ys[i - 1]) / 2, h2: -(ys[i + 3] - 2 * ys[i] + ys[i - 3]) / 9 };
}

function step(dt) {
  if (ride.paused) return;
  const sub = Math.ceil(dt / (1 / 120)), h = dt / sub;
  let sin = 0, h1 = 0, h2 = 0;
  for (let i = 0; i < sub; i++) {
    ({ h1, h2 } = slopeAt(xAtS(ride.s)));
    sin = h1 / Math.hypot(1, h1);
    const grav = ui.moon && sin > 0 ? 0.35 : 1;
    ride.v += (-G * sin * grav - 0.0032 * ride.v * Math.abs(ride.v) - 0.12) * h;
    const vmin = ui.moon ? 16 : 12;
    ride.lifting = false;
    if (ride.v < vmin && sin > -0.05) { ride.v = vmin; ride.lifting = sin > 0.08; }
    if (ride.s > track.sEnd) ride.v = Math.max(0, ride.v - 12 * h);
    ride.v = clamp(ride.v, 0, 58);
    ride.s += ride.v * h;
  }
  ride.t += dt;
  if (ride.game) { gameStep(dt); if (mode !== 'ride') return; }

  // G 力：cosθ + v²κ/g
  const cos = 1 / Math.hypot(1, h1);
  const kappa = h2 / Math.pow(1 + h1 * h1, 1.5) / MPP;
  const gNow = clamp(cos + (ride.v * ride.v * kappa) / G, -2, 6);
  ride.g += (gNow - ride.g) * Math.min(1, dt * 6);
  ride.maxG = Math.max(ride.maxG, ride.g);
  ride.minG = Math.min(ride.minG, ride.g);
  const kmh = ride.v * 3.6;
  ride.topV = Math.max(ride.topV, kmh);
  if (kmh > 100) unlock('speed');
  if (ride.g > 3.5) unlock('gforce');
  if (ride.g < 0) unlock('float');

  const target = clamp(Math.abs(ride.g - 1) * 32 + Math.max(0, -sin) * ride.v * 2.2, 0, 100);
  ride.scream += (target - ride.scream) * Math.min(1, dt * 3);
  if (ride.scream > 68 && performance.now() - (ride.lastScreamAt || 0) > 3500) {
    ride.lastScreamAt = performance.now();
    ride.screams++;
    sfx.scream(ride.scream / 80);
  }
  if (ride.lifting) sfx.clack();
  sfx.wind(ride.v);

  ride.bubble = ride.g < 0.3 ? '!!' : sin < -0.45 ? '!' : ride.g > 2.6 ? 'X' : ride.lifting ? '...' : ride.inFuture ? '?' : sin > 0.25 ? '$' : null;

  const day = Math.floor(dayAtX(xAtS(ride.s)) + 1e-6);
  if (day > ride.day) {
    for (let d = Math.max(-1, ride.day + 1); d <= day; d++) onNewDay(d);
    ride.day = day;
  }

  $('hudSpeed').textContent = kmh.toFixed(0);
  $('hudG').textContent = ride.g.toFixed(1);
  $('hudScream').style.width = `${ride.scream}%`;

  if (ride.s >= track.sStop || (ride.s > track.sEnd && ride.v < 0.3)) finishRide();
}

// ---------- 結算 ----------
function finishRide(gameOver = false) {
  mode = 'done';
  sfx.silence();
  const { closes, N, data, pred } = track;
  const ret = closes[N - 1] / closes[0] - 1;
  if (gameOver) unlock('derail');
  let bonus = 0, best = 0, isBest = false;
  if (ride.game) {
    if (!gameOver) {
      bonus = Math.max(0, Math.round(ret * 1000)) + ride.hearts * 100;
      ride.score += bonus;
      if (ride.hits === 0) unlock('flawless');
    }
    if (ride.score >= 5000) unlock('score5000');
    try {
      const all = JSON.parse(localStorage.getItem('stockcoaster.best') || '{}');
      best = all[rangeKey()] || 0;
      if (ride.score > best) { isBest = best > 0 || ride.score > 0; all[rangeKey()] = ride.score; localStorage.setItem('stockcoaster.best', JSON.stringify(all)); }
      best = Math.max(best, ride.score);
    } catch { /* 隱私模式 */ }
    updateScoreHUD();
  }
  if (ride.guessResult === undefined) checkGuess(ret);
  if (gameOver) return showSummary({ gameOver, ret, bonus, best, isBest });
  store.addRide();
  unlock('first');
  if (data.code === '2330') unlock('tsmc');
  if (data.code === '0050') unlock('etf50');
  if (!PRESETS.some((p) => p.code === data.code)) unlock('custom');
  if (store.addStock(data.code) >= 5) unlock('collector');
  if (spanDays(data.start, data.end) >= 365 * 5 - 10) unlock('marathon');
  if (ride.maxDD <= -0.3) unlock('diamond');
  if (ret < -0.2) unlock('leek');
  if (ret > 0.5) unlock('rich');
  if (Math.abs(ret) < 0.02) unlock('zen');
  if (ret > 0) {
    const x = xAtS(ride.s), y = yAtX(x);
    for (let i = 0; i < 5; i++) setTimeout(() => { firework(x - 80 + Math.random() * 160, Math.max(10, y - 40 - Math.random() * 40)); sfx.boom(); }, i * 300);
  }

  showSummary({ gameOver, ret, bonus, best, isBest });
}

function showSummary({ gameOver, ret, bonus, best, isBest }) {
  const { N, data, pred } = track;
  const unit = track.weekly ? '週' : '日';
  const g = ride.guessResult;
  const gameBox = ride.game ? `<div class="gamebox">
      <div><span>🎮 分數</span><b>${ride.score.toLocaleString()}</b>${isBest ? '<em>新紀錄！</em>' : `<small>最佳 ${best.toLocaleString()}</small>`}</div>
      <div><span>🪙 金幣</span><b>${ride.coins}</b></div>
      <div><span>🔥 最高連擊</span><b>${ride.maxCombo}</b></div>
      <div><span>💣 被炸</span><b>${ride.hits}</b></div>
      ${gameOver ? '' : `<div><span>💰 持股＋存活獎金</span><b>+${bonus.toLocaleString()}</b></div>`}
    </div>` : '';
  const guessLine = ui.guess === 'skip' ? '這趟沒有猜，純坐。' : g ? `✅ 你猜「${ui.guess === 'up' ? '漲上去' : '跌下來'}」—— 猜對了！累積猜對 ${store.state.correct} 次` : `❌ 你猜「${ui.guess === 'up' ? '漲上去' : '跌下來'}」—— 市場不同意，下次再來。`;
  $('summary').innerHTML = `
    <h2>${gameOver ? '出軌了！💥 Game Over' : ret >= 0 ? '抵達終點！這趟有賺 🎉' : '抵達終點……這趟被套 🫠'}</h2>
    <div class="muted">${data.displayName} · ${fmtDate(track.times[0])} → ${fmtDate(track.times[N - 1])}${data.simulated ? ' · 模擬資料' : ''}</div>
    ${gameBox}
    ${sparkline()}
    <div class="stats">
      <div class="stat"><span>期間報酬</span><b class="${cls(ret)}">${fmtPct(ret, 1)}</b></div>
      <div class="stat"><span>最大回檔</span><b class="down">${fmtPct(ride.maxDD, 1)}</b></div>
      <div class="stat"><span>創新高次數</span><b>${ride.highs} 🎆</b></div>
      <div class="stat"><span>最大單${unit}漲幅</span><b class="up">${fmtPct(ride.bestDay, 1)}</b></div>
      <div class="stat"><span>最大單${unit}跌幅</span><b class="down">${fmtPct(ride.worstDay, 1)}</b></div>
      <div class="stat"><span>尖叫次數</span><b>${ride.screams} 😱</b></div>
      <div class="stat"><span>最高時速</span><b>${ride.topV.toFixed(0)} km/h</b></div>
      <div class="stat"><span>G 力範圍</span><b>${ride.minG.toFixed(1)} ~ ${ride.maxG.toFixed(1)}</b></div>
      <div class="stat"><span>搭乘時間</span><b>${ride.t.toFixed(0)} 秒</b></div>
    </div>
    <div>${guessLine}</div>
    <div class="verdict"><b>AI 走勢推演・${pred.stance}</b>：${pred.horizon} 個${unit}後中位數 <b class="${cls(pred.median - pred.last)}">${fmtP(pred.median)}（${fmtPct(pred.median / pred.last - 1, 1)}）</b>，
      上漲機率 ${(pred.pUp * 100).toFixed(0)}%，80% 區間 ${fmtP(pred.p10)} ~ ${fmtP(pred.p90)}。<br>${pred.read}</div>
    ${ride.newAch.length ? `<div class="muted" style="margin-top:10px">這趟解鎖的成就</div><div class="newach">${ride.newAch.map((a) => `<div><span class="gicon sm">${a.ico}</span>${a.name}</div>`).join('')}</div>` : ''}
    <div class="btnrow"><button class="primary" id="againBtn">再坐一次</button><button id="shareBtn"><svg><use href="#i-share"/></svg> 分享這趟</button><button id="otherBtn">換一檔</button></div>
    <a class="promo" href="https://sectools.tw/?utm_source=stockcoaster&amp;utm_medium=referral&amp;utm_campaign=summary" target="_blank" rel="noopener"><span class="gicon sm">🧰</span><span>還沒玩夠？<b>SecTools.tw</b> 有火車駕駛、飛行模擬、資安扭蛋機，免費隨點即玩</span><svg><use href="#i-arrow"/></svg></a>
    <div class="disclaimer">股價資料來源 Yahoo Finance／FinMind（可能有延遲，已自動還原分割）。AI 預測是統計玩具，純屬娛樂，不構成任何投資建議。</div>`;
  setTimeout(() => { $('summary').classList.remove('hidden'); document.body.classList.add('summary-open'); $('oracleMini').classList.add('collapsed'); }, 1000);
  $('againBtn').onclick = () => { $('summary').classList.add('hidden'); document.body.classList.remove('summary-open'); beginRide(); };
  $('otherBtn').onclick = goHome;
  $('shareBtn').onclick = async () => {
    const url = shareURL();
    const text = ride.game
      ? `我在 ${data.displayName} 的股價雲霄飛車拿到 ${ride.score.toLocaleString()} 分（${ride.coins} 枚金幣、最高 ${ride.maxCombo} 連擊）🎮 你能超過嗎？`
      : `我剛坐完 ${data.displayName} 的股價雲霄飛車：期間 ${fmtPct(ret, 1)}、最大回檔 ${fmtPct(ride.maxDD, 1)}、尖叫 ${ride.screams} 次 🎢`;
    try {
      if (navigator.share) await navigator.share({ title: document.title, text, url });
      else { await navigator.clipboard.writeText(`${text}\n${url}`); toast('🔗', '已複製分享連結', url); }
    } catch { /* 使用者取消 */ }
  };
}

function sparkline() {
  const { closes, N, pred } = track;
  const W2 = 560, H2 = 90;
  const all = closes.concat(pred.bands.p10, pred.bands.p90);
  const lo = Math.min(...all), hi = Math.max(...all);
  const tot = closes.length - 1;
  const X = (i) => (i / tot) * W2, Y = (p) => H2 - 4 - ((p - lo) / (hi - lo || 1)) * (H2 - 8);
  const real = closes.slice(0, N).map((p, i) => `${X(i).toFixed(1)},${Y(p).toFixed(1)}`).join(' ');
  const fut = closes.slice(N - 1).map((p, j) => `${X(N - 1 + j).toFixed(1)},${Y(p).toFixed(1)}`).join(' ');
  const band = pred.bands.p90.map((p, j) => `${X(N - 1 + j)},${Y(p)}`).concat(pred.bands.p10.map((p, j) => `${X(N - 1 + j)},${Y(p)}`).reverse()).join(' ');
  const up = closes[N - 1] >= closes[0];
  return `<svg class="spark" viewBox="0 0 ${W2} ${H2}" preserveAspectRatio="none">
    <polygon points="${band}" fill="rgba(181,123,255,.2)"/>
    <polyline points="${real}" fill="none" stroke="${up ? '#ff4757' : '#2ed573'}" stroke-width="2"/>
    <polyline points="${fut}" fill="none" stroke="#b57bff" stroke-width="2" stroke-dasharray="5 4"/>
  </svg>`;
}

function goHome() {
  document.body.classList.remove('summary-open');
  mode = 'menu';
  ride = null;
  sfx.silence();
  music.stop();
  $('summary').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('btnHome').classList.add('hidden');
  $('menu').classList.remove('hidden');
}
$('btnHome').onclick = goHome;

// 點畫面跳躍（遊戲模式）
cv.addEventListener('pointerdown', (e) => { if (ride?.game) { e.preventDefault(); jump(); } });

// HUD 控制
document.querySelector('#hud .controls').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.spd) {
    ui.spd = +b.dataset.spd;
    document.querySelectorAll('[data-spd]').forEach((x) => x.classList.toggle('on', x === b));
  }
  if (b.id === 'btnPause') togglePause();
});
function setPauseBtn(p) {
  $('btnPause').innerHTML = `<svg><use href="#${p ? 'i-play' : 'i-pause'}"/></svg><span>${p ? '好啦繼續' : '我要下車'}</span>`;
}
function togglePause() {
  if (mode !== 'ride') return;
  ride.paused = !ride.paused;
  setPauseBtn(ride.paused);
  if (ride.paused) {
    sfx.silence();
    ride.pauses++;
    if (ride.pauses >= 5) unlock('chicken');
    const lines = ['🛑 工作人員：先生，雲霄飛車中途不能下車喔', '🛑 停損？在雲霄飛車上？', '🛑 暫停中……市場可不會等你', '🛑 深呼吸，這只是 K 線', '🛑 你確定不是想抄底？'];
    say(lines[(ride.pauses - 1) % lines.length], 3000, true);
  }
}

// 鍵盤 & 彩蛋
let keyBuf = '';
const KONAMI = 'ArrowUpArrowUpArrowDownArrowDownArrowLeftArrowRightArrowLeftArrowRightba';
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    if (mode === 'ride' && ride?.game) { e.preventDefault(); jump(); return; }
    if (e.code === 'Space') { e.preventDefault(); togglePause(); }
  }
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  if (mode === 'ride' && '1234'.includes(e.key)) document.querySelector(`[data-spd="${[0.5, 1, 2, 4][+e.key - 1]}"]`)?.click();
  keyBuf = (keyBuf + e.key).slice(-80);
  if (keyBuf.toLowerCase().endsWith('moon') || keyBuf.endsWith(KONAMI)) {
    keyBuf = '';
    ui.moon = !ui.moon;
    drawLogo();
    toast('🚀', ui.moon ? 'To the Moon 模式啟動' : 'To the Moon 模式關閉', ui.moon ? '列車改裝火箭推進器：爬坡更輕鬆、最低速更快' : '回到地球，重力恢復正常');
    if (ui.moon) unlock('moon');
  }
});

const TRIVIA = [
  '台股漲跌幅限制是 10%，2015 年 6 月 1 日起從 7% 放寬。',
  '台股是「紅漲綠跌」，和美股的「綠漲紅跌」剛好相反。',
  '0050 是台灣第一檔 ETF，2003 年掛牌。',
  '台股一般交易時間是 09:00–13:30，盤後零股到 14:30。',
  '台積電長期占加權指數權重三成以上，被暱稱「護國神山」。',
  '「除權息」後股價回到除息前的價位，叫做「填息」。',
  '上市股票在 Yahoo 的代號是 .TW，上櫃是 .TWO。',
];
let logoClicks = 0;
$('logo').addEventListener('click', () => {
  logoClicks++;
  if (logoClicks % 7 === 0) { unlock('curious'); toast('📚', '台股冷知識', TRIVIA[Math.floor(Math.random() * TRIVIA.length)]); }
});

// ---------- 街道、彩蛋 hotspot ----------
const street = createStreet();
const spots = [];
function onHonk(c) {
  if (!ride || mode !== 'ride') return;
  const sx = c.x - camX;
  if (sx < 0 || sx > W) return;
  sfx.blip?.(520, 480, 0.12, 'square', 0.05);
  if (!ride.sanbaoSaid) { ride.sanbaoSaid = true; say(pick(SANBAO_LINES), 2600); }
}
const SANBAO_LINES = ['🛵 底下有三寶在亂切車道，大家小心！', '🛵 三寶逆向中，比股價還難預測', '🛵 叭叭！機車大軍出沒，三寶請自重', '🛵 那台三寶跟這檔股票一樣，方向燈從來不打'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const tip = document.createElement('div');
tip.className = 'tip glass hidden';
document.body.appendChild(tip);
function spotAt(e) {
  const r = cv.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * Hc;
  return spots.find((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
}
cv.addEventListener('mousemove', (e) => {
  const sp = spotAt(e);
  cv.style.cursor = sp ? 'pointer' : '';
  tip.classList.toggle('hidden', !sp);
  if (sp) {
    tip.textContent = sp.label + ' →';
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = `${Math.min(e.clientX + 14, innerWidth - tw - 8)}px`; // 靠邊時往內收
    tip.style.top = `${Math.min(e.clientY + 12, innerHeight - th - 8)}px`;
  }
});
cv.addEventListener('click', (e) => {
  if (ride?.game && mode === 'ride') return; // 遊戲中點畫面是跳躍
  const sp = spotAt(e);
  if (sp) window.open(sp.url, '_blank', 'noopener');
});

// ---------- 主迴圈 ----------
let camX = 0, last = performance.now(), clock = 0;
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; clock += dt;
  if (mode === 'ride' && track) step(dt * ui.spd);

  if (track) {
    const maxCam = Math.max(0, track.worldW - W);
    let target;
    if (mode === 'menu') {
      const span = Math.max(0, track.worldW - 2 * PAD - W + 120);
      target = PAD - 60 + (0.5 - 0.5 * Math.cos(clock * 0.06)) * span;
    } else target = xAtS(ride ? ride.s : track.sStart) - W * 0.35;
    target = clamp(target, 0, maxCam);
    camX += (target - camX) * (mode === 'menu' ? 1 : Math.min(1, dt * 6));
    if (Math.abs(target - camX) > W) camX = target;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  drawSky(dt, camX, clock);
  spots.length = 0;
  updateStreet(street, dt, camX, W, onHonk);
  drawBackdrop(ctx, street, W, offY, GROUND, clock, theme, spots, rainAmt);
  if (bgSpots.blimp) spots.push(bgSpots.blimp);
  if (track) {
    const cx = Math.round(camX);
    const w = Math.min(W, track.worldW - cx);
    ctx.drawImage(track.canvas, cx, 0, w, LH, 0, offY, w, LH);
    for (const sp of track.spots || []) spots.push({ ...sp, x: sp.x - cx, y: sp.y + offY });
    drawRoad(ctx, street, cx, offY, W, clock, spots);
    drawFallingCars(dt, cx);
    if (ride && ride.items.length) drawItems(ctx, ride.items, cx, offY, W, clock);
    drawTrain(cx);
    updateParts(dt, cx);
    drawFloats(ctx, cx, offY, dt);
  }
  if (mode !== 'menu' && ride) {
    if (mode === 'ride') speedLines(ride.v);
    const dd = ride.inFuture ? 0 : track.closes[clamp(ride.day, 0, track.N - 1)] / ride.runMax - 1;
    drawRain(dt, mode === 'ride' && dd < -0.15 ? clamp((-dd - 0.15) / 0.15, 0.3, 1) : 0);
    drawMinimap();
  } else drawRain(dt, 0);
  requestAnimationFrame(tick);
}

// ?og=1：產生分享圖用（隱藏介面，只留畫面與標題）
if (new URLSearchParams(location.search).has('og')) {
  document.documentElement.classList.add('og');
  const d = document.createElement('div');
  d.className = 'og-title';
  d.innerHTML = '<b>股市雲霄飛車</b><span>把台股走勢變成像素雲霄飛車・紅漲綠跌・AI 走勢推演</span>';
  document.body.appendChild(d);
}

buildMenu();
drawLogo();
renderAch();
applyTheme(theme);
preview();
requestAnimationFrame(tick);
