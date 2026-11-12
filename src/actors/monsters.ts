import { buildRat } from './models/rat';
import { buildSkeleton } from './models/skeleton';
import { buildSlime } from './models/slime';
import { SFX, vol } from '../audio/sfx';
import { R, TAU, rr } from '../core/math';
import { G } from '../game/state';
import { fxNorm } from '../render/particles';
import type { MonsterType, MonsterBody, Monster, MonsterCommon } from '../game/types';
import { rollMonster } from '../rules/monsters';

export const MON: Record<MonsterType, MonsterBody> = {
  skeleton: { r: .36, speed: 2.5, reach: 1.2, windup: .45, cd: 1.35, mass: 1 },
  rat: { r: .34, speed: 3.6, reach: 1.0, windup: .32, cd: 1.1, mass: .6 },
  slime: { r: .44, speed: 1.9, reach: 1.05, windup: .5, cd: 1.5, mass: 1.5 },
  boss: { r: .75, speed: 2.1, reach: 2.0, windup: .75, cd: 1.8, mass: 6 }
};
/** `rise` > 0 spawns the monster climbing out of the floor for that many seconds. */
export function spawnMonster(type: MonsterType, x: number, z: number, rise = 0): Monster {
  const st = MON[type];
  const roll = rollMonster(type === 'boss' ? 'skeleton' : type, G.L.depth, type === 'boss', rr(.9, 1.1));
  const common: MonsterCommon = { st, roll, x, z, kx: 0, kz: 0, vx: 0, vz: 0, face: R() * TAU, r: st.r, mass: st.mass, speed: st.speed * rr(.9, 1.1), hp: roll.hp, maxHp: roll.hp, state: 'idle', t: 0, lunge: 0, cd: rr(.3, 1), aware: false, home: { x, z }, wt: rr(0, 2), wx: x, wz: z, flash: 0, phase: R() * 10, rise, dead: false, deadT: 0, remove: false, eyeBoost: 0, ignoreT: 0, staggerT: 0 };
  const m: Monster = type === 'rat' ? { type, ...buildRat(), ...common }
    : type === 'slime' ? { type, ...buildSlime(), ...common }
    : { type, ...buildSkeleton(type === 'boss'), ...common };
  m.root.position.set(x, rise > 0 ? -1.6 * (type === 'boss' ? 2 : 1) : 0, z); m.root.rotation.y = m.face;
  G.L.group.add(m.root); G.L.monsters.push(m);
  if (rise > 0) { for (let k = 0; k < 14; k++) fxNorm.spawn(x + rr(-.5, .5), .1, z + rr(-.5, .5), rr(-.6, .6), rr(.5, 1.4), rr(-.6, .6), rr(.6, 1.1), .16, .14, .13, rr(.12, .22), 1.2, 1.5, 3); SFX.rise(vol(x, z)); }
  return m;
}
export function monsterTypeFor(depth: number): MonsterType { const r = R(); if (r < .42 - Math.min(depth, 8) * .03) return 'rat'; if (r < .78) return 'skeleton'; return 'slime'; }
