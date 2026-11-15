import { describe, expect, it } from 'vitest';
import { BOSS, FAMILIES, FAMILY_IDS, pickFamilies, rollMonster, tierFor, xpCurve } from '../../src/rules/monsters';
import { mulberry32 } from '../../src/core/rng';
import { killXp, xpForLevel } from '../../src/rules/xp';

describe('rollMonster', () => {
  it('uses the family stats unchanged at depth 1', () => {
    const r = rollMonster('skeleton', 1, false);
    expect(r).toMatchObject({ mlvl: 1, hp: FAMILIES.skeleton.hp, dmgMin: 5, dmgMax: 10, ac: 12, toHit: 35 });
  });

  it('adds 35 % HP, 20 % damage and 2 AC per monster level, and 15 % per subtype tier', () => {
    const r = rollMonster('skeleton', 6, false);
    expect(r.mlvl).toBe(6);
    expect(r.tier).toBe(1); // skeletons start at depth 1: tier 1 from depth 5
    expect(r.hp).toBe(Math.round(8 * 2.75 * 1.15));
    expect(r.dmgMin).toBe(Math.round(5 * 2 * 1.15));
    expect(r.dmgMax).toBe(Math.round(10 * 2 * 1.15));
    expect(r.ac).toBe(22);
  });

  it('steps subtype tiers every 4 depths past the family start, capped at 3', () => {
    expect(tierFor('spider', 4)).toBe(0);
    expect(tierFor('spider', 8)).toBe(1);
    expect(tierFor('zombie', 13)).toBe(3);
    expect(tierFor('zombie', 40)).toBe(3);
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

describe('pickFamilies', () => {
  it('picks three different families allowed at the depth', () => {
    const rng = mulberry32(3);
    for (let depth = 1; depth <= 30; depth++) for (let i = 0; i < 20; i++) {
      const fams = pickFamilies(rng, depth);
      expect(new Set(fams).size).toBe(3);
      for (const f of fams) expect(FAMILIES[f].depth[0]).toBeLessThanOrEqual(depth);
    }
  });

  it('never picks a family before its first depth or after its last when enough others qualify', () => {
    const rng = mulberry32(4);
    for (let i = 0; i < 200; i++) {
      const fams = pickFamilies(rng, 2);
      expect(fams).not.toContain('spider');
      expect(fams).not.toContain('archer');
    }
    for (let i = 0; i < 200; i++) expect(pickFamilies(rng, 11)).not.toContain('rat');
  });

  it('uses every family somewhere', () => {
    const rng = mulberry32(5), seen = new Set<string>();
    for (let depth = 1; depth <= 16; depth++) for (let i = 0; i < 30; i++) pickFamilies(rng, depth).forEach(f => seen.add(f));
    expect([...seen].sort()).toEqual([...FAMILY_IDS].sort());
  });
});
