/** Equipped gear → stat bonuses and weapon. SPEC.md §3.1, §6.4. */
import type { Prop } from './affixes';
import { base } from './bases';
import { ATTRS, type Attrs } from './classes';
import { EQUIP_SLOTS, itemAc, meetsReq, type EquipItem, type Equipment } from './inventory';
import { FISTS, NO_BONUS, type Bonus, type Weapon } from './stats';

export interface Gear {
  bonus: Bonus;
  weapon: Weapon;
  /** uids of equipped items whose requirements are met (only these count). */
  active: ReadonlySet<number>;
}

function addProp(b: Bonus, p: Prop): void {
  switch (p.stat) {
    case 'str': case 'int': case 'dex': case 'vit': b.attr[p.stat] += p.v; break;
    case 'allAttr': for (const a of ATTRS) b.attr[a] += p.v; break;
    case 'critMul': b.critMul *= p.v; break;
    case 'pctAc': case 'ac': break; // folded into the item's own armor class by itemAc
    default: b[p.stat] += p.v;
  }
}

/** Sums the bonuses of `items`. With `hideUnidentified`, unidentified items contribute only base armor and damage. */
function sum(items: readonly EquipItem[], hideUnidentified: boolean): Bonus {
  const b: Bonus = { ...NO_BONUS, attr: { ...NO_BONUS.attr } };
  for (const it of items) {
    const show = it.identified || !hideUnidentified;
    b.ac += itemAc(it, show);
    if (show) for (const p of it.props) addProp(b, p);
  }
  return b;
}

/**
 * Applied (`hideUnidentified` false) or displayed (true) gear stats. Requirements are checked against base plus item
 * attributes, as in D1, so an item can enable another; this settles in a few passes and is capped against
 * items that disable themselves.
 */
export function gear(equip: Equipment, baseAttrs: Attrs, hideUnidentified = false): Gear {
  const worn = EQUIP_SLOTS.map(s => equip[s]).filter((it): it is EquipItem => !!it);
  let active = worn.filter(it => meetsReq(it, baseAttrs));
  for (let pass = 0; pass < 6; pass++) {
    const items = sum(active, false).attr;
    const attrs: Attrs = { str: baseAttrs.str + items.str, int: baseAttrs.int + items.int, dex: baseAttrs.dex + items.dex, vit: baseAttrs.vit + items.vit };
    const next = worn.filter(it => meetsReq(it, attrs));
    if (next.length === active.length && next.every((it, i) => it === active[i])) break;
    active = next;
  }
  const w = equip.weapon && active.includes(equip.weapon) ? base(equip.weapon.base) : null;
  const weapon: Weapon = w && w.kind === 'weapon' ? { kind: w.wk, min: w.dmg[0], max: w.dmg[1] } : FISTS;
  return { bonus: sum(active, hideUnidentified), weapon, active: new Set(active.map(it => it.uid)) };
}
