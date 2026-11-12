import { Heap } from '../core/heap';
import { pick, ri } from '../core/math';
import type { Axis, Room, Layout } from '../game/types';

/** Rooms + A*-carved corridors; the stairs room (farthest from start) is reachable only through one locked door. */
export function generateLayout(): Layout {
  const W = 46, H = 46, N = W * H;
  for (let attempt = 0; attempt < 200; attempt++) {
    const tiles = new Uint8Array(N), roomId = new Int16Array(N).fill(-1), ring = new Uint8Array(N), rooms: Room[] = [];
    for (let i = 0; i < 600 && rooms.length < 8; i++) {
      const w = ri(4, 7), h = ri(4, 6), x = ri(2, W - w - 3), y = ri(2, H - h - 3);
      if (rooms.some(r => x < r.x + r.w + 3 && x + w + 3 > r.x && y < r.y + r.h + 3 && y + h + 3 > r.y)) continue;
      rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1), id: rooms.length, visited: false });
    }
    if (rooms.length < 6) continue;
    for (const r of rooms) for (let z = r.y; z < r.y + r.h; z++) for (let x = r.x; x < r.x + r.w; x++) { tiles[z * W + x] = 1; roomId[z * W + x] = r.id; }
    for (const r of rooms) for (let z = r.y - 1; z <= r.y + r.h; z++) for (let x = r.x - 1; x <= r.x + r.w; x++) if (roomId[z * W + x] < 0) ring[z * W + x] = 1;
    const start = pick(rooms);
    let stairs: Room | null = null, best = -1;
    for (const r of rooms) { if (r === start) continue; const d = Math.hypot(r.cx - start.cx, r.cy - start.cy); if (d > best) { best = d; stairs = r; } }
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
    const others = rooms.filter(r => r !== stairs), inT = [start], edges: [Room, Room][] = [];
    while (inT.length < others.length) {
      let bd = 1e9, ba: Room | null = null, bb: Room | null = null;
      for (const a of inT) for (const b of others) { if (inT.includes(b)) continue; const d = Math.hypot(a.cx - b.cx, a.cy - b.cy); if (d < bd) { bd = d; ba = a; bb = b; } }
      edges.push([ba!, bb!]); inT.push(bb!);
    }
    for (let k = 0; k < 3; k++) { const a = pick(others), b = pick(others); if (a !== b && Math.hypot(a.cx - b.cx, a.cy - b.cy) < 18 && !edges.some(e => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a))) edges.push([a, b]); }
    let fail = false;
    for (const [a, b] of edges) { const p = carve(a.cx, a.cy, b.cx, b.cy, forbid); if (!p) { fail = true; break; } for (const c of p) if (tiles[c] === 0) tiles[c] = 2; }
    if (fail) continue;
    let target: Room | null = null, bd = 1e9;
    for (const r of others) { const d = Math.hypot(r.cx - stairs.cx, r.cy - stairs.cy); if (d < bd) { bd = d; target = r; } }
    if (!target) continue;
    const dx = target.cx - stairs.cx, dy = target.cy - stairs.cy; let door: [number, number], beyond: [number, number], axis: Axis;
    if (Math.abs(dx) >= Math.abs(dy)) { axis = 'x'; door = dx > 0 ? [stairs.x + stairs.w, stairs.cy] : [stairs.x - 1, stairs.cy]; beyond = [door[0] + (dx > 0 ? 1 : -1), door[1]]; }
    else { axis = 'z'; door = dy > 0 ? [stairs.cx, stairs.y + stairs.h] : [stairs.cx, stairs.y - 1]; beyond = [door[0], door[1] + (dy > 0 ? 1 : -1)]; }
    if (beyond[0] < 1 || beyond[1] < 1 || beyond[0] >= W - 1 || beyond[1] >= H - 1) continue;
    const p = carve(beyond[0], beyond[1], target.cx, target.cy, forbid); if (!p) continue;
    for (const c of p) if (tiles[c] === 0) tiles[c] = 2;
    const di = door[1] * W + door[0]; tiles[di] = 4;
    return { W, H, N, tiles, roomId, rooms, startRoom: start, stairsRoom: stairs, lockedCell: { tx: door[0], tz: door[1], axis } };
  }
  throw new Error('dungeon generation failed');
}
