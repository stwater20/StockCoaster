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
