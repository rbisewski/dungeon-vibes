import { R } from '../core/math';

interface Voice {
  /** Start delay in seconds. */
  delay?: number;
  /** Decay time after the attack. */
  dur?: number;
  /** Attack time. */
  a?: number;
  /** Start frequency and optional end frequency (exponential sweep). */
  f2?: number;
  gain?: number;
  /** Reverb send level. */
  rev?: number;
}
export interface NoiseVoice extends Voice { type?: BiquadFilterType; f?: number; q?: number }
export interface ToneVoice extends Voice { wave?: OscillatorType; f: number }

interface Graph { ctx: AudioContext; out: GainNode; rev: GainNode; nb: AudioBuffer }

/** Procedural WebAudio: a droning bed plus one-shot filtered-noise and oscillator voices. */
class SoundEngine {
  private g: Graph | null = null;
  on = false;

  /** Must run from a user gesture (browser autoplay policy). */
  init(): void {
    if (this.g) { void this.g.ctx.resume(); return; }
    if (typeof AudioContext === 'undefined') return;
    const c = new AudioContext();
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5; comp.connect(c.destination);
    const out = c.createGain(); out.gain.value = 0.8; out.connect(comp);
    const len = (c.sampleRate * 2.4) | 0, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (R() * 2 - 1) * Math.pow(1 - i / len, 3.4); }
    const conv = c.createConvolver(); conv.buffer = ir;
    const rev = c.createGain(); rev.connect(conv);
    const wet = c.createGain(); wet.gain.value = 0.3; conv.connect(wet); wet.connect(comp);
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = R() * 2 - 1;
    // drone
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.linearRampToValueAtTime(0.075, c.currentTime + 4);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 150; lp.Q.value = 2;
    const drone: [number, OscillatorType, number][] = [[55, 'sawtooth', 0.3], [55.6, 'sawtooth', 0.3], [82.6, 'triangle', 0.25], [27.5, 'sine', 0.9]];
    for (const [f, type, v] of drone) { const o = c.createOscillator(); o.type = type; o.frequency.value = f; const og = c.createGain(); og.gain.value = v; o.connect(og); og.connect(lp); o.start(); }
    const lfo = c.createOscillator(); lfo.frequency.value = 0.06; const lg = c.createGain(); lg.gain.value = 70; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    lp.connect(g); g.connect(out);
    // wind
    const n = c.createBufferSource(); n.buffer = nb; n.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 300; bp.Q.value = 0.7;
    const ng = c.createGain(); ng.gain.value = 0.03;
    const l2 = c.createOscillator(); l2.frequency.value = 0.08; const lg2 = c.createGain(); lg2.gain.value = 0.022; l2.connect(lg2); lg2.connect(ng.gain); l2.start();
    n.connect(bp); bp.connect(ng); ng.connect(out); n.start();
    this.g = { ctx: c, out, rev, nb };
    this.on = true;
  }

  private env(g: GainNode, t: number, a: number, peak: number, d: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  private send(G: Graph, g: GainNode, rev: number): void {
    g.connect(G.out);
    if (rev > 0) { const s = G.ctx.createGain(); s.gain.value = rev; g.connect(s); s.connect(G.rev); }
  }

  noise(o: NoiseVoice): void {
    const G = this.g;
    if (!this.on || !G) return;
    const c = G.ctx, t = c.currentTime + (o.delay || 0), dur = o.dur || 0.2, a = o.a || 0.004;
    const s = c.createBufferSource(); s.buffer = G.nb;
    const f = c.createBiquadFilter(); f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + a + dur);
    f.Q.value = o.q || 1;
    const g = c.createGain(); this.env(g, t, a, o.gain || 0.2, dur);
    s.connect(f); f.connect(g); this.send(G, g, o.rev ?? 0.3);
    s.start(t, R() * 1.5); s.stop(t + a + dur + 0.05);
  }

  tone(o: ToneVoice): void {
    const G = this.g;
    if (!this.on || !G) return;
    const c = G.ctx, t = c.currentTime + (o.delay || 0), dur = o.dur || 0.2, a = o.a || 0.004;
    const os = c.createOscillator(); os.type = o.wave || 'sine';
    os.frequency.setValueAtTime(o.f, t);
    if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t + a + dur);
    const g = c.createGain(); this.env(g, t, a, o.gain || 0.1, dur);
    os.connect(g); this.send(G, g, o.rev ?? 0.3);
    os.start(t); os.stop(t + a + dur + 0.05);
  }
}

export const Snd = new SoundEngine();
