import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../src/core/rng';
import { BASES } from '../../src/rules/bases';
import { bossDrops, bossFor, bossName } from '../../src/rules/bosses';
import type { LootCtx } from '../../src/rules/loot';
import { SPELLS } from '../../src/rules/spells';

describe('bossFor', () => {
  it('puts a boss on every 5th depth only, cycling the roster and ascending on repeats', () => {
    expect(bossFor(4)).toBeNull();
    expect(bossFor(6)).toBeNull();
    expect([5, 10, 15, 20].map(d => bossFor(d)?.id)).toEqual(['warden', 'gorger', 'broodmother', 'lich']);
    expect(bossFor(20)?.ascended).toBe(false);
    expect(bossFor(25)).toEqual({ id: 'warden', ascended: true });
    expect(bossName('warden', true)).toBe('Ascended Bone Warden');
    expect(bossName('gorger', false)).toBe('The Gorger');
  });
});

describe('bossDrops', () => {
  const kinds = (d: ReturnType<typeof bossDrops>) => d.map(x => (x.kind === 'item' ? x.item.kind : x.kind));

  it('always gives a magic or unique item at ilvl mlvl + 4, two potions, a Scroll of Identify and gold', () => {
    const rng = mulberry32(4);
    for (let i = 0; i < 300; i++) {
      const d = bossDrops(rng, 'warden', 7, 5, { found: new Set() });
      expect(kinds(d)).toEqual(['equip', 'potion', 'potion', 'scroll', 'gold']);
      const it = d[0].kind === 'item' ? d[0].item : null;
      expect(it?.kind === 'equip' && it.q).not.toBe('normal');
      if (it?.kind === 'equip') expect(BASES[it.base].qlvl).toBeLessThanOrEqual(11);
    }
  });

  it('adds the Gorger\'s Widowmaker about a quarter of the time, and never twice', () => {
    const rng = mulberry32(5);
    let hits = 0;
    for (let i = 0; i < 2000; i++) {
      const d = bossDrops(rng, 'gorger', 12, 10, { found: new Set() });
      if (d.some(x => x.kind === 'item' && x.item.kind === 'equip' && x.item.uniq === 'widowmaker')) hits++;
    }
    expect(hits / 2000).toBeGreaterThan(.2);
    expect(hits / 2000).toBeLessThan(.3);
    const found: LootCtx['found'] = new Set(['widowmaker'] as const);
    for (let i = 0; i < 200; i++) expect(bossDrops(rng, 'gorger', 12, 10, { found }).some(x => x.kind === 'item' && x.item.kind === 'equip' && x.item.uniq === 'widowmaker')).toBe(false);
  });

  it('gives the Ember Lich a ring or amulet and a book of qlvl 6 or more on top', () => {
    const rng = mulberry32(6);
    for (let i = 0; i < 300; i++) {
      const d = bossDrops(rng, 'lich', 22, 20, { found: new Set() });
      const items = d.flatMap(x => (x.kind === 'item' ? [x.item] : []));
      expect(items.some(it => it.kind === 'equip' && BASES[it.base].kind === 'jewelry' && it.q !== 'normal')).toBe(true);
      const book = items.find(it => it.kind === 'book');
      expect(book?.kind === 'book' && (SPELLS[book.spell].bookQ ?? 0)).toBeGreaterThanOrEqual(6);
    }
  });
});
