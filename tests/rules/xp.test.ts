import { describe, expect, it } from 'vitest';
import { gainXp, killXp, levelForXp, MAX_LEVEL, XP_CAP } from '../../src/rules/xp';

describe('levelForXp', () => {
  it('follows the D1 thresholds', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(1999)).toBe(1);
    expect(levelForXp(2000)).toBe(2);
    expect(levelForXp(63364)).toBe(10);
    expect(levelForXp(1310707109)).toBe(50);
  });

  it('never exceeds level 50', () => {
    expect(levelForXp(XP_CAP + 1)).toBe(MAX_LEVEL);
  });
});

describe('killXp', () => {
  it('gives +10 % per monster level above the character', () => {
    expect(killXp(100, 5, 3)).toBe(120);
  });

  it('reaches zero once the character is 10 levels above the monster', () => {
    expect(killXp(100, 1, 10)).toBe(10);
    expect(killXp(100, 1, 11)).toBe(0);
    expect(killXp(100, 1, 30)).toBe(0);
  });
});

describe('gainXp', () => {
  it('grants 5 points per level, including multi-level jumps', () => {
    const p = { clvl: 1, xp: 0, unspent: 0 };
    expect(gainXp(p, 4620)).toBe(2);
    expect(p).toEqual({ clvl: 3, xp: 4620, unspent: 10 });
  });

  it('caps experience at MAX and level at 50', () => {
    const p = { clvl: 49, xp: 1082908612, unspent: 0 };
    gainXp(p, 10 ** 10);
    expect(p.xp).toBe(XP_CAP);
    expect(p.clvl).toBe(50);
    expect(p.unspent).toBe(5);
  });
});
