// 成就系統（存在瀏覽器 localStorage）
export const ACHIEVEMENTS = [
  { id: 'first', ico: '🎟️', name: '初次搭乘', desc: '完成第一趟雲霄飛車' },
  { id: 'tsmc', ico: '⛰️', name: '護國神山攻頂', desc: '坐完台積電 2330' },
  { id: 'etf50', ico: '🇹🇼', name: '台灣五十巡禮', desc: '坐完 0050' },
  { id: 'custom', ico: '🧭', name: '自選玩家', desc: '坐一檔非熱門清單的股票' },
  { id: 'collector', ico: '🗂️', name: '集郵達人', desc: '累積坐過 5 檔不同股票' },
  { id: 'drop5', ico: '🪂', name: '自由落體', desc: '經歷單日跌超過 5%' },
  { id: 'limitup', ico: '🧨', name: '漲停尖叫', desc: '經歷單日漲 9.5% 以上' },
  { id: 'limitdown', ico: '🕳️', name: '跌停惡夢', desc: '經歷單日跌 9.5% 以上' },
  { id: 'highs', ico: '🎆', name: '煙火大會', desc: '一趟內看到 10 次創新高煙火' },
  { id: 'speed', ico: '⚡', name: '光速列車', desc: '時速突破 100 km/h' },
  { id: 'gforce', ico: '🛩️', name: '戰鬥機飛行員', desc: '承受 3.5G 以上' },
  { id: 'float', ico: '🪶', name: '失重漂浮', desc: 'G 力低於 0（屁股離開座位）' },
  { id: 'marathon', ico: '🏃', name: '五年馬拉松', desc: '坐完 5 年期間' },
  { id: 'prophet', ico: '🔮', name: '神準預言家', desc: '發車前猜對終點方向' },
  { id: 'prophet3', ico: '🧙', name: '股市仙人', desc: '累積猜對 3 次' },
  { id: 'diamond', ico: '💎', name: '鑽石手', desc: '經歷 30% 以上回檔仍坐到終點' },
  { id: 'chicken', ico: '🐔', name: '我要下車！', desc: '一趟內按 5 次暫停' },
  { id: 'leek', ico: '🥬', name: '韭菜之心', desc: '坐完一趟報酬 < -20%' },
  { id: 'rich', ico: '🤑', name: '財富自由', desc: '坐完一趟報酬 > +50%' },
  { id: 'zen', ico: '🧘', name: '心如止水', desc: '整趟報酬在 ±2% 以內' },
  { id: 'future', ico: '🛸', name: '穿越未來', desc: '駛入 AI 預測軌道' },
  { id: 'allpax', ico: '👨‍👩‍👧‍👦', name: '全員到齊', desc: '每位乘客都坐過' },
  { id: 'night', ico: '🌙', name: '夜盤戰士', desc: '在凌晨 0–5 點搭乘' },
  { id: 'moon', ico: '🚀', name: 'To the Moon', desc: '？？？（找找彩蛋）' },
  { id: 'curious', ico: '🐣', name: '好奇寶寶', desc: '？？？（logo 好像可以點）' },
];

const KEY = 'stockcoaster.v1';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* 隱私模式 */ } }

export const store = (() => {
  const s = Object.assign({ got: {}, stocks: [], pax: [], correct: 0, rides: 0 }, load());
  return {
    get state() { return s; },
    has: (id) => !!s.got[id],
    unlock(id) {
      if (s.got[id]) return null;
      s.got[id] = Date.now();
      save(s);
      return ACHIEVEMENTS.find((a) => a.id === id) || null;
    },
    addStock(code) { if (!s.stocks.includes(code)) s.stocks.push(code); save(s); return s.stocks.length; },
    addPax(p) { if (!s.pax.includes(p)) s.pax.push(p); save(s); return s.pax.length; },
    addCorrect() { s.correct++; save(s); return s.correct; },
    addRide() { s.rides++; save(s); return s.rides; },
    count: () => Object.keys(s.got).length,
  };
})();
