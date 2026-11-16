/**
 * Outdoor scenery for the town (SPEC §13): grass and cobbled paths instead of dungeon flagstones, the abbey façade
 * with the dungeon entrances, a palisade instead of walls, timber houses, pines and lantern posts. Everything draws
 * from the level's (fixed) seeded stream. Houses and trees are instanced so they squash when the hero walks behind
 * them, like dungeon walls.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PI, R, TAU, clamp, rr, vnoise } from '../core/math';
import { G } from '../game/state';
import { S } from '../render/buckets';
import { gBox, gCyl } from '../render/geometry';
import { merged, type Kit } from '../actors/models/kit';
import { CELL, PROPS, SK } from './propKit';
import { rail, stake } from './propModels';
import { archway, buttress, deadTree, house, merlon, pine, roseWindow } from './townModels';
import { MAT } from '../render/materials';
import { _e, _m4, _q, _s3, _v3 } from '../render/scratch';
import { T } from './consts';

export interface Rect { x: number; y: number; w: number; h: number }

/** Grass beyond the map edge (tiles) so the square sits in open land. */
const MARGIN = 9;

function quadMesh(cells: [number, number][], mat: THREE.Material, y: number, color: (wx: number, wz: number) => number): void {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], col: number[] = [], ind: number[] = [];
  for (const [x, z] of cells) {
    const base = pos.length / 3;
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
      const wx = x * T - 1 + i, wz = z * T - 1 + j, b = color(wx, wz);
      pos.push(wx, y, wz); nor.push(0, 1, 0); uv.push(wx / 4, wz / 4); col.push(b, b, b);
    }
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const a = base + j * 3 + i; ind.push(a, a + 3, a + 1, a + 1, a + 3, a + 4); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(ind);
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; G.L.group.add(m); G.L.disposeGeo.push(g);
}

/** Grass everywhere (darker away from the square), cobbles on `paths`. Stairs tiles are left open. */
export function buildTownGround(yard: Rect, paths: Set<number>): void {
  const { W, H, tiles } = G.L, grass: [number, number][] = [], stone: [number, number][] = [];
  for (let z = -MARGIN; z < H + MARGIN; z++) for (let x = -MARGIN; x < W + MARGIN; x++) {
    const inside = x >= 0 && z >= 0 && x < W && z < H;
    if (inside && tiles[z * W + x] === 6) continue;
    (inside && paths.has(z * W + x) ? stone : grass).push([x, z]);
  }
  const cx = (yard.x + yard.w / 2) * T, cz = (yard.y + yard.h / 2) * T, reach = Math.max(yard.w, yard.h) * T * .75;
  quadMesh(grass, MAT.grass, 0, (wx, wz) => {
    const fall = clamp(1 - (Math.hypot(wx - cx, wz - cz) - reach * .7) / reach, .35, 1);
    return fall * (.75 + vnoise(wx * .3, wz * .3) * .4);
  });
  quadMesh(stone, MAT.floor, .01, (wx, wz) => .8 + vnoise(wx * .5 + 9, wz * .5) * .25);
}

/** The ruined abbey: a tall stone façade along row `z` with an archway above each entrance column. */
export function buildAbbey(x0: number, x1: number, z: number, entranceX: readonly number[]): void {
  const FRONT = 4.6, BACK = 6.4, list: [number, number, number][] = [];
  for (let x = x0; x <= x1; x++) { list.push([x, z, FRONT]); list.push([x, z - 1, BACK]); }
  const geo = new THREE.BoxGeometry(T, 1, T); geo.translate(0, .5, 0);
  const im = new THREE.InstancedMesh(geo, [MAT.wallSide, MAT.wallSide, MAT.wallTop, MAT.wallSide, MAT.wallSide, MAT.wallSide], list.length);
  const c = new THREE.Color();
  list.forEach(([x, zz, h], i) => {
    _m4.compose(_v3.set(x * T, 0, zz * T), _q.identity(), _s3.set(1, h, 1)); im.setMatrixAt(i, _m4);
    const v = rr(.7, .95); c.setRGB(v, v * .97, v * .92); im.setColorAt(i, c);
  });
  im.castShadow = im.receiveShadow = true; G.L.group.add(im); G.L.disposeInst.push(im); G.L.disposeGeo.push(geo);
  const face = z * T + 1, left = x0 * T - 1, right = x1 * T + 1;
  // pointed stone archways over the stairwells, stepped buttresses between them
  for (const ex of entranceX) SK('archway', archway, ex * T, 0, face);
  for (let i = 0; i < entranceX.length - 1; i++) SK('buttress', buttress, (entranceX[i] + entranceX[i + 1]) / 2 * T, 0, face);
  // a string course, battlements on both walls, a rose window high on the back wall
  S('stone', gBox(right - left, .16, .2), (left + right) / 2, 3.95, face + .08);
  for (const [y, zz] of [[FRONT, face - .3], [BACK, face - T - .3]] as const) {
    const n = Math.floor((right - left) / 1.15);
    for (let i = 0; i <= n; i++) { const v = i % 3; SK(`merlon${v}`, k => merlon(k, v), left + .3 + i * (right - left - .6) / n, y, zz); }
  }
  SK('roseWindow', roseWindow, (left + right) / 2, 5.45, face - T + .02, 0, .85);
}

/** A palisade of sharpened stakes with two rails, along the inside edge of the given tiles. */
export function buildFence(edges: { x0: number; z0: number; x1: number; z1: number }[]): void {
  for (const e of edges) {
    const len = Math.hypot(e.x1 - e.x0, e.z1 - e.z0), n = Math.round(len / .42), ry = Math.atan2(e.x1 - e.x0, e.z1 - e.z0);
    for (let k = 0; k <= n; k++) {
      const t = k / n, v = k % 4;
      SK(`stake${v}`, kit => stake(kit, v), e.x0 + (e.x1 - e.x0) * t, 0, e.z0 + (e.z1 - e.z0) * t, R() * TAU, 1, rr(-.05, .05), rr(-.05, .05));
    }
    for (const y of [.45, 1.0]) SK('rail', rail, (e.x0 + e.x1) / 2, y, (e.z0 + e.z1) / 2, ry, [1, 1, len]);
  }
}

/** Timber houses on the given tile blocks; each faces `toward` (its door side) and has lit windows. */
export function buildHouses(blocks: readonly Rect[], toward: { x: number; z: number }): void {
  instanced('house', house, blocks.map(b => {
    const x = (b.x + (b.w - 1) / 2) * T, z = (b.y + (b.h - 1) / 2) * T;
    // doors face the square: the nearest of the four sides
    const dx = toward.x - x, dz = toward.z - z, ry = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? PI / 2 : -PI / 2) : (dz > 0 ? 0 : PI);
    G.L.lights.push({ x: x + Math.sin(ry) * 3.4, y: 1.6, z: z + Math.cos(ry) * 3.4, base: 7, cold: false, seed: R() * 100, d: 0 });
    return { m: new THREE.Matrix4().compose(_v3.set(x, 0, z), _q.setFromEuler(_e.set(0, ry, 0)), _s3.set(1, 1, 1)) };
  }));
}

/**
 * Instances of kit model `key`: one instanced mesh per surface and CELL-metre square (so the camera and the lights'
 * shadow passes cull the squares out of reach); `c` tints an instance.
 */
function instanced(key: string, make: (k: Kit) => void, items: { m: THREE.Matrix4; c?: THREE.Color }[]): void {
  const cells = new Map<string, typeof items>();
  for (const it of items) {
    const id = `${Math.floor(it.m.elements[12] / CELL)},${Math.floor(it.m.elements[14] / CELL)}`;
    let list = cells.get(id);
    if (!list) cells.set(id, list = []);
    list.push(it);
  }
  for (const list of cells.values()) for (const b of merged(key, make, PROPS)) {
    const im = new THREE.InstancedMesh(b.geo, PROPS.material(b.key, b.surf), list.length);
    list.forEach((it, i) => { im.setMatrixAt(i, it.m); if (it.c) im.setColorAt(i, it.c); });
    im.castShadow = b.surf.shadow ?? true; im.receiveShadow = true;
    G.L.group.add(im); G.L.disposeInst.push(im);
  }
}

/** Pines (two shapes) and the odd dead tree, instanced; positions in world units. */
export function buildTrees(spots: { x: number; z: number; s: number }[]): void {
  const kinds = [
    { key: 'pine', make: (k: Kit) => pine(k, false) },
    { key: 'pineTall', make: (k: Kit) => pine(k, true) },
    { key: 'deadTree', make: deadTree },
  ];
  const items = kinds.map(() => [] as { m: THREE.Matrix4; c: THREE.Color }[]);
  for (const p of spots) {
    const r = R(), kind = r < .5 ? 0 : r < .88 ? 1 : 2, v = rr(.8, 1.15);
    const m = new THREE.Matrix4().compose(_v3.set(p.x, 0, p.z), _q.setFromEuler(_e.set(rr(-.04, .04), R() * TAU, rr(-.04, .04))), _s3.set(p.s, p.s * rr(.9, 1.2), p.s));
    items[kind].push({ m, c: new THREE.Color(v * rr(.88, 1.02), v, v * rr(.85, 1)) });
  }
  kinds.forEach((k, i) => instanced(k.key, k.make, items[i]));
}

/** Grass tufts (three thin blades each), instanced; they catch the light and break up the flat ground. */
export function buildTufts(spots: { x: number; z: number }[]): void {
  const blade = (a: number, lean: number): THREE.BufferGeometry =>
    new THREE.ConeGeometry(.045, .34, 3).translate(0, .17, 0).rotateZ(lean).rotateY(a).toNonIndexed();
  const geo = mergeGeometries([blade(0, .35), blade(2.1, -.3), blade(4.2, .22)]);
  const im = new THREE.InstancedMesh(geo, MAT.tuft, spots.length), c = new THREE.Color();
  spots.forEach((p, i) => {
    const s = rr(.7, 1.5);
    _m4.compose(_v3.set(p.x, 0, p.z), _q.setFromEuler(_e.set(0, R() * TAU, 0)), _s3.set(s, s * rr(.8, 1.4), s)); im.setMatrixAt(i, _m4);
    const v = rr(.6, 1.15); c.setRGB(v * rr(.8, 1.1), v, v * rr(.6, 1)); im.setColorAt(i, c);
  });
  im.receiveShadow = true; G.L.group.add(im); G.L.disposeInst.push(im); G.L.disposeGeo.push(geo);
}

/** An iron lantern post with a warm flame. */
export function lampPost(x: number, z: number): void {
  S('iron', gCyl(.06, .08, 2.4, 6), x, 1.2, z);
  S('iron', gBox(.5, .06, .06), x + .2, 2.35, z);
  S('iron', gBox(.26, .05, .26), x + .42, 2.3, z);
  S('iron', gBox(.26, .05, .26), x + .42, 1.95, z);
  G.L.flames.push({ x: x + .42, y: 2.08, z, s: .6, seed: R() });
  G.L.lights.push({ x: x + .42, y: 2.1, z, base: 14, cold: false, seed: R() * 100, d: 0 });
}

