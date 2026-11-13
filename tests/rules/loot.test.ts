import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../src/core/rng';
import { BASES } from '../../src/rules/bases';
import { eligibleBases, goldAmount, monsterDrops, MONSTER_GOLD, MONSTER_ITEM, rollItem } from '../../src/rules/loot';

describe('monsterDrops', () => {
  it('matches D1 rates over 10 000 kills: ~30.3 % gold, ~10.7 % item', () => {
    const rng = mulberry32(11), N = 10000;
    let gold = 0, item = 0;
    for (let i = 0; i < N; i++) {
      const d = monsterDrops(rng, 3, 3, false);
      if (d[0]?.kind === 'gold') gold++;
      else if (d[0]?.kind === 'item') item++;
    }
    expect(gold / N).toBeCloseTo(MONSTER_GOLD, 1);
    expect(item / N).toBeCloseTo(MONSTER_ITEM, 1);
  });

  it('always gives a boss an equipment item, a potion and gold', () => {
    const d = monsterDrops(mulberry32(4), 5, 3, true);
    expect(d.map(x => x.kind === 'item' ? x.item.kind : x.kind)).toEqual(['equip', 'potion', 'gold']);
  });
});

describe('rollItem', () => {
  it('only rolls equipment bases with qlvl <= ilvl', () => {
    const rng = mulberry32(8);
    for (let i = 0; i < 2000; i++) {
      const it = rollItem(rng, 4, 4, 'equip');
      expect(it.kind).toBe('equip');
      if (it.kind === 'equip') expect(BASES[it.base].qlvl).toBeLessThanOrEqual(4);
    }
  });

  it('never rolls elixirs before depth 8', () => {
    const rng = mulberry32(9);
    for (let i = 0; i < 5000; i++) expect(rollItem(rng, 7, 7).kind).not.toBe('elixir');
  });

  it('can roll elixirs from depth 8', () => {
    const rng = mulberry32(10);
    let n = 0;
    for (let i = 0; i < 5000; i++) if (rollItem(rng, 15, 8).kind === 'elixir') n++;
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
