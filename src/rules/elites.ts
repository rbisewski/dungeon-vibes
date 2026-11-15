/** Elite packs (SPEC §8.4): a named leader with one modifier and 2–4 escorts that share it. */
import type { Rng } from '../core/rng';
import { goldAmount, rollItem, type Drop, type LootCtx } from './loot';
import type { MonsterRoll } from './monsters';

export type EliteMod = 'fast' | 'stoneskin' | 'vampiric' | 'berserker' | 'spellcaster';
export const ELITE_MODS: readonly EliteMod[] = ['fast', 'stoneskin', 'vampiric', 'berserker', 'spellcaster'];
export const ELITE_MOD_NAME: Record<EliteMod, string> = { fast: 'Fast', stoneskin: 'Stoneskin', vampiric: 'Vampiric', berserker: 'Berserker', spellcaster: 'Spellcaster' };

/** First depth with elites, and the chance per level of one pack. */
export const ELITE = { fromDepth: 3, chance: .2, lvlBonus: 5, leaderHp: 3, escortHp: 2, escorts: [2, 4] as const, stoneskinAc: 50, berserkerDmg: 1.5 };

const HEAD = ['Gut', 'Bone', 'Blood', 'Grim', 'Rot', 'Skull', 'Gore', 'Ash', 'Black', 'Vile', 'Bile', 'Grave'];
const TAIL = ['ripper', 'gnaw', 'maw', 'fang', 'claw', 'hide', 'fist', 'spine', 'tooth', 'eye', 'rot', 'mangler'];
const EPITHET = ['Foul', 'Cruel', 'Hungry', 'Wretched', 'Unclean', 'Merciless', 'Defiler', 'Twisted', 'Cursed', 'Pale', 'Gnawing', 'Black'];

const pickOf = <T>(rng: Rng, a: readonly T[]): T => a[Math.floor(rng() * a.length)];

/** A D1-style unique monster name, e.g. "Gutripper the Foul". */
export const eliteName = (rng: Rng): string => `${pickOf(rng, HEAD)}${pickOf(rng, TAIL)} the ${pickOf(rng, EPITHET)}`;

/** Applies the pack's HP multiplier and its modifier's stat change to a rolled monster (leader rolled at mlvl + 5). */
export function eliteRoll(r: MonsterRoll, mod: EliteMod, leader: boolean): MonsterRoll {
  const out = { ...r, hp: r.hp * (leader ? ELITE.leaderHp : ELITE.escortHp) };
  if (mod === 'stoneskin') out.ac += ELITE.stoneskinAc;
  if (mod === 'berserker') { out.dmgMin = Math.round(out.dmgMin * ELITE.berserkerDmg); out.dmgMax = Math.round(out.dmgMax * ELITE.berserkerDmg); }
  return out;
}

/** A leader drops like a D1 unique monster: one item that is always magic (16 % unique), plus gold. */
export const eliteDrops = (rng: Rng, mlvl: number, depth: number, ctx: LootCtx): Drop[] => [
  { kind: 'item', item: rollItem(rng, mlvl, depth, ctx, 'equip', true) },
  { kind: 'gold', amount: 3 * goldAmount(rng, mlvl) },
];
