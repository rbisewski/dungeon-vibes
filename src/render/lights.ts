import * as THREE from 'three';
import { R, TAU, clamp, rr, vnoise } from '../core/math';
import { G } from '../game/state';
import { DUST_N, dust, fxAdd } from './particles';
import { coldPool, heroFill, torchLight, warmPool } from './renderer';
import type { LightSrc } from '../game/types';

const _flamePos = new THREE.Vector3();
const _srcSort: LightSrc[] = [];
/** Hero torch flicker, pooled light assignment, embers and dust-mote lighting. */
export function updateLights(dt: number): void {
  const h = G.hero;
  h.flameAnchor.getWorldPosition(_flamePos);
  const fl = .86 + .08 * Math.sin(G.now * 13.1) + .05 * Math.sin(G.now * 27.7 + 1.3) + .04 * (vnoise(G.now * 9, 3.3) - .5) * 2;
  torchLight.position.set(_flamePos.x + Math.sin(G.now * 11) * .03, _flamePos.y + .12, _flamePos.z + Math.cos(G.now * 9.3) * .03);
  torchLight.intensity = (h.dead ? 16 : 42) * fl;
  heroFill.position.set(h.x + 1.1, 1.1, h.z + 1.1); heroFill.intensity = 2.2 * fl;
  // assign pooled lights to nearest sources
  _srcSort.length = 0;
  for (const s of G.L.lights) { s.d = (s.x - h.x) ** 2 + (s.z - h.z) ** 2; _srcSort.push(s); }
  _srcSort.sort((a, b) => a.d - b.d);
  let wi = 0, ci = 0;
  for (const s of _srcSort) {
    const fade = clamp((24 - Math.sqrt(s.d)) / 6, 0, 1);
    if (!s.cold && wi < warmPool.length) { const l = warmPool[wi++]; l.position.set(s.x, s.y, s.z); l.intensity = s.base * fade * (.82 + .1 * Math.sin(G.now * 12 + s.seed) + .08 * Math.sin(G.now * 23.3 + s.seed * 2)); }
    else if (s.cold && ci < coldPool.length) { const l = coldPool[ci++]; l.position.set(s.x, s.y, s.z); l.intensity = s.base * fade * (s.pulse ? .7 + .3 * Math.sin(G.now * 1.7) : 1); }
  }
  for (; wi < warmPool.length; wi++) warmPool[wi].intensity = 0;
  for (; ci < coldPool.length; ci++) coldPool[ci].intensity = 0;
  // embers
  if (R() < dt * 7 && !h.dead) fxAdd.spawn(_flamePos.x + rr(-.05, .05), _flamePos.y + .2, _flamePos.z + rr(-.05, .05), h.vx * .3 + rr(-.25, .25), rr(.6, 1.4), h.vz * .3 + rr(-.25, .25), rr(.8, 1.8), 1.8, .9, .35, rr(.035, .06), -.1, .3, 2);
  for (const f of G.L.flames) {
    const d2 = (f.x - h.x) ** 2 + (f.z - h.z) ** 2; if (d2 > 400) continue;
    if (R() < dt * 2.2 * f.s) fxAdd.spawn(f.x + rr(-.08, .08) * f.s, f.y + .25 * f.s, f.z + rr(-.08, .08) * f.s, rr(-.2, .2), rr(.5, 1.3), rr(-.2, .2), rr(1, 2.2), 1.8, .85, .3, rr(.035, .06), -.1, .3, 2);
  }
  // dust motes in the light
  for (let i = 0; i < DUST_N; i++) {
    const i3 = i * 3; let x = dust.p[i3], y = dust.p[i3 + 1], z = dust.p[i3 + 2];
    if ((x - h.x) ** 2 + (z - h.z) ** 2 > 81 || y < 0 || y > 3.2) { const a = R() * TAU, r = Math.sqrt(R()) * 8.5; x = h.x + Math.cos(a) * r; z = h.z + Math.sin(a) * r; y = rr(.2, 3); dust.v[i3] = rr(-.06, .06); dust.v[i3 + 1] = rr(-.03, .03); dust.v[i3 + 2] = rr(-.06, .06); }
    x += (dust.v[i3] + Math.sin(G.now * .4 + i) * .03) * dt; y += dust.v[i3 + 1] * dt; z += (dust.v[i3 + 2] + Math.cos(G.now * .37 + i * 1.3) * .03) * dt;
    dust.p[i3] = x; dust.p[i3 + 1] = y; dust.p[i3 + 2] = z;
    const td = (x - torchLight.position.x) ** 2 + (y - torchLight.position.y) ** 2 + (z - torchLight.position.z) ** 2;
    const b = Math.max(0, 1 - td / 30) ** 2 * .9;
    let r = b, g = b * .62, bl = b * .32;
    for (let k = 0; k < 3 && k < _srcSort.length; k++) { const s = _srcSort[k]; const sd = (x - s.x) ** 2 + (y - s.y) ** 2 + (z - s.z) ** 2; const sb = Math.max(0, 1 - sd / 12) ** 2 * .7; if (s.cold) { r += sb * .4; g += sb * .55; bl += sb; } else { r += sb; g += sb * .6; bl += sb * .3; } }
    const tw = .6 + .4 * Math.sin(G.now * 2 + i * 7.1);
    dust.col[i3] = r * tw; dust.col[i3 + 1] = g * tw; dust.col[i3 + 2] = bl * tw;
  }
  dust.aP.needsUpdate = dust.aC.needsUpdate = true;
}
