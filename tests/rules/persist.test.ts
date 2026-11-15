import { describe, expect, it } from 'vitest';
import { capGround } from '../../src/rules/persist';

describe('capGround', () => {
  const list = (qs: string) => [...qs].map((q, i) => ({ id: i, normal: q === 'n' }));
  const isNormal = (e: { normal: boolean }) => e.normal;

  it('keeps everything under the cap', () => {
    expect(capGround(list('nmnm'), isNormal, 4).map(e => e.id)).toEqual([0, 1, 2, 3]);
  });

  it('drops the oldest normal items first and keeps the order of the rest', () => {
    expect(capGround(list('mnnmnm'), isNormal, 4).map(e => e.id)).toEqual([0, 3, 4, 5]);
  });

  it('drops the oldest magic items only when normal ones are not enough', () => {
    expect(capGround(list('mmnm'), isNormal, 2).map(e => e.id)).toEqual([1, 3]);
  });
});
