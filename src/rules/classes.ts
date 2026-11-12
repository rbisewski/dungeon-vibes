/**
 * Character classes. Values are Diablo 1 Warrior / Rogue / Sorcerer data (Jarulf's Guide §2.1–2.3), with D1's
 * Magic renamed Intelligence. See SPEC.md §1.1, §1.1a, §3.1.
 */

export type ClassId = 'warrior' | 'thief' | 'mage';
export type Attr = 'str' | 'int' | 'dex' | 'vit';
export type Attrs = Record<Attr, number>;
export const ATTRS: readonly Attr[] = ['str', 'int', 'dex', 'vit'];

/** Weapon families that differ in swing time. */
export type WeaponKind = 'sword' | 'club' | 'axe' | 'staff' | 'bow' | 'bare';

/** `pool = perBase·base + perItem·fromItems + perLevel·min(clvl, 49) + flatItems + k` (no gain at level 50, as in D1). */
export interface PoolFormula { perBase: number; perItem: number; perLevel: number; k: number }

export interface ClassDef {
  name: string;
  base: Attrs;
  cap: Attrs;
  life: PoolFormula;
  /** Mana uses Intelligence. */
  mana: PoolFormula;
  /** Character damage added to melee weapon damage. */
  meleeChar: (a: Attrs, clvl: number) => number;
  /** Character damage added to bow damage. */
  bowChar: (a: Attrs, clvl: number) => number;
  /** Hidden to-hit bonuses (not shown on the character screen). */
  hit: { melee: number; arrow: number; magic: number };
  blockBonus: number;
  potion: { heal: number; mana: number };
  healSpell: number;
  /** Multiplier on spell mana cost. */
  manaCost: number;
  /** Only Warriors land critical hits (chance clvl %). */
  crit: boolean;
  /** Seconds per attack by weapon kind. */
  swing: Record<WeaponKind, number>;
  /** Seconds per spell cast. */
  cast: number;
  /** Hit-recovery (flinch) time in seconds. */
  recover: number;
  /** D1 arrow speed units (32 = monster arrow). */
  arrowSpeed: (clvl: number) => number;
}

export const CLASS: Record<ClassId, ClassDef> = {
  warrior: {
    name: 'Warrior',
    base: { str: 30, int: 10, dex: 20, vit: 25 },
    cap: { str: 250, int: 50, dex: 60, vit: 100 },
    life: { perBase: 2, perItem: 2, perLevel: 2, k: 18 },
    mana: { perBase: 1, perItem: 1, perLevel: 1, k: -1 },
    meleeChar: (a, c) => (a.str * c) / 100,
    bowChar: (a, c) => (a.str * c) / 200,
    hit: { melee: 20, arrow: 10, magic: 0 },
    blockBonus: 30,
    potion: { heal: 2, mana: 1 },
    healSpell: 2,
    manaCost: 1,
    crit: true,
    swing: { sword: 0.45, club: 0.45, axe: 0.5, staff: 0.55, bow: 0.55, bare: 0.45 },
    cast: 0.7,
    recover: 0.3,
    arrowSpeed: c => 32 + (c - 1) / 8,
  },
  thief: {
    name: 'Thief',
    base: { str: 20, int: 15, dex: 30, vit: 20 },
    cap: { str: 55, int: 70, dex: 250, vit: 80 },
    life: { perBase: 1, perItem: 1.5, perLevel: 2, k: 23 },
    mana: { perBase: 1, perItem: 1.5, perLevel: 2, k: 5 },
    meleeChar: (a, c) => ((a.str + a.dex) * c) / 200,
    bowChar: (a, c) => ((a.str + a.dex) * c) / 200,
    hit: { melee: 0, arrow: 20, magic: 0 },
    blockBonus: 20,
    potion: { heal: 1.5, mana: 1.5 },
    healSpell: 1.5,
    manaCost: 0.75,
    crit: false,
    swing: { sword: 0.5, club: 0.5, axe: 0.65, staff: 0.55, bow: 0.35, bare: 0.5 },
    cast: 0.6,
    recover: 0.35,
    arrowSpeed: c => 32 + (c - 1) / 4,
  },
  mage: {
    name: 'Mage',
    base: { str: 15, int: 35, dex: 15, vit: 20 },
    cap: { str: 45, int: 250, dex: 85, vit: 80 },
    life: { perBase: 1, perItem: 1, perLevel: 1, k: 9 },
    mana: { perBase: 2, perItem: 2, perLevel: 2, k: -2 },
    meleeChar: (a, c) => (a.str * c) / 100,
    bowChar: (a, c) => (a.str * c) / 200,
    hit: { melee: 0, arrow: 0, magic: 20 },
    blockBonus: 10,
    potion: { heal: 1, mana: 2 },
    healSpell: 1,
    manaCost: 1,
    crit: false,
    swing: { sword: 0.6, club: 0.6, axe: 0.8, staff: 0.6, bow: 0.8, bare: 0.6 },
    cast: 0.4,
    recover: 0.4,
    arrowSpeed: () => 32,
  },
};
