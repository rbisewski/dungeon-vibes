/**
 * UI commands. Panels and the inventory never mutate the hero directly; they go through these functions, which keep
 * derived stats, the HUD and the panel snapshots in sync. SPEC.md §2.1, §10.1, §10.2.
 */
import { signal } from '@preact/signals';
import { drinkElixir, drinkPotion, recompute, spendHeroPoint } from '../actors/heroStats';
import { SFX } from '../audio/sfx';
import { queueBelt, resetInput } from '../core/input';
import { G, STASH_H, STASH_W } from '../game/state';
import { saveGame } from '../game/save';
import { base } from '../rules/bases';
import type { Attr } from '../rules/classes';
import {
  addItem, beltable, carried, equipFromPack, equipInto, findSpot, fitsSlot, isTwoHanded, isUnidentified, itemAt, itemName,
  itemSize, meetsReq, placeAt, putInGrid, removeFromGrid, storeTarget, takeFromBelt, unequipToPack, PACK_W, PACK_H, type EquipSlot, type Grid, type Item,
} from '../rules/inventory';
import { pickupNearest, spawnItem } from '../world/groundItems';
import { heroManaCost, startCast } from '../actors/spells';
import { canLearn, learnReq, MAX_SLVL, scrollReq, SPELLS, type SpellId } from '../rules/spells';
import { sellPrice } from '../rules/prices';
import { buys, PEDDLER_LOOK, SAGE_FEE, type MerchantId } from '../rules/shops';
import { catchUpShops, NPCS, offers, type NpcId, type Offer } from '../game/shops';
import { isOpen, openPanels, toast, type Panel } from './store';
import { syncHud, syncSheet } from './syncHud';

/** The item on the cursor while the inventory is open (D1 "holding" an item). */
export const held = signal<Item | null>(null);
/** Bumped after every inventory change so panels re-read the (mutable) inventory. */
export const invVersion = signal(0);

/** Keyboard cursor in the inventory: a backpack, stash or shop-list position, or an equipment slot. */
export type Cursor =
  | { area: 'pack'; x: number; y: number } | { area: 'stash'; x: number; y: number } | { area: 'shop'; i: number } | { area: 'equip'; slot: EquipSlot };
export const cursor = signal<Cursor>({ area: 'pack', x: 0, y: 0 });
/** Whether the keyboard cursor is drawn: only once the arrow keys are used, until the mouse moves again. */
export const keyNav = signal(false);
addEventListener('pointermove', () => { if (keyNav.value) keyNav.value = false; });

/** Where the Scroll of Identify being read sits; while set, inventory clicks choose the item to identify. */
export type ScrollSource = { belt: number } | { pack: Item };
/** What pays for an identification: a scroll, the Identify spell's mana, or the sage's fee. */
export type IdentifySource = ScrollSource | { spell: true } | { sage: true };
export const identifying = signal<IdentifySource | null>(null);
/** The merchant whose shop is open (SPEC §13.2), and whether the smith shows his premium list. */
export const shopFor = signal<MerchantId | null>(null);
export const smithPremium = signal(false);
/** Spell under the mouse in the spellbook (F5–F8 assigns it). */
export const hoverSpell = signal<SpellId | null>(null);
/** uid of the item that was just identified (its cell sparkles briefly). */
export const sparkle = signal<number | null>(null);

/** Panels cannot open mid-transition or while the hero is dead or descending. */
const canOpen = (): boolean => !G.inMenu && !G.transition && !G.hero.dead && G.hero.descend <= 0;

function changed(): void {
  recompute(G.hero);
  invVersion.value++;
  syncSheet();
  syncHud();
}

const LEFT: readonly Panel[] = ['char', 'book', 'stash', 'shop'];

export function openPanel(p: Panel): void {
  if (!canOpen() || isOpen(p)) return;
  const left = LEFT.includes(p);
  const keep = openPanels.value.filter(q => q !== 'menu' && !(left && LEFT.includes(q)));
  // The stash and shops always show the inventory beside them (SPEC §13.1, §13.2).
  openPanels.value = p === 'menu' ? ['menu'] : p === 'stash' || p === 'shop' ? [...keep.filter(q => q !== 'inv'), p, 'inv'] : [...keep, p];
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
  if (p === 'inv' || p === 'stash' || p === 'shop') { stowHeld(); identifying.value = null; }
  // closing either half of the stash or shop view closes both
  const pair = (['stash', 'shop'] as const).find(q => isOpen(q) && (p === q || p === 'inv'));
  openPanels.value = openPanels.value.filter(q => q !== p && !(pair && (q === pair || q === 'inv')));
  G.paused = openPanels.value.length > 0;
  resetInput();
  if (pair) tradeClosed();
}

export function closePanels(): void {
  const pair = isOpen('stash') || isOpen('shop');
  stowHeld();
  identifying.value = null;
  openPanels.value = [];
  G.paused = false;
  resetInput();
  if (pair) tradeClosed();
}

/** Closing the stash or a shop saves the character (SPEC §12.2). */
function tradeClosed(): void {
  if (cursor.value.area === 'stash' || cursor.value.area === 'shop') cursor.value = { area: 'pack', x: 0, y: 0 };
  shopFor.value = null;
  saveGame();
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

/** Current attributes (base + items): what D1 checks requirements against. */
const attrs = () => G.hero.d.attr;

function reqText(it: Item): string {
  if (it.kind !== 'equip') return '';
  const r = base(it.base).req;
  return (['str', 'dex', 'int'] as const).filter(a => (r[a] ?? 0) > attrs()[a]).map(a => `${r[a]} ${a.toUpperCase()}`).join(', ');
}

/**
 * Identification (SPEC §6.4): opens the inventory in target mode. The scroll (or the spell's mana) is used only when
 * an item is chosen; with nothing to identify nothing is spent.
 */
function beginIdentify(src: IdentifySource): void {
  if (!carried(G.hero.inv).some(isUnidentified)) { toast('NOTHING TO IDENTIFY'); return; }
  if ('spell' in src && G.hero.mana < heroManaCost(G.hero, 'identify')) { SFX.fizzle(); toast('NOT ENOUGH MANA'); return; }
  if ('sage' in src && G.hero.gold < SAGE_FEE) { toast('NOT ENOUGH GOLD', `THE SAGE ASKS ${SAGE_FEE} GOLD`); return; }
  openPanel('inv');
  if (!isOpen('inv')) return;
  identifying.value = src;
  toast('IDENTIFY', 'sage' in src ? `${SAGE_FEE} GOLD EACH - ESC CANCELS` : 'CHOOSE AN ITEM - ESC CANCELS');
}

/**
 * Reads a scroll from the belt or backpack (SPEC §5.3): needs Intelligence but no mana, and casts at the known spell
 * level (at least 1). Reading from the backpack closes the panels first so the spell plays out.
 */
export function readScroll(src: ScrollSource): void {
  const h = G.hero, it = 'belt' in src ? h.inv.belt[src.belt] : src.pack;
  if (!it || it.kind !== 'scroll') return;
  const need = scrollReq(it.spell);
  if (h.d.attr.int < need) { SFX.fizzle(); toast('NOT ENOUGH INTELLIGENCE', `NEEDS ${need} INT`); return; }
  if (it.spell === 'identify') { beginIdentify(src); return; }
  if (G.paused) closePanels();
  if (!startCast(it.spell, true)) return;
  if ('belt' in src) takeFromBelt(h.inv, src.belt);
  else removeFromGrid(h.inv.pack, it);
  changed();
}

/** Casts the readied spell (Q / gamepad RB). Identify opens the inventory in target mode instead. */
export function castReadied(): void {
  const id = G.hero.readied;
  if (!id) { toast('NO SPELL READIED', 'PRESS B FOR THE SPELLBOOK'); return; }
  if (id === 'identify') beginIdentify({ spell: true });
  else startCast(id, false);
}

/** Reads a spellbook (SPEC §5.1): learn or raise the spell when Intelligence allows; refused otherwise. */
function learnBook(it: Extract<Item, { kind: 'book' }>): void {
  const h = G.hero, known = h.spells[it.spell] ?? 0, n = canLearn(it.spell, known, h.d.attr.int);
  if (n === null) {
    SFX.fizzle();
    if (known >= MAX_SLVL) toast('ALREADY MASTERED');
    else toast('NOT ENOUGH INTELLIGENCE', `NEEDS ${learnReq(it.spell, known + 1)} INT`);
    return;
  }
  const def = SPELLS[it.spell];
  h.spells[it.spell] = n;
  // D1: reading a book restores mana equal to the spell's initial cost.
  h.mana = Math.min(h.d.maxMana, h.mana + def.mana.initial);
  if (!h.readied) h.readied = it.spell;
  removeFromGrid(h.inv.pack, it);
  SFX.learn();
  toast(n === 1 ? `LEARNED ${def.name.toUpperCase()}` : `${def.name.toUpperCase()} LEVEL ${n}`);
  changed();
}

/** Makes `id` the spell Q casts. */
export function readySpell(id: SpellId): void {
  if (!G.hero.spells[id]) return;
  G.hero.readied = id;
  invVersion.value++;
  syncHud();
}

/** F5–F8: with the spellbook open, assigns the hovered spell; otherwise readies the assigned spell (D1). */
function spellHotkey(i: number): void {
  const h = G.hero;
  if (isOpen('book') && hoverSpell.value) {
    h.hotkeys = h.hotkeys.map((s, j) => (j === i ? hoverSpell.value : s === hoverSpell.value ? null : s));
    toast(`F${i + 5}: ${SPELLS[hoverSpell.value].name.toUpperCase()}`);
    invVersion.value++;
    return;
  }
  const id = h.hotkeys[i];
  if (id) { readySpell(id); toast(SPELLS[id].name.toUpperCase()); }
}

function identify(it: Item | null): void {
  const src = identifying.value, inv = G.hero.inv;
  if (!src || !it || it.kind !== 'equip' || it.identified) return;
  if ('spell' in src) {
    const cost = heroManaCost(G.hero, 'identify');
    if (G.hero.mana < cost) { SFX.fizzle(); toast('NOT ENOUGH MANA'); identifying.value = null; return; }
    G.hero.mana -= cost;
  } else if ('sage' in src) {
    if (G.hero.gold < SAGE_FEE) { toast('NOT ENOUGH GOLD'); identifying.value = null; return; }
    G.hero.gold -= SAGE_FEE;
  } else if ('belt' in src) takeFromBelt(inv, src.belt);
  else removeFromGrid(inv.pack, src.pack);
  it.identified = true;
  // the sage keeps going while there is something left to identify and gold to pay for it
  identifying.value = 'sage' in src && G.hero.gold >= SAGE_FEE && carried(inv).some(isUnidentified) ? src : null;
  sparkle.value = it.uid;
  setTimeout(() => { if (sparkle.value === it.uid) sparkle.value = null; }, 900);
  SFX.identify();
  toast(itemName(it).toUpperCase());
  changed();
}

/**
 * Left-click on a grid cell (backpack or stash): pick up, place, or swap (D1). The held item is anchored so the clicked
 * cell is near its middle.
 */
function clickGrid(g: Grid, x: number, y: number): void {
  const h = held.value;
  if (identifying.value) { identify(itemAt(g, x, y)?.item ?? null); return; }
  if (!h) {
    const p = itemAt(g, x, y);
    if (!p) return;
    removeFromGrid(g, p.item);
    held.value = p.item;
    SFX.pickup();
    changed();
    return;
  }
  const s = itemSize(h);
  const ax = Math.max(0, Math.min(g.w - s.w, x - Math.floor((s.w - 1) / 2)));
  const ay = Math.max(0, Math.min(g.h - s.h, y - Math.floor((s.h - 1) / 2)));
  const r = placeAt(g, h, ax, ay);
  if (r === false) return;
  held.value = r;
  SFX.pickup();
  changed();
}

export const clickPack = (x: number, y: number): void => clickGrid(G.hero.inv.pack, x, y);
export const clickStash = (x: number, y: number): void => clickGrid(G.stash.grid, x, y);

/** Right-click / X on a stash item: move it to the backpack (SPEC §13.1). */
export function stashToPack(it: Item): void {
  if (!putInGrid(G.hero.inv.pack, it)) { toast('NO ROOM IN THE BACKPACK'); return; }
  removeFromGrid(G.stash.grid, it);
  SFX.pickup(); changed();
}

function packToStash(it: Item): void {
  if (!putInGrid(G.stash.grid, it)) { toast('THE STASH IS FULL'); return; }
  removeFromGrid(G.hero.inv.pack, it);
  SFX.pickup(); changed();
}

/** Stash gold is one counter: everything carried goes in, or everything stored comes out. */
export function depositGold(): void { G.stash.gold += G.hero.gold; G.hero.gold = 0; SFX.coin(); changed(); }
export function withdrawGold(): void { G.hero.gold += G.stash.gold; G.stash.gold = 0; SFX.coin(); changed(); }

/** Left-click on an equipment slot: take the item, or put the held item on (swapping with what was there). */
export function clickEquip(slot: EquipSlot): void {
  const inv = G.hero.inv, h = held.value;
  if (identifying.value) { identify(inv.equip[slot]); return; }
  if (!h) {
    const it = inv.equip[slot];
    if (!it) return;
    inv.equip[slot] = null;
    held.value = it;
    SFX.pickup();
    changed();
    return;
  }
  if (h.kind !== 'equip' || !fitsSlot(h, slot)) return;
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
  if (identifying.value) return;
  if (h && !beltable(h)) return;
  const prev = inv.belt[slot];
  if (!h && !prev) return;
  inv.belt[slot] = h;
  held.value = prev;
  SFX.potion();
  changed();
}

/**
 * Right-click / X on a backpack item: drink, read, or equip; with the stash open, move it into the stash; with a
 * shop open, sell it.
 */
export function usePackItem(it: Item): void {
  const inv = G.hero.inv;
  if (isOpen('stash')) { packToStash(it); return; }
  if (shopFor.value) { sellItem(it); return; }
  if (it.kind === 'potion') { removeFromGrid(inv.pack, it); drinkPotion(it.potion); changed(); return; }
  if (it.kind === 'elixir') { if (drinkElixir(it.attr)) { removeFromGrid(inv.pack, it); changed(); } return; }
  if (it.kind === 'scroll') { readScroll({ pack: it }); return; }
  if (it.kind === 'book') { learnBook(it); return; }
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

/* ---------- town (SPEC §13.2) ---------- */

/**
 * Walking up to someone in town. The healer first heals the hero for free; the sage opens the inventory to identify
 * for a fee; the merchants open their shop beside the inventory.
 */
export function openNpc(id: NpcId): void {
  const h = G.hero;
  catchUpShops();
  if (id === 'sage') { beginIdentify({ sage: true }); return; }
  if (id === 'healer' && h.life < h.d.maxLife) { h.life = h.d.maxLife; h.poisonT = 0; SFX.potion(); toast('YOU ARE HEALED'); }
  shopFor.value = id;
  smithPremium.value = false;
  openPanel('shop');
}

/** Buys an offer: needs the gold and room for it (belt first for potions and scrolls, as when picking up). */
export function buyOffer(o: Offer): void {
  const h = G.hero;
  if (h.gold < o.price) { SFX.fizzle(); toast('NOT ENOUGH GOLD'); return; }
  if (!storeTarget(h.inv, o.item)) { SFX.fizzle(); toast('NO ROOM'); return; }
  h.gold -= o.price;
  addItem(h.inv, o.take());
  SFX.coin();
  changed();
}

/** The peddler shows his item only for a fee (D1). */
export function payPeddler(): void {
  const h = G.hero;
  if (h.gold < PEDDLER_LOOK) { SFX.fizzle(); toast('NOT ENOUGH GOLD'); return; }
  h.gold -= PEDDLER_LOOK;
  G.shops.peddler.seen = true;
  SFX.coin();
  changed();
}

/** Sells a backpack item to the open shop for a quarter of its price, if that merchant buys its kind (D1). */
function sellItem(it: Item): void {
  const m = shopFor.value;
  if (!m) return;
  if (!buys(m, it)) { SFX.fizzle(); toast(`${NPCS[m].role.toUpperCase()} WILL NOT BUY THIS`); return; }
  removeFromGrid(G.hero.inv.pack, it);
  G.hero.gold += sellPrice(it);
  SFX.coin();
  changed();
}

/** The open shop's current offers. */
export const shopOffers = (): Offer[] => (shopFor.value ? offers(shopFor.value, smithPremium.value) : []);

/* ---------- keyboard ---------- */

/** Equipment slots in on-screen order for arrow-key cycling. */
const EQUIP_NAV: readonly EquipSlot[] = ['weapon', 'ring1', 'head', 'body', 'amulet', 'ring2', 'shield'];

function moveCursor(dx: number, dy: number): void {
  const c = cursor.value;
  // with the stash open, the stash grid sits left of the backpack
  if (c.area === 'stash') {
    if (c.x + dx >= STASH_W) { cursor.value = { area: 'pack', x: 0, y: Math.min(PACK_H - 1, c.y) }; return; }
    cursor.value = { area: 'stash', x: Math.max(0, c.x + dx), y: Math.max(0, Math.min(STASH_H - 1, c.y + dy)) };
    return;
  }
  if (c.area === 'pack' && c.x + dx < 0 && isOpen('stash')) { cursor.value = { area: 'stash', x: STASH_W - 1, y: c.y }; return; }
  // with a shop open, its list sits left of the backpack
  if (c.area === 'shop') {
    const n = shopOffers().length;
    if (dx > 0) { cursor.value = { area: 'pack', x: 0, y: Math.min(PACK_H - 1, c.i) }; return; }
    cursor.value = { area: 'shop', i: Math.max(0, Math.min(n - 1, c.i + dy)) };
    return;
  }
  if (c.area === 'pack' && c.x + dx < 0 && isOpen('shop')) { cursor.value = { area: 'shop', i: c.y }; return; }
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
  if (c.area === 'shop') return shopOffers()[c.i]?.item ?? null;
  return c.area === 'equip' ? inv.equip[c.slot] : itemAt(c.area === 'pack' ? inv.pack : G.stash.grid, c.x, c.y)?.item ?? null;
}

/** Enter in the shop list: buy the selected offer (the peddler first wants his fee). */
function shopEnter(i: number): void {
  if (shopFor.value === 'peddler' && !G.shops.peddler.seen) { payPeddler(); return; }
  const o = shopOffers()[i];
  if (o) buyOffer(o);
}

addEventListener('keydown', e => {
  if (G.inMenu) return;
  if (e.code === 'KeyC') { e.preventDefault(); togglePanel('char'); return; }
  if (e.code === 'KeyI') { e.preventDefault(); togglePanel('inv'); return; }
  if (e.code === 'KeyB') { e.preventDefault(); togglePanel('book'); return; }
  if (/^F[5-8]$/.test(e.code)) { e.preventDefault(); spellHotkey(+e.code.slice(1) - 5); return; }
  if (identifying.value && e.code === 'Escape') { e.preventDefault(); identifying.value = null; toast('IDENTIFY CANCELLED'); return; }
  if (openPanels.value.length && (e.code === 'Escape' || e.code === 'Space')) { e.preventDefault(); closePanels(); return; }
  if (e.code === 'Escape') { e.preventDefault(); openPanel('menu'); return; }
  if (isOpen('menu')) return;
  if (!isOpen('inv')) {
    if (e.code === 'KeyE' && !G.paused) { e.preventDefault(); pickupNearest(); }
    return;
  }
  const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (arrows[e.code]) { e.preventDefault(); keyNav.value = true; moveCursor(...arrows[e.code]); return; }
  const c = cursor.value;
  if (e.code === 'Tab' && shopFor.value === 'smith') { e.preventDefault(); smithPremium.value = !smithPremium.value; if (c.area === 'shop') cursor.value = { area: 'shop', i: 0 }; return; }
  if (e.code === 'Enter') {
    e.preventDefault();
    if (c.area === 'equip') clickEquip(c.slot);
    else if (c.area === 'pack') clickPack(c.x, c.y);
    else if (c.area === 'stash') clickStash(c.x, c.y);
    else shopEnter(c.i);
  } else if (e.code === 'KeyX') {
    e.preventDefault();
    const it = cursorItem();
    if (!it || c.area === 'shop') return;
    if (c.area === 'equip') unequip(c.slot);
    else if (c.area === 'pack') usePackItem(it);
    else stashToPack(it);
  } else if (e.code === 'KeyG') { e.preventDefault(); dropHeld(); }
  else if (/^Digit[1-8]$/.test(e.code)) { e.preventDefault(); clickBelt(+e.code.slice(5) - 1); }
});

/** Belt slot clicks: with the inventory open the belt takes and places potions; otherwise right-click drinks. */
export function beltClick(slot: number, button: 'left' | 'right'): void {
  if (isOpen('inv') && button === 'left') clickBelt(slot);
  else if (button === 'right' && G.hero.inv.belt[slot]?.kind === 'scroll') readScroll({ belt: slot });
  else if (button === 'right') {
    if (G.paused) {
      const it = takeFromBelt(G.hero.inv, slot);
      if (it?.kind === 'potion') { drinkPotion(it.potion); changed(); }
    } else queueBelt(slot);
  }
}

