import { SFX } from '../audio/sfx';
import { rr } from '../core/math';
import { G } from '../game/state';
import type { Hero, Monster } from '../game/types';
import { fxAdd } from '../render/particles';
import { CLASS, type Attr } from '../rules/classes';
import { derive, NO_BONUS, spendPoint, type Bonus, type Weapon } from '../rules/stats';
import { gainXp, killXp } from '../rules/xp';
import { toast } from '../ui/store';

/**
 * D1 Warrior starting equipment: Short Sword (2–6) and a Buckler (AC 1–5, taken at its middle roll).
 * Replaced by real equipped items in the inventory phase.
 */
const STARTING_WEAPON: Readonly<Weapon> = { kind: 'sword', min: 2, max: 6 };
const STARTING_SHIELD_AC = 3;

function equipBonus(): Bonus {
  return { ...NO_BONUS, ac: STARTING_SHIELD_AC };
}

export const heroHasShield = (): boolean => STARTING_SHIELD_AC > 0;

/**
 * Re-derives stats after any change to level, attributes or equipment. Raising max life/mana raises the current
 * values by the same amount (D1 behaviour when adding Vitality/Intelligence); current values never exceed the max.
 */
export function recompute(h: Hero): void {
  const prev = h.d;
  h.d = derive(h.stats, equipBonus(), STARTING_WEAPON);
  if (prev) {
    h.life += Math.max(0, h.d.maxLife - prev.maxLife);
    h.mana += Math.max(0, h.d.maxMana - prev.maxMana);
  }
  h.life = Math.min(h.life, h.d.maxLife);
  h.mana = Math.min(h.mana, h.d.maxMana);
}

/** Grants XP for a kill made by the hero and handles any level-ups (full restore, toast, effects). */
export function awardKill(m: Monster): void {
  const h = G.hero, s = h.stats;
  const levels = gainXp(s, killXp(m.roll.baseXp, m.roll.mlvl, s.clvl));
  if (!levels) return;
  recompute(h);
  h.life = h.d.maxLife;
  h.mana = h.d.maxMana;
  SFX.levelUp();
  toast(`LEVEL ${s.clvl}`, `+${s.unspent} POINTS - PRESS C`);
  for (let k = 0; k < 60; k++) {
    const a = rr(0, Math.PI * 2), r = rr(.2, .7);
    fxAdd.spawn(h.x + Math.cos(a) * r, rr(.1, .4), h.z + Math.sin(a) * r, Math.cos(a) * .4, rr(2, 4.5), Math.sin(a) * .4, rr(.8, 1.6), 1.8, 1.4, .5, rr(.05, .09), 1.2, .6, 2);
  }
}

export function spendHeroPoint(a: Attr): boolean {
  const h = G.hero;
  if (!spendPoint(h.stats, a)) return false;
  recompute(h);
  return true;
}

/** D1 Potion of Healing: restores bonus·[1/8, 3/8] of max life (Warrior bonus 2 → 25–75 %). */
export function potionHeal(h: Hero): number {
  return CLASS[h.stats.cls].potion.heal * rr(1 / 8, 3 / 8) * h.d.maxLife;
}
