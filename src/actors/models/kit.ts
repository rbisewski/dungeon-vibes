/**
 * Character modelling kit (SPEC §10.5). A model is built from many small shaped pieces (tapered limbs, lathed
 * bodies, tubes, bevelled boxes, extruded blades, flat membranes), each with baked shading in its vertex colours.
 * The pieces of one rigid part (everything under one joint) are merged into one mesh per material slot, and the
 * merged geometry is cached per model, so detail costs no extra draw calls and instances share geometry.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { applyFade, pmrem, rimLit } from '../../render/materials';
import { TEX } from '../../render/textures';

export type V3 = readonly [number, number, number];
export type V2 = readonly [number, number];

export interface PieceOpts {
  /** Position, Euler rotation (XYZ) and scale applied after the piece is built at the origin. */
  at?: V3; rot?: V3; scale?: V3 | number;
  /** Brightness (or an RGB multiplier) baked into the vertex colours. */
  tint?: number | V3;
  /** Darkens the piece toward its lowest point (in its own frame) by this fraction: a cheap ambient occlusion. */
  fade?: number;
  /** Darkens the piece toward its highest point instead (pieces seen from below, undersides of brims). */
  fadeUp?: number;
  /** Radial segments for round pieces. */
  seg?: number;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Segments around a round piece of radius r: small pieces need few (a 2 cm knuckle covers a pixel or two on screen),
 * capped by the piece's own `seg`.
 */
const segsFor = (r: number, max: number, min = 5): number => Math.max(min, Math.min(max, Math.round(r * 90)));

/** Keeps only position, normal and uv, indexed, so every piece merges with every other. */
function normalise(g: THREE.BufferGeometry): THREE.BufferGeometry {
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  if (!g.attributes.normal) g.computeVertexNormals();
  return g.index ? g : mergeVertices(g);
}

function bake(g: THREE.BufferGeometry, o: PieceOpts): void {
  const pos = g.attributes.position, n = pos.count, col = new Float32Array(n * 3);
  const t = o.tint ?? 1, [tr, tg, tb] = typeof t === 'number' ? [t, t, t] : t;
  let y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i++) { const y = pos.getY(i); if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const span = Math.max(1e-6, y1 - y0);
  for (let i = 0; i < n; i++) {
    const u = (pos.getY(i) - y0) / span;
    const k = (1 - (o.fade ?? 0) * (1 - u) * (1 - u)) * (1 - (o.fadeUp ?? 0) * u * u);
    col[i * 3] = tr * k; col[i * 3 + 1] = tg * k; col[i * 3 + 2] = tb * k;
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
}

function place(g: THREE.BufferGeometry, o: PieceOpts): THREE.BufferGeometry {
  const s = o.scale ?? 1;
  if (typeof s === 'number') _s.set(s, s, s); else _s.set(s[0], s[1], s[2]);
  _q.setFromEuler(_e.set(...(o.rot ?? [0, 0, 0])));
  _m.compose(_p.set(...(o.at ?? [0, 0, 0])), _q, _s);
  return g.applyMatrix4(_m);
}

/** Rotation taking +y to the direction from a to b. */
function aim(a: V3, b: V3): THREE.Quaternion {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
  return new THREE.Quaternion().setFromUnitVectors(UP, d);
}

export class Kit {
  private readonly parts = new Map<string, THREE.BufferGeometry[]>();

  /** `boxR`: edge rounding of boxes that do not set their own. */
  constructor(private readonly boxR = .015) {}

  /** Adds an arbitrary geometry (consumed) to `slot`. */
  add(slot: string, g: THREE.BufferGeometry, o: PieceOpts = {}): this {
    const n = normalise(g);
    bake(n, o);
    place(n, o);
    let list = this.parts.get(slot);
    if (!list) { list = []; this.parts.set(slot, list); }
    list.push(n);
    return this;
  }

  /** An ellipsoid. */
  ball(slot: string, at: V3, r: number | V3, o: PieceOpts = {}): this {
    const rr = typeof r === 'number' ? [r, r, r] as const : r;
    const seg = segsFor(Math.max(...rr), o.seg ?? 12), g = new THREE.SphereGeometry(1, seg, Math.max(3, Math.round(seg * .6)));
    g.scale(rr[0], rr[1], rr[2]);
    return this.add(slot, g, { ...o, at, scale: o.scale ?? 1 });
  }

  /** A limb from a to b: a tapered cylinder with rounded ends. */
  limb(slot: string, a: V3, b: V3, r0: number, r1: number, o: PieceOpts & { caps?: boolean } = {}): this {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), seg = segsFor(Math.max(r0, r1) * 1.3, o.seg ?? 8, 4);
    const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, true);
    g.translate(0, len / 2, 0);
    g.applyQuaternion(aim(a, b));
    g.translate(...a);
    this.add(slot, g, { tint: o.tint, fade: o.fade, fadeUp: o.fadeUp });
    if (o.caps !== false) { this.ball(slot, a, r0, { seg, tint: o.tint }); this.ball(slot, b, r1, { seg, tint: o.tint }); }
    return this;
  }

  /** A cone from its base centre `a` to its tip `b`. */
  spike(slot: string, a: V3, b: V3, r: number, o: PieceOpts = {}): this {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), g = new THREE.ConeGeometry(r, len, o.seg ?? 6);
    g.translate(0, len / 2, 0);
    g.applyQuaternion(aim(a, b));
    g.translate(...a);
    return this.add(slot, g, { tint: o.tint, fade: o.fade });
  }

  /** A body of revolution from a profile of [radius, height] points; `scale` [sx, 1, sz] makes it elliptical. */
  lathe(slot: string, profile: readonly V2[], o: PieceOpts & { arc?: [number, number] } = {}): this {
    const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(1e-4, r), y)), o.seg ?? 14, o.arc?.[0] ?? 0, o.arc?.[1] ?? Math.PI * 2);
    // Lathe faces point outward only for profiles drawn bottom to top; profiles may be written either way.
    const idx = g.index!, pos = g.attributes.position, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    let out = 0;
    for (let i = 0; i < idx.count; i += 3) {
      a.fromBufferAttribute(pos, idx.getX(i)); b.fromBufferAttribute(pos, idx.getX(i + 1)); c.fromBufferAttribute(pos, idx.getX(i + 2));
      const mx = (a.x + b.x + c.x) / 3, mz = (a.z + b.z + c.z) / 3;
      b.sub(a); c.sub(a); b.cross(c);
      out += b.x * mx + b.z * mz;
    }
    if (out < 0) {
      for (let i = 0; i < idx.count; i += 3) { const t = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, t); }
      const n = g.attributes.normal;
      for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
    }
    return this.add(slot, g, o);
  }

  /** A box with rounded edges. */
  box(slot: string, size: V3, o: PieceOpts & { r?: number } = {}): this {
    // rounding too small to see (teeth, rivets, stitches) is not worth a rounded box's ~150 triangles
    const r = Math.min(o.r ?? this.boxR, size[0] / 2 - 1e-4, size[1] / 2 - 1e-4, size[2] / 2 - 1e-4);
    return this.add(slot, r >= .008 ? new RoundedBoxGeometry(size[0], size[1], size[2], 1, r) : new THREE.BoxGeometry(...size), o);
  }

  /** A tube through `pts`; `r` may vary along it (0 at the start, 1 at the end). */
  tube(slot: string, pts: readonly V3[], r: number | ((t: number) => number), o: PieceOpts & { segs?: number; closed?: boolean } = {}): this {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
    const rMax = typeof r === 'number' ? r : Math.max(r(0), r(.5), r(1));
    const tubular = o.segs ?? Math.max(6, pts.length * 4), radial = segsFor(rMax * 1.3, o.seg ?? 6, 3), r0 = typeof r === 'number' ? r : 1;
    const g = new THREE.TubeGeometry(curve, tubular, r0, radial, false);
    if (typeof r !== 'number') {
      const pos = g.attributes.position, c = new THREE.Vector3();
      for (let i = 0; i <= tubular; i++) {
        curve.getPointAt(i / tubular, c);
        const k = r(i / tubular);
        for (let j = 0; j <= radial; j++) {
          const v = i * (radial + 1) + j;
          pos.setXYZ(v, c.x + (pos.getX(v) - c.x) * k, c.y + (pos.getY(v) - c.y) * k, c.z + (pos.getZ(v) - c.z) * k);
        }
      }
      g.computeVertexNormals();
    }
    this.add(slot, g, { tint: o.tint, fade: o.fade });
    if (o.closed !== false) {
      const end = (t: number, rad: number) => this.ball(slot, curve.getPointAt(t).toArray() as unknown as V3, rad, { seg: radial, tint: o.tint });
      end(0, typeof r === 'number' ? r : r(0)); end(1, typeof r === 'number' ? r : r(1));
    }
    return this;
  }

  /** A torus, or part of one (`arc` radians), lying in its XY plane before rotation. */
  ring(slot: string, R: number, r: number, o: PieceOpts & { arc?: number } = {}): this {
    return this.add(slot, new THREE.TorusGeometry(R, r, o.seg ?? 6, Math.max(8, Math.round(24 * (o.arc ?? Math.PI * 2) / (Math.PI * 2))), o.arc ?? Math.PI * 2), o);
  }

  /** A flat outline (XY) extruded `depth` along z (centred), with bevelled edges. */
  plate(slot: string, outline: readonly V2[], depth: number, o: PieceOpts & { bevel?: number } = {}): this {
    const sh = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y))), b = o.bevel ?? depth * .4;
    const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(1e-4, depth - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b * .8, bevelSegments: 1, curveSegments: 4 });
    g.translate(0, 0, -(depth - 2 * b) / 2);
    return this.add(slot, g, o);
  }

  /** A flat, two-sided outline (XY): membranes and cloth. Use a DoubleSide material. */
  sheet(slot: string, outline: readonly V2[], o: PieceOpts = {}): this {
    return this.add(slot, new THREE.ShapeGeometry(new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y))), 4), o);
  }

  /** Merges each slot's pieces into one geometry. */
  build(): Record<string, THREE.BufferGeometry> {
    const out: Record<string, THREE.BufferGeometry> = {};
    for (const [slot, list] of this.parts) {
      const g = mergeGeometries(list);
      if (!g) throw new Error(`kit: cannot merge slot ${slot}`);
      list.forEach(x => x.dispose());
      g.computeBoundingSphere();
      out[slot] = g;
    }
    return out;
  }
}

/**
 * A slot's surface. Colour is baked into the part's vertex colours; the rest (with roughness and metalness rounded
 * to coarse steps) decides which material the slot shares, so a part needs one mesh per surface kind, not per colour.
 */
export interface Surf {
  color: number; rough: number; metal?: number; side?: THREE.Side; emissive?: number; envI?: number; rim?: boolean; shadow?: boolean;
  /** A detail texture multiplied over the baked colours (wood grain, stone blocks, plaster, shingles). */
  tex?: 'wood' | 'wall' | 'plaster' | 'roof';
  /** Instanced scenery that fades out (dithered) when the hero walks behind it: houses and trees. */
  fade?: boolean;
  /** Emissive intensity (lit windows). */
  glow?: number;
}

const step = (v: number, s: number): number => Math.round(v / s) * s;

/**
 * One model instance's materials: slot name → surface, and the white-based material per surface kind, created as
 * parts need them. `mats` is live: materials added later (a weapon swapped in) appear in it.
 */
export class Skin {
  readonly mats: THREE.MeshStandardMaterial[] = [];
  private readonly byKey = new Map<string, THREE.MeshStandardMaterial>();
  /** `boxR`: default edge rounding of boxes in parts built for this skin (scenery uses sharp boxes). */
  constructor(readonly surf: Record<string, Surf>, readonly boxR = .015) {}

  key(slot: string): string {
    const s = this.surf[slot];
    if (!s) throw new Error(`kit: no surface for slot ${slot}`);
    return [step(s.rough, .25), step(s.metal ?? 0, .5), s.side ?? THREE.FrontSide, s.emissive ?? 0, s.envI ? 1 : 0, s.rim ?? true, s.shadow ?? true, s.tex ?? '', s.fade ?? false, s.glow ?? 1].join('|');
  }

  material(key: string, from: Surf): THREE.MeshStandardMaterial {
    let m = this.byKey.get(key);
    if (!m) {
      m = charMat(0xffffff, step(from.rough, .25), { metal: step(from.metal ?? 0, .5), side: from.side, emissive: from.emissive, envI: from.envI, rim: from.rim && !from.fade });
      if (from.tex) { m.map = TEX[from.tex]; m.bumpMap = TEX[from.tex]; m.bumpScale = .8; }
      if (from.fade) applyFade(m, .8);
      if (from.glow) m.emissiveIntensity = from.glow;
      this.byKey.set(key, m); this.mats.push(m);
    }
    return m;
  }
}

/** Merged geometry per part key and surface kind; shared by every instance of a model and never disposed. */
const CACHE = new Map<string, { key: string; geo: THREE.BufferGeometry; surf: Surf }[]>();

/**
 * Adds the part `key` under `group`, building it with `make` on first use: slot colours are baked into the vertex
 * colours and slots of the same surface kind merged, one mesh each. Instances sharing `key` must share colours.
 */
export function part(group: THREE.Object3D, key: string, make: (k: Kit) => void, skin: Skin): void {
  for (const b of merged(key, make, skin)) {
    const m = new THREE.Mesh(b.geo, skin.material(b.key, b.surf));
    m.castShadow = b.surf.shadow ?? true; m.receiveShadow = true;
    group.add(m);
  }
}

/** The cached, merged geometry of part `key`, one entry per surface kind (for instancing and static merging). */
export function merged(key: string, make: (k: Kit) => void, skin: Skin): readonly { key: string; geo: THREE.BufferGeometry; surf: Surf }[] {
  let built = CACHE.get(key);
  if (!built) {
    const k = new Kit(skin.boxR); make(k);
    const bySurf = new Map<string, { geos: THREE.BufferGeometry[]; surf: Surf }>();
    for (const [slot, g] of Object.entries(k.build())) {
      const surf = skin.surf[slot], sk = skin.key(slot), c = new THREE.Color(surf.color), col = g.attributes.color;
      for (let i = 0; i < col.count; i++) col.setXYZ(i, col.getX(i) * c.r, col.getY(i) * c.g, col.getZ(i) * c.b);
      let e = bySurf.get(sk);
      if (!e) { e = { geos: [], surf }; bySurf.set(sk, e); }
      e.geos.push(g);
    }
    built = [...bySurf].map(([sk, e]) => {
      const geo = e.geos.length > 1 ? mergeGeometries(e.geos)! : e.geos[0];
      if (e.geos.length > 1) e.geos.forEach(g => g.dispose());
      geo.computeBoundingSphere();
      return { key: sk, geo, surf: e.surf };
    });
    CACHE.set(key, built);
  }
  return built;
}
export interface MatOpts { metal?: number; side?: THREE.Side; emissive?: number; rim?: boolean; envI?: number }

/**
 * A character material: vertex-coloured (baked shading), rim-lit, and for metals a reflection of the warm
 * dungeon light (a small procedural environment) so armour and blades shine.
 */
export function charMat(color: number, roughness: number, o: MatOpts = {}): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: o.metal ?? 0, vertexColors: true, side: o.side ?? THREE.FrontSide });
  if (o.emissive) m.emissive.setHex(o.emissive);
  if ((o.metal ?? 0) >= .3 || o.envI) { m.envMap = pmrem(); m.envMapIntensity = o.envI ?? .9; }
  return o.rim === false ? m : rimLit(m);
}
