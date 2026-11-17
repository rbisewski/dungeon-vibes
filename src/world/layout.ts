/**
 * Dungeon layouts (SPEC §12.3): rooms of mixed styles and sizes, joined by A*-carved corridors (some of them two tiles
 * wide). The stairs room, farthest from the start, is reachable only through one locked door. Everything draws from
 * the level's seeded stream (`R`).
 */
import { Heap } from '../core/heap';
import { R, pick, ri } from '../core/math';
import type { Axis, Layout, Room, RoomShape } from '../game/types';

/** Map size in tiles. */
export const MAP = 52;

/**
 * How often each room style appears at `depth` [OURS]: plain rooms are the most common everywhere; big pillared halls
 * and caves grow more common deeper (up to depth 16).
 */
export function shapeWeights(depth: number): Record<RoomShape, number> {
  const d = Math.min(Math.max(depth, 1), 16);
  return { room: 30, cell: 12, gallery: 10, lshape: 12, cross: 8, octagon: 8, hall: 6 + d * .75, cave: 3 + d * 1.25 };
}

/** Styles that make a good stairs (and boss) room: open, roughly square, with a full middle row and column. */
const ARENA: Record<RoomShape, boolean> = { room: true, hall: true, octagon: true, cell: false, gallery: false, lshape: false, cross: false, cave: false };

interface Mask { w: number; h: number; m: Uint8Array }

const rect = (w: number, h: number): Mask => ({ w, h, m: new Uint8Array(w * h).fill(1) });

/** A rectangle with one corner quadrant removed, leaving two arms 3–4 tiles thick. */
function lShape(): Mask {
  const k = rect(ri(6, 9), ri(6, 8)), aw = ri(3, 4), ah = ri(3, 4), corner = ri(0, 3);
  const x0 = corner & 1 ? 0 : aw, y0 = corner & 2 ? 0 : ah, x1 = corner & 1 ? k.w - aw : k.w, y1 = corner & 2 ? k.h - ah : k.h;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) k.m[y * k.w + x] = 0;
  return k;
}

/** Two crossing bars, 3 tiles thick. */
function cross(): Mask {
  const w = ri(7, 9), h = ri(7, 9), m = new Uint8Array(w * h), bx = (w - 3) >> 1, by = (h - 3) >> 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x >= bx && x < bx + 3) || (y >= by && y < by + 3)) m[y * w + x] = 1;
  return { w, h, m };
}

/** A square with its corners cut diagonally. */
function octagon(): Mask {
  const s = ri(6, 9), k = rect(s, s), c = s >= 8 ? 3 : 2;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const ex = Math.min(x, s - 1 - x), ey = Math.min(y, s - 1 - y);
    if (ex + ey < c) k.m[y * s + x] = 0;
  }
  return k;
}

/**
 * A natural cave (after D1's Caves): random fill inside an ellipse with a solid core, smoothed by a cellular
 * automaton, keeping the largest 4-connected part. Null if that part is too small.
 */
function cave(): Mask | null {
  const w = ri(8, 12), h = ri(7, 10), m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // squared distance from the middle, 1 on the ellipse filling the box
    const e = ((x + .5 - w / 2) / (w / 2)) ** 2 + ((y + .5 - h / 2) / (h / 2)) ** 2;
    m[y * w + x] = e < .2 || (e <= 1 && R() < .57) ? 1 : 0;
  }
  for (let it = 0; it < 3; it++) {
    const prev = m.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h) n += prev[yy * w + xx]; }
      m[y * w + x] = n >= 5 || (prev[y * w + x] && n >= 4) ? 1 : 0;
    }
  }
  // keep the largest 4-connected part
  const comp = new Int16Array(w * h).fill(-1);
  let best = -1, bestN = 0;
  for (let s = 0; s < w * h; s++) {
    if (!m[s] || comp[s] >= 0) continue;
    const id = s, stack = [s]; comp[s] = id; let n = 0;
    while (stack.length) {
      const c = stack.pop()!, x = c % w, y = (c / w) | 0; n++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy, j = yy * w + xx; if (xx >= 0 && yy >= 0 && xx < w && yy < h && m[j] && comp[j] < 0) { comp[j] = id; stack.push(j); } }
    }
    if (n > bestN) { bestN = n; best = id; }
  }
  if (bestN < 16) return null;
  for (let s = 0; s < w * h; s++) if (comp[s] !== best) m[s] = 0;
  return { w, h, m };
}

function shapeMask(shape: RoomShape): Mask {
  switch (shape) {
    case 'room': return rect(ri(4, 7), ri(4, 6));
    case 'cell': return rect(ri(3, 4), ri(3, 4));
    case 'gallery': { const a = ri(10, 13), b = ri(3, 4); return R() < .5 ? rect(a, b) : rect(b, a); }
    case 'hall': { const a = ri(8, 11), b = ri(6, 8); return R() < .5 ? rect(a, b) : rect(b, a); }
    case 'lshape': return lShape();
    case 'cross': return cross();
    case 'octagon': return octagon();
    case 'cave': return cave() ?? octagon();
  }
}

function pickShape(depth: number): RoomShape {
  const w = shapeWeights(depth), keys = Object.keys(w) as RoomShape[];
  let r = R() * keys.reduce((s, k) => s + w[k], 0);
  for (const k of keys) { r -= w[k]; if (r < 0) return k; }
  return 'room';
}

/** Rooms of mixed styles + A*-carved corridors; the stairs room (farthest from start) is reachable only through one locked door. */
export function generateLayout(depth: number): Layout {
  const W = MAP, H = MAP, N = W * H;
  for (let attempt = 0; attempt < 200; attempt++) {
    const tiles = new Uint8Array(N), roomId = new Int16Array(N).fill(-1), ring = new Uint8Array(N), rooms: Room[] = [];
    const want = ri(7, 10);
    for (let i = 0; i < 900 && rooms.length < want; i++) {
      // the first room is always one a boss can fight in, so every level has a stairs room
      const shape = rooms.length ? pickShape(depth) : pick<RoomShape>(['room', 'hall', 'octagon']);
      const k = shapeMask(shape);
      if (shape === 'room' && !rooms.length && (k.w < 5 || k.h < 5)) continue;
      const x = ri(2, W - k.w - 3), y = ri(2, H - k.h - 3);
      if (rooms.some(r => x < r.x + r.w + 3 && x + k.w + 3 > r.x && y < r.y + r.h + 3 && y + k.h + 3 > r.y)) continue;
      const cells: number[] = [];
      for (let yy = 0; yy < k.h; yy++) for (let xx = 0; xx < k.w; xx++) if (k.m[yy * k.w + xx]) cells.push((y + yy) * W + x + xx);
      // the centre: the room's floor cell nearest the middle of its box
      const mx = x + (k.w - 1) / 2, my = y + (k.h - 1) / 2;
      const c = cells.reduce((a, b) => (Math.hypot(b % W - mx, ((b / W) | 0) - my) < Math.hypot(a % W - mx, ((a / W) | 0) - my) ? b : a));
      rooms.push({ x, y, w: k.w, h: k.h, cx: c % W, cy: (c / W) | 0, id: rooms.length, visited: false, shape, cells });
    }
    if (rooms.length < 6) continue;
    for (const r of rooms) for (const c of r.cells) { tiles[c] = 1; roomId[c] = r.id; }
    for (const r of rooms) for (const c of r.cells) {
      const x = c % W, z = (c / W) | 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const n = (z + dz) * W + x + dx; if (roomId[n] < 0) ring[n] = 1; }
    }
    // the start can be any room but a cell (it needs space for the up stairs); the stairs room is the farthest arena room
    const start = pick(rooms.filter(r => r.shape !== 'cell'));
    let stairs: Room | null = null, best = -1;
    for (const r of rooms) { if (r === start || !ARENA[r.shape] || r.w < 5 || r.h < 5) continue; const d = Math.hypot(r.cx - start.cx, r.cy - start.cy); if (d > best) { best = d; stairs = r; } }
    if (!stairs) continue;
    const cost = (i: number): number => { const t = tiles[i]; if (t === 1) return 1.6; if (t === 2) return .45; if (ring[i]) return 4; return 1; };
    const DX = [1, -1, 0, 0], DY = [0, 0, 1, -1];
    const carve = (ax: number, ay: number, bx: number, by: number, forbid: Uint8Array): number[] | null => {
      const g = new Float32Array(N * 4).fill(1e9), from = new Int32Array(N * 4).fill(-1), hp = new Heap();
      const s0 = ay * W + ax, goal = by * W + bx;
      for (let d = 0; d < 4; d++) { g[s0 * 4 + d] = 0; hp.push(s0 * 4 + d, 0); }
      let end = -1;
      while (hp.size) {
        const s = hp.pop(), c = s >> 2, d = s & 3; if (c === goal) { end = s; break; }
        const cx = c % W, cy = (c / W) | 0, gs = g[s];
        for (let nd = 0; nd < 4; nd++) {
          const nx = cx + DX[nd], ny = cy + DY[nd]; if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;
          const n = ny * W + nx; if (forbid[n]) continue;
          const ng = gs + cost(n) + (nd !== d ? 2.5 : 0), ns = n * 4 + nd;
          if (ng < g[ns]) { g[ns] = ng; from[ns] = s; hp.push(ns, ng + Math.abs(nx - bx) + Math.abs(ny - by)); }
        }
      }
      if (end < 0) return null;
      const cells: number[] = []; for (let s = end; s !== -1; s = from[s]) cells.push(s >> 2); return cells;
    };
    const forbid = new Uint8Array(N);
    for (let z = stairs.y - 1; z <= stairs.y + stairs.h; z++) for (let x = stairs.x - 1; x <= stairs.x + stairs.w; x++) forbid[z * W + x] = 1;
    /** Carves a corridor; a wide one (D1's halls) also takes the cell beside each step, on the same side throughout. */
    const dig = (p: number[], wide: boolean): void => {
      for (let k = 0; k < p.length; k++) {
        const c = p[k]; if (tiles[c] === 0) tiles[c] = 2;
        if (!wide) continue;
        const n = p[k + 1] ?? p[k - 1], along = Math.abs(n - c) === 1;
        const side = along ? c + W : c + 1, sx = side % W, sz = (side / W) | 0;
        if (sx >= 1 && sz >= 1 && sx < W - 1 && sz < H - 1 && !forbid[side] && tiles[side] === 0) tiles[side] = 2;
      }
    };
    const others = rooms.filter(r => r !== stairs), inT = [start], edges: [Room, Room][] = [];
    while (inT.length < others.length) {
      let bd = 1e9, ba: Room | null = null, bb: Room | null = null;
      for (const a of inT) for (const b of others) { if (inT.includes(b)) continue; const d = Math.hypot(a.cx - b.cx, a.cy - b.cy); if (d < bd) { bd = d; ba = a; bb = b; } }
      edges.push([ba!, bb!]); inT.push(bb!);
    }
    for (let k = 0; k < 3; k++) { const a = pick(others), b = pick(others); if (a !== b && Math.hypot(a.cx - b.cx, a.cy - b.cy) < 20 && !edges.some(e => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a))) edges.push([a, b]); }
    let fail = false;
    for (const [a, b] of edges) { const p = carve(a.cx, a.cy, b.cx, b.cy, forbid); if (!p) { fail = true; break; } dig(p, R() < .35); }
    if (fail) continue;
    let target: Room | null = null, bd = 1e9;
    for (const r of others) { const d = Math.hypot(r.cx - stairs.cx, r.cy - stairs.cy); if (d < bd) { bd = d; target = r; } }
    if (!target) continue;
    const dx = target.cx - stairs.cx, dy = target.cy - stairs.cy; let door: [number, number], beyond: [number, number], axis: Axis;
    if (Math.abs(dx) >= Math.abs(dy)) { axis = 'x'; door = dx > 0 ? [stairs.x + stairs.w, stairs.cy] : [stairs.x - 1, stairs.cy]; beyond = [door[0] + (dx > 0 ? 1 : -1), door[1]]; }
    else { axis = 'z'; door = dy > 0 ? [stairs.cx, stairs.y + stairs.h] : [stairs.cx, stairs.y - 1]; beyond = [door[0], door[1] + (dy > 0 ? 1 : -1)]; }
    if (beyond[0] < 1 || beyond[1] < 1 || beyond[0] >= W - 1 || beyond[1] >= H - 1) continue;
    const p = carve(beyond[0], beyond[1], target.cx, target.cy, forbid); if (!p) continue;
    dig(p, false);
    const di = door[1] * W + door[0]; tiles[di] = 4;
    return { W, H, N, tiles, roomId, rooms, startRoom: start, stairsRoom: stairs, lockedCell: { tx: door[0], tz: door[1], axis } };
  }
  throw new Error('dungeon generation failed');
}
