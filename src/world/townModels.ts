/**
 * Town scenery models for the modelling kit (SPEC §10.7): timber-framed houses, pines and dead trees, and the
 * abbey's stonework. Houses and trees use the fading surfaces (`h…`, `t…`) and are instanced.
 */
import * as THREE from 'three';
import { PI } from '../core/math';
import type { Kit, V3 } from '../actors/models/kit';
import { hash } from './propModels';

const both = (f: (s: number) => void): void => { f(-1); f(1); };

/* ---------- houses ---------- */

const W = 5.2, D = 5.2, BASE = .35, TOP = 2.9, RIDGE = 5.0, OVER = .45;

/** A lit window with frame, mullions, sill and open shutters, on the wall at (x, z) whose outward normal is turned ry. */
function window(k: Kit, x: number, z: number, ry: number, n: number): void {
  const c = Math.cos(ry), s = Math.sin(ry);
  const at = (lx: number, ly: number, lz: number): V3 => [x + lx * c + lz * s, ly, z - lx * s + lz * c];
  const box = (slot: string, size: V3, l: V3, turn = 0, tint = 1) => k.box(slot, size, { at: at(...l), rot: [0, ry + turn, 0], tint });
  box('hWindow', [.72, .78, .05], [0, 2.0, 0]);
  for (const ly of [1.6, 2.4]) box('hBeam', [.9, .1, .12], [0, ly, .03]);
  both(t => box('hBeam', [.1, .9, .12], [t * .41, 2.0, .03]));
  box('hBeam', [.05, .78, .07], [0, 2.0, .04]);
  box('hBeam', [.72, .05, .07], [0, 2.02, .04]);
  box('hStone', [1.0, .08, .22], [0, 1.53, .1]);
  both(t => box('hWood', [.38, .8, .04], [t * .66, 2.0, .2], t * -1.05, .8 + hash(n * 3 + t) * .3));
  if (n % 2 === 0) {
    // a flower box under some windows
    box('hWood', [.8, .16, .18], [0, 1.43, .2]);
    for (let i = 0; i < 5; i++) k.ball('hHerb', at(-.32 + i * .16, 1.56, .2), .07 + hash(n * 11 + i) * .03, { seg: 6, tint: .8 + hash(n + i) * .4 });
  }
}

/** A timber-framed house (origin at the centre of its floor, door facing +z, ridge along x). */
export function house(k: Kit): void {
  k.box('hStone', [W + .25, BASE, D + .25], { at: [0, BASE / 2, 0], r: .05, fade: .3 });
  k.box('hPlaster', [W - .12, TOP - BASE, D - .12], { at: [0, (TOP + BASE) / 2, 0] });
  // frame: corner posts, sill, mid and top beams on all four walls
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box('hBeam', [.26, TOP - BASE + .1, .26], { at: [sx * W / 2, (TOP + BASE) / 2, sz * D / 2] });
  for (const y of [BASE + .08, 1.62, TOP]) both(s => {
    k.box('hBeam', [W + .06, .18, .2], { at: [0, y, s * D / 2] });
    k.box('hBeam', [.2, .18, D + .06], { at: [s * W / 2, y, 0] });
  });
  const stud = (x: number, z: number, alongX: boolean) => k.box('hBeam', alongX ? [.15, TOP - BASE, .14] : [.14, TOP - BASE, .15], { at: [x, (TOP + BASE) / 2, z] });
  const brace = (a: V3, b: V3) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), mid: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const alongX = Math.abs(b[0] - a[0]) > Math.abs(b[2] - a[2]);
    k.box('hBeam', [.12, len, .12], { at: mid, rot: alongX ? [0, 0, -Math.atan2(b[0] - a[0], b[1] - a[1])] : [Math.atan2(b[2] - a[2], b[1] - a[1]), 0, 0] });
  };
  // front: door jambs and window jambs; braces in the lower panels
  for (const x of [-.72, .72, -1.18, 1.18, -2.12, 2.12]) stud(x, D / 2 + .01, true);
  both(s => { brace([s * 1.2, BASE + .15, D / 2 + .02], [s * 2.1, 1.55, D / 2 + .02]); brace([s * 2.1, 1.7, D / 2 + .02], [s * 2.55, 2.8, D / 2 + .02]); });
  // back: studs and crossed braces in the upper panels
  for (const x of [-1.7, -.6, .6, 1.7]) stud(x, -D / 2 - .01, true);
  for (const [x0, x1] of [[-2.55, -1.7], [-.6, .6], [1.7, 2.55]] as const) { brace([x0, 1.7, -D / 2 - .02], [x1, 2.82, -D / 2 - .02]); brace([x1, 1.7, -D / 2 - .02], [x0, 2.82, -D / 2 - .02]); }
  // sides: window jambs and braces
  both(s => {
    for (const z of [-.55, .55, -1.75, 1.75]) stud(s * W / 2 + s * .01, z, false);
    brace([s * (W / 2 + .02), BASE + .15, 1.8], [s * (W / 2 + .02), 1.55, 2.55]);
    brace([s * (W / 2 + .02), BASE + .15, -1.8], [s * (W / 2 + .02), 1.55, -2.55]);
  });
  // gables: plaster triangles with a king post, struts and a collar beam
  both(s => {
    k.plate('hPlaster', [[-D / 2, 0], [D / 2, 0], [0, RIDGE - TOP]], .1, { at: [s * (W / 2 - .03), TOP, 0], rot: [0, PI / 2, 0] });
    k.box('hBeam', [.16, RIDGE - TOP - .1, .16], { at: [s * W / 2, TOP + (RIDGE - TOP) / 2, 0] });
    k.box('hBeam', [.14, .14, 2.8], { at: [s * W / 2, TOP + .95, 0] });
    both(t => brace([s * W / 2, TOP + .1, t * 2.2], [s * W / 2, TOP + 1.3, t * .2]));
  });
  // roof: overlapping shingle rows on both slopes, a ridge cap and bargeboards
  const run = D / 2 + OVER, rise = RIDGE - (TOP - .2), ang = Math.atan2(rise, run), slope = Math.hypot(run, rise), rows = 9;
  both(s => {
    for (let r = 0; r < rows; r++) {
      const t = (r + .5) / rows, z = s * t * run, y = RIDGE - t * rise + .06;
      k.box('hRoof', [W + OVER * 2, .07, slope / rows + .14], { at: [0, y, z], rot: [s * ang, 0, 0], tint: .78 + hash(r * 5 + (s > 0 ? 1 : 0)) * .3, fade: .3 });
    }
    both(t => k.box('hBeam', [.08, .26, slope + .1], { at: [t * (W / 2 + OVER), RIDGE - rise / 2 + .02, s * run / 2], rot: [s * ang, 0, 0] }));
  });
  k.box('hRoof', [W + OVER * 2 + .1, .22, .22], { at: [0, RIDGE + .1, 0], rot: [PI / 4, 0, 0], tint: .6 });
  // chimney through the back slope
  k.box('hStone', [.72, 3.0, .72], { at: [W / 2 - 1.1, 3.95, -1.2], r: .04, fade: .2 });
  k.box('hStone', [.88, .14, .88], { at: [W / 2 - 1.1, 5.5, -1.2], r: .03 });
  k.box('hDark', [.5, .02, .5], { at: [W / 2 - 1.1, 5.58, -1.2] });
  // door: frame, planks, iron straps, a ring, a stone step
  const dz = D / 2 + .04;
  for (const x of [-.62, .62]) k.box('hBeam', [.14, 2.05, .16], { at: [x, BASE + 1.02, dz] });
  k.box('hBeam', [1.38, .16, .18], { at: [0, BASE + 2.08, dz] });
  for (let i = 0; i < 4; i++) k.box('hWood', [.27, 1.95, .06], { at: [-.405 + i * .27, BASE + .98, dz + .02], tint: .78 + hash(i + 40) * .3 });
  for (const y of [BASE + .4, BASE + 1.55]) k.box('hIron', [.9, .07, .02], { at: [-.05, y, dz + .06] });
  k.ring('hIron', .07, .012, { at: [.3, BASE + 1.0, dz + .07], seg: 4 });
  k.box('hStone', [1.5, .16, .55], { at: [0, .08, D / 2 + .35], r: .03 });
  // windows: two at the front, one on each side
  window(k, -1.65, D / 2 + .02, 0, 0);
  window(k, 1.65, D / 2 + .02, 0, 1);
  window(k, W / 2 + .02, 0, PI / 2, 2);
  window(k, -W / 2 - .02, 0, -PI / 2, 3);
}

/* ---------- trees ---------- */

/** One jagged, drooping tier of a pine: alternate rim points reach out and sag, the rest pull in. */
function tier(k: Kit, y: number, r: number, h: number, seed: number, tint: number): void {
  const n = 9, g = new THREE.ConeGeometry(r, h, n * 2, 3, true), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), yy = p.getY(i), z = p.getZ(i), a = Math.atan2(x, z), idx = Math.round((a + PI) / (PI / n)), u = (h / 2 - yy) / h;
    const out = idx % 2 ? 1 : .74, jig = 1 + (hash(seed * 50 + idx) - .5) * .25 * u;
    const k2 = 1 + (out * jig - 1) * u;
    p.setXYZ(i, x * k2, yy - (idx % 2 ? .18 * u * u : 0), z * k2);
  }
  g.computeVertexNormals();
  g.translate(0, y + h / 2, 0);
  k.add('tNeedles', g, { tint, fade: .5 });
}

/** A pine: a flared trunk with roots and five to seven drooping tiers, lighter toward the top. */
export function pine(k: Kit, tall: boolean): void {
  k.lathe('tBark', [[.34, 0], [.22, .12], [.17, .5], [.13, 2.6], [.04, tall ? 5.6 : 4.9]], { seg: 8, fade: .35 });
  for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2 + .4; k.spike('tBark', [Math.sin(a) * .1, .14, Math.cos(a) * .1], [Math.sin(a) * .55, 0, Math.cos(a) * .55], .08, { seg: 5 }); }
  const tiers = tall ? 7 : 6, top = tall ? 5.9 : 5.0;
  for (let t = 0; t < tiers; t++) {
    const u = t / (tiers - 1), y = 1.0 + u * (top - 1.9), r = 1.55 * (1 - u) + .3 * u;
    tier(k, y, r * (tall ? .85 : 1), 1.35 - u * .45, t + (tall ? 10 : 0), .78 + u * .35);
  }
  k.spike('tNeedles', [0, top - .2, 0], [0, top + .55, 0], .14, { seg: 6, tint: 1.15 });
}

/** A dead tree: a leaning, twisted trunk and bare forking branches. */
export function deadTree(k: Kit): void {
  const trunk: V3[] = [[0, 0, 0], [.08, 1.2, .05], [-.05, 2.3, .15], [.1, 3.3, .05], [.2, 4.0, -.05]];
  k.tube('tBark', trunk, t => .28 * (1 - t) + .05, { seg: 8, segs: 20 });
  for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2 + .7; k.spike('tBark', [Math.sin(a) * .1, .14, Math.cos(a) * .1], [Math.sin(a) * .6, 0, Math.cos(a) * .6], .1, { seg: 5 }); }
  for (let i = 0; i < 6; i++) {
    const a = i * 2.3 + .5, y = 1.8 + i * .38, len = 1.5 - i * .15;
    const b0: V3 = [Math.sin(a) * .1, y, Math.cos(a) * .1], b1: V3 = [Math.sin(a) * len * .5, y + .5, Math.cos(a) * len * .5], b2: V3 = [Math.sin(a + .3) * len, y + 1.0, Math.cos(a + .3) * len];
    k.tube('tBark', [b0, b1, b2], t => .09 * (1 - t) + .015, { seg: 5, segs: 8 });
    k.tube('tBark', [b1, [b1[0] + Math.sin(a - 1) * .4, b1[1] + .55, b1[2] + Math.cos(a - 1) * .4]], t => .04 * (1 - t) + .01, { seg: 4, segs: 4 });
  }
}

/* ---------- the abbey ---------- */

/** A pointed stone archway on a wall face (origin at the foot of the opening, facing +z), with a dark recess. */
export function archway(k: Kit): void {
  // each side's arc is centred on the opposite side of the opening, at the springing line
  const half = 1.02, spring = 2.4, R = 1.4, c = R - half, top = Math.acos(-c / R), apex = spring + R * Math.sin(top);
  const arc = (r: number, th: number): [number, number] => [c + r * Math.cos(th), spring + r * Math.sin(th)];
  both(s => {
    for (let i = 0; i < 6; i++) k.box('stoneBlock', [.36, .39, .42], { at: [s * (half + .18), .2 + i * .4, .14], r: .03, tint: .7 + hash(i * 2 + (s > 0 ? 1 : 0)) * .35, fade: .15 });
    for (let i = 0; i < 6; i++) {
      const th = PI - (PI - top) * (i + .5) / 6, [x, y] = arc(R + .18, th);
      k.box('stoneBlock', [.36, .3, .44], { at: [s * -x, y, .14], rot: [0, 0, s < 0 ? th : PI - th], r: .03, tint: .75 + hash(i * 7 + (s > 0 ? 3 : 0)) * .3 });
    }
  });
  k.box('stoneBlock', [.3, .46, .48], { at: [0, apex + .12, .15], r: .03, tint: 1.05 });
  // the opening: up the right arc to the apex, down the left
  const left: [number, number][] = [];
  for (let i = 0; i <= 8; i++) left.push(arc(R - .02, PI - (PI - top) * i / 8));
  k.plate('dark', [[-half, 0], [half, 0], ...left.map(([x, y]): [number, number] => [-x, y]), ...left.slice(0, -1).reverse()], .04, { at: [0, 0, .03] });
}

/** A stepped buttress (origin at its foot against the wall, projecting +z). */
export function buttress(k: Kit): void {
  k.box('stoneBlock', [.8, 2.4, .95], { at: [0, 1.2, .47], r: .03, tint: .8, fade: .25 });
  k.box('stoneBlock', [.92, .14, 1.05], { at: [0, 2.45, .5], rot: [.35, 0, 0] });
  k.box('stoneBlock', [.62, 1.6, .7], { at: [0, 3.3, .35], r: .03, tint: .85 });
  k.box('stoneBlock', [.72, .12, .8], { at: [0, 4.12, .38], rot: [.45, 0, 0] });
}

/** A merlon on the battlement. */
export function merlon(k: Kit, seed: number): void {
  k.box('stoneBlock', [.5, .72, .45], { at: [0, .36, 0], tint: .75 + hash(seed) * .3, fade: .2 });
}

/** A rose window (in the XY plane, facing +z): stone rings and spokes with coloured glass between. */
export function roseWindow(k: Kit): void {
  k.ring('stoneBlock', .82, .1, { seg: 6 });
  k.ring('stoneBlock', .3, .07, { seg: 6 });
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * PI * 2, b = a + PI / 8;
    k.limb('stoneBlock', [Math.cos(a) * .3, Math.sin(a) * .3, 0], [Math.cos(a) * .8, Math.sin(a) * .8, 0], .045, .045, { seg: 5 });
    k.ball(i % 2 ? 'glassP' : 'glassG', [Math.cos(b) * .55, Math.sin(b) * .55, -.03], [.2, .2, .03], { seg: 8 });
  }
  k.ball('glassP', [0, 0, -.03], [.24, .24, .03], { seg: 10 });
  k.add('dark', new THREE.CircleGeometry(.84, 20), { at: [0, 0, -.06] });
}
