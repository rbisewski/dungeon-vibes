/** Pixel-art D1-style globe: dark glass, liquid filled to `frac`, rim outline and a glass glint. */

export const ORB_PX = 26;

export interface OrbColors { dark: string; base: string; light: string; empty: string }
export const LIFE_ORB: OrbColors = { dark: '#5a0a0a', base: '#a01818', light: '#e04a3a', empty: '#1a0c0c' };
export const MANA_ORB: OrbColors = { dark: '#0c1a5a', base: '#1c3aa8', light: '#4a7aff', empty: '#0a0c18' };

export function drawOrb(g: CanvasRenderingContext2D, frac: number, c: OrbColors): void {
  const S = ORB_PX, cx = S / 2 - .5, cy = S / 2 - .5, r = S / 2 - .5;
  g.clearRect(0, 0, S, S);
  // Liquid surface row: frac 1 fills to the top of the globe, 0 leaves it empty.
  const top = Math.round(cy + r - frac * 2 * r);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d > r) continue;
    let col: string;
    if (d > r - 1.2) col = '#120c0a';
    else if (y < top) col = c.empty;
    else if (y === top) col = c.light;
    else col = d > r - 3.5 || y > cy + r * .6 ? c.dark : c.base;
    g.fillStyle = col;
    g.fillRect(x, y, 1, 1);
  }
  // glass glint
  g.fillStyle = 'rgba(255,255,255,.55)';
  for (const [x, y] of [[7, 5], [8, 5], [6, 6], [5, 7], [5, 8]] as const) g.fillRect(x, y, 1, 1);
  g.fillStyle = 'rgba(255,255,255,.25)';
  for (const [x, y] of [[9, 4], [10, 4], [4, 9], [4, 10]] as const) g.fillRect(x, y, 1, 1);
}
