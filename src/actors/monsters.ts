import { rimLit } from '../render/materials';
import * as THREE from 'three';
import { buildBat, buildEggSac, buildSpider } from './models/beasts';
import { buildRat } from './models/rat';
import { buildHumanoid } from './models/skeleton';
import { buildSlime } from './models/slime';
import { SFX, vol } from '../audio/sfx';
import { R, TAU, rr } from '../core/math';
import { G } from '../game/state';
import { fxNorm } from '../render/particles';
import type { BossState, EliteInfo, MonsterType, MonsterBody, Monster, MonsterCommon } from '../game/types';
import { BOSSES, bossFor, bossName, type BossId } from '../rules/bosses';
import { FAMILY_IDS, rollMonster, tierFor, type FamilyId, type MonsterRoll } from '../rules/monsters';
import { ELITE, eliteRoll, type EliteMod } from '../rules/elites';
import { glowSprite } from '../render/geometry';

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
  warden: { r: .75, speed: 2.1, reach: 2.0, windup: .75, cd: 1.8, mass: 6 },
  // a fast brute; the charge is handled by the boss AI
  gorger: { r: .7, speed: 3.2, reach: 1.8, windup: .55, cd: 1.5, mass: 6 },
  broodmother: { r: 1.0, speed: 3.0, reach: 2.0, windup: .6, cd: 1.8, mass: 6 },
  // mostly stands and casts; teleports instead of walking away
  lich: { r: .55, speed: 1.3, reach: 1.6, windup: .6, cd: 2.0, mass: 4 },
  eggsac: { r: .45, speed: 0, reach: 0, windup: 1, cd: 1, mass: 99 },
};

const isBoss = (t: MonsterType): t is BossId => t in BOSSES;
const isFamily = (t: MonsterType): t is FamilyId => (FAMILY_IDS as readonly string[]).includes(t);

function newBossState(id: BossId): BossState {
  const b = bossFor(G.L.depth), name = bossName(id, b?.id === id && b.ascended);
  switch (id) {
    case 'warden': return { id, name, raised: 0 };
    // ready to charge on first sight
    case 'gorger': return { id, name, chargeCd: 0, charge: null };
    case 'broodmother': return { id, name, coneCd: 4 };
    case 'lich': return { id, name, tpCd: rr(5, 7), vulnT: 0, boltCd: 1.5, summonCd: 6, rune: 0 };
  }
}

function rollFor(type: MonsterType, tier: number | undefined, lvlBonus = 0): MonsterRoll {
  const depth = G.L.depth + lvlBonus, hpVar = rr(.9, 1.1);
  if (isBoss(type)) return rollMonster(BOSSES[type].family, depth, true, hpVar);
  if (type === 'eggsac') {
    // [OURS] three times a Cave Spider's HP; it never attacks
    const r = rollMonster('spider', depth, false, hpVar, 0);
    return { ...r, hp: r.hp * 3, dmgMin: 0, dmgMax: 0, ac: 0, baseXp: Math.round(r.baseXp / 2) };
  }
  // an elite leader's +5 mlvl does not change its subtype tier
  return rollMonster(type, depth, false, hpVar, tier ?? tierFor(type, G.L.depth));
}

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

export interface SpawnOpts {
  /** > 0: the monster climbs out of the floor for that many seconds. */
  rise?: number;
  /** The half-size slime a tier-2+ slime splits into (half HP, does not split again). */
  small?: boolean;
  /** Subtype tier instead of the depth's (boss summons). */
  tier?: number;
  /** Elite pack member (SPEC §8.4); the leader is rolled at mlvl + 5. */
  elite?: EliteInfo;
}

/** Aura colour under elite pack members, per modifier. */
const ELITE_AURA: Record<EliteMod, number> = { fast: 0x60ff90, stoneskin: 0xc0c0c0, vampiric: 0xff3040, berserker: 0xff8020, spellcaster: 0x6a8aff };
/** Fast elites: movement ×1.5, windup and attack cooldown ×0.7 [OURS]. */
const FAST = { speed: 1.5, timing: .7 };

export function spawnMonster(type: MonsterType, x: number, z: number, opts: SpawnOpts = {}): Monster {
  const { rise = 0, small = false, elite } = opts, fast = elite?.mod === 'fast';
  const st = fast ? { ...MON[type], windup: MON[type].windup * FAST.timing, cd: MON[type].cd * FAST.timing } : MON[type];
  let roll = rollFor(type, opts.tier, elite?.leader ? ELITE.lvlBonus : 0);
  if (elite) roll = eliteRoll(roll, elite.mod, elite.leader);
  if (small) roll.hp = Math.max(1, Math.round(roll.hp / 2));
  const common: MonsterCommon = {
    st, roll, x, z, kx: 0, kz: 0, vx: 0, vz: 0, face: R() * TAU, r: small ? st.r * .6 : st.r, mass: st.mass, speed: st.speed * rr(.9, 1.1) * (fast ? FAST.speed : 1),
    hp: roll.hp, maxHp: roll.hp, state: 'idle', t: 0, lunge: 0, cd: rr(.3, 1), aware: false, home: { x, z }, wt: rr(0, 2), wx: x, wz: z,
    flash: 0, phase: R() * 10, rise, dead: false, deadT: 0, remove: false, eyeBoost: 0, ignoreT: 0, staggerT: 0, stoneT: 0, stoneCols: null,
    slowT: 0, fleeT: 0, webCd: rr(1, 3), small, boss: isBoss(type) ? newBossState(type) : null, genId: -1, elite: elite ?? null,
  };
  const m: Monster = type === 'rat' ? { type, ...buildRat(), ...common }
    : type === 'slime' ? { type, ...buildSlime(), ...common }
    : type === 'bat' ? { type, ...buildBat(), ...common }
    : type === 'spider' || type === 'broodmother' ? { type, ...buildSpider(type === 'broodmother'), ...common }
    : type === 'eggsac' ? { type, ...buildEggSac(), ...common }
    : { type, ...buildHumanoid(type), ...common };
  if (isFamily(type)) {
    const tint = new THREE.Color(TIER_TINT[type][roll.tier]);
    for (const mt of m.mats) if (mt instanceof THREE.MeshStandardMaterial) mt.color.multiply(tint);
  }
  for (const mt of m.mats) if (mt instanceof THREE.MeshStandardMaterial) rimLit(mt);
  if (type === 'spider') m.root.scale.setScalar(1 + .12 * roll.tier);
  if (type === 'broodmother') m.root.scale.setScalar(2.3);
  if (small) m.root.scale.multiplyScalar(.6);
  if (elite) {
    if (elite.leader) m.root.scale.multiplyScalar(1.25);
    const aura = glowSprite(ELITE_AURA[elite.mod], elite.leader ? 1.8 : 1.1, m.root, 0, .1, 0);
    m.mats.push(aura.material);
  }
  m.root.position.set(x, rise > 0 ? -1.6 * (m.boss ? 2 : 1) : 0, z); m.root.rotation.y = m.face;
  G.L.group.add(m.root); G.L.monsters.push(m);
  if (rise > 0) { for (let k = 0; k < 14; k++) fxNorm.spawn(x + rr(-.5, .5), .1, z + rr(-.5, .5), rr(-.6, .6), rr(.5, 1.4), rr(-.6, .6), rr(.6, 1.1), .16, .14, .13, rr(.12, .22), 1.2, 1.5, 3); SFX.rise(vol(x, z)); }
  return m;
}

