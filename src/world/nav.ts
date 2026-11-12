import { Heap } from '../core/heap';
import { clamp } from '../core/math';
import { G } from '../game/state';
import { DX8, DZ8, T } from './consts';

export const tileAt = (tx: number, tz: number): number => (tx < 0 || tz < 0 || tx >= G.L.W || tz >= G.L.H) ? 0 : G.L.tiles[tz * G.L.W + tx];
export const solidFor = (t: number, isHero: boolean): boolean => t === 0 || t === 4 || t === 5 || (t === 6 && !isHero);
/** Walkable for pathing (floor, corridor, open door, stairs) and not blocked by a prop. */
export const navOK = (i: number): boolean => { const t = G.L.tiles[i]; return (t === 1 || t === 2 || t === 3 || t === 6) && !G.L.navBlock[i]; };
export function circleBlocked(x: number, z: number, r: number, isHero: boolean): boolean {
  const tx0 = Math.round((x - r) / T), tx1 = Math.round((x + r) / T), tz0 = Math.round((z - r) / T), tz1 = Math.round((z + r) / T);
  for (let tz = tz0; tz <= tz1; tz++) for (let tx = tx0; tx <= tx1; tx++) {
    if (solidFor(tileAt(tx, tz), isHero)) { const cx = clamp(x, tx * T - 1, tx * T + 1), cz = clamp(z, tz * T - 1, tz * T + 1); if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return true; }
    if (tx >= 0 && tz >= 0 && tx < G.L.W && tz < G.L.H) { const p = G.L.propAt[tz * G.L.W + tx]; if (p && (x - p.x) ** 2 + (z - p.z) ** 2 < (r + p.r) ** 2) return true; }
  }
  return false;
}
/** Sweeps a circle of radius `r` from a to b in 0.35-unit steps. */
export function clearLine(ax: number, az: number, bx: number, bz: number, r: number, isHero = true): boolean {
  const dx = bx - ax, dz = bz - az, n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .35));
  for (let k = 0; k <= n; k++) { const t = k / n; if (circleBlocked(ax + dx * t, az + dz * t, r, isHero)) return false; }
  return true;
}
const fieldHeap = new Heap();
/** Dijkstra distance field from the hero over the 8-neighbourhood (traps cost +5). */
export function computeField(): void {
  const { W, H, dist, trap } = G.L; dist.fill(Infinity);
  const sx = clamp(Math.round(G.hero.x / T), 0, W - 1), sz = clamp(Math.round(G.hero.z / T), 0, H - 1), s = sz * W + sx;
  dist[s] = 0; fieldHeap.clear(); fieldHeap.push(s, 0);
  while (fieldHeap.size) {
    const pr = fieldHeap.p[0], c = fieldHeap.pop(); if (pr > dist[c]) continue;
    const cx = c % W, cz = (c / W) | 0;
    for (let k = 0; k < 8; k++) {
      const dx = DX8[k], dz = DZ8[k], nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
      const n = nz * W + nx; if (!navOK(n)) continue;
      if (dx && dz && (!navOK(cz * W + nx) || !navOK(nz * W + cx))) continue;
      const nd = dist[c] + (dx && dz ? 1.414 : 1) + (trap[n] >= 0 ? 5 : 0);
      if (nd < dist[n]) { dist[n] = nd; fieldHeap.push(n, nd); }
    }
  }
}
export function fieldAt(x: number, z: number): number {
  const tx = Math.round(x / T), tz = Math.round(z / T); if (tx < 0 || tz < 0 || tx >= G.L.W || tz >= G.L.H) return Infinity;
  let d = G.L.dist[tz * G.L.W + tx]; if (d < Infinity) return d;
  for (let k = 0; k < 8; k++) { const nx = tx + DX8[k], nz = tz + DZ8[k]; if (nx < 0 || nz < 0 || nx >= G.L.W || nz >= G.L.H) continue; d = Math.min(d, G.L.dist[nz * G.L.W + nx] + 1); }
  return d;
}
export function buildPath(tx: number, tz: number): { x: number; z: number }[] | null {
  const { W, H, dist } = G.L; if (tx < 0 || tz < 0 || tx >= W || tz >= H) return null;
  let i = tz * W + tx;
  if (!(dist[i] < Infinity)) { let bi = -1, bd = Infinity; for (let k = 0; k < 8; k++) { const nx = tx + DX8[k], nz = tz + DZ8[k]; if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue; const n = nz * W + nx; if (dist[n] < bd) { bd = dist[n]; bi = n; } } if (bi < 0) return null; i = bi; }
  const pts: number[] = []; let guard = 0;
  while (dist[i] > 0 && guard++ < 500) {
    pts.push(i); const cx = i % W, cz = (i / W) | 0; let bi = -1, bd = dist[i];
    for (let k = 0; k < 8; k++) {
      const dx = DX8[k], dz = DZ8[k], nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
      const n = nz * W + nx; if (dx && dz && (!navOK(cz * W + nx) || !navOK(nz * W + cx))) continue;
      if (dist[n] < bd) { bd = dist[n]; bi = n; }
    }
    if (bi < 0) break; i = bi;
  }
  pts.reverse(); return pts.map(j => ({ x: (j % W) * T, z: Math.floor(j / W) * T }));
}
