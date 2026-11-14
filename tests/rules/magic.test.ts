import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../src/core/rng';
import { AFFIXES, baseTags, UNIQUES, UNIQUE_IDS, type UniqueId } from '../../src/rules/affixes';
import { BASES, type BaseId } from '../../src/rules/bases';
import { gear } from '../../src/rules/gear';
import { itemAc, itemName, newEquip, newInventory, type EquipItem } from '../../src/rules/inventory';
import { eligibleBases } from '../../src/rules/loot';
import { eligibleAffixes, magicChance, makeMagic, newUnique, rollEquipment } from '../../src/rules/magic';

const nonJewelry = (ilvl: number): BaseId[] => eligibleBases(ilvl).filter(id => BASES[id].kind !== 'jewelry');

describe('rollEquipment', () => {
  it('matches the D1 rates at ilvl 10 over 10 000 drops: ~20.8 % magic, ~0.4 % unique', () => {
    const rng = mulberry32(21), N = 10000, pool = nonJewelry(10);
    let magic = 0, unique = 0;
    for (let i = 0; i < N; i++) {
      const it = rollEquipment(rng, 10, pool, { found: new Set() });
      if (it.q !== 'normal') magic++;
      if (it.q === 'unique') unique++;
    }
    expect(magicChance(10)).toBeCloseTo(20.79, 2);
    expect(magic / N).toBeGreaterThan(0.19);
    expect(magic / N).toBeLessThan(0.225);
    expect(unique / N).toBeGreaterThan(0.002);
    expect(unique / N).toBeLessThan(0.007);
  });

  it('always makes rings and amulets magic or unique', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 500; i++) expect(rollEquipment(rng, 10, ['ring', 'amulet'], { found: new Set() }).q).not.toBe('normal');
  });

  it('drops each unique at most once per run', () => {
    const rng = mulberry32(5), found = new Set<UniqueId>(), seen: UniqueId[] = [];
    for (let i = 0; i < 4000; i++) {
      const it = rollEquipment(rng, 30, nonJewelry(30), { found, forceMagic: true, uniqueChance: 100 });
      if (it.uniq) seen.push(it.uniq);
    }
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen.length).toBe(UNIQUE_IDS.length);
  });

  it('only gives uniques whose qlvl is reached', () => {
    const rng = mulberry32(6);
    for (let i = 0; i < 300; i++) {
      const it = rollEquipment(rng, 4, nonJewelry(4), { found: new Set(), forceMagic: true, uniqueChance: 100 });
      if (it.uniq) expect(UNIQUES[it.uniq].qlvl).toBeLessThanOrEqual(4);
    }
  });
});

describe('makeMagic', () => {
  it('only uses affixes allowed on the base and within the ilvl window', () => {
    const rng = mulberry32(8);
    for (const id of ['short_sword', 'plate_mail', 'cap', 'ring_q15', 'war_staff'] as BaseId[]) {
      for (let i = 0; i < 200; i++) {
        const it = newEquip(id);
        expect(makeMagic(rng, it, 20)).toBe(true);
        const tags = baseTags(BASES[id]);
        for (const a of [it.pre, it.suf]) {
          if (!a) continue;
          expect(AFFIXES[a].on.some(t => tags.includes(t))).toBe(true);
          expect(AFFIXES[a].qlvl).toBeLessThanOrEqual(20);
          expect(AFFIXES[a].qlvl).toBeGreaterThanOrEqual(10);
        }
        expect(it.pre || it.suf).toBeTruthy();
        expect(it.identified).toBe(false);
      }
    }
  });

  it('falls back below ilvl/2 when the window has nothing for the slot', () => {
    // Daggers at ilvl 2: the [1, 2] window has prefixes (Bronze, Sharp) and suffixes (of Quality)
    expect(eligibleAffixes('dagger', 2, 'pre').length).toBeGreaterThan(0);
    // Life suffixes on armor: none with qlvl in [35, 70] → falls back to every tier ≤ 70
    expect(eligibleAffixes('plate_mail', 70, 'suf')).toContain('of_the_lion');
  });

  it('rolls two-effect affixes at the same point of both ranges', () => {
    const rng = mulberry32(9);
    for (let i = 0; i < 300; i++) {
      const it = newEquip('long_sword');
      makeMagic(rng, it, 6);
      if (it.pre !== 'sharp') continue;
      const hit = it.props.find(p => p.stat === 'toHit')!.v, dmg = it.props.find(p => p.stat === 'pctDmg')!.v;
      expect((hit - 1) / 4).toBeCloseTo((dmg - 20) / 15, 0);
    }
  });
});

describe('names', () => {
  it('hides magic names until identified', () => {
    const it: EquipItem = { ...newEquip('short_sword'), q: 'magic', identified: false, pre: 'jagged', suf: 'of_the_fox', props: [] };
    expect(itemName(it)).toBe('Short Sword');
    it.identified = true;
    expect(itemName(it)).toBe('Jagged Short Sword of the Fox');
  });

  it('uses the unique name once identified', () => {
    const u = newUnique('gravewhisper', 0);
    expect(itemName(u)).toBe('Dagger');
    u.identified = true;
    expect(itemName(u)).toBe('Gravewhisper');
  });
});

describe('gear', () => {
  const base = { str: 30, int: 10, dex: 20, vit: 25 };

  it('raises an item\'s own armor by its +% armor', () => {
    const plate: EquipItem = { ...newEquip('rags', 0), props: [{ stat: 'pctAc', v: 50 }, { stat: 'ac', v: 3 }] };
    expect(plate.ac).toBe(2);
    expect(itemAc(plate)).toBe(Math.floor(2 * 1.5) + 3);
  });

  it('applies unidentified properties but hides them from the displayed stats', () => {
    const inv = newInventory();
    inv.equip.body = { ...newEquip('rags', 0), q: 'magic', identified: false, suf: 'of_strength', props: [{ stat: 'str', v: 5 }] };
    expect(gear(inv.equip, base).bonus.attr.str).toBe(5);
    expect(gear(inv.equip, base, true).bonus.attr.str).toBe(0);
  });

  it('lets one item meet another item\'s requirement (D1)', () => {
    const inv = newInventory();
    inv.equip.weapon = newEquip('falchion'); // needs 30 Str
    inv.equip.ring1 = { ...newEquip('ring'), q: 'magic', identified: true, suf: 'of_might', props: [{ stat: 'str', v: 6 }] };
    const g = gear(inv.equip, { ...base, str: 25 });
    expect(g.active.has(inv.equip.weapon.uid)).toBe(true);
    expect(g.weapon).toMatchObject({ min: 4, max: 8 });
  });

  it('ignores gear whose requirements are not met', () => {
    const inv = newInventory();
    inv.equip.body = newEquip('plate_mail'); // needs 60 Str
    const g = gear(inv.equip, base);
    expect(g.active.size).toBe(0);
    expect(g.bonus.ac).toBe(0);
  });
});
