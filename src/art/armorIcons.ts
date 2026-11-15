/** Armour icons at 28 px per inventory cell (SPEC §10.3): helms, body armour, shields, rings and amulets. */
import { GEM, METAL, Painter, R, type Pt, type Ramp, type Shade } from './painter';
import type { Draw } from './weaponIcons';
import type { BaseId } from '../rules/bases';

const clamp1 = (v: number): number => Math.max(-1, Math.min(1, v));

/** A rivet head: a glint with a shadow under it. */
function rivet(p: Painter, x: number, y: number): void {
  p.nudge(x, y, 2); p.nudge(x + 1, y, -1); p.nudge(x, y + 1, -2); p.nudge(x + 1, y + 1, -2);
}

function gem(p: Painter, x: number, y: number, rx: number, ry: number, ramp: Ramp): void {
  p.ball(x, y, rx, ry, ramp, { ...GEM, ink: true });
  p.set(x - rx * .4, y - ry * .45, ramp, 5);
}

/** Mirrors a right-half outline (offsets from the centre line, top to bottom) into a closed polygon. */
function mirrored(cx: number, half: readonly Pt[], top: readonly Pt[] = []): Pt[] {
  return [...half.map(([dx, y]) => [cx + dx, y] as const), ...[...half].reverse().map(([dx, y]) => [cx - dx, y] as const), ...top];
}

/** Chain mail weave: alternating 2 px links with a glint on each. */
function chain(p: Painter, ramp: Ramp): void {
  p.tex((x, y, t) => (((x >> 1) + (y >> 1)) & 1 ? t - 1 : (x & 1) === 0 && (y & 1) === 0 ? t + 1 : undefined), ramp);
}

/** Cloth folds below `y0`: soft vertical creases that drift sideways. */
function folds(p: Painter, ramp: Ramp, y0: number, k = .75): void {
  p.tex((x, y, t) => {
    if (y < y0) return;
    const s = Math.sin(x * k + Math.sin(y * .09) * 1.6);
    return s > .72 ? t - 1 : s < -.82 ? t + 1 : undefined;
  }, ramp);
}

/* ---------- helms (56 × 56) ---------- */

/** The upper part of an ellipsoid, cut off `cut` below its centre. */
function dome(p: Painter, cx: number, cy: number, rx: number, ry: number, cut: number, ramp: Ramp, o: Shade = {}): void {
  p.shape(cx - rx, cy - ry, cx + rx, cy + cut, (x, y) => {
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    return y <= cy + cut && dx * dx + dy * dy <= 1 ? [dx * .95, dy * .95] : null;
  }, ramp, o);
}

/** A raised crest down the middle of a helm. */
function crest(p: Painter, cx: number, y0: number, y1: number, ramp: Ramp): void {
  p.poly([[cx - 1.5, y0], [cx + 1.5, y0], [cx + 2.2, y1], [cx - 2.2, y1]], ramp, { ...METAL, ink: true, n: x => [x < cx ? -.6 : .55, -.1] });
}

function cap(p: Painter): void {
  const cx = 28;
  for (const sd of [-1, 1]) {
    p.poly([[cx + sd * 17, 36], [cx + sd * 9, 36], [cx + sd * 10, 46], [cx + sd * 14, 50], [cx + sd * 18, 45]], R.leather, { bevel: 1.4, n: () => [sd * .3, .1] });
    p.line(cx + sd * 14, 50, cx + sd * 13, 54, R.linen, 3);
  }
  dome(p, cx, 31, 18, 17.5, 4, R.leather, { ink: true });
  for (let y = 14; y < 35; y++) { p.nudge(cx, y, -2); p.nudge(cx - 1, y, 1); if (y % 3 === 0) { p.nudge(cx - 3, y, 1); p.nudge(cx + 2, y, 1); } }
  for (const sd of [-1, 1]) for (let y = 17; y < 35; y++) p.nudge(cx + sd * 10.5 * Math.sqrt(1 - ((y - 31) / 17.5) ** 2), y, -1);
  p.rod(cx - 17, 36.5, cx + 17, 36.5, 3.3, 3.3, R.leatherDark, { ink: true });
  for (let x = cx - 17; x <= cx + 17; x += 4) p.set(x, 36, R.linen, 4);
  p.ball(cx, 13.5, 2.4, 1.8, R.leatherDark, { ink: true });
}

function skullCap(p: Painter): void {
  const cx = 28;
  dome(p, cx, 35, 17.5, 20, 3, R.steel, METAL);
  crest(p, cx, 15, 37, R.steel);
  p.rod(cx - 17.5, 39.5, cx + 17.5, 39.5, 3, 3, R.iron, { ...METAL, ink: true });
  for (let x = cx - 16; x <= cx + 16; x += 6.4) rivet(p, x, 38.5);
  p.ball(cx, 14, 2.4, 2, R.steel, { ...METAL, ink: true });
}

function helm(p: Painter): void {
  const cx = 28;
  for (const sd of [-1, 1]) {
    p.poly([[cx + sd * 17.5, 29], [cx + sd * 8, 29], [cx + sd * 9, 42], [cx + sd * 13, 48], [cx + sd * 17.5, 44]], R.steel, { ...METAL, bevel: 1.5, n: () => [sd * .3, .05] });
    rivet(p, cx + sd * 13, 35);
  }
  dome(p, cx, 27, 18, 18, 3, R.steel, { ...METAL, ink: true });
  crest(p, cx, 9, 29, R.steel);
  p.rod(cx - 18, 31, cx + 18, 31, 2.8, 2.8, R.iron, { ...METAL, ink: true });
  for (let x = cx - 15; x <= cx + 15; x += 7.5) if (Math.abs(x - cx) > 2) rivet(p, x, 30);
  p.poly([[cx - 2.8, 31], [cx + 2.8, 31], [cx + 2.1, 48], [cx - 2.1, 48]], R.steel, { ...METAL, ink: true, n: x => [x < cx ? -.55 : .55, 0] });
}

function fullHelm(p: Painter): void {
  const cx = 28;
  p.poly(mirrored(cx, [[16.5, 22], [15.5, 43], [9, 52]]), R.steel, { ...METAL, bevel: 1.4, n: x => [clamp1((x - cx) / 19), .05] });
  dome(p, cx, 23, 16.5, 16.5, 2, R.steel, { ...METAL, ink: true });
  crest(p, cx, 6, 25, R.steel);
  // visor: a pointed plate with the eye slit and breaths
  p.poly(mirrored(cx, [[15, 25], [13.5, 38], [0, 43]]), R.steel, { ...METAL, bevel: 1.4, ink: true, n: (x, y) => [clamp1((x - cx) / 20), (y - 34) / 40] });
  for (let x = cx - 11; x <= cx + 11; x++) if (Math.abs(x - cx) > 1) { p.set(x, 29, R.iron, 0); p.set(x, 30, R.iron, 0); p.nudge(x, 31, 1); }
  for (const sd of [-1, 1]) {
    for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) p.set(cx + sd * (4.5 + k * 2.5), 34 + j * 2.5 - k * .5, R.iron, 0);
    rivet(p, cx + sd * 14, 26);
  }
  for (let y = 27; y < 43; y++) { p.nudge(cx - 1, y, 1); p.nudge(cx, y, -1); }
  p.rod(cx - 9, 52, cx + 9, 52, 1.7, 1.7, R.iron, { ...METAL, ink: true });
}

function crown(p: Painter): void {
  const cx = 28, rx = 17, rim = (x: number): number => 5 * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2));
  // the far side: the back points (in shadow) and the velvet lining
  for (const dx of [-.62, -.21, .21, .62]) { const x = cx + dx * rx; p.poly([[x - 3, 27], [x, 19], [x + 3, 27]], R.gold, { ...METAL, add: -2, hi: 2 }); }
  p.ball(cx, 27, rx, 5, R.red, {}, .4);
  p.tex((_x, y, t) => (y < 27 ? t - 1 : t), R.red);
  // the near side: points, then the band
  for (const dx of [-.82, -.42, 0, .42, .82]) {
    const x = cx + dx * rx, base = 27 + rim(x), tip = base - (dx === 0 ? 17 : 13);
    p.poly([[x - 3.6, base + 1], [x, tip], [x + 3.6, base + 1]], R.gold, { ...METAL, ink: true, n: px => [px < x ? -.5 : .55, -.1] });
    p.ball(x, tip - .5, 2, 2, R.bone, { spec: 1, ink: true });
  }
  p.shape(cx - rx, 27, cx + rx, 50, (x, y) => { const top = 27 + rim(x); return Math.abs(x - cx) <= rx && y >= top && y <= top + 15 ? [(x - cx) / rx * .92, 0] : null; }, R.gold, { ...METAL, ink: true });
  for (let x = cx - rx; x <= cx + rx; x++) { const top = 27 + rim(x + .5); p.nudge(x, top + 1, 1); p.nudge(x, top + 2.5, -2); p.nudge(x, top + 12, -2); p.nudge(x, top + 13.5, 1); }
  gem(p, cx, 27 + rim(cx) + 7.5, 3.4, 3.6, R.ruby);
  for (const sd of [-1, 1]) { gem(p, cx + sd * 8.5, 27 + rim(cx + sd * 8.5) + 7.5, 2.4, 2.8, R.sapphire); gem(p, cx + sd * 14.2, 27 + rim(cx + sd * 14.2) + 7.5, 1.7, 2.2, R.emerald); }
}

function greatHelm(p: Painter): void {
  const cx = 28;
  p.poly([[cx - 15, 13], [cx + 15, 13], [cx + 14, 50], [cx - 14, 50]], R.steel, { ...METAL, n: x => [clamp1((x - cx) / 17), 0] });
  p.ball(cx, 13, 15, 4.6, R.steel, { ...METAL, add: 1, ink: true }, .35);
  p.rod(cx - 14, 50.5, cx + 14, 50.5, 2, 2, R.iron, { ...METAL, ink: true });
  p.poly([[cx - 14.6, 23], [cx + 14.6, 23], [cx + 14.4, 29], [cx - 14.4, 29]], R.gold, { ...METAL, bevel: 1.1, ink: true, n: x => [clamp1((x - cx) / 17), 0] });
  p.poly([[cx - 2.2, 14], [cx + 2.2, 14], [cx + 2.2, 49], [cx - 2.2, 49]], R.gold, { ...METAL, ink: true, n: x => [x < cx ? -.55 : .55, 0] });
  for (const sd of [-1, 1]) for (let k = 4; k <= 12; k++) { p.set(cx + sd * k - (sd < 0 ? 1 : 0), 25, R.iron, 0); p.set(cx + sd * k - (sd < 0 ? 1 : 0), 26, R.iron, 0); }
  for (let j = 0; j < 4; j++) for (let k = 0; k < 3; k++) { p.set(cx + 5 + k * 3, 33 + j * 3.5, R.iron, 0); p.nudge(cx + 6 + k * 3, 34 + j * 3.5, 1); }
  for (const [dx, dy] of [[0, 0], [-1, 1], [0, 1], [1, 1], [0, 2], [0, 3]]) p.set(cx - 9 + dx, 36 + dy, R.iron, 0);
  for (let x = cx - 12; x <= cx + 12; x += 6) if (Math.abs(x - cx) > 3) rivet(p, x, 46);
}

/* ---------- body armour (56 × 84) ---------- */

const CX = 28;
/** Right half of a tunic's outline: collar, shoulder, armpit, waist, hip, hem. */
const tunic = (hem: number, flare: number): Pt[] => [[5, 6], [11, 7.5], [16.5, 10.5], [16.2, 22], [13.6, 36], [13.2, 46], [15, 60], [15.5 + flare, hem]];

/** Half-width of an outline at height y. */
function halfAt(side: readonly Pt[], y: number): number {
  for (let i = 1; i < side.length; i++) if (y <= side[i][1]) { const [ax, ay] = side[i - 1], [bx, by] = side[i]; return ax + (bx - ax) * Math.max(0, (y - ay) / (by - ay)); }
  return side[side.length - 1][0];
}

/** A garment's trunk with a round neckline, shaded as a barrel. */
function torso(p: Painter, ramp: Ramp, hem = 76, flare = 0, o: Shade = {}): Pt[] {
  const side = tunic(hem, flare);
  p.poly(mirrored(CX, side, [[CX - 3.2, 10], [CX, 12], [CX + 3.2, 10]]), ramp, { ...o, n: (x, y) => [clamp1((x - CX) / (halfAt(side, y) + 2)) * .85, y < 13 ? -.3 : 0] });
  return side;
}

function sleeves(p: Painter, ramp: Ramp, long = false, o: Shade = {}): void {
  for (const sd of [-1, 1]) p.rod(CX + sd * 14.5, 12.5, CX + sd * (long ? 23 : 21.5), long ? 46 : 25, 5.4, long ? 4.8 : 4.6, ramp, o);
}

function belt(p: Painter, side: readonly Pt[], y: number, ramp: Ramp, buckle: Ramp | null = R.steel): void {
  const a = halfAt(side, y) + .6, b = halfAt(side, y + 4) + .6;
  p.poly([[CX - a, y], [CX + a, y], [CX + b, y + 4], [CX - b, y + 4]], ramp, { bevel: 1, ink: true, n: x => [clamp1((x - CX) / 16) * .8, 0] });
  if (!buckle) return;
  p.poly([[CX - 3.2, y - 1], [CX + 3.2, y - 1], [CX + 3.2, y + 5], [CX - 3.2, y + 5]], buckle, { ...METAL, bevel: 1.5, ink: true });
  p.set(CX - 1, y + 1.5, ramp, 0); p.set(CX, y + 1.5, ramp, 0); p.set(CX - 1, y + 2.5, ramp, 0); p.set(CX, y + 2.5, ramp, 0);
}

function rags(p: Painter): void {
  sleeves(p, R.brown);
  const side = torso(p, R.brown, 70, 1, { ink: true });
  folds(p, R.brown, 30);
  // tattered hem and cuffs, holes, a patch, a rope belt
  for (let x = 0; x < 56; x++) { const cut = 64 + ((x * 7) % 5) + ((x * 3) % 4); for (let y = cut; y < 72; y++) p.clear(x, y); }
  for (const sd of [-1, 1]) for (let k = 0; k < 9; k++) if (k % 3 !== 1) for (let y = 23 + (k % 2); y < 31; y++) p.clear(CX + sd * (17 + k) - (sd < 0 ? 1 : 0), y + (sd > 0 ? k * .3 : (8 - k) * .2));
  for (const [x, y] of [[21, 27], [22, 27], [21, 28], [33, 55], [34, 55], [34, 56], [33, 56], [24, 50]]) p.set(x, y, R.brown, 0);
  p.poly([[30, 20], [37, 21], [36, 28], [29, 27]], R.linen, { add: -1, bevel: 1, ink: true });
  for (const [x, y] of [[29, 22], [37, 24], [32, 20], [33, 28]]) p.set(x, y, R.linen, 5);
  const w = halfAt(side, 40);
  p.rod(CX - w, 40, CX + w, 41, 1.5, 1.5, R.linen, { ink: true });
  p.tex((x, _y, t) => (x % 3 === 0 ? t - 2 : undefined), R.linen);
  p.rod(CX + 3, 41, CX + 5, 52, 1.2, 1, R.linen);
  p.ball(CX + 3, 41, 2, 2, R.linen, { ink: true });
}

function cape(p: Painter): void {
  p.poly(mirrored(CX, [[7, 7], [14, 22], [19, 56], [14, 71], [7, 66], [0, 72]]), R.green, { n: (x, y) => [clamp1((x - CX) / 24) * .8, y < 14 ? -.3 : 0] });
  folds(p, R.green, 12, .62);
  // a rolled collar, closed by a brooch on a short chain
  p.rod(CX - 8, 7.5, CX + 8, 7.5, 2.6, 2.6, R.green, { add: -2, ink: true });
  for (let x = CX - 7; x <= CX + 6; x++) p.set(x, 10.5 + Math.round(Math.sin((x - CX + 7) / 13 * Math.PI) * 2), R.gold, (x & 1) ? 5 : 3);
  gem(p, CX, 12.5, 2.6, 2.6, R.gold);
  for (let k = 0; k < 40; k++) { const x = 9 + k; p.nudge(x, 69 - Math.abs(((x - 9) % 14) - 7) * .9, 1); }
}

function cloak(p: Painter): void {
  p.poly(mirrored(CX, [[9, 12], [16, 24], [20, 62], [17, 80], [0, 78]]), R.grey, { n: (x, y) => [clamp1((x - CX) / 25) * .8, y < 18 ? -.3 : 0] });
  folds(p, R.grey, 20, .58);
  // hood, with the dark opening
  p.ball(CX, 13, 11, 10.5, R.grey, { ink: true });
  p.ball(CX, 15, 7, 7.5, R.grey, { flat: 0 });
  p.tex((x, y, t) => (t === 0 && y > 17 && Math.abs(x - CX) < 4 ? 1 : undefined), R.grey);
  p.poly([[CX - 8, 22], [CX + 8, 22], [CX + 5, 27], [CX - 5, 27]], R.grey, { add: -1, bevel: 1, ink: true });
  gem(p, CX, 25, 2.6, 2.6, R.bronze);
  for (let y = 30; y < 78; y++) { p.nudge(CX, y, -2); p.nudge(CX - 1, y, 1); }
}

function robe(p: Painter): void {
  sleeves(p, R.purple, true);
  for (const sd of [-1, 1]) p.rod(CX + sd * 22.6, 42, CX + sd * 23.2, 46, 5.4, 5.4, R.gold, { ...METAL, ink: true }, true);
  const side = torso(p, R.purple, 81, 4, { ink: true });
  folds(p, R.purple, 48, .7);
  for (let y = 12; y < 80; y++) { p.nudge(CX, y, -2); p.nudge(CX - 1, y, 1); }
  // gold trim: collar, front edge, hem
  for (const sd of [-1, 1]) p.line(CX + sd * 5, 6.5, CX + sd * .5, 13, R.gold, 4);
  for (let y = 75; y <= 77; y++) { const w = halfAt(side, y); for (let x = Math.ceil(CX - w); x < CX + w; x++) if (p.rampAt(x, y) === R.purple) p.set(x, y, R.gold, y === 75 ? 5 : y === 76 ? 3 : 1); }
  belt(p, side, 43, R.red, null);
  p.rod(CX - 3, 46, CX - 5, 62, 2, 1.6, R.red, { ink: true });
  p.rod(CX - 1, 46, CX - 1, 58, 1.8, 1.5, R.red, { ink: true });
  p.ball(CX - 2, 45, 2.6, 2.6, R.red, { ink: true });
}

function quilted(p: Painter): void {
  sleeves(p, R.linen);
  const side = torso(p, R.linen, 74, 0, { ink: true });
  p.tex((x, y, t) => {
    const a = (x + y) % 8, b = (x - y + 800) % 8;
    return a === 0 || b === 0 ? t - 2 : a === 1 || b === 7 ? t + 1 : undefined;
  }, R.linen);
  p.rod(CX - 5, 7, CX + 5, 7, 2, 2, R.brown, { ink: true });
  for (let y = 12; y < 73; y++) p.set(CX, y, R.linen, 0);
  for (const y of [18, 28, 38]) { p.ball(CX - 1.5, y, 1.6, 1.6, R.woodDark, { ink: true }); p.line(CX, y, CX + 3, y, R.brown, 2); }
  belt(p, side, 46, R.brown, R.bronze);
}

function leather(p: Painter): void {
  sleeves(p, R.leather);
  const side = torso(p, R.leather, 72, 0, { ink: true });
  for (let y = 12; y < 72; y++) for (const sd of [-1, 1]) p.nudge(CX + sd * (halfAt(side, y) - 3.5), y, -1);
  // laced chest
  for (let y = 12; y < 30; y++) p.set(CX, y, R.leather, 0);
  for (let y = 14; y < 30; y += 4) { p.line(CX - 3, y, CX + 2, y + 2, R.linen, 4); p.line(CX + 2, y, CX - 3, y + 2, R.linen, 3); p.set(CX - 3, y, R.leather, 0); p.set(CX + 2, y, R.leather, 0); }
  for (const sd of [-1, 1]) for (let k = 0; k < 9; k++) p.nudge(CX + sd * (6 + k), 9 + k * .25, -1);
  belt(p, side, 44, R.leatherDark, R.steel);
  for (let y = 52; y < 72; y++) { p.nudge(CX - 5, y, -1); p.nudge(CX + 5, y, -1); }
}

function hardLeather(p: Painter): void {
  const side = torso(p, R.leatherDark, 72, 0);
  for (const sd of [-1, 1]) {
    p.ball(CX + sd * 17.5, 14, 7, 5.6, R.leather, { ink: true });
    p.ball(CX + sd * 19, 20.5, 5.4, 3.6, R.leather, { ink: true });
    rivet(p, CX + sd * 17.5, 13);
  }
  // overlapping bands down the chest
  p.tex((_x, y, t) => { if (y < 16 || y > 43) return; const k = (y - 16) % 7; return k === 6 ? t - 2 : k === 0 ? t + 1 : undefined; }, R.leatherDark);
  for (let y = 22; y < 43; y += 7) for (const sd of [-1, 1]) rivet(p, CX + sd * (halfAt(side, y) - 3), y - 3);
  belt(p, side, 44, R.leather, R.bronze);
  p.tex((x, y, t) => (y > 50 && (x - CX + 60) % 6 === 0 ? t - 2 : y > 50 && (x - CX + 60) % 6 === 1 ? t + 1 : undefined), R.leatherDark);
}

function studded(p: Painter): void {
  sleeves(p, R.leatherDark);
  const side = torso(p, R.leatherDark, 72, 0, { ink: true });
  for (let y = 15; y < 70; y += 5) for (let x = CX - 14 + ((y / 5) & 1) * 2.5; x < CX + 14; x += 5) {
    if (p.rampAt(Math.floor(x), y) !== R.leatherDark || p.rampAt(Math.floor(x) + 1, y + 1) !== R.leatherDark || (y > 41 && y < 50)) continue;
    p.set(x, y, R.steel, 5); p.set(x + 1, y, R.steel, 3); p.set(x, y + 1, R.steel, 2); p.set(x + 1, y + 1, R.iron, 0);
  }
  for (const sd of [-1, 1]) for (const [dx, y] of [[18, 17], [20, 21], [17, 22]]) { p.set(CX + sd * dx, y, R.steel, 5); p.nudge(CX + sd * dx, y + 1, -2); }
  p.rod(CX - 5, 7, CX + 5, 7, 2, 2, R.leather, { ink: true });
  belt(p, side, 44, R.leather, R.steel);
}

function ringMail(p: Painter): void {
  sleeves(p, R.leather);
  const side = torso(p, R.leather, 72, 0, { ink: true });
  for (let y = 13; y < 72; y++) for (let x = 0; x < 56; x++) {
    if (p.rampAt(x, y) !== R.leather) continue;
    const row = Math.floor(y / 5), lx = ((x + (row & 1) * 3) % 6) - 2.5, ly = (y % 5) - 2, d = Math.hypot(lx, ly);
    if (d > 1.1 && d < 2.4) p.set(x, y, R.iron, lx + ly < -.5 ? 5 : lx + ly > 1 ? 2 : 3);
  }
  p.rod(CX - 5.5, 7, CX + 5.5, 7, 2.2, 2.2, R.iron, { ...METAL, ink: true });
  belt(p, side, 44, R.leatherDark, R.steel);
}

function chainMail(p: Painter): void {
  sleeves(p, R.steel, false, { add: -1 });
  const side = torso(p, R.steel, 74, 0, { add: -1, ink: true });
  chain(p, R.steel);
  for (let x = 0; x < 56; x++) if ((x >> 1) & 1) { p.clear(x, 73); p.clear(x, 72); }
  for (const sd of [-1, 1]) for (let k = 0; k < 8; k++) if (k & 1) p.clear(CX + sd * (17 + k) - (sd < 0 ? 1 : 0), 28 - (sd > 0 ? k : 7 - k) * .1);
  p.rod(CX - 5.5, 7, CX + 5.5, 7, 2.2, 2.2, R.leather, { ink: true });
  belt(p, side, 44, R.leather, R.bronze);
}

function scaleMail(p: Painter): void {
  sleeves(p, R.steel, false, { add: -1 });
  const side = torso(p, R.steel, 74, 0, { add: -1, ink: true });
  p.tex((x, y, t) => {
    const row = Math.floor(y / 5), lx = ((x + (row & 1) * 3) % 6) - 2.5, ly = y % 5;
    // each scale: a lit top, a dark rounded lower edge
    return ly === 4 || (ly === 3 && Math.abs(lx) > 1.2) || Math.abs(lx) > 2.2 ? t - 2 : ly <= 1 && lx < .5 ? t + 1 : undefined;
  }, R.steel);
  p.rod(CX - 5.5, 7, CX + 5.5, 7, 2.2, 2.2, R.leatherDark, { ink: true });
  belt(p, side, 44, R.leatherDark, R.bronze);
}

function splintMail(p: Painter): void {
  sleeves(p, R.leatherDark);
  const side = torso(p, R.leatherDark, 74, 0, { ink: true });
  for (let y = 14; y < 73; y++) for (let x = 0; x < 56; x++) {
    const k = ((x - CX) % 5 + 5) % 5;
    if (p.rampAt(x, y) !== R.leatherDark || k === 4 || Math.abs(x - CX) > halfAt(side, y) - 1 || (y > 42 && y < 50)) continue;
    const top = y === 14 || y === 50, end = y === 42 || y === 72;
    p.set(x, y, R.steel, end ? 0 : top ? 4 : k === 0 ? 4 : k === 3 ? 1 : (y % 9) === 4 && k === 1 ? 5 : (y % 9) === 5 && k === 2 ? 0 : 2);
  }
  p.rod(CX - 5.5, 7, CX + 5.5, 7, 2.2, 2.2, R.iron, { ...METAL, ink: true });
  belt(p, side, 44, R.leather, R.steel);
}

interface Plate { ramp: Ramp; trim: Ramp; pauldron: number; lames: number; fluted?: boolean; gem?: Ramp; under?: Ramp }

/** Plate armour: mail beneath, skirt lames, a breastplate with a centre ridge, a gorget and pauldrons. */
function plate(p: Painter, a: Plate): void {
  const under = a.under ?? R.iron;
  sleeves(p, under);
  torso(p, under, 77, 1, { ink: true });
  chain(p, under);
  for (let k = a.lames - 1; k >= 0; k--) {
    const y = 46 + k * (28 / a.lames), w = 13.5 + k * .9, h = 28 / a.lames + 2;
    p.poly([[CX - w, y], [CX + w, y], [CX + w + .9, y + h], [CX - w - .9, y + h]], a.ramp, { ...METAL, bevel: 1.3, ink: true, n: x => [clamp1((x - CX) / 19) * .85, 0] });
    for (let x = Math.ceil(CX - w); x < CX + w; x++) p.nudge(x, y + h - 1, a.trim === R.gold && k === a.lames - 1 ? 0 : -1);
  }
  const chest: Pt[] = [[4.5, 7], [10, 8], [14.5, 11.5], [15.6, 24], [13.6, 38], [13.8, 48]];
  p.poly(mirrored(CX, chest, [[CX - 3, 10.5], [CX, 12.5], [CX + 3, 10.5]]), a.ramp, { ...METAL, bevel: 1.5, ink: true, n: (x, y) => [clamp1((x - CX) / 18) * .9, (y - 26) / 46] });
  if (a.fluted) p.tex((x, y, t) => { if (y < 14 || y > 46) return; const k = ((x - CX) % 5 + 5) % 5; return k === 0 ? t - 1 : k === 1 ? t + 1 : undefined; }, a.ramp);
  for (let y = 13; y < 47; y++) { p.nudge(CX - 1, y, 1); p.nudge(CX, y, -2); }
  for (let x = Math.ceil(CX - 13.6); x < CX + 13.6; x++) { p.set(x, 46, a.trim, 5); p.set(x, 47, a.trim, 3); p.set(x, 48, a.trim, 1); }
  p.poly([[CX - 6.5, 4.5], [CX + 6.5, 4.5], [CX + 7.5, 10], [CX, 14], [CX - 7.5, 10]], a.ramp, { ...METAL, bevel: 1.4, ink: true });
  for (const sd of [-1, 1]) for (let k = 0; k <= 7; k++) p.set(CX + sd * k - (sd < 0 ? 1 : 0), 13 - k * .45, a.trim, 4);
  for (const sd of [-1, 1]) {
    const r = a.pauldron;
    p.ball(CX + sd * 19.5, 22, r - 2, 4.2, a.ramp, { ...METAL, ink: true });
    p.ball(CX + sd * 17.5, 14, r, r * .82, a.ramp, { ...METAL, ink: true });
    for (let k = -r + 1; k < r; k++) p.nudge(CX + sd * 17.5 + k, 14 + r * .82 * Math.sqrt(1 - (k / r) ** 2) - 1, -1);
    p.set(CX + sd * 17.5, 14, a.trim, 5); p.nudge(CX + sd * 17.5 + 1, 15, -2);
  }
  if (a.gem) gem(p, CX, 23, 3, 3.4, a.gem);
}

function breastPlate(p: Painter): void {
  sleeves(p, R.linen);
  const side = torso(p, R.leather, 72, 0, { ink: true });
  folds(p, R.leather, 50);
  p.poly(mirrored(CX, [[4.5, 7], [10, 8], [14.5, 11.5], [15.6, 24], [13.6, 38], [12, 46], [0, 51]], [[CX - 3, 10.5], [CX, 12.5], [CX + 3, 10.5]]), R.steel, { ...METAL, bevel: 1.5, ink: true, n: (x, y) => [clamp1((x - CX) / 18) * .9, (y - 26) / 46] });
  for (let y = 13; y < 50; y++) { p.nudge(CX - 1, y, 1); p.nudge(CX, y, -2); }
  for (const sd of [-1, 1]) {
    // pectoral curve and shoulder strap with its buckle
    for (let k = 2; k < 12; k++) p.nudge(CX + sd * k - (sd < 0 ? 1 : 0), 27 + (k - 7) ** 2 * .1, -1);
    p.poly([[CX + sd * 9, 7], [CX + sd * 13, 9], [CX + sd * 12, 14], [CX + sd * 8, 12]], R.leatherDark, { bevel: 1, ink: true });
    p.set(CX + sd * 10.5, 11, R.bronze, 5);
  }
  belt(p, side, 52, R.leatherDark, R.bronze);
}

/* ---------- shields ---------- */

function round(p: Painter, r: number, face: Ramp, rimRamp: Ramp, boss: number, wooden: boolean): void {
  const cx = 28, cy = 28;
  p.ball(cx, cy, r, r, rimRamp, METAL, .9);
  p.ball(cx, cy, r - 3, r - 3, face, { ...(wooden ? {} : METAL), ink: true }, .45);
  if (wooden) p.tex((x, y, t) => { const k = ((x - cx) % 7 + 7) % 7, s = Math.sin(y * .5 + x * 1.7); return k === 0 ? t - 2 : k === 1 ? t + 1 : s > 1.25 ? t - 1 : undefined; }, face);
  else for (let a = 0; a < 80; a++) { const an = a / 80 * Math.PI * 2, rr = (r - 3) * .62; p.nudge(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, Math.cos(an) + Math.sin(an) < 0 ? -1 : 1); }
  const n = Math.round(r * .55);
  for (let k = 0; k < n; k++) { const an = (k + .5) / n * Math.PI * 2; rivet(p, cx + Math.cos(an) * (r - 1.8) - .5, cy + Math.sin(an) * (r - 1.8) - .5); }
  p.ball(cx, cy, boss + 2.2, boss + 2.2, R.iron, { ...METAL, ink: true }, .5);
  p.ball(cx, cy, boss, boss, R.steel, { ...METAL, ink: true });
}

/** A shield from a right-half outline: a metal rim, an inset face, optional planks. */
function framed(p: Painter, cx: number, outline: readonly Pt[], inner: readonly Pt[], rimRamp: Ramp, face: Ramp, o: { wooden?: boolean; top?: Pt[]; innerTop?: Pt[]; mid: number }): void {
  p.poly(mirrored(cx, outline, o.top), rimRamp, { ...METAL, bevel: 1.6, n: x => [clamp1((x - cx) / 26) * .8, 0] });
  p.poly(mirrored(cx, inner, o.innerTop), face, { ...(o.wooden ? {} : METAL), ink: true, n: (x, y) => [clamp1((x - cx) / 24) * .8, (y - o.mid) / 110] });
  if (o.wooden) p.tex((x, y, t) => { const k = ((x - cx) % 7 + 7) % 7, s = Math.sin(y * .5 + x * 1.7); return k === 0 ? t - 2 : k === 1 ? t + 1 : s > 1.25 ? t - 1 : undefined; }, face);
}

function largeShield(p: Painter): void {
  const cx = 28;
  framed(p, cx, [[0, 3], [22, 3], [23, 20], [19, 36], [10, 48], [0, 54]], [[0, 6], [19.5, 6], [20.3, 20], [16.6, 34.5], [8.6, 45.5], [0, 50.5]], R.iron, R.wood, { wooden: true, mid: 26 });
  p.poly([[cx - 19.5, 17], [cx + 19.5, 17], [cx + 19.8, 21.5], [cx - 19.8, 21.5]], R.iron, { ...METAL, bevel: 1.2, ink: true });
  p.poly([[cx - 2.4, 6], [cx + 2.4, 6], [cx + 2.4, 50], [cx - 2.4, 50]], R.iron, { ...METAL, bevel: 1.2, ink: true });
  for (const [dx, y] of [[-16, 19], [-9, 19], [9, 19], [16, 19], [0, 10], [0, 32], [0, 42]]) rivet(p, cx + dx - .5, y - .5);
  for (const [dx, y] of [[-20, 5], [20, 5], [-20, 19], [20, 19], [-14, 40], [14, 40]]) rivet(p, cx + dx - .5, y - .5);
  p.ball(cx, 19.5, 5.4, 5.4, R.steel, { ...METAL, ink: true });
}

function kiteShield(p: Painter): void {
  const cx = 28;
  framed(p, cx, [[0, 3], [13, 4], [20.5, 9], [21.5, 24], [17, 46], [9, 67], [0, 81]], [[0, 6.5], [11.5, 7.3], [17.4, 11.5], [18.3, 24], [14, 45], [6.8, 64], [0, 75]], R.gold, R.red, { mid: 34 });
  // a gold cross on the red field
  p.poly([[cx - 2.4, 9], [cx + 2.4, 9], [cx + 2.4, 66], [cx, 71], [cx - 2.4, 66]], R.gold, { ...METAL, bevel: 1.2, ink: true });
  p.poly([[cx - 17, 22], [cx + 17, 22], [cx + 16.6, 27], [cx - 16.6, 27]], R.gold, { ...METAL, bevel: 1.2, ink: true });
  gem(p, cx, 24.5, 3.6, 3.6, R.gold);
  for (const [dx, y] of [[-12, 8], [12, 8], [-19, 24], [19, 24], [-13, 50], [13, 50], [0, 77]]) rivet(p, cx + dx - .5, y - .5);
}

function towerShield(p: Painter): void {
  const cx = 28;
  framed(p, cx, [[17, 3], [20.5, 6.5], [20.5, 77.5], [17, 81]], [[15.5, 6], [17.5, 8], [17.5, 76], [15.5, 78]], R.iron, R.wood, { wooden: true, mid: 42 });
  for (const y of [18, 40, 62]) {
    p.poly([[cx - 17.5, y], [cx + 17.5, y], [cx + 17.5, y + 4.5], [cx - 17.5, y + 4.5]], R.iron, { ...METAL, bevel: 1.2, ink: true, n: x => [clamp1((x - cx) / 24) * .8, 0] });
    for (const dx of [-14, -7, 7, 14]) rivet(p, cx + dx - .5, y + 1.5);
  }
  for (const y of [6, 30, 54, 78]) for (const sd of [-1, 1]) rivet(p, cx + sd * 19 - .5, y - .5);
  p.ball(cx, 42, 5.5, 9, R.steel, { ...METAL, ink: true });
  p.ball(cx, 42, 2.2, 3.6, R.steel, { ...METAL, add: 1 });
}

function gothicShield(p: Painter): void {
  const cx = 28, tip = 81;
  framed(p, cx, [[4.5, 3], [13, 5.5], [20.5, 3], [21.5, 16], [19, 36], [14, 56], [7, 71], [0, tip]], [[4.5, 7], [13, 9.2], [17.8, 7.4], [18.5, 16], [16.2, 35], [11.6, 54], [5.4, 67.5], [0, 75]], R.gold, R.steel,
    { mid: 36, top: [[cx - 2, 3.4], [cx, 6.5], [cx + 2, 3.4]], innerTop: [[cx - 2.2, 7.4], [cx, 9.8], [cx + 2.2, 7.4]] });
  // fluting fanned from the point
  p.tex((x, y, t) => { const a = Math.atan2(x + .5 - cx, tip + 26 - y) * 17 + .5, f = a - Math.floor(a); return f < .16 ? t - 1 : f < .32 ? t + 1 : undefined; }, R.steel);
  p.poly([[cx - 2, 10], [cx + 2, 10], [cx + 1.6, 66], [cx, 72], [cx - 1.6, 66]], R.gold, { ...METAL, ink: true, n: x => [x < cx ? -.55 : .55, 0] });
  p.poly([[cx, 20], [cx + 8, 30], [cx, 40], [cx - 8, 30]], R.gold, { ...METAL, bevel: 1.8, ink: true });
  gem(p, cx, 30, 3.2, 3.6, R.sapphire);
  for (const [dx, y] of [[-17, 12], [17, 12], [-15, 40], [15, 40], [-8, 62], [8, 62]]) rivet(p, cx + dx - .5, y - .5);
}

/* ---------- jewelry (28 × 28) ---------- */

type Cut = 'round' | 'square' | 'cluster';
function ring(p: Painter, stone: Ramp, cut: Cut): void {
  const cx = 14;
  // a band seen from above and in front: thick toward the viewer, thin at the back
  p.shape(4, 9, 24, 27, (x, y) => {
    const ox = (x - cx) / 9.2, oy = (y - 17.8) / 7.8, d = Math.hypot(ox, oy), ix = (x - cx) / 6.3, iy = (y - 16.6) / 4.5;
    if (d > 1 || ix * ix + iy * iy < 1) return null;
    const k = (d - .8) * 3.4;
    return [ox / d * k, oy / d * k];
  }, R.gold, METAL);
  p.tex((_x, y, t) => (y < 13 ? t - 1 : undefined), R.gold);
  p.poly([[cx - 4.6, 9.5], [cx + 4.6, 9.5], [cx + 3, 13.2], [cx - 3, 13.2]], R.gold, { ...METAL, bevel: 1, ink: true });
  if (cut === 'round') gem(p, cx, 7.6, 4.4, 4, stone);
  else if (cut === 'square') {
    p.poly([[cx - 4.4, 3.6], [cx + 4.4, 3.6], [cx + 4.4, 10.6], [cx - 4.4, 10.6]], stone, { ...GEM, bevel: 2.4, ink: true });
    p.set(cx - 2, 5.5, stone, 5); p.set(cx - 1, 5.5, stone, 5);
  } else {
    gem(p, cx, 7, 3.8, 3.8, stone);
    for (const sd of [-1, 1]) gem(p, cx + sd * 5.6, 9.4, 2, 2, R.glass);
  }
  for (const sd of [-1, 1]) p.set(cx + sd * 3.8 - .5, 10.4, R.gold, 5);
}

function amulet(p: Painter, stone: Ramp, drop: boolean): void {
  const cx = 14;
  for (const sd of [-1, 1]) for (let k = 0; k <= 7; k++) {
    const t = k / 7, x = cx + sd * (9 - 8.4 * t ** 1.5), y = 1.5 + 10 * t;
    p.ball(x, y, 1.3, 1.3, R.gold, { flat: k & 1 ? 4 : 2 });
  }
  p.ball(cx, 12.6, 2, 2, R.gold, { ...METAL, ink: true });
  if (drop) {
    p.poly([[cx, 12.6], [cx + 6.6, 19.6], [cx, 27.4], [cx - 6.6, 19.6]], R.gold, { ...METAL, bevel: 2, ink: true });
    gem(p, cx, 19.8, 2.8, 4, stone);
  } else {
    p.ball(cx, 20, 6.8, 6.8, R.gold, { ...METAL, ink: true }, .75);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; p.nudge(cx + Math.cos(a) * 5.2, 20 + Math.sin(a) * 5.2, 1); }
    gem(p, cx, 20, 3.7, 3.7, stone);
  }
}

export const ARMOR_DRAW = {
  cap, skull_cap: skullCap, helm, full_helm: fullHelm, crown, great_helm: greatHelm,
  rags, cape, cloak, robe, quilted_armor: quilted, leather_armor: leather, hard_leather_armor: hardLeather,
  studded_leather_armor: studded, ring_mail: ringMail, chain_mail: chainMail, scale_mail: scaleMail,
  breast_plate: breastPlate, splint_mail: splintMail,
  plate_mail: p => plate(p, { ramp: R.steel, trim: R.iron, pauldron: 7.2, lames: 4 }),
  field_plate: p => plate(p, { ramp: R.iron, trim: R.bronze, pauldron: 8, lames: 5, under: R.leatherDark }),
  gothic_plate: p => plate(p, { ramp: R.steel, trim: R.gold, pauldron: 8, lames: 5, fluted: true }),
  full_plate_mail: p => plate(p, { ramp: R.steel, trim: R.gold, pauldron: 9.4, lames: 4, gem: R.ruby, under: R.steel }),
  buckler: p => round(p, 19, R.steel, R.iron, 5, false),
  small_shield: p => round(p, 23.5, R.wood, R.iron, 5.5, true),
  large_shield: largeShield, kite_shield: kiteShield, tower_shield: towerShield, gothic_shield: gothicShield,
  ring: p => ring(p, R.ruby, 'round'), ring_q10: p => ring(p, R.sapphire, 'square'), ring_q15: p => ring(p, R.emerald, 'cluster'),
  amulet: p => amulet(p, R.ruby, false), amulet_q16: p => amulet(p, R.sapphire, true),
} satisfies Partial<Record<BaseId, Draw>>;
