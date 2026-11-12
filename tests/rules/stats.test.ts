import { describe, expect, it } from 'vitest';
import { CLASS, type ClassId } from '../../src/rules/classes';
import { derive, NO_BONUS, spendPoint, type Bonus, type CharState } from '../../src/rules/stats';

const fresh = (cls: ClassId, clvl = 1): CharState & { unspent: number } => ({ cls, clvl, base: { ...CLASS[cls].base }, unspent: 0 });

describe('derive', () => {
  it.each([
    ['warrior', 70, 10],
    ['thief', 45, 22],
    ['mage', 30, 70],
  ] as const)('a new %s starts with the D1 life and mana', (cls, life, mana) => {
    const d = derive(fresh(cls));
    expect(d.maxLife).toBe(life);
    expect(d.maxMana).toBe(mana);
  });

  it('gives no life or mana for reaching level 50', () => {
    expect(derive(fresh('warrior', 50)).maxLife).toBe(derive(fresh('warrior', 49)).maxLife);
    expect(derive(fresh('mage', 50)).maxMana).toBe(derive(fresh('mage', 49)).maxMana);
  });

  it('weights item Vitality per class (Thief 1.5x, Warrior 2x of base)', () => {
    const bonus: Bonus = { ...NO_BONUS, attr: { str: 0, int: 0, dex: 0, vit: 10 } };
    expect(derive(fresh('thief'), bonus).maxLife - derive(fresh('thief')).maxLife).toBe(15);
    expect(derive(fresh('warrior'), bonus).maxLife - derive(fresh('warrior')).maxLife).toBe(20);
  });

  it('uses Dex for AC and shown to-hit, rounding down', () => {
    const d = derive(fresh('thief'));
    expect(d.ac).toBe(6); // 30 / 5
    expect(d.toHitShown).toBe(65); // 50 + 30 / 2
  });

  it('adds Str·clvl/100 to a Warrior sword and scales weapon damage by +% damage', () => {
    const ch = fresh('warrior', 10); // Str 30 → +3
    const d = derive(ch, { ...NO_BONUS, pctDmg: 50 }, { kind: 'sword', min: 2, max: 6 });
    expect(d.dmgMin).toBe(6); // 2 * 1.5 + 3
    expect(d.dmgMax).toBe(12); // 6 * 1.5 + 3
  });

  it('gives crits only to Warriors, at clvl %', () => {
    expect(derive(fresh('warrior', 12)).critPct).toBe(12);
    expect(derive(fresh('thief', 12)).critPct).toBe(0);
  });

  it('uses the class swing time for the equipped weapon kind', () => {
    expect(derive(fresh('thief'), NO_BONUS, { kind: 'bow', min: 1, max: 4 }).attackTime).toBe(0.35);
    expect(derive(fresh('mage'), NO_BONUS, { kind: 'axe', min: 2, max: 10 }).attackTime).toBe(0.8);
  });
});

describe('spendPoint', () => {
  it('moves one unspent point into the attribute', () => {
    const ch = fresh('warrior'); ch.unspent = 2;
    expect(spendPoint(ch, 'str')).toBe(true);
    expect(ch.base.str).toBe(31);
    expect(ch.unspent).toBe(1);
  });

  it('refuses without unspent points', () => {
    const ch = fresh('warrior');
    expect(spendPoint(ch, 'str')).toBe(false);
    expect(ch.base.str).toBe(30);
  });

  it('refuses at the class cap', () => {
    const ch = fresh('warrior'); ch.unspent = 1; ch.base.int = CLASS.warrior.cap.int;
    expect(spendPoint(ch, 'int')).toBe(false);
    expect(ch.unspent).toBe(1);
  });
});
