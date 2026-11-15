/**
 * Mini-boss mechanics (SPEC §9), layered on the generic monster AI:
 * - Bone Warden: raises two skeletons at 66 % and 33 % HP.
 * - Gorger: telegraphed straight-line charge; running into a wall stuns it for 1 s.
 * - Brood Mother: web cone; egg sacs hatch Cave Spiders every 8 s; below 50 % HP her leaps leave poison pools.
 * - Ember Lich: teleports between rune circles (vulnerable for 2 s after), slow homing firebolts, summons Burning Dead.
 */
import * as THREE from 'three';
import { SFX, vol } from '../audio/sfx';
import { PI, R, TAU, rr } from '../core/math';
import { G, addShake } from '../game/state';
import type { Monster } from '../game/types';
import { gCircle, mesh } from '../render/geometry';
import { fxAdd, fxNorm, impact } from '../render/particles';
import { toast } from '../ui/store';
import { circleBlocked, clearLine } from '../world/nav';
import { monsterStrike } from './combat';
import { spawnMonster } from './monsters';
import { fireShot } from './shots';

/** Movement the boss AI imposes for this frame instead of the generic chase. */
export interface BossMove { mvx: number; mvz: number; want: number | null; speedMul: number }

const CHARGE = { aim: .8, run: 1.3, speed: 11, stun: 1, cd: [5, 8] as const };
/** `maxAlive`: living hatchlings across all sacs; level spiders do not count. */
const HATCH = { every: 8, count: 3, maxAlive: 12 };
const hatchlings = new Set<Monster>();
const POOL = { r: 1.6, life: 6, poison: 1 };
const LICH = { vuln: 2, tp: [6, 8] as const, bolt: [2, 2.6] as const, summonEvery: 12, maxSummons: 4 };

/** A free floor spot 1.2–3 m from (x, z) with a clear line back to it, or (x, z) itself. */
function spotNear(x: number, z: number): { x: number; z: number } {
  for (let k = 0; k < 16; k++) {
    const a = R() * TAU, r = rr(1.2, 3), px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r;
    if (!circleBlocked(px, pz, .45, false) && clearLine(x, z, px, pz, .3, false)) return { x: px, z: pz };
  }
  return { x, z };
}

function raise(type: 'skeleton' | 'spider', x: number, z: number, tier: number, rise: number): Monster {
  const p = spotNear(x, z), m = spawnMonster(type, p.x, p.z, { tier, rise });
  m.aware = true; m.state = 'chase';
  return m;
}

/**
 * Per-frame boss logic, run after the generic timers. Returns a movement override, or null to let the generic AI
 * (chase, melee windup) run.
 */
export function bossTick(m: Monster, dt: number, d: number, dx: number, dz: number, heroOK: boolean): BossMove | null {
  const b = m.boss; if (!b) return null;
  const h = G.hero, los = heroOK && clearLine(m.x, m.z, h.x, h.z, .1, false);
  switch (b.id) {
    case 'warden': {
      const f = m.hp / m.maxHp, due = f <= .33 ? 2 : f <= .66 ? 1 : 0;
      while (b.raised < due) {
        b.raised++;
        toast('THE BONES STIR', 'THE WARDEN CALLS ITS GUARD');
        for (let k = 0; k < 2; k++) raise('skeleton', m.x, m.z, 0, 1 + k * .3);
      }
      return null;
    }
    case 'gorger': {
      b.chargeCd -= dt;
      if (m.state === 'stun') { b.charge = null; return null; }
      const c = b.charge;
      if (!c) {
        if (m.aware && los && m.state === 'chase' && b.chargeCd <= 0 && d > 3 && d < 10 && clearLine(m.x, m.z, h.x, h.z, m.r * .8, false)) {
          b.charge = { phase: 'aim', t: CHARGE.aim, dx: dx / d, dz: dz / d };
          m.eyeBoost = 1; SFX.squeal('gorger', vol(m.x, m.z));
          return { mvx: 0, mvz: 0, want: Math.atan2(dx, dz), speedMul: 0 };
        }
        return null;
      }
      c.t -= dt;
      if (c.phase === 'aim') {
        // telegraph: stamps in place, tracking the hero, red sparks at its feet
        c.dx = dx / d; c.dz = dz / d; m.eyeBoost = 1;
        if (R() < .5) fxAdd.spawn(m.x + rr(-.5, .5), .1, m.z + rr(-.5, .5), rr(-.5, .5), rr(.5, 1.5), rr(-.5, .5), rr(.3, .6), 1.6, .25, .1, rr(.05, .1), 2, .5, 1);
        if (c.t <= 0) { c.phase = 'run'; c.t = CHARGE.run; }
        return { mvx: 0, mvz: 0, want: Math.atan2(c.dx, c.dz), speedMul: 0 };
      }
      const end = (): void => { b.charge = null; b.chargeCd = rr(...CHARGE.cd); };
      if (circleBlocked(m.x + c.dx * (m.r + .25), m.z + c.dz * (m.r + .25), .3, false)) {
        // slammed into a wall: dazed for 1 s
        end(); m.state = 'stun'; m.t = CHARGE.stun; m.vx = m.vz = 0;
        addShake(.6); impact(m.x + c.dx * m.r, 1, m.z + c.dz * m.r, 0xffd0a0, 3); SFX.hit('gorger', vol(m.x, m.z));
        return { mvx: 0, mvz: 0, want: null, speedMul: 0 };
      }
      if (heroOK && d < m.r + h.r + .35) {
        end(); monsterStrike(m, c.dx, c.dz); h.kx += c.dx * 6; h.kz += c.dz * 6; addShake(.4);
        m.state = 'recover'; m.t = .6; m.vx *= .2; m.vz *= .2;
        return { mvx: 0, mvz: 0, want: null, speedMul: 0 };
      }
      if (c.t <= 0) end();
      if (R() < .7) fxNorm.spawn(m.x + rr(-.4, .4), .1, m.z + rr(-.4, .4), rr(-.5, .5), rr(.3, 1), rr(-.5, .5), rr(.4, .7), .2, .17, .15, rr(.12, .2), .5, 1.5, 3);
      return { mvx: c.dx, mvz: c.dz, want: Math.atan2(c.dx, c.dz), speedMul: CHARGE.speed / m.speed };
    }
    case 'broodmother':
      b.coneCd -= dt;
      if (m.aware && los && m.state === 'chase' && b.coneCd <= 0 && d < 8) {
        for (const s of [-.36, -.18, 0, .18, .36]) fireShot(m, 'web', s);
        b.coneCd = rr(6, 8);
      }
      return null;
    case 'lich': {
      b.tpCd -= dt; b.vulnT -= dt; b.boltCd -= dt; b.summonCd -= dt;
      // warded: a faint ember glow while it takes reduced damage
      if (b.vulnT <= 0 && m.flash <= 0) for (const mt of m.flashMats) mt.emissive.setRGB(.1 + .05 * Math.sin(G.now * 6), .025, 0);
      if (!m.aware || !heroOK || m.state !== 'chase') return null;
      const runes = G.L.bossRunes;
      if (runes.length > 1 && (b.tpCd <= 0 || (d < 2.2 && b.tpCd < 4))) {
        let best = -1, bd = -1;
        runes.forEach((r, i) => { const rd = Math.hypot(r.x - h.x, r.z - h.z); if (i !== b.rune && rd > bd) { bd = rd; best = i; } });
        burst(m.x, m.z);
        b.rune = best; m.x = runes[best].x; m.z = runes[best].z; m.vx = m.vz = m.kx = m.kz = 0;
        burst(m.x, m.z);
        b.vulnT = LICH.vuln; b.tpCd = rr(...LICH.tp); b.boltCd = Math.max(b.boltCd, .8);
        for (const mt of m.flashMats) mt.emissive.setRGB(0, 0, 0);
        SFX.squeal('lich', vol(m.x, m.z));
        return { mvx: 0, mvz: 0, want: Math.atan2(h.x - m.x, h.z - m.z), speedMul: 0 };
      }
      if (b.summonCd <= 0) {
        b.summonCd = LICH.summonEvery;
        const summons = G.L.monsters.filter(o => !o.dead && o.type === 'skeleton' && Math.hypot(o.x - m.x, o.z - m.z) < 14).length;
        if (summons < LICH.maxSummons) for (let k = 0; k < 2; k++) raise('skeleton', m.x, m.z, 2, 1 + k * .3);
      }
      if (los && b.boltCd <= 0 && d < 12) { fireShot(m, 'firebolt'); b.boltCd = rr(...LICH.bolt); }
      // keeps its ground and casts; melee only when the hero is close
      return d > 2.4 ? { mvx: 0, mvz: 0, want: Math.atan2(dx, dz), speedMul: 0 } : null;
    }
  }
}

function burst(x: number, z: number): void {
  for (let k = 0; k < 30; k++) fxAdd.spawn(x + rr(-.4, .4), rr(.2, 2), z + rr(-.4, .4), rr(-1.5, 1.5), rr(.5, 3), rr(-1.5, 1.5), rr(.4, .8), 1.6, .5, .15, rr(.06, .12), 3, .6, 1);
}

/** Called when a boss's attack windup ends (the strike lands or misses). */
export function bossStrike(m: Monster): void {
  if (m.type === 'warden') { addShake(.3); impact(m.x + Math.sin(m.face) * 1.6, .2, m.z + Math.cos(m.face) * 1.6, 0xffb070, 2.4); }
  // below half HP the Brood Mother's leaps land in poison
  if (m.type === 'broodmother' && m.hp < m.maxHp / 2) addPool(m.x + Math.sin(m.face) * .8, m.z + Math.cos(m.face) * .8);
}

let poolMat: THREE.MeshBasicMaterial | null = null;
function addPool(x: number, z: number): void {
  poolMat ??= new THREE.MeshBasicMaterial({ color: 0x4a8a20, transparent: true, opacity: .55, depthWrite: false });
  const o = mesh(gCircle(1), poolMat.clone(), x, .03, z, G.L.group, false); o.rotation.x = -PI / 2; o.scale.setScalar(POOL.r);
  G.L.hazards.push({ x, z, r: POOL.r, life: POOL.life, mesh: o });
}

/** Poison pools: the hero standing in one is poisoned; pools fade out at the end of their life. */
export function updateHazards(dt: number): void {
  const L = G.L, h = G.hero;
  for (let i = L.hazards.length - 1; i >= 0; i--) {
    const p = L.hazards[i];
    p.life -= dt;
    (p.mesh.material as THREE.MeshBasicMaterial).opacity = .55 * Math.min(1, p.life);
    if (R() < .3) fxAdd.spawn(p.x + rr(-p.r, p.r) * .7, .05, p.z + rr(-p.r, p.r) * .7, 0, rr(.3, .8), 0, rr(.5, .9), .4, 1.2, .2, rr(.04, .08), 0, 1, 1);
    if (!h.dead && h.descend <= 0 && Math.hypot(h.x - p.x, h.z - p.z) < p.r + h.r * .5) h.poisonT = Math.max(h.poisonT, POOL.poison);
    if (p.life <= 0) { L.group.remove(p.mesh); (p.mesh.material as THREE.Material).dispose(); L.hazards.splice(i, 1); }
  }
}

/** Egg sacs hatch Cave Spiders every 8 s while the Brood Mother is alive and has seen the hero. */
export function updateEggSac(m: Monster, dt: number): void {
  const mother = G.L.monsters.find(o => o.type === 'broodmother' && !o.dead);
  const pulse = 1 + Math.sin(G.now * (mother?.aware ? 5 : 2) + m.phase) * .05;
  m.body.scale.set(pulse, 2 - pulse, pulse);
  const fl = Math.max(0, m.flash) / .14; for (const mt of m.flashMats) mt.emissive.setRGB(.19 + fl * 1.4, .16 + fl * 1.3, .06 + fl);
  m.flash -= dt;
  if (!mother?.aware) { m.cd = HATCH.every * .5; return; }
  m.cd -= dt;
  if (m.cd > 0) return;
  m.cd = HATCH.every;
  for (const s of hatchlings) if (s.dead || !G.L.monsters.includes(s)) hatchlings.delete(s);
  if (hatchlings.size >= HATCH.maxAlive) return;
  for (let k = 0; k < 30; k++) fxAdd.spawn(m.x, .5, m.z, rr(-2, 2), rr(1, 3), rr(-2, 2), rr(.4, .8), .8, .75, .4, rr(.05, .1), 10, .5, 1);
  SFX.squeal('spider', vol(m.x, m.z));
  for (let k = 0; k < HATCH.count; k++) hatchlings.add(raise('spider', m.x, m.z, 0, .4 + k * .15));
}
