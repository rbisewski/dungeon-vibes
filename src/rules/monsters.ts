/** Monster families, subtypes and per-depth scaling. SPEC.md §8.1–8.3, §9. */
import type { Rng } from '../core/rng';

export type FamilyId = 'rat' | 'skeleton' | 'slime' | 'zombie' | 'fallen' | 'archer' | 'bat' | 'spider';

export interface Family {
  name: string;
  /** HP, damage range, armor class and base to-hit at mlvl 1. */
  hp: number;
  dmg: readonly [number, number];
  ac: number;
  toHit: number;
  xpMul: number;
  /** mlvl = depth + lvlOff (min 1). */
  lvlOff: number;
  undead: boolean;
  /** Depths the family appears on. Past `depth[1]` it only fills in when fewer than three families qualify. */
  depth: readonly [number, number];
  /** Subtype names by tier (D1-style recolours). */
  subtypes: readonly [string, string, string, string];
}

/**
 * Damage and to-hit sit above D1 (about ×2 damage, +10 to-hit), as tuned for the first three families in Phase 1; at
 * D1 values the heroes were almost never hurt. SPEC §8.3.
 */
export const FAMILIES: Record<FamilyId, Family> = {
  rat: { name: 'Rat', hp: 6, dmg: [4, 8], ac: 5, toHit: 30, xpMul: 0.8, lvlOff: 0, undead: false, depth: [1, 8], subtypes: ['Rat', 'Sewer Rat', 'Plague Rat', 'Bloat Rat'] },
  skeleton: { name: 'Skeleton', hp: 8, dmg: [5, 10], ac: 10, toHit: 35, xpMul: 1.0, lvlOff: 0, undead: true, depth: [1, 14], subtypes: ['Skeleton', 'Corpse Axe', 'Burning Dead', 'Horror'] },
  slime: { name: 'Slime', hp: 12, dmg: [6, 11], ac: 0, toHit: 30, xpMul: 1.1, lvlOff: 0, undead: false, depth: [2, 12], subtypes: ['Ooze', 'Bog Slime', 'Acid Slime', 'Grave Jelly'] },
  zombie: { name: 'Zombie', hp: 12, dmg: [5, 11], ac: 5, toHit: 25, xpMul: 1.1, lvlOff: 0, undead: true, depth: [1, 10], subtypes: ['Zombie', 'Ghoul', 'Rotting Carcass', 'Black Death'] },
  fallen: { name: 'Fallen', hp: 5, dmg: [3, 6], ac: 5, toHit: 30, xpMul: 0.7, lvlOff: 0, undead: false, depth: [1, 9], subtypes: ['Fallen One', 'Carver', 'Devil Kin', 'Dark One'] },
  archer: { name: 'Skeleton Archer', hp: 7, dmg: [3, 7], ac: 8, toHit: 40, xpMul: 1.2, lvlOff: 0, undead: true, depth: [3, 14], subtypes: ['Skeleton Archer', 'Corpse Bow', 'Burning Archer', 'Horror Archer'] },
  bat: { name: 'Bat', hp: 4, dmg: [3, 6], ac: 10, toHit: 35, xpMul: 0.6, lvlOff: 0, undead: false, depth: [2, 12], subtypes: ['Fiend', 'Blink', 'Gloom', 'Familiar'] },
  spider: { name: 'Giant Spider', hp: 10, dmg: [4, 9], ac: 15, toHit: 40, xpMul: 1.4, lvlOff: 0, undead: false, depth: [4, 16], subtypes: ['Cave Spider', 'Giant Spider', 'Venom Spider', 'Spider Lord'] },
};
export const FAMILY_IDS = Object.keys(FAMILIES) as FamilyId[];

/** Families per level (SPEC §8.2, mirroring D1's limit). */
export const FAMILIES_PER_LEVEL = 3;

/**
 * The families a level draws its monsters from: three of those whose depth range includes `depth`, picked uniformly.
 * When fewer qualify (very deep levels), the families whose range ended most recently fill in.
 */
export function pickFamilies(rng: Rng, depth: number): FamilyId[] {
  const inRange = FAMILY_IDS.filter(f => FAMILIES[f].depth[0] <= depth && depth <= FAMILIES[f].depth[1]);
  const pool = [...inRange];
  const out: FamilyId[] = [];
  while (out.length < FAMILIES_PER_LEVEL && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  const late = FAMILY_IDS.filter(f => !out.includes(f) && FAMILIES[f].depth[0] <= depth).sort((a, b) => FAMILIES[b].depth[1] - FAMILIES[a].depth[1]);
  while (out.length < FAMILIES_PER_LEVEL && late.length) out.push(late.shift()!);
  return out;
}

/** Subtype tier: one step every 4 depths past the family's first depth, at most 3 (SPEC §8.1). */
export const tierFor = (family: FamilyId, depth: number): number => Math.max(0, Math.min(3, Math.floor((depth - FAMILIES[family].depth[0]) / 4)));
/** Each tier adds 15 % HP and damage. */
export const TIER_STEP = .15;

/** Boss multipliers over its family's stats at mlvl = depth + 2 (SPEC §9). */
export const BOSS = { lvlBonus: 2, hpMul: 5, dmgMul: 1.5, xpMul: 8 };

export interface MonsterRoll {
  family: FamilyId;
  tier: number;
  mlvl: number;
  hp: number;
  dmgMin: number;
  dmgMax: number;
  ac: number;
  toHit: number;
  /** Base XP before the clvl adjustment in `killXp`. */
  baseXp: number;
  /** Holy Bolt only hurts undead. */
  undead: boolean;
}

/** Base experience for a monster level before the family multiplier. */
export const xpCurve = (mlvl: number): number => 40 * Math.pow(mlvl, 1.6) + 20;

/**
 * Stats for one spawned monster. `hpVar` (≈0.9–1.1) is the per-spawn HP variance, passed in so the rules stay
 * deterministic for tests and simulations. `tier` overrides the depth's subtype tier (boss summons such as Cave
 * Spiders and Burning Dead).
 */
export function rollMonster(family: FamilyId, depth: number, boss: boolean, hpVar = 1, tierOverride?: number): MonsterRoll {
  const f = FAMILIES[family], tier = boss ? 0 : tierOverride ?? tierFor(family, depth);
  const mlvl = Math.max(1, depth + f.lvlOff + (boss ? BOSS.lvlBonus : 0));
  const tierMul = 1 + TIER_STEP * tier;
  const hpScale = (1 + 0.35 * (mlvl - 1)) * tierMul, dmgScale = (1 + 0.2 * (mlvl - 1)) * tierMul;
  const hpMul = boss ? BOSS.hpMul : 1, dmgMul = boss ? BOSS.dmgMul : 1;
  return {
    family,
    tier,
    mlvl,
    hp: Math.max(1, Math.round(f.hp * hpScale * hpVar * hpMul)),
    dmgMin: Math.round(f.dmg[0] * dmgScale * dmgMul),
    dmgMax: Math.round(f.dmg[1] * dmgScale * dmgMul),
    ac: f.ac + 2 * mlvl,
    toHit: f.toHit,
    baseXp: Math.round(f.xpMul * (boss ? BOSS.xpMul : 1) * xpCurve(mlvl)),
    undead: f.undead,
  };
}

/** Monster arrows use the monster's melee to-hit minus 2 per 1/20 s of flight (SPEC §8.5). */
export const arrowPenalty = (flightSec: number): number => 2 * flightSec * 20;
/** Monster magic to-hit: 40 + 2·(mlvl − clvl), clamped 5–95; armor does not apply (SPEC §8.5). */
export const monsterMagicHit = (mlvl: number, clvl: number): number => Math.max(5, Math.min(95, 40 + 2 * (mlvl - clvl)));
