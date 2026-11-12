import { mkC } from '../../render/canvas';

/** One character per pixel; '.' (or any unmapped char) is transparent. */
export const PAL: Record<string, string> = {
  k: '#120c0a', R: '#c8382c', r: '#8a2018', w: '#ffd9a0', d: '#3a2622', Y: '#e0b040', y: '#9a7020',
  W: '#d8d0b8', g: '#8a8478', P: '#d04060', B: '#6aa0ff',
};

export interface PixImage { src: string; w: number; h: number }

/** Rasterizes ASCII pixel rows into a data URL at 1 px per character. */
export function pixImage(rows: readonly string[]): PixImage {
  const h = rows.length, w = Math.max(...rows.map(r => r.length)), c = mkC(w, h), g = c.getContext('2d')!;
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const col = PAL[ch];
    if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
  }));
  return { src: c.toDataURL(), w, h };
}
