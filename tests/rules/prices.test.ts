import { describe, expect, it } from 'vitest';
import { newBook, newEquip, newPotion, newScroll, type EquipItem } from '../../src/rules/inventory';
import { newUnique } from '../../src/rules/magic';
import { BASE_PRICE, equipValue, itemPrice, plVal, sellPrice } from '../../src/rules/prices';

const magic = (over: Partial<EquipItem>): EquipItem => ({ ...newEquip('dagger'), q: 'magic', identified: true, ...over });

describe('prices', () => {
  it('interpolates an affix value by roll position in whole percent (D1 PLVal)', () => {
    expect(plVal(3, 1, 5, 100, 500)).toBe(300);
    expect(plVal(1, 1, 5, 100, 500)).toBe(100);
    expect(plVal(4, 4, 4, 2500, 6500)).toBe(2500);
    // 100·1/3 = 33 % of the range
    expect(plVal(2, 1, 4, 0, 300)).toBe(99);
  });

  it('prices a magic item as added values plus multipliers × base value (D1)', () => {
    // Bronze (+3 % to hit: 300, ×2) Dagger (60) of Strength (+3: 600, ×2) = 900 + 4·60
    const it = magic({ pre: 'bronze', suf: 'of_strength', props: [{ stat: 'toHit', v: 3 }, { stat: 'str', v: 3 }] });
    expect(equipValue(it)).toBe(1140);
    expect(sellPrice(it)).toBe(285);
  });

  it('prices two-effect affixes by their damage roll', () => {
    const lo = magic({ pre: 'sharp', props: [{ stat: 'toHit', v: 1 }, { stat: 'pctDmg', v: 20 }] });
    const hi = magic({ pre: 'sharp', props: [{ stat: 'toHit', v: 5 }, { stat: 'pctDmg', v: 35 }] });
    expect(equipValue(lo)).toBe(350 + 5 * 60);
    expect(equipValue(hi)).toBe(950 + 5 * 60);
  });

  it('values unidentified magic and unique items at their base value', () => {
    const it = magic({ identified: false, pre: 'bronze', props: [{ stat: 'toHit', v: 5 }] });
    expect(equipValue(it)).toBe(BASE_PRICE.dagger);
    expect(equipValue(newUnique('widowmaker', .5))).toBe(BASE_PRICE.broad_axe);
  });

  it('values an identified unique above its base', () => {
    const u = { ...newUnique('widowmaker', .5), identified: true };
    expect(equipValue(u)).toBeGreaterThan(BASE_PRICE.broad_axe * 2);
  });

  it('uses D1 prices for potions, scrolls and books', () => {
    expect(itemPrice(newPotion('fullRejuv'))).toBe(600);
    expect(itemPrice(newScroll('town_portal'))).toBe(200);
    expect(itemPrice(newBook('fireball'))).toBe(8000);
    expect(sellPrice(newPotion('heal'))).toBe(12);
  });
});
