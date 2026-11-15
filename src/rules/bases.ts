/** Equipment base items: D1 stats (Jarulf's Guide §3.1), footprints [OURS]. SPEC.md §6.1. */
import type { Attrs, WeaponKind } from './classes';

export type Req = Partial<Attrs>;
export type ArmorSlot = 'head' | 'body' | 'shield';

interface BaseCommon { name: string; w: number; h: number; qlvl: number; req: Req }
export interface WeaponBase extends BaseCommon { kind: 'weapon'; wk: Exclude<WeaponKind, 'bare'>; dmg: readonly [number, number]; twoHanded: boolean }
export interface ArmorBase extends BaseCommon { kind: 'armor'; slot: ArmorSlot; ac: readonly [number, number] }
/** Rings and amulets: no stats of their own and always magic or unique (D1). */
export interface JewelryBase extends BaseCommon { kind: 'jewelry'; slot: 'ring' | 'amulet' }
export type Base = WeaponBase | ArmorBase | JewelryBase;

const W = (name: string, wk: WeaponBase['wk'], w: number, h: number, dmg: [number, number], qlvl: number, req: Req = {}, twoHanded = false): WeaponBase =>
  ({ kind: 'weapon', name, wk, w, h, dmg, qlvl, req, twoHanded });
const A = (name: string, slot: ArmorSlot, w: number, h: number, ac: [number, number], qlvl: number, req: Req = {}): ArmorBase =>
  ({ kind: 'armor', name, slot, w, h, ac, qlvl, req });
const J = (name: string, slot: JewelryBase['slot'], qlvl: number): JewelryBase => ({ kind: 'jewelry', name, slot, w: 1, h: 1, qlvl, req: {} });

export const BASES = {
  // swords
  dagger: W('Dagger', 'sword', 1, 2, [1, 4], 1),
  short_sword: W('Short Sword', 'sword', 1, 3, [2, 6], 1, { str: 18 }),
  sabre: W('Sabre', 'sword', 1, 3, [1, 8], 1, { str: 17 }),
  falchion: W('Falchion', 'sword', 1, 3, [4, 8], 2, { str: 30 }),
  scimitar: W('Scimitar', 'sword', 1, 3, [3, 7], 4, { str: 23, dex: 23 }),
  long_sword: W('Long Sword', 'sword', 1, 3, [2, 10], 6, { str: 30, dex: 30 }),
  broad_sword: W('Broad Sword', 'sword', 1, 3, [4, 12], 8, { str: 40 }),
  bastard_sword: W('Bastard Sword', 'sword', 1, 3, [6, 15], 10, { str: 50 }),
  great_sword: W('Great Sword', 'sword', 2, 3, [10, 20], 17, { str: 75 }, true),
  // axes (all two-handed)
  small_axe: W('Small Axe', 'axe', 2, 3, [2, 10], 2, {}, true),
  axe: W('Axe', 'axe', 2, 3, [4, 12], 4, { str: 22 }, true),
  large_axe: W('Large Axe', 'axe', 2, 3, [6, 16], 6, { str: 30 }, true),
  broad_axe: W('Broad Axe', 'axe', 2, 3, [8, 20], 8, { str: 50 }, true),
  battle_axe: W('Battle Axe', 'axe', 2, 3, [10, 25], 10, { str: 65 }, true),
  great_axe: W('Great Axe', 'axe', 2, 3, [12, 30], 12, { str: 80 }, true),
  // clubs
  club: W('Club', 'club', 1, 3, [1, 6], 1),
  mace: W('Mace', 'club', 1, 3, [1, 8], 2, { str: 16 }),
  morning_star: W('Morning Star', 'club', 1, 3, [1, 10], 3, { str: 26 }),
  war_hammer: W('War Hammer', 'club', 1, 3, [5, 9], 5, { str: 40 }),
  flail: W('Flail', 'club', 1, 3, [2, 12], 7, { str: 30 }),
  maul: W('Maul', 'club', 2, 3, [6, 20], 10, { str: 55 }, true),
  // staves (two-handed, no spell charges)
  short_staff: W('Short Staff', 'staff', 1, 4, [2, 4], 1, {}, true),
  long_staff: W('Long Staff', 'staff', 1, 4, [4, 8], 4, {}, true),
  composite_staff: W('Composite Staff', 'staff', 1, 4, [5, 10], 6, {}, true),
  quarter_staff: W('Quarter Staff', 'staff', 1, 4, [6, 12], 9, { str: 20 }, true),
  war_staff: W('War Staff', 'staff', 1, 4, [8, 16], 12, { str: 30 }, true),
  // bows (two-handed)
  short_bow: W('Short Bow', 'bow', 2, 3, [1, 4], 1, {}, true),
  hunters_bow: W("Hunter's Bow", 'bow', 2, 3, [2, 5], 3, { str: 20, dex: 35 }, true),
  long_bow: W('Long Bow', 'bow', 2, 3, [1, 6], 5, { str: 25, dex: 30 }, true),
  composite_bow: W('Composite Bow', 'bow', 2, 3, [3, 6], 7, { str: 25, dex: 40 }, true),
  short_battle_bow: W('Short Battle Bow', 'bow', 2, 3, [3, 7], 9, { str: 30, dex: 50 }, true),
  long_battle_bow: W('Long Battle Bow', 'bow', 2, 3, [1, 10], 11, { str: 30, dex: 60 }, true),
  short_war_bow: W('Short War Bow', 'bow', 2, 3, [4, 8], 15, { str: 35, dex: 70 }, true),
  long_war_bow: W('Long War Bow', 'bow', 2, 3, [1, 14], 19, { str: 45, dex: 80 }, true),
  // helms
  cap: A('Cap', 'head', 2, 2, [1, 3], 1),
  skull_cap: A('Skull Cap', 'head', 2, 2, [2, 4], 4),
  helm: A('Helm', 'head', 2, 2, [4, 6], 8, { str: 25 }),
  full_helm: A('Full Helm', 'head', 2, 2, [6, 8], 12, { str: 35 }),
  crown: A('Crown', 'head', 2, 2, [8, 12], 16),
  great_helm: A('Great Helm', 'head', 2, 2, [10, 15], 20, { str: 50 }),
  // body armor
  rags: A('Rags', 'body', 2, 3, [2, 6], 1),
  cape: A('Cape', 'body', 2, 3, [1, 5], 1),
  cloak: A('Cloak', 'body', 2, 3, [3, 7], 2),
  robe: A('Robe', 'body', 2, 3, [4, 7], 3),
  quilted_armor: A('Quilted Armor', 'body', 2, 3, [7, 10], 4),
  leather_armor: A('Leather Armor', 'body', 2, 3, [10, 13], 6),
  hard_leather_armor: A('Hard Leather Armor', 'body', 2, 3, [11, 14], 7),
  studded_leather_armor: A('Studded Leather Armor', 'body', 2, 3, [15, 17], 9, { str: 20 }),
  ring_mail: A('Ring Mail', 'body', 2, 3, [17, 20], 11, { str: 25 }),
  chain_mail: A('Chain Mail', 'body', 2, 3, [18, 22], 13, { str: 30 }),
  scale_mail: A('Scale Mail', 'body', 2, 3, [23, 28], 15, { str: 35 }),
  breast_plate: A('Breast Plate', 'body', 2, 3, [20, 24], 16, { str: 40 }),
  splint_mail: A('Splint Mail', 'body', 2, 3, [30, 35], 17, { str: 40 }),
  plate_mail: A('Plate Mail', 'body', 2, 3, [42, 50], 19, { str: 60 }),
  field_plate: A('Field Plate', 'body', 2, 3, [40, 45], 21, { str: 65 }),
  gothic_plate: A('Gothic Plate', 'body', 2, 3, [50, 60], 23, { str: 80 }),
  full_plate_mail: A('Full Plate Mail', 'body', 2, 3, [60, 75], 25, { str: 90 }),
  // shields
  buckler: A('Buckler', 'shield', 2, 2, [1, 5], 1),
  small_shield: A('Small Shield', 'shield', 2, 2, [3, 8], 5, { str: 25 }),
  large_shield: A('Large Shield', 'shield', 2, 2, [5, 10], 9, { str: 40 }),
  kite_shield: A('Kite Shield', 'shield', 2, 3, [8, 15], 14, { str: 50 }),
  tower_shield: A('Tower Shield', 'shield', 2, 3, [12, 20], 20, { str: 60 }),
  gothic_shield: A('Gothic Shield', 'shield', 2, 3, [14, 18], 23, { str: 80 }),
  // jewelry: D1 has three Ring and two Amulet bases that differ only in qlvl
  ring: J('Ring', 'ring', 5),
  ring_q10: J('Ring', 'ring', 10),
  ring_q15: J('Ring', 'ring', 15),
  amulet: J('Amulet', 'amulet', 8),
  amulet_q16: J('Amulet', 'amulet', 16),
} as const satisfies Record<string, Base>;

export type BaseId = keyof typeof BASES;
export const BASE_IDS = Object.keys(BASES) as BaseId[];
export const base = (id: BaseId): Base => BASES[id];
