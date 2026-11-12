import * as THREE from 'three';
import { flameMat } from './materials';
import { _m4 } from './scratch';
import type { FlameSpec } from '../game/types';

/** One instanced, camera-facing flame quad per spec. */
export function makeFlames(list: FlameSpec[]): THREE.InstancedMesh {
  const geo = new THREE.PlaneGeometry(.55, .95); geo.translate(0, .32, 0);
  const n = Math.max(1, list.length), seeds = new Float32Array(n), scales = new Float32Array(n);
  const im = new THREE.InstancedMesh(geo, flameMat, n);
  list.forEach((f, i) => { _m4.makeTranslation(f.x, f.y, f.z); im.setMatrixAt(i, _m4); seeds[i] = f.seed; scales[i] = f.s; });
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1)); geo.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 1));
  im.count = list.length; im.frustumCulled = false; im.renderOrder = 5;
  return im;
}
