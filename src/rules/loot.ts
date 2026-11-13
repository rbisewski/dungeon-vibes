/** Drop pipeline (D1 rates, Jarulf's Guide §3.8). SPEC.md §6.3. */
import type { Rng } from '../core/rng';
import { BASE_IDS, BASES, type BaseId } from './bases';
import type { Attr } from './classes';
import { newElixir, newEquip, newPotion, type Item } from './inventory';
import { rollPotion } from './potions';

export type Drop = { kind: 'gold'; amount: number } | { kind: 'item'; item: Item };

/** D1 normal monster: 30.3 % gold, 10.7 % item, 59 % nothing. */
export const MONSTER_GOLD = 0.303, MONSTER_ITEM = 0.107;

const ri = (rng: Rng, a: number, b: number): number => a + Math.floor(rng() * (b - a + 1));

/** Gold pile size [OURS]: `ri(1,3)·(mlvl+1) + ri(0, mlvl)`. */
export const goldAmount = (rng: Rng, mlvl: number): number => ri(rng, 1, 3) * (mlvl + 1) + ri(rng, 0, mlvl);

export type Category = 'equip' | 'potion' | 'elixir';

/**
 * Category weights for an item drop [OURS]. Scrolls and books join in Phase 5.
 * Potions are more common on the first two depths; elixirs only from depth 8.
 */
export function categoryWeights(depth: number): Record<Category, number> {
  return { equip: 45, potion: depth < 3 ? 50 : 30, elixir: depth >= 8 ? 2 : 0 };
}

/** Bases that can drop at `ilvl` (qlvl ≤ ilvl). */
export const eligibleBases = (ilvl: number): BaseId[] => BASE_IDS.filter(id => BASES[id].qlvl <= ilvl);

export function rollEquip(rng: Rng, ilvl: number): Item {
  const pool = eligibleBases(Math.max(1, ilvl));
  return newEquip(pool[Math.floor(rng() * pool.length)], rng());
}

export function rollItem(rng: Rng, ilvl: number, depth: number, only?: Category): Item {
  let cat: Category = only ?? 'equip';
  if (!only) {
    const w = categoryWeights(depth), cats = Object.keys(w) as Category[];
    let r = rng() * cats.reduce((s, c) => s + w[c], 0);
    for (const c of cats) { r -= w[c]; if (r < 0) { cat = c; break; } }
  }
  if (cat === 'potion') return newPotion(rollPotion(rng, ilvl));
  if (cat === 'elixir') {
    // D1: Elixirs of Str/Int/Dex are qlvl 15, Vitality qlvl 20.
    const attrs: Attr[] = ilvl >= 20 ? ['str', 'int', 'dex', 'vit'] : ['str', 'int', 'dex'];
    return newElixir(attrs[Math.floor(rng() * attrs.length)]);
  }
  return rollEquip(rng, ilvl);
}

/** Everything a slain monster leaves behind. */
export function monsterDrops(rng: Rng, mlvl: number, depth: number, boss: boolean): Drop[] {
  if (boss) {
    return [
      { kind: 'item', item: rollItem(rng, mlvl, depth, 'equip') },
      { kind: 'item', item: rollItem(rng, mlvl, depth, 'potion') },
      { kind: 'gold', amount: 10 * goldAmount(rng, mlvl) },
    ];
  }
  const r = rng();
  if (r < MONSTER_GOLD) return [{ kind: 'gold', amount: goldAmount(rng, mlvl) }];
  if (r < MONSTER_GOLD + MONSTER_ITEM) return [{ kind: 'item', item: rollItem(rng, mlvl, depth) }];
  return [];
}

/** Chests: their gold plus, half the time [OURS], one item at D1's chest ilvl of 2·depth. */
export const CHEST_ITEM_CHANCE = 0.5;
