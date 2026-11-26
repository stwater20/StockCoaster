// 台灣街景：台北 101、廟宇、便利商店、夜市燈籠、珍奶招牌、扭蛋機、停車場（畫在世界畫布上）
import { drawText } from './pixel.js';

export const LINKS = {
  train: { url: 'https://train.sectools.tw/?utm_source=stockcoaster&utm_medium=easter_egg', label: '🚆 火車駕駛模擬：花東線、阿里山小火車、台北捷運' },
  airplane: { url: 'https://airplane.sectools.tw/?utm_source=stockcoaster&utm_medium=easter_egg', label: '✈️ 飛向日本：桃園飛成田的 3D 飛行模擬' },
  gacha: { url: 'https://gacha-sho.sectools.tw/?utm_source=stockcoaster&utm_medium=easter_egg', label: '🎰 資安扭蛋機：轉一顆認識 9 種攻擊手法' },
  roadster: { url: 'https://tesla-roadster.sectools.tw/?utm_source=stockcoaster&utm_medium=easter_egg', label: '🏎️ Roadster Rush：飆車閃過三寶' },
  parking: { url: 'https://car.sectools.tw/?utm_source=stockcoaster&utm_medium=easter_egg', label: '🅿️ 停好停滿：台灣 12 個地獄車位' },
  taxi: { url: 'https://taxi.sectools.tw/?utm_source=stockcoaster&utm_medium=easter_egg', label: '🚕 計程車跳表估算：邊搭邊算車資' },
  trash: { url: 'https://tpe-trash-countdown.sectools.tw/?utm_source=stockcoaster&utm_medium=easter_egg', label: '🚛 垃圾車倒數：〈少女的祈禱〉還有幾分鐘到' },
  temple: { url: 'https://five-hour-temple.sectools.tw/?utm_source=stockcoaster&utm_medium=easter_egg', label: '🏮 五小時宮：求一支籤' },
  noodle: { url: 'https://beef-noodle-4am.sectools.tw/?utm_source=stockcoaster&utm_medium=easter_egg', label: '🍜 半夜四點牛肉麵：顧火撈麵小遊戲' },
  oil: { url: 'https://oil-price.sectools.tw/?utm_source=stockcoaster&utm_medium=easter_egg', label: '⛽ 下週油價預測：95／92／98 漲還是跌' },
  typhoon: { url: 'https://typhoon.sectools.tw/?utm_source=stockcoaster&utm_medium=easter_egg', label: '🌀 颱風假機率計算器：明天放不放？' },
  dino: { url: 'https://evo.sectools.tw/?utm_source=stockcoaster&utm_medium=easter_egg', label: '🦖 進化狂奔：像素恐龍跑酷' },
  trend: { url: 'https://trend.sectools.tw/?utm_source=stockcoaster&utm_medium=easter_egg', label: '🔥 台灣即時熱搜：大家現在在搜什麼' },
  tools: { url: 'https://sectools.tw/tools?utm_source=stockcoaster&utm_medium=easter_egg', label: '🧰 SecTools 神奇無用工具集' },
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

// 牛肉麵攤（紅招牌、蒸氣）
export function drawNoodle(g, x, base) {
  g.fillStyle = '#7a4a24'; g.fillRect(x, base - 9, 12, 9);
  g.fillStyle = '#e8233a'; g.fillRect(x - 1, base - 13, 14, 4);
  g.fillStyle = '#ffd23f'; g.fillRect(x + 1, base - 12, 2, 2); g.fillRect(x + 5, base - 12, 2, 2); g.fillRect(x + 9, base - 12, 2, 2);
  g.fillStyle = '#fff6c0'; g.fillRect(x + 2, base - 7, 8, 3);
  g.fillStyle = '#ddd'; g.fillRect(x + 3, base - 16, 1, 2); g.fillRect(x + 6, base - 18, 1, 3); g.fillRect(x + 9, base - 16, 1, 2);
  return { x: x - 1, y: base - 18, w: 14, h: 18, ...LINKS.noodle };
}
// 加油站（頂棚 + 價格看板）
export function drawGas(g, x, base) {
  g.fillStyle = '#e8eaf0'; g.fillRect(x, base - 16, 22, 3);
  g.fillStyle = '#1e6fe0'; g.fillRect(x, base - 13, 22, 1);
  g.fillStyle = '#8a90a8'; g.fillRect(x + 3, base - 13, 1, 13); g.fillRect(x + 18, base - 13, 1, 13);
  g.fillStyle = '#e8233a'; g.fillRect(x + 8, base - 7, 3, 7); g.fillRect(x + 13, base - 7, 3, 7);
  g.fillStyle = '#fff'; g.fillRect(x + 9, base - 6, 1, 2); g.fillRect(x + 14, base - 6, 1, 2);
  g.fillStyle = '#20243a'; g.fillRect(x + 24, base - 20, 9, 12);
  g.fillStyle = '#8a90a8'; g.fillRect(x + 28, base - 8, 1, 8);
  drawText(g, '95', x + 25, base - 18, '#ffd23f'); drawText(g, '98', x + 25, base - 13, '#7fe0c8');
  return { x, y: base - 20, w: 33, h: 20, ...LINKS.oil };
}
// 屋頂看板
export function drawBillboard(g, x, top) {
  g.fillStyle = '#8a90a8'; g.fillRect(x + 4, top - 3, 1, 3); g.fillRect(x + 30, top - 3, 1, 3);
  g.fillStyle = '#141633'; g.fillRect(x, top - 12, 36, 9);
  g.fillStyle = '#ffb020'; g.fillRect(x, top - 12, 36, 1);
  drawText(g, 'SECTOOLS', x + 3, top - 10, '#ffffff');
  return { x, y: top - 13, w: 36, h: 13, ...LINKS.tools };
}
