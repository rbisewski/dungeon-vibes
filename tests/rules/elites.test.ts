import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../src/core/rng';
import { ELITE, eliteDrops, eliteName, eliteRoll } from '../../src/rules/elites';
import { rollMonster } from '../../src/rules/monsters';

describe('elites', () => {
  const base = rollMonster('skeleton', 4, false);

  it('gives the leader 3x HP and escorts 2x', () => {
    expect(eliteRoll(base, 'fast', true).hp).toBe(base.hp * ELITE.leaderHp);
    expect(eliteRoll(base, 'fast', false).hp).toBe(base.hp * ELITE.escortHp);
  });

  it('applies Stoneskin (+50 AC) and Berserker (+50 % damage) to the whole pack', () => {
    expect(eliteRoll(base, 'stoneskin', false).ac).toBe(base.ac + 50);
    const b = eliteRoll(base, 'berserker', false);
    expect([b.dmgMin, b.dmgMax]).toEqual([Math.round(base.dmgMin * 1.5), Math.round(base.dmgMax * 1.5)]);
  });

  it('names the leader "<Name> the <Epithet>"', () => {
    expect(eliteName(mulberry32(1))).toMatch(/^[A-Z][a-z]+ the [A-Z][a-z]+$/);
  });

  it('drops one always-magic item and gold', () => {
    const rng = mulberry32(2);
    for (let i = 0; i < 200; i++) {
      const d = eliteDrops(rng, 9, 4, { found: new Set() });
      expect(d.map(x => x.kind)).toEqual(['item', 'gold']);
      const it = d[0].kind === 'item' ? d[0].item : null;
      expect(it?.kind === 'equip' && it.q).not.toBe('normal');
    }
  });
});
