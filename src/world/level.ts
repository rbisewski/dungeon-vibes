import * as THREE from 'three';
import { monsterTypeFor, spawnMonster } from '../actors/monsters';
import { pick, rr } from '../core/math';
import { G } from '../game/state';
import type { Level, Monster, MonsterType } from '../game/types';
import { mergeBuckets, resetBuckets } from '../render/buckets';
import { camTarget } from '../render/cameraRig';
import { makeFlames } from '../render/flames';
import { fxAdd, fxNorm } from '../render/particles';
import { ambient, scene } from '../render/renderer';
import { toast } from '../ui/store';
import { T } from './consts';
import { decorate } from './decorate';
import { buildFloor, buildWalls, type Tint } from './floorWalls';
import { generateLayout } from './layout';
import { computeField, navOK } from './nav';
import { makeDoor } from './objects';

const levelRoot = new THREE.Group();
scene.add(levelRoot);

/** Per-depth floor/wall colour tints, cycling. */
const TINTS: Tint[] = [{ r: 1, g: .96, b: .9 }, { r: .9, g: .98, b: .88 }, { r: .88, g: .92, b: 1.02 }, { r: 1.02, g: .9, b: .86 }];

function disposeLevel(L: Level): void {
  levelRoot.remove(L.group);
  L.disposeGeo.forEach(g => g.dispose()); L.disposeInst.forEach(i => i.dispose());
  L.disposeMat.forEach(m => m.dispose());
  L.monsters.forEach(m => m.mats.forEach(x => x.dispose()));
  if (L.flameMesh) { L.flameMesh.geometry.dispose(); L.flameMesh.dispose(); }
  L.debris.length = 0; fxAdd.clear(); fxNorm.clear();
}

/** Replaces the current level with a freshly generated one at `depth` and places the hero and monsters. */
export function buildLevel(depth: number): void {
  if (G.L) disposeLevel(G.L);
  resetBuckets();
  const lay = generateLayout();
  const group = new THREE.Group();
  const lc = lay.lockedCell, sr = lay.stairsRoom;
  const lockedDoor = makeDoor({ roomId: lay.roomId, W: lay.W, group }, lc.tx, lc.tz, lc.axis, true);
  const L: Level = {
    ...lay, depth, group,
    navBlock: new Uint8Array(lay.N), trap: new Int16Array(lay.N).fill(-1), propAt: new Array(lay.N).fill(null), dist: new Float64Array(lay.N),
    traps: [], doors: [], chests: [], monsters: [], pickups: [], debris: [], decals: [], lights: [], flames: [], pillars: [], runes: [], moons: [],
    disposeGeo: [], disposeInst: [], disposeMat: [], locked: true, fieldT: 0, quietT: 0, killsHere: 0,
    startIdx: lay.startRoom.cy * lay.W + lay.startRoom.cx,
    stairs: { tx: sr.cx, tz: sr.cy, x: sr.cx * T, z: sr.cy * T },
    lockedDoor,
    flameMesh: null,
  };
  G.L = L;
  levelRoot.add(L.group);
  const tint = TINTS[(depth - 1) % TINTS.length];
  decorate();
  buildFloor(tint); buildWalls(tint); mergeBuckets();
  L.flameMesh = makeFlames(L.flames); L.group.add(L.flameMesh);
  ambient.intensity = Math.max(1.6, 2.2 - depth * .03);
  // hero placement
  const hero = G.hero;
  hero.x = L.startRoom.cx * T; hero.z = L.startRoom.cy * T; hero.vx = hero.vz = hero.kx = hero.kz = 0; hero.key = false;
  hero.path = null; hero.goal = null; hero.dead = false; hero.descend = 0;
  hero.root.position.set(hero.x, 0, hero.z); hero.body.rotation.set(0, 0, 0); hero.body.position.set(0, 0, 0);
  hero.root.visible = true;
  computeField();
  // monsters
  const occupied = new Set([L.startIdx]);
  const placeIn = (cands: [number, number][], type: MonsterType): Monster | null => {
    for (let k = 0; k < 20; k++) {
      const [x, z] = pick(cands); const i = z * L.W + x;
      if (!navOK(i) || occupied.has(i) || L.tiles[i] === 6 || L.trap[i] >= 0) continue;
      occupied.add(i);
      return spawnMonster(type, x * T + rr(-.3, .3), z * T + rr(-.3, .3));
    }
    return null;
  };
  for (const r of L.rooms) {
    const cells: [number, number][] = [];
    for (let z = r.y; z < r.y + r.h; z++) for (let x = r.x; x < r.x + r.w; x++) if (Math.abs(x - L.startRoom.cx) + Math.abs(z - L.startRoom.cy) > 2) cells.push([x, z]);
    if (!cells.length) continue;
    let n = r === L.startRoom ? 1 : Math.min(4, 1 + Math.floor(r.w * r.h / 12) + (depth > 3 ? 1 : 0));
    if (r === L.stairsRoom) {
      n = 2;
      if (depth % 3 === 0) {
        const b = placeIn(cells.filter(([x, z]) => Math.abs(x - L.stairs.tx) + Math.abs(z - L.stairs.tz) >= 2), 'boss');
        if (b) b.home = { x: L.stairs.x, z: L.stairs.z };
      }
    }
    for (let k = 0; k < n; k++) placeIn(cells, r === L.startRoom ? 'rat' : monsterTypeFor(depth));
  }
  const corr: [number, number][] = [];
  for (let z = 0; z < L.H; z++) for (let x = 0; x < L.W; x++) if (L.tiles[z * L.W + x] === 2) corr.push([x, z]);
  const nc = Math.floor(corr.length / 7);
  for (let k = 0; k < nc; k++) placeIn(corr, monsterTypeFor(depth));
  camTarget.set(hero.x, 0, hero.z);
  toast(`DEPTH ${depth}`, depth % 3 === 0 ? 'A WARDEN GUARDS THE STAIRS' : depth === 1 ? 'THE DESCENT BEGINS' : 'DEEPER INTO THE DARK');
}
