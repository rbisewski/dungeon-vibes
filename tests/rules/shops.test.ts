import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../src/core/rng';
import { AFFIXES } from '../../src/rules/affixes';
import { base } from '../../src/rules/bases';
import { newBook, newEquip, newPotion, newScroll } from '../../src/rules/inventory';
import { equipValue } from '../../src/rules/prices';
import {
  buys, levelPremium, MAX_PEDDLER_VALUE, MAX_VENDOR_VALUE, rollHealer, rollPeddler, rollPremium, rollPremiumList,
  rollSmithBasic, rollWitch, storeIlvl,
} from '../../src/rules/shops';

const isStaff = (id: Parameters<typeof base>[0]) => { const b = base(id); return b.kind === 'weapon' && b.wk === 'staff'; };

describe('shops', () => {
  it('derives the shop ilvl from the deepest level reached, between 6 and 16 (D1)', () => {
    expect([0, 4, 5, 10, 14, 30].map(storeIlvl)).toEqual([6, 6, 7, 12, 16, 16]);
  });

  it('lets only the smith and the witch buy, each their own kinds', () => {
    expect(buys('smith', newEquip('short_sword'))).toBe(true);
    expect(buys('smith', newEquip('long_staff'))).toBe(false);
    expect(buys('witch', newEquip('long_staff'))).toBe(true);
    expect(buys('witch', newBook('firebolt'))).toBe(true);
    expect(buys('witch', newScroll('healing'))).toBe(true);
    expect(buys('witch', newPotion('mana'))).toBe(false);
    expect(buys('healer', newPotion('heal'))).toBe(false);
    expect(buys('peddler', newEquip('short_sword'))).toBe(false);
  });

  it('stocks the smith with 10–19 normal, non-staff, non-jewelry items within the ilvl', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 100; i++) {
      const s = rollSmithBasic(rng, 8);
      expect(s.length).toBeGreaterThanOrEqual(10);
      expect(s.length).toBeLessThanOrEqual(19);
      for (const it of s) {
        expect(it.q).toBe('normal');
        expect(isStaff(it.base) || base(it.base).kind === 'jewelry').toBe(false);
        expect(base(it.base).qlvl).toBeLessThanOrEqual(8);
      }
    }
  });

  it('makes premium items magic, identified, within D1 windows and the value cap', () => {
    const rng = mulberry32(2);
    for (let i = 0; i < 300; i++) {
      const plvl = 1 + (i % 30), it = rollPremium(rng, plvl);
      expect(it.q).toBe('magic');
      expect(it.identified).toBe(true);
      expect(it.uniq).toBeNull();
      expect(isStaff(it.base)).toBe(false);
      expect(base(it.base).qlvl).toBeLessThanOrEqual(plvl);
      for (const a of [it.pre, it.suf]) if (a) expect(AFFIXES[a].qlvl).toBeLessThanOrEqual(plvl);
      expect(equipValue(it)).toBeLessThanOrEqual(MAX_VENDOR_VALUE);
    }
  });

  it('shifts the premium list on a level-up: items 2–4 move down and two slots reroll (D1)', () => {
    const rng = mulberry32(3), list = rollPremiumList(rng, 5), next = levelPremium(rng, list, 5, 6);
    expect(next).toHaveLength(6);
    expect([next[0], next[1], next[2], next[4]]).toEqual([list[2], list[3], list[4], list[5]]);
    expect(list).not.toContain(next[3]);
    expect(list).not.toContain(next[5]);
  });

  it('keeps the witch to books, scrolls and staves, never her fixed scrolls', () => {
    const rng = mulberry32(4);
    for (let i = 0; i < 100; i++) for (const it of rollWitch(rng, 16)) {
      expect(buys('witch', it)).toBe(true);
      if (it.kind === 'scroll') expect(['town_portal', 'identify']).not.toContain(it.spell);
      if (it.kind === 'equip') expect(it.identified).toBe(true);
    }
  });

  it('offers Full Rejuvenation at the healer only from its qlvl', () => {
    const rng = mulberry32(5);
    const kinds = (ilvl: number) => new Set(Array.from({ length: 50 }, () => rollHealer(rng, ilvl)).flat().map(it => (it.kind === 'potion' ? it.potion : it.kind)));
    expect(kinds(6).has('fullRejuv')).toBe(false);
    expect(kinds(8).has('fullRejuv')).toBe(true);
  });

  it('gives the peddler a magic item worth at most 90 000', () => {
    const rng = mulberry32(6);
    for (let clvl = 1; clvl <= 40; clvl++) {
      const it = rollPeddler(rng, clvl);
      expect(it.q).toBe('magic');
      expect(equipValue(it)).toBeLessThanOrEqual(MAX_PEDDLER_VALUE);
    }
  });
});
