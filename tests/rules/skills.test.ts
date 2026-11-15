import { describe, expect, it } from 'vitest';
import { BASES } from '../../src/rules/bases';
import { CLASS, CLASS_IDS, KITS } from '../../src/rules/classes';
import { eligibleBases } from '../../src/rules/loot';
import { disarmChance, manaSurge } from '../../src/rules/skills';
import { canLearn } from '../../src/rules/spells';
import { derive } from '../../src/rules/stats';

describe('disarmChance', () => {
  it('is 2·Dex − 5·depth, clamped to 0–100 (D1)', () => {
    expect(disarmChance(30, 1)).toBe(55);
    expect(disarmChance(30, 12)).toBe(0);
    expect(disarmChance(80, 2)).toBe(100);
  });
});

describe('manaSurge', () => {
  it('moves 20 % of current life into mana', () => {
    expect(manaSurge(50, 0, 100)).toBe(10);
  });

  it('only fills the missing mana and does nothing when mana is full', () => {
    expect(manaSurge(50, 95, 100)).toBe(5);
    expect(manaSurge(50, 100, 100)).toBe(0);
  });

  it('never takes life below 1', () => {
    expect(manaSurge(1, 0, 100)).toBe(0);
    expect(manaSurge(2, 0, 100)).toBe(0);
    for (let life = 1; life < 40; life++) expect(life - manaSurge(life, 0, 100)).toBeGreaterThanOrEqual(1);
  });
});

describe('kits', () => {
  it('gives each class a weapon it can wield with its starting attributes', () => {
    for (const cls of CLASS_IDS) {
      const req = BASES[KITS[cls].weapon].req, base = CLASS[cls].base;
      for (const [a, v] of Object.entries(req)) expect(base[a as keyof typeof base]).toBeGreaterThanOrEqual(v);
    }
  });

  it('starts the Mage with Firebolt 2 (D1) and Charged Bolt 1, both within its Intelligence', () => {
    expect(KITS.mage.spells).toEqual([['firebolt', 2], ['charged_bolt', 1]]);
    expect(canLearn('firebolt', 1, CLASS.mage.base.int)).toBe(2);
    expect(canLearn('charged_bolt', 0, CLASS.mage.base.int)).toBe(1);
  });

  it('gives the Thief the fastest bow and the Mage the fastest cast', () => {
    const bow = Object.fromEntries(CLASS_IDS.map(c => [c, derive({ cls: c, clvl: 1, base: CLASS[c].base }, undefined, { kind: 'bow', min: 1, max: 4 }).attackTime]));
    expect(bow.thief).toBeLessThan(bow.warrior);
    expect(bow.thief).toBeLessThan(bow.mage);
    expect(CLASS.mage.cast).toBeLessThan(CLASS.thief.cast);
    expect(CLASS.thief.cast).toBeLessThan(CLASS.warrior.cast);
  });
});

describe('bows in the drop pool', () => {
  it('lists bows twice (D1)', () => {
    const pool = eligibleBases(1);
    expect(pool.filter(id => id === 'short_bow')).toHaveLength(2);
    expect(pool.filter(id => id === 'dagger')).toHaveLength(1);
  });
});
