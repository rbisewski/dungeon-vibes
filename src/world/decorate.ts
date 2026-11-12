import * as THREE from 'three';
import { PI, R, pick, ri, rr } from '../core/math';
import { G } from '../game/state';
import { gBox, gPlane } from '../render/geometry';
import { beamMat, grateMat, runeMat } from '../render/materials';
import { DX8, DZ8, T } from './consts';
import { tileAt } from './nav';
import { makeBlade, makeChest, makeDoor, makeSpikes } from './objects';
import { propBarrel, propBars, propBones, propBrazier, propCobweb, propCrate, propPillar, propPuddle, propRubble, propStairs, sittingSkeleton, wallFace } from './props';
import type { Axis } from '../game/types';

/** True when every walkable tile is still reachable from the start (used before placing a blocking prop). */
function connected(): boolean {
  const { W, H, N, tiles, navBlock } = G.L, seen = new Uint8Array(N), st = [G.L.startIdx]; seen[G.L.startIdx] = 1; let cnt = 1, total = 0;
  const ok = (i: number): boolean => { const t = tiles[i]; return (t === 1 || t === 2 || t === 3 || t === 4 || t === 6) && !navBlock[i]; };
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
  G.L.doors.push(G.L.lockedDoor);
  // pick special rooms
  const normal = rooms.filter(r => r !== sr && r !== G.L.startRoom);
  const keyRoom = normal.reduce((a, b) => Math.hypot(b.cx - G.L.startRoom.cx, b.cy - G.L.startRoom.cy) > Math.hypot(a.cx - G.L.startRoom.cx, a.cy - G.L.startRoom.cy) ? b : a, normal[0]);
  const runeRoom = pick(normal), moonRoom = pick(rooms.filter(r => r !== runeRoom && r !== sr));
  const torchAt: [number, number][] = [];
  const tooClose = (x: number, z: number, d: number): boolean => torchAt.some(p => Math.abs(p[0] - x) + Math.abs(p[1] - z) < d);
  for (const r of rooms) {
    const isStart = r === G.L.startRoom, isStairs = r === sr;
    // north wall (back) features
    const north: number[] = []; for (let x = r.x; x < r.x + r.w; x++) if (t(x, r.y - 1) === 0) north.push(x);
    const west: number[] = []; for (let z = r.y; z < r.y + r.h; z++) if (t(r.x - 1, z) === 0) west.push(z);
    // prison cell alcove
    if (!isStart && !isStairs && r.w >= 5 && R() < .4) {
      for (let tries = 0; tries < 6; tries++) {
        const x = ri(r.x, r.x + r.w - 2);
        let ok = true; for (let xx = x - 1; xx <= x + 2; xx++) for (let zz = r.y - 3; zz <= r.y - 1; zz++) if (t(xx, zz) !== 0) ok = false;
        if (!ok) continue;
        tiles[idx(x, r.y - 1)] = 5; tiles[idx(x + 1, r.y - 1)] = 5;
        propBars(x * T - 1, r.y * T - 1, (x + 1) * T + 1, r.y * T - 1);
        sittingSkeleton(x * T + rr(-.3, .3), (r.y - 1) * T - .5, rr(-.3, .3)); propBones((x + 1) * T, (r.y - 1) * T);
        for (let k = north.length - 1; k >= 0; k--) if (north[k] === x || north[k] === x + 1) north.splice(k, 1);
        break;
      }
    }
    // torches on back walls
    const nt = north.filter(x => !tooClose(x, r.y, 3));
    if (nt.length) { const a = nt[Math.floor(nt.length * .2)]; wallFace(a * T, r.y * T - 1, 0, 1, 'torch'); torchAt.push([a, r.y]); north.splice(north.indexOf(a), 1);
      const b = nt[Math.floor(nt.length * .85)]; if (b !== a && Math.abs(b - a) >= 3) { wallFace(b * T, r.y * T - 1, 0, 1, 'torch'); torchAt.push([b, r.y]); north.splice(north.indexOf(b), 1); } }
    if (west.length && R() < .7) { const z = west[west.length >> 1]; if (!tooClose(r.x, z, 3)) { wallFace(r.x * T - 1, z * T, 1, 0, 'torch'); torchAt.push([r.x, z]); west.splice(west.indexOf(z), 1); } }
    if (north.length && R() < .75) { const x = north[north.length >> 1]; wallFace(x * T, r.y * T - 1, 0, 1, 'banner'); }
    if (west.length && R() < .3) { const z = pick(west); wallFace(r.x * T - 1, z * T, 1, 0, 'banner'); }
    if (t(r.x - 1, r.y) === 0 && t(r.x, r.y - 1) === 0) propCobweb(r.x * T - .45, r.y * T - .45, PI / 4);
    if (R() < .5 && t(r.x + r.w, r.y) === 0 && t(r.x + r.w - 1, r.y - 1) === 0) propCobweb((r.x + r.w - 1) * T + .45, r.y * T - .45, -PI / 4);
    // pillars
    let hasPillars = false;
    if (r.w >= 6 && r.h >= 5 && R() < .7) for (const [px, pz] of [[r.x + 1, r.y + 1], [r.x + r.w - 2, r.y + 1], [r.x + 1, r.y + r.h - 2], [r.x + r.w - 2, r.y + r.h - 2]]) if (block(px, pz, px * T, pz * T, .5)) { propPillar(px * T, pz * T); hasPillars = true; }
    // stairs room
    if (isStairs) {
      propStairs(sx * T, sz * T);
      for (const dx of [-2, 2]) { const bx = sx + dx; if (bx >= r.x && bx < r.x + r.w && block(bx, sz, bx * T, sz * T, .45)) propBrazier(bx * T, sz * T); }
    }
    // chest
    const edgeTiles: [number, number, number, number][] = [];
    for (let x = r.x; x < r.x + r.w; x++) edgeTiles.push([x, r.y, 0, -1]);
    for (let z = r.y + 1; z < r.y + r.h; z++) edgeTiles.push([r.x, z, -1, 0]);
    if (r === keyRoom || (!isStairs && R() < .65)) {
      for (let k = 0; k < 10; k++) { const [x, z, ox, oz] = pick(edgeTiles); const px = x * T + ox * .4, pz = z * T + oz * .4; if (block(x, z, px, pz, .55)) { G.L.chests.push(makeChest(px, pz, oz ? 0 : PI / 2, r === keyRoom)); break; } }
      if (r === keyRoom && !G.L.chests.some(c => c.isKey)) { for (let z = r.y; z < r.y + r.h && !G.L.chests.some(c => c.isKey); z++) for (let x = r.x; x < r.x + r.w; x++) if (block(x, z, x * T, z * T, .55)) { G.L.chests.push(makeChest(x * T, z * T, 0, true)); break; } }
    }
    // clutter
    const allEdge: [number, number][] = [];
    for (let x = r.x; x < r.x + r.w; x++) { allEdge.push([x, r.y]); allEdge.push([x, r.y + r.h - 1]); }
    for (let z = r.y + 1; z < r.y + r.h - 1; z++) { allEdge.push([r.x, z]); allEdge.push([r.x + r.w - 1, z]); }
    const nClutter = ri(1, 3);
    for (let k = 0, placed = 0; k < 12 && placed < nClutter; k++) {
      const [x, z] = pick(allEdge); const cx = x * T, cz = z * T;
      if (!block(x, z, cx, cz, .72)) continue; placed++;
      const kind = R();
      if (kind < .4) { propBarrel(cx - .3, cz - .25); propBarrel(cx + .32, cz + .1); if (R() < .5) propBarrel(cx - .2, cz + .42); }
      else if (kind < .75) { propCrate(cx - .15, cz - .1); if (R() < .6) propBarrel(cx + .45, cz + .35); }
      else { propCrate(cx, cz, .7); propCrate(cx + .45, cz + .45, .45); }
    }
    if (!hasPillars && !isStairs && !isStart && R() < .45) { for (let k = 0; k < 6; k++) { const x = ri(r.x + 1, r.x + r.w - 2), z = ri(r.y + 1, r.y + r.h - 2); if (block(x, z, x * T, z * T, .45)) { propBrazier(x * T, z * T); break; } } }
    if (isStart && west.length === 0 && north.length) { const x = north[0]; wallFace(x * T, r.y * T - 1, 0, 1, 'torch'); }
    // floor junk
    for (let k = 0; k < ri(3, 7); k++) { const x = rr(r.x - .4, r.x + r.w - .6) * T, z = rr(r.y - .4, r.y + r.h - .6) * T; if (Math.hypot(x - sx * T, z - sz * T) < 1.6) continue; R() < .55 ? propRubble(x, z, ri(2, 6)) : propBones(x, z); }
    for (let k = 0; k < ri(0, 2); k++) propPuddle(rr(r.x, r.x + r.w - 1) * T, rr(r.y, r.y + r.h - 1) * T);
    // spike trap
    if (!isStart && !isStairs && R() < .4) { for (let k = 0; k < 8; k++) { const x = ri(r.x, r.x + r.w - 1), z = ri(r.y, r.y + r.h - 1); if (free(x, z)) { makeSpikes(x, z); reserved[idx(x, z)] = 1; break; } } }
    // rune / moonlight
    if (r === runeRoom) { const x = r.cx * T, z = r.cy * T; const m = new THREE.Mesh(gPlane(1.9, 1.9), runeMat); m.rotation.x = -PI / 2; m.position.set(x, .03, z); G.L.group.add(m); G.L.runes.push(m); G.L.lights.push({ x, y: 1.1, z, base: 9, cold: true, seed: R() * 100, pulse: true, d: 0 }); }
    if (r === moonRoom) { const x = rr(r.x + .5, r.x + r.w - 1.5) * T, z = rr(r.y + .5, r.y + r.h - 1.5) * T; addMoon(x, z); }
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
function addMoon(x: number, z: number): void {
  const d = new THREE.Mesh(gPlane(1.9, 1.9), grateMat); d.rotation.x = -PI / 2; d.position.set(x, .025, z); G.L.group.add(d);
  const b = new THREE.Mesh(gBox(1.5, 7, 1.5), beamMat); b.position.set(x + .6, 3.5, z - .3); b.rotation.set(-.08, 0, .16); G.L.group.add(b);
  G.L.lights.push({ x, y: 3.4, z, base: 13, cold: true, seed: R() * 100, steady: true, d: 0 });
  G.L.moons.push({ x, z });
}
