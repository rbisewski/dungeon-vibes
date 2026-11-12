import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clamp, lerp, ri, rr, vnoise } from '../core/math';
import { G } from '../game/state';
import { MAT } from '../render/materials';
import { _m4, _q, _s3, _v3 } from '../render/scratch';
import { DX8, DZ8, T, WALL_H } from './consts';
import { tileAt } from './nav';

export interface Tint { r: number; g: number; b: number }

/** Per-tile 3x3 vertex floor with corner AO, moss tint and random UV quadrant/rotation. */
export function buildFloor(tint: Tint): void {
  const { W, H, tiles } = G.L, pos: number[] = [], uv: number[] = [], col: number[] = [], nor: number[] = [], ind: number[] = [];
  const solid = (x: number, z: number): boolean => tileAt(x, z) === 0;
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const tt = tiles[z * W + x]; if (tt === 0 || tt === 6) continue;
    const variant = ri(0, 3), rot = ri(0, 3), qu = (variant & 1) * .5, qv = (variant >> 1) * .5, base = pos.length / 3, tb = rr(.82, 1.04);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
      const wx = x * T - 1 + i, wz = z * T - 1 + j;
      let u = i / 2, v = j / 2; if (rot === 1) [u, v] = [v, 1 - u]; else if (rot === 2) [u, v] = [1 - u, 1 - v]; else if (rot === 3) [u, v] = [1 - v, u];
      let ao = 1;
      const dx = i === 0 ? -1 : i === 2 ? 1 : 0, dz = j === 0 ? -1 : j === 2 ? 1 : 0;
      if (dx && dz) { const c = (solid(x + dx, z) ? 1 : 0) + (solid(x, z + dz) ? 1 : 0) + (solid(x + dx, z + dz) ? 1 : 0); ao = 1 - c * .17; }
      else if (dx) ao = solid(x + dx, z) ? .66 : 1; else if (dz) ao = solid(x, z + dz) ? .66 : 1;
      const moss = clamp((vnoise(wx * .35 + 31, wz * .35 + 7) - .58) * 3.5, 0, 1) * .55;
      const b = ao * tb * (1 - moss * .25);
      pos.push(wx, 0, wz); nor.push(0, 1, 0); uv.push(qu + u * .5, qv + v * .5);
      col.push(b * tint.r * lerp(1, .78, moss), b * tint.g * lerp(1, 1.0, moss), b * tint.b * lerp(1, .62, moss));
    }
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const a = base + j * 3 + i, b = a + 1, c = a + 3, d = a + 4; ind.push(a, c, b, b, c, d); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(ind);
  const m = new THREE.Mesh(g, MAT.floor); m.receiveShadow = true; G.L.group.add(m); G.L.disposeGeo.push(g);
}
export function buildWalls(tint: Tint): void {
  const { W, H, tiles } = G.L, list: [number, number][] = [];
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    if (tiles[z * W + x] !== 0) continue;
    let near = false; for (let k = 0; k < 8 && !near; k++) { const n = tileAt(x + DX8[k], z + DZ8[k]); if (n !== 0) near = true; }
    if (near) list.push([x, z]);
  }
  const geo = new THREE.BoxGeometry(T, WALL_H, T); geo.translate(0, WALL_H / 2, 0);
  const im = new THREE.InstancedMesh(geo, [MAT.wallSide, MAT.wallSide, MAT.wallTop, MAT.wallSide, MAT.wallSide, MAT.wallSide], list.length);
  const c = new THREE.Color();
  list.forEach(([x, z], i) => {
    _m4.compose(_v3.set(x * T, 0, z * T), _q.identity(), _s3.set(1, rr(.94, 1.08), 1)); im.setMatrixAt(i, _m4);
    const v = rr(.72, 1.0); c.setRGB(v * tint.r * rr(.96, 1.04), v * tint.g, v * tint.b * rr(.96, 1.04)); im.setColorAt(i, c);
  });
  im.castShadow = true; im.receiveShadow = true; G.L.group.add(im); G.L.disposeInst.push(im); G.L.disposeGeo.push(geo);
  if (G.L.pillars.length) {
    const pg = mergeGeometries([new THREE.BoxGeometry(1.0, .3, 1.0).translate(0, .15, 0).toNonIndexed(), new THREE.CylinderGeometry(.36, .4, 2.5, 8).translate(0, 1.55, 0).toNonIndexed(), new THREE.BoxGeometry(.9, .25, .9).translate(0, 2.88, 0).toNonIndexed()]);
    const pi = new THREE.InstancedMesh(pg, MAT.pillar, G.L.pillars.length);
    G.L.pillars.forEach((p, i) => { _m4.makeTranslation(p.x, 0, p.z); pi.setMatrixAt(i, _m4); });
    pi.castShadow = pi.receiveShadow = true; G.L.group.add(pi); G.L.disposeInst.push(pi); G.L.disposeGeo.push(pg);
  }
}
