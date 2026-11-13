import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../src/core/rng';
import { addItem, BELT_SLOTS, countPotions, equipFromPack, equipInto, findSpot, itemAt, itemName, meetsReq, newEquip, newInventory, newPotion, PACK_H, PACK_W, placeAt, putInGrid, takeFromBelt } from '../../src/rules/inventory';
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
    expect(takeFromBelt(inv, 0)).toMatchObject({ kind: 'potion', potion: 'heal' });
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

describe('placeAt', () => {
  it('places into empty cells, swaps with exactly one item, refuses two', () => {
    const inv = newInventory();
    const sword = newEquip('short_sword'), helm = newEquip('cap'), armor = newEquip('rags');
    expect(placeAt(inv.pack, sword, 0, 0)).toBeNull();
    expect(placeAt(inv.pack, helm, 2, 0)).toBeNull();
    // 2×3 armor at (0,0) covers the sword (col 0) and the cap (cols 2–3 are outside: x 0–1) → only the sword
    expect(placeAt(inv.pack, armor, 0, 0)).toBe(sword);
    expect(itemAt(inv.pack, 1, 2)?.item).toBe(armor);
    // a 2×3 at (1,0) would overlap the armor and the cap
    expect(placeAt(inv.pack, newEquip('rags'), 1, 0)).toBe(false);
  });

  it('refuses out-of-bounds placement', () => {
    expect(placeAt(newInventory().pack, newEquip('short_sword'), 0, 2)).toBe(false);
  });
});

describe('equipment', () => {
  it('a two-handed weapon pushes the shield into the backpack', () => {
    const inv = newInventory();
    inv.equip.weapon = newEquip('short_sword');
    inv.equip.shield = newEquip('buckler');
    const axe = newEquip('great_axe');
    putInGrid(inv.pack, axe);
    expect(equipFromPack(inv, axe)).toBe(true);
    expect(inv.equip.weapon).toBe(axe);
    expect(inv.equip.shield).toBeNull();
    expect(inv.pack.items.map(p => itemName(p.item)).sort()).toEqual(['Buckler', 'Short Sword']);
  });

  it('a shield pushes a two-handed weapon off', () => {
    const inv = newInventory();
    inv.equip.weapon = newEquip('long_staff');
    const out = equipInto(inv, 'shield', newEquip('buckler'));
    expect(out && out.map(i => itemName(i))).toEqual(['Long Staff']);
    expect(inv.equip.weapon).toBeNull();
  });

  it('refuses the wrong slot', () => {
    expect(equipInto(newInventory(), 'head', newEquip('short_sword'))).toBe(false);
  });

  it('refuses, changing nothing, when displaced gear does not fit back in the backpack', () => {
    const inv = newInventory();
    const sword = newEquip('short_sword'), buckler = newEquip('buckler'), axe = newEquip('great_axe');
    inv.equip.weapon = sword; inv.equip.shield = buckler;
    putInGrid(inv.pack, axe);
    while (putInGrid(inv.pack, newPotion('heal')));
    const before = inv.pack.items.length;
    // the axe frees 2×3 cells: the sword (1×3) fits, the buckler (2×2) then cannot
    expect(equipFromPack(inv, axe)).toBe(false);
    expect(inv.equip).toMatchObject({ weapon: sword, shield: buckler });
    expect(inv.pack.items.length).toBe(before);
  });

  it('checks requirements against attributes', () => {
    expect(meetsReq(newEquip('long_sword'), { str: 30, dex: 29, int: 0, vit: 0 })).toBe(false);
    expect(meetsReq(newEquip('long_sword'), { str: 30, dex: 30, int: 0, vit: 0 })).toBe(true);
  });

  it('rolls armor class within the base range', () => {
    expect(newEquip('buckler', 0).ac).toBe(1);
    expect(newEquip('buckler', .999).ac).toBe(5);
    expect(newEquip('short_sword').ac).toBe(0);
  });
});
