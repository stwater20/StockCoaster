// 台灣街景：台北 101、廟宇、便利商店、夜市燈籠、珍奶招牌、扭蛋機、停車場（畫在世界畫布上）
import { drawText } from './pixel.js';

export const LINKS = {
  train: { url: 'https://train.sectools.tw/?utm_source=stockcoaster&utm_medium=easter_egg', label: '🚆 火車駕駛模擬：花東線、阿里山小火車、台北捷運' },
  airplane: { url: 'https://airplane.sectools.tw/?utm_source=stockcoaster&utm_medium=easter_egg', label: '✈️ 飛向日本：桃園飛成田的 3D 飛行模擬' },
  gacha: { url: 'https://gacha-sho.sectools.tw/?utm_source=stockcoaster&utm_medium=easter_egg', label: '🎰 資安扭蛋機：轉一顆認識 9 種攻擊手法' },
  roadster: { url: 'https://tesla-roadster.sectools.tw/?utm_source=stockcoaster&utm_medium=easter_egg', label: '🏎️ Roadster Rush：飆車閃過三寶' },
  parking: { url: 'https://car.sectools.tw/?utm_source=stockcoaster&utm_medium=easter_egg', label: '🅿️ 停好停滿：台灣 12 個地獄車位' },
};

// 台北 101（高度 h，底部中心在 cx, base）
export function draw101(g, cx, base, h, dark) {
  const body = dark ? '#3b4a8a' : '#6f97c8', hi = dark ? '#a9b8ff' : '#e3f0ff', glass = dark ? '#7fe0c8' : '#bff0e3';
  const baseH = Math.round(h * 0.18), spire = Math.round(h * 0.16);
  const segs = 8, segH = Math.max(4, Math.floor((h - baseH - spire - 6) / segs));
  g.fillStyle = body;
  g.fillRect(cx - 8, base - baseH, 17, baseH);
  g.fillStyle = glass;
  for (let y = base - baseH + 2; y < base - 1; y += 3) for (let x = cx - 7; x < cx + 8; x += 2) g.fillRect(x, y, 1, 1);
  let y = base - baseH;
  g.fillStyle = body; g.fillRect(cx - 5, y - 3, 11, 3); y -= 3;
  for (let s = 0; s < segs; s++) {
    for (let r = 0; r < segH; r++) {
      const w = 7 + Math.round((r / segH) * 3) * 2; // 竹節：每節上寬下窄
      g.fillStyle = r === segH - 1 ? hi : body;
      g.fillRect(cx - (w >> 1), y - r - 1, w, 1);
      if (r % 2 === 0 && r < segH - 1) { g.fillStyle = glass; g.fillRect(cx - 1, y - r - 1, 1, 1); g.fillRect(cx + 1, y - r - 1, 1, 1); }
    }
    y -= segH;
  }
  g.fillStyle = body; g.fillRect(cx - 2, y - 3, 5, 3);
  g.fillRect(cx, y - 3 - spire, 1, spire);
  g.fillStyle = '#ff4757'; g.fillRect(cx, y - 4 - spire, 1, 1);
}

// 廟宇：紅柱、燕尾屋脊、金色裝飾
export function drawTemple(g, x, base, w) {
  const h = 14;
  g.fillStyle = '#b3242c'; g.fillRect(x + 2, base - h, w - 4, h);
  g.fillStyle = '#ffcf4a';
  for (let px = x + 3; px < x + w - 3; px += 4) g.fillRect(px, base - h + 2, 1, h - 2);
  g.fillStyle = '#5a1a12'; g.fillRect(x + (w >> 1) - 2, base - 6, 5, 6);
  // 屋頂（往兩邊翹）
  g.fillStyle = '#2f6b4f';
  g.fillRect(x, base - h - 3, w, 3);
  g.fillRect(x - 2, base - h - 4, 3, 2); g.fillRect(x + w - 1, base - h - 4, 3, 2);
  g.fillStyle = '#e8b04a';
  g.fillRect(x + 1, base - h - 5, w - 2, 2);
  g.fillRect(x - 3, base - h - 6, 2, 2); g.fillRect(x + w + 1, base - h - 6, 2, 2);
  g.fillStyle = '#ff6a3d'; g.fillRect(x + (w >> 1) - 1, base - h - 8, 3, 3);
  g.fillStyle = '#ffd23f'; g.fillRect(x + (w >> 1), base - h - 9, 1, 1);
}

// 便利商店（綠橘紅條紋招牌、亮著的落地窗）
export function drawStore(g, x, base, w, h) {
  g.fillStyle = '#f4f6fa'; g.fillRect(x, base - h, w, h);
  g.fillStyle = '#1c9c5a'; g.fillRect(x, base - h + 1, w, 1);
  g.fillStyle = '#ff8c1a'; g.fillRect(x, base - h + 2, w, 1);
  g.fillStyle = '#e8233a'; g.fillRect(x, base - h + 3, w, 1);
  g.fillStyle = '#fff6c0'; g.fillRect(x + 1, base - 5, w - 2, 4);
  g.fillStyle = '#5a6a86'; g.fillRect(x + (w >> 1), base - 5, 1, 5);
}

// 珍奶招牌
export function drawBoba(g, x, top) {
  g.fillStyle = '#ffffff'; g.fillRect(x, top - 7, 5, 6);
  g.fillStyle = '#c98a4b'; g.fillRect(x + 1, top - 5, 3, 3);
  g.fillStyle = '#3a2416'; g.fillRect(x + 1, top - 3, 1, 1); g.fillRect(x + 3, top - 3, 1, 1);
  g.fillStyle = '#ff5a8a'; g.fillRect(x + 3, top - 10, 1, 4);
  g.fillStyle = '#ddd'; g.fillRect(x + 2, top - 1, 1, 1);
}

// 夜市燈籠串
export function drawLanterns(g, x0, y0, x1, y1) {
  const n = Math.max(2, Math.round((x1 - x0) / 4));
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = Math.round(x0 + (x1 - x0) * t), sag = Math.sin(Math.PI * t) * 3;
    const y = Math.round(y0 + (y1 - y0) * t + sag);
    g.fillStyle = '#6b5a4a'; g.fillRect(x, y, 1, 1);
    if (i % 2 === 1) { g.fillStyle = '#ff3b3b'; g.fillRect(x - 1, y + 1, 3, 3); g.fillStyle = '#ffd23f'; g.fillRect(x, y + 4, 1, 1); }
  }
}

// 扭蛋機（回傳 hotspot 範圍）
export function drawGacha(g, x, base) {
  g.fillStyle = '#e8233a'; g.fillRect(x, base - 6, 9, 6);
  g.fillStyle = '#111'; g.fillRect(x + 3, base - 4, 3, 2);
  g.fillStyle = '#cfe8ff'; g.fillRect(x + 1, base - 14, 7, 8);
  const balls = ['#ff5a68', '#ffd23f', '#38b6ff', '#2ed573', '#b57bff'];
  for (let i = 0; i < 8; i++) { g.fillStyle = balls[i % balls.length]; g.fillRect(x + 2 + (i % 3) * 2, base - 8 - Math.floor(i / 3) * 2, 2, 2); }
  g.fillStyle = '#e8233a'; g.fillRect(x, base - 15, 9, 2);
  g.fillStyle = '#ffd23f'; g.fillRect(x + 3, base - 17, 3, 2);
  return { x, y: base - 17, w: 9, h: 17, ...LINKS.gacha };
}

export function drawParking(g, x, base) {
  g.fillStyle = '#8a90a8'; g.fillRect(x + 3, base - 10, 1, 10);
  g.fillStyle = '#1e6fe0'; g.fillRect(x, base - 18, 7, 8);
  g.fillStyle = '#fff'; g.fillRect(x, base - 18, 7, 1);
  drawText(g, 'P', x + 2, base - 16, '#ffffff');
  return { x, y: base - 18, w: 7, h: 18, ...LINKS.parking };
}
