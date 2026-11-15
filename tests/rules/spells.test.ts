import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../src/core/rng';
import { newBook, newScroll } from '../../src/rules/inventory';
import { categoryWeights, rollBookSpell, rollItem, rollScrollSpell } from '../../src/rules/loot';
import { canLearn, healAmount, learnReq, manaCost, MAX_SLVL, scrollReq, spellDamage, SPELL_IDS, SPELLS } from '../../src/rules/spells';

describe('learning', () => {
  it('needs the D1 Intelligence for each next level (×1.2 per level, 255 from 213)', () => {
    expect(learnReq('firebolt', 1)).toBe(15);
    expect(learnReq('firebolt', 2)).toBe(18);
    expect(learnReq('chain_lightning', 1)).toBe(54);
    expect(learnReq('chain_lightning', 8)).toBe(193); // 54·1.2^7
    expect(learnReq('chain_lightning', 9)).toBe(255); // 54·1.2^8 ≈ 232 ≥ 213
  });

  it('refuses a book without enough Intelligence and teaches the next level otherwise', () => {
    expect(canLearn('firebolt', 0, 14)).toBeNull();
    expect(canLearn('firebolt', 0, 15)).toBe(1);
    expect(canLearn('firebolt', 1, 17)).toBeNull();
    expect(canLearn('firebolt', 1, 18)).toBe(2);
  });

  it('stops at spell level 15', () => {
    expect(canLearn('firebolt', MAX_SLVL, 255)).toBeNull();
  });

  it('lets scrolls be read with three quarters of the book requirement, and Identify with none', () => {
    expect(scrollReq('fireball')).toBe(36);
    expect(scrollReq('identify')).toBe(0);
  });
});

describe('manaCost', () => {
  it('drops per spell level down to half the initial cost', () => {
    expect(manaCost('fire_wall', 1, 1, 'warrior')).toBe(28);
    expect(manaCost('fire_wall', 3, 1, 'warrior')).toBe(24);
    expect(manaCost('fire_wall', 15, 1, 'warrior')).toBe(14);
  });

  it('gives the Thief a 25 % discount without going under the floor', () => {
    expect(manaCost('flash', 1, 1, 'thief')).toBe(23);
    expect(manaCost('flash', 15, 1, 'thief')).toBe(15);
  });

  it('uses the D1 Healing formula 8 + 2·clvl − 3·slvl, at least 4', () => {
    expect(manaCost('healing', 1, 10, 'warrior')).toBe(25);
    expect(manaCost('healing', 10, 2, 'warrior')).toBe(4);
  });
});

describe('damage', () => {
  const c = { cls: 'warrior' as const, clvl: 5, slvl: 2, int: 24 };

  it('rolls Firebolt as Rnd[10] + slvl + Int/8 + 1', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 500; i++) {
      const d = spellDamage('firebolt', rng, c);
      expect(d).toBeGreaterThanOrEqual(2 + 3 + 1 - 1);
      expect(d).toBeLessThanOrEqual(9 + 2 + 3 + 1);
    }
  });

  it('rolls Holy Bolt in 9 + clvl … 18 + clvl', () => {
    const rng = mulberry32(2);
    for (let i = 0; i < 500; i++) {
      const d = spellDamage('holy_bolt', rng, c);
      expect(d).toBeGreaterThanOrEqual(14);
      expect(d).toBeLessThanOrEqual(23);
    }
  });

  it('heals a Warrior twice as much as a Mage on the same rolls', () => {
    const w = healAmount(mulberry32(3), { ...c, cls: 'warrior' }), m = healAmount(mulberry32(3), { ...c, cls: 'mage' });
    expect(w).toBe(m * 2);
  });

  it('makes Fireball stronger with spell level', () => {
    const lo = spellDamage('fireball', mulberry32(4), { ...c, slvl: 1 }), hi = spellDamage('fireball', mulberry32(4), { ...c, slvl: 8 });
    expect(hi).toBeGreaterThan(lo);
  });
});

describe('drops', () => {
  it('drops scrolls and books', () => {
    expect(categoryWeights(1)).toMatchObject({ scroll: 15, book: 8 });
  });

  it('only drops books and scrolls whose qlvl is reached', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 2000; i++) {
      const b = rollBookSpell(rng, 3), s = rollScrollSpell(rng, 3);
      expect(SPELLS[b].bookQ).toBeLessThanOrEqual(3);
      expect(SPELLS[s].scrollQ).toBeLessThanOrEqual(3);
    }
  });

  it('makes about half of all scrolls Identify', () => {
    const rng = mulberry32(6);
    let n = 0;
    for (let i = 0; i < 4000; i++) if (rollScrollSpell(rng, 20) === 'identify') n++;
    expect(n / 4000).toBeCloseTo(.5, 1);
  });

  it('has a book or scroll for every spell', () => {
    for (const id of SPELL_IDS) expect(SPELLS[id].bookQ !== null || SPELLS[id].scrollQ !== null).toBe(true);
  });

  it('can roll a book from the item pool', () => {
    const rng = mulberry32(7), kinds = new Set<string>();
    for (let i = 0; i < 3000; i++) kinds.add(rollItem(rng, 8, 8, { found: new Set() }).kind);
    expect(kinds.has('book')).toBe(true);
    expect(kinds.has('scroll')).toBe(true);
    expect(newBook('firebolt')).toMatchObject({ kind: 'book', spell: 'firebolt' });
    expect(newScroll('fireball')).toMatchObject({ kind: 'scroll', spell: 'fireball' });
  });
});
