/** Drop pipeline (D1 rates, Jarulf's Guide §3.8). SPEC.md §6.3. */
import type { Rng } from '../core/rng';
import type { UniqueId } from './affixes';
import { BASE_IDS, BASES, type BaseId } from './bases';
import type { Attr } from './classes';
import { newBook, newElixir, newPotion, newScroll, type Item } from './inventory';
import { BOSS_UNIQUE_CHANCE, rollEquipment } from './magic';
import { rollPotion } from './potions';
import { SPELL_IDS, SPELLS, type SpellId } from './spells';

export type Drop = { kind: 'gold'; amount: number } | { kind: 'item'; item: Item };

/** D1 normal monster: 30.3 % gold, 10.7 % item, 59 % nothing. */
export const MONSTER_GOLD = 0.303, MONSTER_ITEM = 0.107;

const ri = (rng: Rng, a: number, b: number): number => a + Math.floor(rng() * (b - a + 1));

/** Gold pile size [OURS]: `ri(1,3)·(mlvl+1) + ri(0, mlvl)`. */
export const goldAmount = (rng: Rng, mlvl: number): number => ri(rng, 1, 3) * (mlvl + 1) + ri(rng, 0, mlvl);

export type Category = 'equip' | 'potion' | 'scroll' | 'book' | 'elixir';

/**
 * Category weights for an item drop [OURS] (SPEC §6.3). Potions are more common on the first two depths; elixirs
 * only from depth 8.
 */
export function categoryWeights(depth: number): Record<Category, number> {
  return { equip: 45, potion: depth < 3 ? 50 : 30, scroll: 15, book: 8, elixir: depth >= 8 ? 2 : 0 };
}

/** Scrolls [OURS]: Identify half the time, Healing 15 %, otherwise uniform among the other scrolls with qlvl ≤ ilvl. */
export function rollScrollSpell(rng: Rng, ilvl: number): SpellId {
  const r = rng();
  if (r < .5) return 'identify';
  if (r < .65) return 'healing';
  const rest = SPELL_IDS.filter(s => s !== 'identify' && s !== 'healing' && SPELLS[s].scrollQ !== null && SPELLS[s].scrollQ <= ilvl);
  return rest.length ? rest[Math.floor(rng() * rest.length)] : 'identify';
}

/** Books: uniform among spells whose book qlvl ≤ ilvl (D1 picks uniformly from eligible bases). */
export function rollBookSpell(rng: Rng, ilvl: number): SpellId {
  const ok = SPELL_IDS.filter(s => SPELLS[s].bookQ !== null && SPELLS[s].bookQ <= Math.max(1, ilvl));
  return ok[Math.floor(rng() * ok.length)];
}

/** Bases that can drop at `ilvl` (qlvl ≤ ilvl). Bows are listed twice, as in D1's drop pool. */
export function eligibleBases(ilvl: number): BaseId[] {
  const ok = BASE_IDS.filter(id => BASES[id].qlvl <= ilvl);
  return [...ok, ...ok.filter(id => { const b = BASES[id]; return b.kind === 'weapon' && b.wk === 'bow'; })];
}

/** Run-wide drop state. */
export interface LootCtx {
  /** Uniques already generated; each drops at most once per run. */
  found: Set<UniqueId>;
}

export function rollItem(rng: Rng, ilvl: number, depth: number, ctx: LootCtx, only?: Category, boss = false): Item {
  let cat: Category = only ?? 'equip';
  if (!only) {
    const w = categoryWeights(depth), cats = Object.keys(w) as Category[];
    let r = rng() * cats.reduce((s, c) => s + w[c], 0);
    for (const c of cats) { r -= w[c]; if (r < 0) { cat = c; break; } }
  }
  if (cat === 'potion') return newPotion(rollPotion(rng, ilvl));
  if (cat === 'scroll') return newScroll(rollScrollSpell(rng, ilvl));
  if (cat === 'book') return newBook(rollBookSpell(rng, ilvl));
  if (cat === 'elixir') {
    // D1: Elixirs of Str/Int/Dex are qlvl 15, Vitality qlvl 20.
    const attrs: Attr[] = ilvl >= 20 ? ['str', 'int', 'dex', 'vit'] : ['str', 'int', 'dex'];
    return newElixir(attrs[Math.floor(rng() * attrs.length)]);
  }
  return rollEquipment(rng, Math.max(1, ilvl), eligibleBases(Math.max(1, ilvl)), {
    found: ctx.found,
    forceMagic: boss,
    uniqueChance: boss ? BOSS_UNIQUE_CHANCE : undefined,
  });
}

/** What a slain normal monster leaves behind (bosses: `bossDrops`). With `noItems` (bats) an item roll gives nothing. */
export function monsterDrops(rng: Rng, mlvl: number, depth: number, ctx: LootCtx, noItems = false): Drop[] {
  const r = rng();
  if (r < MONSTER_GOLD) return [{ kind: 'gold', amount: goldAmount(rng, mlvl) }];
  if (r < MONSTER_GOLD + MONSTER_ITEM && !noItems) return [{ kind: 'item', item: rollItem(rng, mlvl, depth, ctx) }];
  return [];
}

/** Chests: their gold plus, half the time [OURS], one item at D1's chest ilvl of 2·depth. */
export const CHEST_ITEM_CHANCE = 0.5;

/**
 * D1 barrels (devilution `AddBarrel`/`BreakBarrel`, SPEC §6.3): one in five holds something. A third of those hold
 * a "useful" item: a healing or mana potion, or from depth 2 a Town Portal scroll a third of the time. The rest hold
 * a random drop at D1's object ilvl of 2·depth: gold three times in four, otherwise an item.
 */
export const BARREL_LOOT = 0.2, BARREL_USEFUL = 1 / 3, BARREL_GOLD = 0.75;

export function barrelDrops(rng: Rng, depth: number, ctx: LootCtx): Drop[] {
  if (rng() >= BARREL_LOOT) return [];
  if (rng() < BARREL_USEFUL) {
    const potion = newPotion(rng() < .5 ? 'heal' : 'mana');
    return [{ kind: 'item', item: depth > 1 && rng() < 1 / 3 ? newScroll('town_portal') : potion }];
  }
  if (rng() < BARREL_GOLD) return [{ kind: 'gold', amount: goldAmount(rng, 2 * depth) }];
  return [{ kind: 'item', item: rollItem(rng, 2 * depth, depth, ctx) }];
}
