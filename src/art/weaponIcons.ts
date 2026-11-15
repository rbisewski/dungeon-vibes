/** Weapon icons at 28 px per inventory cell (SPEC §10.3): swords, axes, clubs, staves and bows. */
import { METAL, Painter, R, type Pt, type Ramp } from './painter';
import type { BaseId } from '../rules/bases';

export type Draw = (p: Painter) => void;

/** Leather wrap on a grip: a dark spiral with a light thread beside it. */
function wrap(p: Painter, ramp: Ramp, pitch = 3): void {
  p.tex((x, y, t) => { const k = (((y * 2 + x) % (pitch * 2)) + pitch * 2) % (pitch * 2); return k === 0 ? t - 2 : k === 1 ? t + 1 : undefined; }, ramp);
}

/** Wood grain: long dark streaks with the odd knot. */
function grain(p: Painter, ramp: Ramp, seed = 0): void {
  p.tex((x, y, t) => {
    const s = Math.sin(y * .55 + x * 2.1 + seed) + Math.sin(y * .23 + x * 3.7 + seed * 2);
    return s > 1.35 ? t - 1 : s < -1.6 ? t + 1 : undefined;
  }, ramp);
}

/* ---------- swords ---------- */

interface Sword {
  /** Blade width at the guard, and extra width gained toward the tip. */
  bw: number; flare?: number;
  /** Length of the point. */
  tip?: number;
  /** `double`: two edges and a central ridge. `single`: the point lies on the back. `clip`: the back is cut away to the point. */
  edge?: 'double' | 'single' | 'clip';
  /** Sideways sweep of the tip. */
  curve?: number;
  fuller?: boolean;
  /** Guard half-width and shape. */
  guard: number; quillons?: 'bar' | 'up' | 'down';
  grip: number;
  hilt: Ramp; wrap?: Ramp;
  /** A knuckle bow from guard to pommel (sabres). */
  bow?: boolean;
  gem?: Ramp;
}

function sword(p: Painter, s: Sword): void {
  const sweep = s.curve ?? 0, hx = p.w / 2 - sweep * .45, edge = s.edge ?? 'double';
  const pomY = p.h - 5.5, gripB = pomY - 2.5, gripT = gripB - s.grip, gy = gripT - 2, bladeB = gy - 1, tipY = 2;
  const len = bladeB - tipY, tipLen = s.tip ?? s.bw * 1.8, half = s.bw / 2;
  const centre = (y: number): number => { const t = (bladeB - y) / len; return hx + sweep * t * t; };
  /** Left and right edges of the blade at height y. */
  const span = (y: number): [number, number] => {
    const t = (bladeB - y) / len, c = centre(y), h = half + (s.flare ?? 0) * t, k = Math.min(1, (y - tipY) / tipLen);
    if (edge === 'double') { const w = h * k ** .75; return [c - w, c + w]; }
    const w = 2 * h * k ** .6;
    return edge === 'single' ? [c + h - w, c + h] : [c - h, c - h + w];
  };
  const left: Pt[] = [], right: Pt[] = [];
  for (let y = bladeB; y >= tipY; y -= 1) { const [a, b] = span(y); left.push([a, y]); right.push([b, y]); }
  const ridge = (y: number): number => { const [a, b] = span(y); return edge === 'double' ? (a + b) / 2 : edge === 'single' ? a + (b - a) * .68 : a + (b - a) * .62; };
  p.poly([...left, ...right.reverse()], R.steel, { ...METAL, n: (x, y) => [x < ridge(y) ? -.5 : .6, -.04] });
  p.edge('l', R.steel, 5, tipY, bladeB);
  p.edge('r', R.steel, 1, tipY, bladeB);
  if (edge !== 'double') for (let y = tipY + 2; y <= bladeB; y++) p.nudge(span(y)[0] + 1.5, y, 1);
  // polish: two diagonal glints across the blade
  p.tex((x, y, t) => { const d = y + (x - hx) * 1.3 - tipY - len * .3, e = d - len * .36; return (d >= 0 && d < 3) || (e >= 0 && e < 1.5) ? t + 1 : undefined; }, R.steel);
  if (s.fuller) for (let y = Math.round(bladeB - len * .66); y <= bladeB - 1; y++) { const c = Math.round(centre(y)); p.set(c - 1, y, R.steel, 1); p.set(c, y, R.steel, 5); }
  // hilt: grip, guard, pommel
  const grip = s.wrap ?? R.leather;
  p.rod(hx, gripT, hx, gripB, 2.1, 1.9, grip, {}, true);
  wrap(p, grip);
  const g = s.guard, q = s.quillons ?? 'bar', dy = q === 'up' ? -3.5 : q === 'down' ? 3 : 0;
  if (q === 'bar') p.poly([[hx - g, gy - 1.6], [hx + g, gy - 1.6], [hx + g, gy + 1.6], [hx - g, gy + 1.6]], s.hilt, { ...METAL, bevel: 1.3, ink: true });
  else for (const sd of [-1, 1]) p.rod(hx, gy, hx + sd * g, gy + dy, 2, 1.3, s.hilt, { ...METAL, ink: true });
  for (const sd of [-1, 1]) p.ball(hx + sd * g, gy + dy, 1.9, 1.9, s.hilt, METAL);
  p.ball(hx, gy, 2.6, 2.4, s.gem ?? s.hilt, { ...METAL, ink: true });
  if (s.bow) {
    const pts: Pt[] = [];
    for (let k = 0; k <= 8; k++) { const t = k / 8, u = 1 - t; pts.push([u * u * (hx - g) + 2 * u * t * (hx - g - 3) + t * t * (hx - 1), u * u * gy + 2 * u * t * (gripB - 1) + t * t * (pomY + 1)]); }
    for (let k = 1; k < pts.length; k++) p.rod(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], 1, 1, s.hilt, METAL);
  }
  p.ball(hx, pomY, 3, 3, s.hilt, { ...METAL, ink: true });
}

/* ---------- axes ---------- */

interface Axe { head: number; reach: number; double?: boolean; spike?: boolean; poll?: boolean; trim?: Ramp }

function axe(p: Painter, a: Axe): void {
  const cx = a.double ? p.w / 2 : 36, top = 4, hy = top + 5 + a.head / 2;
  p.rod(cx, top + 3, cx, p.h - 5, 2.5, 2.2, R.wood);
  grain(p, R.wood, a.head);
  p.rod(cx, p.h - 22, cx, p.h - 9, 2.9, 2.7, R.leatherDark, {}, true);
  wrap(p, R.leatherDark);
  p.ball(cx, p.h - 5, 3, 2.6, a.trim ?? R.iron, { ...METAL, ink: true });
  for (const sd of a.double ? [-1, 1] : [-1]) {
    /** Distance of the cutting edge from the haft at height y: a shallow arc. */
    const edgeAt = (y: number): number => { const u = (y - hy) / (a.head / 2); return a.reach - 3 * u * u; };
    const pts: Pt[] = [[2, hy - 4.5]];
    for (let k = 1; k <= 6; k++) { const t = k / 6; pts.push([2 + (a.reach - 5) * t, hy - 4.5 - (a.head / 2 - 4.5) * t ** 1.8]); }
    for (let k = 0; k <= 10; k++) { const y = hy - a.head / 2 + a.head * k / 10; pts.push([edgeAt(y), y]); }
    for (let k = 6; k >= 1; k--) { const t = k / 6; pts.push([2 + (a.reach - 5) * t, hy + 4.5 + (a.head / 2 - 4.5) * t ** 1.5]); }
    pts.push([2, hy + 4.5]);
    p.poly(pts.map(([dx, y]) => [cx + sd * dx, y] as const), R.steel, {
      ...METAL, bevel: 1.2, ink: true,
      n: (x, y) => { const d = edgeAt(y) - Math.abs(x - cx); return d < 1.6 ? [-.55, -.6] : d < 3.4 ? [.5 * sd, .3] : [-.12, (y - hy) / a.head * .7]; },
    });
  }
  p.tex((x, y, t) => { const d = y - (x - cx) * .9 - hy + a.head * .18; return d >= 0 && d < 2.5 && Math.abs(x - cx) > 4 ? t + 1 : undefined; }, R.steel);
  if (a.poll) p.poly([[cx + 2, hy - 4], [cx + 8, hy - 3], [cx + 8, hy + 3], [cx + 2, hy + 4]], R.steel, { ...METAL, bevel: 1.2, ink: true });
  p.poly([[cx - 3.6, hy - 6], [cx + 3.6, hy - 6], [cx + 3.6, hy + 6], [cx - 3.6, hy + 6]], a.trim ?? R.iron, { ...METAL, bevel: 1.4, ink: true, n: x => [(x - cx) / 5, 0] });
  for (const y of [hy - 3.5, hy + 3.5]) p.set(cx, y, R.steel, 5);
  if (a.spike) p.poly([[cx - 2.5, top + 5], [cx, top - 3], [cx + 2.5, top + 5]], R.steel, { ...METAL, ink: true, n: x => [x < cx ? -.5 : .6, 0] });
  else p.ball(cx, top + 3, 2.6, 2.2, a.trim ?? R.iron, { ...METAL, ink: true });
}

/* ---------- clubs, maces, hammers ---------- */

/** A haft with a wrapped grip and a ring pommel, from `top` to the bottom of the icon. */
function haft(p: Painter, cx: number, top: number, ramp: Ramp, r = 2.1): void {
  p.rod(cx, top, cx, p.h - 6, r, r - .2, ramp);
  grain(p, ramp, top);
  p.rod(cx, p.h - 24, cx, p.h - 9, r + .5, r + .4, R.leather, {}, true);
  wrap(p, R.leather);
  p.ball(cx, p.h - 5, r + 1, r + .6, R.iron, { ...METAL, ink: true });
}

/** A ball studded with spikes: those on the rim are drawn as blades, those facing the viewer as glints. */
function spikedBall(p: Painter, cx: number, cy: number, r: number, spikes: number, len: number): void {
  for (let k = 0; k < spikes; k++) {
    const a = k / spikes * Math.PI * 2 - Math.PI / 2, ux = Math.cos(a), uy = Math.sin(a);
    p.poly([[cx + ux * (r - 1) - uy * 2, cy + uy * (r - 1) + ux * 2], [cx + ux * (r + len), cy + uy * (r + len)], [cx + ux * (r - 1) + uy * 2, cy + uy * (r - 1) - ux * 2]], R.steel, { ...METAL, n: () => [ux * .5 - uy * .3, uy * .5 + ux * .3] });
  }
  p.ball(cx, cy, r, r, R.iron, { ...METAL, ink: true });
  for (const [dx, dy] of [[-.35, -.3], [.3, -.05], [-.1, .4], [-.55, .25], [.15, -.55]]) {
    const x = cx + dx * r, y = cy + dy * r;
    p.set(x, y, R.steel, 5); p.set(x + 1, y, R.steel, 3); p.set(x, y + 1, R.steel, 2); p.set(x + 1, y + 1, R.iron, 0);
  }
}

function club(p: Painter): void {
  const cx = p.w / 2;
  p.rod(cx, 9, cx, p.h - 26, 6.6, 3, R.wood);
  grain(p, R.wood, 3);
  for (const [x, y] of [[cx - 3, 8], [cx + 2.5, 13], [cx - 1.5, 19], [cx + 3, 24], [cx - 3.5, 28]]) p.ball(x, y, 1.7, 1.7, R.steel, { ...METAL, ink: true });
  p.rod(cx, p.h - 28, cx, p.h - 8, 2.9, 2.5, R.leatherDark, {}, true);
  wrap(p, R.leatherDark);
  p.ball(cx, p.h - 6, 3.2, 2.6, R.wood, { ink: true });
}

function mace(p: Painter): void {
  const cx = p.w / 2, hy = 15;
  haft(p, cx, 26, R.woodDark);
  p.rod(cx, 5, cx, 26, 3.4, 3, R.iron, METAL);
  for (const sd of [-1, 1]) {
    p.poly([[cx + sd * 2.5, hy - 9], [cx + sd * 8.5, hy - 5], [cx + sd * 9.5, hy + 1], [cx + sd * 2.5, hy + 9]], R.iron, { ...METAL, bevel: 1.3, ink: true, n: () => [sd * .4, -.1] });
    p.poly([[cx + sd * 1.5, hy - 10], [cx + sd * 5, hy - 6], [cx + sd * 5.6, hy + 2], [cx + sd * 1.5, hy + 10]], R.steel, { ...METAL, bevel: 1, ink: true, n: () => [sd * .25, -.15] });
  }
  p.poly([[cx - 1.5, hy - 11], [cx + 1.5, hy - 11], [cx + 2.5, hy + 10], [cx - 2.5, hy + 10]], R.steel, { ...METAL, ink: true, n: x => [x < cx ? -.6 : .5, 0] });
  p.ball(cx, 3.5, 2.4, 2.4, R.steel, { ...METAL, ink: true });
  p.poly([[cx - 3.5, 25], [cx + 3.5, 25], [cx + 3.5, 29], [cx - 3.5, 29]], R.iron, { ...METAL, bevel: 1.2, ink: true });
}

function morningStar(p: Painter): void {
  const cx = p.w / 2;
  haft(p, cx, 22, R.woodDark);
  p.poly([[cx - 3.2, 22], [cx + 3.2, 22], [cx + 3.2, 27], [cx - 3.2, 27]], R.iron, { ...METAL, bevel: 1.2, ink: true });
  spikedBall(p, cx, 13, 7.5, 8, 4.5);
}

function warHammer(p: Painter): void {
  const cx = p.w / 2 + 1, hy = 13;
  haft(p, cx, 16, R.woodDark);
  for (const sd of [-1, 1]) p.poly([[cx + sd * 1.2, 18], [cx + sd * 3, 18], [cx + sd * 3, 34], [cx + sd * 1.2, 36]], R.iron, { ...METAL, n: () => [sd * .5, 0] });
  p.poly([[cx + 3, hy - 3.5], [cx + 12, hy], [cx + 3, hy + 3.5]], R.steel, { ...METAL, n: (_x, y) => [.1, y < hy ? -.6 : .6] });
  p.poly([[cx - 9, hy - 5], [cx + 4, hy - 5], [cx + 4, hy + 5], [cx - 9, hy + 5]], R.steel, { ...METAL, bevel: 1.6, ink: true });
  p.poly([[cx - 12.5, hy - 6.5], [cx - 9, hy - 6.5], [cx - 9, hy + 6.5], [cx - 12.5, hy + 6.5]], R.steel, { ...METAL, bevel: 1.2, ink: true, n: () => [-.3, 0] });
  p.poly([[cx - 2.2, hy - 5], [cx, hy - 11], [cx + 2.2, hy - 5]], R.steel, { ...METAL, ink: true, n: x => [x < cx ? -.5 : .6, 0] });
  p.poly([[cx - 3.4, hy - 6], [cx + 3.4, hy - 6], [cx + 3.4, hy + 7], [cx - 3.4, hy + 7]], R.iron, { ...METAL, bevel: 1.3, ink: true });
}

function flail(p: Painter): void {
  const hx = 9, bx = 17.5, by = 12;
  p.rod(hx, 42, hx, p.h - 6, 2.3, 2.1, R.wood);
  grain(p, R.wood, 5);
  p.rod(hx, p.h - 26, hx, p.h - 9, 2.8, 2.6, R.leather, {}, true);
  wrap(p, R.leather);
  p.ball(hx, p.h - 5, 3, 2.6, R.iron, { ...METAL, ink: true });
  p.poly([[hx - 3, 38], [hx + 3, 38], [hx + 3, 45], [hx - 3, 45]], R.iron, { ...METAL, bevel: 1.3, ink: true });
  // chain: links along a sagging curve from the cap to the ball
  for (let k = 0; k <= 6; k++) {
    const t = k / 6, u = 1 - t, x = u * u * hx + 2 * u * t * (hx - 3) + t * t * (bx - 2), y = u * u * 37 + 2 * u * t * 24 + t * t * (by + 7);
    p.ball(x, y, k % 2 ? 1.5 : 2.1, k % 2 ? 2.1 : 1.5, R.steel, { ...METAL, ink: true });
    if (k % 2 === 0) p.set(x, y, R.iron, 0);
  }
  spikedBall(p, bx, by, 6.5, 8, 4);
}

function maul(p: Painter): void {
  const cx = p.w / 2, hy = 17;
  haft(p, cx, 26, R.wood, 2.9);
  p.poly([[cx - 19, hy - 11], [cx + 19, hy - 11], [cx + 19, hy + 11], [cx - 19, hy + 11]], R.iron, { ...METAL, bevel: 2.2, n: (_x, y) => [0, (y - hy) / 16] });
  for (const sd of [-1, 1]) {
    p.poly([[cx + sd * 19, hy - 12.5], [cx + sd * 24, hy - 12.5], [cx + sd * 24, hy + 12.5], [cx + sd * 19, hy + 12.5]], R.steel, { ...METAL, bevel: 1.6, ink: true, n: () => [sd * .3, 0] });
    p.poly([[cx + sd * 9, hy - 11.5], [cx + sd * 13, hy - 11.5], [cx + sd * 13, hy + 11.5], [cx + sd * 9, hy + 11.5]], R.steel, { ...METAL, bevel: 1.2, ink: true });
    for (const y of [hy - 7, hy, hy + 7]) { p.set(cx + sd * 11 - .5, y, R.steel, 5); p.set(cx + sd * 11 + .5, y + 1, R.iron, 0); }
  }
  p.poly([[cx - 4.5, hy - 12], [cx + 4.5, hy - 12], [cx + 4.5, hy + 13], [cx - 4.5, hy + 13]], R.steel, { ...METAL, bevel: 1.5, ink: true, n: x => [(x - cx) / 7, 0] });
  p.ball(cx, hy - 12, 2.6, 2, R.steel, { ...METAL, ink: true });
}

/* ---------- staves ---------- */

type StaffTop = 'knob' | 'ferrule' | 'bands' | 'capped' | 'iron';
function staff(p: Painter, top: StaffTop): void {
  const cx = p.w / 2, y0 = 9, y1 = p.h - 5;
  const wood = top === 'knob' ? R.brown : top === 'capped' || top === 'iron' ? R.woodDark : R.wood;
  // a gnarled staff wanders; the others are turned straight
  const xAt = (y: number): number => cx + (top === 'knob' ? Math.sin(y * .075) * 1.1 + Math.sin(y * .21) * .35 : 0);
  const r = top === 'knob' ? 2.7 : 2.3;
  for (let y = y0; y < y1; y += 2) p.rod(xAt(y), y, xAt(y + 2), y + 2, r, r - (top === 'knob' ? (y - y0) / (y1 - y0) * .6 : 0), wood);
  grain(p, wood, top.length);
  if (top === 'knob') {
    p.ball(xAt(y0) - .5, y0 - 2, 4.6, 4.4, wood, { ink: true });
    p.rod(xAt(y0) + 2, y0 - 3, xAt(y0) + 6.5, y0 - 7, 1.7, 1, wood);
    p.tex((x, y, t) => (y < y0 + 3 && ((x * 3 + y * 5) % 7 === 0) ? t - 1 : undefined), wood);
    for (const y of [38, 70]) p.ball(xAt(y) + 1.5, y, 1.6, 2, wood, { add: -1, ink: true });
  } else if (top === 'ferrule') {
    p.rod(cx, 5, cx, 16, 3, 3, R.steel, { ...METAL, ink: true }, true);
    p.ball(cx, 5, 3, 2.4, R.steel, METAL);
    p.rod(cx, y1 - 8, cx, y1, 2.8, 2.2, R.steel, { ...METAL, ink: true });
    p.rod(cx, 46, cx, 66, 2.9, 2.9, R.leather, {}, true);
    wrap(p, R.leather);
  } else if (top === 'bands') {
    for (let y = 16; y < y1 - 8; y += 18) {
      p.rod(cx, y, cx, y + 8, 2.6, 2.6, R.bone, {}, true);
      for (const by of [y - 1, y + 8]) p.rod(cx, by, cx, by + 1.6, 3.1, 3.1, R.gold, { ...METAL, ink: true }, true);
    }
    p.ball(cx, 6, 4, 4, R.bronze, { ...METAL, ink: true });
    p.rod(cx, y1 - 5, cx, y1, 2.8, 2, R.bronze, { ...METAL, ink: true });
  } else if (top === 'capped') {
    for (const [a, b] of [[4, 20], [y1 - 15, y1 + 1]]) {
      p.rod(cx, a, cx, b, 3.1, 3.1, R.iron, { ...METAL, ink: true }, true);
      for (const y of [a + 3, b - 4]) { p.set(cx - 1, y, R.steel, 5); p.set(cx, y + 1, R.iron, 0); }
    }
    p.ball(cx, 4, 3.1, 2, R.iron, METAL);
    for (const y of [40, 56, 72]) p.rod(cx, y, cx, y + 1.6, 2.9, 2.9, R.iron, { ...METAL, ink: true }, true);
  } else {
    p.rod(cx, 10, cx, 30, 3, 2.8, R.iron, { ...METAL, ink: true }, true);
    for (const sd of [-1, 1]) p.poly([[cx + sd * 2.5, 9], [cx + sd * 8.5, 13], [cx + sd * 8.5, 18], [cx + sd * 2.5, 24]], R.steel, { ...METAL, bevel: 1.2, ink: true, n: () => [sd * .35, -.1] });
    p.poly([[cx - 2.4, 10], [cx, 1], [cx + 2.4, 10]], R.steel, { ...METAL, ink: true, n: x => [x < cx ? -.5 : .6, 0] });
    for (const y of [30, 52, 74]) p.rod(cx, y, cx, y + 2, 3, 3, R.gold, { ...METAL, ink: true }, true);
    p.poly([[cx - 2.6, y1 - 8], [cx + 2.6, y1 - 8], [cx, y1 + 3]], R.steel, { ...METAL, ink: true, n: x => [x < cx ? -.5 : .6, 0] });
  }
}

/* ---------- bows ---------- */

interface Bow { half: number; bend: number; r?: number; recurve?: boolean; wood: Ramp; tips?: Ramp; bands?: Ramp; grip?: Ramp }

function bow(p: Painter, b: Bow): void {
  const mid = p.h / 2, r = b.r ?? 2.5, sx = Math.round(p.w / 2 - (b.bend + r) / 2) + .5;
  /** Limb position: a parabola; a recurve's tips curl back past the string line. */
  const xAt = (t: number): number => sx + b.bend * (1 - t * t) + (b.recurve && Math.abs(t) > .8 ? ((Math.abs(t) - .8) / .2) ** 2 * 4.5 : 0);
  const rAt = (t: number): number => r - (r - 1.1) * Math.abs(t) ** 1.4;
  // string first, so the limbs overlap its ends
  const tx = xAt(1), n = Math.round(b.half);
  for (let y = Math.round(mid - b.half + 1); y <= mid + b.half - 1; y++) p.set(tx - .5, y, R.paper, (y & 3) === 0 ? 3 : 4);
  for (let k = -n; k < n; k++) {
    const t0 = k / n, t1 = (k + 1) / n;
    p.rod(xAt(t0), mid + t0 * b.half, xAt(t1), mid + t1 * b.half, rAt(t0), rAt(t1), b.wood);
  }
  grain(p, b.wood, b.half);
  if (b.bands) for (const t of [-.62, -.34, .34, .62]) p.rod(xAt(t), mid + t * b.half - 1, xAt(t), mid + t * b.half + 1, rAt(t) + .7, rAt(t) + .7, b.bands, { ...METAL, ink: true }, true);
  for (const sd of [-1, 1]) p.ball(xAt(sd) + (b.recurve ? .5 : 0), mid + sd * b.half, 1.8, 1.8, b.tips ?? b.wood, { ...METAL, ink: true });
  const grip = b.grip ?? R.leather;
  p.rod(xAt(0), mid - 7, xAt(0), mid + 7, r + .7, r + .7, grip, { ink: true }, true);
  wrap(p, grip);
  p.poly([[xAt(0) - r - 3, mid - 2], [xAt(0) - r, mid - 2.5], [xAt(0) - r, mid - .5]], grip, { flat: 1 });
}

export const WEAPON_DRAW = {
  dagger: p => sword(p, { bw: 5, tip: 16, guard: 6, grip: 9, hilt: R.steel }),
  short_sword: p => sword(p, { bw: 6, guard: 8, grip: 10, hilt: R.bronze }),
  sabre: p => sword(p, { bw: 4.6, curve: 6, edge: 'single', tip: 16, guard: 5, grip: 10, hilt: R.gold, bow: true, wrap: R.leatherDark }),
  falchion: p => sword(p, { bw: 6, flare: 2.2, edge: 'clip', tip: 15, guard: 8, grip: 10, hilt: R.steel, wrap: R.leatherDark }),
  scimitar: p => sword(p, { bw: 5, flare: 1.6, curve: 8, edge: 'single', tip: 18, guard: 7, quillons: 'down', grip: 10, hilt: R.gold, wrap: R.red, gem: R.ruby }),
  long_sword: p => sword(p, { bw: 5.6, tip: 13, guard: 10, grip: 12, hilt: R.steel, fuller: true }),
  broad_sword: p => sword(p, { bw: 9, tip: 13, fuller: true, guard: 11, grip: 11, hilt: R.bronze, wrap: R.leatherDark }),
  bastard_sword: p => sword(p, { bw: 7, tip: 15, fuller: true, guard: 12, quillons: 'up', grip: 17, hilt: R.gold, wrap: R.blue }),
  great_sword: p => sword(p, { bw: 11, tip: 18, fuller: true, guard: 20, quillons: 'down', grip: 18, hilt: R.gold, wrap: R.red, gem: R.sapphire }),
  small_axe: p => axe(p, { head: 22, reach: 15 }),
  axe: p => axe(p, { head: 27, reach: 17 }),
  large_axe: p => axe(p, { head: 33, reach: 19, poll: true }),
  broad_axe: p => axe(p, { head: 42, reach: 21, poll: true, trim: R.bronze }),
  battle_axe: p => axe(p, { head: 30, reach: 19, double: true }),
  great_axe: p => axe(p, { head: 40, reach: 23, double: true, spike: true, trim: R.gold }),
  club, mace, morning_star: morningStar, war_hammer: warHammer, flail, maul,
  short_staff: p => staff(p, 'knob'), long_staff: p => staff(p, 'ferrule'), composite_staff: p => staff(p, 'bands'),
  quarter_staff: p => staff(p, 'capped'), war_staff: p => staff(p, 'iron'),
  short_bow: p => bow(p, { half: 30, bend: 13, wood: R.woodLight }),
  hunters_bow: p => bow(p, { half: 33, bend: 13, wood: R.wood, bands: R.leatherDark, grip: R.leatherDark }),
  long_bow: p => bow(p, { half: 38.5, bend: 11, wood: R.woodLight, tips: R.bone }),
  composite_bow: p => bow(p, { half: 30, bend: 16, recurve: true, wood: R.bone, bands: R.woodDark, tips: R.bone, grip: R.leatherDark }),
  short_battle_bow: p => bow(p, { half: 31, bend: 16, recurve: true, r: 2.8, wood: R.wood, bands: R.steel, tips: R.steel }),
  long_battle_bow: p => bow(p, { half: 38, bend: 15, recurve: true, r: 2.8, wood: R.woodDark, bands: R.steel, tips: R.steel }),
  short_war_bow: p => bow(p, { half: 31, bend: 17, recurve: true, r: 3.1, wood: R.iron, bands: R.gold, tips: R.gold, grip: R.red }),
  long_war_bow: p => bow(p, { half: 38, bend: 16, recurve: true, r: 3.1, wood: R.woodDark, bands: R.gold, tips: R.gold, grip: R.red }),
} satisfies Partial<Record<BaseId, Draw>>;
