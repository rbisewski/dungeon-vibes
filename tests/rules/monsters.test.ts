import { describe, expect, it } from 'vitest';
import { BOSS, FAMILIES, rollMonster, xpCurve } from '../../src/rules/monsters';
import { killXp, xpForLevel } from '../../src/rules/xp';

describe('rollMonster', () => {
  it('uses the family stats unchanged at depth 1', () => {
    const r = rollMonster('skeleton', 1, false);
    expect(r).toMatchObject({ mlvl: 1, hp: FAMILIES.skeleton.hp, dmgMin: 5, dmgMax: 10, ac: 12, toHit: 35 });
  });

  it('adds 35 % HP, 20 % damage and 2 AC per monster level', () => {
    const r = rollMonster('skeleton', 6, false);
    expect(r.mlvl).toBe(6);
    expect(r.hp).toBe(Math.round(8 * 2.75));
    expect(r.dmgMin).toBe(Math.round(5 * 2));
    expect(r.dmgMax).toBe(20);
    expect(r.ac).toBe(22);
  });

  it('applies the per-spawn HP variance', () => {
    expect(rollMonster('slime', 1, false, 0.9).hp).toBe(Math.round(12 * 0.9));
  });

  it('makes bosses tougher than their family two levels deeper', () => {
    const boss = rollMonster('skeleton', 3, true), grunt = rollMonster('skeleton', 3 + BOSS.lvlBonus, false);
    expect(boss.mlvl).toBe(grunt.mlvl);
    expect(boss.hp).toBe(Math.round(FAMILIES.skeleton.hp * (1 + 0.35 * (boss.mlvl - 1)) * BOSS.hpMul));
    expect(boss.baseXp).toBeGreaterThan(grunt.baseXp * (BOSS.xpMul - 1));
  });
});

describe('XP pacing', () => {
  it('reaches level 2 after roughly 35 depth-1 kills', () => {
    const perKill = killXp(rollMonster('skeleton', 1, false).baseXp, 1, 1);
    expect(perKill).toBe(Math.round(xpCurve(1)));
    const kills = Math.ceil(xpForLevel(2) / perKill);
    expect(kills).toBeGreaterThanOrEqual(30);
    expect(kills).toBeLessThanOrEqual(40);
  });
});
