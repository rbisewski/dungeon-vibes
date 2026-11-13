/** Potions (D1, Jarulf's Guide §3.2.2). SPEC.md §1.3, §7. */
import type { Rng } from '../core/rng';
import { CLASS, type ClassId } from './classes';

export type PotionId = 'heal' | 'fullHeal' | 'mana' | 'fullMana' | 'rejuv' | 'fullRejuv';

export interface PotionDef {
  name: string;
  /** D1 quality level: the potion can drop once ilvl ≥ qlvl. */
  qlvl: number;
  /** Relative drop weight among potions [OURS]; D1 picks uniformly from all bases. */
  weight: number;
  life: 'none' | 'part' | 'full';
  mana: 'none' | 'part' | 'full';
}

export const POTIONS: Record<PotionId, PotionDef> = {
  heal: { name: 'Potion of Healing', qlvl: 1, weight: 50, life: 'part', mana: 'none' },
  fullHeal: { name: 'Potion of Full Healing', qlvl: 1, weight: 8, life: 'full', mana: 'none' },
  mana: { name: 'Potion of Mana', qlvl: 1, weight: 22, life: 'none', mana: 'part' },
  fullMana: { name: 'Potion of Full Mana', qlvl: 1, weight: 5, life: 'none', mana: 'full' },
  rejuv: { name: 'Potion of Rejuvenation', qlvl: 3, weight: 10, life: 'part', mana: 'part' },
  fullRejuv: { name: 'Potion of Full Rejuvenation', qlvl: 7, weight: 5, life: 'full', mana: 'full' },
};
export const POTION_IDS = Object.keys(POTIONS) as PotionId[];

/** Weighted pick among potions whose qlvl ≤ ilvl. */
export function rollPotion(rng: Rng, ilvl: number): PotionId {
  const ok = POTION_IDS.filter(id => POTIONS[id].qlvl <= ilvl);
  let r = rng() * ok.reduce((s, id) => s + POTIONS[id].weight, 0);
  for (const id of ok) { r -= POTIONS[id].weight; if (r < 0) return id; }
  return ok[ok.length - 1];
}

/**
 * Life and mana restored, before capping at the maximum. Partial potions restore
 * `bonus · [1/8, 3/8] · max`, with the class bonus (Warrior heal 2.0 / mana 1.0).
 */
export function potionEffect(id: PotionId, cls: ClassId, maxLife: number, maxMana: number, rng: Rng): { life: number; mana: number } {
  const p = POTIONS[id], b = CLASS[cls].potion;
  const part = (bonus: number, max: number): number => Math.round(bonus * (1 / 8 + rng() / 4) * max);
  return {
    life: p.life === 'full' ? maxLife : p.life === 'part' ? part(b.heal, maxLife) : 0,
    mana: p.mana === 'full' ? maxMana : p.mana === 'part' ? part(b.mana, maxMana) : 0,
  };
}
