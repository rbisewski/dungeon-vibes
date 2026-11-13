/** Gold and items on the floor: spawning with D1's toss arc, meshes and pixel sprites. SPEC.md §6.3, §10.4. */
import * as THREE from 'three';
import { itemIcon, CELL_PX } from '../art/itemIcons';
import { PI, R, TAU, rr } from '../core/math';
import { G } from '../game/state';
import { gCyl, gSph, mesh } from '../render/geometry';
import { MAT, POTION_MAT } from '../render/materials';
import { addItem, type Item } from '../rules/inventory';
import type { Pickup } from '../game/types';
import { SFX } from '../audio/sfx';
import { fxAdd } from '../render/particles';
import { toast } from '../ui/store';
import { circleBlocked } from './nav';
import type { Drop } from '../rules/loot';
import { POTIONS } from '../rules/potions';

/** Ground sprite size per backpack cell, in world units. */
const SPRITE_PER_CELL = .36;

function toss(p: { kind: 'coin'; amount: number } | { kind: 'item'; item: Item; discarded: boolean }, o: THREE.Object3D, x: number, z: number, speed = 1): void {
  const a = R() * TAU, s = rr(.8, 2.4) * speed;
  o.position.set(x, .5, z);
  G.L.group.add(o);
  G.L.pickups.push({ ...p, o, x, z, y: .5, vx: Math.cos(a) * s, vz: Math.sin(a) * s, vy: rr(2.5, 4.5), t: 0 });
}

/** A gold pile: up to 6 coins share the amount. */
export function spawnGold(amount: number, x: number, z: number): void {
  const n = Math.min(6, Math.max(1, Math.ceil(amount / 10)));
  for (let k = 0; k < n; k++) {
    const share = Math.floor(amount / n) + (k < amount % n ? 1 : 0);
    if (share <= 0) continue;
    const o = mesh(gCyl(.11, .11, .035, 10), MAT.gold, 0, 0, 0, null, false); o.rotation.x = PI / 2;
    toss({ kind: 'coin', amount: share }, o, x, z);
  }
}

const spriteMats = new Map<HTMLCanvasElement, THREE.SpriteMaterial>();
function itemSprite(it: Item): THREE.Sprite {
  const icon = itemIcon(it);
  let mat = spriteMats.get(icon.canvas);
  if (!mat) {
    const tex = new THREE.CanvasTexture(icon.canvas);
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    mat = new THREE.SpriteMaterial({ map: tex, color: 0xd8d0c8, transparent: true, alphaTest: .5 });
    spriteMats.set(icon.canvas, mat);
  }
  const s = new THREE.Sprite(mat);
  s.center.set(.5, 0);
  s.scale.set(icon.w / CELL_PX * SPRITE_PER_CELL, icon.h / CELL_PX * SPRITE_PER_CELL, 1);
  return s;
}

/** Potions keep their 3D flask; everything else lies on the floor as its pixel icon. */
function itemObject(it: Item): THREE.Object3D {
  if (it.kind !== 'potion') return itemSprite(it);
  const o = new THREE.Group(), p = POTIONS[it.potion], full = p.life === 'full' || p.mana === 'full';
  mesh(gSph(.12, 8, 6), POTION_MAT[it.potion], 0, 0, 0, o, false);
  mesh(gCyl(.04, .04, .1, 6), full ? MAT.gold : MAT.iron, 0, .14, 0, o, false);
  if (full) o.scale.setScalar(1.35);
  return o;
}

/** Puts an item on the floor at (x, z). `discarded` marks items the player dropped (picked up only with E). */
export function spawnItem(it: Item, x: number, z: number, discarded = false): void {
  toss({ kind: 'item', item: it, discarded }, itemObject(it), x, z, discarded ? .4 : 1);
}

export function spawnDrops(drops: Drop[], x: number, z: number): void {
  for (const d of drops) d.kind === 'gold' ? spawnGold(d.amount, x, z) : spawnItem(d.item, x, z);
}

/** Walk-over distance. A pickup stuck inside a prop (on a chest, against a barrel) is reachable from arm's length. */
export const pickupReach = (p: Pickup): number => (circleBlocked(p.x, p.z, .12, true) ? 1.4 : .55);

/** Moves a pickup into the hero's gold or inventory. Returns false (leaving it on the floor) when there is no room. */
export function collect(p: Pickup): boolean {
  const h = G.hero;
  if (p.kind === 'coin') {
    h.gold += p.amount; SFX.coin();
    for (let k = 0; k < 6; k++) fxAdd.spawn(p.x, p.y + .2, p.z, rr(-.6, .6), rr(1, 2), rr(-.6, .6), rr(.3, .5), 1.6, 1.2, .4, .045, 3, 1, 1);
  } else {
    if (!addItem(h.inv, p.item)) return false;
    if (p.item.kind === 'equip') SFX.pickup(); else SFX.potion();
  }
  G.L.group.remove(p.o);
  G.L.pickups.splice(G.L.pickups.indexOf(p), 1);
  return true;
}

/** `E`: picks up the nearest item within 1.5 m, including ones the player dropped. */
export function pickupNearest(): void {
  const h = G.hero;
  if (h.dead || h.descend > 0) return;
  let best: Pickup | null = null, bd = 1.5;
  for (const p of G.L.pickups) { const d = Math.hypot(p.x - h.x, p.z - h.z); if (d < bd && p.t > .3) { bd = d; best = p; } }
  if (best && !collect(best)) toast(best.kind === 'item' && best.item.kind === 'potion' ? 'BELT AND PACK FULL' : 'BACKPACK FULL');
}
