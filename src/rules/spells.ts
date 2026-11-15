/**
 * Spells: D1 data (Jarulf's Guide §4.1) with the deviations tagged in SPEC.md §5.2. Pure: callers pass the rng and
 * the caster's numbers.
 */
import type { Rng } from '../core/rng';
import { CLASS, type ClassId } from './classes';

export type School = 'fire' | 'lightning' | 'magic' | 'holy' | 'utility';
/** How a spell is delivered, for aiming and AUTO. */
export type Delivery = 'bolt' | 'line' | 'self' | 'nova' | 'cone' | 'wall' | 'utility';

export interface SpellDef {
  name: string;
  school: School;
  delivery: Delivery;
  /** Intelligence needed to learn slvl 1 from a book. */
  learnInt: number;
  /** Mana at slvl 1, decrease per slvl, floor. */
  mana: { initial: number; dec: number; min: number };
  /** qlvl of the book / scroll; null when it does not exist. */
  bookQ: number | null;
  scrollQ: number | null;
  /** Aim range in world units (2 per tile). */
  range: number;
  /** AUTO may cast it at monsters (SPEC §14). */
  attack: boolean;
}

/** Minimum mana is ceil(initial / 2) [OURS]; Healing's cost is computed separately. */
const S = (name: string, school: School, delivery: Delivery, learnInt: number, mana: [number, number], bookQ: number | null, scrollQ: number | null, range: number, attack: boolean): SpellDef =>
  ({ name, school, delivery, learnInt, mana: { initial: mana[0], dec: mana[1], min: Math.ceil(mana[0] / 2) }, bookQ, scrollQ, range, attack });

export const SPELLS = {
  firebolt: S('Firebolt', 'fire', 'bolt', 15, [6, .5], 1, null, 16, true),
  healing: S('Healing', 'holy', 'self', 17, [8, 0], 1, 1, 0, false),
  holy_bolt: S('Holy Bolt', 'holy', 'bolt', 20, [7, 1], 1, null, 16, true),
  charged_bolt: S('Charged Bolt', 'lightning', 'bolt', 25, [6, 0], 1, null, 9, true),
  lightning: S('Lightning', 'lightning', 'line', 20, [10, 1], 4, 4, 10, true),
  inferno: S('Inferno', 'fire', 'cone', 20, [11, 1], 3, 1, 3.5, true),
  fire_wall: S('Fire Wall', 'fire', 'wall', 27, [28, 2], 3, 4, 4, false),
  mana_shield: S('Mana Shield', 'magic', 'self', 25, [33, 0], 6, 8, 0, false),
  flash: S('Flash', 'magic', 'nova', 33, [30, 2], 5, 6, 3.2, true),
  telekinesis: S('Telekinesis', 'utility', 'utility', 33, [15, 2], 2, null, 8, false),
  phasing: S('Phasing', 'utility', 'utility', 39, [12, 2], 7, 6, 8, false),
  fireball: S('Fireball', 'fire', 'bolt', 48, [16, 1], 8, 8, 16, true),
  stone_curse: S('Stone Curse', 'magic', 'bolt', 51, [60, 3], 6, 6, 10, false),
  chain_lightning: S('Chain Lightning', 'lightning', 'line', 54, [30, 1], 8, 10, 10, true),
  // D1: mana 35, −3 per level; min 18 by our ceil(initial/2) rule (SPEC §13)
  town_portal: S('Town Portal', 'utility', 'utility', 20, [35, 3], 3, 4, 0, false),
  identify: { name: 'Identify', school: 'utility', delivery: 'utility', learnInt: 60, mana: { initial: 10, dec: 0, min: 10 }, bookQ: 10, scrollQ: 1, range: 0, attack: false },
} as const satisfies Record<string, SpellDef>;

export type SpellId = keyof typeof SPELLS;
export const SPELL_IDS = Object.keys(SPELLS) as SpellId[];
export const MAX_SLVL = 15;

/**
 * Int needed to learn level `n` (D1): the slvl-1 value ×1.2 per extra level; 213 or more becomes 255, out of reach
 * without items.
 */
export function learnReq(id: SpellId, n: number): number {
  const r = Math.round(SPELLS[id].learnInt * 1.2 ** (n - 1));
  return r >= 213 ? 255 : r;
}

/**
 * Int needed to read a scroll [OURS]: three quarters of the book requirement. Scrolls of Identify [USER] and Town
 * Portal [OURS, as in D1] need none, so every class can use them.
 */
export const scrollReq = (id: SpellId): number => (id === 'identify' || id === 'town_portal' ? 0 : Math.ceil(.75 * SPELLS[id].learnInt));

/** Whether a book of `id` can be read now; returns the level it would teach, or null. */
export function canLearn(id: SpellId, known: number, int: number): number | null {
  const n = known + 1;
  return n <= MAX_SLVL && int >= learnReq(id, n) ? n : null;
}

/**
 * Mana per cast (D1): the initial cost minus the per-level decrease, never below the floor; Healing costs
 * `8 + 2·clvl − 3·slvl` (floor 4). The class multiplier (Thief 0.75) applies but cannot go under the floor.
 */
export function manaCost(id: SpellId, slvl: number, clvl: number, cls: ClassId): number {
  const m = SPELLS[id].mana;
  const raw = id === 'healing' ? Math.max(4, 8 + 2 * clvl - 3 * slvl) : Math.max(m.min, m.initial - m.dec * (slvl - 1));
  const floor = id === 'healing' ? 4 : m.min;
  return Math.max(floor, Math.ceil(raw * CLASS[cls].manaCost));
}

export interface Caster { cls: ClassId; clvl: number; slvl: number; int: number }

const rnd = (rng: Rng, n: number): number => Math.floor(rng() * n);
const ri = (rng: Rng, a: number, b: number): number => a + rnd(rng, b - a + 1);
/** D1 `Rec(slvl, x)`: ×9/8 once per spell level. */
const rec = (slvl: number, x: number): number => Math.floor(x * (9 / 8) ** slvl);
/** [OURS] scaling for spells whose D1 formula we do not reproduce: +10 % per level above 1. */
const lvl = (slvl: number, x: number): number => Math.floor(x * (1 + .1 * (slvl - 1)));

/** Damage of one hit (one spark for Charged Bolt, one tick for Inferno and Fire Wall). */
export function spellDamage(id: SpellId, rng: Rng, c: Caster): number {
  switch (id) {
    case 'firebolt': return rnd(rng, 10) + c.slvl + Math.floor(c.int / 8) + 1;
    case 'charged_bolt': return ri(rng, 1, 1 + Math.floor(c.int / 4));
    case 'holy_bolt': return ri(rng, 9 + c.clvl, 18 + c.clvl);
    case 'lightning': case 'chain_lightning': return lvl(c.slvl, ri(rng, 4, 4 + 2 * c.clvl));
    case 'fireball': return rec(c.slvl, 2 * (rnd(rng, 10) + rnd(rng, 10) + c.clvl) + 4);
    // [OURS] approximations, SPEC §5.2:
    case 'inferno': return lvl(c.slvl, ri(rng, 1, 3 + Math.floor(c.clvl / 2)));
    case 'fire_wall': return lvl(c.slvl, ri(rng, 1, 4 + Math.floor(c.clvl / 2)));
    case 'flash': return lvl(c.slvl, ri(rng, 2 + c.clvl, 4 + 3 * c.clvl));
    default: return 0;
  }
}

/** D1 Healing: class bonus × (Rnd[10] + Σclvl (Rnd[4]+1) + Σslvl (Rnd[6]+1) + 1). */
export function healAmount(rng: Rng, c: Caster): number {
  let v = rnd(rng, 10) + 1;
  for (let i = 0; i < c.clvl; i++) v += rnd(rng, 4) + 1;
  for (let i = 0; i < c.slvl; i++) v += rnd(rng, 6) + 1;
  return Math.floor(v * CLASS[c.cls].healSpell);
}

/** Charged Bolt sparks per cast (D1: 4 + slvl/2). */
export const sparkCount = (slvl: number): number => 4 + Math.floor(slvl / 2);
/** Stone Curse duration in seconds (D1: 4.8 + 0.8·slvl, at most 12). */
export const stoneTime = (slvl: number): number => Math.min(12, 4.8 + .8 * slvl);
/** Fire Wall duration [OURS]: 4 + 2·slvl seconds. */
export const fireWallTime = (slvl: number): number => 4 + 2 * slvl;
/** Chain Lightning arc radius in world units (D1: 2 + slvl tiles). */
export const chainRange = (slvl: number): number => Math.min(14, 2 * (2 + slvl));

/** Short text for the spellbook: the damage or effect at this level. */
export function spellEffectText(id: SpellId, c: Caster): string {
  switch (id) {
    case 'firebolt': return `DAMAGE ${c.slvl + Math.floor(c.int / 8) + 1}-${c.slvl + Math.floor(c.int / 8) + 10}`;
    case 'charged_bolt': return `${sparkCount(c.slvl)} SPARKS, 1-${1 + Math.floor(c.int / 4)} EACH`;
    case 'holy_bolt': return `DAMAGE ${9 + c.clvl}-${18 + c.clvl}, UNDEAD ONLY`;
    case 'lightning': case 'chain_lightning': return `DAMAGE ${lvl(c.slvl, 4)}-${lvl(c.slvl, 4 + 2 * c.clvl)}`;
    case 'fireball': return `DAMAGE ${rec(c.slvl, 2 * c.clvl + 4)}-${rec(c.slvl, 2 * (18 + c.clvl) + 4)}`;
    case 'inferno': return `DAMAGE ${lvl(c.slvl, 1)}-${lvl(c.slvl, 3 + Math.floor(c.clvl / 2))} PER TICK`;
    case 'fire_wall': return `${fireWallTime(c.slvl)} S, ${lvl(c.slvl, 1)}-${lvl(c.slvl, 4 + Math.floor(c.clvl / 2))} PER TICK`;
    case 'flash': return `DAMAGE ${lvl(c.slvl, 2 + c.clvl)}-${lvl(c.slvl, 4 + 3 * c.clvl)}`;
    case 'healing': {
      const k = CLASS[c.cls].healSpell;
      return `HEALS ${Math.floor((1 + c.clvl + c.slvl) * k)}-${Math.floor((10 + 4 * c.clvl + 6 * c.slvl) * k)}`;
    }
    case 'stone_curse': return `PETRIFIES FOR ${stoneTime(c.slvl).toFixed(1)} S`;
    case 'mana_shield': return 'DAMAGE TAKEN FROM MANA';
    case 'telekinesis': return 'FETCHES ITEMS, OPENS CHESTS';
    case 'town_portal': return 'OPENS A PORTAL TO TOWN';
    case 'phasing': return 'SHORT RANDOM TELEPORT';
    case 'identify': return 'IDENTIFIES ONE ITEM';
  }
}
