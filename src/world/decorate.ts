import * as THREE from 'three';
import { PI, R, pick, ri, rr } from '../core/math';
import { G } from '../game/state';
import { gBox, gPlane } from '../render/geometry';
import { beamMat, grateMat, runeMat } from '../render/materials';
import { DX8, DZ8, T } from './consts';
import { tileAt } from './nav';
import { makeBarrel, makeBlade, makeChest, makeDoor, makeShelf, makeSpikes } from './objects';
import { propBars, propBones, propBrazier, propCobweb, propCrate, propPillar, propPuddle, propRubble, propStairs, sittingSkeleton, wallFace } from './props';
import type { Axis } from '../game/types';

/** True when every walkable tile is still reachable from the start (used before placing a blocking prop). */
function connected(): boolean {
  const { W, H, N, tiles, navBlock } = G.L, seen = new Uint8Array(N), st = [G.L.startIdx]; seen[G.L.startIdx] = 1; let cnt = 1, total = 0;
  const ok = (i: number): boolean => { const t = tiles[i]; return (t === 1 || t === 2 || t === 3 || t === 4 || t === 6 || t === 7) && !navBlock[i]; };
  for (let i = 0; i < N; i++) if (ok(i)) total++;
  while (st.length) { const c = st.pop()!, cx = c % W, cz = (c / W) | 0; for (let k = 0; k < 4; k++) { const nx = cx + DX8[k], nz = cz + DZ8[k]; if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue; const n = nz * W + nx; if (!seen[n] && ok(n)) { seen[n] = 1; cnt++; st.push(n); } } }
  return cnt === total;
}
/** Doors, special rooms, lights, props, chests, traps and moonlight for the current level. */
export function decorate(): void {
  const { W, H, tiles, rooms } = G.L, idx = (x: number, z: number): number => z * W + x, t = tileAt;
  const reserved = new Uint8Array(G.L.N);
  const sr = G.L.stairsRoom, sx = sr.cx, sz = sr.cy; tiles[idx(sx, sz)] = 6;
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const i = idx(x, z); if (tiles[i] !== 1) continue;
    for (let k = 0; k < 4; k++) { const n = t(x + DX8[k], z + DZ8[k]); if (n === 2 || n === 3 || n === 4) reserved[i] = 1; }
  }
  for (let k = 0; k < 9; k++) { reserved[idx(sx + (k % 3) - 1, sz + ((k / 3) | 0) - 1)] = 1; reserved[idx(G.L.startRoom.cx + (k % 3) - 1, G.L.startRoom.cy + ((k / 3) | 0) - 1)] = 1; }
  const free = (x: number, z: number): boolean => { const i = idx(x, z); return (tiles[i] === 1 || tiles[i] === 2) && !reserved[i] && !G.L.navBlock[i] && G.L.trap[i] < 0; };
  const block = (x: number, z: number, px: number, pz: number, r: number): boolean => {
    if (!free(x, z)) return false; const i = idx(x, z); G.L.navBlock[i] = 1;
    if (!connected()) { G.L.navBlock[i] = 0; return false; }
    G.L.propAt[i] = { x: px, z: pz, r }; reserved[i] = 1; return true;
  };
  // wooden doors at room entrances
  for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
    const i = idx(x, z); if (tiles[i] !== 2) continue;
    const wx = t(x - 1, z) !== 0 && t(x + 1, z) !== 0 && t(x, z - 1) === 0 && t(x, z + 1) === 0;
    const wz = t(x, z - 1) !== 0 && t(x, z + 1) !== 0 && t(x - 1, z) === 0 && t(x + 1, z) === 0;
    const nearRoom = G.L.roomId[idx(x - 1, z)] >= 0 || G.L.roomId[idx(x + 1, z)] >= 0 || G.L.roomId[idx(x, z - 1)] >= 0 || G.L.roomId[idx(x, z + 1)] >= 0;
    if ((wx || wz) && nearRoom && R() < .6 && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const n = t(x + a, z + b); return n === 3 || n === 4; })) {
      tiles[i] = 3; G.L.doors.push(makeDoor(G.L, x, z, wx ? 'x' : 'z', false));
    }
  }
  if (G.L.lockedDoor) G.L.doors.push(G.L.lockedDoor);
  // pick special rooms
  const normal = rooms.filter(r => r !== sr && r !== G.L.startRoom);
  const keyRoom = normal.reduce((a, b) => Math.hypot(b.cx - G.L.startRoom.cx, b.cy - G.L.startRoom.cy) > Math.hypot(a.cx - G.L.startRoom.cx, a.cy - G.L.startRoom.cy) ? b : a, normal[0]);
  const runeRoom = pick(normal), moonRoom = pick(rooms.filter(r => r !== runeRoom && r !== sr));
  // D1 bookcase: one bookshelf on 35 % of levels [OURS rate].
  const shelfRoom = R() < .35 ? pick(normal) : null;
  const torchAt: [number, number][] = [];
  const tooClose = (x: number, z: number, d: number): boolean => torchAt.some(p => Math.abs(p[0] - x) + Math.abs(p[1] - z) < d);
  for (const r of rooms) {
    const isStart = r === G.L.startRoom, isStairs = r === sr;
    // the room's floor cells, and those with a wall on a given side (shaped rooms have walls inside their box too)
    const cells: [number, number][] = r.cells.map(c => [c % W, (c / W) | 0]);
    const walled = (dx: number, dz: number): [number, number][] => cells.filter(([x, z]) => t(x + dx, z + dz) === 0);
    const edgeCells = cells.filter(([x, z]) => t(x, z - 1) === 0 || t(x + 1, z) === 0 || t(x, z + 1) === 0 || t(x - 1, z) === 0);
    const inner = cells.filter(c => !edgeCells.includes(c));
    const inRoom = (x: number, z: number): boolean => G.L.roomId[idx(x, z)] === r.id;
    // back (north) and west wall features
    const north = walled(0, -1), west = walled(-1, 0);
    // prison cell alcove: two neighbouring north-wall cells with solid rock behind them
    const cave = r.shape === 'cave';
    if (!isStart && !isStairs && !cave && r.w >= 5 && R() < .4) {
      const pairs = north.filter(([x, z]) => north.some(([x2, z2]) => x2 === x + 1 && z2 === z));
      for (let tries = 0; tries < 6 && pairs.length; tries++) {
        const [x, z] = pick(pairs);
        let ok = true; for (let xx = x - 1; xx <= x + 2; xx++) for (let zz = z - 3; zz <= z - 1; zz++) if (t(xx, zz) !== 0) ok = false;
        if (!ok) continue;
        tiles[idx(x, z - 1)] = 5; tiles[idx(x + 1, z - 1)] = 5;
        propBars(x * T - 1, z * T - 1, (x + 1) * T + 1, z * T - 1);
        sittingSkeleton(x * T + rr(-.3, .3), (z - 1) * T - .5, rr(-.3, .3)); propBones((x + 1) * T, (z - 1) * T);
        for (let k = north.length - 1; k >= 0; k--) if (north[k][1] === z && (north[k][0] === x || north[k][0] === x + 1)) north.splice(k, 1);
        break;
      }
    }
    // torches on back walls
    const nt = north.filter(([x, z]) => !tooClose(x, z, 3));
    if (nt.length) {
      const a = nt[Math.floor(nt.length * .2)]; wallFace(a[0] * T, a[1] * T - 1, 0, 1, 'torch'); torchAt.push(a); north.splice(north.indexOf(a), 1);
      const b = nt[Math.floor(nt.length * .85)];
      if (b !== a && Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]) >= 3) { wallFace(b[0] * T, b[1] * T - 1, 0, 1, 'torch'); torchAt.push(b); north.splice(north.indexOf(b), 1); }
    }
    if (west.length && R() < .7) { const w = west[west.length >> 1]; if (!tooClose(w[0], w[1], 3)) { wallFace(w[0] * T - 1, w[1] * T, 1, 0, 'torch'); torchAt.push(w); west.splice(west.indexOf(w), 1); } }
    // banners hang on masonry, not in caves
    if (!cave && north.length && R() < .75) { const [x, z] = north[north.length >> 1]; wallFace(x * T, z * T - 1, 0, 1, 'banner'); }
    if (!cave && west.length && R() < .3) { const [x, z] = pick(west); wallFace(x * T - 1, z * T, 1, 0, 'banner'); }
    // cobwebs in the north-west and (sometimes) north-east corners
    const nw = cells.find(([x, z]) => t(x - 1, z) === 0 && t(x, z - 1) === 0);
    if (nw) propCobweb(nw[0] * T - .45, nw[1] * T - .45, PI / 4);
    const ne = cells.find(([x, z]) => t(x + 1, z) === 0 && t(x, z - 1) === 0);
    if (R() < .5 && ne) propCobweb(ne[0] * T + .45, ne[1] * T - .45, -PI / 4);
    // pillars: four in a big plain room or octagon, colonnades down a hall (D1 Cathedral chambers)
    let hasPillars = false;
    const pillar = (px: number, pz: number) => { if (inRoom(px, pz) && block(px, pz, px * T, pz * T, .5)) { propPillar(px * T, pz * T); hasPillars = true; } };
    if (r.shape === 'hall') {
      const along = r.w >= r.h, len = along ? r.w : r.h, thick = along ? r.h : r.w, inset = thick >= 8 ? 2 : 1;
      for (let a = 2; a <= len - 3; a += 3) for (const b of [inset, thick - 1 - inset]) pillar(r.x + (along ? a : b), r.y + (along ? b : a));
    } else if ((r.shape === 'room' && r.w >= 6 && r.h >= 5 && R() < .7) || (r.shape === 'octagon' && r.w >= 8)) {
      const k = r.shape === 'octagon' ? 2 : 1;
      for (const [px, pz] of [[r.x + k, r.y + k], [r.x + r.w - 1 - k, r.y + k], [r.x + k, r.y + r.h - 1 - k], [r.x + r.w - 1 - k, r.y + r.h - 1 - k]]) pillar(px, pz);
    }
    // stairs room
    if (isStairs) {
      propStairs(sx * T, sz * T);
      for (const dx of [-2, 2]) { const bx = sx + dx; if (inRoom(bx, sz) && block(bx, sz, bx * T, sz * T, .45)) propBrazier(bx * T, sz * T); }
    }
    // chest, against a north or west wall
    const edgeTiles: [number, number, number, number][] = [...walled(0, -1).map(([x, z]): [number, number, number, number] => [x, z, 0, -1]), ...walled(-1, 0).map(([x, z]): [number, number, number, number] => [x, z, -1, 0])];
    if (edgeTiles.length && (r === keyRoom || (!isStairs && R() < .65))) {
      for (let k = 0; k < 10; k++) { const [x, z, ox, oz] = pick(edgeTiles); const px = x * T + ox * .4, pz = z * T + oz * .4; if (block(x, z, px, pz, .55)) { G.L.chests.push(makeChest(px, pz, oz ? 0 : PI / 2, r === keyRoom)); break; } }
    }
    // the key chest must exist, or the stairs door could never open
    if (r === keyRoom && !G.L.chests.some(c => c.isKey)) for (const [x, z] of cells) if (block(x, z, x * T, z * T, .55)) { G.L.chests.push(makeChest(x * T, z * T, 0, true)); break; }
    if (r === shelfRoom && edgeTiles.length) {
      for (let k = 0; k < 12; k++) { const [x, z, ox, oz] = pick(edgeTiles); const px = x * T + ox * .55, pz = z * T + oz * .55; if (block(x, z, px, pz, .6)) { G.L.chests.push(makeShelf(px, pz, oz ? 0 : PI / 2)); break; } }
    }
    // clutter along the walls
    const nClutter = ri(1, 3) + (cells.length >= 50 ? 1 : 0);
    for (let k = 0, placed = 0; k < 12 && placed < nClutter && edgeCells.length; k++) {
      const [x, z] = pick(edgeCells); const cx = x * T, cz = z * T;
      if (!block(x, z, cx, cz, .72)) continue; placed++;
      const kind = R();
      // barrels are breakable (SPEC §6.3); a cell of barrels alone opens up once they are all broken
      const bar = (px: number, pz: number, tile: number) => G.L.barrels.push(makeBarrel(px, pz, tile));
      if (kind < .4) { bar(cx - .3, cz - .25, idx(x, z)); bar(cx + .32, cz + .1, idx(x, z)); if (R() < .5) bar(cx - .2, cz + .42, idx(x, z)); }
      else if (kind < .75) { propCrate(cx - .15, cz - .1); if (R() < .6) bar(cx + .45, cz + .35, -1); }
      else { propCrate(cx, cz, .7); propCrate(cx + .45, cz + .45, .45); }
    }
    if (!hasPillars && !isStairs && !isStart && inner.length && R() < .45) { for (let k = 0; k < 6; k++) { const [x, z] = pick(inner); if (block(x, z, x * T, z * T, .45)) { propBrazier(x * T, z * T); break; } } }
    if (isStart && west.length === 0 && north.length) { const [x, z] = north[0]; wallFace(x * T, z * T - 1, 0, 1, 'torch'); }
    // floor junk
    for (let k = 0; k < ri(3, 7) + (cells.length >> 4); k++) { const [cx, cz] = pick(cells), x = cx * T + rr(-.7, .7), z = cz * T + rr(-.7, .7); if (Math.hypot(x - sx * T, z - sz * T) < 1.6) continue; R() < .55 ? propRubble(x, z, ri(2, 6)) : propBones(x, z); }
    for (let k = 0; k < ri(0, 2); k++) { const [x, z] = pick(cells); propPuddle(x * T + rr(-.5, .5), z * T + rr(-.5, .5)); }
    // spike trap
    if (!isStart && !isStairs && R() < .4) { for (let k = 0; k < 8; k++) { const [x, z] = pick(cells); if (free(x, z)) { makeSpikes(x, z); reserved[idx(x, z)] = 1; break; } } }
    // rune / moonlight
    if (r === runeRoom) { const x = r.cx * T, z = r.cy * T; const m = new THREE.Mesh(gPlane(1.9, 1.9), runeMat); m.rotation.x = -PI / 2; m.position.set(x, .03, z); G.L.group.add(m); G.L.runes.push(m); G.L.lights.push({ x, y: 1.1, z, base: 9, cold: true, seed: R() * 100, pulse: true, d: 0 }); }
    if (r === moonRoom) { const [mx, mz] = pick(inner.length ? inner : cells); addMoon(mx * T + rr(-.5, .5), mz * T + rr(-.5, .5)); }
  }
  // corridors
  for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
    const i = idx(x, z); if (tiles[i] !== 2) continue;
    if (t(x, z - 1) === 0 && t(x - 1, z) !== 0 && t(x + 1, z) !== 0 && R() < .22 && !tooClose(x, z, 5)) { wallFace(x * T, z * T - 1, 0, 1, 'torch'); torchAt.push([x, z]); }
    else if (t(x - 1, z) === 0 && t(x, z - 1) !== 0 && t(x, z + 1) !== 0 && R() < .22 && !tooClose(x, z, 5)) { wallFace(x * T - 1, z * T, 1, 0, 'torch'); torchAt.push([x, z]); }
    if (R() < .07) propPuddle(x * T + rr(-.4, .4), z * T + rr(-.4, .4));
    if (R() < .07) propBones(x * T, z * T); else if (R() < .06) propRubble(x * T, z * T, ri(2, 4));
    if (R() < .05 && t(x - 1, z) === 0 && t(x, z - 1) === 0) propCobweb(x * T - .45, z * T - .45, PI / 4);
  }
  // swinging blade + corridor spikes
  const straight: [number, number, Axis][] = [];
  for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
    if (!free(x, z) || tiles[idx(x, z)] !== 2) continue;
    const ax = t(x - 1, z) === 2 && t(x + 1, z) === 2 && t(x, z - 1) === 0 && t(x, z + 1) === 0;
    const az = t(x, z - 1) === 2 && t(x, z + 1) === 2 && t(x - 1, z) === 0 && t(x + 1, z) === 0;
    if (ax || az) straight.push([x, z, ax ? 'x' : 'z']);
  }
  if (straight.length) { const [x, z, a] = pick(straight); makeBlade(x, z, a); reserved[idx(x, z)] = 1; }
  if (straight.length > 6 && R() < .7) { const [x, z] = pick(straight); if (free(x, z)) makeSpikes(x, z); }
  if (G.L.depth % 2 === 0 || !moonRoom) { const c = pick(straight); if (c) addMoon(c[0] * T, c[1] * T); }
}
/** A moonlight shaft through a ceiling grate. */
export function addMoon(x: number, z: number): void {
  const d = new THREE.Mesh(gPlane(1.9, 1.9), grateMat); d.rotation.x = -PI / 2; d.position.set(x, .025, z); G.L.group.add(d);
  const b = new THREE.Mesh(gBox(1.5, 7, 1.5), beamMat); b.position.set(x + .6, 3.5, z - .3); b.rotation.set(-.08, 0, .16); G.L.group.add(b);
  G.L.lights.push({ x, y: 3.4, z, base: 13, cold: true, seed: R() * 100, steady: true, d: 0 });
  G.L.moons.push({ x, z });
}
