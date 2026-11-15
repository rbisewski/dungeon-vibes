import { SFX } from '../audio/sfx';
import { R, rr } from '../core/math';
import { G } from '../game/state';
import type { Hero, Monster } from '../game/types';
import { fxAdd } from '../render/particles';
import { CLASS, KITS, type Attr, type ClassId } from '../rules/classes';
import { base } from '../rules/bases';
import { setHeldWeapon } from './models/heroModel';
import { gear } from '../rules/gear';
import { addItem, newEquip, newInventory, newPotion, putInGrid, takeFromBelt, type Inventory } from '../rules/inventory';
import { potionEffect, type PotionId } from '../rules/potions';
import { derive, spendPoint } from '../rules/stats';
import { gainXp, killXp } from '../rules/xp';
import { toast } from '../ui/store';

/**
 * Re-derives stats after any change to level, attributes or equipment. Raising max life/mana raises the current
 * values by the same amount (D1 behaviour when adding Vitality/Intelligence); current values never exceed the max.
 */
export function recompute(h: Hero): void {
  const prev = h.d;
  const g = gear(h.inv.equip, h.stats.base), shown = gear(h.inv.equip, h.stats.base, true);
  h.d = derive(h.stats, g.bonus, g.weapon);
  h.dShown = derive(h.stats, shown.bonus, shown.weapon);
  // Max life lost to Black Death hits (SPEC §8.3).
  h.d.maxLife = Math.max(1, h.d.maxLife - h.lifeDrain);
  h.dShown.maxLife = Math.max(1, h.dShown.maxLife - h.lifeDrain);
  h.gearOk = g.active;
  // The hand shows the equipped weapon even when its requirements are unmet.
  const w = h.inv.equip.weapon, wb = w && base(w.base), held = wb && wb.kind === 'weapon' ? wb.wk : 'bare';
  if (held !== h.heldKind) { h.heldKind = held; setHeldWeapon(h, held); }
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

/** The class's D1 starting kit (SPEC §3.1). */
export function startingInventory(cls: ClassId): Inventory {
  const inv = newInventory(), kit = KITS[cls];
  inv.equip.weapon = newEquip(kit.weapon);
  if (kit.shield) inv.equip.shield = newEquip(kit.shield, R());
  for (const id of kit.pack) putInGrid(inv.pack, newEquip(id));
  for (const p of kit.belt) addItem(inv, newPotion(p));
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
