/**
 * The UI's pixel-art chrome (D1-inspired): a gold frame with an ornamental band top and bottom, cracked dark stone
 * for panel fills, the red sigil that marks a selected menu entry, and the paper-doll silhouette. Each is painted
 * once and published as a CSS custom property (`--frame`, `--stone`, `--sigil`, `--doll`) for style.css.
 */
import { mkC } from '../../render/canvas';

type Ctx = CanvasRenderingContext2D;
const px = (g: Ctx, x: number, y: number, c: string): void => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };

const K = '#0a0706', HI = '#e8c070', MID = '#a8823a', LO = '#5e4416', INNER = '#7a5c22';

/**
 * 9-slice frame, 24 × 24: corners 6 wide and 9 tall; the top and bottom edges carry a diamond chain (period 6, two
 * periods per tile so `repeat` tiles it without stretching). Used with `border-image-slice: 9 6`.
 */
function paintFrame(): HTMLCanvasElement {
  const W = 24, H = 24, c = mkC(W, H), g = c.getContext('2d')!;
  // sides (and the outer rings of the bands): outline, bevelled gold, outline, a thin inner gold line
  for (let y = 0; y < H; y++) {
    px(g, 0, y, K); px(g, 1, y, HI); px(g, 2, y, MID); px(g, 3, y, K); px(g, 4, y, INNER);
    px(g, W - 1, y, K); px(g, W - 2, y, LO); px(g, W - 3, y, MID); px(g, W - 4, y, K); px(g, W - 5, y, INNER);
  }
  for (let x = 0; x < W; x++) {
    for (const [y, top] of [[0, true], [H - 1, false]] as const) {
      px(g, x, y, K);
      px(g, x, top ? 1 : H - 2, top ? HI : LO);
      px(g, x, top ? 2 : H - 3, MID);
      for (let r = 3; r <= 7; r++) px(g, x, top ? r : H - 1 - r, K);
      px(g, x, top ? 8 : H - 9, INNER);
    }
  }
  // the diamond chain in the bands (rows 4–6 from the outer edge), with a dot between diamonds
  for (let x = 0; x < W; x++) {
    const p = x % 6;
    for (const top of [true, false]) {
      const row = (r: number) => (top ? r : H - 1 - r);
      if (p === 2) { px(g, x, row(4), MID); px(g, x, row(6), LO); }
      if (p === 1) px(g, x, row(5), HI);
      if (p === 3) px(g, x, row(5), MID);
      if (p === 5) px(g, x, row(5), LO);
    }
  }
  // the side lines run on through the bands to the outer rings
  for (let y = 0; y < H; y++) { px(g, 0, y, K); px(g, W - 1, y, K); }
  for (let y = 3; y < H - 3; y++) { px(g, 1, y, HI); px(g, 2, y, MID); px(g, W - 2, y, LO); px(g, W - 3, y, MID); }
  // corner bosses: a gold stud with a highlight in each corner
  for (const [cx, cy] of [[1, 3], [W - 6, 3], [1, H - 8], [W - 6, H - 8]] as const) {
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
      const edge = x === 0 || y === 0 || x === 4 || y === 4;
      px(g, cx + x, cy + y, edge ? K : x + y < 4 ? HI : x + y > 5 ? LO : MID);
    }
  }
  return c;
}

/** Tiny seeded generator (the UI art must not touch the game's random stream). */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** Cracked flagstones, dark and cool, tileable: slabs with seams, per-slab tint, cracks and grit. */
function paintStone(): HTMLCanvasElement {
  const S = 96, c = mkC(S, S), g = c.getContext('2d')!, R = rng(7);
  const img = g.createImageData(S, S), d = img.data;
  // slabs: a jittered grid of cells, each pixel belongs to the nearest seed (wrapping), seams where two meet
  const seeds: [number, number, number][] = [];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) seeds.push([(i + .2 + R() * .6) * S / 4, (j + .2 + R() * .6) * S / 4, .82 + R() * .3]);
  const near = (x: number, y: number) => {
    let a = 1e9, b = 1e9, ia = 0;
    seeds.forEach(([sx, sy], i) => {
      const dx = Math.min(Math.abs(x - sx), S - Math.abs(x - sx)), dy = Math.min(Math.abs(y - sy), S - Math.abs(y - sy)), q = Math.hypot(dx, dy);
      if (q < a) { b = a; a = q; ia = i; } else if (q < b) b = q;
    });
    return { ia, edge: b - a };
  };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const { ia, edge } = near(x, y), t = seeds[ia][2], n = (R() - .5) * 10;
    let v = 40 * t + n;
    if (edge < 1.2) v = 18; else if (edge < 2.2) v = 30 * t;
    const i = (y * S + x) * 4;
    d[i] = v * 1.02; d[i + 1] = v * .97; d[i + 2] = v * .9; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // cracks: short random walks, dark with a lit pixel beside
  for (let k = 0; k < 9; k++) {
    let x = R() * S, y = R() * S, a = R() * Math.PI * 2;
    for (let s = 0; s < 10 + R() * 14; s++) {
      a += (R() - .5) * .9; x = (x + Math.cos(a) + S) % S; y = (y + Math.sin(a) + S) % S;
      px(g, Math.floor(x), Math.floor(y), '#141110');
      px(g, Math.floor(x + 1) % S, Math.floor(y + 1) % S, '#3c362f');
    }
  }
  return c;
}

/** The selection sigil: a red ring with a five-pointed star, drawn with whole pixels. */
function paintSigil(): HTMLCanvasElement {
  const S = 13, c = mkC(S, S), g = c.getContext('2d')!, cx = 6, cy = 6;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const r = Math.hypot(x - cx, y - cy);
    if (r > 5.3 && r < 6.4) px(g, x, y, '#b01c10');
  }
  const pts = [0, 1, 2, 3, 4].map(i => { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; return [cx + Math.cos(a) * 5, cy + Math.sin(a) * 5]; });
  const line = (a: number[], b: number[]) => {
    const n = Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) * 2);
    for (let i = 0; i <= n; i++) px(g, Math.round(a[0] + (b[0] - a[0]) * i / n), Math.round(a[1] + (b[1] - a[1]) * i / n), '#e8401c');
  };
  for (let i = 0; i < 5; i++) line(pts[i], pts[(i + 2) % 5]);
  return c;
}

/** The paper doll's dark silhouette (58 × 35, drawn behind the equipment slots at 5×). */
function paintDoll(): HTMLCanvasElement {
  const W = 58, H = 35, c = mkC(W, H), g = c.getContext('2d')!;
  g.fillStyle = 'rgba(0,0,0,.62)';
  const ell = (cx: number, cy: number, rx: number, ry: number) => {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) g.fillRect(x, y, 1, 1);
    }
  };
  ell(29, 5, 4.5, 5.5);                                        // head
  g.fillRect(27, 10, 4, 3);                                    // neck
  for (let y = 12; y < 35; y++) {                              // torso: broad shoulders tapering to the hips
    const half = y < 15 ? 13 - (15 - y) * 1.5 : 13 - (y - 15) * .32;
    g.fillRect(Math.round(29 - half), y, Math.round(half * 2), 1);
  }
  for (const s of [-1, 1]) for (let y = 14; y < 33; y++) {    // arms hanging beside the torso
    const x = 29 + s * (15 + (y - 14) * .18);
    g.fillRect(Math.round(x - 3), y, 6, 1);
  }
  return c;
}

const url = (c: HTMLCanvasElement) => `url(${c.toDataURL()})`;
const root = document.documentElement.style;
root.setProperty('--frame', url(paintFrame()));
root.setProperty('--stone', url(paintStone()));
root.setProperty('--sigil', url(paintSigil()));
root.setProperty('--doll', url(paintDoll()));
