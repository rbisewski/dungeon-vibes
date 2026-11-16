/** Giant rat (SPEC §8.3): hunched furry body with a spiny ridge, long snout with whiskers and teeth, segmented tail. */
import * as THREE from 'three';
import { PI } from '../../core/math';
import { gSph, glowSprite, mesh } from '../../render/geometry';
import type { RatParts } from '../../game/types';
import { part, Skin, type Kit } from './kit';

const both = (f: (s: number) => void): void => { f(-1); f(1); };

function body(k: Kit): void {
  k.ball('fur', [0, .3, -.06], [.24, .2, .4], { seg: 16, fade: .35 });
  k.ball('fur', [0, .34, -.14], [.2, .17, .24], { seg: 14 });
  both(s => {
    k.ball('fur', [s * .12, .26, -.24], [.12, .14, .15], { seg: 12, fade: .3 });
    k.ball('fur', [s * .1, .26, .14], [.1, .11, .11], { seg: 12 });
  });
  k.ball('belly', [0, .2, -.02], [.17, .1, .3], { seg: 12 });
  // a ridge of bristles along the spine
  for (let i = 0; i < 9; i++) {
    const z = .2 - i * .07, y = .46 + Math.sin(i / 8 * PI) * .06;
    k.spike('furDark', [0, y - .04, z], [0, y + .05, z - .05], .03, { seg: 4 });
  }
  k.limb('fur', [0, .32, .18], [0, .33, .3], .1, .085, { seg: 10 });
}

function head(k: Kit): void {
  k.ball('fur', [0, .01, .0], [.115, .1, .13], { seg: 14 });
  k.spike('fur', [0, .0, .07], [0, -.035, .3], .085, { seg: 10 });
  k.ball('pink', [0, -.035, .3], [.03, .025, .025], { seg: 8 });
  both(s => {
    k.ball('pink', [s * .085, .1, -.02], [.055, .06, .012], { seg: 9, rot: [-.2, s * .4, s * .3] });
    k.ball('fur', [s * .088, .1, -.026], [.062, .067, .012], { seg: 9, rot: [-.2, s * .4, s * .3] });
    k.ball('dark', [s * .066, .05, .08], [.028, .024, .022], { seg: 7 });
    for (let i = 0; i < 3; i++) k.limb('whisker', [s * .03, -.03, .26], [s * .2, -.02 + (i - 1) * .04, .22 + i * .02], .003, .002, { caps: false, seg: 3 });
  });
  for (const s of [-1, 1]) k.box('teeth', [.012, .04, .012], { at: [s * .008, -.075, .27], r: .003 });
}

function leg(k: Kit, front: boolean): void {
  k.limb('fur', [0, .02, 0], [0, -.13, front ? .03 : -.02], .05, .03, { seg: 8 });
  k.limb('pink', [0, -.13, front ? .03 : -.02], [0, -.18, front ? .05 : .02], .022, .018, { seg: 6 });
  k.ball('pink', [0, -.192, front ? .07 : .045], [.035, .016, .045], { seg: 8 });
  for (let i = -1; i <= 1; i++) k.spike('teeth', [i * .018, -.195, front ? .1 : .075], [i * .022, -.2, front ? .125 : .1], .006, { seg: 3 });
}

function tailSeg(k: Kit, i: number): void {
  const r0 = .03 - i * .005, r1 = .025 - i * .004;
  k.limb('pink', [0, 0, 0], [0, 0, -.18], r0, r1, { seg: 7, caps: i === 4 });
  for (let j = 1; j < 4; j++) k.ring('pinkDark', r0 - (r0 - r1) * j / 4 + .001, .003, { at: [0, 0, -.045 * j], seg: 3 });
}

export function buildRat(): RatParts {
  const M = new Skin({
    fur: { color: 0x564a40, rough: 1 }, furDark: { color: 0x2e2620, rough: 1 }, belly: { color: 0x8a7c6a, rough: 1 },
    pink: { color: 0xb07a70, rough: .65 }, pinkDark: { color: 0x8a5a52, rough: .7 }, dark: { color: 0x0a0606, rough: 1, rim: false },
    teeth: { color: 0xe8dcb0, rough: .5 }, whisker: { color: 0xc8c0b0, rough: .8, rim: false, shadow: false },
  });
  const root = new THREE.Group(), b = new THREE.Group(); root.add(b);
  part(b, 'rat:body', body, M);
  const headG = new THREE.Group(); headG.position.set(0, .32, .36); b.add(headG);
  part(headG, 'rat:head', head, M);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xff3020 });
  const eyes: THREE.Sprite[] = [];
  for (const s of [-1, 1]) { mesh(gSph(.016, 5, 4), eyeM, s * .07, .052, .1, headG, false); eyes.push(glowSprite(0xff3018, .18, headG, s * .075, .052, .12)); }
  const legs: THREE.Group[] = [];
  for (const [x, z] of [[-.16, .22], [.16, .22], [-.17, -.25], [.17, -.25]]) {
    const l = new THREE.Group(); l.position.set(x, .2, z); b.add(l);
    part(l, z > 0 ? 'rat:legF' : 'rat:legB', k => leg(k, z > 0), M);
    legs.push(l);
  }
  const tail: THREE.Group[] = [];
  let par: THREE.Group = b;
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group(); g.position.set(0, i === 0 ? .26 : 0, i === 0 ? -.45 : -.18); par.add(g);
    part(g, `rat:tail${i}`, k => tailSeg(k, i), M);
    tail.push(g); par = g;
  }
  root.scale.setScalar(1.2);
  return { root, body: b, head: headG, legs, tail, eyes, mats: [...M.mats, eyeM, ...eyes.map(e => e.material)], flashMats: M.mats };
}
