import { openChest, unlockDoor } from './combat';
import { PI, pick, wrapA } from '../core/math';
import { G } from '../game/state';
import { DX8, DZ8, T } from '../world/consts';
import { buildPath, clearLine, fieldAt, navOK } from '../world/nav';
import type { Goal, Hero, Monster, Pickup, Trap } from '../game/types';
import { findBelt, storeTarget } from '../rules/inventory';
import { POTIONS } from '../rules/potions';

export interface AutoOut { mx: number; mz: number; atk: boolean; face: number | null }

/**
 * AUTO potion choice (SPEC §14): below 35 % life drink a partial life potion (Healing, Rejuvenation), falling back to a
 * full one; below 20 % prefer a full life potion. Returns a belt slot or -1.
 */
export function autoDrinkSlot(h: Hero): number {
  const frac = h.life / h.d.maxLife;
  if (frac >= .35) return -1;
  const full = findBelt(h.inv, p => POTIONS[p].life === 'full'), part = findBelt(h.inv, p => POTIONS[p].life === 'part');
  return frac < .2 ? (full >= 0 ? full : part) : (part >= 0 ? part : full);
}

/** True when a ground pickup can be collected (coins always; potions need belt or backpack room). */
export const canCollect = (h: Hero, p: Pickup): boolean => p.kind === 'coin' || storeTarget(h.inv, p) !== null;

/** Sets the AUTO goal; a different goal (by kind, tile and, for monsters, identity) resets the path and goal timer. */
function setGoal(goal: Goal): void {
  const h = G.hero;
  const key = goal.kind + ':' + goal.tx + ',' + goal.tz + (goal.kind === 'mon' ? ':' + G.L.monsters.indexOf(goal.ref) : '');
  if (h.goalKey !== key) { h.goalKey = key; h.goalT = 0; h.path = null; }
  h.goal = goal;
}
/** Priority: nearby monster > pickup > locked door (if key and most rooms seen) > nearest chest/unvisited room > door > stairs > wander. */
function chooseGoal(): void {
  const h = G.hero, L = G.L;
  let best: Monster | null = null, bd = 1e9;
  for (const m of L.monsters) { if (m.dead || m.rise > 0 || m.ignoreT > 0) continue; const fd = fieldAt(m.x, m.z); if (fd > (m.aware ? 11 : 8)) continue; const s = fd - (m.aware ? 3 : 0); if (s < bd) { bd = s; best = m; } }
  if (best) return setGoal({ kind: 'mon', ref: best, tx: Math.round(best.x / T), tz: Math.round(best.z / T) });
  let pk: Pickup | null = null; bd = 7;
  for (const p of L.pickups) { if (p.t < .6 || !canCollect(h, p)) continue; const fd = fieldAt(p.x, p.z); if (fd < bd) { bd = fd; pk = p; } }
  if (pk) return setGoal({ kind: 'pick', ref: pk, tx: Math.round(pk.x / T), tz: Math.round(pk.z / T) });
  const doorGoal: Goal = { kind: 'door', ref: L.lockedDoor, tx: L.lockedDoor.tx, tz: L.lockedDoor.tz };
  if (L.locked && h.key && L.rooms.filter(r => r.visited).length >= L.rooms.length * .6) return setGoal(doorGoal);
  // explore: nearest unopened chest or unvisited room, whichever is closer by path
  let ex: Goal | null = null; bd = 1e9;
  for (const c of L.chests) { if (c.open) continue; const fd = fieldAt(c.x, c.z); if (fd < bd) { bd = fd; ex = { kind: 'chest', ref: c, tx: Math.round(c.x / T), tz: Math.round(c.z / T) }; } }
  for (const r of L.rooms) {
    if (r.visited) continue; let tx = r.cx, tz = r.cy;
    if (!navOK(tz * L.W + tx)) { outer: for (let z = r.y; z < r.y + r.h; z++) for (let x = r.x; x < r.x + r.w; x++) if (navOK(z * L.W + x)) { tx = x; tz = z; break outer; } }
    const fd = L.dist[tz * L.W + tx]; if (fd < bd) { bd = fd; ex = { kind: 'room', ref: r, tx, tz }; }
  }
  if (ex) return setGoal(ex);
  if (L.locked && h.key) return setGoal(doorGoal);
  if (!L.locked) return setGoal({ kind: 'stairs', ref: null, tx: L.stairs.tx, tz: L.stairs.tz });
  // fallback: wander to a random room
  const r = pick(L.rooms.filter(r => r !== L.stairsRoom)); r.visited = false;
  return setGoal({ kind: 'room', ref: r, tx: r.cx, tz: r.cy });
}
/** True while a trap tile is (about to be) dangerous to step on. */
function trapUnsafe(tr: Trap): boolean {
  if (tr.kind === 'spike') { const tc = tr.t % 3.6; return !(tc < 1.15); }
  const ph = ((tr.w * G.now + tr.ph) % PI + PI) % PI, since = ph / tr.w; return !(since > .05 && since < .45);
}
/** AUTO mode: picks a goal and returns steering, attack and facing for this step. */
export function heroAuto(dt: number): AutoOut {
  const h = G.hero, out: AutoOut = { mx: 0, mz: 0, atk: false, face: null };
  h.aiT -= dt; if (h.aiT <= 0 || !h.goal) { h.aiT = .2; chooseGoal(); }
  const g = h.goal; if (!g) return out;
  h.goalT += dt;
  let gx = g.tx * T, gz = g.tz * T, arrive = .35, direct = false;
  if (g.kind === 'mon') {
    const m = g.ref; if (m.dead) { h.aiT = 0; return out; }
    gx = m.x; gz = m.z; const dx = gx - h.x, dz = gz - h.z, d = Math.hypot(dx, dz);
    out.face = Math.atan2(dx, dz);
    if (d < h.r + m.r + .7) { out.atk = Math.abs(wrapA(out.face - h.face)) < .7; if (h.goalT > 9 && G.L.killsHere === h.killsAtGoal) { m.ignoreT = 6; h.aiT = 0; } return out; }
    arrive = 0; direct = d < 7 && clearLine(h.x, h.z, gx, gz, h.r * .9);
    g.tx = Math.round(gx / T); g.tz = Math.round(gz / T);
    if (h.goalT < dt * 1.5) h.killsAtGoal = G.L.killsHere;
    if (h.goalT > 12) { m.ignoreT = 6; h.aiT = 0; }
  } else if (g.kind === 'pick') { gx = g.ref.x; gz = g.ref.z; arrive = .1; if (!G.L.pickups.includes(g.ref)) { h.aiT = 0; return out; } direct = Math.hypot(gx - h.x, gz - h.z) < 5 && clearLine(h.x, h.z, gx, gz, h.r); }
  else if (g.kind === 'chest') { if (g.ref.open) { h.aiT = 0; return out; } arrive = 1.35; if (Math.hypot(g.ref.x - h.x, g.ref.z - h.z) < 1.3) return out; if (h.goalT > 25) openChest(g.ref); }
  else if (g.kind === 'room') { if (g.ref.visited) { h.aiT = 0; return out; } if (h.goalT > 30) g.ref.visited = true; }
  else if (g.kind === 'door') { if (Math.hypot(gx - h.x, gz - h.z) < 2.1) return out; if (h.goalT > 30) unlockDoor(); }
  let tx: number, tz: number;
  if (h.unstickT > 0) { h.unstickT -= dt; tx = h.ux; tz = h.uz; }
  else if (direct) { tx = gx; tz = gz; }
  else {
    h.repath -= dt;
    if (!h.path || h.repath <= 0) { h.path = buildPath(g.tx, g.tz); h.pi = 0; h.repath = .45; }
    if (!h.path || !h.path.length) { tx = gx; tz = gz; }
    else {
      for (let k = 0; k < 6 && h.pi < h.path.length - 1; k++) { const nx = h.path[h.pi + 1]; if (clearLine(h.x, h.z, nx.x, nx.z, h.r + .05)) h.pi++; else break; }
      const p = h.path[h.pi]; tx = p.x; tz = p.z;
      if (Math.hypot(tx - h.x, tz - h.z) < .3 && h.pi < h.path.length - 1) h.pi++;
      if (h.pi === h.path.length - 1 && g.kind !== 'mon' && clearLine(h.x, h.z, gx, gz, h.r)) { tx = gx; tz = gz; }
      if (g.kind === 'chest' && h.pi >= h.path.length - 2 && Math.hypot(g.ref.x - h.x, g.ref.z - h.z) < 3.2) { tx = g.ref.x; tz = g.ref.z; }
    }
  }
  const dx = tx - h.x, dz = tz - h.z, d = Math.hypot(dx, dz);
  if (d < Math.max(arrive, .08)) return out;
  out.mx = dx / d; out.mz = dz / d;
  // wait for traps ahead
  const ax = Math.round((h.x + out.mx * 1.3) / T), az = Math.round((h.z + out.mz * 1.3) / T), cx = Math.round(h.x / T), cz = Math.round(h.z / T);
  if ((ax !== cx || az !== cz) && ax >= 0 && az >= 0 && ax < G.L.W && az < G.L.H) { const ti = G.L.trap[az * G.L.W + ax]; if (ti >= 0 && trapUnsafe(G.L.traps[ti])) { out.mx = out.mz = 0; h.waitTrap = true; return out; } }
  h.waitTrap = false;
  // stuck detection
  h.stuckT += dt;
  if (h.stuckT > .9) {
    const moved = Math.hypot(h.x - h.sx, h.z - h.sz);
    if (moved < .35) { h.stuck++; h.path = null; if (h.stuck >= 2) { const c: [number, number][] = []; for (let k = 0; k < 8; k++) { const nx = cx + DX8[k], nz = cz + DZ8[k]; if (nx >= 0 && nz >= 0 && nx < G.L.W && nz < G.L.H && navOK(nz * G.L.W + nx)) c.push([nx, nz]); } if (c.length) { const p = pick(c); h.ux = p[0] * T; h.uz = p[1] * T; h.unstickT = .7; } h.stuck = 0; } }
    else h.stuck = 0;
    h.stuckT = 0; h.sx = h.x; h.sz = h.z;
  }
  return out;
}
