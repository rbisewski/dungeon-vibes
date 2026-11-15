/**
 * Item prices (SPEC §13.2). D1 data from devilutionX (`itemdat.tsv` base values, `item_prefixes.tsv` /
 * `item_suffixes.tsv` affix prices, `spelldat.tsv` book costs) and D1's formulas (`CalcItemValue`, `PLVal`).
 */
import { AFFIXES, UNIQUES, type AffixId, type Prop, type Stat } from './affixes';
import type { BaseId } from './bases';
import type { EquipItem, Item } from './inventory';
import type { PotionId } from './potions';
import type { SpellId } from './spells';

/** D1 base item values. */
export const BASE_PRICE: Record<BaseId, number> = {
  dagger: 60, short_sword: 120, sabre: 170, falchion: 250, scimitar: 200, long_sword: 350, broad_sword: 750, bastard_sword: 1000, great_sword: 3000,
  small_axe: 150, axe: 450, large_axe: 750, broad_axe: 1000, battle_axe: 1500, great_axe: 2500,
  club: 20, mace: 200, morning_star: 300, war_hammer: 600, flail: 500, maul: 900,
  short_staff: 30, long_staff: 100, composite_staff: 500, quarter_staff: 1000, war_staff: 1500,
  short_bow: 100, hunters_bow: 350, long_bow: 250, composite_bow: 600, short_battle_bow: 750, long_battle_bow: 1000, short_war_bow: 1500, long_war_bow: 2000,
  cap: 15, skull_cap: 25, helm: 40, full_helm: 90, crown: 200, great_helm: 400,
  rags: 5, cape: 10, cloak: 40, robe: 75, quilted_armor: 200, leather_armor: 300, hard_leather_armor: 450, studded_leather_armor: 700,
  ring_mail: 900, chain_mail: 1250, scale_mail: 2300, breast_plate: 2800, splint_mail: 3250, plate_mail: 4600, field_plate: 5800, gothic_plate: 8000, full_plate_mail: 6500,
  buckler: 30, small_shield: 90, large_shield: 200, kite_shield: 400, tower_shield: 850, gothic_shield: 2300,
  ring: 1000, ring_q10: 1000, ring_q15: 1000, amulet: 1200, amulet_q16: 1200,
};

/**
 * D1 affix price data: the added value at the bottom and top of the affix's range, and its multiplier on the base
 * value. Two-effect affixes (to-hit and damage) are priced by their damage roll (D1).
 */
export const AFFIX_PRICE: Record<AffixId, readonly [number, number, number]> = {
  bronze: [100, 500, 2],
  iron: [600, 1000, 3],
  steel: [1100, 1500, 5],
  silver: [1600, 2000, 7],
  gold: [2100, 3000, 9],
  platinum: [3100, 4000, 11],
  mithril: [4100, 6000, 13],
  meteoric: [6100, 10000, 15],
  jagged: [250, 450, 3],
  deadly: [500, 700, 4],
  heavy: [750, 950, 5],
  vicious: [1000, 1450, 8],
  brutal: [1500, 1950, 10],
  massive: [2000, 2450, 13],
  savage: [2500, 3000, 15],
  ruthless: [10100, 15000, 17],
  sharp: [350, 950, 5],
  fine_w: [1100, 1700, 7],
  warriors: [1850, 2450, 13],
  soldiers: [2600, 3950, 17],
  lords: [4100, 5950, 21],
  knights: [6100, 8450, 26],
  masters: [8600, 13000, 30],
  kings: [24100, 35000, 38],
  fine_a: [20, 100, 2],
  strong: [120, 200, 3],
  grand: [220, 300, 5],
  valiant: [320, 400, 7],
  glorious: [420, 600, 9],
  blessed: [620, 800, 11],
  saintly: [820, 1200, 13],
  awesome: [1220, 2000, 15],
  holy: [5200, 6000, 17],
  spiders: [500, 1000, 2],
  ravens: [1100, 2000, 3],
  snakes: [2100, 4000, 5],
  serpents: [4100, 6000, 7],
  drakes: [6100, 10000, 9],
  dragons: [10100, 15000, 11],
  angels: [25000, 25000, 2],
  archangels: [50000, 50000, 3],
  of_strength: [200, 1000, 2],
  of_might: [1200, 2000, 3],
  of_power: [2200, 3000, 4],
  of_giants: [3200, 5000, 7],
  of_titans: [5200, 10000, 10],
  of_dexterity: [200, 1000, 2],
  of_skill: [1200, 2000, 3],
  of_accuracy: [2200, 3000, 4],
  of_precision: [3200, 5000, 7],
  of_perfection: [5200, 10000, 10],
  of_vitality: [200, 1000, 2],
  of_zest: [1200, 2000, 3],
  of_vim: [2200, 3000, 4],
  of_vigor: [3200, 5000, 7],
  of_life: [5200, 10000, 10],
  of_magic: [200, 1000, 2],
  of_the_mind: [1200, 2000, 3],
  of_brilliance: [2200, 3000, 4],
  of_sorcery: [3200, 5000, 7],
  of_wizardry: [5200, 10000, 10],
  of_the_sky: [800, 4000, 5],
  of_the_moon: [4800, 8000, 10],
  of_the_stars: [8800, 12000, 15],
  of_the_heavens: [12800, 20000, 20],
  of_the_zodiac: [20800, 40000, 30],
  of_the_fox: [100, 1000, 2],
  of_the_jaguar: [1100, 2000, 3],
  of_the_eagle: [2100, 4000, 5],
  of_the_wolf: [4100, 6000, 7],
  of_the_tiger: [6100, 10000, 9],
  of_the_lion: [10100, 15000, 11],
  of_quality: [100, 200, 2],
  of_maiming: [1300, 1500, 3],
  of_slaying: [2600, 3000, 5],
  of_gore: [4100, 5000, 8],
  of_health: [200, 200, 2],
  of_protection: [400, 800, 4],
  of_absorption: [1001, 2500, 10],
  of_deflection: [2500, 6500, 15],
  of_the_leech: [7500, 7500, 3],
  of_blood: [15000, 15000, 3],
  of_the_bat: [7500, 7500, 3],
  of_vampires: [15000, 15000, 3],
  of_readiness: [2000, 2000, 2],
  of_swiftness: [4000, 4000, 4],
  of_speed: [8000, 8000, 8],
  of_haste: [16000, 16000, 16],
  of_thorns: [500, 500, 2],
};

export const POTION_PRICE: Record<PotionId, number> = { heal: 50, fullHeal: 150, mana: 50, fullMana: 150, rejuv: 120, fullRejuv: 600 };
export const ELIXIR_PRICE = 5000;

/** D1 scroll values; spells without a scroll are absent. */
export const SCROLL_PRICE: Partial<Record<SpellId, number>> = {
  healing: 50, lightning: 150, inferno: 100, fire_wall: 400, mana_shield: 1200, flash: 500, phasing: 200, fireball: 300,
  stone_curse: 800, chain_lightning: 750, town_portal: 200, identify: 100,
};

/** D1 book values (`bookCost10 × 10`); D1 has no Book of Identify: [OURS] 5 000. */
export const BOOK_PRICE: Record<SpellId, number> = {
  firebolt: 1000, healing: 1000, holy_bolt: 1000, charged_bolt: 1000, lightning: 3000, inferno: 2000, fire_wall: 6000, mana_shield: 16000,
  flash: 7500, telekinesis: 2500, phasing: 3500, fireball: 8000, stone_curse: 12000, chain_lightning: 11000, town_portal: 3000, identify: 5000,
};

/** D1 `PLVal`: the affix's added value at roll `pv` within [p1, p2], interpolated in whole percent. */
export function plVal(pv: number, p1: number, p2: number, minv: number, maxv: number): number {
  if (p1 === p2 || minv === maxv) return minv;
  return minv + Math.trunc((maxv - minv) * Math.trunc(100 * (pv - p1) / (p2 - p1)) / 100);
}

/** Added value and multiplier of one affix as rolled on an item. `props` are the affix's own rolled properties. */
function affixValue(id: AffixId, props: readonly Prop[]): { add: number; mult: number } {
  const [minv, maxv, mult] = AFFIX_PRICE[id], fx = AFFIXES[id].fx;
  // two-effect affixes: the damage effect sets the price (D1)
  const k = fx.length > 1 ? fx.findIndex(f => f.stat === 'pctDmg') : 0, f = fx[k];
  return { add: plVal(props[k]?.v ?? f.min, f.min, f.max, minv, maxv), mult };
}

/** D1 `CalcItemValue`: added values plus the multipliers times the base value, at least 1. */
const combine = (base: number, parts: { add: number; mult: number }[]): number => {
  const mult = parts.reduce((s, p) => s + p.mult, 0), add = parts.reduce((s, p) => s + p.add, 0);
  return Math.max(1, add + (mult > 0 ? mult * base : mult < 0 ? Math.trunc(base / mult) : 0));
};

/** The D1 affix that best stands for a unique's property: the same stat, the range nearest to the value. */
function nearestAffix(stat: Stat, v: number): AffixId | null {
  let best: AffixId | null = null, bd = Infinity;
  for (const [id, a] of Object.entries(AFFIXES) as [AffixId, (typeof AFFIXES)[AffixId]][]) {
    const f = a.fx.find(e => e.stat === stat);
    if (!f || a.fx.length > 1) continue;
    const d = v < f.min ? f.min - v : v > f.max ? v - f.max : 0;
    if (d < bd) { bd = d; best = id; }
  }
  return best;
}

/**
 * Value of an equipment item. Normal items and unidentified magic or unique items are worth their base value (D1).
 * Magic items: D1's formula. Uniques [OURS]: each positive property priced as the nearest D1 affix of that stat, the
 * total ×1.5 (properties without a D1 counterpart, and negative ones, add nothing).
 */
export function equipValue(it: EquipItem): number {
  const base = BASE_PRICE[it.base];
  if (it.q === 'normal' || !it.identified) return base;
  if (it.uniq) {
    const parts = UNIQUES[it.uniq].props.flatMap(p => {
      const id = p.v > 0 ? nearestAffix(p.stat, p.v) : null;
      if (!id) return [];
      const f = AFFIXES[id].fx[0], [minv, maxv, mult] = AFFIX_PRICE[id];
      return [{ add: plVal(Math.min(f.max, Math.max(f.min, p.v)), f.min, f.max, minv, maxv), mult }];
    });
    return Math.round(combine(base, parts) * 1.5);
  }
  const parts: { add: number; mult: number }[] = [];
  let i = 0;
  for (const id of [it.pre, it.suf]) {
    if (!id) continue;
    const n = AFFIXES[id].fx.length;
    parts.push(affixValue(id, it.props.slice(i, i + n)));
    i += n;
  }
  return combine(base, parts);
}

/** What a merchant asks for an item. */
export function itemPrice(it: Item): number {
  switch (it.kind) {
    case 'potion': return POTION_PRICE[it.potion];
    case 'elixir': return ELIXIR_PRICE;
    // scrolls exist only for spells with a scroll qlvl, all of which have a D1 price
    case 'scroll': return SCROLL_PRICE[it.spell]!;
    case 'book': return BOOK_PRICE[it.spell];
    case 'equip': return equipValue(it);
  }
}

/** Merchants pay a quarter of the price (D1), at least 1. */
export const sellPrice = (it: Item): number => Math.max(1, Math.floor(itemPrice(it) / 4));
