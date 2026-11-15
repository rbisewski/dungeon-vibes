import * as THREE from 'three';
import { spawnMonster } from '../actors/monsters';
import { pickFamilies } from '../rules/monsters';
import { ELITE, ELITE_MODS, eliteName } from '../rules/elites';
import { bossFor, bossName } from '../rules/bosses';
import { dressArena } from './arenas';
import { applyLevel } from './levelDelta';
import { R, TAU, pick, ri, rr, withRng } from '../core/math';
import { deriveSeed, mulberry32 } from '../core/rng';
import { G } from '../game/state';
import type { Door, Exit, Layout, Level, Monster, MonsterType } from '../game/types';
import { mergeBuckets, resetBuckets } from '../render/buckets';
import { camTarget } from '../render/cameraRig';
import { makeFlames } from '../render/flames';
import { fxAdd, fxNorm } from '../render/particles';
import { ambient, scene, setOutdoor } from '../render/renderer';
import { POST } from '../render/post';
import { toast } from '../ui/store';
import { T } from './consts';
import { decorate } from './decorate';
import { buildFloor, buildWalls, type Tint } from './floorWalls';
import { generateLayout } from './layout';
import { circleBlocked, computeField, isStairs, navOK } from './nav';
import { makeDoor } from './objects';
import { buildTownTerrain, dressTown, portalObject, townLayout } from './town';
import { propUpStairs } from './props';

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

/** Seed of the level at `depth` in this run (SPEC §12.1). */
export const levelSeed = (depth: number): number => deriveSeed(G.runSeed, depth);

/**
 * Puts the hero at (x, z), by default the start room's centre (in town: the respawn point), standing and ready.
 * `onExit` is the exit the hero arrives standing on (a portal): it only works again after stepping off.
 */
export function placeHero(x = G.L.startRoom.cx * T, z = G.L.startRoom.cy * T, onExit: Exit | null = null): void {
  const hero = G.hero;
  hero.x = x; hero.z = z; hero.vx = hero.vz = hero.kx = hero.kz = 0;
  hero.onExit = onExit; hero.stairsT = 0; hero.root.scale.setScalar(1);
  hero.path = null; hero.goal = null; hero.dead = false; hero.descend = 0; hero.atkT = -1; hero.drink = 0; hero.flinch = 0;
  hero.slowT = 0; hero.poisonT = 0;
  // D1: Mana Shield ends when the level changes.
  hero.cast = null; hero.manaShield = false;
  hero.root.position.set(hero.x, 0, hero.z); hero.body.rotation.set(0, 0, 0); hero.body.position.set(0, 0, 0);
  hero.root.visible = true;
  camTarget.set(hero.x, 0, hero.z);
  computeField();
}

/**
 * Replaces the current level with the run's level at `depth`, places the hero and spawns the monsters. Everything
 * generated here draws from the level's seeded stream, so the same run and depth always give the same level; a level
 * visited before then gets its saved delta re-applied (SPEC §12.2).
 */
export function buildLevel(depth: number): void {
  if (G.L) disposeLevel(G.L);
  if (depth === 0) withRng(mulberry32(TOWN_SEED), generateTown);
  else withRng(mulberry32(levelSeed(depth)), () => generate(depth));
  const delta = G.levels[depth];
  if (delta) { applyLevel(delta); computeField(); }
  const boss = bossFor(depth);
  if (depth === 0) toast('THE TOWN', 'A MOMENT OF REST');
  else toast(`DEPTH ${depth}`, boss ? `${bossName(boss.id, boss.ascended)} guards the stairs`.toUpperCase() : depth === 1 ? 'THE DESCENT BEGINS' : 'DEEPER INTO THE DARK');
}

/** The town is the same on every run: its props draw from a fixed seed. */
const TOWN_SEED = 0x70a1;

function newLevel(lay: Layout, depth: number, lockedDoor: Door | null, group: THREE.Group): Level {
  const sr = lay.stairsRoom;
  const L: Level = {
    ...lay, depth, group,
    navBlock: new Uint8Array(lay.N), trap: new Int16Array(lay.N).fill(-1), propAt: new Array(lay.N).fill(null), dist: new Float64Array(lay.N),
    traps: [], doors: [], chests: [], monsters: [], pickups: [], spellFx: [], arrows: [], graves: [], descendWarned: false, families: depth ? pickFamilies(R, depth) : [], shots: [], hazards: [], bossRunes: [], debris: [], decals: [], lights: [], flames: [], pillars: [], runes: [], moons: [],
    disposeGeo: [], disposeInst: [], disposeMat: [], locked: !!lockedDoor, fieldT: 0, killsHere: 0, killedGen: new Set(),
    startIdx: lay.startRoom.cy * lay.W + lay.startRoom.cx,
    stairs: { tx: sr.cx, tz: sr.cy, x: sr.cx * T, z: sr.cy * T },
    exits: [], stash: null, npcs: [],
    lockedDoor,
    flameMesh: null,
  };
  G.L = L;
  levelRoot.add(L.group);
  return L;
}

function generateTown(): void {
  resetBuckets();
  const L = newLevel(townLayout(), 0, null, new THREE.Group());
  dressTown();
  buildTownTerrain(); mergeBuckets();
  L.flameMesh = makeFlames(L.flames); L.group.add(L.flameMesh);
  setOutdoor(true);
  POST.mist = .3;
  ambient.intensity = 2.6;
  G.hero.key = false;
  placeHero();
}

/**
 * The up-stairs cell (SPEC §13): an edge cell of the start room with a wall behind it, away from the room's corridor
 * openings and the start landing. Returns the cell and the direction of the wall, or null if the room has none.
 */
function upStairsCell(L: Level): { tx: number; tz: number; nx: number; nz: number } | null {
  const r = L.startRoom, t = (x: number, z: number): number => (x < 0 || z < 0 || x >= L.W || z >= L.H ? 0 : L.tiles[z * L.W + x]);
  const out: { tx: number; tz: number; nx: number; nz: number }[] = [];
  for (let z = r.y; z < r.y + r.h; z++) for (let x = r.x; x < r.x + r.w; x++) {
    if (Math.abs(x - r.cx) <= 1 && Math.abs(z - r.cy) <= 1) continue;
    let nearOpening = false;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const n = t(x + dx, z + dz); if (n === 2 || n === 3 || n === 4) nearOpening = true; }
    if (nearOpening) continue;
    for (const [nx, nz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) if (t(x + nx, z + nz) === 0) { out.push({ tx: x, tz: z, nx, nz }); break; }
  }
  return out.length ? pick(out) : null;
}

function generate(depth: number): void {
  resetBuckets();
  const lay = generateLayout();
  const group = new THREE.Group();
  const lc = lay.lockedCell;
  const lockedDoor = makeDoor({ roomId: lay.roomId, W: lay.W, group }, lc.tx, lc.tz, lc.axis, true);
  const L = newLevel(lay, depth, lockedDoor, group);
  const tint = TINTS[(depth - 1) % TINTS.length];
  const up = upStairsCell(L);
  if (up) L.tiles[up.tz * L.W + up.tx] = 7;
  decorate();
  const boss = bossFor(depth);
  if (boss) dressArena(boss.id);
  // exits: down to depth + 1 (behind the locked door), up to the level above (depth 1: town), an open portal's end
  L.exits.push({ kind: 'down', to: depth + 1, tx: L.stairs.tx, tz: L.stairs.tz, x: L.stairs.x, z: L.stairs.z, r: .85, open: true });
  if (up) { const x = up.tx * T, z = up.tz * T; propUpStairs(x, z, up.nx, up.nz); L.exits.push({ kind: 'up', to: depth - 1, tx: up.tx, tz: up.tz, x, z, r: .7, open: true }); }
  if (G.portal?.depth === depth) addPortalExit(G.portal.x, G.portal.z, 0);
  buildFloor(tint); buildWalls(tint); mergeBuckets();
  L.flameMesh = makeFlames(L.flames); L.group.add(L.flameMesh);
  setOutdoor(false);
  POST.mist = .7;
  ambient.intensity = Math.max(1.6, 2.2 - depth * .03);
  G.hero.key = false;
  placeHero();
  // monsters
  const occupied = new Set([L.startIdx]);
  /** One monster on a free cell; Fallen come in packs of 3–5 (D1) unless `pack` is false. */
  const placeIn = (cands: [number, number][], type: MonsterType, pack = true): Monster | null => {
    for (let k = 0; k < 20; k++) {
      const [x, z] = pick(cands); const i = z * L.W + x;
      if (!navOK(i) || occupied.has(i) || isStairs(L.tiles[i]) || L.trap[i] >= 0) continue;
      occupied.add(i);
      const m = spawnMonster(type, x * T + rr(-.3, .3), z * T + rr(-.3, .3));
      if (type === 'fallen' && pack) {
        const extra = ri(2, 4);
        for (let j = 0; j < extra; j++) {
          const a = (j / extra) * TAU + rr(-.3, .3), px = m.x + Math.cos(a) * .8, pz = m.z + Math.sin(a) * .8;
          if (!circleBlocked(px, pz, .3, false)) spawnMonster('fallen', px, pz);
        }
      }
      return m;
    }
    return null;
  };
  const family = () => L.families[Math.floor(R() * L.families.length)];
  for (const r of L.rooms) {
    const cells: [number, number][] = [];
    for (let z = r.y; z < r.y + r.h; z++) for (let x = r.x; x < r.x + r.w; x++) if (Math.abs(x - L.startRoom.cx) + Math.abs(z - L.startRoom.cy) > 2) cells.push([x, z]);
    if (!cells.length) continue;
    let n = r === L.startRoom ? 1 : Math.min(4, 1 + Math.floor(r.w * r.h / 12) + (depth > 3 ? 1 : 0));
    if (r === L.stairsRoom) {
      n = 2;
      if (boss) {
        const arena = cells.filter(([x, z]) => Math.abs(x - L.stairs.tx) + Math.abs(z - L.stairs.tz) >= 2);
        // the Ember Lich starts on one of its rune circles
        const rune = L.bossRunes[0];
        const b = boss.id === 'lich' && rune ? spawnMonster('lich', rune.x, rune.z) : placeIn(arena, boss.id);
        if (b) b.home = { x: L.stairs.x, z: L.stairs.z };
        if (boss.id === 'broodmother') for (let k = 0; k < 4; k++) placeIn(arena, 'eggsac', false);
      }
    }
    // The start room holds a single monster of the level's first family, never a pack.
    for (let k = 0; k < n; k++) r === L.startRoom ? placeIn(cells, L.families[0], false) : placeIn(cells, family());
  }
  const corr: [number, number][] = [];
  for (let z = 0; z < L.H; z++) for (let x = 0; x < L.W; x++) if (L.tiles[z * L.W + x] === 2) corr.push([x, z]);
  const nc = Math.floor(corr.length / 7);
  for (let k = 0; k < nc; k++) placeIn(corr, family());
  // Elite pack (SPEC §8.4): a named leader and 2–4 escorts sharing its modifier, in a room other than start and stairs.
  const eliteRooms = L.rooms.filter(r => r !== L.startRoom && r !== L.stairsRoom);
  if (depth >= ELITE.fromDepth && eliteRooms.length && R() < ELITE.chance) {
    const r = pick(eliteRooms), type = family(), mod = pick(ELITE_MODS), name = eliteName(R), spell = R() < .5 ? 'firebolt' as const : 'lightning' as const;
    const cells: [number, number][] = [];
    for (let z = r.y; z < r.y + r.h; z++) for (let x = r.x; x < r.x + r.w; x++) { const i = z * L.W + x; if (navOK(i) && !occupied.has(i) && !isStairs(L.tiles[i]) && L.trap[i] < 0) cells.push([x, z]); }
    if (cells.length) {
      const [cx, cz] = pick(cells), lead = spawnMonster(type, cx * T, cz * T, { elite: { name, mod, leader: true, spell } });
      const n = ri(ELITE.escorts[0], ELITE.escorts[1]);
      for (let j = 0; j < n; j++) {
        const a = (j / n) * TAU + rr(-.3, .3), px = lead.x + Math.cos(a) * 1.1, pz = lead.z + Math.sin(a) * 1.1;
        if (!circleBlocked(px, pz, .35, false)) spawnMonster(type, px, pz, { elite: { name, mod, leader: false, spell } });
      }
    }
  }
  L.monsters.forEach((m, i) => { m.genId = i; });
}

/** Adds a Town Portal end at (x, z) on the current level, leading to depth `to` (SPEC §13). */
export function addPortalExit(x: number, z: number, to: number): Exit {
  const tx = Math.round(x / T), tz = Math.round(z / T);
  const e: Exit = { kind: 'portal', to, tx, tz, x, z, r: .7, open: true, o: portalObject(x, z) };
  G.L.exits.push(e);
  return e;
}
