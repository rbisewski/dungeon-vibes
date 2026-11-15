/**
 * Procedural pixel-art painter (SPEC §10.3). Shapes are filled with a material's colour ramp; each pixel's tone comes
 * from lighting the shape's surface normal from the upper left, so blades, domes and cylinders read as volumes. Tones
 * are whole steps of the ramp (no blending), which keeps the result crisp pixel art.
 */
import { mkC } from '../render/canvas';
import type { PixImage } from '../ui/pixel/pixArt';

/** A material's colours, darkest to lightest. Shadows lean cool, highlights warm. */
export type Ramp = readonly string[];

export const R = {
  steel: ['#1c2030', '#394256', '#5c6a80', '#8c9aae', '#c2cdd8', '#f4f8fa'],
  iron: ['#13151d', '#262a38', '#3d4556', '#5a6478', '#8690a2', '#bcc5ce'],
  gold: ['#3a2006', '#74460e', '#b07618', '#dea82e', '#f8d660', '#fff8c0'],
  bronze: ['#2a1408', '#583010', '#88521c', '#b47a32', '#d8a658', '#f6d89a'],
  wood: ['#22110a', '#452511', '#693c1a', '#8e5a29', '#b27c40', '#d6a868'],
  woodDark: ['#140a07', '#29150d', '#422315', '#5c3420', '#7a4b2e', '#9c6a46'],
  woodLight: ['#38230f', '#6a4620', '#996d34', '#c2964e', '#e0c078', '#f5e2aa'],
  leather: ['#1e0e09', '#3c1e11', '#61341c', '#86502b', '#aa7141', '#cf9c64'],
  leatherDark: ['#110907', '#24130d', '#3b2116', '#553120', '#72452e', '#926144'],
  linen: ['#282017', '#4c3d2d', '#756048', '#9d8767', '#c4b08d', '#e6d8b8'],
  grey: ['#151519', '#2b2c36', '#464957', '#656a7a', '#8b919f', '#b8bec8'],
  red: ['#28080c', '#541017', '#851b21', '#b22f2f', '#d8544a', '#f39078'],
  blue: ['#0b112e', '#172356', '#253b88', '#3c5cb8', '#668ade', '#a2c0f6'],
  green: ['#091c11', '#13381d', '#21582b', '#347e3c', '#5aaa5a', '#96d48c'],
  purple: ['#180b28', '#30154c', '#4c2376', '#7038a4', '#9a5aca', '#c890ea'],
  brown: ['#1a100a', '#352114', '#553722', '#775034', '#9a6f4c', '#bf9670'],
  bone: ['#2c251b', '#584b37', '#89775a', '#b8a682', '#ddd0b0', '#f8f1da'],
  paper: ['#382915', '#6c552f', '#9f854f', '#ccb47a', '#e9d9a8', '#fcf4d6'],
  stone: ['#1b1919', '#373533', '#57534f', '#7b7771', '#a4a098', '#cdc9bf'],
  skin: ['#381b13', '#6c3925', '#9f5b3b', '#cb8357', '#ebb082', '#ffdab4'],
  glass: ['#16242a', '#2a4248', '#48686e', '#76999c', '#b2d0d0', '#effafa'],
  ruby: ['#28040b', '#5c0a17', '#981423', '#d42b34', '#f66c5e', '#ffc8b4'],
  sapphire: ['#050b32', '#0d1d68', '#1b39a6', '#3464dc', '#6e9ef6', '#c4deff'],
  emerald: ['#031e0d', '#09481d', '#13782f', '#2cac48', '#6ada7a', '#c4fac8'],
  amethyst: ['#1c0632', '#3c0f66', '#6420a0', '#9440d0', '#c07cf0', '#ecccff'],
  topaz: ['#3a2404', '#7a5008', '#bc8810', '#eabc24', '#fce064', '#fffac8'],
  amber: ['#3a1204', '#7c2c08', '#c0500e', '#ee8420', '#fcb850', '#ffe8b0'],
  fire: ['#560b04', '#9e1f09', '#e0480f', '#ff8a1c', '#ffca42', '#fff6b6'],
  bolt: ['#0f1a58', '#1f3ea6', '#3f6fe0', '#78a8ff', '#bad9ff', '#ffffff'],
  holy: ['#584820', '#a08a40', '#d8c070', '#f5e5a2', '#fff9dc', '#ffffff'],
} as const satisfies Record<string, Ramp>;

export interface Shade {
  /** A fixed tone instead of lighting. */
  flat?: number;
  /** Tone offset after lighting, and the range the tone is kept in. */
  add?: number; lo?: number; hi?: number;
  /** Strength of the specular highlight (metal, glass, gems). */
  spec?: number;
  /** Darkens pixels already drawn that touch the new shape, so overlapping parts read as separate. */
  ink?: boolean;
}

export const METAL: Shade = { spec: 1 };
export const GEM: Shade = { spec: 1.6 };

/** Surface normal's x and y at a pixel centre (z is implied, toward the viewer), or null outside the shape. */
type NormalAt = (x: number, y: number) => readonly [number, number] | null;
export type Pt = readonly [number, number];

// Light from the upper left, a little toward the viewer; H is the half vector with the view direction.
const LX = -.512, LY = -.652, LZ = .559, HX = -.29, HY = -.369, HZ = .883;

function litTone(nx: number, ny: number, len: number, o: Shade): number {
  const l2 = nx * nx + ny * ny;
  if (l2 > 1) { const s = 1 / Math.sqrt(l2); nx *= s; ny *= s; }
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  let b = .16 + .84 * Math.max(0, nx * LX + ny * LY + nz * LZ);
  if (o.spec) b += o.spec * Math.max(0, nx * HX + ny * HY + nz * HZ) ** 28 * .5;
  return Math.max(o.lo ?? 0, Math.min(o.hi ?? len - 1, len - 1, Math.round(b * (len - 1)) + (o.add ?? 0)));
}

const INK = new Map<Ramp, string>();
/** Outline colour for a material: its darkest tone pulled halfway to near-black, so outlines keep a hint of hue. */
function inkOf(r: Ramp): string {
  let c = INK.get(r);
  if (!c) {
    const v = parseInt(r[0].slice(1), 16);
    c = `rgb(${((v >> 16) + 8) >> 1},${(((v >> 8) & 255) + 5) >> 1},${((v & 255) + 6) >> 1})`;
    INK.set(r, c);
  }
  return c;
}

export class Painter {
  private readonly ramp: (Ramp | null)[];
  private readonly tone: Uint8Array;
  constructor(readonly w: number, readonly h: number) { this.ramp = new Array<Ramp | null>(w * h).fill(null); this.tone = new Uint8Array(w * h); }

  private idx(x: number, y: number): number { return x >= 0 && y >= 0 && x < this.w && y < this.h ? y * this.w + x : -1; }
  has(x: number, y: number): boolean { const i = this.idx(x, y); return i >= 0 && this.ramp[i] !== null; }
  rampAt(x: number, y: number): Ramp | null { const i = this.idx(x, y); return i < 0 ? null : this.ramp[i]; }

  /** Sets one pixel (coordinates are rounded down). */
  set(x: number, y: number, ramp: Ramp, tone: number): void {
    const i = this.idx(Math.floor(x), Math.floor(y));
    if (i >= 0) { this.ramp[i] = ramp; this.tone[i] = Math.max(0, Math.min(ramp.length - 1, Math.round(tone))); }
  }
  clear(x: number, y: number): void { const i = this.idx(Math.floor(x), Math.floor(y)); if (i >= 0) this.ramp[i] = null; }
  /** Shifts the tone of a pixel already drawn. */
  nudge(x: number, y: number, d: number): void {
    const i = this.idx(Math.floor(x), Math.floor(y)), r = i >= 0 ? this.ramp[i] : null;
    if (r) this.tone[i] = Math.max(0, Math.min(r.length - 1, this.tone[i] + d));
  }

  /** Fills every pixel in the box whose centre is inside the shape, lit by the shape's normal there. */
  shape(x0: number, y0: number, x1: number, y1: number, at: NormalAt, ramp: Ramp, o: Shade = {}): void {
    const ax = Math.max(0, Math.floor(x0)), ay = Math.max(0, Math.floor(y0)), bx = Math.min(this.w - 1, Math.ceil(x1)), by = Math.min(this.h - 1, Math.ceil(y1));
    const drawn: number[] = [];
    for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) {
      const n = at(x + .5, y + .5);
      if (!n) continue;
      const i = y * this.w + x;
      this.ramp[i] = ramp; this.tone[i] = o.flat ?? litTone(n[0], n[1], ramp.length, o);
      if (o.ink) drawn.push(i);
    }
    if (o.ink) this.inkAround(drawn);
  }

  private inkAround(drawn: number[]): void {
    const inShape = new Set(drawn), done = new Set<number>();
    for (const i of drawn) {
      const x = i % this.w, y = (i - x) / this.w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = this.idx(x + dx, y + dy);
        if (j < 0 || inShape.has(j) || done.has(j) || !this.ramp[j]) continue;
        done.add(j);
        // the side in the new shape's shadow (below, right) gets the darker line
        this.tone[j] = Math.max(0, Math.min(this.tone[j], dx > 0 || dy > 0 ? 0 : 1));
      }
    }
  }

  /** A ball or ellipsoid. `k` < 1 flattens the surface (a shallow dome). */
  ball(cx: number, cy: number, rx: number, ry: number, ramp: Ramp, o: Shade = {}, k = 1): void {
    this.shape(cx - rx, cy - ry, cx + rx, cy + ry, (x, y) => {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      return dx * dx + dy * dy <= 1 ? [dx * k, dy * k] : null;
    }, ramp, o);
  }

  /** A rod from (x0, y0) to (x1, y1), round in cross-section, tapering from radius r0 to r1. `square` cuts the ends flat. */
  rod(x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, ramp: Ramp, o: Shade = {}, square = false): void {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, rm = Math.max(r0, r1);
    this.shape(Math.min(x0, x1) - rm, Math.min(y0, y1) - rm, Math.max(x0, x1) + rm, Math.max(y0, y1) + rm, (x, y) => {
      const px = x - x0, py = y - y0, t = (px * ux + py * uy) / len;
      if (square && (t < 0 || t > 1)) return null;
      const tc = Math.max(0, Math.min(1, t)), r = r0 + (r1 - r0) * tc, qx = px - ux * len * tc, qy = py - uy * len * tc;
      return qx * qx + qy * qy <= r * r ? [qx / r, qy / r] : null;
    }, ramp, o);
  }

  /**
   * A flat polygon. `n` tilts the face (per pixel); `bevel` rounds the rim over that many pixels, so edges facing the
   * light brighten and those facing away darken.
   */
  poly(pts: readonly Pt[], ramp: Ramp, o: Shade & { bevel?: number; n?: (x: number, y: number) => readonly [number, number] } = {}): void {
    let area = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach(([ax, ay], i) => {
      const [bx, by] = pts[(i + 1) % pts.length];
      area += ax * by - bx * ay;
      x0 = Math.min(x0, ax); y0 = Math.min(y0, ay); x1 = Math.max(x1, ax); y1 = Math.max(y1, ay);
    });
    const out = area > 0 ? 1 : -1, bevel = o.bevel ?? 0;
    this.shape(x0, y0, x1, y1, (x, y) => {
      let inside = false, best = Infinity, ex = 0, ey = 0;
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay > y) !== (by > y) && x < ax + (y - ay) / (by - ay) * (bx - ax)) inside = !inside;
        if (!bevel) continue;
        const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
        const d = Math.hypot(x - ax - dx * t, y - ay - dy * t);
        if (d < best) { best = d; const l = Math.sqrt(l2); ex = dy / l * out; ey = -dx / l * out; }
      }
      if (!inside) return null;
      const base = o.n ? o.n(x, y) : [0, 0] as const;
      if (best >= bevel) return base;
      const k = (1 - best / bevel) * .85;
      return [base[0] + ex * k, base[1] + ey * k];
    }, ramp, o);
  }

  /** A 1 px line in a fixed tone. */
  line(x0: number, y0: number, x1: number, y1: number, ramp: Ramp, tone: number): void {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= n; k++) this.set(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, ramp, tone);
  }

  /** Retones pixels already drawn (optionally only those of one material): `fn` returns the new tone, or nothing to keep it. */
  tex(fn: (x: number, y: number, tone: number) => number | void, only?: Ramp): void {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = y * this.w + x, r = this.ramp[i];
      if (!r || (only && r !== only)) continue;
      const t = fn(x, y, this.tone[i]);
      if (t !== undefined) this.tone[i] = Math.max(0, Math.min(r.length - 1, Math.round(t)));
    }
  }

  /**
   * Retones the outermost pixel of `ramp` on one side of every row (`l`, `r`) or column (`t`, `b`) between `a0` and
   * `a1`: crisp highlights and shadows along an edge.
   */
  edge(side: 'l' | 'r' | 't' | 'b', ramp: Ramp, tone: number, a0 = 0, a1 = Infinity, depth = 1): void {
    const rows = side === 'l' || side === 'r', n = rows ? this.h : this.w, m = rows ? this.w : this.h, fwd = side === 'l' || side === 't';
    for (let a = Math.max(0, Math.floor(a0)); a <= Math.min(n - 1, a1); a++) {
      let left = depth;
      for (let k = 0; k < m && left > 0; k++) {
        const b = fwd ? k : m - 1 - k, x = rows ? b : a, y = rows ? a : b;
        if (this.ramp[y * this.w + x] === ramp) { this.tone[y * this.w + x] = tone; left--; } else if (left < depth) break;
      }
    }
  }

  /** Renders to a canvas with a 1 px outline (tinted by the material it borders, or `rim` for unique items). */
  finish(rim?: string): PixImage {
    const c = mkC(this.w, this.h), g = c.getContext('2d')!;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const r = this.ramp[y * this.w + x];
      if (r) { g.fillStyle = r[this.tone[y * this.w + x]]; g.fillRect(x, y, 1, 1); continue; }
      const nb = this.rampAt(x, y - 1) ?? this.rampAt(x - 1, y) ?? this.rampAt(x + 1, y) ?? this.rampAt(x, y + 1);
      if (nb) { g.fillStyle = rim ?? inkOf(nb); g.fillRect(x, y, 1, 1); }
    }
    return { canvas: c, src: c.toDataURL(), w: this.w, h: this.h };
  }
}
