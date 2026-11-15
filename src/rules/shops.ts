/**
 * Town merchants (SPEC §13.2): what each sells, buys and stocks. D1 rules (Jarulf's Guide §3.9, devilutionX
 * `SpawnSmith`, `SpawnPremium`, `SpawnWitch`, `SpawnHealer`, `SpawnBoy`) unless tagged.
 */
import type { Rng } from '../core/rng';
import { BASE_IDS, base, type BaseId } from './bases';
import { itemName, newBook, newEquip, newPotion, newScroll, type EquipItem, type Item } from './inventory';
import { magicChance, makeMagic, type AffixWindow } from './magic';
import type { PotionId } from './potions';
import { POTIONS } from './potions';
import { equipValue, itemPrice } from './prices';
import { SPELL_IDS, SPELLS, type SpellId } from './spells';

export type MerchantId = 'smith' | 'witch' | 'healer' | 'peddler';

/** D1 single player: shop ilvl from the deepest level reached, `clamp(deepest + 2, 6, 16)`. */
export const storeIlvl = (deepest: number): number => Math.min(16, Math.max(6, deepest + 2));

/** D1: the smith and the peddler never offer items worth more than these. */
export const MAX_VENDOR_VALUE = 140000, MAX_PEDDLER_VALUE = 90000;
/** D1: the peddler asks half again the item's price, and 50 gold to see it. */
export const PEDDLER_MARKUP = 1.5, PEDDLER_LOOK = 50;
/** The sage's fee per identification [OURS, SPEC §13.2]. */
export const SAGE_FEE = 100;
/** D1 Diablo: six premium slots, each at clvl + offset. */
export const PREMIUM_OFFSETS = [-1, -1, 0, 0, 1, 2] as const;

const pickOf = <T>(rng: Rng, a: readonly T[]): T => a[Math.floor(rng() * a.length)];
const between = (rng: Rng, lo: number, hi: number): number => lo + Math.floor(rng() * (hi - lo + 1));

const isStaff = (id: BaseId): boolean => { const b = base(id); return b.kind === 'weapon' && b.wk === 'staff'; };

/** Only the smith and the witch buy (D1): the smith equipment except staves, the witch books, scrolls and staves. */
export function buys(m: MerchantId, it: Item): boolean {
  if (m === 'smith') return it.kind === 'equip' && !isStaff(it.base);
  if (m === 'witch') return it.kind === 'book' || it.kind === 'scroll' || (it.kind === 'equip' && isStaff(it.base));
  return false;
}

/** Unlimited items, always on offer: the witch's mana potions and scrolls, the healer's healing potions. */
export type FixedItem = { kind: 'potion'; potion: PotionId } | { kind: 'scroll'; spell: SpellId };
export const FIXED: Record<'witch' | 'healer', readonly FixedItem[]> = {
  // D1: Mana, Full Mana, Town Portal; Identify scrolls [OURS, SPEC §13.2]
  witch: [{ kind: 'potion', potion: 'mana' }, { kind: 'potion', potion: 'fullMana' }, { kind: 'scroll', spell: 'town_portal' }, { kind: 'scroll', spell: 'identify' }],
  healer: [{ kind: 'potion', potion: 'heal' }, { kind: 'potion', potion: 'fullHeal' }],
};
export const makeFixed = (f: FixedItem): Item => (f.kind === 'potion' ? newPotion(f.potion) : newScroll(f.spell));

const KIND_ORDER: Record<Item['kind'], number> = { potion: 0, elixir: 1, scroll: 2, book: 3, equip: 4 };
const SLOT_ORDER = ['weapon', 'shield', 'head', 'body', 'jewelry'] as const;

/** Shop lists read grouped (D1 `SortVendor`): by kind, equipment by slot, then by price, then by name. */
function sortStock<T extends Item>(items: T[]): T[] {
  const slot = (it: Item): number => {
    if (it.kind !== 'equip') return 0;
    const b = base(it.base);
    return SLOT_ORDER.indexOf(b.kind === 'armor' ? b.slot : b.kind);
  };
  return items.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || slot(a) - slot(b) || itemPrice(a) - itemPrice(b) || itemName(a).localeCompare(itemName(b)));
}

/**
 * The smith's basic stock: 10–19 normal items with base qlvl 1…ilvl, never staves or jewelry; bows count twice in
 * the base draw (D1).
 */
export function rollSmithBasic(rng: Rng, ilvl: number): EquipItem[] {
  const pool = BASE_IDS.filter(id => base(id).kind !== 'jewelry' && !isStaff(id) && base(id).qlvl <= ilvl).flatMap(id => { const b = base(id); return b.kind === 'weapon' && b.wk === 'bow' ? [id, id] : [id]; });
  return sortStock(Array.from({ length: between(rng, 10, 19) }, () => newEquip(pickOf(rng, pool), rng())));
}

/** A magic item at `ilvl` on a base from `pool` with affixes from `win`, rerolled until worth at most `cap`. */
function rollMagicItem(rng: Rng, ilvl: number, pool: readonly BaseId[], win: AffixWindow, cap: number): EquipItem {
  for (;;) {
    const it = newEquip(pickOf(rng, pool), rng());
    if (!makeMagic(rng, it, ilvl, win)) continue;
    it.identified = true;
    if (equipValue(it) <= cap) return it;
  }
}

/**
 * One premium item at `plvl` (clvl + its slot's offset), at most 30: always magic and identified, base qlvl in
 * [plvl/4, plvl], affix qlvl in [plvl/2, plvl] (D1). Never staves, never uniques.
 */
export function rollPremium(rng: Rng, plvl: number): EquipItem {
  const lvl = Math.max(1, Math.min(30, plvl));
  const pool = BASE_IDS.filter(id => !isStaff(id) && base(id).qlvl >= Math.floor(lvl / 4) && base(id).qlvl <= lvl);
  return rollMagicItem(rng, lvl, pool, { lo: Math.floor(lvl / 2), hi: lvl }, MAX_VENDOR_VALUE);
}

/** A full premium list for a character at `clvl`. */
export const rollPremiumList = (rng: Rng, clvl: number): EquipItem[] => PREMIUM_OFFSETS.map(o => rollPremium(rng, clvl + o));

/**
 * D1: for each level gained, items 2–4 move down to slots 0–2, item 5 to slot 4, and slots 3 and 5 are rerolled at
 * the new level. Returns the new list.
 */
export function levelPremium(rng: Rng, list: readonly EquipItem[], fromLvl: number, toLvl: number): EquipItem[] {
  const out = [...list];
  for (let lvl = fromLvl + 1; lvl <= toLvl; lvl++) {
    out.splice(0, 2);
    out.splice(3, 0, rollPremium(rng, lvl + PREMIUM_OFFSETS[3]));
    out.push(rollPremium(rng, lvl + PREMIUM_OFFSETS[5]));
  }
  return out;
}

/**
 * The witch's random stock: 7–14 items drawn uniformly from the eligible bases: books (spell book qlvl ≤ ilvl),
 * scrolls (scroll qlvl ≤ ilvl, not her fixed ones) and staves (qlvl ≤ ilvl). A staff turns magic with the dungeon
 * chance, with affixes from [ilvl, 2·ilvl] (D1 staves without spells). Everything is identified.
 */
export function rollWitch(rng: Rng, ilvl: number): Item[] {
  type Pick = { kind: 'book' | 'scroll'; spell: SpellId } | { kind: 'staff'; base: BaseId };
  const fixed = new Set(FIXED.witch.flatMap(f => (f.kind === 'scroll' ? [f.spell] : [])));
  const pool: Pick[] = [
    ...SPELL_IDS.filter(s => { const q = SPELLS[s].bookQ; return q !== null && q <= ilvl; }).map(spell => ({ kind: 'book' as const, spell })),
    ...SPELL_IDS.filter(s => { const q = SPELLS[s].scrollQ; return q !== null && q <= ilvl && !fixed.has(s); }).map(spell => ({ kind: 'scroll' as const, spell })),
    ...BASE_IDS.filter(id => isStaff(id) && base(id).qlvl <= ilvl).map(b => ({ kind: 'staff' as const, base: b })),
  ];
  return sortStock(Array.from({ length: between(rng, 7, 14) }, (): Item => {
    const p = pickOf(rng, pool);
    if (p.kind !== 'staff') return p.kind === 'book' ? newBook(p.spell) : newScroll(p.spell);
    const it = newEquip(p.base, rng());
    if (rng() * 100 < magicChance(ilvl)) makeMagic(rng, it, ilvl, { lo: ilvl, hi: 2 * ilvl });
    it.identified = true;
    return it;
  }));
}

/**
 * The healer's random stock: 7–14 items drawn uniformly from Potions of Rejuvenation and Full Rejuvenation (by
 * qlvl) and Scrolls of Healing (D1, single player; elixirs are never sold [OURS]).
 */
export function rollHealer(rng: Rng, ilvl: number): Item[] {
  const pool: (() => Item)[] = [
    ...(['rejuv', 'fullRejuv'] as const).filter(p => POTIONS[p].qlvl <= ilvl).map(p => () => newPotion(p)),
    () => newScroll('healing'),
  ];
  return sortStock(Array.from({ length: between(rng, 7, 14) }, () => pickOf(rng, pool)()));
}

/**
 * The peddler's single item (D1 Wirt): at ilvl = clvl, base qlvl 1…ilvl (never staves), always magic with affixes
 * from [min(ilvl, 25), 2·ilvl], worth at most 90 000.
 */
export function rollPeddler(rng: Rng, clvl: number): EquipItem {
  const pool = BASE_IDS.filter(id => !isStaff(id) && base(id).qlvl <= clvl);
  return rollMagicItem(rng, clvl, pool, { lo: Math.min(clvl, 25), hi: 2 * clvl }, MAX_PEDDLER_VALUE);
}
