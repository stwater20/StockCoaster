// 華麗像素背景：多層視差（極光／流星／飛鳥、日月光暈、雪山、雲、台北 101、摩天輪、跑馬燈飛船、霓虹城市）
import { drawText, textWidth } from './pixel.js';

const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const lerp = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

const STARS = Array.from({ length: 140 }, (_, i) => ({ x: hash(i), y: hash(i + 99) ** 1.4, p: hash(i + 7) * 10, big: hash(i + 3) > 0.93 }));
const CLOUDS = Array.from({ length: 12 }, (_, i) => ({ x: hash(i + 50) * 900, y: hash(i + 60), w: 22 + hash(i + 70) * 30, sp: 2 + hash(i + 80) * 4, layer: i % 2 }));
const BIRDS = Array.from({ length: 7 }, (_, i) => ({ x: hash(i + 200) * 600, y: 0.12 + hash(i + 210) * 0.35, sp: 10 + hash(i + 220) * 8, ph: hash(i + 230) * 6 }));
let meteors = [];

export const PALETTES = {
  dark: {
    stars: true, aurora: true,
    snow: '#c9cff5', mtnA: '#2b2c5c', mtnB: '#1f2048', mtnC: '#181938',
    cloud: '#3b3570', cloudHi: '#8f86d6',
    city: '#16183a', city2: '#1c1f47', neon: ['#ff4fd8', '#4ff0ff', '#ffe14f', '#ff6b6b'], cityWin: '#ffd76a',
    t101: '#2a2f66', t101Hi: '#8fa0ff', wheel: '#9aa3d8', gondola: ['#ff5a68', '#ffd23f', '#4ff0ff', '#b57bff'],
    blimp: '#c8cde8', blimpShade: '#8d93b8', ticker: '#0d1024', glow: [255, 246, 216],
  },
  light: {
    stars: false, aurora: false,
    snow: '#ffffff', mtnA: '#8fb8e3', mtnB: '#a7c9ec', mtnC: '#bcd7f1',
    cloud: '#ffffff', cloudHi: '#ffffff',
    city: '#b4cde6', city2: '#c3d8ee', neon: ['#ff6fae', '#38b6ff', '#ffb020', '#ff5a68'], cityWin: '#eaf4ff',
    t101: '#7f9fc4', t101Hi: '#d9ecff', wheel: '#ffffff', gondola: ['#ff5a68', '#ffb020', '#38b6ff', '#8a63ff'],
    blimp: '#ffffff', blimpShade: '#c9d8ea', ticker: '#1d2a44', glow: [255, 240, 170],
  },
};

function disc(ctx, cx, cy, r) {
  for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1); }
}
// 抖動網點光暈
function halo(ctx, cx, cy, r0, r1, col, strength) {
  for (let r = r1; r > r0; r -= 2) {
    const a = strength * (1 - (r - r0) / (r1 - r0)) ** 1.6;
    ctx.fillStyle = rgb(col, a);
    disc(ctx, cx, cy, r);
  }
}

function cloud(ctx, x, y, w, base, hi) {
  const h = Math.round(w * 0.28);
  ctx.fillStyle = base;
  ctx.fillRect(x, y + h - 4, w, 5);
  ctx.fillRect(x + Math.round(w * 0.1), y + Math.round(h * 0.3), Math.round(w * 0.45), h);
  ctx.fillRect(x + Math.round(w * 0.38), y, Math.round(w * 0.36), h);
  ctx.fillRect(x + Math.round(w * 0.65), y + Math.round(h * 0.45), Math.round(w * 0.28), h);
  ctx.fillStyle = hi;
  ctx.fillRect(x + Math.round(w * 0.38) + 1, y, Math.round(w * 0.36) - 2, 1);
  ctx.fillRect(x + Math.round(w * 0.1) + 1, y + Math.round(h * 0.3), Math.round(w * 0.45) - 2, 1);
}

function taipei101(ctx, x, base, P, time) {
  // 基座
  ctx.fillStyle = P.t101;
  ctx.fillRect(x - 7, base - 18, 15, 18);
  ctx.fillRect(x - 5, base - 22, 11, 4);
  // 八節「竹節」，每節往上外擴
  let y = base - 22;
  for (let s = 0; s < 8; s++) {
    for (let r = 0; r < 6; r++) {
      const w = 7 + Math.round(r * 0.6);
      ctx.fillStyle = r === 5 ? P.t101Hi : P.t101;
      ctx.fillRect(x - (w >> 1), y - r - 1, w + 1, 1);
    }
    ctx.fillStyle = P.t101Hi;
    if ((Math.floor(time * 2) + s) % 4 === 0) ctx.fillRect(x - 1, y - 3, 3, 1);
    y -= 6;
  }
  ctx.fillStyle = P.t101;
  ctx.fillRect(x - 2, y - 4, 5, 4);
  ctx.fillRect(x, y - 16, 1, 12);
  ctx.fillStyle = Math.sin(time * 4) > 0 ? '#ff4757' : P.t101Hi;
  ctx.fillRect(x, y - 17, 1, 1);
}

function ferris(ctx, x, base, P, time, dark) {
  const R = 26, cy = base - R - 10;
  ctx.fillStyle = P.wheel;
  // 支架
  for (let i = 0; i <= R + 10; i++) { ctx.fillRect(x - Math.round(i * 0.42), cy + i, 1, 1); ctx.fillRect(x + Math.round(i * 0.42), cy + i, 1, 1); }
  // 輪圈
  for (let a = 0; a < Math.PI * 2; a += 0.045) ctx.fillRect(Math.round(x + Math.cos(a) * R), Math.round(cy + Math.sin(a) * R), 1, 1);
  const rot = time * 0.25;
  for (let k = 0; k < 10; k++) {
    const a = rot + (k / 10) * Math.PI * 2;
    const ex = x + Math.cos(a) * R, ey = cy + Math.sin(a) * R;
    ctx.fillStyle = P.wheel;
    for (let t = 0; t < 1; t += 1 / R) ctx.fillRect(Math.round(x + (ex - x) * t), Math.round(cy + (ey - cy) * t), 1, 1);
    ctx.fillStyle = P.gondola[k % P.gondola.length];
    ctx.fillRect(Math.round(ex) - 1, Math.round(ey) + 1, 3, 3);
    if (dark && (Math.floor(time * 3) + k) % 3 === 0) { ctx.fillStyle = '#fff6c0'; ctx.fillRect(Math.round(ex), Math.round(ey), 1, 1); }
  }
  ctx.fillStyle = P.wheel; ctx.fillRect(x - 1, cy - 1, 3, 3);
}

function blimp(ctx, x, y, P, text, time) {
  const w = 46, h = 14;
  ctx.fillStyle = P.blimpShade; disc(ctx, x + w / 2, y + h / 2 + 1, 0);
  // 橢圓機身
  for (let r = 0; r < h; r++) {
    const t = (r - h / 2 + 0.5) / (h / 2);
    const half = Math.round((w / 2) * Math.sqrt(Math.max(0, 1 - t * t)));
    ctx.fillStyle = r > h * 0.62 ? P.blimpShade : P.blimp;
    ctx.fillRect(x + w / 2 - half, y + r, half * 2, 1);
  }
  ctx.fillStyle = P.blimpShade;
  ctx.fillRect(x - 3, y + 2, 5, 3); ctx.fillRect(x - 3, y + h - 5, 5, 3);
  ctx.fillRect(x + w / 2 - 4, y + h, 9, 3);
  // 跑馬燈
  const tw = textWidth(text);
  ctx.fillStyle = P.ticker;
  ctx.fillRect(x + 8, y + 4, w - 16, 7);
  ctx.save();
  ctx.beginPath(); ctx.rect(x + 9, y + 5, w - 18, 5); ctx.clip();
  const off = (time * 14) % (tw + w);
  drawText(ctx, text, Math.round(x + w - 9 - off), y + 5, '#ffd23f');
  ctx.restore();
}

export function drawBackground(ctx, o) {
  const { W, offY, GROUND, camX, time, dt, theme, top, bot, ticker } = o;
  const P = PALETTES[theme];
  const dark = theme === 'dark';
  const horizon = offY + GROUND;

  // 天空漸層（12 段 + 網點過渡）
  const bands = 14, bh = Math.ceil(horizon / bands);
  for (let b = 0; b < bands; b++) {
    ctx.fillStyle = rgb(lerp(top, bot, b / (bands - 1)));
    ctx.fillRect(0, b * bh, W, bh);
    if (b < bands - 1) {
      ctx.fillStyle = rgb(lerp(top, bot, (b + 1) / (bands - 1)));
      const y = (b + 1) * bh - 1;
      for (let x = b & 1; x < W; x += 2) ctx.fillRect(x, y, 1, 1);
    }
  }
  const skyH = offY + 110;

  if (dark) {
    // 星星
    for (const s of STARS) {
      const x = Math.floor(((s.x * W * 1.5 - camX * 0.02) % W + W) % W), y = Math.floor(s.y * skyH);
      const tw = Math.sin(time * 1.7 + s.p);
      ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.5 * Math.max(0, tw)})`;
      ctx.fillRect(x, y, 1, 1);
      if (s.big && tw > 0.5) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
    }
    // 極光：三條緩慢扭動的光帶
    const cols = [[80, 255, 170], [150, 110, 255], [70, 210, 255]];
    for (let k = 0; k < 3; k++) {
      for (let x = 0; x < W; x += 1) {
        const wx = x + camX * 0.05;
        const y0 = offY * 0.4 + 18 + k * 10 + Math.sin(wx * 0.018 + time * 0.35 + k) * 9 + Math.sin(wx * 0.006 - time * 0.15 + k * 2) * 14;
        const len = 10 + 8 * (0.5 + 0.5 * Math.sin(wx * 0.05 + time * 0.8 + k * 3));
        const a = 0.14 + 0.08 * Math.sin(wx * 0.03 + time * 0.6 + k);
        for (let j = 0; j < len; j += 2) {
          ctx.fillStyle = rgb(cols[k], a * (1 - j / len));
          ctx.fillRect(x, Math.round(y0 + j), 1, 2);
        }
      }
    }
    // 流星
    if (Math.random() < dt * 0.25) meteors.push({ x: Math.random() * W * 0.8 + W * 0.2, y: Math.random() * skyH * 0.4, life: 0 });
    meteors = meteors.filter((m) => (m.life += dt) < 0.9);
    for (const m of meteors) {
      const hx = m.x - m.life * 120, hy = m.y + m.life * 60;
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = `rgba(255,255,255,${(1 - i / 14) * (1 - m.life / 0.9)})`;
        ctx.fillRect(Math.round(hx + i * 2), Math.round(hy - i), 1, 1);
      }
    }
    // 月亮 + 光暈
    const mx = W - 54, my = 22 + Math.max(0, offY - 40) * 0.3;
    halo(ctx, mx, my, 10, 30, P.glow, 0.08);
    ctx.fillStyle = '#e9dcb0'; disc(ctx, mx, my, 10);
    ctx.fillStyle = '#fff6d8'; disc(ctx, mx - 1, my - 1, 8);
    ctx.fillStyle = '#d8cb9c'; ctx.fillRect(mx - 4, my - 2, 2, 2); ctx.fillRect(mx + 2, my + 3, 3, 2); ctx.fillRect(mx + 1, my - 5, 2, 1);
  } else {
    // 太陽 + 光芒
    const sx = W - 56, sy = 24 + Math.max(0, offY - 40) * 0.3;
    halo(ctx, sx, sy, 12, 40, P.glow, 0.16);
    ctx.fillStyle = 'rgba(255,230,120,.5)';
    for (let k = 0; k < 12; k++) {
      const a = time * 0.1 + (k / 12) * Math.PI * 2;
      for (let r = 16; r < 24; r++) ctx.fillRect(Math.round(sx + Math.cos(a) * r), Math.round(sy + Math.sin(a) * r), 1, 1);
    }
    ctx.fillStyle = '#ffc93c'; disc(ctx, sx, sy, 12);
    ctx.fillStyle = '#fff3a0'; disc(ctx, sx - 2, sy - 2, 8);
    // 飛鳥
    ctx.fillStyle = '#3d5a80';
    for (const b of BIRDS) {
      const span = W + 80;
      const x = Math.round(((b.x + time * b.sp - camX * 0.1) % span + span) % span - 40);
      const y = Math.round(b.y * skyH + Math.sin(time + b.ph) * 3);
      const up = Math.sin(time * 8 + b.ph) > 0;
      ctx.fillRect(x, y, 1, 1);
      ctx.fillRect(x - 1, y - (up ? 1 : 0), 1, 1); ctx.fillRect(x + 1, y - (up ? 1 : 0), 1, 1);
      ctx.fillRect(x - 2, y - (up ? 2 : -1), 1, 1); ctx.fillRect(x + 2, y - (up ? 2 : -1), 1, 1);
    }
  }

  // 遠雲（後層）
  for (const c of CLOUDS.filter((c) => c.layer === 0)) {
    const span = W + 200;
    const x = Math.round(((c.x - camX * 0.06 + time * c.sp) % span + span) % span - 100);
    cloud(ctx, x, Math.round(10 + c.y * (skyH - 20)), Math.round(c.w), dark ? 'rgba(59,53,112,.55)' : 'rgba(255,255,255,.75)', dark ? 'rgba(143,134,214,.5)' : '#fff');
  }

  // 雪山
  for (let sx = 0; sx < W; sx++) {
    const wx = sx + camX * 0.08;
    const h = 64 + 22 * Math.sin(wx * 0.009) + 12 * Math.sin(wx * 0.023 + 1) + 5 * Math.sin(wx * 0.07);
    const y = Math.round(horizon - h);
    ctx.fillStyle = P.mtnA;
    ctx.fillRect(sx, y, 1, Math.round(h));
    if (h > 78) { ctx.fillStyle = P.snow; ctx.fillRect(sx, y, 1, Math.round((h - 78) * 0.5) + 1); }
  }
  // 近雲（前層）
  for (const c of CLOUDS.filter((c) => c.layer === 1)) {
    const span = W + 200;
    const x = Math.round(((c.x - camX * 0.14 + time * c.sp * 1.4) % span + span) % span - 100);
    cloud(ctx, x, Math.round(30 + c.y * (skyH - 10)), Math.round(c.w * 1.2), P.cloud, P.cloudHi);
  }
  // 中景山丘
  ctx.fillStyle = P.mtnB;
  for (let sx = 0; sx < W; sx++) {
    const wx = sx + camX * 0.18;
    const h = 40 + 12 * Math.sin(wx * 0.015 + 2) + 6 * Math.sin(wx * 0.045);
    ctx.fillRect(sx, Math.round(horizon - h), 1, Math.round(h));
  }

  // 遠方城市 + 台北 101 + 摩天輪（視差 0.35）
  const par = 0.35, bw = 9;
  const first = Math.floor((camX * par) / bw) - 2;
  for (let k = first; k < first + W / bw + 4; k++) {
    const r = hash(k);
    const h = Math.round(10 + r * 30 + (hash(k + 0.5) > 0.85 ? 14 : 0));
    const x = Math.round(k * bw - camX * par);
    ctx.fillStyle = r > 0.5 ? P.city : P.city2;
    ctx.fillRect(x, horizon - h, bw - 1, h);
    for (let wy = horizon - h + 3; wy < horizon - 2; wy += 3) {
      for (let wx = x + 1; wx < x + bw - 2; wx += 2) {
        const on = hash(k * 31 + wy * 7 + wx) > (dark ? 0.62 : 0.7);
        if (!on) continue;
        const blink = dark && hash(k + wy) > 0.97 && Math.sin(time * 3 + k) > 0;
        ctx.fillStyle = blink ? P.neon[k % P.neon.length] : P.cityWin;
        ctx.fillRect(wx, wy, 1, 1);
      }
    }
    if (dark && hash(k * 3) > 0.9) { // 屋頂霓虹招牌
      ctx.fillStyle = Math.sin(time * 2.5 + k) > -0.3 ? P.neon[k % P.neon.length] : P.city2;
      ctx.fillRect(x + 1, horizon - h - 3, bw - 3, 2);
    }
  }
  const landmark = 380; // 每隔一段出現一次地標
  const lfirst = Math.floor((camX * par - 200) / landmark);
  for (let k = lfirst; k < lfirst + W / landmark + 3; k++) {
    const x = Math.round(k * landmark + 220 - camX * par);
    if (x < -80 || x > W + 80) continue;
    if (k % 2 === 0) taipei101(ctx, x, horizon, P, time);
    else ferris(ctx, x, horizon, P, time, dark);
  }

  // 跑馬燈飛船（視差 0.2，慢慢飄）
  const span = W + 140;
  const bx = Math.round(((W * 0.6 - camX * 0.2 + time * 6) % span + span) % span - 70);
  blimp(ctx, bx, Math.round(offY * 0.3 + 20 + Math.sin(time * 0.6) * 3), P, ticker || 'STOCKCOASTER', time);
}
