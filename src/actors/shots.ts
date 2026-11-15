/**
 * Monster projectiles (SPEC §8.3, §8.5): skeleton archers' arrows (melee to-hit minus the flight penalty, blockable)
 * and spiders' webs (magic to-hit, slow the hero by 40 % for 2 s).
 */
import * as THREE from 'three';
import { SFX } from '../audio/sfx';
import { R, rr } from '../core/math';
import { G } from '../game/state';
import type { Monster, Shot } from '../game/types';
import { gBox, glowSprite, mesh } from '../render/geometry';
import { MAT } from '../render/materials';
import { fxNorm } from '../render/particles';
import { monsterHitChance, roll } from '../rules/combat';
import { arrowPenalty, monsterMagicHit } from '../rules/monsters';
import { circleBlocked } from '../world/nav';
import { heroBlocks, hitHero } from './combat';

const SPEED = { arrow: 11, web: 7 }, LIFE = 1.6;
/** Slow applied by a web (s). */
export const WEB_SLOW = 2;

export function fireShot(m: Monster, kind: Shot['kind']): void {
  const h = G.hero, dir = Math.atan2(h.x - m.x, h.z - m.z), o = new THREE.Group();
  if (kind === 'arrow') {
    mesh(gBox(.025, .025, .62), MAT.wood, 0, 0, 0, o, false);
    mesh(gBox(.06, .012, .1), MAT.bone, 0, 0, -.27, o, false);
    SFX.bow();
  } else {
    glowSprite(0xd8d8c8, .5, o, 0, 0, 0);
    SFX.squeal('spider', .6);
  }
  o.position.set(m.x + Math.sin(dir) * .5, kind === 'arrow' ? 1.1 : .6, m.z + Math.cos(dir) * .5);
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
    s.x += s.dx * s.speed * dt; s.z += s.dz * s.speed * dt;
    s.mesh.position.x = s.x; s.mesh.position.z = s.z;
    let done = s.flight > LIFE || circleBlocked(s.x, s.z, .06, true);
    if (!done && !h.dead && h.descend <= 0 && Math.hypot(h.x - s.x, h.z - s.z) < h.r + .25) {
      done = true;
      const m = s.from, clvl = h.stats.clvl;
      if (s.kind === 'arrow') {
        const chance = Math.max(5, monsterHitChance(m.roll.toHit, m.roll.mlvl, clvl, h.d.ac) - arrowPenalty(s.flight));
        if (!roll(R, chance)) SFX.whiff();
        else if (!heroBlocks(m, s.dx, s.dz)) hitHero(m, s.dx, s.dz);
      } else if (roll(R, monsterMagicHit(m.roll.mlvl, clvl))) {
        h.slowT = WEB_SLOW;
        for (let k = 0; k < 14; k++) fxNorm.spawn(h.x + rr(-.3, .3), rr(.2, 1.2), h.z + rr(-.3, .3), rr(-.5, .5), rr(-.2, .4), rr(-.5, .5), rr(.8, 1.4), .8, .8, .75, rr(.05, .09), 1, 1.5, 0);
      }
    }
    if (done) { dispose(s); L.shots.splice(i, 1); }
  }
}
