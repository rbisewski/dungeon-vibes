/** Hit, block, damage, crit and stagger rules (D1, Jarulf's Guide §2.1.4, §2.2, §5.1, §6.2). SPEC.md §1.1, §3.3. */
import { clamp } from '../core/math';
import type { Rng } from '../core/rng';
import { CLASS, type ClassId } from './classes';
import type { Derived } from './stats';

/** Player melee chance (%) against a monster: 50 + Dex/2 + items + clvl + class bonus − monster AC, in [5, 95]. */
export function meleeHitChance(cls: ClassId, d: Derived, clvl: number, monsterAc: number): number {
  return clamp(d.toHitShown + clvl + CLASS[cls].hit.melee - monsterAc, 5, 95);
}

/** Player arrow chance (%): uses full Dex and loses distance²/2, where distance is flight time in 1/20 s ticks. */
export function arrowHitChance(cls: ClassId, d: Derived, clvl: number, monsterAc: number, flightTicks: number): number {
  const shown = d.toHitShown - Math.floor(d.attr.dex / 2) + d.attr.dex;
  return clamp(shown + clvl + CLASS[cls].hit.arrow - monsterAc - (flightTicks * flightTicks) / 2, 5, 95);
}

/** Player spell chance (%): 50 + Int − 2·mlvl + class bonus; monster AC does not apply. */
export function magicHitChance(cls: ClassId, d: Derived, mlvl: number): number {
  return clamp(50 + d.attr.int - 2 * mlvl + CLASS[cls].hit.magic, 5, 95);
}

/** Monster melee chance (%) against the player: 30 + base + 2·(mlvl − clvl) − AC, never below 15. */
export function monsterHitChance(monsterToHit: number, mlvl: number, clvl: number, playerAc: number): number {
  return Math.max(15, 30 + monsterToHit + 2 * (mlvl - clvl) - playerAc);
}

/** Block chance (%) with a shield: Dex + 2·clvl + class bonus − 2·mlvl, in [0, 100]. */
export function blockChance(cls: ClassId, d: Derived, clvl: number, mlvl: number): number {
  return clamp(d.attr.dex + 2 * clvl + CLASS[cls].blockBonus - 2 * mlvl, 0, 100);
}

/** True with probability `pct`%. */
export const roll = (rng: Rng, pct: number): boolean => rng() * 100 < pct;

/** Uniform integer damage in [dmgMin, dmgMax], doubled on a critical hit. */
export function rollDamage(rng: Rng, d: Derived): { dmg: number; crit: boolean } {
  const lo = Math.max(1, d.dmgMin), hi = Math.max(lo, d.dmgMax);
  const base = lo + Math.floor(rng() * (hi - lo + 1));
  const crit = d.critPct > 0 && roll(rng, d.critPct);
  return { dmg: crit ? base * 2 : base, crit };
}

/** A hit only interrupts (stuns) a monster when it deals at least mlvl + 3 damage. */
export const staggers = (dmg: number, mlvl: number): boolean => dmg >= mlvl + 3;
