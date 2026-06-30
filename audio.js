import { Howl } from 'howler';

class CinematicAudioManager {
  constructor() {
    this.soundtrack = null;
    this.isMuted = true;
    this.audioCtx = null;
    this.droneOscNode = null;
    this.droneGainNode = null;
    this.droneLfoNode = null;
  }

  _ensureContext() {
    if (!this.audioCtx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new Ctor();
    }
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    return this.audioCtx;
  }

  /** Call once after user gesture */
  initAndPlay() {
    this._ensureContext();
    this.isMuted = false;

    if (!this.soundtrack) {
      this.soundtrack = new Howl({
        src: ['/soundtrack.mp3'],
        loop: true,
        volume: 0.82,
        html5: false,          // decode in full so we get fast beat-sync
        onloaderror: (_, e) => console.warn('Soundtrack load error:', e),
      });
    }
    if (!this.soundtrack.playing()) this.soundtrack.play();
  }

  /** Fade out soundtrack + stop */
  fadeOutAndStop(durationMs = 3000) {
    if (!this.soundtrack) return;
    const steps = 30;
    const interval = durationMs / steps;
    const startVol = this.soundtrack.volume();
    let step = 0;
    const t = setInterval(() => {
      step++;
      this.soundtrack.volume(Math.max(0, startVol * (1 - step / steps)));
      if (step >= steps) { this.soundtrack.stop(); clearInterval(t); }
    }, interval);
  }

  setVolume(vol) {
    this.soundtrack?.volume(Math.max(0, Math.min(1, vol)));
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.soundtrack?.volume(0);
    } else {
      this.soundtrack?.volume(0.82);
      if (!this.soundtrack?.playing()) this.soundtrack?.play();
    }
    return this.isMuted;
  }

  // ── SYNTHESIZED SFX ────────────────────────────────────────────

  /** Deep cinematic bass boom — call on hard beat */
  playImpact() {
    if (this.isMuted) return;
    const ctx = this._ensureContext();
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    o1.type = 'sine'; o2.type = 'triangle';
    o1.connect(filt); o2.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
    const now = ctx.currentTime;
    o1.frequency.setValueAtTime(90, now); o1.frequency.exponentialRampToValueAtTime(28, now + 1.4);
    o2.frequency.setValueAtTime(60, now); o2.frequency.exponentialRampToValueAtTime(20, now + 0.9);
    filt.frequency.setValueAtTime(280, now); filt.frequency.exponentialRampToValueAtTime(35, now + 0.9);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.75, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    o1.start(now); o2.start(now); o1.stop(now + 1.9); o2.stop(now + 1.9);
  }

  /** Cinematic whoosh sweep */
  playWhoosh() {
    if (this.isMuted) return;
    const ctx = this._ensureContext();
    const bufLen = ctx.sampleRate * 1.5;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buf;
    const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.Q.value = 6;
    const gain = ctx.createGain();
    noise.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
    const now = ctx.currentTime;
    filt.frequency.setValueAtTime(60, now); filt.frequency.exponentialRampToValueAtTime(1200, now + 0.8);
    filt.frequency.exponentialRampToValueAtTime(80, now + 1.5);
    gain.gain.setValueAtTime(0.001, now); gain.gain.linearRampToValueAtTime(0.28, now + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    noise.start(now); noise.stop(now + 1.5);
  }

  /** Stinger click */
  playClick() {
    const ctx = this._ensureContext();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    const now = ctx.currentTime;
    o.type = 'triangle';
    o.frequency.setValueAtTime(1800, now); o.frequency.exponentialRampToValueAtTime(80, now + 0.05);
    g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    o.start(now); o.stop(now + 0.06);
  }

  /** Constant ambient tension drone */
  startDrone() {
    const ctx = this._ensureContext();
    if (this.droneOscNode) return;
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
    const filt = ctx.createBiquadFilter(), gain = ctx.createGain();
    osc.type = 'sawtooth'; osc.frequency.value = 55;
    filt.type = 'lowpass'; filt.frequency.value = 120; filt.Q.value = 1.2;
    lfo.frequency.value = 0.2; lfoGain.gain.value = 35;
    lfo.connect(lfoGain); lfoGain.connect(filt.frequency);
    osc.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(this.isMuted ? 0 : 0.1, ctx.currentTime);
    lfo.start(); osc.start();
    this.droneOscNode = osc; this.droneGainNode = gain; this.droneLfoNode = lfo;
  }

  stopDrone() {
    try { this.droneOscNode?.stop(); this.droneLfoNode?.stop(); } catch (_) {}
    this.droneOscNode = null; this.droneGainNode = null; this.droneLfoNode = null;
  }
}

const audioManager = new CinematicAudioManager();
export default audioManager;
