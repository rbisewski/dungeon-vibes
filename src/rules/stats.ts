/** Derived character stats from class, level, base attributes and item bonuses. SPEC.md §1.1, §3.1. */
import { ATTRS, CLASS, type Attr, type Attrs, type ClassId, type PoolFormula, type WeaponKind } from './classes';

/** Sum of all applied item bonuses. Every field is additive except `critMul`. */
export interface Bonus {
  attr: Attrs;
  life: number;
  mana: number;
  /** Armor class from items (each item's own armor, +% armor and flat armor). */
  ac: number;
  /** +% To-Hit from items. */
  toHit: number;
  /** +% damage done (weapon damage). */
  pctDmg: number;
  /** Flat damage added to each hit. */
  flatDmg: number;
  /** Damage from enemies reduced by this much per hit. */
  dmgTaken: number;
  /** % of melee damage dealt returned as life / mana. */
  lifeSteal: number;
  manaSteal: number;
  /** % shorter attack time. */
  attackSpeed: number;
  /** Thorns points: attackers take 1–3 damage per point. */
  thorns: number;
  spellLevels: number;
  /** Multiplier on critical-hit chance. */
  critMul: number;
}

export const NO_BONUS: Readonly<Bonus> = {
  attr: { str: 0, int: 0, dex: 0, vit: 0 }, life: 0, mana: 0, ac: 0, toHit: 0, pctDmg: 0, flatDmg: 0,
  dmgTaken: 0, lifeSteal: 0, manaSteal: 0, attackSpeed: 0, thorns: 0, spellLevels: 0, critMul: 1,
};

export interface Weapon { kind: WeaponKind; min: number; max: number }
/** Bare hands. */
export const FISTS: Readonly<Weapon> = { kind: 'bare', min: 1, max: 1 };

export interface CharState {
  cls: ClassId;
  clvl: number;
  base: Attrs;
}

export interface Derived {
  /** Base + items, never below 0. */
  attr: Attrs;
  maxLife: number;
  maxMana: number;
  ac: number;
  /** To-Hit % as shown on the character screen (`50 + Dex/2 + items`), before hidden bonuses, clvl and monster AC. */
  toHitShown: number;
  /** Melee damage range including character damage and item bonuses. */
  dmgMin: number;
  dmgMax: number;
  /** Chance (%) of a critical hit; 0 for classes without crits. */
  critPct: number;
  /** Seconds per weapon swing, after attack-speed bonuses. */
  attackTime: number;
  /** Weapon kind attacked with (fists when the equipped weapon's requirements are unmet). */
  weaponKind: WeaponKind;
  /** Combat properties passed through from items. */
  dmgTaken: number;
  lifeSteal: number;
  manaSteal: number;
  thorns: number;
  spellLevels: number;
}

function pool(f: PoolFormula, base: number, items: number, clvl: number, flat: number): number {
  // D1: reaching level 50 adds no life or mana.
  return f.perBase * base + f.perItem * items + f.perLevel * Math.min(clvl, 49) + flat + f.k;
}

/** The single source of truth for derived stats; call after any change to level, attributes or equipment. */
export function derive(ch: CharState, bonus: Readonly<Bonus> = NO_BONUS, weapon: Readonly<Weapon> = FISTS): Derived {
  const def = CLASS[ch.cls];
  const attr = {} as Attrs;
  for (const a of ATTRS) attr[a] = Math.max(0, ch.base[a] + bonus.attr[a]);
  const charDmg = (weapon.kind === 'bow' ? def.bowChar : def.meleeChar)(attr, ch.clvl);
  const mul = 1 + bonus.pctDmg / 100;
  return {
    attr,
    maxLife: pool(def.life, ch.base.vit, bonus.attr.vit, ch.clvl, bonus.life),
    maxMana: pool(def.mana, ch.base.int, bonus.attr.int, ch.clvl, bonus.mana),
    ac: Math.floor(attr.dex / 5) + bonus.ac,
    toHitShown: 50 + Math.floor(attr.dex / 2) + bonus.toHit,
    dmgMin: Math.floor(weapon.min * mul + bonus.flatDmg + charDmg),
    dmgMax: Math.floor(weapon.max * mul + bonus.flatDmg + charDmg),
    critPct: def.crit ? Math.min(100, ch.clvl * bonus.critMul) : 0,
    attackTime: def.swing[weapon.kind] * (1 - bonus.attackSpeed / 100),
    weaponKind: weapon.kind,
    dmgTaken: bonus.dmgTaken,
    lifeSteal: bonus.lifeSteal,
    manaSteal: bonus.manaSteal,
    thorns: bonus.thorns,
    spellLevels: bonus.spellLevels,
  };
}

/**
 * Fraction of max mana regenerated per second, every class [OURS, SPEC §4]. D1 has none outside items; tuned so a
 * Mage without a town to buy potions can keep casting.
 */
export const MANA_REGEN = .015;

/** Spends one unspent point on `a`; refuses when no points remain or the attribute is at its class cap. */
export function spendPoint(ch: CharState & { unspent: number }, a: Attr): boolean {
  if (ch.unspent <= 0 || ch.base[a] >= CLASS[ch.cls].cap[a]) return false;
  ch.base[a]++;
  ch.unspent--;
  return true;
}
