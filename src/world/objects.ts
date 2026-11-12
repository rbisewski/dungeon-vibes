import * as THREE from 'three';
import { PI, R, TAU, ri } from '../core/math';
import { G } from '../game/state';
import { S } from '../render/buckets';
import { GEO, gBox, gCone, gCyl, gSph, glowSprite, mesh } from '../render/geometry';
import { MAT } from '../render/materials';
import { T } from './consts';
import type { Axis, Chest, Door, Trap } from '../game/types';

export function makeChest(x: number, z: number, ry: number, isKey: boolean): Chest {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  const trim = isKey ? MAT.gold : MAT.iron;
  mesh(gBox(.9, .48, .58), MAT.wood, 0, .24, 0, g);
  mesh(gBox(.94, .06, .62), trim, 0, .06, 0, g);
  for (const s of [-1, 1]) mesh(gBox(.06, .5, .62), trim, .3 * s, .25, 0, g);
  mesh(gBox(.1, .12, .04), MAT.gold, 0, .38, .3, g);
  const lid = new THREE.Group(); lid.position.set(0, .48, -.29); g.add(lid);
  const lm = mesh(GEO.lid, MAT.wood, 0, 0, .29, lid); lm.rotation.z = PI / 2;
  for (const s of [-1, 1]) { const b = mesh(gCyl(.3, .3, .06, 10), trim, .3 * s, 0, .29, lid); b.rotation.z = PI / 2; b.scale.set(1, 1, 1); }
  let glow: THREE.Sprite | null = null; if (isKey) glow = glowSprite(0xffc060, 1.2, g, 0, .7, 0);
  G.L.group.add(g);
  return { g, lid, glow, open: false, t: 0, x, z, isKey, gold: ri(6, 18), potion: R() < .38 };
}
/** Room ids and target group a door needs; satisfied by both a `Level` and a layout under construction. */
export interface DoorCtx { roomId: Int16Array; W: number; group: THREE.Group }

/** Hinged door on tile (tx, tz); it swings away from the adjacent room. */
export function makeDoor(ctx: DoorCtx, tx: number, tz: number, axis: Axis, locked: boolean): Door {
  const { roomId, W } = ctx;
  const cx = tx * T, cz = tz * T, pivot = new THREE.Group(), leaf = new THREE.Group(); pivot.add(leaf);
  let sign: number;
  if (axis === 'x') { pivot.position.set(cx, 0, cz - .95); leaf.position.set(0, 1.3, .95); sign = roomId[tz * W + tx + 1] >= 0 ? 1 : -1; }
  else { pivot.position.set(cx - .95, 0, cz); leaf.position.set(.95, 1.3, 0); sign = roomId[(tz + 1) * W + tx] >= 0 ? 1 : -1; }
  const bw: [number, number, number] = axis === 'x' ? [.14, 2.6, 1.88] : [1.88, 2.6, .14];
  mesh(gBox(...bw), MAT.wood, 0, 0, 0, leaf);
  for (const y of [-.8, .8]) mesh(gBox(axis === 'x' ? .17 : 1.9, .1, axis === 'x' ? 1.9 : .17), locked ? MAT.iron : MAT.rust, 0, y, 0, leaf);
  let glow: THREE.Sprite | null = null;
  if (locked) {
    for (const y of [-1.1, 0, 1.1]) for (const o of [-.6, 0, .6]) mesh(gSph(.04, 5, 4), MAT.iron, axis === 'x' ? .09 : o, y, axis === 'x' ? o : .09, leaf);
    const lockPos: [number, number, number] = axis === 'x' ? [roomId[tz * W + tx + 1] >= 0 ? -.12 : .12, -.1, 0] : [0, -.1, roomId[(tz + 1) * W + tx] >= 0 ? -.12 : .12];
    mesh(gBox(.18, .22, .18), MAT.gold, ...lockPos, leaf);
    glow = glowSprite(0xffb050, .9, leaf, ...lockPos);
  }
  ctx.group.add(pivot);
  return { pivot, axis, sign, open: 0, locked, tx, tz, x: cx, z: cz, glow, wasOpen: false };
}
export function makeSpikes(tx: number, tz: number): void {
  const x = tx * T, z = tz * T;
  S('iron', gBox(1.7, .06, 1.7), x, .03, z);
  const g = new THREE.Group(); g.position.set(x, -.6, z);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) mesh(gCone(.07, .5, 5), MAT.steel, i * .5, .25, j * .5, g);
  G.L.group.add(g);
  const tr: Trap = { kind: 'spike', tx, tz, x, z, t: R() * 3.6, g, hit: new Set(), up: false };
  G.L.trap[tz * G.L.W + tx] = G.L.traps.length; G.L.traps.push(tr);
}
export function makeBlade(tx: number, tz: number, along: Axis): void {
  const x = tx * T, z = tz * T, outer = new THREE.Group(); outer.position.set(x, 3.35, z); outer.rotation.y = along === 'x' ? 0 : PI / 2;
  mesh(gBox(.22, .22, 2.3), MAT.iron, 0, 0, 0, outer);
  const sw = new THREE.Group(); outer.add(sw);
  mesh(gBox(.07, 2.75, .07), MAT.iron, 0, -1.375, 0, sw);
  const bl = mesh(GEO.blade, MAT.steel, 0, -2.75, 0, sw); bl.rotation.z = -PI / 2;
  G.L.group.add(outer);
  const tr: Trap = { kind: 'blade', tx, tz, x, z, along, sw, ph: R() * TAU, w: TAU / 3.0, ang: 0, prev: 0, hitT: new Map() };
  G.L.trap[tz * G.L.W + tx] = G.L.traps.length; G.L.traps.push(tr);
}
