/**
 * The town's people and their stock (SPEC §13.2). Stock lives on `G.shops`; the smith's and peddler's are saved,
 * the witch's and healer's random items reroll on every load [USER Q19].
 */
import { R } from '../core/math';
import type { EquipItem, Item } from '../rules/inventory';
import { itemPrice } from '../rules/prices';
import {
  FIXED, PEDDLER_MARKUP, PREMIUM_OFFSETS, levelPremium, makeFixed, rollHealer, rollPeddler, rollPremium, rollPremiumList, rollSmithBasic,
  rollWitch, storeIlvl,
  type FixedItem, type MerchantId,
} from '../rules/shops';
import { G } from './state';

export type NpcId = MerchantId | 'sage';

/** Original names with their roles [USER Q17]; `role` is how lines like "THE SMITH WILL NOT BUY THIS" refer to them. */
export const NPCS: Record<NpcId, { name: string; role: string }> = {
  smith: { name: 'Halvard the Smith', role: 'the smith' },
  witch: { name: 'Morwen the Witch', role: 'the witch' },
  healer: { name: 'Aldric the Healer', role: 'the healer' },
  sage: { name: 'Tobias the Sage', role: 'the sage' },
  peddler: { name: 'Pip the Peddler', role: 'the peddler' },
};

export interface ShopStock {
  smith: EquipItem[];
  premium: EquipItem[];
  /** clvl the premium list was last brought up to (D1 shifts it once per level gained). */
  premiumLvl: number;
  witch: Item[];
  healer: Item[];
  /** `item` null: bought, a new one comes after the next trip down. `seen`: the 50 gold to look were paid. */
  peddler: { item: EquipItem | null; seen: boolean; lvl: number };
}

/** The saved part of the stock (SPEC §12.2). */
export type SavedShops = Omit<ShopStock, 'witch' | 'healer'>;

/** Fresh stock for the current character. */
export function newShops(): ShopStock {
  const ilvl = storeIlvl(G.deepest), clvl = G.hero.stats.clvl;
  return {
    smith: rollSmithBasic(R, ilvl), premium: rollPremiumList(R, clvl), premiumLvl: clvl,
    witch: rollWitch(R, ilvl), healer: rollHealer(R, ilvl),
    peddler: { item: rollPeddler(R, clvl), seen: false, lvl: clvl },
  };
}

export const saveShops = (s: ShopStock): SavedShops => ({ smith: s.smith, premium: s.premium, premiumLvl: s.premiumLvl, peddler: s.peddler });

/** Loading rerolls the witch's and healer's random items, as D1 single player does [USER Q19]. */
export function loadShops(s: SavedShops): ShopStock {
  const ilvl = storeIlvl(G.deepest);
  return { ...s, witch: rollWitch(R, ilvl), healer: rollHealer(R, ilvl) };
}

/**
 * Coming up from the dungeon (by any way, death included): the smith's basic stock and the witch's and healer's
 * random items renew, and a bought peddler item is replaced (D1).
 */
export function restockShops(): void {
  const s = G.shops, ilvl = storeIlvl(G.deepest);
  s.smith = rollSmithBasic(R, ilvl);
  s.witch = rollWitch(R, ilvl);
  s.healer = rollHealer(R, ilvl);
  if (!s.peddler.item) s.peddler = { item: rollPeddler(R, G.hero.stats.clvl), seen: false, lvl: G.hero.stats.clvl };
}

/**
 * Level-ups since the stock was last seen: the premium list shifts once per level, and the peddler brings a new
 * item when an even level was reached (D1). Applied when someone in town is spoken to.
 */
export function catchUpShops(): void {
  const s = G.shops, clvl = G.hero.stats.clvl;
  if (s.premiumLvl < clvl) { s.premium = levelPremium(R, s.premium, s.premiumLvl, clvl); s.premiumLvl = clvl; }
  if (Math.floor(clvl / 2) > Math.floor(s.peddler.lvl / 2)) s.peddler = { item: rollPeddler(R, clvl), seen: false, lvl: clvl };
}

/** One line in a shop: what is shown, what it costs, and how buying takes it out of the stock. */
export interface Offer { item: Item; price: number; take: () => Item }

const fromList = (list: Item[], it: Item, price = itemPrice(it)): Offer =>
  ({ item: it, price, take: () => { list.splice(list.indexOf(it), 1); return it; } });

/** Display copies of the unlimited items (negative uids: never stored anywhere). */
const fixedOffer = (f: FixedItem, i: number): Offer => {
  const shown: Item = f.kind === 'potion' ? { uid: -1 - i, kind: 'potion', potion: f.potion } : { uid: -1 - i, kind: 'scroll', spell: f.spell };
  return { item: shown, price: itemPrice(shown), take: () => makeFixed(f) };
};

/** What `id` offers now; the smith shows his basic or premium list. */
export function offers(id: MerchantId, premium = false): Offer[] {
  const s = G.shops;
  switch (id) {
    case 'smith': return premium
      ? s.premium.map((it, i) => ({ item: it, price: itemPrice(it), take: () => { s.premium[i] = rollPremium(R, G.hero.stats.clvl + PREMIUM_OFFSETS[i]); return it; } }))
      : s.smith.map(it => fromList(s.smith, it));
    case 'witch': return [...FIXED.witch.map(fixedOffer), ...s.witch.map(it => fromList(s.witch, it))];
    case 'healer': return [...FIXED.healer.map(fixedOffer), ...s.healer.map(it => fromList(s.healer, it))];
    case 'peddler': {
      const it = s.peddler.item;
      return it ? [{ item: it, price: Math.round(itemPrice(it) * PEDDLER_MARKUP), take: () => { s.peddler.item = null; return it; } }] : [];
    }
  }
}
