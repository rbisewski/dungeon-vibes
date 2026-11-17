import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../src/core/rng';
import { BASES } from '../../src/rules/bases';
import { barrelDrops, BARREL_GOLD, BARREL_LOOT, BARREL_USEFUL, eligibleBases, goldAmount, monsterDrops, MONSTER_GOLD, MONSTER_ITEM, rollItem } from '../../src/rules/loot';

describe('monsterDrops', () => {
  it('matches D1 rates over 10 000 kills: ~30.3 % gold, ~10.7 % item', () => {
    const rng = mulberry32(11), N = 10000;
    let gold = 0, item = 0;
    for (let i = 0; i < N; i++) {
      const d = monsterDrops(rng, 3, 3, { found: new Set() });
      if (d[0]?.kind === 'gold') gold++;
      else if (d[0]?.kind === 'item') item++;
    }
    expect(gold / N).toBeCloseTo(MONSTER_GOLD, 1);
    expect(item / N).toBeCloseTo(MONSTER_ITEM, 1);
  });

  it('never gives bats an item, but still gold (D1)', () => {
    const rng = mulberry32(12), N = 5000;
    let gold = 0;
    for (let i = 0; i < N; i++) {
      const d = monsterDrops(rng, 3, 3, { found: new Set() }, true);
      expect(d.every(x => x.kind === 'gold')).toBe(true);
      if (d.length) gold++;
    }
    expect(gold / N).toBeCloseTo(MONSTER_GOLD, 1);
  });
});

describe('barrelDrops', () => {
  const tally = (depth: number, seed: number) => {
    const rng = mulberry32(seed), N = 30000, n = { gold: 0, useful: 0, portal: 0, other: 0 };
    for (let i = 0; i < N; i++) {
      const d = barrelDrops(rng, depth, { found: new Set() });
      expect(d.length).toBeLessThanOrEqual(1);
      if (!d.length) continue;
      if (d[0].kind === 'gold') n.gold++;
      else if (d[0].item.kind === 'scroll' && d[0].item.spell === 'town_portal') n.portal++;
      else if (d[0].item.kind === 'potion' && (d[0].item.potion === 'heal' || d[0].item.potion === 'mana')) n.useful++;
      else n.other++;
    }
    return { any: (n.gold + n.useful + n.portal + n.other) / N, gold: n.gold / N, useful: (n.useful + n.portal) / N, portal: n.portal / N };
  };

  it('matches D1 rates: 20 % hold something; a third of that useful, the rest 75 % gold', () => {
    const r = tally(3, 21), rest = BARREL_LOOT * (1 - BARREL_USEFUL);
    expect(r.any).toBeCloseTo(BARREL_LOOT, 2);
    expect(r.gold).toBeCloseTo(rest * BARREL_GOLD, 2);
    // the random-item share can roll potions too, so useful items are at least the useful share
    expect(r.useful).toBeGreaterThan(BARREL_LOOT * BARREL_USEFUL - .006);
    expect(r.portal).toBeGreaterThan(0);
  });

  it('never holds a Town Portal scroll on depth 1 (D1)', () => {
    expect(tally(1, 22).portal).toBe(0);
  });
});

describe('rollItem', () => {
  it('only rolls equipment bases with qlvl <= ilvl', () => {
    const rng = mulberry32(8);
    for (let i = 0; i < 2000; i++) {
      const it = rollItem(rng, 4, 4, { found: new Set() }, 'equip');
      expect(it.kind).toBe('equip');
      if (it.kind === 'equip') expect(BASES[it.base].qlvl).toBeLessThanOrEqual(4);
    }
  });

  it('never rolls elixirs before depth 8', () => {
    const rng = mulberry32(9);
    for (let i = 0; i < 5000; i++) expect(rollItem(rng, 7, 7, { found: new Set() }).kind).not.toBe('elixir');
  });

  it('can roll elixirs from depth 8', () => {
    const rng = mulberry32(10);
    let n = 0;
    for (let i = 0; i < 5000; i++) if (rollItem(rng, 15, 8, { found: new Set() }).kind === 'elixir') n++;
    expect(n).toBeGreaterThan(0);
  });

  it('has depth-1 bases to drop', () => {
    expect(eligibleBases(1).length).toBeGreaterThan(5);
  });
});

describe('goldAmount', () => {
  it('stays within ri(1,3)·(mlvl+1) + ri(0, mlvl)', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 500; i++) {
      const g = goldAmount(rng, 4);
      expect(g).toBeGreaterThanOrEqual(5);
      expect(g).toBeLessThanOrEqual(19);
    }
  });
});
