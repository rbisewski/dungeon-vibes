/**
 * Static props built with the modelling kit (SPEC §10.7): one shared palette of prop surfaces, and placement that
 * bakes each prop's transform into per-level static geometry, merged into one mesh per surface kind.
 */
import * as THREE from 'three';
import { BackSide, DoubleSide } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { G } from '../game/state';
import { merged, Skin, type Kit } from '../actors/models/kit';
import { _e, _m4, _q, _s3, _v3 } from '../render/scratch';

/** Every colour a prop may use. Props do not flash or tint, so the materials are shared by all of them. */
export const PROPS = new Skin({
  wood: { color: 0x8a6a4a, rough: .8, tex: 'wood', rim: false },
  woodDark: { color: 0x5a4030, rough: .8, tex: 'wood', rim: false },
  bark: { color: 0x4a3a2c, rough: 1, rim: false },
  iron: { color: 0x5a5a62, rough: .45, metal: .7, rim: false },
  gold: { color: 0xd8a040, rough: .3, metal: .9, rim: false },
  stone: { color: 0xa09888, rough: 1, tex: 'wall', rim: false },
  stoneBlock: { color: 0x9a9284, rough: 1, rim: false },
  dark: { color: 0x060504, rough: 1, rim: false },
  /** Insides seen from within: a well shaft, a pot's inner wall. */
  void: { color: 0x050404, rough: 1, side: BackSide, rim: false, shadow: false },
  rope: { color: 0xb09a70, rough: 1, rim: false },
  water: { color: 0x14202a, rough: .05, envI: 1.2, rim: false },
  roof: { color: 0xffffff, rough: 1, tex: 'roof', rim: false },
  canvasRed: { color: 0xa83a2c, rough: 1, side: DoubleSide, rim: false },
  canvasGreen: { color: 0x3a7044, rough: 1, side: DoubleSide, rim: false },
  canvasCream: { color: 0xd8ccb0, rough: 1, side: DoubleSide, rim: false },
  clay: { color: 0xa85a38, rough: .9, rim: false },
  glaze: { color: 0x3a5a7a, rough: .3, envI: .6, rim: false },
  herb: { color: 0x5a8a3a, rough: 1, rim: false },
  glassG: { color: 0x3aa060, rough: .1, envI: 1, emissive: 0x0a2a10, rim: false },
  glassP: { color: 0x9a40c0, rough: .1, envI: 1, emissive: 0x200a30, rim: false },
  paper: { color: 0xe8dcb8, rough: .9, rim: false },
  leather: { color: 0x6a4428, rough: .8, rim: false },
  coal: { color: 0x2a0800, rough: 1, emissive: 0xff4a10, rim: false },
  candle: { color: 0xe8e0c8, rough: .7, rim: false },
  // houses and trees: instanced, fading out when the hero walks behind them
  hStone: { color: 0x9a9284, rough: 1, tex: 'wall', rim: false, fade: true },
  hPlaster: { color: 0xffffff, rough: 1, tex: 'plaster', rim: false, fade: true },
  hBeam: { color: 0x6a5040, rough: .9, tex: 'wood', rim: false, fade: true },
  hWood: { color: 0x7a5a3e, rough: .9, tex: 'wood', rim: false, fade: true },
  hRoof: { color: 0xffffff, rough: 1, tex: 'roof', rim: false, fade: true },
  hWindow: { color: 0x3a2008, rough: .6, emissive: 0xffa040, glow: 2.4, rim: false, fade: true },
  hIron: { color: 0x3a3a40, rough: .5, metal: .7, rim: false, fade: true },
  hHerb: { color: 0x6a8a3a, rough: 1, rim: false, fade: true },
  hDark: { color: 0x080706, rough: 1, rim: false, fade: true },
  tBark: { color: 0x5a4430, rough: 1, rim: false, fade: true },
  tNeedles: { color: 0x3a6a3e, rough: 1, rim: false, fade: true },
}, 0);

const buckets = new Map<string, { mat: THREE.Material; shadow: boolean; geos: THREE.BufferGeometry[] }>();
/**
 * Props merge per surface and per CELL-metre square, so the camera and each light's shadow pass cull the squares out
 * of reach instead of drawing every prop of the level in every pass.
 */
export const CELL = 16;

export function resetPropBuckets(): void { buckets.clear(); }

/**
 * Places a copy of prop `key` (built by `make` on first use) at (x, y, z), turned `ry` about y, then tilted by `rx`
 * and `rz`, and scaled by `s` (uniform or per axis).
 */
export function SK(key: string, make: (k: Kit) => void, x: number, y: number, z: number, ry = 0, s: number | readonly [number, number, number] = 1, rx = 0, rz = 0): void {
  _m4.compose(_v3.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), typeof s === 'number' ? _s3.set(s, s, s) : _s3.set(s[0], s[1], s[2]));
  const cell = `|${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  for (const b of merged(key, make, PROPS)) {
    let e = buckets.get(b.key + cell);
    if (!e) { e = { mat: PROPS.material(b.key, b.surf), shadow: b.surf.shadow ?? true, geos: [] }; buckets.set(b.key + cell, e); }
    e.geos.push(b.geo.clone().applyMatrix4(_m4));
  }
}

/** Merges the level's placed props: one mesh per surface kind and cell. */
export function mergePropBuckets(): void {
  for (const e of buckets.values()) {
    // every prop geometry shares one layout (position, normal, uv, colour; indexed), so they merge directly
    const g = e.geos.length > 1 ? mergeGeometries(e.geos) : e.geos[0];
    if (!g) throw new Error('propKit: merge failed');
    if (e.geos.length > 1) e.geos.forEach(x => x.dispose());
    const m = new THREE.Mesh(g, e.mat);
    m.castShadow = e.shadow; m.receiveShadow = true;
    G.L.group.add(m); G.L.disposeGeo.push(g);
  }
  buckets.clear();
}
