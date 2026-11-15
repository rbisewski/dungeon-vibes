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
  const list: [number, number, number][] = [];
  for (let x = x0; x <= x1; x++) { list.push([x, z, 4.6]); list.push([x, z - 1, 6.2]); }
  const geo = new THREE.BoxGeometry(T, 1, T); geo.translate(0, .5, 0);
  const im = new THREE.InstancedMesh(geo, [MAT.wallSide, MAT.wallSide, MAT.wallTop, MAT.wallSide, MAT.wallSide, MAT.wallSide], list.length);
  const c = new THREE.Color();
  list.forEach(([x, zz, h], i) => {
    _m4.compose(_v3.set(x * T, 0, zz * T), _q.identity(), _s3.set(1, h * rr(.92, 1.06), 1)); im.setMatrixAt(i, _m4);
    const v = rr(.7, .95); c.setRGB(v, v * .97, v * .92); im.setColorAt(i, c);
  });
  im.castShadow = im.receiveShadow = true; G.L.group.add(im); G.L.disposeInst.push(im); G.L.disposeGeo.push(geo);
  // archways: a dark recess and a stone lintel over each stairwell
  const face = z * T + 1;
  for (const ex of entranceX) {
    const x = ex * T;
    S('dark', gBox(1.7, 2.6, .12), x, 1.3, face + .02);
    S('stone', gBox(2.1, .35, .3), x, 2.75, face + .1);
    for (const s of [-1, 1]) S('stone', gBox(.28, 2.7, .3), x + s * .95, 1.35, face + .1);
  }
  // buttresses between archways
  for (let i = 0; i < entranceX.length - 1; i++) { const x = (entranceX[i] + entranceX[i + 1]) / 2 * T; S('stone', gBox(.6, 3.6, .8), x, 1.8, face + .35); }
}

/** A palisade of sharpened stakes with two rails, along the inside edge of the given tiles. */
export function buildFence(edges: { x0: number; z0: number; x1: number; z1: number }[]): void {
  for (const e of edges) {
    const len = Math.hypot(e.x1 - e.x0, e.z1 - e.z0), n = Math.round(len / .42), dx = (e.x1 - e.x0) / len, dz = (e.z1 - e.z0) / len, ry = Math.atan2(dx, dz);
    for (let k = 0; k <= n; k++) {
      const t = k / n, x = e.x0 + (e.x1 - e.x0) * t, z = e.z0 + (e.z1 - e.z0) * t, h = rr(1.25, 1.55);
      S('wood', gCyl(.09, .1, h, 5), x, h / 2, z);
      S('wood', gCyl(0, .09, .25, 5), x, h + .12, z);
    }
    for (const y of [.45, 1.0]) S('wood', gBox(.06, .1, len), (e.x0 + e.x1) / 2, y, (e.z0 + e.z1) / 2, ry);
  }
}

/** Builds one geometry per material for a timber house centred on the origin, door facing +z. */
function houseParts(w: number, d: number): Record<'plaster' | 'beam' | 'roof' | 'window', THREE.BufferGeometry> {
  const wallH = 2.6, roofH = 2.1, over = .4;
  const box = (sx: number, sy: number, sz: number, x: number, y: number, z: number, rz = 0, rx = 0) =>
    new THREE.BoxGeometry(sx, sy, sz).applyMatrix4(_m4.compose(_v3.set(x, y, z), _q.setFromEuler(_e.set(rx, 0, rz)), _s3.set(1, 1, 1))).toNonIndexed();
  const plaster = [box(w, wallH, d, 0, wallH / 2, 0)];
  // gable triangles at the two ends (roof ridge runs along x)
  const tri = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, roofH)]);
  for (const s of [-1, 1]) {
    const g = new THREE.ShapeGeometry(tri).toNonIndexed();
    g.applyMatrix4(_m4.compose(_v3.set(s * w / 2, wallH, 0), _q.setFromEuler(_e.set(0, s * PI / 2, 0)), _s3.set(1, 1, 1)));
    plaster.push(g);
  }
  const beam: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) beam.push(box(.22, wallH, .22, sx * w / 2, wallH / 2, sz * d / 2));
  for (const sz of [-1, 1]) beam.push(box(w + .1, .2, .2, 0, wallH, sz * d / 2), box(w + .1, .14, .16, 0, wallH * .45, sz * d / 2));
  for (const sx of [-1, 1]) beam.push(box(.2, .2, d + .1, sx * w / 2, wallH, 0));
  // diagonal braces on the front
  for (const sx of [-1, 1]) beam.push(box(.14, 1.4, .14, sx * w * .3, wallH * .7, d / 2 + .02, sx * .7));
  beam.push(box(1.0, 1.7, .12, 0, .85, d / 2 + .05)); // door
  const slope = Math.atan2(roofH, d / 2), len = Math.hypot(roofH, d / 2) + over;
  const roof: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) roof.push(box(w + over * 2, .14, len, 0, wallH + roofH / 2 + .05, s * (d / 4 + over / 4), 0, s * slope));
  roof.push(box(w + over * 2 + .1, .2, .25, 0, wallH + roofH + .05, 0));
  const window: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) window.push(box(.55, .6, .08, sx * w * .3, 1.5, d / 2 + .03));
  for (const sz of [-1, 1]) window.push(box(.08, .6, .55, w / 2 + .03, 1.5, sz * d * .2));
  const merge = (a: THREE.BufferGeometry[]) => { const m = mergeGeometries(a); a.forEach(g => g.dispose()); return m; };
  return { plaster: merge(plaster), beam: merge(beam), roof: merge(roof), window: merge(window) };
}

/** Timber houses on the given tile blocks; each faces `toward` (its door side) and has lit windows. */
export function buildHouses(blocks: readonly Rect[], toward: { x: number; z: number }): void {
  const parts = houseParts(5.2, 5.2), mats = { plaster: MAT.plaster, beam: MAT.beam, roof: MAT.roof, window: MAT.windowLit };
  const ims = (Object.keys(parts) as (keyof typeof parts)[]).map(k => {
    const im = new THREE.InstancedMesh(parts[k], mats[k], blocks.length);
    im.castShadow = im.receiveShadow = true; G.L.group.add(im); G.L.disposeInst.push(im); G.L.disposeGeo.push(parts[k]);
    return im;
  });
  blocks.forEach((b, i) => {
    const x = (b.x + (b.w - 1) / 2) * T, z = (b.y + (b.h - 1) / 2) * T;
    // doors face the square: the nearest of the four sides
    const dx = toward.x - x, dz = toward.z - z, ry = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? PI / 2 : -PI / 2) : (dz > 0 ? 0 : PI);
    _m4.compose(_v3.set(x, 0, z), _q.setFromEuler(_e.set(0, ry, 0)), _s3.set(1, 1, 1));
    for (const im of ims) im.setMatrixAt(i, _m4);
    G.L.lights.push({ x: x + Math.sin(ry) * 3.4, y: 1.6, z: z + Math.cos(ry) * 3.4, base: 7, cold: false, seed: R() * 100, d: 0 });
  });
}

/** Pines (trunk plus three cones), instanced; positions in world units. */
export function buildTrees(spots: { x: number; z: number; s: number }[]): void {
  const trunk = new THREE.CylinderGeometry(.14, .2, 1.4, 6).translate(0, .7, 0);
  const crown = mergeGeometries([0, 1, 2].map(k => new THREE.ConeGeometry(1.3 - k * .32, 1.6, 7).translate(0, 1.6 + k * .9, 0).toNonIndexed()));
  const a = new THREE.InstancedMesh(trunk, MAT.bark, spots.length), b = new THREE.InstancedMesh(crown, MAT.foliage, spots.length);
  const c = new THREE.Color();
  spots.forEach((p, i) => {
    _m4.compose(_v3.set(p.x, 0, p.z), _q.setFromEuler(_e.set(0, R() * TAU, 0)), _s3.set(p.s, p.s * rr(.9, 1.2), p.s));
    a.setMatrixAt(i, _m4); b.setMatrixAt(i, _m4);
    const v = rr(.75, 1.15); c.setRGB(v * .9, v, v * .9); b.setColorAt(i, c);
  });
  for (const m of [a, b]) { m.castShadow = m.receiveShadow = true; G.L.group.add(m); G.L.disposeInst.push(m); }
  G.L.disposeGeo.push(trunk, crown);
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

