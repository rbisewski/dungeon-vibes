/**
 * Level deltas (SPEC §12.2): what changed on a level since it was generated from its seed. A level is rebuilt from
 * the seed and the delta re-applied, so it comes back as it was left.
 */
import { addGrave } from '../game/death';
import { G } from '../game/state';
import { quality } from '../rules/inventory';
import { capGround } from '../rules/persist';
import { restorePickup, savePickup, type SavedPickup } from './groundItems';
import { setBroken } from './objects';

export interface LevelDelta {
  /** Floor items and gold outside graves, oldest first (capped, SPEC §12.2). */
  ground: SavedPickup[];
  graves: { x: number; z: number; pickups: SavedPickup[] }[];
  /** `genId`s of generated monsters that died. */
  dead: number[];
  /** Indices into `Level.chests` (bookshelves included) that were opened. */
  chests: number[];
  /** Indices into `Level.barrels` that were broken (absent in saves from before barrels broke). */
  barrels?: number[];
  /** Indices into `Level.traps` a Thief disarmed. */
  disarmed: number[];
  unlocked: boolean;
  /** Indices into `Level.rooms` the hero has entered (AUTO explores the rest). */
  visited: number[];
}

export function captureLevel(): LevelDelta {
  const L = G.L;
  const inGrave = new Set(L.graves.flatMap(g => g.pickups));
  return {
    // gold piles count as normal quality
    ground: capGround(L.pickups.filter(p => !inGrave.has(p)).map(savePickup), s => !('item' in s) || quality(s.item) === 'normal'),
    graves: L.graves.map(g => ({ x: g.x, z: g.z, pickups: g.pickups.map(savePickup) })),
    dead: [...L.killedGen],
    chests: L.chests.flatMap((c, i) => (c.open ? [i] : [])),
    barrels: L.barrels.flatMap((b, i) => (b.broken ? [i] : [])),
    disarmed: L.traps.flatMap((t, i) => (t.disabled ? [i] : [])),
    unlocked: !L.locked,
    visited: L.rooms.flatMap((r, i) => (r.visited ? [i] : [])),
  };
}

/** Re-applies a delta to the freshly generated current level. No drops, sounds or toasts: it only restores state. */
export function applyLevel(d: LevelDelta): void {
  const L = G.L;
  const dead = new Set(d.dead);
  for (const m of L.monsters) if (dead.has(m.genId)) { m.dead = true; m.remove = true; L.killedGen.add(m.genId); }
  for (const i of d.chests) {
    const c = L.chests[i]; if (!c) continue;
    c.open = true; c.lid.rotation.x = -1.9; if (c.glow) c.glow.visible = false;
    if (c.shelf) c.lid.visible = false;
  }
  for (const i of d.barrels ?? []) { const b = L.barrels[i]; if (b && !b.broken) setBroken(b); }
  for (const i of d.disarmed) { const t = L.traps[i]; if (t) t.disabled = true; }
  for (const i of d.visited) { const r = L.rooms[i]; if (r) r.visited = true; }
  const door = L.lockedDoor;
  if (d.unlocked && L.locked && door) {
    L.locked = false; door.locked = false; L.tiles[door.tz * L.W + door.tx] = 3; if (door.glow) door.glow.visible = false;
  }
  // The key belongs to its level: with the key chest open and the door still locked, the hero holds it.
  if (L.locked && L.chests.some(c => c.isKey && c.open)) G.hero.key = true;
  for (const s of d.ground) restorePickup(s);
  for (const g of d.graves) addGrave(g.x, g.z, g.pickups.map(restorePickup));
}
