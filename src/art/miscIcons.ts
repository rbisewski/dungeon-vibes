/** Potion, elixir, scroll, book, spell and skill icons at 28 px per inventory cell (SPEC §10.3). */
import { GEM, METAL, Painter, R, type Pt, type Ramp } from './painter';
import type { Attr } from '../rules/classes';
import type { PotionId } from '../rules/potions';
import type { SkillId } from '../rules/skills';
import type { School, SpellId } from '../rules/spells';

/* ---------- potions and elixirs (28 × 28) ---------- */

/** Glass highlights over a filled flask: a bright streak on the lit side, a faint rim on the far side. */
function glassShine(p: Painter, cx: number, cy: number, r: number, liquid: Ramp): void {
  for (let k = 0; k < 5; k++) { const a = -2.5 + k * .16; p.set(cx + Math.cos(a) * r * .68, cy + Math.sin(a) * r * .68, R.glass, k === 1 || k === 2 ? 5 : 4); }
  for (let k = 0; k < 6; k++) { const a = .35 + k * .17; p.nudge(cx + Math.cos(a) * (r - 1.2), cy + Math.sin(a) * (r - 1.2), 2); }
  p.set(cx - r * .2, cy - r * .1, liquid, 5);
}

function potion(p: Painter, liquid: Ramp, shape: 'round' | 'cone', full: boolean): void {
  const cx = 14, r = full ? 9.6 : 8, cy = full ? 17.4 : 18.6, neckT = full ? 4 : 7;
  // neck and lip behind the body
  p.rod(cx, neckT, cx, cy - r + 3, 2.7, 2.9, R.glass, { spec: 1 }, true);
  if (shape === 'round') {
    p.ball(cx, cy, r, r, R.glass, { spec: 1.4, ink: true });
    p.shape(cx - r, cy - r * .45, cx + r, cy + r, (x, y) => { const dx = (x - cx) / (r - 1.3), dy = (y - cy) / (r - 1.3); return y > cy - r * .45 && dx * dx + dy * dy <= 1 ? [dx, dy] : null; }, liquid, GEM);
  } else {
    const flask: Pt[] = [[cx - 2.8, cy - r + 2], [cx + 2.8, cy - r + 2], [cx + r, cy + r - 3], [cx + r - 2, cy + r], [cx - r + 2, cy + r], [cx - r, cy + r - 3]];
    p.poly(flask, R.glass, { spec: 1.4, bevel: 2, ink: true });
    p.poly([[cx - 4.6, cy - 2], [cx + 4.6, cy - 2], [cx + r - 1.6, cy + r - 3.4], [cx + r - 3, cy + r - 1.4], [cx - r + 3, cy + r - 1.4], [cx - r + 1.6, cy + r - 3.4]], liquid, { ...GEM, bevel: 2.4, n: x => [(x - cx) / 12, .1] });
  }
  // meniscus and a couple of bubbles
  const top = cy - (shape === 'round' ? r * .45 : 2);
  for (let x = cx - r; x <= cx + r; x++) if (p.rampAt(x, top + 1) === liquid) p.set(x, top + 1, liquid, 5);
  p.set(cx + 2, cy + 2, liquid, 5); p.set(cx + 3.6, cy - .5, liquid, 4);
  glassShine(p, cx, cy, r, liquid);
  // stopper: cork, or gold for the full potions
  if (full) {
    p.rod(cx, neckT + 2.5, cx, neckT + 4.5, 3.9, 3.9, R.gold, { ...METAL, ink: true }, true);
    p.rod(cx, neckT - 2, cx, neckT + 1.5, 3.2, 3.2, R.gold, { ...METAL, ink: true }, true);
    p.ball(cx, neckT - 2.4, 2.2, 1.8, R.gold, { ...METAL, ink: true });
  } else {
    p.rod(cx, neckT + .2, cx, neckT + 1.6, 3.6, 3.6, R.glass, { spec: 1, ink: true }, true);
    p.rod(cx, neckT - 3.4, cx, neckT - .4, 2.6, 2.9, R.wood, { ink: true }, true);
  }
}

export const POTION_DRAW: Record<PotionId, (p: Painter) => void> = {
  heal: p => potion(p, R.ruby, 'round', false), fullHeal: p => potion(p, R.ruby, 'round', true),
  mana: p => potion(p, R.sapphire, 'round', false), fullMana: p => potion(p, R.sapphire, 'round', true),
  rejuv: p => potion(p, R.amethyst, 'cone', false), fullRejuv: p => potion(p, R.amethyst, 'cone', true),
};

const ELIXIR_RAMP: Record<Attr, Ramp> = { str: R.amber, int: R.sapphire, dex: R.topaz, vit: R.emerald };

/** A slender vial in a gold cage with a jewelled stopper. */
export function elixir(p: Painter, attr: Attr): void {
  const cx = 14, liquid = ELIXIR_RAMP[attr];
  p.rod(cx, 10, cx, 21.5, 4.6, 4.6, R.glass, { spec: 1.4 });
  p.rod(cx, 12.5, cx, 21.5, 3.3, 3.3, liquid, GEM);
  for (let x = cx - 4; x <= cx + 3; x++) if (p.rampAt(x, 12) === liquid) p.set(x, 12, liquid, 5);
  for (let y = 9; y < 21; y++) p.set(cx - 3, y, R.glass, y < 14 ? 5 : 4);
  for (const y of [9, 23]) p.rod(cx, y, cx, y + 1.5, 5.2, 5.2, R.gold, { ...METAL, ink: true }, true);
  for (const sd of [-1, 1]) for (let y = 11; y < 23; y++) p.set(cx + sd * 4.6 - .5, y, R.gold, sd < 0 ? 5 : 2);
  p.rod(cx, 5, cx, 8.4, 2.4, 3, R.gold, { ...METAL, ink: true }, true);
  p.ball(cx, 3.6, 2.6, 2.6, liquid, { ...GEM, ink: true });
  p.set(cx - 1, 2.6, liquid, 5);
  p.rod(cx, 25, cx, 25.6, 3.4, 3.4, R.gold, { ...METAL, ink: true }, true);
}

/* ---------- spell glyphs (28 × 28) ---------- */

/** A flame rooted at (cx, base): nested teardrops from dark red at the rim to a pale core. */
function flame(p: Painter, cx: number, base: number, h: number, w: number, lean = 0): void {
  for (const [s, tone] of [[1, 1], [.78, 2], [.56, 3], [.36, 4], [.18, 5]] as const) {
    const hh = h * s, ww = w * s;
    p.shape(cx - w - Math.abs(lean), base - hh, cx + w + Math.abs(lean), base, (x, y) => {
      const t = (base - y) / hh;
      if (t < 0 || t > 1) return null;
      const half = ww * (1 - t) ** 1.15 * (.5 + 1.45 * Math.sqrt(t)), c = cx + lean * t * t + Math.sin(t * 7 + cx) * .7 * s * t;
      return Math.abs(x - c) <= half ? [0, 0] : null;
    }, R.fire, { flat: tone });
  }
}

/** A lightning bolt through `pts`: a blue sheath around a white core. */
function bolt(p: Painter, pts: readonly Pt[], w = 2): void {
  for (const [r, tone] of [[w, 2], [w * .6, 4], [w * .28, 5]] as const) {
    for (let k = 1; k < pts.length; k++) {
      const t0 = (k - 1) / (pts.length - 1), t1 = k / (pts.length - 1);
      p.rod(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], Math.max(.45, r * (1 - t0 * .55)), Math.max(.45, r * (1 - t1 * .55)), R.bolt, { flat: tone });
    }
  }
}

/** A four-pointed sparkle. */
function sparkle(p: Painter, x: number, y: number, r: number, ramp: Ramp): void {
  for (let k = 1; k <= r; k++) for (const [dx, dy] of [[k, 0], [-k, 0], [0, k], [0, -k]]) p.set(x + dx, y + dy, ramp, k === r ? 3 : 4);
  p.set(x, y, ramp, 5);
}

const at = (ox: number, oy: number, pts: readonly Pt[]): Pt[] => pts.map(([x, y]) => [ox + x, oy + y] as const);

/** Draws a spell's glyph with its top-left corner at (ox, oy). */
export function glyph(p: Painter, id: SpellId, ox = 0, oy = 0): void {
  const cx = ox + 14, cy = oy + 14;
  switch (id) {
    case 'firebolt':
      // a burning dart flying up and to the right
      for (const [r, tone] of [[4.6, 1], [3.5, 2], [2.5, 3], [1.5, 4]] as const) p.rod(ox + 19, oy + 8.5, ox + 5, oy + 23, r, .4, R.fire, { flat: tone });
      p.ball(ox + 19, oy + 8.5, 4.2, 4.2, R.fire, { add: 1, lo: 3 });
      p.set(ox + 18, oy + 7, R.fire, 5); p.set(ox + 9, oy + 14, R.fire, 3); p.set(ox + 14, oy + 22, R.fire, 2); p.set(ox + 4, oy + 17, R.fire, 3);
      break;
    case 'fireball':
      for (const [x, y, r] of [[5, 24, 3.2], [3.5, 17, 2.6], [11, 25.5, 2.6]] as const) for (const [s, tone] of [[1, 1], [.6, 3]] as const) p.rod(ox + 15, oy + 13, ox + x, oy + y, 5 * s, r * s * .2, R.fire, { flat: tone });
      p.ball(ox + 16, oy + 11.5, 8.6, 8.6, R.fire, { flat: 1 });
      p.ball(ox + 16, oy + 11.5, 7.4, 7.4, R.fire, { lo: 2, add: 1, spec: 1 });
      p.ball(ox + 14.4, oy + 9.6, 3, 3, R.fire, { flat: 5 });
      break;
    case 'inferno':
      flame(p, ox + 6.5, oy + 26, 15, 5.5, -1.5); flame(p, ox + 21.5, oy + 26, 17, 5.5, 1.5); flame(p, ox + 14, oy + 27, 25.5, 8);
      break;
    case 'fire_wall':
      for (const [x, h] of [[4.5, 15], [23.5, 14], [10.5, 20], [17.5, 22]] as const) flame(p, ox + x, oy + 25, h, 4.6);
      p.rod(ox + 2.5, oy + 25.5, ox + 25.5, oy + 25.5, 1.6, 1.6, R.fire, { flat: 1 });
      for (let x = 3; x < 26; x += 3) p.set(ox + x, oy + 25, R.fire, 3);
      break;
    case 'charged_bolt':
      bolt(p, at(ox, oy, [[14, 14], [9, 11], [10, 7], [4, 3]]), 1.7);
      bolt(p, at(ox, oy, [[14, 14], [19, 12], [20, 16], [25, 15]]), 1.7);
      bolt(p, at(ox, oy, [[14, 14], [12, 19], [16, 21], [12, 26]]), 1.7);
      p.ball(cx, cy, 3.6, 3.6, R.bolt, { flat: 3 }); p.ball(cx, cy, 2.2, 2.2, R.bolt, { flat: 5 });
      break;
    case 'lightning':
      bolt(p, at(ox, oy, [[19, 1.5], [10, 12], [16.5, 13], [8, 26.5]]), 2.8);
      sparkle(p, ox + 22, oy + 20, 2, R.bolt);
      break;
    case 'chain_lightning':
      bolt(p, at(ox, oy, [[13, 1.5], [9, 9], [14.5, 11], [10, 19], [14, 20], [10.5, 26.5]]), 2.3);
      bolt(p, at(ox, oy, [[14.5, 11], [21, 14], [20, 19], [24.5, 24]]), 1.6);
      bolt(p, at(ox, oy, [[9, 9], [4, 12], [5, 16], [2.5, 19]]), 1.5);
      break;
    case 'holy_bolt':
      // a radiant star: long vertical and horizontal rays, short diagonals
      for (const [dx, dy, len] of [[0, -1, 13], [0, 1, 13], [-1, 0, 10], [1, 0, 10], [-.7, -.7, 6.5], [.7, -.7, 6.5], [-.7, .7, 6.5], [.7, .7, 6.5]] as const) {
        p.rod(cx, cy, cx + dx * len, cy + dy * len, 2.6, .4, R.holy, { flat: 2 });
        p.rod(cx, cy, cx + dx * len * .8, cy + dy * len * .8, 1.5, .3, R.holy, { flat: 4 });
      }
      p.ball(cx, cy, 4.4, 4.4, R.holy, { flat: 4 }); p.ball(cx, cy, 2.8, 2.8, R.holy, { flat: 5 });
      break;
    case 'healing': {
      // a heart, lit like a gem, with a white cross of light on it
      const heart = (s: number) => (x: number, y: number) => { const u = (x - cx) / (9.6 * s), v = -(y - cy - 1) / (9.6 * s) + .15, f = u * u + v * v - 1; return f * f * f - u * u * v * v * v < 0 ? [u * .9, -v * .7] as const : null; };
      p.shape(ox, oy, ox + 28, oy + 28, heart(1.12), R.ruby, { flat: 1 });
      p.shape(ox, oy, ox + 28, oy + 28, heart(1), R.ruby, { ...GEM, lo: 2 });
      p.rod(cx - 4.5, cy - 4, cx - 2.5, cy - 5.5, 1.5, 1, R.ruby, { flat: 5 });
      for (let k = -3; k <= 3; k++) { p.set(cx + k, cy + 1.5, R.holy, Math.abs(k) > 2 ? 4 : 5); p.set(cx, cy + 1.5 + k, R.holy, Math.abs(k) > 2 ? 4 : 5); }
      break;
    }
    case 'mana_shield':
      // a hollow sphere of blue force: bright at the rim, clear in the middle
      p.shape(ox, oy, ox + 28, oy + 28, (x, y) => { const d = Math.hypot(x - cx, y - cy) / 12.5; return d <= 1 ? [0, 0] : null; }, R.sapphire, { flat: 1 });
      p.tex((x, y, t) => {
        if (x < ox || y < oy || x >= ox + 28 || y >= oy + 28) return;
        const d = Math.hypot(x + .5 - cx, y + .5 - cy) / 12.5, lit = (cx - x) + (cy - y) > 0;
        return d > .93 ? (lit ? 5 : 3) : d > .8 ? (lit ? 4 : 2) : d > .62 ? 2 : t;
      }, R.sapphire);
      for (let k = 0; k < 7; k++) { const a = -2.75 + k * .13; p.set(cx + Math.cos(a) * 8.6, cy + Math.sin(a) * 8.6, R.sapphire, 5); }
      sparkle(p, cx, cy, 3, R.bolt);
      break;
    case 'flash':
      for (let k = 0; k < 12; k++) {
        const a = k / 12 * Math.PI * 2, len = k % 2 ? 8 : 13;
        p.rod(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len, k % 2 ? 1.6 : 2.3, .35, R.amethyst, { flat: k % 2 ? 3 : 4 });
      }
      p.ball(cx, cy, 5.4, 5.4, R.amethyst, { flat: 5 }); p.ball(cx, cy, 3.6, 3.6, R.holy, { flat: 5 });
      break;
    case 'stone_curse':
      // a stone face: heavy brow, hollow eyes, cracked
      p.ball(cx, cy + .5, 10.5, 12, R.stone, { spec: .4 });
      p.rod(cx - 7, cy - 3.5, cx + 7, cy - 3.5, 2, 2, R.stone, { add: 1, ink: true });
      for (const sd of [-1, 1]) { p.ball(cx + sd * 4.2, cy - .4, 2.5, 2, R.stone, { flat: 0 }); p.set(cx + sd * 4.2 - .5, cy - .4, R.emerald, 4); }
      p.poly([[cx - 1.6, cy - 1], [cx + 1.6, cy - 1], [cx + 2.4, cy + 4.5], [cx - 2.4, cy + 4.5]], R.stone, { bevel: 1.2, ink: true, add: 1 });
      p.rod(cx - 4, cy + 8, cx + 4, cy + 8, 1.1, 1.1, R.stone, { flat: 0 });
      for (const [x, y] of [[-6, -11], [-5, -9], [-6, -7], [-4, -6], [7, 5], [6, 7], [7, 9], [5, 10]]) p.set(cx + x, cy + y, R.stone, 0);
      break;
    case 'telekinesis':
      // an open hand reaching up, sparks leaping from the fingertips
      for (const [x, top] of [[-5.5, 9], [-2, 6], [1.6, 6.5], [5, 9.5]] as const) p.rod(cx + x, oy + 17, cx + x * 1.1, oy + top, 1.8, 1.6, R.skin, { ink: true });
      p.rod(cx - 7, oy + 19.5, cx - 11, oy + 14.5, 2, 1.6, R.skin, { ink: true });
      p.poly([[cx - 7.4, oy + 15], [cx + 6.8, oy + 15], [cx + 6, oy + 24], [cx + 2, oy + 27], [cx - 4, oy + 27], [cx - 7.6, oy + 23]], R.skin, { bevel: 2, ink: true });
      for (const [x, y] of [[-3, 20], [1, 19], [-1, 22.5]]) p.nudge(cx + x, oy + y, -1);
      for (const [x, y, r] of [[-6, 4, 2], [5.5, 4, 2], [-0.5, 1.5, 1], [10, 9, 1], [-11, 9, 1]] as const) sparkle(p, cx + x, oy + y, r, R.emerald);
      break;
    case 'phasing':
      // a swirl closing on a bright centre
      for (let k = 0; k < 150; k++) {
        const t = k / 150, a = t * Math.PI * 4.6 + 1, r = 12.5 * (1 - t) ** .9 + .6;
        p.ball(cx + Math.cos(a) * r, cy + Math.sin(a) * r, .6 + 1.5 * (1 - t), .6 + 1.5 * (1 - t), R.amethyst, { flat: t < .25 ? 2 : t < .55 ? 3 : t < .8 ? 4 : 5 });
      }
      p.ball(cx, cy, 2.2, 2.2, R.holy, { flat: 5 });
      break;
    case 'town_portal':
      // a standing oval of blue light with a swirl inside
      p.ball(cx, cy, 9.6, 13, R.bolt, { flat: 1 });
      p.tex((x, y, t) => {
        if (x < ox || y < oy || x >= ox + 28 || y >= oy + 28) return;
        const dx = (x + .5 - cx) / 9.6, dy = (y + .5 - cy) / 13, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx) + d * 5;
        return d > .86 ? 5 : d > .72 ? 3 : Math.sin(a * 2) > .45 ? (d < .3 ? 5 : 4) : d < .3 ? 3 : t;
      }, R.bolt);
      sparkle(p, ox + 3, oy + 6, 1, R.bolt); sparkle(p, ox + 25, oy + 22, 1, R.bolt); sparkle(p, ox + 24, oy + 4, 2, R.bolt);
      break;
    case 'identify':
      // a magnifying glass
      p.rod(ox + 16.5, oy + 16.5, ox + 24, oy + 24, 2.4, 2.8, R.wood, {});
      p.rod(ox + 15.5, oy + 15.5, ox + 17.5, oy + 17.5, 2.9, 2.9, R.gold, { ...METAL, ink: true }, true);
      p.ball(ox + 10.5, oy + 10.5, 9.4, 9.4, R.gold, { ...METAL, ink: true }, .9);
      p.ball(ox + 10.5, oy + 10.5, 7, 7, R.glass, { lo: 2, hi: 4, ink: true }, .5);
      for (let k = 0; k < 6; k++) { const a = -2.6 + k * .17; p.set(ox + 10.5 + Math.cos(a) * 4.6, oy + 10.5 + Math.sin(a) * 4.6, R.glass, 5); }
      p.set(ox + 13, oy + 13.5, R.glass, 5); p.set(ox + 14, oy + 12.5, R.glass, 5);
      break;
  }
}

/* ---------- scrolls and books ---------- */

/** Colour ramp per spell school (SPEC §10.3): fire red, lightning blue, magic purple, holy white, utility green. */
const SCHOOL: Record<School, Ramp> = { fire: R.red, lightning: R.blue, magic: R.purple, holy: R.bone, utility: R.green };

/** A parchment scroll, part unrolled, tied with a ribbon and sealed with wax in the school's colour. */
export function scroll(p: Painter, school: School): void {
  const c = SCHOOL[school];
  p.poly([[6, 6], [22, 6], [21.4, 22], [6.6, 22]], R.paper, { n: x => [(x - 14) / 14, 0], add: 0 });
  for (let y = 9; y < 20; y += 2.6) for (let x = 8.5; x < 20; x++) if ((x * 7 + y * 3) % 5 > 1) p.set(x, y, R.paper, 1);
  for (const y of [5, 23]) {
    p.rod(4, y, 24, y, 2.7, 2.7, R.paper, { ink: true });
    for (const sd of [-1, 1]) { p.ball(14 + sd * 10.6, y, 1.6, 2.6, R.paper, { add: -2, ink: true }); p.set(14 + sd * 10.6 - .5, y - .5, R.paper, 4); }
  }
  p.rod(13, 21, 13, 25.6, 1.6, 1.6, c, { ink: true }, true);
  p.ball(18.5, 19.5, 3.6, 3.6, c, { spec: 1, ink: true });
  p.set(17.5, 18.5, c, 5); p.set(19, 20, c, 1); p.set(18, 20, c, 1);
}

/** A leather-bound tome in the school's colour, with gilt corners, a clasp, and the spell's glyph on the cover. */
export function book(p: Painter, id: SpellId, school: School): void {
  const c = SCHOOL[school];
  // back cover and the page block showing at the right and bottom
  p.poly([[11, 8], [50, 8], [50, 53], [11, 53]], c, { flat: 1 });
  p.poly([[11, 7], [48.5, 7], [48.5, 51.5], [11, 51.5]], R.paper, { add: -1 });
  p.tex((x, y, t) => (x > 46 && (y & 1) ? t - 1 : y > 49 && (x & 1) ? t - 1 : undefined), R.paper);
  // front cover, spine with raised bands
  p.poly([[9, 4], [46.5, 4], [46.5, 49.5], [9, 49.5]], c, { bevel: 1.6, ink: true });
  p.rod(8.5, 5.5, 8.5, 48, 3.2, 3.2, c, { ink: true });
  for (const y of [11, 26, 41]) p.rod(8.5, y, 8.5, y + 1.6, 3.7, 3.7, R.gold, { ...METAL, ink: true }, true);
  // tooled border and the plate for the glyph
  for (let k = 14; k <= 43; k++) { for (const y of [8, 45]) p.set(k, y, R.gold, k % 3 === 0 ? 5 : 3); }
  for (let k = 9; k <= 44; k++) { for (const x of [14, 43]) p.set(x, k, R.gold, k % 3 === 0 ? 5 : 3); }
  p.poly([[16, 12], [42, 12], [42, 42], [16, 42]], c, { flat: 0 });
  p.poly([[17, 13], [41, 13], [41, 41], [17, 41]], c, { flat: 1 });
  glyph(p, id, 15, 13);
  for (const [x, y, sx, sy] of [[9, 4, 1, 1], [46.5, 4, -1, 1], [9, 49.5, 1, -1], [46.5, 49.5, -1, -1]] as const) p.poly([[x, y], [x + sx * 7, y], [x, y + sy * 7]], R.gold, { ...METAL, bevel: 1.2, ink: true });
  // clasp
  p.poly([[44, 24.5], [51, 24.5], [51, 29.5], [44, 29.5]], R.gold, { ...METAL, bevel: 1.2, ink: true });
  p.set(47, 26.5, R.gold, 0);
}

/* ---------- class skills (28 × 28) ---------- */

export const SKILL_DRAW: Record<SkillId, (p: Painter) => void> = {
  // a war horn with the blast leaving its mouth
  war_cry: p => {
    const pts: Pt[] = [];
    for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push([3 + 13 * t + 2 * Math.sin(t * 3), 23 - 15 * t * t - 3 * t]); }
    for (let k = 1; k < pts.length; k++) p.rod(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], .9 + (k - 1) * .38, .9 + k * .38, R.bone, {});
    p.ball(17.2, 5.6, 5, 5.4, R.gold, { ...METAL, ink: true }, .8);
    p.ball(17.6, 5.4, 3.2, 3.6, R.woodDark, { flat: 0 });
    for (const k of [3, 6]) p.rod(pts[k][0] - 1.6, pts[k][1] - 1.2, pts[k][0] + 1.6, pts[k][1] + 1.2, 1.2, 1.2, R.gold, { ...METAL, ink: true });
    p.ball(3, 23.5, 1.6, 1.6, R.gold, { ...METAL, ink: true });
    for (const [r, tone] of [[8, 4], [11.5, 3], [15, 2]] as const) for (let a = -.95; a <= .55; a += .06) p.set(17 + Math.cos(a) * r, 6 + Math.sin(a) * r, R.fire, tone);
  },
  // floor spikes, with a thief's pick wedged across them
  disarm: p => {
    p.poly([[2, 21], [26, 21], [27, 26], [1, 26]], R.iron, { ...METAL, bevel: 1.4 });
    for (const x of [6, 14, 22]) p.poly([[x - 3, 21.5], [x, 7], [x + 3, 21.5]], R.steel, { ...METAL, ink: true, n: px => [px < x ? -.55 : .6, 0] });
    p.rod(3, 5, 22, 17, 1.5, 1.2, R.bronze, { ...METAL, ink: true });
    p.rod(22, 17, 25.5, 15.5, 1.2, .9, R.bronze, { ...METAL });
    p.rod(2.5, 4.5, 6, 7, 2.6, 2.4, R.green, { ink: true });
  },
  // a drop of blood becoming a drop of mana
  mana_surge: p => {
    const drop = (cx: number, ramp: Ramp): void => {
      p.shape(cx - 6, 4, cx + 6, 25, (x, y) => { const t = (y - 5) / 19; if (t < 0 || t > 1) return null; const half = 5.6 * Math.sin(Math.PI * t ** 1.7) ** .8, dx = (x - cx) / Math.max(.5, half); return Math.abs(dx) <= 1 ? [dx * .9, (t - .6) * 1.2] : null; }, ramp, GEM);
      p.set(cx - 2, 15, ramp, 5); p.set(cx - 2, 16, ramp, 5);
    };
    drop(7.5, R.ruby); drop(20.5, R.sapphire);
    for (let x = 11; x <= 16; x++) p.set(x, 13.5, R.holy, 5);
    for (const d of [1, 2]) { p.set(16 - d, 13.5 - d, R.holy, 5); p.set(16 - d, 13.5 + d, R.holy, 5); }
  },
};
