/** Backpack grid and potion belt. SPEC.md §1.3, §6.6, §7. */
import type { PotionId } from './potions';

/** An item instance. Only potions exist so far; equipment, books and scrolls join this union in later phases. */
export interface Item { uid: number; kind: 'potion'; potion: PotionId }

/** What decides an item's size and belt eligibility: its kind (later also its base). */
export type ItemShape = Pick<Item, 'kind'>;

export const BELT_SLOTS = 8;
export const PACK_W = 10, PACK_H = 4;

/** Footprint in backpack cells. */
export function itemSize(it: ItemShape): { w: number; h: number } {
  switch (it.kind) {
    case 'potion': return { w: 1, h: 1 };
  }
}
/** Small usable items (potions, later scrolls) may sit on the belt. */
export const beltable = (it: ItemShape): boolean => it.kind === 'potion';

export interface Placed { item: Item; x: number; y: number }
export interface Grid { w: number; h: number; items: Placed[] }

export interface Inventory { belt: (Item | null)[]; pack: Grid }

export const newInventory = (): Inventory => ({ belt: Array(BELT_SLOTS).fill(null), pack: { w: PACK_W, h: PACK_H, items: [] } });

let nextUid = 1;
export const newPotion = (potion: PotionId): Item => ({ uid: nextUid++, kind: 'potion', potion });

/** True when a w×h item fits at (x, y) without overlapping anything. */
export function fits(g: Grid, w: number, h: number, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x + w > g.w || y + h > g.h) return false;
  return g.items.every(p => {
    const s = itemSize(p.item);
    return x >= p.x + s.w || p.x >= x + w || y >= p.y + s.h || p.y >= y + h;
  });
}

/** First free spot scanning column by column, top to bottom (D1 fills the backpack this way). */
export function findSpot(g: Grid, w: number, h: number): { x: number; y: number } | null {
  for (let x = 0; x <= g.w - w; x++) for (let y = 0; y <= g.h - h; y++) if (fits(g, w, h, x, y)) return { x, y };
  return null;
}

export type Stored = 'belt' | 'pack' | null;

/** Where `addItem` would put the item, without changing anything. */
export function storeTarget(inv: Inventory, it: ItemShape): Stored {
  if (beltable(it) && inv.belt.includes(null)) return 'belt';
  const s = itemSize(it);
  return findSpot(inv.pack, s.w, s.h) ? 'pack' : null;
}

/** Belt first (when allowed), then the backpack. Returns where it went, or null if there was no room. */
export function addItem(inv: Inventory, it: Item): Stored {
  const to = storeTarget(inv, it);
  if (to === 'belt') inv.belt[inv.belt.indexOf(null)] = it;
  else if (to === 'pack') {
    const s = itemSize(it);
    inv.pack.items.push({ item: it, ...findSpot(inv.pack, s.w, s.h)! });
  }
  return to;
}

/**
 * Removes and returns the item in a belt slot. The emptied slot is refilled with the same kind of potion from the
 * backpack, if there is one [OURS].
 */
export function takeFromBelt(inv: Inventory, slot: number): Item | null {
  const it = inv.belt[slot];
  if (!it) return null;
  const i = inv.pack.items.findIndex(p => p.item.kind === 'potion' && p.item.potion === it.potion);
  inv.belt[slot] = i >= 0 ? inv.pack.items.splice(i, 1)[0].item : null;
  return it;
}

/** Belt slot of the first potion matching `pick`, or -1. */
export const findBelt = (inv: Inventory, pick: (p: PotionId) => boolean): number =>
  inv.belt.findIndex(it => !!it && pick(it.potion));

/** Every carried potion: belt and backpack. */
export const countPotions = (inv: Inventory, pick: (p: PotionId) => boolean): number =>
  [...inv.belt, ...inv.pack.items.map(p => p.item)].filter(it => !!it && pick(it.potion)).length;
