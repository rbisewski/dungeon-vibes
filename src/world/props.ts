import { buildSkeleton } from '../actors/models/skeleton';
import { PI, R, TAU, lerp, ri, rr } from '../core/math';
import { G } from '../game/state';
import { S } from '../render/buckets';
import { GEO, gBox, gCircle, gCyl, gDode, gPlane, gSph } from '../render/geometry';

export function propBarrel(x: number, z: number): void { S('wood', GEO.barrel, x, 0, z, R() * TAU); S('iron', gCyl(.385, .385, .05, 12), x, .18, z); S('iron', gCyl(.375, .375, .05, 12), x, .68, z); }
export function propCrate(x: number, z: number, s = .8): void { const ry = rr(-.4, .4); S('wood', gBox(s, s, s), x, s / 2, z, ry); S('iron', gBox(s + .02, .06, s + .02), x, s * .5, z, ry); if (R() < .4 && s > .6) { const s2 = .5; S('wood', gBox(s2, s2, s2), x + rr(-.1, .1), s + s2 / 2, z + rr(-.1, .1), ry + rr(-.5, .5)); } }
export function propRubble(x: number, z: number, n: number): void { for (let k = 0; k < n; k++) { const r = [.08, .12, .16, .2][ri(0, 3)]; S('stone', gDode(r), x + rr(-.75, .75), r * .45, z + rr(-.75, .75), R() * 3, R() * 3, 0, 1, .7, 1); } }
export function propBones(x: number, z: number): void {
  for (let k = 0; k < ri(2, 4); k++) S('bone', gCyl(.03, .025, .38, 5), x + rr(-.5, .5), .03, z + rr(-.5, .5), R() * TAU, PI / 2);
  if (R() < .6) S('bone', gSph(.11, 7, 6), x + rr(-.4, .4), .09, z + rr(-.4, .4), R() * TAU, rr(-.5, .5), 0, 1, .9, 1.1);
}
export function wallFace(fx: number, fz: number, nx: number, nz: number, kind: 'torch' | 'banner'): void {
  const ry = Math.atan2(nx, nz);
  if (kind === 'torch') {
    S('iron', gBox(.18, .32, .06), fx + nx * .03, 1.72, fz + nz * .03, ry);
    S('iron', gBox(.05, .05, .32), fx + nx * .18, 1.7, fz + nz * .18, ry);
    S('iron', gCyl(.075, .05, .1, 6), fx + nx * .33, 1.78, fz + nz * .33);
    S('wood', gCyl(.035, .03, .4, 6), fx + nx * .33, 1.94, fz + nz * .33);
    const p = { x: fx + nx * .33, y: 2.16, z: fz + nz * .33 };
    G.L.flames.push({ ...p, s: 1, seed: R() });
    G.L.lights.push({ x: p.x + nx * .25, y: p.y + .2, z: p.z + nz * .25, base: 16, cold: false, seed: R() * 100, d: 0 });
  } else if (kind === 'banner') {
    S('iron', gCyl(.025, .025, 1.05, 5), fx + nx * .08, 2.6, fz + nz * .08, ry, 0, PI / 2);
    S('banner', gPlane(.9, 1.7), fx + nx * .1, 1.75, fz + nz * .1, ry);
  }
}
export function propBrazier(x: number, z: number, big = 1): void {
  for (let k = 0; k < 3; k++) { const a = k / 3 * TAU; S('iron', gBox(.06, 1, .06), x + Math.cos(a) * .2, .48, z + Math.sin(a) * .2, -a, 0, .25); }
  S('iron', gCyl(.46, .26, .26, 10), x, 1.0, z);
  S('coal', gCyl(.4, .4, .05, 10), x, 1.1, z);
  G.L.flames.push({ x, y: 1.12, z, s: 1.9 * big, seed: R() });
  G.L.lights.push({ x, y: 1.8, z, base: 24 * big, cold: false, seed: R() * 100, d: 0 });
}
export function propPillar(x: number, z: number): void { G.L.pillars.push({ x, z }); }
export function propCobweb(cx: number, cz: number, ry: number): void { S('web', gPlane(1.7, 1.7), cx, 2.25, cz, ry, -.35); }
export function propBars(x0: number, z0: number, x1: number, z1: number): void {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / .24), ry = Math.atan2(-(z1 - z0), x1 - x0);
  for (let k = 0; k <= n; k++) { const t = k / n; S('iron', gCyl(.035, .035, 2.75, 5), lerp(x0, x1, t), 1.375, lerp(z0, z1, t)); }
  for (const y of [.12, 1.35, 2.7]) S('iron', gBox(len, .06, .07), (x0 + x1) / 2, y, (z0 + z1) / 2, ry);
}
export function propStairs(cx: number, cz: number): void {
  const n = 6, dz = 2 / n;
  for (let k = 0; k < n; k++) { const top = -(k + 1) * .34, h = 2.8 + top; S('stone', gBox(1.8, +h.toFixed(3), +dz.toFixed(3)), cx, (-2.8 + top) / 2, cz + 1 - dz * (k + .5)); }
  S('stone', gBox(.14, 2.8, 2), cx - .93, -1.4, cz); S('stone', gBox(.14, 2.8, 2), cx + .93, -1.4, cz); S('stone', gBox(2, 2.8, .14), cx, -1.4, cz - .93);
  S('dark', gBox(2, .05, 2), cx, -2.8, cz);
  S('stone', gBox(.22, .22, 2.2), cx - 1.0, .11, cz); S('stone', gBox(.22, .22, 2.2), cx + 1.0, .11, cz); S('stone', gBox(2.2, .22, .22), cx, .11, cz - 1.0);
}
export function propPuddle(x: number, z: number): void { S('puddle', gCircle(1), x, .015, z, R() * TAU, -PI / 2, 0, rr(.35, .8), rr(.3, .6), 1); }
export function sittingSkeleton(x: number, z: number, ry: number): void {
  const s = buildSkeleton(false); s.root.position.set(x, -.38, z); s.root.rotation.y = ry;
  s.legs.forEach(l => { l.hip.rotation.x = -1.4; l.knee.rotation.x = 1.3; });
  s.torso.rotation.x = -.25; s.head.rotation.set(.5, .3, .2); s.armL.rotation.x = -.3; s.armR.rotation.x = -.2; s.armR.rotation.z = -.3;
  s.weapon.visible = false; s.eyes.forEach(e => e.visible = false);
  G.L.group.add(s.root); G.L.disposeMat.push(...s.mats);
}
