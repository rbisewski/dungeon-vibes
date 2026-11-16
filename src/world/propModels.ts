/**
 * Prop models for the modelling kit (SPEC §10.7). Builders run once per model (their geometry is cached), so their
 * variation comes from a fixed hash, never from the level's random stream.
 */
import * as THREE from 'three';
import { PI } from '../core/math';
import type { Kit, V2, V3 } from '../actors/models/kit';

/** A fixed pseudo-random value in [0, 1) for an integer. */
export const hash = (n: number): number => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const both = (f: (s: number) => void): void => { f(-1); f(1); };

/* ---------- barrel, crate, chest ---------- */

const BARREL: V2[] = [[.31, 0], [.345, .18], [.372, .43], [.345, .68], [.31, .86]];

/** Staves with dark gaps between them, four iron hoops, a planked lid with a bung. */
export function barrel(k: Kit, seed: number): void {
  const n = 14;
  for (let i = 0; i < n; i++) k.lathe('wood', BARREL, { arc: [i / n * PI * 2 + .012, PI * 2 / n - .024], seg: 2, tint: .78 + hash(seed * 31 + i) * .34, fade: .3 });
  k.lathe('dark', BARREL.map(([r, y]) => [r - .01, y] as const), { seg: 14 });
  for (const [y, r] of [[.09, .332], [.3, .362], [.58, .364], [.78, .33]] as const) k.lathe('iron', [[r + .002, y - .024], [r + .012, y], [r + .002, y + .024]], { seg: 18 });
  for (let j = -2; j <= 2; j++) {
    const x = j * .118, len = 2 * Math.sqrt(Math.max(0, .3 * .3 - x * x));
    k.box('woodDark', [.11, .02, len], { at: [x, .84, 0], tint: .8 + hash(seed * 7 + j) * .3 });
  }
  k.ball('dark', [.08, .852, .06], [.03, .01, .03], { seg: 8 });
}

/** A planked crate (unit cube, origin at the bottom centre): frame boards on every edge, a brace, iron corner caps. */
export function crate(k: Kit, seed: number): void {
  k.box('woodDark', [.94, .94, .94], { at: [0, .5, 0], tint: .5 });
  let p = 0;
  const plank = (size: V3, at: V3) => k.box('wood', size, { at, tint: .75 + hash(seed * 13 + p++) * .35, fade: .15 });
  for (let j = -1; j <= 1; j++) {
    const o = j * .29;
    for (const s of [-1, 1]) { plank([.84, .27, .03], [0, .5 + o, s * .475]); plank([.03, .27, .84], [s * .475, .5 + o, 0]); }
    plank([.84, .03, .27], [0, .975, o]);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box('woodDark', [.11, 1, .11], { at: [sx * .455, .5, sz * .455] });
  for (const y of [.055, .945]) for (const s of [-1, 1]) {
    k.box('woodDark', [1, .11, .11], { at: [0, y, s * .455] });
    k.box('woodDark', [.11, .11, 1], { at: [s * .455, y, 0] });
  }
  for (const s of [-1, 1]) k.box('woodDark', [.08, 1.18, .035], { at: [0, .5, s * .5], rot: [0, 0, PI / 4 * s] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box('iron', [.16, .03, .16], { at: [sx * .44, 1.005, sz * .44] });
}

/** A chest body (origin at the bottom centre, front +z): planks, bands, corner brackets, a lock plate with keyhole. */
export function chestBody(k: Kit, trim: 'iron' | 'gold'): void {
  k.box('woodDark', [.86, .44, .54], { at: [0, .24, 0], tint: .5 });
  for (let j = 0; j < 3; j++) {
    const y = .09 + j * .15;
    for (const s of [-1, 1]) {
      k.box('wood', [.84, .14, .025], { at: [0, y, s * .285], tint: .8 + hash(j * 5 + s) * .3, fade: .2 });
      k.box('wood', [.025, .14, .52], { at: [s * .44, y, 0], tint: .8 + hash(j * 9 + s) * .3, fade: .2 });
    }
  }
  k.box(trim, [.93, .06, .61], { at: [0, .04, 0] });
  for (const s of [-1, 1]) {
    k.box(trim, [.07, .46, .02], { at: [s * .3, .25, .3] });
    k.box(trim, [.07, .46, .02], { at: [s * .3, .25, -.3] });
    for (const sz of [-1, 1]) k.box(trim, [.07, .48, .07], { at: [s * .44, .25, sz * .28] });
    for (const sz of [-1, 1]) k.box('woodDark', [.08, .05, .08], { at: [s * .38, .0, sz * .22] });
  }
  k.box('gold', [.13, .15, .02], { at: [0, .38, .3] });
  k.box('dark', [.018, .045, .01], { at: [0, .37, .312] });
  k.ball('dark', [0, .4, .312], [.014, .014, .006], { seg: 6 });
}

/** The chest lid (lid frame: hinge line at the origin, the lid centred at z .29): a curved planked top with bands. */
export function chestLid(k: Kit, trim: 'iron' | 'gold'): void {
  const n = 5, turn: V3 = [0, 0, -PI / 2], at: V3 = [0, 0, .29];
  for (let i = 0; i < n; i++) k.lathe('wood', [[.29, -.44], [.29, .44]], { arc: [PI + i * PI / n + .012, PI / n - .024], seg: 2, rot: turn, at, tint: .8 + hash(i * 3) * .3 });
  k.lathe('woodDark', [[.28, -.44], [.28, .44]], { arc: [PI, PI], seg: 10, rot: turn, at, tint: .5 });
  for (const x of [-.45, .45]) k.add('woodDark', new THREE.CircleGeometry(.29, 10, 0, PI), { at: [x, 0, .29], rot: [0, x > 0 ? PI / 2 : -PI / 2, 0] });
  for (const x of [-.3, .3]) k.lathe(trim, [[.302, x - .035], [.302, x + .035]], { arc: [PI, PI], seg: 10, rot: turn, at });
  k.box(trim, [.93, .04, .03], { at: [0, .02, .575] });
  k.box('gold', [.06, .09, .02], { at: [0, -.01, .59] });
}

/* ---------- the town: well, stalls, workplaces ---------- */

/** The well: a ring of dressed stones with a cap, dark shaft and water, a shingled roof on posts, winch, rope and bucket. */
export function well(k: Kit): void {
  for (let c = 0; c < 3; c++) {
    const n = 11;
    for (let i = 0; i < n; i++) {
      const a = (i + (c % 2) * .5) / n * PI * 2;
      k.box('stoneBlock', [.5, .22, .26], { at: [Math.sin(a) * .9, .12 + c * .235, Math.cos(a) * .9], rot: [0, a, 0], r: .035, tint: .72 + hash(c * 40 + i) * .38, fade: .2 });
    }
  }
  for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; k.box('stoneBlock', [.5, .1, .36], { at: [Math.sin(a) * .92, .78, Math.cos(a) * .92], rot: [0, a, 0], r: .03, tint: .9 + hash(i + 90) * .25 }); }
  k.lathe('void', [[.76, .2], [.76, .84]], { seg: 18 });
  k.add('water', new THREE.CircleGeometry(.76, 20), { rot: [-PI / 2, 0, 0], at: [0, .32, 0] });
  // posts with braces, a gabled shingle roof, ridge and gable boards
  both(s => {
    k.box('woodDark', [.16, 1.85, .16], { at: [s * .97, 1.6, 0], fade: .2 });
    k.box('woodDark', [.08, .55, .08], { at: [s * .8, 2.2, 0], rot: [0, 0, s * .75] });
    k.plate('woodDark', [[-.6, 0], [.6, 0], [0, .36]], .04, { at: [s * 1.1, 2.5, 0], rot: [0, PI / 2, 0] });
  });
  for (const s of [-1, 1]) for (let r = 0; r < 3; r++) {
    const t = (r + .5) / 3, z = s * (.03 + t * .6), y = 2.88 - t * .36;
    k.box('roof', [2.35, .045, .24], { at: [0, y, z], rot: [s * .54, 0, 0], tint: .8 + hash(r * 7 + s) * .3 });
  }
  k.box('woodDark', [2.45, .09, .09], { at: [0, 2.9, 0], rot: [PI / 4, 0, 0] });
  // winch with a coil of rope and a crank, rope down to a bucket
  k.limb('wood', [-.9, 1.95, 0], [.9, 1.95, 0], .075, .075, { seg: 10 });
  for (let i = 0; i < 6; i++) k.ring('rope', .088, .018, { at: [-.3 + i * .04, 1.95, 0], rot: [0, PI / 2, 0], seg: 4 });
  k.limb('iron', [.95, 1.95, 0], [1.12, 1.95, 0], .022, .022, { seg: 5 });
  k.limb('iron', [1.12, 1.95, 0], [1.12, 1.76, .1], .018, .018, { seg: 5 });
  k.limb('wood', [1.12, 1.76, .1], [1.26, 1.76, .1], .028, .028, { seg: 6 });
  k.limb('rope', [-.08, 1.88, .05], [-.08, 1.14, .05], .012, .012, { caps: false, seg: 4 });
  k.lathe('wood', [[0, .92], [.1, .92], [.13, 1.1], [.135, 1.1]], { at: [-.08, 0, .05], seg: 12, fade: .3 });
  k.lathe('void', [[.12, .94], [.13, 1.08]], { at: [-.08, 0, .05], seg: 12 });
  k.lathe('iron', [[.125, 1.02], [.13, 1.04], [.125, 1.06]], { at: [-.08, 0, .05], seg: 12 });
  k.ring('iron', .13, .008, { at: [-.08, 1.12, .05], arc: PI, seg: 4 });
}

/** A market stall: planked counter, posts, a striped awning with a scalloped edge, and goods: pottery or herbs. */
export function stall(k: Kit, canvas: 'canvasRed' | 'canvasGreen', goods: 'pots' | 'herbs'): void {
  k.box('woodDark', [2.2, .84, .76], { at: [0, .42, 0], tint: .6 });
  for (let j = 0; j < 5; j++) k.box('wood', [.42, .8, .03], { at: [-.86 + j * .43, .42, .385], tint: .78 + hash(j) * .32, fade: .3 });
  k.box('wood', [2.34, .07, .9], { at: [0, .87, .04] });
  both(s => {
    k.box('woodDark', [.1, 2.2, .1], { at: [s * 1.05, 1.1, .55], fade: .2 });
    k.box('woodDark', [.1, 2.55, .1], { at: [s * 1.05, 1.27, -.55], fade: .2 });
  });
  k.box('woodDark', [2.2, .08, .08], { at: [0, 2.16, .55] });
  k.box('woodDark', [2.2, .08, .08], { at: [0, 2.52, -.55] });
  const ang = Math.atan2(.42, 1.42), len = Math.hypot(.42, 1.42);
  for (let i = 0; i < 6; i++) k.box(i % 2 ? 'canvasCream' : canvas, [2.6 / 6 + .002, .025, len], { at: [-1.3 + (i + .5) * 2.6 / 6, 2.41, .06], rot: [ang, 0, 0] });
  for (let i = 0; i < 10; i++) k.add(i % 2 ? 'canvasCream' : canvas, new THREE.CircleGeometry(.13, 8, PI, PI), { at: [-1.17 + i * .26, 2.2, .77] });
  if (goods === 'pots') {
    for (let i = 0; i < 5; i++) {
      const x = -.85 + i * .42, h = .18 + hash(i + 3) * .14, w = .08 + hash(i + 8) * .05, glaze = i % 2 === 1;
      k.lathe(glaze ? 'glaze' : 'clay', [[0, .905], [w, .905], [w * 1.5, .905 + h * .45], [w * .7, .905 + h * .9], [w * .8, .905 + h]], { at: [x, 0, .1 + hash(i) * .2], seg: 12, fade: .25 });
    }
    k.lathe('clay', [[0, .905], [.15, .905], [.2, .97], [.21, .99]], { at: [.7, 0, -.2], seg: 14 });
  } else {
    for (let i = 0; i < 7; i++) {
      const x = -.95 + i * .32;
      k.limb('rope', [x, 2.12, .55], [x, 1.98, .55], .008, .008, { caps: false, seg: 3 });
      for (let j = 0; j < 4; j++) k.limb('herb', [x, 1.98, .55], [x + (j - 1.5) * .03, 1.72 - hash(i * 4 + j) * .1, .55 + (j % 2 ? .03 : -.03)], .02, .008, { seg: 4 });
    }
    for (let i = 0; i < 6; i++) {
      const x = -.8 + i * .3, h = .16 + hash(i + 20) * .1;
      k.lathe(i % 2 ? 'glassG' : 'glassP', [[0, .905], [.06, .905], [.065, .905 + h * .6], [.025, .905 + h * .75], [.022, .905 + h]], { at: [x, 0, .15], seg: 10 });
      k.limb('wood', [x, .905 + h, .15], [x, .905 + h + .03, .15], .02, .02, { seg: 5 });
    }
  }
}

/** The smith's anvil on a tree stump. */
export function anvil(k: Kit): void {
  k.lathe('bark', [[.36, 0], [.31, .06], [.29, .45], [.3, .5]], { seg: 12, fade: .3 });
  k.add('wood', new THREE.CircleGeometry(.3, 12), { rot: [-PI / 2, 0, 0], at: [0, .501, 0] });
  for (const r of [.1, .2]) k.ring('woodDark', r, .006, { at: [0, .503, 0], rot: [PI / 2, 0, 0], seg: 3 });
  k.plate('iron', [[-.18, .5], [.18, .5], [.12, .56], [.07, .6], [.07, .66], [.24, .69], [.4, .73], [.26, .78], [-.22, .78], [-.27, .73], [-.21, .66], [-.07, .66], [-.07, .6], [-.12, .56]], .2, { bevel: .02 });
  k.limb('woodDark', [-.1, .8, .14], [.18, .79, .2], .016, .016, { seg: 5 });
  k.box('iron', [.06, .05, .09], { at: [-.12, .81, .14] });
}

/** The smith's forge: a stone hearth with brick courses, a glowing coal bed, a hood and chimney, bellows and tongs. */
export function forge(k: Kit): void {
  for (let c = 0; c < 4; c++) for (let i = 0; i < 4; i++) for (const [ax, sign] of [[0, 1], [0, -1], [1, 1], [1, -1]] as const) {
    const o = (i - 1.5) * .28 + (c % 2) * .07, x = ax ? sign * .55 : o, z = ax ? o : sign * .55;
    k.box('stoneBlock', ax ? [.12, .19, .26] : [.26, .19, .12], { at: [x, .1 + c * .2, z], tint: .68 + hash(c * 50 + i * 4 + ax * 2 + (sign > 0 ? 1 : 0)) * .35 });
  }
  k.box('stoneBlock', [1.0, .7, 1.0], { at: [0, .35, 0], tint: .5 });
  k.box('stoneBlock', [1.18, .08, 1.18], { at: [0, .82, 0] });
  k.box('coal', [.86, .04, .86], { at: [0, .86, 0] });
  for (let i = 0; i < 9; i++) k.ball('dark', [(hash(i) - .5) * .7, .88, (hash(i + 30) - .5) * .7], .05 + hash(i + 60) * .03, { seg: 5 });
  // hood on four legs and a chimney
  both(s => both(t => k.box('iron', [.05, 1.1, .05], { at: [s * .5, 1.4, t * .5] })));
  k.lathe('stoneBlock', [[.62, 1.9], [.3, 2.35], [.28, 3.2], [.32, 3.25], [.32, 3.32]], { seg: 4, rot: [0, PI / 4, 0], scale: [1.4, 1, 1.4], fade: .3 });
  // bellows beside the hearth, tongs leaning on it
  k.lathe('leather', [[.02, 0], [.2, .05], [.22, .2], [.18, .3], [.02, .34]], { at: [.85, .35, .2], rot: [0, 0, PI / 2], scale: [1, 1, .5], seg: 10 });
  k.box('wood', [.5, .03, .32], { at: [.9, .45, .2], rot: [0, 0, .1] });
  k.limb('iron', [-.6, .02, .5], [-.65, .8, .52], .012, .012, { seg: 4 });
  k.limb('iron', [-.63, .02, .55], [-.66, .8, .54], .012, .012, { seg: 4 });
}

/** The witch's cauldron: a round iron pot with a lip, three feet and two ring handles. */
export function cauldron(k: Kit): void {
  k.lathe('iron', [[0, .14], [.3, .15], [.45, .3], [.48, .45], [.44, .6], [.47, .64], [.5, .66], [.47, .68], [.42, .68]], { seg: 18, fade: .3 });
  k.lathe('void', [[.4, .5], [.42, .68]], { seg: 18 });
  for (let i = 0; i < 3; i++) { const a = i / 3 * PI * 2; k.limb('iron', [Math.sin(a) * .3, .18, Math.cos(a) * .3], [Math.sin(a) * .36, 0, Math.cos(a) * .36], .035, .03, { seg: 6 }); }
  both(s => k.ring('iron', .07, .014, { at: [s * .5, .6, 0], rot: [0, PI / 2, 0], seg: 5 }));
  // a small log fire between the feet
  for (let i = 0; i < 4; i++) { const a = i / 4 * PI + .3; k.limb('bark', [Math.sin(a) * .26, .05, Math.cos(a) * .26], [-Math.sin(a) * .26, .05, -Math.cos(a) * .26], .045, .04, { seg: 6 }); }
  k.ball('coal', [0, .03, 0], [.18, .04, .18], { seg: 8 });
}

/** The sage's lectern: a turned post on a cross foot, a slanted desk, an open book and a candle. */
export function lectern(k: Kit): void {
  both(s => k.box('woodDark', [.6, .07, .1], { at: [0, .035, 0], rot: [0, s > 0 ? 0 : PI / 2, 0] }));
  k.lathe('wood', [[.06, .07], [.045, .2], [.06, .35], [.04, .55], [.055, .75], [.045, .9], [.07, .96]], { seg: 10 });
  k.box('woodDark', [.62, .05, .46], { at: [0, 1.0, 0], rot: [-.35, 0, 0] });
  k.box('woodDark', [.62, .04, .04], { at: [0, .93, .22], rot: [-.35, 0, 0] });
  both(s => {
    k.box('leather', [.24, .015, .34], { at: [s * .125, 1.035, -.005], rot: [-.35, 0, s * -.06] });
    k.box('paper', [.22, .03, .31], { at: [s * .118, 1.055, -.005], rot: [-.35, 0, s * -.12], tint: .95 });
  });
  for (let i = 0; i < 5; i++) k.box('dark', [.15, .004, .006], { at: [-.12, 1.075 - i * .006, -.08 + i * .035], rot: [-.35, 0, .12], tint: 1 });
  k.limb('candle', [.27, 1.04, .1], [.27, 1.14, .1], .02, .018, { seg: 6 });
  k.lathe('iron', [[0, 1.03], [.04, 1.03], [.045, 1.045]], { at: [.27, 0, .1], seg: 8 });
}

/* ---------- the palisade ---------- */

/** A palisade stake (origin at its foot, height ~1.45): a split log, sharpened, with a lashing near the top. */
export function stake(k: Kit, seed: number): void {
  const h = 1.3 + hash(seed) * .25;
  k.lathe('bark', [[.1, 0], [.095, h * .5], [.088, h], [.04, h + .16], [.006, h + .26]], { seg: 7, fade: .3, tint: .8 + hash(seed + 5) * .3 });
  k.lathe('wood', [[.088, h], [.04, h + .16], [.006, h + .26]], { seg: 7, arc: [-.7, 1.4] });
  k.lathe('rope', [[.092, h * .72 - .025], [.102, h * .72], [.092, h * .72 + .025]], { seg: 7 });
}

/** A fence rail along z, one metre long (scaled to length). */
export function rail(k: Kit): void {
  k.limb('bark', [0, 0, -.5], [0, 0, .5], .05, .045, { seg: 6, caps: false });
}
