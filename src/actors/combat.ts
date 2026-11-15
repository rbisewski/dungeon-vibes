import { addDamageNumber } from '../ui/DamageNumbers';
import { SFX, vol } from '../audio/sfx';
import { PI, R, pick, ri, rr } from '../core/math';
import { G, addShake } from '../game/state';
import { gBox, gCircle, gCyl, gSph, mesh } from '../render/geometry';
import { MAT } from '../render/materials';
import { fxAdd, fxNorm, impact } from '../render/particles';
import { CLASS } from '../rules/classes';
import { blockChance, monsterHitChance, roll, staggers } from '../rules/combat';
import { monsterDrops, rollBookSpell, rollItem } from '../rules/loot';
import { bossDrops } from '../rules/bosses';
import { eliteDrops } from '../rules/elites';
import { newBook } from '../rules/inventory';
import { spawnDrops, spawnGold, spawnItem } from '../world/groundItems';
import { toast } from '../ui/store';
import { computeField } from '../world/nav';
import type { Chest, Monster } from '../game/types';
import { awardKill, recompute } from './heroStats';
import { spawnMonster } from './monsters';

/** Trap damage scales with depth (spikes and blades hit heroes and monsters alike). */
export const trapDamage = (): number => ri(5, 10) + 2 * G.L.depth;

export function damageHero(dmg: number, nx: number, nz: number): void {
  const h = G.hero; if (h.dead || h.invuln > 0 || h.descend > 0) return;
  if (h.manaShield) {
    // D1 Mana Shield: damage comes out of mana, reduced by a third; whatever mana cannot cover hits life.
    const cost = dmg * 2 / 3;
    if (h.mana >= cost) { h.mana -= cost; dmg = 0; }
    else { dmg = Math.ceil((cost - h.mana) * 1.5); h.mana = 0; h.manaShield = false; toast('MANA SHIELD FADES'); }
    impact(h.x, 1, h.z, 0x6a9aff, 1.6);
    if (!dmg) { h.invuln = .5; SFX.block(); return; }
  }
  h.life -= dmg; h.invuln = .5; h.flash = .2; h.kx += nx * 5; h.kz += nz * 5; addShake(.35);
  addDamageNumber(h.x, 2, h.z, dmg, 'taken');
  // Chip damage below 5 % of max life does not interrupt the hero.
  if (dmg >= .05 * h.d.maxLife) h.flinch = CLASS[h.stats.cls].recover;
  SFX.hurt();
  for (let k = 0; k < 10; k++) fxNorm.spawn(h.x + rr(-.2, .2), .9, h.z + rr(-.2, .2), nx * 2 + rr(-1.2, 1.2), rr(.5, 2.2), nz * 2 + rr(-1.2, 1.2), rr(.4, .7), .35, .03, .02, rr(.06, .1), 9, .5, 1);
  if (h.life <= 0) killHero();
}

function killHero(): void {
  const h = G.hero;
  h.life = 0; h.dead = true; h.deadT = 0;
  toast('YOU DIED', 'THE TORCH GUTTERS...');
}

/** Life lost over time (poison): no flinch, invulnerability or Mana Shield. */
export function loseLife(amount: number): void {
  const h = G.hero;
  if (h.dead || h.descend > 0) return;
  h.life -= amount;
  if (h.life <= 0) killHero();
}

/**
 * D1 shield block: needs a usable shield and the hero standing still or swinging. On a block, plays the effect and
 * returns true.
 */
export function heroBlocks(m: Monster, nx: number, nz: number): boolean {
  const h = G.hero, s = h.stats;
  const canBlock = !!h.inv.equip.shield && h.gearOk.has(h.inv.equip.shield.uid) && (h.atkT >= 0 || Math.hypot(h.vx, h.vz) < .6);
  if (!canBlock || !roll(R, blockChance(s.cls, h.d, s.clvl, m.roll.mlvl))) return false;
  SFX.block(); h.kx += nx * 2; h.kz += nz * 2;
  impact(h.x - nx * .35, 1.0, h.z - nz * .35, 0xbfd8ff, 1.2);
  for (let k = 0; k < 10; k++) fxAdd.spawn(h.x - nx * .35, 1.0, h.z - nz * .35, -nx * rr(1, 3) + rr(-1, 1), rr(.5, 2), -nz * rr(1, 3) + rr(-1, 1), rr(.15, .3), 1.2, 1.4, 1.8, rr(.03, .05), 9, 1, 1);
  return true;
}

/** A monster's damage reaches the hero (after to-hit and block). Item damage reduction leaves at least 1 (D1). */
export function hitHero(m: Monster, nx: number, nz: number): void {
  const h = G.hero, r = m.roll, before = h.life;
  damageHero(Math.max(1, ri(r.dmgMin, r.dmgMax) - h.d.dmgTaken), nx, nz);
  if (h.life >= before) return;
  // From tier 2, spiders poison: 2 % of max life per second for 3 s.
  if (m.type === 'spider' && r.tier >= 2) { h.poisonT = 3; toast('POISONED'); }
  // Black Death: every hit costs 1 max life for good (D1).
  if (m.type === 'zombie' && r.tier >= 3) { h.lifeDrain++; recompute(h); }
  // Vampiric elites heal by the life they take (SPEC §8.4).
  if (m.elite?.mod === 'vampiric' && !m.dead) {
    m.hp = Math.min(m.maxHp, m.hp + (before - Math.max(0, h.life)));
    for (let k = 0; k < 10; k++) fxAdd.spawn(m.x + rr(-.3, .3), rr(.6, 1.6), m.z + rr(-.3, .3), 0, rr(.5, 1.2), 0, rr(.4, .7), 1.6, .15, .2, rr(.04, .07), -.5, .5, 1);
  }
}

/** A monster's blow lands on the hero's position: roll to-hit against AC, then the shield block, then damage. */
export function monsterStrike(m: Monster, nx: number, nz: number): void {
  const h = G.hero; if (h.dead || h.invuln > 0 || h.descend > 0) return;
  const r = m.roll;
  if (!roll(R, monsterHitChance(r.toHit, r.mlvl, h.stats.clvl, h.d.ac))) { SFX.whiff(); return; }
  if (heroBlocks(m, nx, nz)) return;
  hitHero(m, nx, nz);
  if (h.d.thorns > 0 && !m.dead) damageMonster(m, ri(1, 3 * h.d.thorns), -nx, -nz, true);
}

/** Hero attack roll that failed: the monster notices and is nudged, but takes no damage. */
export function missMonster(m: Monster, nx: number, nz: number): void {
  m.aware = true;
  const kb = m.boss ? .3 : 1.5 / m.mass; m.kx += nx * kb; m.kz += nz * kb;
  SFX.whiff();
}

/** [OURS] Share of damage the Ember Lich takes outside its 2 s vulnerability after a teleport (SPEC §9). */
export const LICH_WARDED = .25;

/**
 * Applies damage to a monster. Only hits of at least mlvl + 3 interrupt it (bosses at most once per 3 s).
 * `byHero` grants experience on the kill.
 */
export function damageMonster(m: Monster, dmg: number, nx: number, nz: number, byHero: boolean, crit = false): void {
  const warded = m.boss?.id === 'lich' && m.boss.vulnT <= 0;
  if (warded) dmg = Math.max(1, Math.round(dmg * LICH_WARDED));
  m.hp -= dmg; m.flash = .14; m.aware = true;
  if (byHero) addDamageNumber(m.x, m.boss ? 3.2 : 1.6, m.z, dmg, crit ? 'crit' : warded ? 'warded' : 'dealt');
  const kb = (m.boss ? 1.2 : 7 / m.mass) * (crit ? 1.6 : 1); m.kx += nx * kb; m.kz += nz * kb;
  if (staggers(dmg, m.roll.mlvl) && (!m.boss || m.staggerT <= 0)) {
    m.state = 'stun'; m.t = .3;
    if (m.boss) m.staggerT = 3;
  }
  const hx = m.x - nx * m.r, hz = m.z - nz * m.r, hy = m.type === 'rat' ? .4 : m.type === 'slime' || m.type === 'eggsac' ? .45 : m.boss ? 1.6 : .9;
  impact(hx, hy, hz, crit ? 0xffffff : warded ? 0xff7020 : m.type === 'slime' ? 0xb0ff60 : 0xffe0a0, (m.boss ? 2 : 1.4) * (crit ? 1.8 : 1));
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
  if (m.genId >= 0) G.L.killedGen.add(m.genId);
  if (byHero) awardKill(m);
  SFX.death(m.type, vol(m.x, m.z)); addShake(m.boss ? .8 : .25);
  if (m.type === 'skeleton' || m.type === 'archer' || m.type === 'warden' || m.type === 'lich') {
    const sc = m.boss ? 1.8 : 1, gs = BONE_GEOS();
    for (let k = 0; k < (m.boss ? 22 : 11); k++) {
      const g = k < 2 ? gs[4] : pick(gs.slice(0, 4)); const b = mesh(g, MAT.bone, m.x + rr(-.2, .2), rr(.3, 1.2) * sc, m.z + rr(-.2, .2), G.L.group);
      b.scale.setScalar(sc * rr(.8, 1.1)); b.rotation.set(R() * 3, R() * 3, R() * 3);
      G.L.debris.push({ o: b, vx: nx * rr(1, 3.5) + rr(-1.8, 1.8), vy: rr(2, 5), vz: nz * rr(1, 3.5) + rr(-1.8, 1.8), sx: rr(-9, 9), sz: rr(-9, 9), t: 0, life: rr(7, 10), rest: false });
    }
    for (let k = 0; k < 16; k++) fxNorm.spawn(m.x + rr(-.4, .4), rr(.1, .8), m.z + rr(-.4, .4), rr(-1, 1), rr(.2, 1.2), rr(-1, 1), rr(.6, 1.2), .2, .19, .17, rr(.14, .26), .3, 1.5, 3);
    if (m.boss) for (let k = 0; k < 40; k++) fxAdd.spawn(m.x, 1.5, m.z, rr(-4, 4), rr(1, 6), rr(-4, 4), rr(.6, 1.4), .8, .4, 1.6, rr(.06, .12), 6, .8, 1);
    m.remove = true;
  } else if (m.type === 'eggsac') {
    for (let k = 0; k < 30; k++) fxAdd.spawn(m.x, .4, m.z, rr(-2.5, 2.5), rr(1, 4), rr(-2.5, 2.5), rr(.5, 1), .8, .75, .4, rr(.06, .12), 12, .4, 1);
    m.remove = true;
  } else if (m.type === 'slime') {
    for (let k = 0; k < 40; k++) fxAdd.spawn(m.x, .4, m.z, rr(-3.5, 3.5), rr(1, 5), rr(-3.5, 3.5), rr(.5, 1.1), .25, .75, .12, rr(.07, .15), 12, .4, 1);
    const d = mesh(gCircle(1), MAT.goo, m.x, .02, m.z, G.L.group, false); d.rotation.x = -PI / 2; d.scale.set(rr(.6, .9), rr(.5, .8), 1); G.L.decals.push({ o: d, t: 0 });
    m.remove = true;
  }
  // Bosses drop their guaranteed set; bats never drop items (D1), gold is still possible; egg sacs drop nothing.
  if (m.boss) spawnDrops(bossDrops(R, m.boss.id, m.roll.mlvl, G.L.depth, G.loot), m.x, m.z);
  else if (m.elite?.leader) spawnDrops(eliteDrops(R, m.roll.mlvl, G.L.depth, G.loot), m.x, m.z);
  else if (m.type !== 'eggsac') spawnDrops(monsterDrops(R, m.roll.mlvl, G.L.depth, G.loot, m.type === 'bat'), m.x, m.z);
  // Fallen nearby flee for a moment (D1).
  for (const o of G.L.monsters) if (o.type === 'fallen' && !o.dead && o !== m && Math.hypot(o.x - m.x, o.z - m.z) < 6) o.fleeT = rr(1.5, 3);
  // From tier 2, slimes split into two small slimes.
  if (m.type === 'slime' && m.roll.tier >= 2 && !m.small) for (const s of [-1, 1]) {
    const c = spawnMonster('slime', m.x + s * .5, m.z, { small: true });
    c.aware = true; c.state = 'chase';
  }
  if (m.boss) toast(`${m.boss.name.toUpperCase()} FALLS`);
}
export function openChest(c: Chest): void {
  if (c.open) return; c.open = true; SFX.chest();
  for (let k = 0; k < 24; k++) fxAdd.spawn(c.x, .6, c.z, rr(-1, 1), rr(1.5, 3.5), rr(-1, 1), rr(.6, 1.2), 1.6, 1.1, .35, rr(.04, .08), 4, .5, 1);
  if (c.shelf) { c.lid.visible = false; spawnItem(newBook(rollBookSpell(R, 2 * G.L.depth)), c.x, c.z); return; }
  spawnGold(c.gold, c.x, c.z);
  // D1: chests create items at ilvl 2·dlvl.
  if (c.hasItem) spawnItem(rollItem(R, 2 * G.L.depth, G.L.depth, G.loot), c.x, c.z);
  if (c.isKey) { G.hero.key = true; SFX.key(); toast('FOUND THE KEY', 'THE STAIR DOOR AWAITS'); if (c.glow) c.glow.visible = false; for (let k = 0; k < 30; k++) fxAdd.spawn(c.x, .8, c.z, rr(-1.2, 1.2), rr(2, 4), rr(-1.2, 1.2), rr(.8, 1.4), 1.8, 1.3, .4, rr(.05, .09), 2, .6, 2); }
}
export function unlockDoor(): void {
  const d = G.L.lockedDoor; if (!G.L.locked || !d) return; G.L.locked = false; d.locked = false;
  G.L.tiles[d.tz * G.L.W + d.tx] = 3; G.hero.key = false; SFX.unlock(); toast('THE DOOR UNLOCKS'); if (d.glow) d.glow.visible = false;
  for (let k = 0; k < 20; k++) fxAdd.spawn(d.x, 1.2, d.z, rr(-1.5, 1.5), rr(.5, 2.5), rr(-1.5, 1.5), rr(.4, .9), 1.6, 1.2, .5, rr(.04, .07), 6, 1, 1);
  computeField();
}
