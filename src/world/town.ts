/**
 * The town (SPEC §13): depth 0, an open square under the night sky, the same on every run. A palisade rings it on
 * three sides; the ruined abbey closes the north, with the dungeon entrances as stairwells at its foot. The stash, the
 * well (respawn point) and the portal spot stand on the square. No monsters, no traps.
 */
import * as THREE from 'three';
import { PI, R, TAU, rr } from '../core/math';
import { G } from '../game/state';
import type { Exit, Layout, Room } from '../game/types';
import { gCyl, gPlane, glowSprite, mesh } from '../render/geometry';
import { part } from '../actors/models/kit';
import { PROPS, SK } from './propKit';
import { anvil, cauldron, chestBody, chestLid, forge, lectern, stall as stallModel, well as wellModel } from './propModels';
import { grateMat } from '../render/materials';
import { T } from './consts';
import { propBarrel, propBrazier, propCrate, propStairs, wallFace } from './props';
import { buildAbbey, buildFence, buildHouses, buildTownGround, buildTrees, buildTufts, lampPost } from './townScenery';
import { fxAdd } from '../render/particles';
import { animateNpc, buildNpc } from '../actors/models/npc';
import type { NpcId } from '../game/shops';

const W = 30, H = 26;
/** Courtyard floor (tiles). */
const YARD = { x: 3, y: 3, w: 24, h: 20 };
/** House blocks inside the yard: solid wall tiles. */
const HOUSES = [{ x: 4, y: 9, w: 3, h: 3 }, { x: 23, y: 9, w: 3, h: 3 }, { x: 4, y: 17, w: 3, h: 3 }, { x: 23, y: 17, w: 3, h: 3 }];
/** Dungeon entrances along the north wall: depth 1 always, then every boss depth once reached [USER Q14, OURS cap at 25]. */
export const ENTRANCE_DEPTHS = [1, 5, 10, 15, 20, 25] as const;
const ENTRANCE_X = [7, 10, 13, 16, 19, 22], ENTRANCE_Z = 3;
const WELL = { tx: 15, tz: 13 };
/** Respawn point (the town's "start room" centre), just south of the well. */
const RESPAWN = { tx: 15, tz: 15 };
export const TOWN_STASH = { tx: 15, tz: 21 };
const PORTAL = { tx: 21, tz: 14 };

/** The town's fixed tile map. */
export function townLayout(): Layout {
  const N = W * H, tiles = new Uint8Array(N), roomId = new Int16Array(N).fill(-1);
  for (let z = YARD.y; z < YARD.y + YARD.h; z++) for (let x = YARD.x; x < YARD.x + YARD.w; x++) { tiles[z * W + x] = 1; roomId[z * W + x] = 0; }
  for (const b of HOUSES) for (let z = b.y; z < b.y + b.h; z++) for (let x = b.x; x < b.x + b.w; x++) { tiles[z * W + x] = 0; roomId[z * W + x] = -1; }
  const cells: number[] = []; for (let i = 0; i < N; i++) if (roomId[i] === 0) cells.push(i);
  for (const x of ENTRANCE_X) tiles[ENTRANCE_Z * W + x] = 6;
  const yard: Room = { ...YARD, cx: RESPAWN.tx, cy: RESPAWN.tz, id: 0, visited: true, shape: 'room', cells };
  return { W, H, N, tiles, roomId, rooms: [yard], startRoom: yard, stairsRoom: yard, lockedCell: { tx: 0, tz: 0, axis: 'x' } };
}

/** Blocks a tile-sized prop for movement and pathing. */
function blockProp(tx: number, tz: number, r: number): void {
  const i = tz * W + tx; G.L.propAt[i] = { x: tx * T, z: tz * T, r }; G.L.navBlock[i] = 1;
}

function well(): void {
  SK('well', wellModel, WELL.tx * T, 0, WELL.tz * T);
  blockProp(WELL.tx, WELL.tz, 1.05);
}

/** A market stall with its awning colour and wares, a crate and a barrel beside it. */
function stall(tx: number, tz: number, canvas: 'canvasRed' | 'canvasGreen', goods: 'pots' | 'herbs'): void {
  const x = tx * T, z = tz * T;
  SK(`stall:${goods}`, k => stallModel(k, canvas, goods), x, 0, z);
  propCrate(x - .7, z + .9, .55); propBarrel(x + .9, z + .9);
  blockProp(Math.round(tx), Math.round(tz), 1.1);
}

/** The stash: a large gold-bound chest (SPEC §13.1). */
function stashChest(): void {
  const x = TOWN_STASH.tx * T, z = TOWN_STASH.tz * T, g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(1.45);
  part(g, 'chest:gold', k => chestBody(k, 'gold'), PROPS);
  const lid = new THREE.Group(); lid.position.set(0, .48, -.29); g.add(lid);
  part(lid, 'chestLid:gold', k => chestLid(k, 'gold'), PROPS);
  glowSprite(0xffc060, 1.3, g, 0, .9, 0);
  G.L.group.add(g);
  blockProp(TOWN_STASH.tx, TOWN_STASH.tz, .75);
  G.L.stash = { x, z };
}

/** Builds a portal's swirl and light at (x, z); its materials are disposed with the level. */
export function portalObject(x: number, z: number): THREE.Object3D {
  const o = new THREE.Group(); o.position.set(x, 0, z);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x3a6aff, transparent: true, opacity: .6 });
  const veilMat = new THREE.MeshBasicMaterial({ color: 0x5a9aff, transparent: true, opacity: .45, side: THREE.DoubleSide, depthWrite: false });
  mesh(gCyl(.75, .75, .04, 20), ringMat, 0, .03, 0, o, false);
  const glows = [glowSprite(0x4a8aff, 2.4, o, 0, 1.2, 0), glowSprite(0xc0e0ff, 1.1, o, 0, 1.2, 0)];
  const veil = mesh(gPlane(1.1, 2.1), veilMat, 0, 1.15, 0, o, false);
  veil.rotation.y = PI / 4;
  G.L.disposeMat.push(ringMat, veilMat, ...glows.map(g => g.material));
  G.L.group.add(o);
  G.L.lights.push({ x, y: 1.4, z, base: 14, cold: true, seed: R() * 100, pulse: true, d: 0 });
  return o;
}

/** Props, lights, entrances, the stash and (if open) the Town Portal. Runs inside the level's fixed seed. */
export function dressTown(): void {
  const L = G.L;
  // entrances: open ones lead down, sealed ones are covered by a grate
  ENTRANCE_DEPTHS.forEach((d, i) => {
    const tx = ENTRANCE_X[i], tz = ENTRANCE_Z, x = tx * T, z = tz * T, open = d === 1 || G.deepest >= d;
    propStairs(x, z);
    if (!open) { const g = new THREE.Mesh(gPlane(2, 2), grateMat); g.rotation.x = -PI / 2; g.position.set(x, .04, z); L.group.add(g); }
    const e: Exit = { kind: 'down', to: d, tx, tz, x, z, r: .85, open };
    L.exits.push(e);
    if (d === 1) L.stairs = { tx, tz, x, z };
  });
  // the abbey façade with archways over the stairwells, banners and torches on it; braziers between the entrances
  buildAbbey(YARD.x - 1, YARD.x + YARD.w, YARD.y - 1, ENTRANCE_X);
  for (const tx of [5, 25]) wallFace(tx * T, YARD.y * T - 1, 0, 1, 'banner');
  for (const tx of [8.5, 20.5]) wallFace(tx * T, YARD.y * T - 1, 0, 1, 'torch');
  for (const tx of [8.5, 14.5, 20.5]) propBrazier(tx * T, 5 * T, 1.1);
  // a palisade on the other three sides
  const x0 = YARD.x * T - 1, x1 = (YARD.x + YARD.w) * T - 1, z0 = YARD.y * T - 1, z1 = (YARD.y + YARD.h) * T - 1;
  buildFence([{ x0, z0, x1: x0, z1 }, { x0: x1, z0, x1, z1 }, { x0, z0: z1, x1, z1 }]);
  buildHouses(HOUSES, { x: WELL.tx * T, z: WELL.tz * T });
  for (const b of HOUSES) { const side = b.x < WELL.tx ? 1 : -1, ex = (side > 0 ? b.x + b.w : b.x - 1) * T; propBarrel(ex, b.y * T + .3); propCrate(ex, (b.y + b.h - 1) * T, .7); }
  buildGreenery();
  for (const [tx, tz] of [[12.5, 8], [17.5, 8], [12.5, 18], [17.5, 18], [9, 16.5], [21, 11.5]]) lampPost(tx * T, tz * T);
  // warm light where people gather: around the well, by the stash, at the portal spot
  for (const [tx, tz] of [[13, 12], [17, 14], [13.5, 20.5], [16.5, 20.5], [22.5, 13]]) { propBrazier(tx * T, tz * T, .9); blockProp(Math.round(tx), Math.round(tz), .35); }
  stall(9, 14, 'canvasRed', 'pots'); stall(21, 16.5, 'canvasGreen', 'herbs');
  well();
  stashChest();
  townsfolk();
  if (G.portal) {
    const x = PORTAL.tx * T, z = PORTAL.tz * T;
    L.exits.push({ kind: 'portal', to: G.portal.depth, tx: PORTAL.tx, tz: PORTAL.tz, x, z, r: .7, open: true, o: portalObject(x, z) });
  }
}

/** Cobbled paths: the street before the abbey, the north–south avenue, the cross street, and the stash square. */
function pathTiles(): Set<number> {
  const set = new Set<number>(), add = (x0: number, z0: number, x1: number, z1: number) => { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set.add(z * W + x); };
  add(6, 4, 23, 5); add(14, 4, 16, 22); add(7, 13, 23, 15); add(12, 19, 18, 22);
  return set;
}

/** Pines outside the palisade (deterministic), and a few on the square's grass corners. */
function buildGreenery(): void {
  const spots: { x: number; z: number; s: number }[] = [];
  const outside = (x: number, z: number) => x < (YARD.x - 1.5) * T || x > (YARD.x + YARD.w + .5) * T || z > (YARD.y + YARD.h + .5) * T;
  for (let k = 0; k < 400 && spots.length < 70; k++) {
    const x = rr(-14, W * T + 12), z = rr(0, H * T + 14);
    if (outside(x, z) && !spots.some(s => Math.hypot(s.x - x, s.z - z) < 2.2)) spots.push({ x, z, s: rr(.8, 1.35) });
  }
  for (const [tx, tz] of [[4, 5], [25, 5], [4, 14], [25, 14], [10, 21], [20, 21]]) { spots.push({ x: tx * T, z: tz * T, s: rr(.75, .95) }); blockProp(tx, tz, .45); }
  buildTrees(spots);
  // tufts on the grass inside the palisade and a little beyond it, never on the cobbles or under a house
  const paths = pathTiles(), tufts: { x: number; z: number }[] = [];
  for (let k = 0; k < 2600; k++) {
    const x = rr(-4, W * T + 2), z = rr(2, H * T + 4), tx = Math.round(x / T), tz = Math.round(z / T);
    const inMap = tx >= 0 && tz >= 0 && tx < W && tz < H;
    if (inMap && (paths.has(tz * W + tx) || G.L.tiles[tz * W + tx] === 6 || HOUSES.some(b => tx >= b.x && tx < b.x + b.w && tz >= b.y && tz < b.y + b.h))) continue;
    if (tz < YARD.y) continue;
    tufts.push({ x, z });
  }
  buildTufts(tufts);
}

/** Builds the town's ground (called instead of the dungeon floor). */
export function buildTownTerrain(): void { buildTownGround(YARD, pathTiles()); }

/** Where the townsfolk stand (tiles) and which way they face (SPEC §13.2). */
const NPC_SPOTS: Record<NpcId, { tx: number; tz: number; ry: number }> = {
  smith: { tx: 9, tz: 11.6, ry: PI * .25 },
  witch: { tx: 21, tz: 18.6, ry: -PI * .75 },
  healer: { tx: 17.2, tz: 11.2, ry: PI * .8 },
  sage: { tx: 11.5, tz: 19.6, ry: PI * .35 },
  peddler: { tx: 20, tz: 8.6, ry: PI * .9 },
};

/** The townsfolk and their workplaces: anvil and forge, cauldron, lectern, the peddler's crates. */
function townsfolk(): void {
  for (const id of Object.keys(NPC_SPOTS) as NpcId[]) {
    const s = NPC_SPOTS[id], x = s.tx * T, z = s.tz * T, parts = buildNpc(id);
    parts.root.position.set(x, 0, z); parts.root.rotation.y = s.ry;
    G.L.group.add(parts.root);
    G.L.npcs.push({ id, x, z, parts });
    blockProp(Math.round(s.tx), Math.round(s.tz), .45);
  }
  const at = (tx: number, tz: number) => [tx * T, tz * T] as const;
  // the smith's anvil (on a stump) and forge
  { const [x, z] = at(10.4, 11.2); SK('anvil', anvil, x, 0, z, -.5); }
  { const [x, z] = at(7.6, 11); SK('forge', forge, x, 0, z); G.L.flames.push({ x, y: .88, z, s: 1.4, seed: R() }); G.L.lights.push({ x, y: 1.4, z, base: 20, cold: false, seed: R() * 100, d: 0 }); }
  // the witch's cauldron over a small fire, its brew glowing
  { const [x, z] = at(19.8, 19.3); SK('cauldron', cauldron, x, 0, z);
    G.L.flames.push({ x, y: .1, z, s: .7, seed: R() }); G.L.lights.push({ x, y: .6, z, base: 9, cold: false, seed: R() * 100, d: 0 });
    const brew = new THREE.MeshBasicMaterial({ color: 0x5aff6a }); G.L.disposeMat.push(brew);
    mesh(gCyl(.41, .41, .02, 16), brew, x, .63, z, G.L.group, false); G.L.lights.push({ x, y: 1.4, z, base: 10, cold: true, seed: R() * 100, pulse: true, d: 0 }); }
  // the sage's lectern with an open book and a candle
  { const [x, z] = at(11.5, 20.5); SK('lectern', lectern, x, 0, z); G.L.flames.push({ x: x + .27, y: 1.17, z: z + .1, s: .25, seed: R() }); }
  // the peddler's crates
  { const [x, z] = at(21, 8.2); propCrate(x, z, .6); propCrate(x + .2, z + .1, .4); }
}

/** Spins portal rings and animates the townsfolk (called from the world update). */
export function updateTown(dt: number): void {
  for (const e of G.L.exits) if (e.o) e.o.rotation.y += dt * 1.6;
  for (const n of G.L.npcs) animateNpc(n.parts, G.now, G.hero.x, G.hero.z);
  // fireflies drift over the grass around the hero
  if (G.depth === 0 && R() < dt * 5) {
    const h = G.hero, a = R() * TAU, r = rr(3, 13);
    fxAdd.spawn(h.x + Math.cos(a) * r, rr(.3, 1.6), h.z + Math.sin(a) * r, rr(-.25, .25), rr(-.05, .12), rr(-.25, .25), rr(2.5, 5), 1.5, 2.2, .5, rr(.035, .055), 0, .2, 3);
  }
}
