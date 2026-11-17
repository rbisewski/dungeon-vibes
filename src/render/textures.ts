import * as THREE from 'three';
import { PI, R, TAU, ri, rr } from '../core/math';
import { mkC } from './canvas';

function ctex(c: HTMLCanvasElement, srgb = true, rep = true): THREE.CanvasTexture { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; }
function speckle(g: CanvasRenderingContext2D, w: number, h: number, n: number, a: number) { for (let i = 0; i < n; i++) { const v = R() < .5 ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},${R() * a})`; g.fillRect(R() * w | 0, R() * h | 0, 1 + (R() * 2 | 0), 1 + (R() * 2 | 0)); } }
function crack(g: CanvasRenderingContext2D, x: number, y: number, n: number, w: number) { g.strokeStyle = 'rgba(8,6,5,.75)'; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); let a = R() * TAU; for (let i = 0; i < n; i++) { a += rr(-.8, .8); x += Math.cos(a) * rr(4, 9); y += Math.sin(a) * rr(4, 9); g.lineTo(x, y); } g.stroke(); }
function texWall() {
  const S = 256, c = mkC(S, S), g = c.getContext('2d')!;
  g.fillStyle = '#151413'; g.fillRect(0, 0, S, S);
  const rows = 4, rh = S / rows;
  for (let r = 0; r < rows; r++) {
    let x = -rr(0, 60);
    while (x < S) {
      const w = rr(46, 92), v = ri(70, 112), warm = ri(0, 9);
      for (const ox of [-S, 0, S]) {
        const bx = x + ox, by = r * rh, m = 3;
        g.fillStyle = `rgb(${v + warm},${v + (warm >> 1)},${v - 7})`;
        g.beginPath(); g.moveTo(bx + m + rr(0, 3), by + m + rr(0, 2)); g.lineTo(bx + w - m - rr(0, 3), by + m + rr(0, 2)); g.lineTo(bx + w - m - rr(0, 2), by + rh - m - rr(0, 3)); g.lineTo(bx + m + rr(0, 2), by + rh - m - rr(0, 3)); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,235,210,.09)'; g.fillRect(bx + m + 2, by + m + 1, w - 2 * m - 4, 3);
        g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(bx + m + 1, by + rh - m - 4, w - 2 * m - 2, 3);
        for (let k = 0; k < 4; k++) { g.fillStyle = `rgba(${R() < .5 ? 0 : 60},${R() < .5 ? 0 : 50},0,${R() * .12})`; g.beginPath(); g.arc(bx + rr(8, w - 8), by + rr(8, rh - 8), rr(4, 14), 0, TAU); g.fill(); }
      }
      x += w;
    }
  }
  speckle(g, S, S, 6000, .16);
  for (let i = 0; i < 6; i++) crack(g, R() * S, R() * S, ri(4, 10), 1.2);
  for (let i = 0; i < 420; i++) { const x = R() * S, y = S - Math.pow(R(), 2.2) * 80; g.fillStyle = `rgba(${ri(35, 60)},${ri(66, 92)},${ri(28, 40)},${R() * .4})`; g.fillRect(x, y, ri(1, 4), ri(1, 4)); }
  return c;
}
function texFloor() {
  const S = 512, c = mkC(S, S), g = c.getContext('2d')!;
  g.fillStyle = '#100f0e'; g.fillRect(0, 0, S, S);
  const split = (x: number, y: number, w: number, h: number, d: number, out: number[][]): void => {
    if (d >= 3 || (d >= 1 && R() < .3) || w < 80 || h < 80) { out.push([x, y, w, h]); return; }
    if (w > h || (w === h && R() < .5)) { const s = Math.round(w * rr(.38, .62)); split(x, y, s, h, d + 1, out); split(x + s, y, w - s, h, d + 1, out); }
    else { const s = Math.round(h * rr(.38, .62)); split(x, y, w, s, d + 1, out); split(x, y + s, w, h - s, d + 1, out); }
  };
  for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) {
    const rects: number[][] = []; split(tx * 256, ty * 256, 256, 256, 0, rects);
    for (const [x, y, w, h] of rects) {
      const m = 4, v = ri(58, 92);
      g.fillStyle = `rgb(${v + 5},${v + 2},${v - 4})`;
      g.beginPath(); g.moveTo(x + m + rr(0, 4), y + m + rr(0, 4)); g.lineTo(x + w - m - rr(0, 4), y + m + rr(0, 4)); g.lineTo(x + w - m - rr(0, 4), y + h - m - rr(0, 4)); g.lineTo(x + m + rr(0, 4), y + h - m - rr(0, 4)); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,240,215,.07)'; g.fillRect(x + m + 2, y + m + 2, w - 2 * m - 4, 3);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + m + 2, y + h - m - 5, w - 2 * m - 4, 3);
      const gr = g.createRadialGradient(x + w / 2, y + h / 2, 2, x + w / 2, y + h / 2, Math.max(w, h) * .6);
      gr.addColorStop(0, 'rgba(255,240,220,.05)'); gr.addColorStop(1, 'rgba(0,0,0,.18)'); g.fillStyle = gr; g.fillRect(x, y, w, h);
      if (R() < .35) crack(g, x + rr(10, w - 10), y + rr(10, h - 10), ri(4, 9), 1.4);
      if (R() < .4) for (let k = 0; k < 90; k++) { const e = ri(0, 3); const px = e < 2 ? x + rr(0, w) : x + (e === 2 ? rr(0, 6) : w - rr(0, 6)); const py = e >= 2 ? y + rr(0, h) : y + (e === 0 ? rr(0, 6) : h - rr(0, 6)); g.fillStyle = `rgba(${ri(38, 58)},${ri(70, 96)},${ri(26, 38)},${rr(.3, .8)})`; g.fillRect(px, py, ri(1, 4), ri(1, 4)); }
    }
  }
  speckle(g, S, S, 9000, .14);
  return c;
}
/** Cave rock (SPEC §12.3): rough blocks of rock in rough strata, without mortar courses, cracked, darker than brick. */
function texRock() {
  const S = 256, c = mkC(S, S), g = c.getContext('2d')!;
  g.fillStyle = '#1a1714'; g.fillRect(0, 0, S, S);
  for (let y = 0; y < S;) {
    const bh = ri(26, 52);
    for (let x = -ri(0, 40); x < S;) {
      const bw = ri(34, 90), v = ri(48, 80), tilt = rr(-5, 5), hasCrack = R() < .5;
      const pts: [number, number][] = [
        [rr(2, 8), rr(2, 7) + tilt], [bw * rr(.4, .6), rr(0, 4)], [bw - rr(2, 8), rr(2, 7) - tilt], [bw - rr(0, 5), bh * rr(.4, .6)],
        [bw - rr(2, 8), bh - rr(2, 6) - tilt], [bw * rr(.4, .6), bh - rr(0, 4)], [rr(2, 8), bh - rr(2, 6) + tilt], [rr(0, 5), bh * rr(.4, .6)],
      ];
      const cx = rr(8, bw - 8), cy = rr(6, bh - 6), seed = R();
      // blocks crossing an edge are painted again one texture over, so the texture tiles
      for (const ox of x < 0 ? [x, x + S] : x + bw > S ? [x, x - S] : [x]) for (const oy of y + bh > S ? [y, y - S] : [y]) {
        g.fillStyle = `rgb(${v + 4},${v + 1},${v - 3})`;
        g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(ox + px, oy + py) : g.moveTo(ox + px, oy + py))); g.closePath(); g.fill();
        // a lit upper face and a shadowed underside on each block
        g.fillStyle = 'rgba(255,235,205,.06)'; g.fillRect(ox + 6, oy + 5, bw - 12, 4);
        g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(ox + 6, oy + bh - 9, bw - 12, 4);
        if (hasCrack) { g.strokeStyle = 'rgba(8,6,5,.75)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(ox + cx, oy + cy); g.lineTo(ox + cx + (seed - .5) * 20, oy + cy + 8); g.lineTo(ox + cx + (seed - .3) * 14, oy + cy + 16); g.stroke(); }
      }
      x += bw;
    }
    y += bh;
  }
  for (let k = 0; k < 160; k++) { g.fillStyle = `rgba(${ri(40, 60)},${ri(56, 80)},${ri(30, 42)},${rr(.2, .55)})`; g.fillRect(R() * S, R() * S, ri(1, 4), ri(1, 3)); }
  speckle(g, S, S, 7000, .18);
  return c;
}
/** Cave floor (SPEC §12.3): packed earth with gravel, pebbles and the odd flat stone. */
function texEarth() {
  const S = 256, c = mkC(S, S), g = c.getContext('2d')!;
  g.fillStyle = '#3a3128'; g.fillRect(0, 0, S, S);
  for (let k = 0; k < 60; k++) {
    const x = R() * S, y = R() * S, r = rr(14, 40), gr = g.createRadialGradient(x, y, 1, x, y, r), v = ri(-14, 14);
    gr.addColorStop(0, `rgba(${62 + v},${52 + v},${42 + v},.55)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  for (let k = 0; k < 9; k++) {
    const x = R() * S, y = R() * S, rw = rr(10, 22), rh = rw * rr(.5, .8), v = ri(70, 96);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x + 2, y + 3, rw, rh, R() * PI, 0, TAU); g.fill();
    g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.beginPath(); g.ellipse(x, y, rw, rh, R() * PI, 0, TAU); g.fill();
  }
  for (let k = 0; k < 700; k++) { const v = ri(50, 110), s = rr(1, 3.2); g.fillStyle = `rgba(${v},${v - 6},${v - 12},${rr(.5, .9)})`; g.beginPath(); g.ellipse(R() * S, R() * S, s, s * rr(.6, 1), R() * PI, 0, TAU); g.fill(); }
  speckle(g, S, S, 9000, .16);
  return c;
}
function texWood() {
  const S = 128, c = mkC(S, S), g = c.getContext('2d')!;
  g.fillStyle = '#3a2616'; g.fillRect(0, 0, S, S);
  const pw = S / 4;
  for (let p = 0; p < 4; p++) {
    const v = ri(70, 100); g.fillStyle = `rgb(${v},${v * .66 | 0},${v * .4 | 0})`; g.fillRect(p * pw + 1, 0, pw - 2, S);
    for (let k = 0; k < 9; k++) { g.strokeStyle = `rgba(30,18,8,${rr(.2, .5)})`; g.lineWidth = 1; g.beginPath(); const x0 = p * pw + rr(3, pw - 3); for (let y = 0; y <= S; y += 8) g.lineTo(x0 + Math.sin(y * .08 + k) * 1.5, y); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(p * pw, 0, 2, S);
  }
  speckle(g, S, S, 900, .15);
  return c;
}
function texWeb() {
  const S = 128, c = mkC(S, S), g = c.getContext('2d')!;
  g.strokeStyle = 'rgba(230,230,240,.85)'; g.lineWidth = 1;
  const ax = 64, ay = 0, spokes: number[] = [];
  for (let i = 0; i <= 8; i++) { const a = PI * .08 + i / 8 * PI * .84; spokes.push(a); g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + Math.cos(a) * 130, ay + Math.sin(a) * 130); g.stroke(); }
  for (let r = 14; r < 120; r += rr(9, 15)) { g.beginPath(); spokes.forEach((a, i) => { const rj = r + rr(-3, 3); const x = ax + Math.cos(a) * rj, y = ay + Math.sin(a) * rj; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
  return c;
}
function texRune() {
  const S = 256, c = mkC(S, S), g = c.getContext('2d')!;
  g.strokeStyle = '#fff'; g.lineCap = 'round';
  g.lineWidth = 4; g.beginPath(); g.arc(128, 128, 118, 0, TAU); g.stroke();
  g.lineWidth = 2.5; g.beginPath(); g.arc(128, 128, 96, 0, TAU); g.stroke();
  g.beginPath(); g.arc(128, 128, 40, 0, TAU); g.stroke();
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; g.save(); g.translate(128 + Math.cos(a) * 107, 128 + Math.sin(a) * 107); g.rotate(a + PI / 2); g.lineWidth = 2; g.beginPath(); for (let k = 0; k < 3; k++) { g.moveTo(rr(-6, 6), rr(-7, 7)); g.lineTo(rr(-6, 6), rr(-7, 7)); } g.stroke(); g.restore(); }
  g.lineWidth = 2.5; g.beginPath(); for (let i = 0; i <= 5; i++) { const a = -PI / 2 + i * (TAU * 2 / 5); const x = 128 + Math.cos(a) * 92, y = 128 + Math.sin(a) * 92; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  return c;
}
function texGrate() {
  const S = 128, c = mkC(S, S), g = c.getContext('2d')!;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const x = 14 + i * 26, y = 14 + j * 26; const gr = g.createRadialGradient(x + 10, y + 10, 2, x + 10, y + 10, 18); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - 8, y - 8, 36, 36); }
  return c;
}
function texGlow() { const S = 64, c = mkC(S, S), g = c.getContext('2d')!; const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); return c; }
function texBanner() {
  const c = mkC(64, 128), g = c.getContext('2d')!;
  g.fillStyle = '#4e1915'; g.fillRect(0, 0, 64, 128);
  g.strokeStyle = '#2a0c0a'; g.lineWidth = 6; g.strokeRect(3, -4, 58, 128);
  g.strokeStyle = '#8a7040'; g.lineWidth = 2; g.strokeRect(8, 4, 48, 104);
  g.fillStyle = '#9a8048'; g.beginPath(); g.arc(32, 46, 12, 0, TAU); g.fill(); g.fillRect(25, 52, 14, 9);
  g.fillStyle = '#3a100e'; g.fillRect(26, 42, 5, 5); g.fillRect(33, 42, 5, 5); g.fillRect(28, 56, 2, 5); g.fillRect(32, 56, 2, 5);
  g.strokeStyle = '#9a8048'; g.lineWidth = 3; g.beginPath(); g.moveTo(14, 72); g.lineTo(50, 96); g.moveTo(50, 72); g.lineTo(14, 96); g.stroke();
  speckle(g, 64, 128, 700, .2);
  g.globalCompositeOperation = 'destination-out';
  g.beginPath(); g.moveTo(0, 128); for (let x = 0; x <= 64; x += 8) g.lineTo(x, 112 + (x / 8 % 2 ? 14 : 0) - rr(0, 5)); g.lineTo(64, 128); g.closePath(); g.fill();
  return c;
}
/**
 * Floor roughness (read from the green channel): mostly dry, rough stone with smoother damp patches and wet seams
 * between flagstones.
 */
function texFloorRough() {
  const S = 256, c = mkC(S, S), g = c.getContext('2d')!;
  g.fillStyle = 'rgb(240,240,240)'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 34; i++) {
    const x = R() * S, y = R() * S, r = rr(10, 34), gr = g.createRadialGradient(x, y, 1, x, y, r), v = ri(120, 180);
    gr.addColorStop(0, `rgba(${v},${v},${v},.9)`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * rr(.5, 1), R() * PI, 0, TAU); g.fill();
  }
  speckle(g, S, S, 2500, .2);
  return c;
}
/** Night grass: dark green with blades, clover tufts and bare earth patches (the town, SPEC §13). */
function texGrass() {
  const S = 256, c = mkC(S, S), g = c.getContext('2d')!;
  g.fillStyle = '#1c2a16'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(${ri(40, 60)},${ri(34, 44)},${ri(22, 30)},${rr(.25, .5)})`; g.beginPath(); g.ellipse(R() * S, R() * S, rr(10, 30), rr(6, 18), R() * PI, 0, TAU); g.fill(); }
  for (let i = 0; i < 5200; i++) {
    const x = R() * S, y = R() * S, h = rr(2, 6);
    g.strokeStyle = `rgba(${ri(36, 70)},${ri(66, 110)},${ri(28, 46)},${rr(.4, .9)})`; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + rr(-1.5, 1.5), y - h); g.stroke();
  }
  speckle(g, S, S, 1600, .12);
  return c;
}
/** Lime plaster with stains, for house walls between timber beams. */
function texPlaster() {
  const S = 128, c = mkC(S, S), g = c.getContext('2d')!;
  g.fillStyle = '#8a8070'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${ri(60, 90)},${ri(55, 80)},${ri(45, 65)},${rr(.08, .2)})`; g.beginPath(); g.ellipse(R() * S, R() * S, rr(6, 20), rr(4, 14), 0, 0, TAU); g.fill(); }
  speckle(g, S, S, 2600, .14);
  return c;
}
/** Rows of overlapping wooden shingles for roofs. */
function texRoof() {
  const S = 128, c = mkC(S, S), g = c.getContext('2d')!;
  g.fillStyle = '#20140e'; g.fillRect(0, 0, S, S);
  const rh = 16;
  for (let r = 0; r < S / rh; r++) for (let x = (r % 2) * 8 - 8; x < S; x += 16) {
    const v = ri(48, 74); g.fillStyle = `rgb(${v},${v * .62 | 0},${v * .45 | 0})`;
    g.fillRect(x + 1, r * rh + 1, 14, rh - 3);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 1, r * rh + rh - 4, 14, 2);
  }
  speckle(g, S, S, 900, .15);
  return c;
}
/** The stone wall canvas, also used as the UI panel background. */
export const WALL_CANVAS = texWall();
export const TEX = {
  wall: ctex(WALL_CANVAS), floor: ctex(texFloor()), wood: ctex(texWood()), web: ctex(texWeb(), true, false),
  rune: ctex(texRune(), true, false), grate: ctex(texGrate(), true, false), glow: ctex(texGlow(), true, false), banner: ctex(texBanner(), true, false),
  grass: ctex(texGrass()), plaster: ctex(texPlaster()), roof: ctex(texRoof()), floorRough: ctex(texFloorRough(), false),
  rock: ctex(texRock()), earth: ctex(texEarth()),
};
