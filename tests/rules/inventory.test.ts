import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../src/core/rng';
import { addItem, BELT_SLOTS, countPotions, findSpot, newInventory, newPotion, PACK_H, PACK_W, takeFromBelt } from '../../src/rules/inventory';
import { potionEffect, rollPotion } from '../../src/rules/potions';

describe('addItem', () => {
  it('fills the belt first, then the backpack, then refuses', () => {
    const inv = newInventory();
    for (let i = 0; i < BELT_SLOTS; i++) expect(addItem(inv, newPotion('heal'))).toBe('belt');
    for (let i = 0; i < PACK_W * PACK_H; i++) expect(addItem(inv, newPotion('mana'))).toBe('pack');
    expect(addItem(inv, newPotion('heal'))).toBeNull();
  });

  it('fills the backpack column by column', () => {
    const inv = newInventory();
    inv.belt.fill(newPotion('heal'));
    addItem(inv, newPotion('heal')); addItem(inv, newPotion('heal'));
    expect(inv.pack.items.map(p => [p.x, p.y])).toEqual([[0, 0], [0, 1]]);
  });

  it('reuses a freed belt slot', () => {
    const inv = newInventory();
    for (let i = 0; i < BELT_SLOTS; i++) addItem(inv, newPotion('heal'));
    takeFromBelt(inv, 3);
    const p = newPotion('mana');
    expect(addItem(inv, p)).toBe('belt');
    expect(inv.belt[3]).toBe(p);
  });
});

describe('takeFromBelt', () => {
  it('refills the slot with the same potion type from the backpack', () => {
    const inv = newInventory();
    inv.belt.fill(newPotion('heal'));
    const spare = newPotion('mana'), match = newPotion('heal');
    addItem(inv, spare); addItem(inv, match);
    expect(takeFromBelt(inv, 0)?.potion).toBe('heal');
    expect(inv.belt[0]).toBe(match);
    expect(inv.pack.items.map(p => p.item)).toEqual([spare]);
  });

  it('leaves the slot empty when no matching potion is carried', () => {
    const inv = newInventory();
    addItem(inv, newPotion('heal'));
    takeFromBelt(inv, 0);
    expect(inv.belt[0]).toBeNull();
    expect(takeFromBelt(inv, 0)).toBeNull();
  });

  it('counts potions across belt and backpack', () => {
    const inv = newInventory();
    inv.belt.fill(newPotion('heal'));
    addItem(inv, newPotion('heal')); addItem(inv, newPotion('mana'));
    expect(countPotions(inv, p => p === 'heal')).toBe(BELT_SLOTS + 1);
  });

  it('finds no spot in a full backpack', () => {
    const inv = newInventory();
    inv.belt.fill(newPotion('heal'));
    for (let i = 0; i < PACK_W * PACK_H; i++) addItem(inv, newPotion('heal'));
    expect(findSpot(inv.pack, 1, 1)).toBeNull();
  });
});

describe('potionEffect', () => {
  it('heals a Warrior 25–75 % of max life (bonus 2.0)', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 300; i++) {
      const e = potionEffect('heal', 'warrior', 100, 40, rng);
      expect(e.life).toBeGreaterThanOrEqual(25);
      expect(e.life).toBeLessThanOrEqual(75);
      expect(e.mana).toBe(0);
    }
  });

  it('restores a Mage 25–75 % of max mana but a Warrior only 12.5–37.5 %', () => {
    const rng = mulberry32(9);
    for (let i = 0; i < 300; i++) {
      const m = potionEffect('mana', 'mage', 50, 200, rng).mana, w = potionEffect('mana', 'warrior', 50, 200, rng).mana;
      expect(m).toBeGreaterThanOrEqual(50); expect(m).toBeLessThanOrEqual(150);
      expect(w).toBeGreaterThanOrEqual(25); expect(w).toBeLessThanOrEqual(75);
    }
  });

  it('fully restores both pools with Full Rejuvenation', () => {
    expect(potionEffect('fullRejuv', 'thief', 90, 30, mulberry32(1))).toEqual({ life: 90, mana: 30 });
  });
});

describe('rollPotion', () => {
  it('only drops potions whose quality level is reached', () => {
    const rng = mulberry32(2), seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(rollPotion(rng, 2));
    expect(seen.has('rejuv')).toBe(false);
    expect(seen.has('fullRejuv')).toBe(false);
    expect(seen.has('heal')).toBe(true);
  });

  it('can drop every potion at ilvl 7', () => {
    const rng = mulberry32(3), seen = new Set<string>();
    for (let i = 0; i < 5000; i++) seen.add(rollPotion(rng, 7));
    expect(seen.size).toBe(6);
  });
});
