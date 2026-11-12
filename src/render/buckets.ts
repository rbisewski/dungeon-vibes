import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { G } from '../game/state';
import { MAT } from './materials';
import { _e, _m4, _q, _s3, _v3 } from './scratch';

const BUCKET_MAT = {
  stone: MAT.stone, wood: MAT.wood, iron: MAT.iron, rust: MAT.rust, bone: MAT.bone, web: MAT.web,
  banner: MAT.banner, coal: MAT.coal, dark: MAT.dark, gold: MAT.gold, puddle: MAT.puddle,
};
export type BucketName = keyof typeof BUCKET_MAT;

/** Static level geometry, collected per material and merged into one mesh each. */
let buckets: Partial<Record<BucketName, THREE.BufferGeometry[]>> = {};

export function resetBuckets(): void { buckets = {}; }

/** Queues a transformed copy of `geo` into the static bucket `name` (merged per level by `mergeBuckets`). */
export function S(name: BucketName, geo: THREE.BufferGeometry, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1): void {
  _m4.compose(_v3.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s3.set(sx, sy, sz));
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
  g.applyMatrix4(_m4);
  (buckets[name] ??= []).push(g);
}

export function mergeBuckets(): void {
  for (const name of Object.keys(buckets) as BucketName[]) {
    const arr = buckets[name];
    if (!arr?.length) continue;
    const g = mergeGeometries(arr, false); arr.forEach(a => a.dispose());
    const m = new THREE.Mesh(g, BUCKET_MAT[name]);
    m.castShadow = !(name === 'web' || name === 'puddle' || name === 'banner'); m.receiveShadow = true;
    if (name === 'puddle') m.renderOrder = 1;
    G.L.group.add(m); G.L.disposeGeo.push(g);
  }
  buckets = {};
}
