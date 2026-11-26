// 像素素材：3x5 點陣字、乘客與車廂 sprite

const GLYPHS = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
  '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001001010010',
  '8': '111101111101111', '9': '111101111001111', '/': '001001010100100', '.': '000000000000010',
  ',': '000000000010100', '-': '000000111000000', '+': '000010111010000', '%': '101001010100101',
  '!': '010010010000010', '?': '111001011000010', '$': '011110010011110', ':': '000010000010000',
  ' ': '000000000000000', 'A': '010101111101101', 'D': '110101101101110', 'E': '111100111100111',
  'G': '111100101101111', 'H': '101101111101101', 'I': '111010010010111', 'L': '100100100100111',
  'M': '101111111101101', 'N': '110101101101101', 'O': '111101101101111', 'P': '111101111100100',
  'R': '110101110101101', 'S': '111100111001111', 'T': '111010010010010', 'U': '101101101101111',
  'W': '101101111111101', 'Y': '101101010010010', 'Z': '111001010100111', 'x': '000101010101000',
  '♥': '101111111111010'.slice(0, 15),
};

export function textWidth(str, s = 1) { return str.length * 4 * s - s; }

export function drawText(ctx, str, x, y, color = '#fff', s = 1, shadow = null) {
  if (shadow) drawText(ctx, str, x + s, y + s, shadow, s);
  ctx.fillStyle = color;
  let cx = Math.round(x);
  y = Math.round(y);
  for (const ch of String(str).toUpperCase()) {
    const g = GLYPHS[ch] || GLYPHS[' '];
    for (let i = 0; i < 15; i++) if (g[i] === '1') ctx.fillRect(cx + (i % 3) * s, y + Math.floor(i / 3) * s, s, s);
    cx += 4 * s;
  }
}

// 乘客 8x8：. 透明 k 黑 w 白 a 主色 c 副色 o 橘 p 粉 h 灰 y 黃 r 紅 b 藍
const PAL = { k: '#111', w: '#fff', o: '#ff9a2e', p: '#ff7aa8', h: '#d8d8e0', y: '#ffd23f', r: '#e83b3b', b: '#4aa3ff' };
export const PAX_SPRITES = {
  '🐻': { a: '#9a5b2c', c: '#e2b07a', px: ['.aa..aa.', '.aaaaaa.', 'aaaaaaaa', 'aakaakaa', 'aaaccaaa', 'aackcaaa', '.aaccaa.', '..aaaa..'] },
  '🐱': { a: '#f2a43a', c: '#fff1d6', px: ['a......a', 'aa....aa', 'aaaaaaaa', 'akaaaaka', 'aaaccaaa', 'aacpcaaa', '.aaaaaa.', '..a..a..'] },
  '🐸': { a: '#4caf50', c: '#c8f7c5', px: ['.ww..ww.', '.wk..kw.', 'aaaaaaaa', 'aaaaaaaa', 'akkkkkka', 'aaaaaaaa', '.cccccc.', '..a..a..'] },
  '🧓': { a: '#f1c27d', c: '#d8d8e0', px: ['..cccc..', '.cccccc.', 'caaaaaac', 'akkaakka', 'aaaaaaaa', 'aaccccaa', '.aaaaaa.', '..aaaa..'] },
  '🦖': { a: '#3fbf7f', c: '#bff5d8', px: ['..aaaaa.', '.aaaaaaa', '.aakaaaa', '.aaaaaaa', 'aaawawaa', 'aaaaaaa.', '.acca...', '.a.a....'] },
  '🐧': { a: '#2a3550', c: '#ffffff', px: ['..aaaa..', '.acccca.', '.ckcckc.', '.ccoocc.', 'aaccccaa', 'aaccccaa', '.acccca.', '.oo..oo.'] },
  '🚀': { a: '#e8e8f0', c: '#4aa3ff', px: ['...aa...', '..aaaa..', '..acca..', '..aaaa..', '.raaaar.', '.raaaar.', 'r.oyyo.r', '...oo...'] },
};

const CAR = ['.bbbbbbbbbbbb.', 'bbttttttttttbb', 'bbbbbbbbbbbbbb', 'bdbbbbbbbbbbdb', '.kkkkkkkkkkkk.', '..khk....khk..', '...k......k...'];

function paint(ctx, rows, pal, ox = 0, oy = 0) {
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === '.') return;
    ctx.fillStyle = pal[ch] || PAL[ch] || '#f0f';
    ctx.fillRect(ox + x, oy + y, 1, 1);
  }));
}

const cache = new Map();
// 車廂 + 乘客合成，回傳 14x15 canvas；錨點 (7, 15) = 軌道上
export function carSprite(pax, lead) {
  const key = pax + lead;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = 14; c.height = 15;
  const x = c.getContext('2d');
  const s = PAX_SPRITES[pax] || PAX_SPRITES['🐻'];
  paint(x, s.px, s, 3, 0);
  paint(x, CAR, lead ? { b: '#e83b4e', t: '#ffd23f', d: '#9c1c2c' } : { b: '#ffb020', t: '#fff1a8', d: '#b36b00' }, 0, 8);
  cache.set(key, c);
  return c;
}
