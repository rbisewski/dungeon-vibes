/** Monster families and per-depth scaling. SPEC.md §8.1, §8.3, §9. */

export type FamilyId = 'rat' | 'skeleton' | 'slime';

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
}

export const FAMILIES: Record<FamilyId, Family> = {
  rat: { name: 'Rat', hp: 6, dmg: [4, 8], ac: 5, toHit: 30, xpMul: 0.8, lvlOff: 0, undead: false },
  skeleton: { name: 'Skeleton', hp: 8, dmg: [5, 10], ac: 10, toHit: 35, xpMul: 1.0, lvlOff: 0, undead: true },
  slime: { name: 'Slime', hp: 12, dmg: [6, 11], ac: 0, toHit: 30, xpMul: 1.1, lvlOff: 0, undead: false },
};

/** Boss multipliers over its family's stats at mlvl = depth + 2. */
export const BOSS = { family: 'skeleton' as FamilyId, lvlBonus: 2, hpMul: 5, dmgMul: 1.5, xpMul: 8 };

export interface MonsterRoll {
  mlvl: number;
  hp: number;
  dmgMin: number;
  dmgMax: number;
  ac: number;
  toHit: number;
  /** Base XP before the clvl adjustment in `killXp`. */
  baseXp: number;
}

/** Base experience for a monster level before the family multiplier. */
export const xpCurve = (mlvl: number): number => 40 * Math.pow(mlvl, 1.6) + 20;

/**
 * Stats for one spawned monster. `hpVar` (≈0.9–1.1) is the per-spawn HP variance, passed in so the rules stay
 * deterministic for tests and simulations.
 */
export function rollMonster(family: FamilyId, depth: number, boss: boolean, hpVar = 1): MonsterRoll {
  const f = FAMILIES[family];
  const mlvl = Math.max(1, depth + f.lvlOff + (boss ? BOSS.lvlBonus : 0));
  const hpScale = 1 + 0.35 * (mlvl - 1), dmgScale = 1 + 0.2 * (mlvl - 1);
  const hpMul = boss ? BOSS.hpMul : 1, dmgMul = boss ? BOSS.dmgMul : 1;
  return {
    mlvl,
    hp: Math.max(1, Math.round(f.hp * hpScale * hpVar * hpMul)),
    dmgMin: Math.round(f.dmg[0] * dmgScale * dmgMul),
    dmgMax: Math.round(f.dmg[1] * dmgScale * dmgMul),
    ac: f.ac + 2 * mlvl,
    toHit: f.toHit,
    baseXp: Math.round(f.xpMul * (boss ? BOSS.xpMul : 1) * xpCurve(mlvl)),
  };
}
