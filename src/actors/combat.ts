import * as THREE from 'three';
import { SFX, vol } from '../audio/sfx';
import { PI, R, TAU, pick, ri, rr } from '../core/math';
import { G, addShake } from '../game/state';
import { gBox, gCircle, gCyl, gSph, mesh } from '../render/geometry';
import { MAT, POTION_MAT } from '../render/materials';
import { fxAdd, fxNorm, impact } from '../render/particles';
import { CLASS } from '../rules/classes';
import { blockChance, monsterHitChance, roll, staggers } from '../rules/combat';
import { POTIONS, rollPotion, type PotionId } from '../rules/potions';
import { toast } from '../ui/store';
import { computeField } from '../world/nav';
import type { Chest, Monster } from '../game/types';
import { awardKill, heroHasShield } from './heroStats';

/** Trap damage scales with depth (spikes and blades hit heroes and monsters alike). */
export const trapDamage = (): number => ri(5, 10) + 2 * G.L.depth;

export function damageHero(dmg: number, nx: number, nz: number): void {
  const h = G.hero; if (h.dead || h.invuln > 0 || h.descend > 0) return;
  h.life -= dmg; h.invuln = .5; h.flash = .2; h.kx += nx * 5; h.kz += nz * 5; addShake(.35);
  // Chip damage below 5 % of max life does not interrupt the hero.
  if (dmg >= .05 * h.d.maxLife) h.flinch = CLASS[h.stats.cls].recover;
  SFX.hurt();
  for (let k = 0; k < 10; k++) fxNorm.spawn(h.x + rr(-.2, .2), .9, h.z + rr(-.2, .2), nx * 2 + rr(-1.2, 1.2), rr(.5, 2.2), nz * 2 + rr(-1.2, 1.2), rr(.4, .7), .35, .03, .02, rr(.06, .1), 9, .5, 1);
  if (h.life <= 0) { h.life = 0; h.dead = true; h.deadT = 0; toast('YOU DIED', 'THE TORCH GUTTERS...'); }
}

/** A monster's blow lands on the hero's position: roll to-hit against AC, then the shield block, then damage. */
export function monsterStrike(m: Monster, nx: number, nz: number): void {
  const h = G.hero; if (h.dead || h.invuln > 0 || h.descend > 0) return;
  const s = h.stats, r = m.roll;
  if (!roll(R, monsterHitChance(r.toHit, r.mlvl, s.clvl, h.d.ac))) { SFX.whiff(); return; }
  // D1: a shield blocks only while standing still or swinging.
  const canBlock = heroHasShield() && (h.atkT >= 0 || Math.hypot(h.vx, h.vz) < .6);
  if (canBlock && roll(R, blockChance(s.cls, h.d, s.clvl, r.mlvl))) {
    SFX.block(); h.kx += nx * 2; h.kz += nz * 2;
    impact(h.x - nx * .35, 1.0, h.z - nz * .35, 0xbfd8ff, 1.2);
    for (let k = 0; k < 10; k++) fxAdd.spawn(h.x - nx * .35, 1.0, h.z - nz * .35, -nx * rr(1, 3) + rr(-1, 1), rr(.5, 2), -nz * rr(1, 3) + rr(-1, 1), rr(.15, .3), 1.2, 1.4, 1.8, rr(.03, .05), 9, 1, 1);
    return;
  }
  damageHero(ri(r.dmgMin, r.dmgMax), nx, nz);
}

/** Hero attack roll that failed: the monster notices and is nudged, but takes no damage. */
export function missMonster(m: Monster, nx: number, nz: number): void {
  m.aware = true;
  const kb = m.type === 'boss' ? .3 : 1.5 / m.mass; m.kx += nx * kb; m.kz += nz * kb;
  SFX.whiff();
}

/**
 * Applies damage to a monster. Only hits of at least mlvl + 3 interrupt it (bosses at most once per 3 s).
 * `byHero` grants experience on the kill.
 */
export function damageMonster(m: Monster, dmg: number, nx: number, nz: number, byHero: boolean, crit = false): void {
  m.hp -= dmg; m.flash = .14; m.aware = true;
  const kb = (m.type === 'boss' ? 1.2 : 7 / m.mass) * (crit ? 1.6 : 1); m.kx += nx * kb; m.kz += nz * kb;
  if (staggers(dmg, m.roll.mlvl) && (m.type !== 'boss' || m.staggerT <= 0)) {
    m.state = 'stun'; m.t = .3;
    if (m.type === 'boss') m.staggerT = 3;
  }
  const hx = m.x - nx * m.r, hz = m.z - nz * m.r, hy = m.type === 'rat' ? .4 : m.type === 'slime' ? .45 : m.type === 'boss' ? 1.6 : .9;
  impact(hx, hy, hz, crit ? 0xffffff : m.type === 'slime' ? 0xb0ff60 : 0xffe0a0, (m.type === 'boss' ? 2 : 1.4) * (crit ? 1.8 : 1));
  for (let k = 0; k < (crit ? 30 : 14); k++) fxAdd.spawn(hx, hy, hz, nx * rr(1, 4) + rr(-2, 2), rr(.5, 3.5), nz * rr(1, 4) + rr(-2, 2), rr(.2, .45), 1.6, 1.1, .5, rr(.04, .07), 9, 1, 1);
  if (m.type === 'slime') for (let k = 0; k < 10; k++) fxAdd.spawn(hx, hy, hz, nx * 2 + rr(-2, 2), rr(1, 3), nz * 2 + rr(-2, 2), rr(.4, .8), .25, .7, .12, rr(.07, .12), 9, .5, 1);
  if (m.type === 'rat') for (let k = 0; k < 8; k++) fxNorm.spawn(hx, hy, hz, nx * 2 + rr(-1.5, 1.5), rr(.5, 2.5), nz * 2 + rr(-1.5, 1.5), rr(.4, .7), .3, .03, .02, rr(.06, .1), 9, .5, 1);
  SFX.hit(m.type, vol(m.x, m.z));
  if (crit) SFX.crit();
  if (m.hp <= 0) killMonster(m, nx, nz, byHero);
}
const BONE_GEOS = () => [gCyl(.035, .03, .34, 5), gCyl(.03, .025, .28, 5), gBox(.28, .035, .18), gBox(.26, .08, .12), gSph(.13, 8, 6)];
function killMonster(m: Monster, nx: number, nz: number, byHero: boolean): void {
  m.dead = true; m.deadT = 0; G.hero.slain++; G.L.killsHere++;
  if (byHero) awardKill(m);
  SFX.death(m.type, vol(m.x, m.z)); addShake(m.type === 'boss' ? .8 : .25);
  if (m.type === 'skeleton' || m.type === 'boss') {
    const sc = m.type === 'boss' ? 1.8 : 1, gs = BONE_GEOS();
    for (let k = 0; k < (m.type === 'boss' ? 22 : 11); k++) {
      const g = k < 2 ? gs[4] : pick(gs.slice(0, 4)); const b = mesh(g, MAT.bone, m.x + rr(-.2, .2), rr(.3, 1.2) * sc, m.z + rr(-.2, .2), G.L.group);
      b.scale.setScalar(sc * rr(.8, 1.1)); b.rotation.set(R() * 3, R() * 3, R() * 3);
      G.L.debris.push({ o: b, vx: nx * rr(1, 3.5) + rr(-1.8, 1.8), vy: rr(2, 5), vz: nz * rr(1, 3.5) + rr(-1.8, 1.8), sx: rr(-9, 9), sz: rr(-9, 9), t: 0, life: rr(7, 10), rest: false });
    }
    for (let k = 0; k < 16; k++) fxNorm.spawn(m.x + rr(-.4, .4), rr(.1, .8), m.z + rr(-.4, .4), rr(-1, 1), rr(.2, 1.2), rr(-1, 1), rr(.6, 1.2), .2, .19, .17, rr(.14, .26), .3, 1.5, 3);
    if (m.type === 'boss') for (let k = 0; k < 40; k++) fxAdd.spawn(m.x, 1.5, m.z, rr(-4, 4), rr(1, 6), rr(-4, 4), rr(.6, 1.4), .8, .4, 1.6, rr(.06, .12), 6, .8, 1);
    m.remove = true;
  } else if (m.type === 'slime') {
    for (let k = 0; k < 40; k++) fxAdd.spawn(m.x, .4, m.z, rr(-3.5, 3.5), rr(1, 5), rr(-3.5, 3.5), rr(.5, 1.1), .25, .75, .12, rr(.07, .15), 12, .4, 1);
    const d = mesh(gCircle(1), MAT.goo, m.x, .02, m.z, G.L.group, false); d.rotation.x = -PI / 2; d.scale.set(rr(.6, .9), rr(.5, .8), 1); G.L.decals.push({ o: d, t: 0 });
    m.remove = true;
  }
  const coins = m.type === 'boss' ? 12 : R() < .45 ? ri(1, 3) : 0;
  for (let k = 0; k < coins; k++) spawnCoin(m.x, m.z);
  if (R() < (m.type === 'boss' ? 1 : .04)) spawnPotion(rollPotion(R, m.roll.mlvl), m.x, m.z);
  if (m.type === 'boss') toast('THE WARDEN FALLS');
}
/** Tosses a pickup out of (x, z) in a random direction. */
function toss(p: { kind: 'coin' } | { kind: 'potion'; potion: PotionId }, o: THREE.Object3D, x: number, z: number): void {
  const a = R() * TAU, s = rr(.8, 2.4);
  G.L.pickups.push({ ...p, o, x, z, y: .5, vx: Math.cos(a) * s, vz: Math.sin(a) * s, vy: rr(2.5, 4.5), t: 0 });
}
export function spawnCoin(x: number, z: number): void {
  const o = mesh(gCyl(.11, .11, .035, 10), MAT.gold, x, .5, z, G.L.group, false); o.rotation.x = PI / 2;
  toss({ kind: 'coin' }, o, x, z);
}
export function spawnPotion(potion: PotionId, x: number, z: number): void {
  const o = new THREE.Group(), full = POTIONS[potion].life === 'full' || POTIONS[potion].mana === 'full';
  mesh(gSph(.12, 8, 6), POTION_MAT[potion], 0, 0, 0, o, false);
  mesh(gCyl(.04, .04, .1, 6), full ? MAT.gold : MAT.iron, 0, .14, 0, o, false);
  if (full) o.scale.setScalar(1.35);
  o.position.set(x, .5, z); G.L.group.add(o);
  toss({ kind: 'potion', potion }, o, x, z);
}
export function openChest(c: Chest): void {
  if (c.open) return; c.open = true; SFX.chest();
  for (let k = 0; k < 24; k++) fxAdd.spawn(c.x, .6, c.z, rr(-1, 1), rr(1.5, 3.5), rr(-1, 1), rr(.6, 1.2), 1.6, 1.1, .35, rr(.04, .08), 4, .5, 1);
  for (let k = 0; k < Math.ceil(c.gold / 3); k++) spawnCoin(c.x, c.z);
  G.hero.gold += c.gold % 3;
  // D1: chests create items at ilvl 2·dlvl.
  if (c.potion) spawnPotion(rollPotion(R, 2 * G.L.depth), c.x, c.z);
  if (c.isKey) { G.hero.key = true; SFX.key(); toast('FOUND THE KEY', 'THE STAIR DOOR AWAITS'); if (c.glow) c.glow.visible = false; for (let k = 0; k < 30; k++) fxAdd.spawn(c.x, .8, c.z, rr(-1.2, 1.2), rr(2, 4), rr(-1.2, 1.2), rr(.8, 1.4), 1.8, 1.3, .4, rr(.05, .09), 2, .6, 2); }
}
export function unlockDoor(): void {
  const d = G.L.lockedDoor; if (!G.L.locked) return; G.L.locked = false; d.locked = false;
  G.L.tiles[d.tz * G.L.W + d.tx] = 3; G.hero.key = false; SFX.unlock(); toast('THE DOOR UNLOCKS'); if (d.glow) d.glow.visible = false;
  for (let k = 0; k < 20; k++) fxAdd.spawn(d.x, 1.2, d.z, rr(-1.5, 1.5), rr(.5, 2.5), rr(-1.5, 1.5), rr(.4, .9), 1.6, 1.2, .5, rr(.04, .07), 6, 1, 1);
  computeField();
}
