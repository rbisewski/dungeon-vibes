import { clamp } from '../core/math';
import { G } from '../game/state';
import { T } from './consts';
import { solidFor, tileAt } from './nav';
import type { Actor } from '../game/types';

function collideWorld(a: Actor, isHero: boolean): void {
  const r = a.r, tx = Math.round(a.x / T), tz = Math.round(a.z / T);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const x = tx + dx, z = tz + dz;
    if (solidFor(tileAt(x, z), isHero)) {
      const minx = x * T - 1, maxx = x * T + 1, minz = z * T - 1, maxz = z * T + 1;
      const cx = clamp(a.x, minx, maxx), cz = clamp(a.z, minz, maxz), ox = a.x - cx, oz = a.z - cz, d2 = ox * ox + oz * oz;
      if (d2 < r * r) {
        if (d2 > 1e-8) { const d = Math.sqrt(d2), p = r - d; a.x += ox / d * p; a.z += oz / d * p; }
        else { const l = a.x - minx, rgt = maxx - a.x, u = a.z - minz, dn = maxz - a.z, mn = Math.min(l, rgt, u, dn); if (mn === l) a.x = minx - r; else if (mn === rgt) a.x = maxx + r; else if (mn === u) a.z = minz - r; else a.z = maxz + r; }
      }
    }
    if (x >= 0 && z >= 0 && x < G.L.W && z < G.L.H) { const p = G.L.propAt[z * G.L.W + x]; if (p) { const ox = a.x - p.x, oz = a.z - p.z, d = Math.hypot(ox, oz), mn = r + p.r; if (d < mn) { if (d > 1e-5) { a.x += ox / d * (mn - d); a.z += oz / d * (mn - d); } else a.x += mn; } } }
  }
}
const _actors: Actor[] = [];
/** Pairwise actor separation (mass-weighted) then wall/prop push-out, two iterations. */
export function resolveCollisions(): void {
  _actors.length = 0; if (!G.hero.dead && G.hero.descend <= 0) _actors.push(G.hero);
  for (const m of G.L.monsters) if (!m.dead) _actors.push(m);
  for (let it = 0; it < 2; it++) {
    for (let i = 0; i < _actors.length; i++) for (let j = i + 1; j < _actors.length; j++) {
      const a = _actors[i], b = _actors[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), mn = a.r + b.r;
      if (d < mn) { const nx = d > 1e-5 ? dx / d : 1, nz = d > 1e-5 ? dz / d : 0, p = mn - d, ma = a === G.hero ? 2.5 : a.mass, mb = b === G.hero ? 2.5 : b.mass, wa = mb / (ma + mb); a.x -= nx * p * wa; a.z -= nz * p * wa; b.x += nx * p * (1 - wa); b.z += nz * p * (1 - wa); }
    }
    for (const a of _actors) collideWorld(a, a === G.hero);
  }
}
