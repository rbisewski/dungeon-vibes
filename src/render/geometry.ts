import * as THREE from 'three';
import { PI } from '../core/math';
import { TEX } from './textures';

/** Shared geometry cache: identical primitive parameters reuse one BufferGeometry. Never disposed. */
const GC = new Map<string, THREE.BufferGeometry>();
const gget = <G extends THREE.BufferGeometry>(k: string, f: () => G): G => { let g = GC.get(k) as G | undefined; if (!g) { g = f(); GC.set(k, g); } return g; };
export const gBox = (w: number, h: number, d: number) => gget(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
export const gCyl = (a: number, b: number, h: number, s = 8) => gget(`c${a},${b},${h},${s}`, () => new THREE.CylinderGeometry(a, b, h, s));
export const gSph = (r: number, w = 10, h = 8) => gget(`s${r},${w},${h}`, () => new THREE.SphereGeometry(r, w, h));
export const gCone = (r: number, h: number, s = 8) => gget(`k${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s));
export const gPlane = (w: number, h: number) => gget(`p${w},${h}`, () => new THREE.PlaneGeometry(w, h));
export const gDode = (r: number) => gget(`d${r}`, () => new THREE.DodecahedronGeometry(r, 0));
export const gCircle = (r: number) => gget(`o${r}`, () => new THREE.CircleGeometry(r, 18));
export const GEO = {
  barrel: new THREE.LatheGeometry([[0, 0], [.32, 0], [.37, .2], [.39, .43], [.37, .66], [.32, .86], [0, .86]].map(p => new THREE.Vector2(p[0], p[1])), 12),
  lid: new THREE.CylinderGeometry(.29, .29, .9, 10, 1, false, 0, PI),
  blade: new THREE.CylinderGeometry(.62, .62, .05, 16, 1, false, 0, PI),
  cloak: new THREE.CylinderGeometry(.2, .34, .62, 10, 1, true, PI * .55, PI * .9),
  trail: new THREE.RingGeometry(.3, 1.45, 32, 1)
};
export function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, parent: THREE.Object3D | null = null, shadow = true): THREE.Mesh {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = true;
  if (parent) parent.add(o);
  return o;
}
export function glowSprite(color: THREE.ColorRepresentation, size: number, parent: THREE.Object3D | null, x = 0, y = 0, z = 0): THREE.Sprite {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  s.scale.set(size, size, 1); s.position.set(x, y, z);
  if (parent) parent.add(s);
  return s;
}
