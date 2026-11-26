// 全合成音效：風聲、爬坡喀喀聲、尖叫、煙火、成就叮咚
export class Sfx {
  constructor() { this.ctx = null; this.on = true; this.lastClack = 0; this.lastScream = 0; }

  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.on ? 0.6 : 0;
    this.master.connect(ctx.destination);

    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;

    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass'; this.windFilter.Q.value = 0.7;
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0;
    src.connect(this.windFilter).connect(this.windGain).connect(this.master);
    src.start();
  }

  toggle() {
    this.on = !this.on;
    if (this.master) this.master.gain.setTargetAtTime(this.on ? 0.6 : 0, this.ctx.currentTime, 0.05);
    return this.on;
  }

  wind(speed) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(Math.min(0.5, speed / 90), t, 0.1);
    this.windFilter.frequency.setTargetAtTime(200 + speed * 22, t, 0.1);
  }

  silence() { if (this.ctx) this.windGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2); }

  clack() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastClack < 0.16) return;
    this.lastClack = now;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'square'; o.frequency.value = 180;
    g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    o.connect(g).connect(this.master); o.start(now); o.stop(now + 0.06);
  }

  scream(intensity = 1) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastScream < 3.5) return;
    this.lastScream = now;
    const voices = 1 + Math.floor(Math.random() * 3);
    for (let k = 0; k < voices; k++) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
      const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
      const base = 650 + Math.random() * 500;
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(base, now);
      o.frequency.linearRampToValueAtTime(base * 1.5, now + 0.25);
      o.frequency.linearRampToValueAtTime(base * 1.1, now + 1.3);
      lfo.frequency.value = 6 + Math.random() * 3; lg.gain.value = 25;
      lfo.connect(lg).connect(o.frequency);
      f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 2;
      const peak = 0.06 * intensity;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(peak, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
      o.connect(f).connect(g).connect(this.master);
      o.start(now + k * 0.07); lfo.start(now); o.stop(now + 1.5); lfo.stop(now + 1.5);
    }
  }

  boom() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    s.buffer = this.noiseBuf; f.type = 'lowpass'; f.frequency.value = 900;
    g.gain.setValueAtTime(0.35, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    s.connect(f).connect(g).connect(this.master); s.start(now); s.stop(now + 0.7);
  }

  blip(f0, f1, dur, type = 'square', vol = 0.12) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, now);
    o.frequency.exponentialRampToValueAtTime(f1, now + dur);
    g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    o.connect(g).connect(this.master); o.start(now); o.stop(now + dur + 0.02);
  }
  jump() { this.blip(300, 700, 0.15); }
  coin() { this.blip(990, 1500, 0.09, 'square', 0.08); }
  hop() { this.blip(500, 250, 0.25, 'triangle', 0.15); }

  chime() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [880, 1318.5, 1760].forEach((fr, i) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'triangle'; o.frequency.value = fr;
      const t = now + i * 0.09;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.55);
    });
  }
}

// ---------- 8-bit 背景音樂：跟著行情換心情 ----------
const NOTE = (n) => 440 * 2 ** ((n - 69) / 12);
const MOODS = {
  // 和弦根音（MIDI）、音階、速度
  calm: { bpm: 112, chords: [60, 67, 69, 65], scale: [0, 2, 4, 7, 9], minor: false },
  up: { bpm: 138, chords: [60, 67, 69, 65], scale: [0, 2, 4, 7, 9, 12], minor: false },
  down: { bpm: 100, chords: [57, 53, 48, 55], scale: [0, 3, 5, 7, 10], minor: true },
  ai: { bpm: 120, chords: [62, 58, 65, 60], scale: [0, 2, 3, 7, 9, 10], minor: true },
};
export class Music {
  constructor(sfx) { this.sfx = sfx; this.on = true; this.playing = false; this.mood = 'calm'; this.step = 0; this.next = 0; this.seed = 1; }
  rnd() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }
  start() {
    const ctx = this.sfx.ctx;
    if (!ctx || this.playing || !this.on) return;
    this.playing = true;
    this.out = ctx.createGain(); this.out.gain.value = 0.0001; this.out.connect(this.sfx.master);
    this.out.gain.setTargetAtTime(0.32, ctx.currentTime, 0.6);
    this.next = ctx.currentTime + 0.1; this.step = 0;
    this.timer = setInterval(() => this.schedule(), 60);
  }
  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    const o = this.out;
    o.gain.setTargetAtTime(0.0001, this.sfx.ctx.currentTime, 0.3);
    setTimeout(() => o.disconnect(), 1500);
  }
  toggle() { this.on = !this.on; if (!this.on) this.stop(); return this.on; }
  setMood(m) { if (MOODS[m]) this.mood = m; }
  tone(type, f, t, dur, vol, slide) {
    const ctx = this.sfx.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(t, dur, vol, hp) {
    const ctx = this.sfx.ctx, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.sfx.noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.out); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  schedule() {
    const ctx = this.sfx.ctx;
    const M = MOODS[this.mood];
    const sixteenth = 60 / M.bpm / 4;
    while (this.next < ctx.currentTime + 0.25) {
      const t = this.next, s = this.step % 64, bar = Math.floor(s / 16), beat = s % 16;
      const root = M.chords[bar];
      // 鼓：大鼓、小鼓（雜訊）、hi-hat
      if (beat % 8 === 0) this.tone('sine', 150, t, 0.18, 0.5, 40);
      if (beat % 8 === 4) this.noise(t, 0.12, 0.18, 1200);
      if (beat % 2 === 0) this.noise(t, 0.03, this.mood === 'up' ? 0.07 : 0.04, 7000);
      // 貝斯（三角波）
      if (beat % 4 === 0 || (this.mood === 'up' && beat % 4 === 3)) this.tone('triangle', NOTE(root - 24 + (beat % 8 === 6 ? 7 : 0)), t, sixteenth * 2.5, 0.28);
      // 琶音（AI 段更密）
      const arp = this.mood === 'ai' ? 1 : 2;
      if (beat % arp === 0) {
        const tri = M.minor ? [0, 3, 7, 12] : [0, 4, 7, 12];
        this.tone('square', NOTE(root + tri[(beat / arp) % 4]), t, sixteenth * 0.9, 0.035);
      }
      // 主旋律：五聲音階隨機走，每兩拍一個音
      if (beat % 4 === 0 && this.rnd() < (this.mood === 'down' ? 0.55 : 0.8)) {
        const deg = M.scale[Math.floor(this.rnd() * M.scale.length)];
        this.tone('square', NOTE(root + 12 + deg), t, sixteenth * (this.rnd() < 0.3 ? 4 : 2), 0.05);
      }
      this.next += sixteenth;
      this.step++;
    }
  }
}
