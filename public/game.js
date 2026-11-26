// 遊戲玩法：金幣、紅包、利空炸彈、神秘箱的擺放、碰撞與繪製
import { drawText, textWidth } from './pixel.js';

function seeded(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

export const JUMP_V = 125;   // 起跳速度（px/s）
export const JUMP_G = 260;   // 空中重力（px/s²）
export const TRAIN_H = 15;   // 列車高度（px）

// 依股價走勢擺道具：大跌日放炸彈、創新高放紅包、其餘撒金幣
export function placeItems(tr) {
  const { N, closes, X0, dx, Xtoday, Xend, ys, weekly, data } = tr;
  const rnd = seeded([...data.code].reduce((a, c) => a * 31 + c.charCodeAt(0), 11) + N);
  const items = [];
  const bombs = [];
  const thr = weekly ? -0.05 : -0.025;
  let last = -1e9;
  for (let i = 3; i < N; i++) {
    const r = closes[i] / closes[i - 1] - 1;
    const x = Math.round(X0 + (i - 0.5) * dx);
    if (r <= thr && x - last > 80 && x > X0 + 90) { items.push({ type: 'bomb', x, dy: 4 }); bombs.push(x); last = x; }
  }
  let runMax = closes[0], highs = 0;
  for (let i = 1; i < N; i++) {
    if (closes[i] > runMax) {
      runMax = closes[i];
      if (i > 3 && highs++ % 3 === 0) items.push({ type: 'hongbao', x: Math.round(X0 + i * dx), dy: 27 });
    }
  }
  const nearBomb = (x, w) => bombs.some((b) => x > b - 26 && x < b + w + 18);
  for (let x = X0 + 50; x < Xtoday - 30;) {
    if (rnd() < 0.55) {
      if (!nearBomb(x, 16)) for (let j = 0; j < 3; j++) items.push({ type: 'coin', x: x + j * 8, dy: 9 });
    } else {
      for (let j = 0; j < 5; j++) items.push({ type: 'coin', x: x + j * 8, dy: 13 + Math.round(Math.sin((Math.PI * j) / 4) * 15) });
    }
    x += 60 + Math.round(rnd() * 55);
  }
  for (const k of [0.3, 0.7]) items.push({ type: 'mystery', x: Math.round(Xtoday + (Xend - Xtoday) * k), dy: 24 });
  for (const it of items) { it.y = ys[it.x] - it.dy; it.taken = false; it.ph = rnd() * 6; }
  items.sort((a, b) => a.x - b.x);
  return items;
}

const SIZE = { coin: 3, hongbao: 4, bomb: 3, mystery: 4 };

// 回傳這一幀撞到的道具
export function collide(items, x, railY, jumpH) {
  const top = railY - jumpH - TRAIN_H, bottom = railY - jumpH;
  const hits = [];
  for (const it of items) {
    if (it.taken || it.x < x - 12) continue;
    if (it.x > x + 12) break;
    const r = SIZE[it.type];
    if (Math.abs(it.x - x) <= 7 + r && it.y + r >= top && it.y - r <= bottom) { it.taken = true; hits.push(it); }
  }
  return hits;
}

export function drawItems(ctx, items, camX, offY, W, time) {
  for (const it of items) {
    if (it.taken) continue;
    const sx = Math.round(it.x - camX);
    if (sx < -10) continue;
    if (sx > W + 10) break;
    const bob = Math.round(Math.sin(time * 4 + it.ph) * 1.2);
    const sy = Math.round(it.y + offY) + (it.type === 'bomb' ? 0 : bob);
    if (it.type === 'coin') {
      const w = [5, 3, 1, 3][Math.floor(time * 8 + it.ph) % 4];
      ctx.fillStyle = '#a86a00'; ctx.fillRect(sx - (w >> 1), sy - 2, w, 5);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(sx - (w >> 1), sy - 2, w, 4);
      if (w > 2) { ctx.fillStyle = '#fff6b0'; ctx.fillRect(sx - (w >> 1), sy - 2, 1, 2); }
    } else if (it.type === 'hongbao') {
      ctx.fillStyle = '#8f0f1c'; ctx.fillRect(sx - 3, sy - 3, 7, 9);
      ctx.fillStyle = '#e8233a'; ctx.fillRect(sx - 3, sy - 4, 7, 8);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(sx - 1, sy - 1, 3, 3);
      ctx.fillStyle = '#ff8a95'; ctx.fillRect(sx - 3, sy - 4, 7, 1);
      if (Math.sin(time * 6 + it.ph) > 0.7) { ctx.fillStyle = '#fff'; ctx.fillRect(sx + 4, sy - 6, 1, 1); }
    } else if (it.type === 'bomb') {
      ctx.fillStyle = '#111';
      ctx.fillRect(sx - 2, sy - 7, 5, 7); ctx.fillRect(sx - 3, sy - 6, 7, 5);
      ctx.fillStyle = '#555'; ctx.fillRect(sx - 1, sy - 6, 1, 2);
      ctx.fillStyle = '#9a7b4f'; ctx.fillRect(sx + 1, sy - 9, 1, 2);
      ctx.fillStyle = Math.sin(time * 20 + it.ph) > 0 ? '#ffd23f' : '#ff5a1f'; ctx.fillRect(sx + 1, sy - 10, 1, 1);
      if (Math.sin(time * 3 + it.ph) > 0) drawText(ctx, '!', sx - 1, sy - 17, '#ff4757');
    } else if (it.type === 'mystery') {
      ctx.fillStyle = '#7a4d00'; ctx.fillRect(sx - 4, sy - 4, 9, 9);
      ctx.fillStyle = '#ffb020'; ctx.fillRect(sx - 4, sy - 4, 8, 8);
      ctx.fillStyle = '#ffe08a'; ctx.fillRect(sx - 4, sy - 4, 8, 1);
      drawText(ctx, '?', sx - 1, sy - 2, '#5a2d00');
    }
  }
}

// 浮動分數文字
export const floats = [];
export function popText(x, y, text, color) { floats.push({ x, y, text, color, life: 0 }); }
export function drawFloats(ctx, camX, offY, dt) {
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.life += dt;
    if (f.life > 0.9) { floats.splice(i, 1); continue; }
    const x = Math.round(f.x - camX - textWidth(f.text) / 2), y = Math.round(f.y + offY - f.life * 22);
    drawText(ctx, f.text, x, y, f.color, 1, '#000');
  }
}
