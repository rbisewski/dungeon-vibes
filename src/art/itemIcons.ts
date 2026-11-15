/**
 * Pixel-art icons for items, spells and skills (SPEC §10.3), painted procedurally at 28 px per inventory cell with
 * per-material colour ramps and lighting from the upper left (see `painter.ts`). Rendered once and shared by the
 * inventory, belt, shops and spellbook (data URL) and by ground sprites (canvas).
 */
import { ARMOR_DRAW } from './armorIcons';
import { book, elixir, glyph, POTION_DRAW, scroll, SKILL_DRAW } from './miscIcons';
import { Painter, R } from './painter';
import { WEAPON_DRAW, type Draw } from './weaponIcons';
import { BASES, BASE_IDS, type BaseId } from '../rules/bases';
import type { Attr } from '../rules/classes';
import type { Item } from '../rules/inventory';
import type { PotionId } from '../rules/potions';
import type { SkillId } from '../rules/skills';
import { SPELL_IDS, SPELLS, type SpellId } from '../rules/spells';
import type { PixImage } from '../ui/pixel/pixArt';

/** Art pixels per inventory cell. Inventory, stash and belt show icons at one CSS pixel per art pixel. */
export const CELL_PX = 28;

export type Icon = PixImage;

const DRAW: Record<BaseId, Draw> = { ...WEAPON_DRAW, ...ARMOR_DRAW };

function paint(w: number, h: number, draw: (p: Painter) => void, rim?: string): Icon {
  const p = new Painter(w, h);
  draw(p);
  return p.finish(rim);
}

const baseIcon = (id: BaseId, rim?: string): Icon => paint(BASES[id].w * CELL_PX, BASES[id].h * CELL_PX, DRAW[id], rim);

const BASE_ICON = Object.fromEntries(BASE_IDS.map(id => [id, baseIcon(id)])) as Record<BaseId, Icon>;

/** Unique items: the base icon outlined in gold [OURS], built on first use per base. */
const UNIQUE_ICON = new Map<BaseId, Icon>();
function uniqueIcon(id: BaseId): Icon {
  let ic = UNIQUE_ICON.get(id);
  if (!ic) { ic = baseIcon(id, R.gold[4]); UNIQUE_ICON.set(id, ic); }
  return ic;
}

const POTION_ICON = Object.fromEntries((Object.keys(POTION_DRAW) as PotionId[]).map(id => [id, paint(CELL_PX, CELL_PX, POTION_DRAW[id])])) as Record<PotionId, Icon>;
const ELIXIR_ICON = Object.fromEntries((['str', 'int', 'dex', 'vit'] as Attr[]).map(a => [a, paint(CELL_PX, CELL_PX, p => elixir(p, a))])) as Record<Attr, Icon>;
const SPELL_ICON = Object.fromEntries(SPELL_IDS.map(id => [id, paint(CELL_PX, CELL_PX, p => glyph(p, id))])) as Record<SpellId, Icon>;
const BOOK_ICON = Object.fromEntries(SPELL_IDS.map(id => [id, paint(2 * CELL_PX, 2 * CELL_PX, p => book(p, id, SPELLS[id].school))])) as Record<SpellId, Icon>;
const SCROLL_ICON = Object.fromEntries(SPELL_IDS.map(id => [id, paint(CELL_PX, CELL_PX, p => scroll(p, SPELLS[id].school))])) as Record<SpellId, Icon>;
const SKILL_ICON = Object.fromEntries((Object.keys(SKILL_DRAW) as SkillId[]).map(id => [id, paint(CELL_PX, CELL_PX, SKILL_DRAW[id])])) as Record<SkillId, Icon>;

export const spellIcon = (id: SpellId): Icon => SPELL_ICON[id];
export const skillIcon = (id: SkillId): Icon => SKILL_ICON[id];

export function itemIcon(it: Item): Icon {
  switch (it.kind) {
    case 'equip': return it.q === 'unique' ? uniqueIcon(it.base) : BASE_ICON[it.base];
    case 'scroll': return SCROLL_ICON[it.spell];
    case 'book': return BOOK_ICON[it.spell];
    case 'elixir': return ELIXIR_ICON[it.attr];
    case 'potion': return POTION_ICON[it.potion];
  }
}
