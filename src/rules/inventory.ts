/** Items, backpack grid, belt and equipped gear. SPEC.md §1.3, §6.6, §7, §10.2. */
import { ATTRS, type Attr, type Attrs } from './classes';
import { base, type BaseId } from './bases';
import { POTIONS, type PotionId } from './potions';

export type Item =
  | { uid: number; kind: 'potion'; potion: PotionId }
  | { uid: number; kind: 'elixir'; attr: Attr }
  | { uid: number; kind: 'equip'; base: BaseId; /** Armor class rolled at creation (0 for weapons). */ ac: number };
export type EquipItem = Extract<Item, { kind: 'equip' }>;

export const BELT_SLOTS = 8;
export const PACK_W = 10, PACK_H = 4;

let nextUid = 1;
export const newPotion = (potion: PotionId): Item => ({ uid: nextUid++, kind: 'potion', potion });
export const newElixir = (attr: Attr): Item => ({ uid: nextUid++, kind: 'elixir', attr });
/** `acRoll` in [0, 1) picks the armor class within the base's range. */
export function newEquip(id: BaseId, acRoll = 0.5): EquipItem {
  const b = base(id);
  const ac = b.kind === 'armor' ? b.ac[0] + Math.floor(acRoll * (b.ac[1] - b.ac[0] + 1)) : 0;
  return { uid: nextUid++, kind: 'equip', base: id, ac };
}

const ELIXIR_NAME: Record<Attr, string> = { str: 'Strength', int: 'Intelligence', dex: 'Dexterity', vit: 'Vitality' };

export function itemName(it: Item): string {
  switch (it.kind) {
    case 'potion': return POTIONS[it.potion].name;
    case 'elixir': return `Elixir of ${ELIXIR_NAME[it.attr]}`;
    case 'equip': return base(it.base).name;
  }
}

/** Footprint in backpack cells. */
export function itemSize(it: Item): { w: number; h: number } {
  if (it.kind === 'equip') { const b = base(it.base); return { w: b.w, h: b.h }; }
  return { w: 1, h: 1 };
}

/** Only potions (later also scrolls) may sit on the belt. */
export const beltable = (it: Item): boolean => it.kind === 'potion';

/** Requirements are checked against current attributes (base + item bonuses), as in D1. */
export function meetsReq(it: Item, attrs: Attrs): boolean {
  if (it.kind !== 'equip') return true;
  const req = base(it.base).req;
  return ATTRS.every(a => attrs[a] >= (req[a] ?? 0));
}

/* ---------- grid ---------- */

export interface Placed { item: Item; x: number; y: number }
export interface Grid { w: number; h: number; items: Placed[] }

const overlaps = (p: Placed, x: number, y: number, w: number, h: number): boolean => {
  const s = itemSize(p.item);
  return x < p.x + s.w && p.x < x + w && y < p.y + s.h && p.y < y + h;
};

/** True when a w×h item fits at (x, y) without overlapping anything. */
export function fits(g: Grid, w: number, h: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x + w <= g.w && y + h <= g.h && !g.items.some(p => overlaps(p, x, y, w, h));
}

/** First free spot scanning column by column, top to bottom (D1 fills the backpack this way). */
export function findSpot(g: Grid, w: number, h: number): { x: number; y: number } | null {
  for (let x = 0; x <= g.w - w; x++) for (let y = 0; y <= g.h - h; y++) if (fits(g, w, h, x, y)) return { x, y };
  return null;
}

/** Item covering cell (x, y), if any. */
export const itemAt = (g: Grid, x: number, y: number): Placed | undefined => g.items.find(p => overlaps(p, x, y, 1, 1));

/** Adds `it` at the first free spot; false when it does not fit. */
export function putInGrid(g: Grid, it: Item): boolean {
  const s = itemSize(it), at = findSpot(g, s.w, s.h);
  if (!at) return false;
  g.items.push({ item: it, ...at });
  return true;
}

export function removeFromGrid(g: Grid, it: Item): boolean {
  const i = g.items.findIndex(p => p.item === it);
  if (i < 0) return false;
  g.items.splice(i, 1);
  return true;
}

/**
 * D1 placement: drop `held` with its top-left at (x, y). With nothing underneath it is placed; with exactly one item
 * underneath the two swap and that item is returned as the new held item. Returns `false` when it cannot go there.
 */
export function placeAt(g: Grid, held: Item, x: number, y: number): Item | null | false {
  const s = itemSize(held);
  if (x < 0 || y < 0 || x + s.w > g.w || y + s.h > g.h) return false;
  const under = g.items.filter(p => overlaps(p, x, y, s.w, s.h));
  if (under.length > 1) return false;
  if (under.length === 1) removeFromGrid(g, under[0].item);
  g.items.push({ item: held, x, y });
  return under.length ? under[0].item : null;
}

/* ---------- equipment ---------- */

export type EquipSlot = 'head' | 'amulet' | 'weapon' | 'body' | 'shield' | 'ring1' | 'ring2';
export const EQUIP_SLOTS: readonly EquipSlot[] = ['head', 'amulet', 'weapon', 'body', 'shield', 'ring1', 'ring2'];
export type Equipment = Record<EquipSlot, EquipItem | null>;

/** Slot an equipment piece goes into by default. */
export function slotFor(it: Item): EquipSlot | null {
  if (it.kind !== 'equip') return null;
  const b = base(it.base);
  return b.kind === 'weapon' ? 'weapon' : b.slot;
}

export function isTwoHanded(it: Item | null): boolean {
  if (!it || it.kind !== 'equip') return false;
  const b = base(it.base);
  return b.kind === 'weapon' && b.twoHanded;
}

/* ---------- inventory ---------- */

export interface Inventory { belt: (Item | null)[]; pack: Grid; equip: Equipment }

export const newInventory = (): Inventory => ({
  belt: Array(BELT_SLOTS).fill(null),
  pack: { w: PACK_W, h: PACK_H, items: [] },
  equip: { head: null, amulet: null, weapon: null, body: null, shield: null, ring1: null, ring2: null },
});

export type Stored = 'belt' | 'pack' | null;

/** Where `addItem` would put the item, without changing anything. */
export function storeTarget(inv: Inventory, it: Item): Stored {
  if (beltable(it) && inv.belt.includes(null)) return 'belt';
  const s = itemSize(it);
  return findSpot(inv.pack, s.w, s.h) ? 'pack' : null;
}

/** Belt first (when allowed), then the backpack. Returns where it went, or null if there was no room. */
export function addItem(inv: Inventory, it: Item): Stored {
  const to = storeTarget(inv, it);
  if (to === 'belt') inv.belt[inv.belt.indexOf(null)] = it;
  else if (to === 'pack') putInGrid(inv.pack, it);
  return to;
}

/**
 * Removes and returns the item in a belt slot. The emptied slot is refilled with the same kind of potion from the
 * backpack, if there is one [OURS].
 */
export function takeFromBelt(inv: Inventory, slot: number): Item | null {
  const it = inv.belt[slot];
  if (!it) return null;
  inv.belt[slot] = null;
  if (it.kind === 'potion') {
    const p = inv.pack.items.find(q => q.item.kind === 'potion' && q.item.potion === it.potion);
    if (p) { removeFromGrid(inv.pack, p.item); inv.belt[slot] = p.item; }
  }
  return it;
}

const potionOf = (it: Item | null): PotionId | null => (it && it.kind === 'potion' ? it.potion : null);

/** Belt slot of the first potion matching `pick`, or -1. */
export const findBelt = (inv: Inventory, pick: (p: PotionId) => boolean): number =>
  inv.belt.findIndex(it => { const p = potionOf(it); return !!p && pick(p); });

/** Every carried potion: belt and backpack. */
export const countPotions = (inv: Inventory, pick: (p: PotionId) => boolean): number =>
  [...inv.belt, ...inv.pack.items.map(p => p.item)].filter(it => { const p = potionOf(it); return !!p && pick(p); }).length;

/**
 * Puts `it` (not currently stored anywhere) into `slot`, returning the items it displaced. A two-handed weapon also
 * displaces the shield, and a shield displaces a two-handed weapon. Returns false for a wrong slot.
 */
export function equipInto(inv: Inventory, slot: EquipSlot, it: EquipItem): EquipItem[] | false {
  if (slotFor(it) !== slot) return false;
  const out: EquipItem[] = [];
  const prev = inv.equip[slot];
  if (prev) out.push(prev);
  if (slot === 'weapon' && isTwoHanded(it) && inv.equip.shield) { out.push(inv.equip.shield); inv.equip.shield = null; }
  if (slot === 'shield' && isTwoHanded(inv.equip.weapon)) { out.push(inv.equip.weapon!); inv.equip.weapon = null; }
  inv.equip[slot] = it;
  return out;
}

/**
 * Right-click equip from the backpack: moves `it` from the pack into its slot and puts displaced gear back in the
 * pack. Refuses (changing nothing) when the displaced gear would not fit.
 */
export function equipFromPack(inv: Inventory, it: EquipItem): boolean {
  const slot = slotFor(it);
  if (!slot) return false;
  const trial: Inventory = { belt: inv.belt, pack: { ...inv.pack, items: inv.pack.items.filter(p => p.item !== it) }, equip: { ...inv.equip } };
  const out = equipInto(trial, slot, it);
  if (!out || !out.every(o => putInGrid(trial.pack, o))) return false;
  inv.pack = trial.pack;
  inv.equip = trial.equip;
  return true;
}

/** Right-click unequip into the backpack. */
export function unequipToPack(inv: Inventory, slot: EquipSlot): boolean {
  const it = inv.equip[slot];
  if (!it || !putInGrid(inv.pack, it)) return false;
  inv.equip[slot] = null;
  return true;
}
