import { Snd } from './sound';
import { clamp, rr } from '../core/math';
import { G } from '../game/state';
import type { MonsterType } from '../game/types';

/** Distance attenuation from the hero (0 beyond 20 units). */
export function vol(x: number, z: number): number { return G.hero ? clamp(1 - Math.hypot(x - G.hero.x, z - G.hero.z) / 20, 0, 1) : 1; }
export const SFX = {
  step(v: number) { Snd.noise({ type: 'lowpass', f: rr(380, 560), q: .8, dur: .06, gain: .16 * v, rev: .15 }); Snd.noise({ type: 'highpass', f: 3200, dur: .015, gain: .03 * v, rev: .1 }); },
  crackle() { Snd.noise({ type: 'highpass', f: rr(1800, 4200), q: .5, dur: rr(.006, .025), gain: rr(.015, .06), rev: .1 }); },
  swing() { Snd.noise({ type: 'bandpass', f: 500, f2: 2600, q: 2.5, dur: .16, a: .03, gain: .3, rev: .2 }); },
  hit(type: MonsterType, v: number) {
    Snd.noise({ type: 'lowpass', f: 900, dur: .09, gain: .45 * v }); Snd.tone({ wave: 'square', f: 160, f2: 50, dur: .09, gain: .12 * v });
    if (type === 'skeleton' || type === 'boss') { Snd.noise({ type: 'bandpass', f: 2600, q: 4, dur: .05, gain: .22 * v }); Snd.tone({ wave: 'triangle', f: 1250, dur: .14, gain: .04 * v }); }
    else if (type === 'slime') Snd.tone({ wave: 'sine', f: 320, f2: 90, dur: .15, gain: .22 * v });
    else Snd.tone({ wave: 'sawtooth', f: 1900, f2: 1200, dur: .08, gain: .035 * v });
  },
  squeal(type: MonsterType, v: number) {
    if (v < .03) return;
    if (type === 'rat') { Snd.tone({ wave: 'sawtooth', f: 1500, f2: 2700, dur: .11, gain: .035 * v }); Snd.tone({ wave: 'sawtooth', f: 2500, f2: 1200, dur: .15, gain: .03 * v, delay: .1 }); }
    else if (type === 'skeleton') for (let k = 0; k < 6; k++) Snd.noise({ type: 'bandpass', f: rr(2000, 3600), q: 6, dur: .025, gain: .14 * v, delay: k * .035 });
    else if (type === 'slime') { Snd.tone({ wave: 'sine', f: 140, f2: 260, dur: .18, gain: .2 * v }); Snd.tone({ wave: 'sine', f: 260, f2: 110, dur: .2, gain: .15 * v, delay: .15 }); }
    else { Snd.tone({ wave: 'sawtooth', f: 110, f2: 50, dur: 1.1, gain: .16 * v, a: .08 }); Snd.noise({ type: 'lowpass', f: 500, f2: 150, dur: 1.1, gain: .3 * v, a: .1 }); }
  },
  death(type: MonsterType, v: number) {
    if (type === 'skeleton' || type === 'boss') { for (let k = 0; k < 11; k++) Snd.noise({ type: 'bandpass', f: rr(1500, 4200), q: 5, dur: .03, gain: .17 * v, delay: rr(0, .45) }); Snd.noise({ type: 'lowpass', f: 300, dur: .2, gain: .3 * v }); }
    else if (type === 'slime') { Snd.noise({ type: 'lowpass', f: 800, f2: 200, dur: .35, gain: .45 * v }); Snd.tone({ wave: 'sine', f: 240, f2: 40, dur: .3, gain: .2 * v }); }
    else Snd.tone({ wave: 'sawtooth', f: 2200, f2: 500, dur: .25, gain: .04 * v });
  },
  coin() { Snd.tone({ wave: 'square', f: 1318, dur: .05, gain: .045, rev: .2 }); Snd.tone({ wave: 'square', f: 1760, dur: .16, gain: .045, delay: .06, rev: .2 }); },
  chest() { Snd.tone({ wave: 'sawtooth', f: 110, f2: 170, dur: .4, gain: .04 }); Snd.noise({ type: 'lowpass', f: 300, dur: .15, gain: .35, delay: .35 }); },
  key() { [880, 1108, 1318, 1760].forEach((f, i) => Snd.tone({ wave: 'triangle', f, dur: .22, gain: .06, delay: i * .08, rev: .5 })); },
  unlock() { Snd.tone({ wave: 'triangle', f: 2200, dur: .04, gain: .08 }); Snd.tone({ wave: 'triangle', f: 1600, dur: .05, gain: .08, delay: .09 }); Snd.noise({ type: 'lowpass', f: 220, dur: .3, gain: .55, delay: .16 }); Snd.tone({ wave: 'sawtooth', f: 85, f2: 140, dur: .8, gain: .05, delay: .3 }); },
  door(v: number) { if (v > .05) Snd.tone({ wave: 'sawtooth', f: 180, f2: 260, dur: .45, gain: .03 * v }); },
  drink() { for (let k = 0; k < 4; k++) Snd.tone({ wave: 'sine', f: rr(350, 700), f2: rr(180, 280), dur: .07, gain: .1, delay: k * .09 }); Snd.tone({ wave: 'sine', f: 900, f2: 1800, dur: .4, gain: .035, delay: .35, rev: .6 }); },
  hurt() { Snd.tone({ wave: 'sawtooth', f: 260, f2: 110, dur: .2, gain: .09 }); Snd.noise({ type: 'lowpass', f: 600, dur: .12, gain: .4 }); },
  descend() { Snd.noise({ type: 'lowpass', f: 600, f2: 80, dur: 1.6, gain: .35, a: .3 }); Snd.tone({ wave: 'sine', f: 110, f2: 40, dur: 1.8, gain: .22 }); },
  spike(v: number) { if (v > .05) { Snd.noise({ type: 'highpass', f: 3500, dur: .12, gain: .2 * v }); Snd.tone({ wave: 'triangle', f: 900, f2: 700, dur: .15, gain: .04 * v }); } },
  whoosh(v: number) { if (v > .05) Snd.noise({ type: 'bandpass', f: 300, f2: 900, q: 1.5, dur: .3, a: .1, gain: .22 * v }); },
  drip() { Snd.tone({ wave: 'sine', f: rr(1400, 2000), f2: rr(500, 800), dur: .07, gain: .03, rev: .9 }); },
  rise(v: number) { if (v > .05) Snd.noise({ type: 'lowpass', f: 400, f2: 120, dur: .6, gain: .25 * v, a: .1 }); },
  /** Swing that missed: a thin airy swish, no impact. */
  whiff() { Snd.noise({ type: 'highpass', f: 1800, f2: 900, q: .7, dur: .12, gain: .12, rev: .25 }); },
  /** Blow stopped by the shield: wooden thud plus a metallic ring. */
  block() { Snd.noise({ type: 'lowpass', f: 420, dur: .1, gain: .5 }); Snd.tone({ wave: 'triangle', f: 1550, f2: 1450, dur: .25, gain: .06, rev: .4 }); Snd.tone({ wave: 'triangle', f: 2330, dur: .18, gain: .03, delay: .01, rev: .4 }); },
  /** Critical hit layered over the normal hit sound. */
  crit() { Snd.noise({ type: 'bandpass', f: 1200, f2: 300, q: 1.2, dur: .22, gain: .45 }); Snd.tone({ wave: 'square', f: 90, f2: 40, dur: .25, gain: .12 }); },
  /** Glass clink when a potion goes into the belt or backpack. */
  potion() { Snd.tone({ wave: 'triangle', f: 2400, dur: .06, gain: .05, rev: .4 }); Snd.tone({ wave: 'triangle', f: 3150, dur: .1, gain: .035, delay: .05, rev: .4 }); },
  levelUp() { [523, 659, 784, 1047, 1319].forEach((f, i) => Snd.tone({ wave: 'triangle', f, dur: .5, gain: .07, delay: i * .09, rev: .7 })); Snd.noise({ type: 'highpass', f: 5000, dur: .9, gain: .05, a: .2, rev: .8 }); },
};
