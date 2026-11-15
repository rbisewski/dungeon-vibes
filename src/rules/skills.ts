/** Class skills on R (SPEC §3.1a): Warrior War Cry, Thief Disarm Trap (D1), Mage Mana Surge. */
import { clamp } from '../core/math';
import type { ClassId } from './classes';

export type SkillId = 'war_cry' | 'disarm' | 'mana_surge';

export interface SkillDef { name: string; cooldown: number; desc: string }

export const SKILLS: Record<SkillId, SkillDef> = {
  war_cry: { name: 'War Cry', cooldown: 20, desc: 'STUNS MONSTERS WITHIN 4 M FOR 1 S. BOSSES ARE SLOWED.' },
  disarm: { name: 'Disarm Trap', cooldown: 1, desc: 'DISABLES A TRAP WITHIN 1.5 M FOR GOOD.' },
  mana_surge: { name: 'Mana Surge', cooldown: 30, desc: 'TURNS 20% OF CURRENT LIFE INTO MANA.' },
};

export const CLASS_SKILL: Record<ClassId, SkillId> = { warrior: 'war_cry', thief: 'disarm', mage: 'mana_surge' };

export const WAR_CRY = { radius: 4, stun: 1, bossSlow: .3, bossSlowTime: 1 } as const;
export const DISARM_RANGE = 1.5;

/** D1 Disarm Trap: success if 2·Dex − 5·dlvl > Rnd[100], i.e. that many percent, clamped to 0–100. */
export const disarmChance = (dex: number, depth: number): number => clamp(2 * dex - 5 * depth, 0, 100);

/**
 * Mana Surge: 20 % of current life becomes the same amount of mana, limited to the missing mana and never taking
 * life below 1. Returns the amount moved (0 when mana is already full).
 */
export function manaSurge(life: number, mana: number, maxMana: number): number {
  return Math.max(0, Math.floor(Math.min(life * .2, maxMana - mana, life - 1)));
}
