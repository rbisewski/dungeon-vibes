/**
 * Boss arena dressing in the stairs room (SPEC §9): blood and hanging corpses for the Gorger, webs for the Brood
 * Mother, three ember rune circles (its teleport points) for the Ember Lich.
 */
import * as THREE from 'three';
import { PI, R, TAU, rr } from '../core/math';
import { G } from '../game/state';
import { gCircle, gCyl, gPlane, gSph } from '../render/geometry';
import { S } from '../render/buckets';
import { runeMat } from '../render/materials';
import type { BossId } from '../rules/bosses';
import { T, WALL_H } from './consts';
import { propCobweb } from './props';

/** Floor cells of the stairs room at least 2 steps from the stairs. */
function arenaCells(): [number, number][] {
  const r = G.L.stairsRoom, s = G.L.stairs, W = G.L.W;
  return r.cells.map((c): [number, number] => [c % W, (c / W) | 0]).filter(([x, z]) => Math.abs(x - s.tx) + Math.abs(z - s.tz) >= 2);
}

/** Whether (x, z) is outside the stairs room's floor: a wall, or beyond a cut corner. */
const off = (x: number, z: number): boolean => G.L.roomId[z * G.L.W + x] !== G.L.stairsRoom.id;

/** Static dressing; runs before the level's static geometry is merged. */
export function dressArena(id: BossId): void {
  const cells = arenaCells();
  if (!cells.length) return;
  const at = (): [number, number] => cells[Math.floor(R() * cells.length)];
  if (id === 'gorger') {
    for (let k = 0; k < 9; k++) { const [x, z] = at(); S('blood', gCircle(1), x * T + rr(-.5, .5), .016, z * T + rr(-.5, .5), R() * TAU, -PI / 2, 0, rr(.4, 1), rr(.3, .7), 1); }
    // corpses hang from chains along the room's edge
    const edge = cells.filter(([x, z]) => off(x - 1, z) || off(x + 1, z) || off(x, z - 1) || off(x, z + 1));
    for (let k = 0; k < 3 && edge.length; k++) {
      const [cx, cz] = edge.splice(Math.floor(R() * edge.length), 1)[0], x = cx * T + rr(-.3, .3), z = cz * T + rr(-.3, .3);
      const bottom = rr(1.5, 1.9), len = WALL_H - bottom - 1, ry = R() * TAU;
      S('iron', gCyl(.02, .02, len, 4), x, WALL_H - len / 2, z);
      S('flesh', gCyl(.15, .11, .85, 7), x, bottom + .5, z, ry, rr(-.08, .08));
      S('flesh', gSph(.11, 7, 5), x, bottom + .02, z, ry);
      S('blood', gCircle(1), x, .017, z, ry, -PI / 2, 0, .45, .4, 1);
    }
  } else if (id === 'broodmother') {
    // a web in each inner corner: a floor cell with the room's edge on two sides
    for (const [sx, sz, ry] of [[-1, -1, PI / 4], [1, -1, -PI / 4], [-1, 1, PI * .75], [1, 1, -PI * .75]]) {
      const c = cells.find(([x, z]) => off(x + sx, z) && off(x, z + sz));
      if (c) propCobweb(c[0] * T + sx * .45, c[1] * T + sz * .45, ry);
    }
    for (let k = 0; k < 5; k++) { const [x, z] = at(); S('web', gPlane(2.2, 2.2), x * T + rr(-.4, .4), .02, z * T + rr(-.4, .4), R() * TAU, -PI / 2); }
  } else if (id === 'lich') {
    // three rune circles, far apart: the cells farthest from each other greedily
    const pts: [number, number][] = [];
    const far = (x: number, z: number): number => Math.min(...pts.map(p => Math.hypot(p[0] - x, p[1] - z)), Math.hypot(x - G.L.stairs.tx, z - G.L.stairs.tz) * 1.5);
    const inner = cells.filter(([x, z]) => !off(x - 1, z) && !off(x + 1, z) && !off(x, z - 1) && !off(x, z + 1));
    const pool = inner.length >= 3 ? inner : cells;
    for (let k = 0; k < 3; k++) pts.push(pool.reduce((a, b) => (far(b[0], b[1]) > far(a[0], a[1]) ? b : a)));
    const mat = runeMat.clone(); mat.color.setHex(0xff5a18); G.L.disposeMat.push(mat);
    for (const [px, pz] of pts) {
      const x = px * T, z = pz * T, m = new THREE.Mesh(gPlane(1.7, 1.7), mat);
      m.rotation.x = -PI / 2; m.position.set(x, .03, z); G.L.group.add(m); G.L.runes.push(m);
      G.L.lights.push({ x, y: 1.1, z, base: 6, cold: false, seed: R() * 100, pulse: true, d: 0 });
      G.L.bossRunes.push({ x, z });
    }
  }
}
