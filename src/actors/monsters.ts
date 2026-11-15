import * as THREE from 'three';
import { buildBat, buildSpider } from './models/beasts';
import { buildRat } from './models/rat';
import { buildHumanoid } from './models/skeleton';
import { buildSlime } from './models/slime';
import { SFX, vol } from '../audio/sfx';
import { R, TAU, rr } from '../core/math';
import { G } from '../game/state';
import { fxNorm } from '../render/particles';
import type { MonsterType, MonsterBody, Monster, MonsterCommon } from '../game/types';
import { rollMonster, type FamilyId } from '../rules/monsters';

/** Movement and attack timing per monster type (combat numbers come from `rules/monsters`). */
export const MON: Record<MonsterType, MonsterBody> = {
  skeleton: { r: .36, speed: 2.5, reach: 1.2, windup: .45, cd: 1.35, mass: 1 },
  rat: { r: .34, speed: 3.6, reach: 1.0, windup: .32, cd: 1.1, mass: .6 },
  slime: { r: .44, speed: 1.9, reach: 1.05, windup: .5, cd: 1.5, mass: 1.5 },
  zombie: { r: .38, speed: 1.4, reach: 1.1, windup: .8, cd: 1.8, mass: 1.4 },
  fallen: { r: .3, speed: 3.1, reach: 1.0, windup: .35, cd: 1.2, mass: .7 },
  // windup is the 0.6 s telegraphed bow draw
  archer: { r: .36, speed: 2.3, reach: 1.1, windup: .6, cd: 2.0, mass: 1 },
  bat: { r: .3, speed: 4.0, reach: 1.0, windup: .25, cd: 1.2, mass: .4 },
  // windup is the leap
  spider: { r: .45, speed: 3.6, reach: 1.2, windup: .45, cd: 1.8, mass: 1.3 },
  boss: { r: .75, speed: 2.1, reach: 2.0, windup: .75, cd: 1.8, mass: 6 },
};

/** Colour multipliers per subtype tier (D1-style recolours, SPEC §8.3). */
const TIER_TINT: Record<FamilyId, readonly [number, number, number, number]> = {
  rat: [0xffffff, 0xa0a090, 0x90b070, 0xd0a0a0],
  skeleton: [0xffffff, 0xd8c8a8, 0xffa070, 0x9a88c8],
  archer: [0xffffff, 0xd8c8a8, 0xffa070, 0x9a88c8],
  slime: [0xffffff, 0xa0a060, 0xd0ff80, 0x8080a0],
  zombie: [0xffffff, 0xc8b8a0, 0xa0b070, 0x606060],
  fallen: [0xffffff, 0x8090ff, 0x90ff90, 0x606070],
  bat: [0xffffff, 0xa0a0ff, 0x707070, 0xc080ff],
  spider: [0xffffff, 0xa08060, 0x80c060, 0xc04040],
};

/**
 * `rise` > 0 spawns the monster climbing out of the floor for that many seconds. `small` makes the half-size slime
 * that a tier-2+ slime splits into (half HP, does not split again).
 */
export function spawnMonster(type: MonsterType, x: number, z: number, rise = 0, small = false): Monster {
  const st = MON[type];
  const roll = rollMonster(type === 'boss' ? 'skeleton' : type, G.L.depth, type === 'boss', rr(.9, 1.1));
  if (small) roll.hp = Math.max(1, Math.round(roll.hp / 2));
  const common: MonsterCommon = {
    st, roll, x, z, kx: 0, kz: 0, vx: 0, vz: 0, face: R() * TAU, r: small ? st.r * .6 : st.r, mass: st.mass, speed: st.speed * rr(.9, 1.1),
    hp: roll.hp, maxHp: roll.hp, state: 'idle', t: 0, lunge: 0, cd: rr(.3, 1), aware: false, home: { x, z }, wt: rr(0, 2), wx: x, wz: z,
    flash: 0, phase: R() * 10, rise, dead: false, deadT: 0, remove: false, eyeBoost: 0, ignoreT: 0, staggerT: 0, stoneT: 0, stoneCols: null,
    slowT: 0, fleeT: 0, webCd: rr(1, 3), small,
  };
  const m: Monster = type === 'rat' ? { type, ...buildRat(), ...common }
    : type === 'slime' ? { type, ...buildSlime(), ...common }
    : type === 'bat' ? { type, ...buildBat(), ...common }
    : type === 'spider' ? { type, ...buildSpider(), ...common }
    : { type, ...buildHumanoid(type), ...common };
  if (type !== 'boss') {
    const tint = new THREE.Color(TIER_TINT[type][roll.tier]);
    for (const mt of m.mats) if (mt instanceof THREE.MeshStandardMaterial) mt.color.multiply(tint);
  }
  if (type === 'spider') m.root.scale.setScalar(1 + .12 * roll.tier);
  if (small) m.root.scale.multiplyScalar(.6);
  m.root.position.set(x, rise > 0 ? -1.6 * (type === 'boss' ? 2 : 1) : 0, z); m.root.rotation.y = m.face;
  G.L.group.add(m.root); G.L.monsters.push(m);
  if (rise > 0) { for (let k = 0; k < 14; k++) fxNorm.spawn(x + rr(-.5, .5), .1, z + rr(-.5, .5), rr(-.6, .6), rr(.5, 1.4), rr(-.6, .6), rr(.6, 1.1), .16, .14, .13, rr(.12, .22), 1.2, 1.5, 3); SFX.rise(vol(x, z)); }
  return m;
}

/** A family for one spawn, uniform among the level's families (SPEC §8.2). */
export const levelFamily = (): FamilyId => G.L.families[Math.floor(R() * G.L.families.length)];
