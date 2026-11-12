import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../src/core/rng';
import { CLASS } from '../../src/rules/classes';
import { arrowHitChance, blockChance, magicHitChance, meleeHitChance, monsterHitChance, rollDamage, staggers } from '../../src/rules/combat';
import { derive } from '../../src/rules/stats';

const warrior = derive({ cls: 'warrior', clvl: 1, base: { ...CLASS.warrior.base } });
const thief = derive({ cls: 'thief', clvl: 1, base: { ...CLASS.thief.base } });
const mage = derive({ cls: 'mage', clvl: 1, base: { ...CLASS.mage.base } });

describe('hit chances', () => {
  it('adds clvl and the Warrior melee bonus, minus monster AC', () => {
    expect(meleeHitChance('warrior', warrior, 1, 10)).toBe(71); // 50 + 10 + 1 + 20 − 10
  });

  it('clamps player chances to 5–95', () => {
    expect(meleeHitChance('warrior', warrior, 1, 500)).toBe(5);
    expect(meleeHitChance('warrior', warrior, 40, 0)).toBe(95);
  });

  it('uses full Dex for arrows and penalises flight time', () => {
    expect(arrowHitChance('thief', thief, 1, 0, 0)).toBe(95); // 50 + 30 + 1 + 20 → capped
    expect(arrowHitChance('thief', thief, 1, 0, 10)).toBe(51); // 101 − 50
  });

  it('ignores monster AC for spells and drops 2 per monster level', () => {
    expect(magicHitChance('mage', mage, 5)).toBe(95); // 50 + 35 − 10 + 20 = 95
    expect(magicHitChance('warrior', warrior, 20)).toBe(20); // 50 + 10 − 40
  });

  it('never lets monsters drop below 15 %', () => {
    expect(monsterHitChance(20, 1, 1, 30)).toBe(20);
    expect(monsterHitChance(20, 1, 30, 200)).toBe(15);
  });

  it('clamps block to 0–100', () => {
    expect(blockChance('warrior', warrior, 1, 1)).toBe(50); // 20 + 2 + 30 − 2
    expect(blockChance('mage', mage, 1, 30)).toBe(0);
  });
});

describe('rollDamage', () => {
  it('stays within the derived range for non-crit classes', () => {
    const rng = mulberry32(7), d = { ...thief, dmgMin: 2, dmgMax: 6 };
    for (let i = 0; i < 500; i++) {
      const { dmg, crit } = rollDamage(rng, d);
      expect(crit).toBe(false);
      expect(dmg).toBeGreaterThanOrEqual(2);
      expect(dmg).toBeLessThanOrEqual(6);
    }
  });

  it('doubles damage on a Warrior crit', () => {
    const rng = mulberry32(3), d = { ...warrior, dmgMin: 5, dmgMax: 5, critPct: 100 };
    expect(rollDamage(rng, d)).toEqual({ dmg: 10, crit: true });
  });
});

describe('staggers', () => {
  it('needs at least mlvl + 3 damage', () => {
    expect(staggers(7, 4)).toBe(true);
    expect(staggers(6, 4)).toBe(false);
  });
});

describe('mulberry32', () => {
  it('replays the same sequence for the same seed', () => {
    const a = mulberry32(1234), b = mulberry32(1234);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });
});
