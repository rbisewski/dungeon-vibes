/**
 * Monster projectiles (SPEC §8.3, §8.5, §9): skeleton archers' arrows (melee to-hit minus the flight penalty,
 * blockable), spiders' webs (magic to-hit, slow the hero by 40 % for 2 s) and the Ember Lich's slow homing firebolts
 * (magic to-hit, blockable).
 */
import * as THREE from 'three';
import { SFX } from '../audio/sfx';
import { R, rr, wrapA } from '../core/math';
import { G } from '../game/state';
import type { Monster, Shot } from '../game/types';
import { gBox, glowSprite, mesh } from '../render/geometry';
import { MAT } from '../render/materials';
import { fxAdd, fxNorm } from '../render/particles';
import { monsterHitChance, roll } from '../rules/combat';
import { arrowPenalty, monsterMagicHit } from '../rules/monsters';
import { circleBlocked } from '../world/nav';
import { heroBlocks, hitHero } from './combat';

const SPEED: Record<Shot['kind'], number> = { arrow: 11, web: 7, firebolt: 5 };
const LIFE: Record<Shot['kind'], number> = { arrow: 1.6, web: 1.6, firebolt: 4 };
/** Firebolt homing turn rate (rad/s): slow enough to sidestep. */
const HOMING = 1.6;
/** Slow applied by a web (s). */
export const WEB_SLOW = 2;

/** Fires from `m` toward the hero; `spread` turns the shot off the direct line (rad). */
export function fireShot(m: Monster, kind: Shot['kind'], spread = 0): void {
  const h = G.hero, dir = Math.atan2(h.x - m.x, h.z - m.z) + spread, o = new THREE.Group();
  if (kind === 'arrow') {
    mesh(gBox(.025, .025, .62), MAT.wood, 0, 0, 0, o, false);
    mesh(gBox(.06, .012, .1), MAT.bone, 0, 0, -.27, o, false);
    SFX.bow();
  } else if (kind === 'web') {
    glowSprite(0xd8d8c8, .5, o, 0, 0, 0);
    if (spread === 0) SFX.squeal('spider', .6);
  } else {
    glowSprite(0xff7020, .9, o, 0, 0, 0); glowSprite(0xffe0a0, .35, o, 0, 0, 0);
    SFX.cast();
  }
  o.position.set(m.x + Math.sin(dir) * (m.r + .3), kind === 'arrow' ? 1.1 : kind === 'firebolt' ? 1.3 : .6, m.z + Math.cos(dir) * (m.r + .3));
  o.rotation.y = dir;
  G.L.group.add(o);
  G.L.shots.push({ kind, from: m, x: o.position.x, z: o.position.z, dx: Math.sin(dir), dz: Math.cos(dir), speed: SPEED[kind], flight: 0, mesh: o });
}

function dispose(s: Shot): void {
  G.L.group.remove(s.mesh);
  for (const c of s.mesh.children) if (c instanceof THREE.Sprite) c.material.dispose();
}

export function clearShots(): void {
  for (const s of G.L.shots) dispose(s);
  G.L.shots.length = 0;
}

/** Moves monster projectiles; each stops at a wall or on reaching the hero, hit or not. */
export function updateShots(dt: number): void {
  const L = G.L, h = G.hero;
  for (let i = L.shots.length - 1; i >= 0; i--) {
    const s = L.shots[i];
    s.flight += dt;
    if (s.kind === 'firebolt') {
      const cur = Math.atan2(s.dx, s.dz), turn = Math.max(-HOMING * dt, Math.min(HOMING * dt, wrapA(Math.atan2(h.x - s.x, h.z - s.z) - cur)));
      s.dx = Math.sin(cur + turn); s.dz = Math.cos(cur + turn);
      if (R() < .6) fxAdd.spawn(s.x, 1.3, s.z, rr(-.3, .3), rr(0, .5), rr(-.3, .3), rr(.3, .5), 1.6, .6, .2, rr(.05, .09), 2, .5, 1);
    }
    s.x += s.dx * s.speed * dt; s.z += s.dz * s.speed * dt;
    s.mesh.position.x = s.x; s.mesh.position.z = s.z;
    let done = s.flight > LIFE[s.kind] || circleBlocked(s.x, s.z, .06, true);
    if (!done && !h.dead && h.descend <= 0 && Math.hypot(h.x - s.x, h.z - s.z) < h.r + .25) {
      done = true;
      const m = s.from, clvl = h.stats.clvl;
      if (s.kind === 'arrow') {
        const chance = Math.max(5, monsterHitChance(m.roll.toHit, m.roll.mlvl, clvl, h.d.ac) - arrowPenalty(s.flight));
        if (!roll(R, chance)) SFX.whiff();
        else if (!heroBlocks(m, s.dx, s.dz)) hitHero(m, s.dx, s.dz);
      } else if (s.kind === 'firebolt') {
        if (!roll(R, monsterMagicHit(m.roll.mlvl, clvl))) SFX.whiff();
        else if (!heroBlocks(m, s.dx, s.dz)) hitHero(m, s.dx, s.dz);
        for (let k = 0; k < 16; k++) fxAdd.spawn(s.x, 1.2, s.z, rr(-2, 2), rr(0, 2.5), rr(-2, 2), rr(.3, .6), 1.8, .7, .2, rr(.05, .1), 4, .6, 1);
      } else if (roll(R, monsterMagicHit(m.roll.mlvl, clvl))) {
        h.slowT = WEB_SLOW;
        for (let k = 0; k < 14; k++) fxNorm.spawn(h.x + rr(-.3, .3), rr(.2, 1.2), h.z + rr(-.3, .3), rr(-.5, .5), rr(-.2, .4), rr(-.5, .5), rr(.8, 1.4), .8, .8, .75, rr(.05, .09), 1, 1.5, 0);
      }
    }
    if (done) { dispose(s); L.shots.splice(i, 1); }
  }
}
