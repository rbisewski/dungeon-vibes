/**
 * The town (SPEC §13): depth 0, an open square under the night sky, the same on every run. A palisade rings it on
 * three sides; the ruined abbey closes the north, with the dungeon entrances as stairwells at its foot. The stash, the
 * well (respawn point) and the portal spot stand on the square. No monsters, no traps.
 */
import * as THREE from 'three';
import { PI, R, rr } from '../core/math';
import { G } from '../game/state';
import type { Exit, Layout, Room } from '../game/types';
import { S } from '../render/buckets';
import { gBox, gCone, gCyl, gPlane, glowSprite, mesh } from '../render/geometry';
import { MAT, grateMat } from '../render/materials';
import { T } from './consts';
import { propBarrel, propBrazier, propCrate, propStairs, wallFace } from './props';
import { buildAbbey, buildFence, buildHouses, buildTownGround, buildTrees, lampPost } from './townScenery';
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
  for (const x of ENTRANCE_X) tiles[ENTRANCE_Z * W + x] = 6;
  const yard: Room = { ...YARD, cx: RESPAWN.tx, cy: RESPAWN.tz, id: 0, visited: true };
  return { W, H, N, tiles, roomId, rooms: [yard], startRoom: yard, stairsRoom: yard, lockedCell: { tx: 0, tz: 0, axis: 'x' } };
}

/** Blocks a tile-sized prop for movement and pathing. */
function blockProp(tx: number, tz: number, r: number): void {
  const i = tz * W + tx; G.L.propAt[i] = { x: tx * T, z: tz * T, r }; G.L.navBlock[i] = 1;
}

function well(): void {
  const x = WELL.tx * T, z = WELL.tz * T;
  S('stone', gCyl(.95, 1, .75, 16), x, .37, z);
  S('dark', gCyl(.75, .75, .02, 16), x, .76, z);
  for (const s of [-1, 1]) S('wood', gBox(.12, 1.9, .12), x + .85 * s, 1.5, z);
  S('wood', gBox(2.1, .12, .9), x, 2.45, z, 0, 0, 0);
  S('wood', gCyl(.06, .06, 1.7, 6), x, 1.95, z, 0, 0, PI / 2);
  blockProp(WELL.tx, WELL.tz, 1.05);
}

/** A closed market stall (merchants come in a later phase): counter, posts and a striped awning. */
function stall(tx: number, tz: number, color: number): void {
  const x = tx * T, z = tz * T;
  S('wood', gBox(2.2, .9, .8), x, .45, z);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) S('wood', gBox(.1, 2.2, .1), x + sx * 1.05, 1.1, z + sz * .55);
  const awning = new THREE.MeshStandardMaterial({ color, roughness: .9, side: THREE.DoubleSide });
  G.L.disposeMat.push(awning);
  const a = mesh(gBox(2.5, .06, 1.5), awning, x, 2.25, z, G.L.group); a.rotation.x = .25;
  propCrate(x - .7, z + .9, .55); propBarrel(x + .9, z + .9);
  blockProp(Math.round(tx), Math.round(tz), 1.1);
}

/** The stash: a large iron-bound chest with gold trim (SPEC §13.1). */
function stashChest(): void {
  const x = TOWN_STASH.tx * T, z = TOWN_STASH.tz * T, g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(1.45);
  mesh(gBox(.9, .5, .58), MAT.wood, 0, .25, 0, g);
  mesh(gBox(.94, .07, .62), MAT.gold, 0, .07, 0, g); mesh(gBox(.94, .07, .62), MAT.gold, 0, .46, 0, g);
  for (const s of [-1, 1]) mesh(gBox(.07, .52, .63), MAT.iron, .32 * s, .26, 0, g);
  mesh(gBox(.96, .14, .64), MAT.wood, 0, .58, 0, g);
  mesh(gBox(.14, .16, .05), MAT.gold, 0, .4, .31, g);
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
  stall(9, 14, 0xa04030); stall(21, 16.5, 0x3a6a40);
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
  { const [x, z] = at(10.4, 11.2); S('wood', gCyl(.3, .34, .5, 8), x, .25, z); S('iron', gBox(.7, .22, .3), x, .62, z); S('iron', gBox(.3, .16, .24), x, .45, z); S('iron', gCone(.12, .3, 6), x + .45, .62, z, 0, 0, -PI / 2); }
  { const [x, z] = at(7.6, 11); S('stone', gBox(1.1, .8, 1.1), x, .4, z); S('coal', gBox(.9, .06, .9), x, .82, z); G.L.flames.push({ x, y: .85, z, s: 1.4, seed: R() }); G.L.lights.push({ x, y: 1.4, z, base: 20, cold: false, seed: R() * 100, d: 0 }); }
  // the witch's cauldron
  { const [x, z] = at(19.8, 19.3); S('iron', gCyl(.48, .38, .6, 12), x, .4, z); S('iron', gCyl(.5, .5, .05, 12), x, .7, z); propBrazier(x, z, .35);
    const brew = new THREE.MeshBasicMaterial({ color: 0x5aff6a }); G.L.disposeMat.push(brew);
    mesh(gCyl(.42, .42, .02, 12), brew, x, .72, z, G.L.group, false); G.L.lights.push({ x, y: 1.2, z, base: 10, cold: true, seed: R() * 100, pulse: true, d: 0 }); }
  // the sage's lectern with an open book
  { const [x, z] = at(11.5, 20.5); S('wood', gBox(.12, 1, .12), x, .5, z); S('wood', gBox(.6, .06, .45), x, 1.02, z, 0, -.35); S('bone', gBox(.5, .03, .36), x, 1.07, z - .02, 0, -.35); }
  // the peddler's crates
  { const [x, z] = at(21, 8.2); propCrate(x, z, .6); propCrate(x + .2, z + .1, .4); }
}

/** Spins portal rings and animates the townsfolk (called from the world update). */
export function updateTown(dt: number): void {
  for (const e of G.L.exits) if (e.o) e.o.rotation.y += dt * 1.6;
  for (const n of G.L.npcs) animateNpc(n.parts, G.now, G.hero.x, G.hero.z);
}
