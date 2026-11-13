import { SFX } from '../audio/sfx';
import { R, rr } from '../core/math';
import { G } from '../game/state';
import type { Hero, Monster } from '../game/types';
import { fxAdd } from '../render/particles';
import type { Attr } from '../rules/classes';
import { addItem, countPotions, newInventory, newPotion, takeFromBelt, type Inventory } from '../rules/inventory';
import { POTIONS, potionEffect } from '../rules/potions';
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

/** D1 Warrior kit: two Potions of Healing on the belt. */
export function startingInventory(): Inventory {
  const inv = newInventory();
  addItem(inv, newPotion('heal')); addItem(inv, newPotion('heal'));
  return inv;
}

const DRINK_RGB: Record<'life' | 'mana' | 'both', [number, number, number]> = { life: [1.4, .25, .4], mana: [.35, .6, 1.8], both: [1.1, .4, 1.6] };

/** Drinks the potion in a belt slot (no-op when empty). Movement slows for the 0.7 s drink animation. */
export function drinkFromBelt(slot: number): void {
  const h = G.hero;
  if (h.dead || h.descend > 0) return;
  const it = takeFromBelt(h.inv, slot);
  if (!it) return;
  const e = potionEffect(it.potion, h.stats.cls, h.d.maxLife, h.d.maxMana, R);
  h.life = Math.min(h.d.maxLife, h.life + e.life);
  h.mana = Math.min(h.d.maxMana, h.mana + e.mana);
  h.drink = .7;
  SFX.drink();
  const [r, g, b] = DRINK_RGB[e.life && e.mana ? 'both' : e.mana ? 'mana' : 'life'];
  for (let k = 0; k < 26; k++) fxAdd.spawn(h.x + rr(-.4, .4), rr(.2, 1.2), h.z + rr(-.4, .4), rr(-.3, .3), rr(.8, 2), rr(-.3, .3), rr(.6, 1.2), r, g, b, rr(.05, .08), -.5, .5, 2);
}

/** Gives the hero a Potion of Healing if they carry no life potion at all (used after death, until Phase 7). */
export function ensureHealingPotion(h: Hero): void {
  if (countPotions(h.inv, p => POTIONS[p].life !== 'none') === 0) addItem(h.inv, newPotion('heal'));
}
