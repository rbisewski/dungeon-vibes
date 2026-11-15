/**
 * Death (SPEC §11): everything the hero carries falls where they died, under a grave marker with a beacon. The hero
 * then wakes in town (`wakeInTown`, game/travel).
 */
import * as THREE from 'three';
import { recompute } from '../actors/heroStats';
import { R, rr } from '../core/math';
import { gBox, gCyl, glowSprite, gSph, mesh } from '../render/geometry';
import { MAT } from '../render/materials';
import { EQUIP_SLOTS, type EquipItem } from '../rules/inventory';
import { toast } from '../ui/store';
import { spawnGold, spawnItem } from '../world/groundItems';
import { G } from './state';
import type { Grave, Pickup } from './types';

function graveMarker(x: number, z: number): { marker: THREE.Group; beacon: THREE.Sprite } {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  mesh(gSph(.13, 8, 6), MAT.bone, .05, .12, 0, g);
  for (let k = 0; k < 5; k++) {
    const b = mesh(k % 2 ? gCyl(.035, .03, .34, 5) : gBox(.3, .04, .06), MAT.bone, rr(-.3, .3), .04, rr(-.3, .3), g);
    b.rotation.set(R() * 3, R() * 3, R() * 3);
  }
  // A cold beacon drawn over walls, so the pile can be found from anywhere on screen.
  const beacon = glowSprite(0x6a9aff, 1.4, g, 0, 1.1, 0);
  beacon.material.depthTest = false;
  beacon.renderOrder = 10;
  G.L.group.add(g);
  return { marker: g, beacon };
}

/** Everything carried (gear, backpack, belt, gold) falls in a pile at the hero's feet. */
export function dropBelongings(): void {
  const h = G.hero, inv = h.inv, x = h.x, z = h.z, pickups: Pickup[] = [];
  for (const s of EQUIP_SLOTS) {
    const it: EquipItem | null = inv.equip[s];
    if (it) { pickups.push(spawnItem(it, x, z, false, s)); inv.equip[s] = null; }
  }
  for (const p of inv.pack.items) pickups.push(spawnItem(p.item, x, z, false));
  inv.pack.items = [];
  inv.belt.forEach((it, i) => { if (it) { pickups.push(spawnItem(it, x, z, false)); inv.belt[i] = null; } });
  if (h.gold > 0) { pickups.push(...spawnGold(h.gold, x, z, .5)); h.gold = 0; }
  recompute(h);
  if (pickups.length) addGrave(x, z, pickups);
}

/** Marks `pickups` as a grave pile at (x, z): bone marker, beacon and light (also used when loading a save). */
export function addGrave(x: number, z: number, pickups: Pickup[]): void {
  const { marker, beacon } = graveMarker(x, z);
  const light = { x, y: 1.4, z, base: 9, cold: true, seed: R() * 100, steady: true, d: 0 };
  G.L.lights.push(light);
  G.L.graves.push({ x, z, marker, beacon, light, pickups });
}

/** Removes markers whose pile has been picked up completely; pulses the beacons of the rest. */
export function updateGraves(): void {
  const L = G.L;
  for (let i = L.graves.length - 1; i >= 0; i--) {
    const g: Grave = L.graves[i];
    g.pickups = g.pickups.filter(p => L.pickups.includes(p));
    g.beacon.material.opacity = .55 + .3 * Math.sin(G.now * 3);
    if (g.pickups.length) continue;
    L.group.remove(g.marker);
    g.beacon.material.dispose();
    L.lights.splice(L.lights.indexOf(g.light), 1);
    L.graves.splice(i, 1);
    toast('BELONGINGS RECOVERED');
  }
}
