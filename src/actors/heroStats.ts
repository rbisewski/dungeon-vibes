import { SFX } from '../audio/sfx';
import { R, rr } from '../core/math';
import { G } from '../game/state';
import type { Hero, Monster } from '../game/types';
import { fxAdd } from '../render/particles';
import { CLASS, type Attr } from '../rules/classes';
import { base } from '../rules/bases';
import { addItem, countPotions, EQUIP_SLOTS, meetsReq, newEquip, newInventory, newPotion, putInGrid, takeFromBelt, type Inventory } from '../rules/inventory';
import { POTIONS, potionEffect, type PotionId } from '../rules/potions';
import { derive, FISTS, NO_BONUS, spendPoint, type Bonus, type Weapon } from '../rules/stats';
import { gainXp, killXp } from '../rules/xp';
import { toast } from '../ui/store';

/** Equipment bonuses: only gear whose requirements are met counts (D1). Item attribute bonuses arrive in Phase 4. */
function gear(h: Hero): { bonus: Bonus; weapon: Weapon } {
  const attrs = h.stats.base, eq = h.inv.equip;
  let ac = 0;
  for (const s of EQUIP_SLOTS) { const it = eq[s]; if (it && meetsReq(it, attrs)) ac += it.ac; }
  const w = eq.weapon, wb = w && meetsReq(w, attrs) ? base(w.base) : null;
  const weapon: Weapon = wb && wb.kind === 'weapon' ? { kind: wb.wk, min: wb.dmg[0], max: wb.dmg[1] } : FISTS;
  return { bonus: { ...NO_BONUS, ac }, weapon };
}

/** A usable shield is equipped (needed to block). */
export const heroHasShield = (h: Hero): boolean => !!h.inv.equip.shield && meetsReq(h.inv.equip.shield, h.stats.base);

/**
 * Re-derives stats after any change to level, attributes or equipment. Raising max life/mana raises the current
 * values by the same amount (D1 behaviour when adding Vitality/Intelligence); current values never exceed the max.
 */
export function recompute(h: Hero): void {
  const prev = h.d;
  const g = gear(h);
  h.d = derive(h.stats, g.bonus, g.weapon);
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

/** D1 Warrior kit: Short Sword and Buckler equipped, a Club in the backpack, two Potions of Healing on the belt. */
export function startingInventory(): Inventory {
  const inv = newInventory();
  inv.equip.weapon = newEquip('short_sword');
  inv.equip.shield = newEquip('buckler', R());
  putInGrid(inv.pack, newEquip('club'));
  addItem(inv, newPotion('heal')); addItem(inv, newPotion('heal'));
  return inv;
}

const DRINK_RGB: Record<'life' | 'mana' | 'both', [number, number, number]> = { life: [1.4, .25, .4], mana: [.35, .6, 1.8], both: [1.1, .4, 1.6] };

/** Applies a potion's effect. Movement slows for the 0.7 s drink animation. */
export function drinkPotion(p: PotionId): void {
  const h = G.hero;
  const e = potionEffect(p, h.stats.cls, h.d.maxLife, h.d.maxMana, R);
  h.life = Math.min(h.d.maxLife, h.life + e.life);
  h.mana = Math.min(h.d.maxMana, h.mana + e.mana);
  h.drink = .7;
  SFX.drink();
  const [r, g, b] = DRINK_RGB[e.life && e.mana ? 'both' : e.mana ? 'mana' : 'life'];
  for (let k = 0; k < 26; k++) fxAdd.spawn(h.x + rr(-.4, .4), rr(.2, 1.2), h.z + rr(-.4, .4), rr(-.3, .3), rr(.8, 2), rr(-.3, .3), rr(.6, 1.2), r, g, b, rr(.05, .08), -.5, .5, 2);
}

/** Drinks the potion in a belt slot (no-op when empty). */
export function drinkFromBelt(slot: number): void {
  const h = G.hero;
  if (h.dead || h.descend > 0) return;
  const it = takeFromBelt(h.inv, slot);
  if (it?.kind === 'potion') drinkPotion(it.potion);
}

/** Elixir: +1 to a base attribute, refused at the class maximum. Returns whether it was consumed. */
export function drinkElixir(a: Attr): boolean {
  const h = G.hero;
  if (h.stats.base[a] >= CLASS[h.stats.cls].cap[a]) { toast('ALREADY AT MAXIMUM'); return false; }
  h.stats.base[a]++;
  recompute(h);
  SFX.levelUp();
  return true;
}

/** Gives the hero a Potion of Healing if they carry no life potion at all (used after death, until Phase 7). */
export function ensureHealingPotion(h: Hero): void {
  if (countPotions(h.inv, p => POTIONS[p].life !== 'none') === 0) addItem(h.inv, newPotion('heal'));
}
