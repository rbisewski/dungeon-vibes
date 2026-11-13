/**
 * Pixel-art inventory icons, one per base item, drawn procedurally on a 14 px-per-cell grid with a 1 px dark outline
 * (SPEC §10.3). Each family has a small parametric painter so all ~50 bases share one consistent style.
 * Icons are rendered once and shared by inventory cells (data URL) and ground sprites (canvas texture).
 */
import { mkC } from '../render/canvas';
import { BASES, BASE_IDS, type BaseId } from '../rules/bases';
import type { Attr } from '../rules/classes';
import type { Item } from '../rules/inventory';
import { POTION_ICON } from '../ui/pixel/potionIcons';
import type { PixImage } from '../ui/pixel/pixArt';

export const CELL_PX = 14;
const OUTLINE = '#120c0a';

const C = {
  steelL: '#e2e6ee', steel: '#a0a6b0', steelD: '#5c606a',
  wood: '#8a5a30', woodD: '#5a3818', woodL: '#a87444',
  lea: '#7a4a28', leaD: '#4a2a14', leaL: '#9a6438',
  gold: '#e0b040', goldD: '#9a7020', goldL: '#ffe08a',
  cloth: '#6a5a48', clothD: '#463a2e', clothL: '#8a7a64',
  red: '#b03030', blue: '#3a6ad8', green: '#3aa048',
};

class Painter {
  readonly c: HTMLCanvasElement;
  private readonly g: CanvasRenderingContext2D;
  constructor(readonly w: number, readonly h: number) { this.c = mkC(w, h); this.g = this.c.getContext('2d')!; }
  px(x: number, y: number, col: string): void { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) { this.g.fillStyle = col; this.g.fillRect(x, y, 1, 1); } }
  rect(x: number, y: number, w: number, h: number, col: string): void { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, col); }
  line(x0: number, y0: number, x1: number, y1: number, col: string): void {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= n; k++) this.px(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, col);
  }
  disc(cx: number, cy: number, r: number, col: string): void {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) this.px(x, y, col);
  }
  /** Shaded ball: dark rim, base fill, light upper-left glint. */
  ball(cx: number, cy: number, r: number, dark: string, mid: string, light: string): void {
    this.disc(cx, cy, r, dark); this.disc(cx - .4, cy - .4, r - 1, mid); this.disc(cx - r * .35, cy - r * .35, Math.max(.6, r * .3), light);
  }
  /** Adds a 1 px outline around every opaque pixel. */
  outline(): this {
    const d = this.g.getImageData(0, 0, this.w, this.h), a = (x: number, y: number) => x >= 0 && y >= 0 && x < this.w && y < this.h && d.data[(y * this.w + x) * 4 + 3] > 0;
    const edge: [number, number][] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (!a(x, y) && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) edge.push([x, y]);
    for (const [x, y] of edge) this.px(x, y, OUTLINE);
    return this;
  }
}

/* ---------- weapons ---------- */

interface SwordSpec { bw: number; tipBw?: number; curve?: number; guard: number; grip: number; gold?: boolean }
function sword(p: Painter, s: SwordSpec): void {
  const cx = Math.floor(p.w / 2), pommelY = p.h - 3, gripTop = pommelY - s.grip, guardY = gripTop - 2, tipY = 2;
  p.rect(cx - 1, pommelY, 2, 2, s.gold ? C.gold : C.steel);
  p.rect(cx - 1, gripTop, 2, s.grip, C.lea); for (let y = gripTop; y < pommelY; y += 2) p.px(cx - 1, y, C.leaD);
  p.rect(cx - Math.floor(s.guard / 2), guardY, s.guard, 2, s.gold ? C.gold : C.steel); p.rect(cx - Math.floor(s.guard / 2), guardY + 1, s.guard, 1, s.gold ? C.goldD : C.steelD);
  const len = guardY - tipY;
  for (let y = tipY; y < guardY; y++) {
    const t = (guardY - y) / len; // 0 at guard, 1 at tip
    let bw = Math.round(s.bw + ((s.tipBw ?? s.bw) - s.bw) * t);
    if (y - tipY < 2) bw = Math.min(bw, y - tipY + 1);
    const off = Math.round((s.curve ?? 0) * t * t);
    const x0 = cx - Math.floor(bw / 2) + off;
    p.rect(x0, y, bw, 1, C.steel);
    p.px(x0, y, C.steelL);
    if (bw > 2) p.px(x0 + bw - 1, y, C.steelD);
  }
}

function axe(p: Painter, head: number, double: boolean): void {
  const cx = Math.floor(p.w / 2);
  p.rect(cx - 1, 3, 2, p.h - 5, C.wood); p.line(cx, 3, cx, p.h - 3, C.woodL);
  p.rect(cx - 1, p.h - 4, 2, 2, C.steelD);
  const top = 4, hh = 6 + head, sides = double ? [-1, 1] : [-1];
  for (const sd of sides) for (let j = 0; j < hh; j++) {
    const t = j / (hh - 1), reach = Math.round(3 + head * .9 + 3 * Math.sin(t * Math.PI) ** .7);
    for (let i = 1; i <= reach; i++) p.px(sd < 0 ? cx - 1 - i : cx + i, top + j, i === reach ? C.steelL : i > reach - 2 ? C.steel : C.steelD);
  }
  p.rect(cx - 1, top - 1, 2, 2, C.steelD);
}

type ClubHead = 'club' | 'mace' | 'star' | 'hammer' | 'flail' | 'maul';
function club(p: Painter, head: ClubHead): void {
  const cx = Math.floor(p.w / 2), handleTop = head === 'flail' ? p.h - 22 : head === 'club' ? 14 : 12;
  p.rect(cx - 1, handleTop, 2, p.h - handleTop - 2, head === 'club' ? C.woodD : C.wood);
  p.rect(cx - 1, p.h - 6, 2, 4, C.lea);
  if (head === 'club') { for (let y = 2; y < handleTop + 2; y++) { const w = Math.round(2 + 4 * (1 - (y - 2) / handleTop)); p.rect(cx - Math.floor(w / 2), y, w, 1, y % 5 === 0 ? C.woodD : C.wood); p.px(cx - Math.floor(w / 2), y, C.woodL); } }
  else if (head === 'mace') { p.rect(cx - 1, 3, 2, 10, C.steelD); for (const dx of [-3, -2, 1, 2]) p.rect(cx + dx, 4, 1, 8, dx < 0 ? C.steelL : C.steel); }
  else if (head === 'star') { p.ball(cx, 7, 4, C.steelD, C.steel, C.steelL); for (const [dx, dy] of [[0, -6], [0, 6], [-6, 0], [5, 0], [-4, -4], [4, -4], [-4, 4], [4, 4]]) p.px(cx + dx, 7 + dy, C.steelL); }
  else if (head === 'hammer') { p.rect(cx - 5, 5, 10, 6, C.steel); p.rect(cx - 5, 5, 10, 1, C.steelL); p.rect(cx - 5, 10, 10, 1, C.steelD); p.rect(cx - 1, 2, 2, 3, C.steelD); }
  else if (head === 'flail') { for (let y = handleTop - 1; y > 11; y -= 2) p.px(cx + ((y >> 1) % 2 ? 1 : 0), y, C.steelD); p.ball(cx, 7, 4, C.steelD, C.steel, C.steelL); for (const [dx, dy] of [[0, -6], [-5, 0], [5, 0], [0, 5]]) p.px(cx + dx, 7 + dy, C.steelL); }
  else { p.rect(cx - 10, 4, 20, 11, C.steel); p.rect(cx - 10, 4, 20, 2, C.steelL); p.rect(cx - 10, 13, 20, 2, C.steelD); p.rect(cx - 10, 4, 2, 11, C.steelD); p.rect(cx + 8, 4, 2, 11, C.steelD); }
}

type StaffTop = 'knob' | 'ferrule' | 'bands' | 'capped' | 'iron';
function staff(p: Painter, top: StaffTop): void {
  const cx = Math.floor(p.w / 2);
  p.rect(cx - 1, 4, 2, p.h - 6, C.wood); p.line(cx - 1, 4, cx - 1, p.h - 3, C.woodL);
  if (top === 'knob') p.ball(cx, 4, 3, C.woodD, C.wood, C.woodL);
  if (top === 'ferrule' || top === 'capped') { p.rect(cx - 2, 2, 4, 4, C.steel); p.rect(cx - 2, 2, 1, 4, C.steelL); }
  if (top === 'capped') { p.rect(cx - 2, p.h - 6, 4, 4, C.steel); }
  if (top === 'bands') for (let y = 6; y < p.h - 4; y += 9) p.rect(cx - 2, y, 4, 2, C.lea);
  if (top === 'iron') { p.rect(cx - 3, 3, 6, 5, C.steelD); p.line(cx, 0, cx, 3, C.steelL); p.px(cx - 4, 3, C.steelL); p.px(cx + 3, 3, C.steelL); }
}

/* ---------- armor ---------- */

type HelmLook = 'cap' | 'skull' | 'helm' | 'full' | 'crown' | 'great';
function helm(p: Painter, look: HelmLook): void {
  const cx = 14;
  if (look === 'crown') {
    p.rect(5, 12, 18, 9, C.gold); p.rect(5, 19, 18, 2, C.goldD); p.rect(5, 12, 18, 1, C.goldL);
    for (const x of [5, 11, 17, 22]) { p.rect(x, 6, 2, 6, C.gold); p.px(x, 5, C.goldL); }
    p.disc(9, 16, 1.4, C.red); p.disc(14, 16, 1.4, C.blue); p.disc(19, 16, 1.4, C.green);
    return;
  }
  if (look === 'great') {
    p.rect(6, 4, 16, 19, C.steel); p.rect(6, 4, 3, 19, C.steelL); p.rect(19, 4, 3, 19, C.steelD);
    p.rect(8, 11, 12, 2, OUTLINE); p.rect(13, 13, 2, 7, C.steelD); for (let y = 15; y < 21; y += 2) p.rect(9, y, 3, 1, OUTLINE);
    return;
  }
  const [dark, mid, light] = look === 'cap' ? [C.leaD, C.lea, C.leaL] : [C.steelD, C.steel, C.steelL];
  const r = look === 'skull' ? 8 : 9, cy = look === 'skull' ? 15 : 14;
  for (let y = cy - r; y <= cy + 1; y++) for (let x = cx - r; x <= cx + r; x++) {
    if ((x - cx) ** 2 + ((y - cy) * 1.1) ** 2 > r * r) continue;
    p.px(x, y, x < cx - r / 2 ? light : x > cx + r / 2 ? dark : mid);
  }
  if (look === 'cap') { p.rect(cx - r, cy + 1, 2 * r + 1, 3, C.leaD); return; }
  p.rect(cx - r, cy + 1, 2 * r + 1, 2, dark);
  if (look === 'helm') { p.rect(cx - 1, cy + 1, 2, 7, mid); p.rect(cx - r, cy + 1, 3, 7, mid); p.rect(cx + r - 2, cy + 1, 3, 7, dark); }
  if (look === 'full') { p.rect(cx - r + 1, cy + 1, 2 * r - 1, 9, mid); p.rect(cx - r + 3, cy + 3, 2 * r - 5, 2, OUTLINE); p.rect(cx - 1, cy + 5, 2, 5, dark); }
}

type BodyLook = 'rags' | 'cape' | 'cloak' | 'robe' | 'quilted' | 'leather' | 'hard' | 'studded' | 'ring' | 'chain' | 'scale' | 'breast' | 'splint' | 'plate' | 'field' | 'gothic' | 'full';
function body(p: Painter, look: BodyLook): void {
  const cloth = ['rags', 'cape', 'cloak', 'robe', 'quilted'].includes(look);
  const metal = ['ring', 'chain', 'scale', 'splint', 'plate', 'field', 'gothic', 'full'].includes(look);
  const [d, m, l] = metal ? [C.steelD, C.steel, C.steelL] : cloth ? [C.clothD, C.cloth, C.clothL] : [C.leaD, C.lea, C.leaL];
  const bottom = look === 'robe' || look === 'cloak' || look === 'cape' ? 40 : 36;
  // torso silhouette: shoulders, sleeves, waist
  for (let y = 4; y < bottom; y++) {
    const half = y < 8 ? 12 : y < 18 ? 13 - (y > 14 ? 4 : 0) : y < 22 ? 8 : (look === 'robe' || look === 'cloak' || look === 'cape') ? 8 + (y - 22) / 4 : 8;
    const neck = y < 7 ? 3 : 0;
    for (let x = Math.round(14 - half); x < Math.round(14 + half); x++) {
      if (neck && Math.abs(x - 13.5) < neck) continue;
      p.px(x, y, x < 10 ? l : x > 18 ? d : m);
    }
  }
  const at = (fn: (x: number, y: number) => string | null) => { for (let y = 4; y < bottom; y++) for (let x = 0; x < 28; x++) { const col = fn(x, y); if (col) p.px(x, y, col); } };
  const inside = (x: number, y: number) => y >= 8 && y < bottom - 1 && x > 7 && x < 20;
  switch (look) {
    case 'rags': at((x, y) => inside(x, y) && (x * 7 + y * 3) % 11 === 0 ? OUTLINE : null); at((x, y) => y === bottom - 1 && x % 3 === 0 ? OUTLINE : null); break;
    case 'cape': case 'cloak': p.rect(11, 4, 6, 4, d); at((x, y) => inside(x, y) && x === 14 ? d : null); break;
    case 'robe': p.rect(8, 21, 12, 2, C.lea); p.rect(13, 21, 2, 2, C.gold); break;
    case 'quilted': at((x, y) => inside(x, y) && (x % 4 === 0 || y % 4 === 0) ? d : null); break;
    case 'leather': p.rect(8, 21, 12, 2, C.leaD); p.rect(13, 21, 2, 2, C.steel); break;
    case 'hard': p.rect(3, 4, 6, 4, C.leaD); p.rect(19, 4, 6, 4, C.leaD); p.rect(8, 21, 12, 2, C.leaD); break;
    case 'studded': at((x, y) => inside(x, y) && x % 3 === 0 && y % 3 === 0 ? C.steelL : null); break;
    case 'ring': at((x, y) => inside(x, y) && (x + y) % 3 === 0 ? d : null); break;
    case 'chain': at((x, y) => inside(x, y) && (x + y) % 2 === 0 ? d : null); break;
    case 'scale': at((x, y) => inside(x, y) && (y % 3 === 0 || (x + (y / 3 | 0)) % 3 === 0 && y % 3 === 2) ? d : null); break;
    case 'breast': p.rect(8, 18, 12, bottom - 18, C.lea); p.rect(8, 18, 12, 1, C.leaD); break;
    case 'splint': at((x, y) => inside(x, y) && x % 3 === 0 ? d : null); break;
    case 'plate': case 'field': p.rect(8, 17, 12, 1, d); p.rect(13, 8, 2, 9, l); if (look === 'field') p.rect(8, 22, 12, 2, d); break;
    case 'gothic': case 'full': p.rect(8, 17, 12, 1, C.gold); p.rect(3, 4, 22, 1, C.gold); p.rect(13, 8, 2, 9, l); if (look === 'full') { p.rect(8, 23, 12, 1, C.gold); p.disc(14, 12, 1.5, C.gold); } break;
  }
}

type ShieldLook = 'buckler' | 'small' | 'large' | 'kite' | 'tower' | 'gothic';
function shield(p: Painter, look: ShieldLook): void {
  const cx = 14;
  if (look === 'buckler' || look === 'small' || look === 'large') {
    const r = look === 'buckler' ? 8 : look === 'small' ? 10 : 12, cy = 14;
    p.disc(cx, cy, r, C.steelD);
    p.disc(cx - .5, cy - .5, r - 1.5, look === 'buckler' ? C.steel : C.wood);
    if (look !== 'buckler') for (let y = cy - r + 2; y < cy + r - 1; y += 3) p.line(cx - r + 2, y, cx + r - 2, y, C.woodD);
    p.ball(cx, cy, 2.5, C.steelD, C.steel, C.steelL);
    return;
  }
  const h = p.h - 3, trim = look === 'gothic' ? C.gold : C.steelD;
  for (let y = 2; y < h; y++) {
    const t = (y - 2) / (h - 2);
    const half = look === 'tower' ? 11 : look === 'kite' ? Math.round(11 * Math.min(1, (1 - t) * 1.6)) : Math.round(11 * Math.min(1, (1 - t) * 1.25));
    if (half <= 0) continue;
    p.rect(cx - half, y, half * 2, 1, trim);
    if (half > 2) p.rect(cx - half + 2, y, half * 2 - 4, 1, look === 'tower' ? C.wood : look === 'kite' ? C.red : C.steel);
  }
  p.rect(cx - 9, 2, 18, 2, trim);
  if (look === 'gothic') p.rect(cx - 1, 6, 2, 22, C.gold);
  if (look === 'kite') p.rect(cx - 1, 5, 2, 20, C.gold);
  if (look === 'tower') for (let y = 6; y < h - 2; y += 6) p.rect(cx - 9, y, 18, 1, C.steelD);
}

/* ---------- table ---------- */

type Draw = (p: Painter) => void;
const DRAW: Record<BaseId, Draw> = {
  dagger: p => sword(p, { bw: 2, guard: 6, grip: 5 }),
  short_sword: p => sword(p, { bw: 2, guard: 8, grip: 6 }),
  sabre: p => sword(p, { bw: 2, curve: 3, guard: 6, grip: 6, gold: true }),
  falchion: p => sword(p, { bw: 3, tipBw: 4, curve: 1, guard: 8, grip: 6 }),
  scimitar: p => sword(p, { bw: 2, tipBw: 3, curve: 5, guard: 8, grip: 6, gold: true }),
  long_sword: p => sword(p, { bw: 2, guard: 10, grip: 7 }),
  broad_sword: p => sword(p, { bw: 4, tipBw: 3, guard: 10, grip: 7 }),
  bastard_sword: p => sword(p, { bw: 3, guard: 10, grip: 9, gold: true }),
  great_sword: p => sword(p, { bw: 5, tipBw: 4, guard: 18, grip: 9, gold: true }),
  small_axe: p => axe(p, 0, false), axe: p => axe(p, 1, false), large_axe: p => axe(p, 3, false),
  broad_axe: p => axe(p, 5, false), battle_axe: p => axe(p, 3, true), great_axe: p => axe(p, 5, true),
  club: p => club(p, 'club'), mace: p => club(p, 'mace'), morning_star: p => club(p, 'star'),
  war_hammer: p => club(p, 'hammer'), flail: p => club(p, 'flail'), maul: p => club(p, 'maul'),
  short_staff: p => staff(p, 'knob'), long_staff: p => staff(p, 'ferrule'), composite_staff: p => staff(p, 'bands'),
  quarter_staff: p => staff(p, 'capped'), war_staff: p => staff(p, 'iron'),
  cap: p => helm(p, 'cap'), skull_cap: p => helm(p, 'skull'), helm: p => helm(p, 'helm'),
  full_helm: p => helm(p, 'full'), crown: p => helm(p, 'crown'), great_helm: p => helm(p, 'great'),
  rags: p => body(p, 'rags'), cape: p => body(p, 'cape'), cloak: p => body(p, 'cloak'), robe: p => body(p, 'robe'),
  quilted_armor: p => body(p, 'quilted'), leather_armor: p => body(p, 'leather'), hard_leather_armor: p => body(p, 'hard'),
  studded_leather_armor: p => body(p, 'studded'), ring_mail: p => body(p, 'ring'), chain_mail: p => body(p, 'chain'),
  scale_mail: p => body(p, 'scale'), breast_plate: p => body(p, 'breast'), splint_mail: p => body(p, 'splint'),
  plate_mail: p => body(p, 'plate'), field_plate: p => body(p, 'field'), gothic_plate: p => body(p, 'gothic'),
  full_plate_mail: p => body(p, 'full'),
  buckler: p => shield(p, 'buckler'), small_shield: p => shield(p, 'small'), large_shield: p => shield(p, 'large'),
  kite_shield: p => shield(p, 'kite'), tower_shield: p => shield(p, 'tower'), gothic_shield: p => shield(p, 'gothic'),
};

export type Icon = PixImage;

const toIcon = (p: Painter): Icon => ({ canvas: p.c, src: p.c.toDataURL(), w: p.w, h: p.h });

const BASE_ICON = Object.fromEntries(BASE_IDS.map(id => {
  const b = BASES[id], p = new Painter(b.w * CELL_PX, b.h * CELL_PX);
  DRAW[id](p);
  return [id, toIcon(p.outline())];
})) as Record<BaseId, Icon>;

const ELIXIR_COL: Record<Attr, [string, string]> = { str: ['#e07a30', '#8a3a10'], int: ['#4a8ae0', '#1c3a8a'], dex: ['#e0d040', '#8a7a10'], vit: ['#50c050', '#1c6a20'] };
const ELIXIR_ICON = Object.fromEntries((Object.keys(ELIXIR_COL) as Attr[]).map(a => {
  const p = new Painter(CELL_PX, CELL_PX), [l, d] = ELIXIR_COL[a];
  p.rect(6, 1, 2, 2, C.wood); p.rect(5, 3, 4, 1, C.gold);
  p.rect(5, 4, 4, 9, l); p.rect(8, 4, 1, 9, d); p.rect(5, 12, 4, 1, d); p.px(5, 5, '#ffffff'); p.px(5, 6, '#ffffff');
  return [a, toIcon(p.outline())];
})) as Record<Attr, Icon>;

export function itemIcon(it: Item): Icon {
  switch (it.kind) {
    case 'equip': return BASE_ICON[it.base];
    case 'elixir': return ELIXIR_ICON[it.attr];
    case 'potion': return POTION_ICON[it.potion];
  }
}
