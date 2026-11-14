/**
 * Magic properties: D1 prefixes and suffixes (Jarulf's Guide §3.13, names and values) and our original uniques.
 * SPEC.md §6.2, §6.5.
 */
import type { Base, BaseId } from './bases';

/** Every property an item can carry. Values are additive; negative values come only from uniques. */
export type Stat =
  | 'str' | 'int' | 'dex' | 'vit' | 'allAttr' | 'life' | 'mana'
  | 'toHit' | 'pctDmg' | 'flatDmg'
  /** +% armor class of this item only (D1). */
  | 'pctAc'
  /** Flat armor class. */
  | 'ac'
  /** Damage from enemies reduced by this much per hit (minimum 1 still lands). */
  | 'dmgTaken'
  | 'lifeSteal' | 'manaSteal'
  /** Attack time reduced by this many percent. */
  | 'attackSpeed'
  /** Attackers that hit you take 1–3 damage per point (D1 "of Thorns" = 1). */
  | 'thorns'
  /** Added to every known spell's level (takes effect with spells, Phase 5). */
  | 'spellLevels'
  /** Multiplier on critical-hit chance. */
  | 'critMul';

export interface Prop { stat: Stat; v: number }

/** Which bases an affix may appear on. `helm` and `staff` narrow `armor` and `weapon`. */
export type AffixTag = 'weapon' | 'staff' | 'armor' | 'helm' | 'jewelry';

export interface Affix {
  pos: 'pre' | 'suf';
  name: string;
  /** One or two effects; a two-effect affix rolls both at the same point in their ranges (D1). */
  fx: readonly { stat: Stat; min: number; max: number }[];
  qlvl: number;
  on: readonly AffixTag[];
}

const W: AffixTag[] = ['weapon'], ARM: AffixTag[] = ['armor'], ALL: AffixTag[] = ['weapon', 'armor', 'jewelry'];
const pre = (name: string, stat: Stat, min: number, max: number, qlvl: number, on: readonly AffixTag[]): Affix => ({ pos: 'pre', name, fx: [{ stat, min, max }], qlvl, on });
const suf = (name: string, stat: Stat, min: number, max: number, qlvl: number, on: readonly AffixTag[]): Affix => ({ pos: 'suf', name, fx: [{ stat, min, max }], qlvl, on });
const pre2 = (name: string, a: [number, number], b: [number, number], qlvl: number): Affix =>
  ({ pos: 'pre', name, fx: [{ stat: 'toHit', min: a[0], max: a[1] }, { stat: 'pctDmg', min: b[0], max: b[1] }], qlvl, on: W });

/** Slot eligibility approximates D1's occurrence table (Jarulf §3.13.6) [OURS where noted in SPEC §6.2]. */
export const AFFIXES = {
  // +% to-hit: weapons and jewelry
  bronze: pre('Bronze', 'toHit', 1, 5, 1, ['weapon', 'jewelry']),
  iron: pre('Iron', 'toHit', 6, 10, 4, ['weapon', 'jewelry']),
  steel: pre('Steel', 'toHit', 11, 15, 6, ['weapon', 'jewelry']),
  silver: pre('Silver', 'toHit', 16, 20, 9, ['weapon', 'jewelry']),
  gold: pre('Gold', 'toHit', 21, 30, 12, ['weapon', 'jewelry']),
  platinum: pre('Platinum', 'toHit', 31, 40, 16, ['weapon', 'jewelry']),
  mithril: pre('Mithril', 'toHit', 41, 60, 20, ['weapon', 'jewelry']),
  meteoric: pre('Meteoric', 'toHit', 61, 80, 23, ['weapon', 'jewelry']),
  // +% damage: weapons
  jagged: pre('Jagged', 'pctDmg', 20, 35, 4, W),
  deadly: pre('Deadly', 'pctDmg', 36, 50, 6, W),
  heavy: pre('Heavy', 'pctDmg', 51, 65, 9, W),
  vicious: pre('Vicious', 'pctDmg', 66, 80, 12, W),
  brutal: pre('Brutal', 'pctDmg', 81, 95, 16, W),
  massive: pre('Massive', 'pctDmg', 96, 110, 20, W),
  savage: pre('Savage', 'pctDmg', 111, 125, 23, W),
  ruthless: pre('Ruthless', 'pctDmg', 126, 150, 35, W),
  // +% to-hit and +% damage: weapons
  sharp: pre2('Sharp', [1, 5], [20, 35], 1),
  fine_w: pre2('Fine', [6, 10], [36, 50], 6),
  warriors: pre2("Warrior's", [11, 15], [51, 65], 10),
  soldiers: pre2("Soldier's", [16, 20], [66, 80], 15),
  lords: pre2("Lord's", [21, 30], [81, 95], 19),
  knights: pre2("Knight's", [31, 40], [96, 110], 23),
  masters: pre2("Master's", [41, 50], [111, 125], 28),
  kings: pre2("King's", [76, 100], [151, 175], 28),
  // +% armor: armor
  fine_a: pre('Fine', 'pctAc', 20, 30, 1, ARM),
  strong: pre('Strong', 'pctAc', 31, 40, 3, ARM),
  grand: pre('Grand', 'pctAc', 41, 55, 6, ARM),
  valiant: pre('Valiant', 'pctAc', 56, 70, 10, ARM),
  glorious: pre('Glorious', 'pctAc', 71, 90, 14, ARM),
  blessed: pre('Blessed', 'pctAc', 91, 110, 19, ARM),
  saintly: pre('Saintly', 'pctAc', 111, 130, 24, ARM),
  awesome: pre('Awesome', 'pctAc', 131, 150, 28, ARM),
  holy: pre('Holy', 'pctAc', 151, 170, 35, ARM),
  // +mana: jewelry and staves
  spiders: pre("Spider's", 'mana', 10, 15, 1, ['jewelry', 'staff']),
  ravens: pre("Raven's", 'mana', 15, 20, 5, ['jewelry', 'staff']),
  snakes: pre("Snake's", 'mana', 21, 30, 9, ['jewelry', 'staff']),
  serpents: pre("Serpent's", 'mana', 30, 40, 15, ['jewelry', 'staff']),
  drakes: pre("Drake's", 'mana', 41, 50, 21, ['jewelry', 'staff']),
  dragons: pre("Dragon's", 'mana', 51, 60, 27, ['jewelry', 'staff']),
  // +spell levels: jewelry and helms [OURS]
  angels: pre("Angel's", 'spellLevels', 1, 1, 15, ['jewelry', 'helm']),
  archangels: pre("Arch-Angel's", 'spellLevels', 2, 2, 25, ['jewelry', 'helm']),

  // attributes: everything
  of_strength: suf('of Strength', 'str', 1, 5, 1, ALL),
  of_might: suf('of Might', 'str', 6, 10, 5, ALL),
  of_power: suf('of Power', 'str', 11, 15, 11, ALL),
  of_giants: suf('of Giants', 'str', 16, 20, 17, ALL),
  of_titans: suf('of Titans', 'str', 21, 30, 23, ALL),
  of_dexterity: suf('of Dexterity', 'dex', 1, 5, 1, ALL),
  of_skill: suf('of Skill', 'dex', 6, 10, 5, ALL),
  of_accuracy: suf('of Accuracy', 'dex', 11, 15, 11, ALL),
  of_precision: suf('of Precision', 'dex', 16, 20, 17, ALL),
  of_perfection: suf('of Perfection', 'dex', 21, 30, 23, ALL),
  of_vitality: suf('of Vitality', 'vit', 1, 5, 1, ALL),
  of_zest: suf('of Zest', 'vit', 6, 10, 5, ALL),
  of_vim: suf('of Vim', 'vit', 11, 15, 11, ALL),
  of_vigor: suf('of Vigor', 'vit', 16, 20, 17, ALL),
  of_life: suf('of Life', 'vit', 21, 30, 23, ALL),
  of_magic: suf('of Magic', 'int', 1, 5, 1, ALL),
  of_the_mind: suf('of the Mind', 'int', 6, 10, 5, ALL),
  of_brilliance: suf('of Brilliance', 'int', 11, 15, 11, ALL),
  of_sorcery: suf('of Sorcery', 'int', 16, 20, 17, ALL),
  of_wizardry: suf('of Wizardry', 'int', 21, 30, 23, ALL),
  of_the_sky: suf('of the Sky', 'allAttr', 1, 3, 5, ALL),
  of_the_moon: suf('of the Moon', 'allAttr', 4, 7, 11, ALL),
  of_the_stars: suf('of the Stars', 'allAttr', 8, 11, 17, ALL),
  of_the_heavens: suf('of the Heavens', 'allAttr', 12, 15, 25, ALL),
  of_the_zodiac: suf('of the Zodiac', 'allAttr', 16, 20, 30, ALL),
  // +life: armor and jewelry
  of_the_fox: suf('of the Fox', 'life', 10, 15, 1, ['armor', 'jewelry']),
  of_the_jaguar: suf('of the Jaguar', 'life', 16, 20, 5, ['armor', 'jewelry']),
  of_the_eagle: suf('of the Eagle', 'life', 21, 30, 9, ['armor', 'jewelry']),
  of_the_wolf: suf('of the Wolf', 'life', 30, 40, 15, ['armor', 'jewelry']),
  of_the_tiger: suf('of the Tiger', 'life', 41, 50, 21, ['armor', 'jewelry']),
  of_the_lion: suf('of the Lion', 'life', 51, 60, 27, ['armor', 'jewelry']),
  // +damage: weapons
  of_quality: suf('of Quality', 'flatDmg', 1, 2, 2, W),
  of_maiming: suf('of Maiming', 'flatDmg', 3, 5, 7, W),
  of_slaying: suf('of Slaying', 'flatDmg', 6, 8, 15, W),
  of_gore: suf('of Gore', 'flatDmg', 9, 12, 25, W),
  // −damage taken: armor and jewelry
  of_health: suf('of Health', 'dmgTaken', 1, 1, 2, ['armor', 'jewelry']),
  of_protection: suf('of Protection', 'dmgTaken', 2, 2, 6, ['armor', 'jewelry']),
  of_absorption: suf('of Absorption', 'dmgTaken', 3, 3, 12, ['armor', 'jewelry']),
  of_deflection: suf('of Deflection', 'dmgTaken', 4, 4, 20, ['armor', 'jewelry']),
  // life and mana steal: weapons and jewelry
  of_the_leech: suf('of the Leech', 'lifeSteal', 3, 3, 8, ['weapon', 'jewelry']),
  of_blood: suf('of Blood', 'lifeSteal', 5, 5, 19, ['weapon', 'jewelry']),
  of_the_bat: suf('of the Bat', 'manaSteal', 3, 3, 8, ['weapon', 'jewelry']),
  of_vampires: suf('of Vampires', 'manaSteal', 5, 5, 19, ['weapon', 'jewelry']),
  // attack speed: weapons
  of_readiness: suf('of Readiness', 'attackSpeed', 4, 4, 1, W),
  of_swiftness: suf('of Swiftness', 'attackSpeed', 8, 8, 10, W),
  of_speed: suf('of Speed', 'attackSpeed', 12, 12, 19, W),
  of_haste: suf('of Haste', 'attackSpeed', 16, 16, 27, W),
  // thorns: armor
  of_thorns: suf('of Thorns', 'thorns', 1, 1, 1, ARM),
} as const satisfies Record<string, Affix>;

export type AffixId = keyof typeof AFFIXES;
export const AFFIX_IDS = Object.keys(AFFIXES) as AffixId[];

/** Tags of a base, for affix eligibility. */
export function baseTags(b: Base): AffixTag[] {
  if (b.kind === 'weapon') return b.wk === 'staff' ? ['weapon', 'staff'] : ['weapon'];
  if (b.kind === 'armor') return b.slot === 'head' ? ['armor', 'helm'] : ['armor'];
  return ['jewelry'];
}

/* ---------- uniques ---------- */

export interface Unique { name: string; base: BaseId; qlvl: number; props: readonly Prop[] }

const U = (name: string, base: BaseId, qlvl: number, props: Partial<Record<Stat, number>>): Unique =>
  ({ name, base, qlvl, props: (Object.entries(props) as [Stat, number][]).map(([stat, v]) => ({ stat, v })) });

/** Original names; mechanics follow D1 (fixed base and properties, own qlvl, at most one per run). */
export const UNIQUES = {
  tinkers_mallet: U("Tinker's Mallet", 'club', 1, { toHit: 10, flatDmg: 2, str: 3 }),
  gravewhisper: U('Gravewhisper', 'dagger', 1, { pctDmg: 30, dex: 3, lifeSteal: 3 }),
  mourning_cloak: U('Mourning Cloak', 'cloak', 2, { pctAc: 60, dex: 4, thorns: 2 }),
  whisperwind: U('Whisperwind', 'sabre', 3, { attackSpeed: 8, dex: 6, toHit: 15 }),
  hearthguard: U('Hearthguard', 'buckler', 3, { pctAc: 100, vit: 4, dmgTaken: 1 }),
  bonecrown: U('Bonecrown', 'skull_cap', 4, { ac: 15, life: 10, dmgTaken: 1 }),
  pilgrims_staff: U("Pilgrim's Staff", 'long_staff', 4, { int: 10, mana: 15, pctDmg: 20 }),
  mossbark_aegis: U('Mossbark Aegis', 'small_shield', 5, { pctAc: 40, vit: 5, thorns: 1 }),
  coppercoil: U('Coppercoil', 'ring', 5, { dex: 6, toHit: 10, mana: 10 }),
  bloodletter: U('Bloodletter', 'morning_star', 5, { pctDmg: 60, lifeSteal: 3, vit: -3 }),
  rustfang: U('Rustfang', 'falchion', 6, { pctDmg: 70, toHit: 10, dex: -5 }),
  thornbriar: U('Thornbriar', 'hard_leather_armor', 7, { pctAc: 50, thorns: 3, str: 5 }),
  ember_band: U('Ember Band', 'ring', 8, { str: 5, vit: 5, life: 10 }),
  stonejaw: U('Stonejaw', 'war_hammer', 8, { pctDmg: 90, flatDmg: 4, dex: -8 }),
  grimwardens_hide: U("Grimwarden's Hide", 'studded_leather_armor', 9, { ac: 12, str: 8, life: 15 }),
  lantern_eye: U('The Lantern Eye', 'amulet', 10, { allAttr: 10, life: -10 }),
  scholars_cowl: U("Scholar's Cowl", 'cap', 10, { int: 15, mana: 20, spellLevels: 1 }),
  bulwark_of_saints: U('Bulwark of Saints', 'large_shield', 11, { pctAc: 120, vit: 10, dmgTaken: 3 }),
  widowmaker: U('Widowmaker', 'broad_axe', 12, { pctDmg: 120, lifeSteal: 5, ac: -10 }),
  moonshard: U('Moonshard', 'amulet', 12, { int: 12, mana: 25, manaSteal: 3 }),
  ironhide_coat: U('Ironhide Coat', 'chain_mail', 13, { pctAc: 80, life: 20, dmgTaken: 2 }),
  spinneret: U('Spinneret', 'scimitar', 15, { pctDmg: 60, attackSpeed: 16, dex: 15 }),
  serpents_coil: U("Serpent's Coil", 'ring_q15', 15, { allAttr: 4, lifeSteal: 3, manaSteal: 3 }),
  crown_of_ash: U('Crown of Ash', 'crown', 16, { allAttr: 6, life: 20, spellLevels: 1 }),
  sunder: U('Sunder', 'great_axe', 18, { pctDmg: 140, toHit: 20, attackSpeed: 8 }),
  kingslayers_oath: U("Kingslayer's Oath", 'bastard_sword', 20, { pctDmg: 150, toHit: 30, str: 10, critMul: 2 }),
} as const satisfies Record<string, Unique>;

export type UniqueId = keyof typeof UNIQUES;
export const UNIQUE_IDS = Object.keys(UNIQUES) as UniqueId[];

/* ---------- text ---------- */

const ATTR_WORD: Partial<Record<Stat, string>> = { str: 'STRENGTH', int: 'INTELLIGENCE', dex: 'DEXTERITY', vit: 'VITALITY' };
const sign = (v: number): string => (v >= 0 ? `+${v}` : `${v}`);

/** One description line per property, D1 wording where it exists. */
export function propText(p: Prop): string {
  const { stat, v } = p;
  if (ATTR_WORD[stat]) return `${sign(v)} TO ${ATTR_WORD[stat]}`;
  switch (stat) {
    case 'allAttr': return `${sign(v)} TO ALL ATTRIBUTES`;
    case 'life': return `${sign(v)} TO LIFE`;
    case 'mana': return `${sign(v)} TO MANA`;
    case 'toHit': return `CHANCE TO HIT: ${sign(v)}%`;
    case 'pctDmg': return `${sign(v)}% DAMAGE`;
    case 'flatDmg': return `ADDS ${v} POINTS TO DAMAGE`;
    case 'pctAc': return `${sign(v)}% ARMOR`;
    case 'ac': return `ARMOR CLASS ${sign(v)}`;
    case 'dmgTaken': return `-${v} DAMAGE FROM ENEMIES`;
    case 'lifeSteal': return `HIT STEALS ${v}% LIFE`;
    case 'manaSteal': return `HIT STEALS ${v}% MANA`;
    case 'attackSpeed': return `${v}% FASTER ATTACK`;
    case 'thorns': return `ATTACKER TAKES 1-${3 * v} DAMAGE`;
    case 'spellLevels': return `${sign(v)} TO SPELL LEVELS`;
    case 'critMul': return `CRITICAL HIT CHANCE x${v}`;
    default: return '';
  }
}
