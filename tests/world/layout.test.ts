import { describe, expect, it } from 'vitest';
import { R, withRng } from '../../src/core/math';
import { deriveSeed, mulberry32 } from '../../src/core/rng';
import { generateLayout } from '../../src/world/layout';

const layoutFor = (seed: number, depth = 3) => withRng(mulberry32(seed), () => generateLayout(depth));

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

describe('room styles', () => {
  const walkable = (t: number) => t === 1 || t === 2 || t === 3 || t === 6 || t === 7;
  /** Tiles reachable from the start room's centre over 4-neighbours; the locked door (4) only if `throughDoor`. */
  const reach = (lay: ReturnType<typeof layoutFor>, throughDoor: boolean) => {
    const seen = new Uint8Array(lay.N), s = lay.startRoom.cy * lay.W + lay.startRoom.cx, st = [s]; seen[s] = 1;
    while (st.length) {
      const c = st.pop()!, x = c % lay.W, z = (c / lay.W) | 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = (z + dz) * lay.W + x + dx, t = lay.tiles[n];
        if (!seen[n] && (walkable(t) || (throughDoor && t === 4))) { seen[n] = 1; st.push(n); }
      }
    }
    return seen;
  };

  it('keeps every level whole: rooms match the tile map, all floor is reachable, the stairs room only through its door', () => {
    for (let depth = 1; depth <= 16; depth += 3) for (let run = 0; run < 12; run++) {
      const lay = layoutFor(deriveSeed(1000 + run, depth), depth);
      for (const r of lay.rooms) {
        expect(r.cells.length).toBeGreaterThan(0);
        expect(r.cells.every(c => lay.roomId[c] === r.id && lay.tiles[c] === 1)).toBe(true);
        expect(r.cells).toContain(r.cy * lay.W + r.cx);
      }
      const open = reach(lay, true), shut = reach(lay, false);
      for (let i = 0; i < lay.N; i++) if (walkable(lay.tiles[i])) expect(open[i]).toBe(1);
      expect(lay.stairsRoom.cells.some(c => shut[c])).toBe(false);
      expect(['room', 'hall', 'octagon']).toContain(lay.stairsRoom.shape);
      expect(Math.min(lay.stairsRoom.w, lay.stairsRoom.h)).toBeGreaterThanOrEqual(5);
    }
  });

  it('mixes styles at every depth, with more halls and caves deeper', () => {
    const tally = (depth: number) => {
      const n: Record<string, number> = {};
      let rooms = 0;
      for (let run = 0; run < 40; run++) for (const r of layoutFor(deriveSeed(2000 + run, depth), depth).rooms) { n[r.shape] = (n[r.shape] ?? 0) + 1; rooms++; }
      return { kinds: Object.keys(n).length, deep: ((n.hall ?? 0) + (n.cave ?? 0)) / rooms };
    };
    const shallow = tally(1), deep = tally(14);
    expect(shallow.kinds).toBe(8);
    expect(deep.kinds).toBe(8);
    expect(deep.deep).toBeGreaterThan(shallow.deep * 1.5);
  });
});
