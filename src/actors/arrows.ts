/** Hero arrows (SPEC §3.3): unlimited ammunition, D1 arrow to-hit with its distance penalty. */
import * as THREE from 'three';
import { SFX } from '../audio/sfx';
import { R, rr } from '../core/math';
import { G } from '../game/state';
import type { Arrow, Hero } from '../game/types';
import { gBox, mesh } from '../render/geometry';
import { MAT } from '../render/materials';
import { fxNorm } from '../render/particles';
import { CLASS } from '../rules/classes';
import { arrowHitChance, roll, rollDamage } from '../rules/combat';
import { circleBlocked } from '../world/nav';
import { damageMonster, missMonster } from './combat';
import { findTarget } from './spells';

/** World speed of a D1 arrow speed of 32 [OURS]. */
const BASE_SPEED = 12;
const RANGE = 16, LIFE = 1.6;
/** Aim cone for bows: a little wider than spells, arrows are the Thief's main attack. */
const BOW_CONE = 40 * Math.PI / 180;

/** Direction the hero would shoot now: the nearest aware monster in front, else straight ahead. */
export function bowAim(h: Hero): number {
  const t = findTarget(h, RANGE, h.face, BOW_CONE);
  return t ? Math.atan2(t.x - h.x, t.z - h.z) : h.face;
}

export function fireArrow(h: Hero, dir: number): void {
  const o = new THREE.Group();
  mesh(gBox(.025, .025, .62), MAT.wood, 0, 0, 0, o, false);
  mesh(gBox(.06, .012, .1), MAT.bone, 0, 0, -.27, o, false);
  mesh(gBox(.04, .04, .07), MAT.iron, 0, 0, .31, o, false);
  o.position.set(h.x + Math.sin(dir) * .5, 1.05, h.z + Math.cos(dir) * .5);
  o.rotation.y = dir;
  G.L.group.add(o);
  G.L.arrows.push({
    x: o.position.x, z: o.position.z, dx: Math.sin(dir), dz: Math.cos(dir),
    speed: BASE_SPEED * CLASS[h.stats.cls].arrowSpeed(h.stats.clvl) / 32, flight: 0, mesh: o, passed: new Set(),
  });
  SFX.bow();
}

/** Removes every arrow in flight (respawn). */
export function clearArrows(): void {
  for (const a of G.L.arrows) G.L.group.remove(a.mesh);
  G.L.arrows.length = 0;
}

/**
 * Moves arrows; each strikes the first monster it reaches. A miss lets the arrow fly on (D1). D1's distance penalty
 * counts flight time in 1/20 s ticks.
 */
export function updateArrows(dt: number): void {
  const L = G.L, h = G.hero;
  for (let i = L.arrows.length - 1; i >= 0; i--) {
    const a: Arrow = L.arrows[i];
    a.flight += dt;
    a.x += a.dx * a.speed * dt; a.z += a.dz * a.speed * dt;
    a.mesh.position.x = a.x; a.mesh.position.z = a.z;
    let done = a.flight > LIFE || circleBlocked(a.x, a.z, .06, true);
    if (done && a.flight <= LIFE) for (let k = 0; k < 4; k++) fxNorm.spawn(a.x, 1, a.z, rr(-1, 1), rr(.5, 1.5), rr(-1, 1), rr(.3, .5), .3, .25, .2, .04, 9, 1, 1);
    for (const m of L.monsters) {
      if (done) break;
      if (m.dead || m.rise > 0 || a.passed.has(m) || Math.hypot(m.x - a.x, m.z - a.z) > m.r + .15) continue;
      a.passed.add(m);
      if (!roll(R, arrowHitChance(h.stats.cls, h.d, h.stats.clvl, m.roll.ac, a.flight * 20))) { missMonster(m, a.dx, a.dz); continue; }
      const hit = rollDamage(R, h.d);
      damageMonster(m, hit.dmg, a.dx, a.dz, true, hit.crit);
      h.life = Math.min(h.d.maxLife, h.life + hit.dmg * h.d.lifeSteal / 100);
      h.mana = Math.min(h.d.maxMana, h.mana + hit.dmg * h.d.manaSteal / 100);
      done = true;
    }
    if (done) { L.group.remove(a.mesh); L.arrows.splice(i, 1); }
  }
}
