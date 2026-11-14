/** Magic and unique item generation (D1 rules, Jarulf's Guide §3.8, §3.13). SPEC.md §1.3, §6.2–6.5. */
import type { Rng } from '../core/rng';
import { AFFIXES, AFFIX_IDS, baseTags, UNIQUES, UNIQUE_IDS, type AffixId, type Prop, type UniqueId } from './affixes';
import { base, type BaseId } from './bases';
import { newEquip, type EquipItem } from './inventory';

/** D1 chance (%) that an item at `ilvl` is magic: 11 + 0.89·(ilvl + 1). */
export const magicChance = (ilvl: number): number => 11 + 0.89 * (ilvl + 1);
/** D1: 2 % of magic items from normal sources are unique; 16 % from unique monsters and bosses. */
export const UNIQUE_CHANCE = 2, BOSS_UNIQUE_CHANCE = 16;

const pickOf = <T>(rng: Rng, a: readonly T[]): T => a[Math.floor(rng() * a.length)];

/**
 * Affixes allowed on `id` at `ilvl`. D1 draws affixes with qlvl in [ilvl/2, ilvl] so deep items do not get the
 * weakest tiers; when that window is empty for a slot, any qlvl ≤ ilvl is allowed.
 */
export function eligibleAffixes(id: BaseId, ilvl: number, pos: 'pre' | 'suf'): AffixId[] {
  const tags = baseTags(base(id));
  const ok = AFFIX_IDS.filter(a => AFFIXES[a].pos === pos && AFFIXES[a].on.some(t => tags.includes(t)) && AFFIXES[a].qlvl <= ilvl);
  const windowed = ok.filter(a => AFFIXES[a].qlvl >= Math.floor(ilvl / 2));
  return windowed.length ? windowed : ok;
}

function rollAffix(rng: Rng, id: AffixId): Prop[] {
  const t = rng();
  return AFFIXES[id].fx.map(f => ({ stat: f.stat, v: f.min + Math.floor(t * (f.max - f.min + 1)) }));
}

/**
 * Turns a normal item magic. D1 (devilutionX `GetItemPower`): a prefix with 1/4 chance, a suffix with 2/3 chance,
 * and when neither was chosen one of the two at random. Returns false when the base takes no affixes at this ilvl.
 */
export function makeMagic(rng: Rng, it: EquipItem, ilvl: number): boolean {
  const pres = eligibleAffixes(it.base, ilvl, 'pre'), sufs = eligibleAffixes(it.base, ilvl, 'suf');
  let wantPre = rng() < 1 / 4, wantSuf = rng() < 2 / 3;
  if (!wantPre && !wantSuf) { if (rng() < .5) wantPre = true; else wantSuf = true; }
  if (wantPre && !pres.length) { wantPre = false; wantSuf = sufs.length > 0; }
  if (wantSuf && !sufs.length) { wantSuf = false; wantPre = pres.length > 0; }
  if (!wantPre && !wantSuf) return false;
  it.q = 'magic';
  it.identified = false;
  if (wantPre) { it.pre = pickOf(rng, pres); it.props.push(...rollAffix(rng, it.pre)); }
  if (wantSuf) { it.suf = pickOf(rng, sufs); it.props.push(...rollAffix(rng, it.suf)); }
  return true;
}

/** Uniques that may still drop at `ilvl` (qlvl ≤ ilvl and not found earlier this run). */
export const eligibleUniques = (ilvl: number, found: ReadonlySet<UniqueId>): UniqueId[] =>
  UNIQUE_IDS.filter(u => UNIQUES[u].qlvl <= ilvl && !found.has(u));

export function newUnique(id: UniqueId, acRoll: number): EquipItem {
  const u = UNIQUES[id], it = newEquip(u.base, acRoll);
  return { ...it, q: 'unique', identified: false, uniq: id, props: u.props.map(p => ({ ...p })) };
}

export interface RollOpts {
  /** Uniques already generated this run; a newly rolled unique is added (at most one of each per run). */
  found: Set<UniqueId>;
  /** Always magic (or better), e.g. boss drops. */
  forceMagic?: boolean;
  /** % of magic items that become unique. */
  uniqueChance?: number;
}

/**
 * One equipment drop: a uniform base with qlvl ≤ ilvl, then the magic roll (rings and amulets are always magic), then
 * the unique roll. [OURS] A successful unique roll picks any eligible unique and uses *its* base, so the D1 rate of
 * about 2 % of magic items holds with our short unique list; with none eligible the item stays magic.
 */
export function rollEquipment(rng: Rng, ilvl: number, pool: readonly BaseId[], o: RollOpts): EquipItem {
  const id = pickOf(rng, pool), acRoll = rng();
  const jewelry = base(id).kind === 'jewelry';
  const magic = o.forceMagic || jewelry || rng() * 100 < magicChance(ilvl);
  if (magic && rng() * 100 < (o.uniqueChance ?? UNIQUE_CHANCE)) {
    const us = eligibleUniques(ilvl, o.found);
    if (us.length) {
      const u = pickOf(rng, us);
      o.found.add(u);
      return newUnique(u, acRoll);
    }
  }
  const it = newEquip(id, acRoll);
  if (magic) makeMagic(rng, it, ilvl);
  return it;
}
