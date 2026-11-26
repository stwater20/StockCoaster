// 街道與天空的會動角色：機車大軍、三寶、跑車、高架小火車、拉布條飛機。可以點的會回報 hotspot。
import { drawText, textWidth } from './pixel.js';
import { LINKS } from './taiwan.js';

const R = Math.random;
const LANES = [{ y: 199, dir: 1 }, { y: 203, dir: -1 }]; // 世界座標的車輪基準線
const COLORS = ['#ff5a68', '#38b6ff', '#ffd23f', '#2ed573', '#ffffff', '#b57bff', '#ff9a2e'];

export function createStreet() {
  return { cars: [], train: { t: 6, x: 0, on: false }, plane: { t: 3, x: 0, on: false }, honk: 0, sanbaoSeen: false };
}

function spawn(st, camX, W, anywhere) {
  const lane = R() < 0.5 ? 0 : 1;
  const r = R();
  const type = r < 0.46 ? 'scooter' : r < 0.6 ? 'sanbao' : r < 0.67 ? 'roadster' : r < 0.77 ? 'taxi' : r < 0.82 ? 'trash' : r < 0.85 ? 'dino' : 'car';
  const dir = LANES[lane].dir * (type === 'sanbao' && R() < 0.4 ? -1 : 1); // 三寶有時逆向
  const sp = (type === 'roadster' ? 55 : type === 'dino' ? 48 : type === 'trash' ? 12 : type === 'car' || type === 'taxi' ? 32 : 24) + R() * 14;
  const x = anywhere ? camX + R() * W : dir > 0 ? camX - 30 - R() * 60 : camX + W + 30 + R() * 60;
  return { type, lane, dir, sp, x, y: LANES[lane].y, ph: R() * 10, color: COLORS[(R() * COLORS.length) | 0], stop: 0 };
}

export function updateStreet(st, dt, camX, W, onHonk) {
  if (st.cars.length < 12) while (st.cars.length < 12) st.cars.push(spawn(st, camX, W, true));
  for (let i = 0; i < st.cars.length; i++) {
    const c = st.cars[i];
    if (c.type === 'sanbao') {
      c.ph += dt;
      if (c.stop > 0) c.stop -= dt;
      else if (R() < dt * 0.25) c.stop = 0.6 + R(); // 突然停下
      if (R() < dt * 0.5) c.lane = 1 - c.lane;         // 亂切車道
      c.y += (LANES[c.lane].y - c.y) * Math.min(1, dt * 3);
      c.x += c.dir * (c.stop > 0 ? 0 : c.sp * (0.6 + 0.6 * Math.abs(Math.sin(c.ph)))) * dt;
      if (R() < dt * 0.35) { c.horn = 0.8; onHonk?.(c); }
      if (c.horn > 0) c.horn -= dt;
    } else {
      c.x += c.dir * c.sp * dt;
    }
    if (c.x < camX - 200 || c.x > camX + W + 200) st.cars[i] = spawn(st, camX, W, false);
  }
  // 高架小火車、飛機：偶爾經過
  for (const k of ['train', 'plane']) {
    const o = st[k];
    if (!o.on) { o.t -= dt; if (o.t <= 0) { o.on = true; o.x = k === 'train' ? -90 : W + 40; } }
    else {
      o.x += (k === 'train' ? 38 : -22) * dt;
      if ((k === 'train' && o.x > W + 20) || (k === 'plane' && o.x < -170)) { o.on = false; o.t = k === 'train' ? 18 + R() * 14 : 26 + R() * 20; }
    }
  }
}

// 天空與遠景層（畫在世界畫布之前）
export function drawBackdrop(ctx, st, W, offY, GROUND, time, theme, spots, rain = 0) {
  const dark = theme === 'dark';
  // 下雨時天上有颱風
  if (rain > 0.3) {
    const cx = Math.round(W * 0.28), cy = Math.round(Math.max(18, offY * 0.4) + 16);
    ctx.fillStyle = `rgba(220,230,255,${0.5 * rain})`;
    for (let arm = 0; arm < 3; arm++) for (let t = 0; t < 1; t += 0.03) {
      const a = time * 1.5 + arm * 2.094 + t * 5, r = 2 + t * 16;
      ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.6), 2, 1);
    }
    ctx.fillStyle = '#fff'; ctx.fillRect(cx - 1, cy - 1, 2, 2);
    spots.push({ x: cx - 18, y: cy - 12, w: 36, h: 24, ...LINKS.typhoon });
  }
  // 高架軌道
  const ry = offY + GROUND - 54;
  ctx.fillStyle = dark ? 'rgba(120,130,190,.55)' : 'rgba(120,150,190,.55)';
  ctx.fillRect(0, ry + 1, W, 2);
  for (let x = ((-time * 0) | 0) % 40; x < W; x += 40) ctx.fillRect(x, ry + 3, 2, 54);
  const tr = st.train;
  if (tr.on) {
    const x0 = Math.round(tr.x);
    for (let k = 0; k < 4; k++) {
      const x = x0 - k * 19;
      ctx.fillStyle = '#f4f6fa'; ctx.fillRect(x, ry - 8, 18, 8);
      ctx.fillStyle = '#1e6fe0'; ctx.fillRect(x, ry - 3, 18, 2);
      ctx.fillStyle = dark ? '#ffe9a0' : '#9fd3ff';
      for (let w = 2; w < 16; w += 4) ctx.fillRect(x + w, ry - 7, 2, 2);
      ctx.fillStyle = '#333'; ctx.fillRect(x + 2, ry, 3, 1); ctx.fillRect(x + 13, ry, 3, 1);
    }
    ctx.fillStyle = '#ff8c1a'; ctx.fillRect(x0 + 15, ry - 8, 3, 3);
    drawText(ctx, 'TRAIN', x0 - 57, ry - 15, dark ? '#ffd23f' : '#1e6fe0', 1, dark ? '#000' : '#fff');
    spots.push({ x: x0 - 76, y: ry - 16, w: 96, h: 18, ...LINKS.train });
  }
  // 飛機拉布條
  const pl = st.plane;
  if (pl.on) {
    const x = Math.round(pl.x), y = Math.round(Math.max(14, offY * 0.5) + 10 + Math.sin(time * 1.3) * 2);
    ctx.fillStyle = '#f4f6fa';
    ctx.fillRect(x, y, 20, 4); ctx.fillRect(x - 2, y + 1, 2, 2);
    ctx.fillRect(x + 8, y - 4, 4, 4); ctx.fillRect(x + 8, y + 4, 4, 3);
    ctx.fillRect(x + 17, y - 4, 3, 4);
    ctx.fillStyle = '#1e6fe0'; ctx.fillRect(x, y + 2, 20, 1);
    ctx.fillStyle = '#7fb8ff'; for (let w = 2; w < 16; w += 3) ctx.fillRect(x + w, y + 1, 1, 1);
    const txt = 'SECTOOLS AIRLINES';
    const bx = x + 26, tw = textWidth(txt) + 6;
    ctx.fillStyle = '#aaa'; ctx.fillRect(x + 20, y + 2, 6, 1);
    ctx.fillStyle = '#fff6d0'; ctx.fillRect(bx, y - 2, tw, 9);
    ctx.fillStyle = '#e8233a'; ctx.fillRect(bx, y - 2, tw, 1); ctx.fillRect(bx, y + 6, tw, 1);
    drawText(ctx, txt, bx + 3, y, '#e8233a');
    spots.push({ x: x - 2, y: y - 6, w: tw + 30, h: 16, ...LINKS.airplane });
  }
}

function scooter(ctx, x, y, dir, color, helmet) {
  ctx.fillStyle = '#222'; ctx.fillRect(x - 3, y - 1, 2, 2); ctx.fillRect(x + 2, y - 1, 2, 2);
  ctx.fillStyle = color; ctx.fillRect(x - 3, y - 3, 7, 2);
  ctx.fillRect(x + (dir > 0 ? 2 : -3), y - 5, 2, 2);
  ctx.fillStyle = '#3a3d5a'; ctx.fillRect(x - 1, y - 6, 2, 3);
  ctx.fillStyle = helmet; ctx.fillRect(x - 1, y - 8, 3, 2);
}

// 路面上的車（畫在世界畫布之後）
export function drawRoad(ctx, st, camX, offY, W, time, spots) {
  const list = [...st.cars].sort((a, b) => a.y - b.y);
  for (const c of list) {
    const x = Math.round(c.x - camX), y = Math.round(c.y + offY);
    if (x < -20 || x > W + 20) continue;
    if (c.type === 'scooter') scooter(ctx, x, y, c.dir, c.color, '#ffffff');
    else if (c.type === 'sanbao') {
      scooter(ctx, x, y + (c.stop > 0 ? 0 : Math.round(Math.sin(time * 9 + c.ph))), c.dir, '#ff4fd8', '#ffd23f');
      if (c.horn > 0) {
        ctx.fillStyle = '#fff'; ctx.fillRect(x - 6, y - 17, 13, 7);
        ctx.fillStyle = '#111'; ctx.fillRect(x - 6, y - 10, 13, 1);
        drawText(ctx, '!?', x - 3, y - 16, '#e8233a');
      }
    } else if (c.type === 'roadster') {
      ctx.fillStyle = '#c8102e'; ctx.fillRect(x - 7, y - 4, 15, 3);
      ctx.fillRect(x + (c.dir > 0 ? -3 : -2), y - 6, 6, 2);
      ctx.fillStyle = '#9fd3ff'; ctx.fillRect(x + (c.dir > 0 ? 1 : -2), y - 6, 2, 1);
      ctx.fillStyle = '#111'; ctx.fillRect(x - 5, y - 1, 3, 2); ctx.fillRect(x + 3, y - 1, 3, 2);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(c.dir > 0 ? x + 7 : x - 7, y - 4, 1, 1);
      spots.push({ x: x - 9, y: y - 9, w: 19, h: 11, ...LINKS.roadster });
    } else if (c.type === 'taxi') {
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(x - 7, y - 5, 15, 4); ctx.fillRect(x - 4, y - 8, 9, 3);
      ctx.fillStyle = '#9fd3ff'; ctx.fillRect(x - 3, y - 7, 3, 2); ctx.fillRect(x + 1, y - 7, 3, 2);
      ctx.fillStyle = '#111'; ctx.fillRect(x - 7, y - 3, 15, 1); ctx.fillRect(x - 5, y - 1, 3, 2); ctx.fillRect(x + 3, y - 1, 3, 2);
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 10, 3, 2);
      spots.push({ x: x - 9, y: y - 12, w: 19, h: 14, ...LINKS.taxi });
    } else if (c.type === 'trash') {
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(x - 10, y - 9, 14, 8);
      ctx.fillStyle = '#1c9c5a'; ctx.fillRect(x - 10, y - 6, 14, 2);
      ctx.fillStyle = '#f4f6fa'; ctx.fillRect(c.dir > 0 ? x + 4 : x - 15, y - 7, 6, 6);
      ctx.fillStyle = '#9fd3ff'; ctx.fillRect(c.dir > 0 ? x + 6 : x - 14, y - 6, 3, 2);
      ctx.fillStyle = '#111'; ctx.fillRect(x - 8, y - 1, 3, 2); ctx.fillRect(x + 4, y - 1, 3, 2);
      ctx.fillStyle = '#ff7aa8'; ctx.fillRect(x - 6 + Math.round(Math.sin(time * 2) * 2), y - 14, 1, 3); ctx.fillRect(x - 5 + Math.round(Math.sin(time * 2) * 2), y - 14, 2, 1);
      spots.push({ x: x - 16, y: y - 17, w: 28, h: 19, ...LINKS.trash });
    } else if (c.type === 'dino') {
      const f = Math.floor(time * 10) % 2;
      ctx.fillStyle = '#3fbf7f';
      ctx.fillRect(x - 3, y - 8, 6, 5); ctx.fillRect(c.dir > 0 ? x + 2 : x - 5, y - 10, 4, 3);
      ctx.fillRect(c.dir > 0 ? x - 6 : x + 3, y - 7, 3, 2);
      ctx.fillRect(x - 2, y - 3, 1, 2 + f); ctx.fillRect(x + 1, y - 3, 1, 3 - f);
      ctx.fillStyle = '#111'; ctx.fillRect(c.dir > 0 ? x + 4 : x - 4, y - 9, 1, 1);
      spots.push({ x: x - 8, y: y - 12, w: 16, h: 13, ...LINKS.dino });
    } else {
      ctx.fillStyle = c.color; ctx.fillRect(x - 7, y - 5, 15, 4);
      ctx.fillRect(x - 4, y - 8, 9, 3);
      ctx.fillStyle = '#9fd3ff'; ctx.fillRect(x - 3, y - 7, 3, 2); ctx.fillRect(x + 1, y - 7, 3, 2);
      ctx.fillStyle = '#111'; ctx.fillRect(x - 5, y - 1, 3, 2); ctx.fillRect(x + 3, y - 1, 3, 2);
    }
  }
}
