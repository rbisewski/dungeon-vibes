import { describe, expect, it } from 'vitest';
import { R, withRng } from '../../src/core/math';
import { deriveSeed, mulberry32 } from '../../src/core/rng';
import { generateLayout } from '../../src/world/layout';

const layoutFor = (seed: number) => withRng(mulberry32(seed), generateLayout);

describe('seeded layouts', () => {
  it('builds the same rooms, tiles and stairs from the same seed', () => {
    const a = layoutFor(deriveSeed(42, 3)), b = layoutFor(deriveSeed(42, 3));
    expect(Array.from(b.tiles)).toEqual(Array.from(a.tiles));
    expect(b.rooms.map(r => [r.x, r.y, r.w, r.h])).toEqual(a.rooms.map(r => [r.x, r.y, r.w, r.h]));
    expect(b.lockedCell).toEqual(a.lockedCell);
  });

  it('builds different levels for different depths of the same run', () => {
    const a = layoutFor(deriveSeed(42, 1)), b = layoutFor(deriveSeed(42, 2));
    expect(Array.from(b.tiles)).not.toEqual(Array.from(a.tiles));
  });

  it('hands the outer stream back after a nested level stream', () => {
    const expected = mulberry32(9);
    const seen = withRng(mulberry32(9), () => {
      const first = R();
      withRng(mulberry32(1), () => R());
      return [first, R()];
    });
    expect(seen).toEqual([expected(), expected()]);
  });
});
