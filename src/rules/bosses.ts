/** Mini-bosses every 5 depths (SPEC §9): roster, stat basis and guaranteed drops. */
import type { Rng } from '../core/rng';
import { BASES, type BaseId } from './bases';
import { newBook, newScroll, type Item } from './inventory';
import { goldAmount, rollItem, type Drop, type LootCtx } from './loot';
import { newUnique, rollEquipment } from './magic';
import type { FamilyId } from './monsters';
import { SPELL_IDS, SPELLS } from './spells';
import type { UniqueId } from './affixes';

export type BossId = 'warden' | 'gorger' | 'broodmother' | 'lich';

export interface BossDef {
  name: string;
  title: string;
  /** Family whose stats the boss scales from (×5 HP, ×1.5 damage at mlvl = depth + 2). */
  family: FamilyId;
  /** Unique with a 25 % extra drop chance, if any. */
  unique?: UniqueId;
}

export const BOSSES: Record<BossId, BossDef> = {
  warden: { name: 'The Bone Warden', title: 'Guardian of the Stairs', family: 'skeleton' },
  gorger: { name: 'The Gorger', title: 'Butcher of the Deep', family: 'zombie', unique: 'widowmaker' },
  broodmother: { name: 'The Brood Mother', title: 'Queen of the Webs', family: 'spider', unique: 'spinneret' },
  lich: { name: 'The Ember Lich', title: 'Keeper of the Pyre', family: 'skeleton' },
};

const ROSTER: readonly BossId[] = ['warden', 'gorger', 'broodmother', 'lich'];

/** The boss guarding `depth`'s stairs: every 5th depth, cycling the roster; repeats are "Ascended" (SPEC §9). */
export function bossFor(depth: number): { id: BossId; ascended: boolean } | null {
  if (depth % 5 !== 0) return null;
  const n = depth / 5 - 1;
  return { id: ROSTER[n % ROSTER.length], ascended: n >= ROSTER.length };
}

export const bossName = (id: BossId, ascended: boolean): string => (ascended ? `Ascended ${BOSSES[id].name.replace(/^The /, '')}` : BOSSES[id].name);

const JEWELRY: readonly BaseId[] = ['ring', 'ring_q10', 'ring_q15', 'amulet', 'amulet_q16'];

/**
 * Guaranteed boss drops (SPEC §9): an equipment item at ilvl mlvl + 4 that is always magic with a 16 % unique chance,
 * two potions, a Scroll of Identify and 10× a gold pile; the Gorger and Brood Mother add a 25 % chance of their unique,
 * the Ember Lich a ring or amulet and a book of qlvl ≥ 6.
 */
export function bossDrops(rng: Rng, id: BossId, mlvl: number, depth: number, ctx: LootCtx): Drop[] {
  const ilvl = mlvl + 4;
  const item = (it: Item): Drop => ({ kind: 'item', item: it });
  const out: Drop[] = [
    item(rollItem(rng, ilvl, depth, ctx, 'equip', true)),
    item(rollItem(rng, mlvl, depth, ctx, 'potion')),
    item(rollItem(rng, mlvl, depth, ctx, 'potion')),
    item(newScroll('identify')),
    { kind: 'gold', amount: 10 * goldAmount(rng, mlvl) },
  ];
  const u = BOSSES[id].unique;
  if (u && !ctx.found.has(u) && rng() < .25) { ctx.found.add(u); out.push(item(newUnique(u, rng()))); }
  if (id === 'lich') {
    const pool = JEWELRY.filter(b => BASES[b].qlvl <= ilvl);
    // no unique roll here: a unique would bring its own (non-jewelry) base and break the guarantee
    out.push(item(rollEquipment(rng, ilvl, pool.length ? pool : ['ring'], { found: ctx.found, forceMagic: true, uniqueChance: 0 })));
    const books = SPELL_IDS.filter(s => { const q = SPELLS[s].bookQ; return q !== null && q >= 6 && q <= ilvl; });
    if (books.length) out.push(item(newBook(books[Math.floor(rng() * books.length)])));
  }
  return out;
}
