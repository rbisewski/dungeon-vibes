/**
 * UI commands. Panels and the inventory never mutate the hero directly; they go through these functions, which keep
 * derived stats, the HUD and the panel snapshots in sync. SPEC.md §2.1, §10.1, §10.2.
 */
import { signal } from '@preact/signals';
import { drinkElixir, drinkPotion, recompute, spendHeroPoint } from '../actors/heroStats';
import { SFX } from '../audio/sfx';
import { queueBelt, resetInput } from '../core/input';
import { G } from '../game/state';
import { base } from '../rules/bases';
import type { Attr } from '../rules/classes';
import {
  addItem, beltable, equipFromPack, equipInto, findSpot, isTwoHanded, itemAt, itemSize, meetsReq,
  placeAt, putInGrid, removeFromGrid, slotFor, takeFromBelt, unequipToPack, PACK_W, PACK_H, type EquipSlot, type Item,
} from '../rules/inventory';
import { pickupNearest, spawnItem } from '../world/groundItems';
import { isOpen, openPanels, toast, type Panel } from './store';
import { syncHud, syncSheet } from './syncHud';

/** The item on the cursor while the inventory is open (D1 "holding" an item). */
export const held = signal<Item | null>(null);
/** Bumped after every inventory change so panels re-read the (mutable) inventory. */
export const invVersion = signal(0);

/** Keyboard cursor in the inventory: a backpack cell or an equipment slot. */
export type Cursor = { area: 'pack'; x: number; y: number } | { area: 'equip'; slot: EquipSlot };
export const cursor = signal<Cursor>({ area: 'pack', x: 0, y: 0 });

/** Panels cannot open mid-transition or while the hero is dead or descending. */
const canOpen = (): boolean => !G.transition && !G.hero.dead && G.hero.descend <= 0;

function changed(): void {
  recompute(G.hero);
  invVersion.value++;
  syncSheet();
  syncHud();
}

export function openPanel(p: Panel): void {
  if (!canOpen() || isOpen(p)) return;
  openPanels.value = [...openPanels.value, p];
  G.paused = true;
  resetInput();
  syncSheet();
  invVersion.value++;
}

/** Puts a held item back into the backpack, or on the floor when there is no room. */
function stowHeld(): void {
  const it = held.value;
  if (!it) return;
  if (!addItem(G.hero.inv, it)) spawnItem(it, G.hero.x, G.hero.z, true);
  held.value = null;
  changed();
}

export function closePanel(p: Panel): void {
  if (p === 'inv') stowHeld();
  openPanels.value = openPanels.value.filter(q => q !== p);
  G.paused = openPanels.value.length > 0;
  resetInput();
}

export function closePanels(): void {
  stowHeld();
  openPanels.value = [];
  G.paused = false;
  resetInput();
}

export function togglePanel(p: Panel): void {
  if (isOpen(p)) closePanel(p);
  else openPanel(p);
}

/** Spends one level-up point; the sheet and HUD refresh immediately (the game is paused). */
export function spendPoint(a: Attr): void {
  if (spendHeroPoint(a)) changed();
}

/* ---------- inventory commands ---------- */

const attrs = () => G.hero.stats.base;

function reqText(it: Item): string {
  if (it.kind !== 'equip') return '';
  const r = base(it.base).req;
  return (['str', 'dex', 'int'] as const).filter(a => (r[a] ?? 0) > attrs()[a]).map(a => `${r[a]} ${a.toUpperCase()}`).join(', ');
}

/** Left-click on a backpack cell: pick up, place, or swap (D1). The held item is anchored so the clicked cell is near its middle. */
export function clickPack(x: number, y: number): void {
  const inv = G.hero.inv, h = held.value;
  if (!h) {
    const p = itemAt(inv.pack, x, y);
    if (!p) return;
    removeFromGrid(inv.pack, p.item);
    held.value = p.item;
    SFX.pickup();
    changed();
    return;
  }
  const s = itemSize(h);
  const ax = Math.max(0, Math.min(PACK_W - s.w, x - Math.floor((s.w - 1) / 2)));
  const ay = Math.max(0, Math.min(PACK_H - s.h, y - Math.floor((s.h - 1) / 2)));
  const r = placeAt(inv.pack, h, ax, ay);
  if (r === false) return;
  held.value = r;
  SFX.pickup();
  changed();
}

/** Left-click on an equipment slot: take the item, or put the held item on (swapping with what was there). */
export function clickEquip(slot: EquipSlot): void {
  const inv = G.hero.inv, h = held.value;
  if (!h) {
    const it = inv.equip[slot];
    if (!it) return;
    inv.equip[slot] = null;
    held.value = it;
    SFX.pickup();
    changed();
    return;
  }
  if (h.kind !== 'equip' || slotFor(h) !== slot) return;
  if (!meetsReq(h, attrs())) { toast('CANNOT USE', `NEEDS ${reqText(h)}`); return; }
  // Equipping a two-handed weapon over a weapon *and* a shield: the shield goes to the backpack.
  const extra = slot === 'weapon' && isTwoHanded(h) && inv.equip.weapon && inv.equip.shield ? inv.equip.shield : null;
  if (extra) {
    const s = itemSize(extra);
    if (!findSpot(inv.pack, s.w, s.h)) { toast('NO ROOM FOR THE SHIELD'); return; }
  }
  const out = equipInto(inv, slot, h);
  if (!out) return;
  if (extra) putInGrid(inv.pack, extra);
  held.value = out.find(o => o !== extra) ?? null;
  SFX.pickup();
  changed();
}

/** Left-click on a belt slot while the inventory is open: take or place potions. */
export function clickBelt(slot: number): void {
  const inv = G.hero.inv, h = held.value;
  if (h && !beltable(h)) return;
  const prev = inv.belt[slot];
  if (!h && !prev) return;
  inv.belt[slot] = h;
  held.value = prev;
  SFX.potion();
  changed();
}

/** Right-click / X on a backpack item: drink, read, or equip. */
export function usePackItem(it: Item): void {
  const inv = G.hero.inv;
  if (it.kind === 'potion') { removeFromGrid(inv.pack, it); drinkPotion(it.potion); changed(); return; }
  if (it.kind === 'elixir') { if (drinkElixir(it.attr)) { removeFromGrid(inv.pack, it); changed(); } return; }
  if (!meetsReq(it, attrs())) { toast('CANNOT USE', `NEEDS ${reqText(it)}`); return; }
  if (equipFromPack(inv, it)) { SFX.pickup(); changed(); }
  else toast('NO ROOM IN THE BACKPACK');
}

/** Right-click / X on an equipped item: move it to the backpack. */
export function unequip(slot: EquipSlot): void {
  if (!G.hero.inv.equip[slot]) return;
  if (unequipToPack(G.hero.inv, slot)) { SFX.pickup(); changed(); }
  else toast('NO ROOM IN THE BACKPACK');
}

/** Drops the held item at the hero's feet. It stays there until picked up with E. */
export function dropHeld(): void {
  const it = held.value;
  if (!it) return;
  spawnItem(it, G.hero.x, G.hero.z, true);
  held.value = null;
  SFX.pickup();
  changed();
}

/* ---------- keyboard ---------- */

/** Equipment slots in on-screen order for arrow-key cycling. */
const EQUIP_NAV: readonly EquipSlot[] = ['weapon', 'ring1', 'head', 'body', 'amulet', 'ring2', 'shield'];

function moveCursor(dx: number, dy: number): void {
  const c = cursor.value;
  if (c.area === 'pack') {
    const ny = c.y + dy;
    if (ny < 0) { cursor.value = { area: 'equip', slot: c.x < 3 ? 'weapon' : c.x > 6 ? 'shield' : 'body' }; return; }
    cursor.value = { area: 'pack', x: Math.max(0, Math.min(PACK_W - 1, c.x + dx)), y: Math.min(PACK_H - 1, ny) };
  } else {
    if (dy > 0) { cursor.value = { area: 'pack', x: c.slot === 'shield' ? 8 : c.slot === 'weapon' ? 0 : 4, y: 0 }; return; }
    const i = EQUIP_NAV.indexOf(c.slot), n = EQUIP_NAV.length, step = dx || -1;
    cursor.value = { area: 'equip', slot: EQUIP_NAV[(i + step + n) % n] };
  }
}

function cursorItem(): Item | null {
  const c = cursor.value, inv = G.hero.inv;
  return c.area === 'pack' ? itemAt(inv.pack, c.x, c.y)?.item ?? null : inv.equip[c.slot];
}

addEventListener('keydown', e => {
  if (e.code === 'KeyC') { e.preventDefault(); togglePanel('char'); return; }
  if (e.code === 'KeyI') { e.preventDefault(); togglePanel('inv'); return; }
  if (openPanels.value.length && (e.code === 'Escape' || e.code === 'Space')) { e.preventDefault(); closePanels(); return; }
  if (!isOpen('inv')) {
    if (e.code === 'KeyE' && !G.paused) { e.preventDefault(); pickupNearest(); }
    return;
  }
  const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (arrows[e.code]) { e.preventDefault(); moveCursor(...arrows[e.code]); return; }
  const c = cursor.value;
  if (e.code === 'Enter') { e.preventDefault(); c.area === 'pack' ? clickPack(c.x, c.y) : clickEquip(c.slot); }
  else if (e.code === 'KeyX') {
    e.preventDefault();
    const it = cursorItem();
    if (it) c.area === 'pack' ? usePackItem(it) : unequip(c.slot);
  } else if (e.code === 'KeyG') { e.preventDefault(); dropHeld(); }
  else if (/^Digit[1-8]$/.test(e.code)) { e.preventDefault(); clickBelt(+e.code.slice(5) - 1); }
});

/** Belt slot clicks: with the inventory open the belt takes and places potions; otherwise right-click drinks. */
export function beltClick(slot: number, button: 'left' | 'right'): void {
  if (isOpen('inv') && button === 'left') clickBelt(slot);
  else if (button === 'right') {
    if (G.paused) {
      const it = takeFromBelt(G.hero.inv, slot);
      if (it?.kind === 'potion') { drinkPotion(it.potion); changed(); }
    } else queueBelt(slot);
  }
}

