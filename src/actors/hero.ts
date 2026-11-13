import { damageMonster, missMonster, openChest, unlockDoor } from './combat';
import { drinkFromBelt, recompute, startingInventory } from './heroStats';
import { meleeHitChance, rollDamage, roll } from '../rules/combat';
import { CLASS } from '../rules/classes';
import { derive } from '../rules/stats';
import { autoDrinkSlot, heroAuto } from './heroAuto';
import { SFX } from '../audio/sfx';
import { manualActive, readInput, takeBeltPresses } from '../core/input';
import { PI, R, clamp, damp, lerp, wrapA } from '../core/math';
import { G, addShake } from '../game/state';
import { trailMat } from '../render/materials';
import { T } from '../world/consts';
import type { Hero, Monster } from '../game/types';
import { buildHero } from './models/hero-warrior';

/** Builds the hero model (added to the scene) with fresh run state. */
export function createHero(): Hero {
  const stats = { cls: 'warrior' as const, clvl: 1, xp: 0, unspent: 0, base: { ...CLASS.warrior.base } };
  const d = derive(stats);
  const h: Hero = {
    ...buildHero(),
    x: 0, z: 0, vx: 0, vz: 0, kx: 0, kz: 0, face: PI * 1.25, r: .36, mass: 2.5, rise: 0,
    stats, d, life: d.maxLife, mana: d.maxMana,
    gold: 0, inv: startingInventory(), key: false, slain: 0,
    cd: 0, atkT: -1, hitDone: false, invuln: 0, flinch: 0, flash: 0, drink: 0, phase: 0,
    path: null, pi: 0, goal: null, goalKey: '', goalT: 0, repath: 0, aiT: 0,
    dead: false, deadT: 0, descend: 0,
    stuckT: 0, stuck: 0, sx: 0, sz: 0, unstickT: 0, ux: 0, uz: 0, killsAtGoal: 0, waitTrap: false,
  };
  recompute(h);
  h.life = h.d.maxLife; h.mana = h.d.maxMana;
  return h;
}

function startAttack(): void { const h = G.hero; h.atkT = 0; h.hitDone = false; h.cd = h.d.attackTime; SFX.swing(); }
/** Mid-swing: every monster in the arc gets its own to-hit, damage and crit roll. */
function heroHitCheck(): void {
  const h = G.hero, s = h.stats; let any = false, crit = false;
  for (const m of G.L.monsters) {
    if (m.dead || m.rise > 0) continue;
    const dx = m.x - h.x, dz = m.z - h.z, d = Math.hypot(dx, dz) || .001;
    if (d > h.r + m.r + 1.0) continue;
    if (Math.abs(wrapA(Math.atan2(dx, dz) - h.face)) > 1.5 && d > h.r + m.r + .2) continue;
    if (!roll(R, meleeHitChance(s.cls, h.d, s.clvl, m.roll.ac))) { missMonster(m, dx / d, dz / d); continue; }
    const hit = rollDamage(R, h.d);
    damageMonster(m, hit.dmg, dx / d, dz / d, true, hit.crit);
    any = true; crit ||= hit.crit;
  }
  if (any) { G.hitstop = crit ? .11 : .055; addShake(crit ? .4 : .22); }
}
export function updateHero(dt: number): void {
  const h = G.hero;
  h.cd -= dt; h.invuln -= dt; h.flinch -= dt; h.flash -= dt;
  const fl = Math.max(0, h.flash) / .2;
  for (const m of h.flashMats) m.emissive.setRGB(fl * 1.2, fl * .15, fl * .1);
  if (h.dead) {
    h.deadT += dt; h.body.rotation.x = damp(h.body.rotation.x, -PI / 2, 8, dt); h.body.position.y = damp(h.body.position.y, .15, 8, dt);
    h.trail.visible = false;
    if (h.deadT > 2.4 && !G.transition) { G.transition = { t: 0, kind: 'death' }; }
    return;
  }
  if (h.descend > 0) {
    h.descend += dt; const k = Math.min(1, h.descend / 1.4);
    h.x = damp(h.x, G.L.stairs.x, 6, dt); h.z = G.L.stairs.z + .9 - k * 1.6; h.root.position.y = -k * 1.9; h.face = PI; walkAnim(dt, 1.6);
    h.root.position.x = h.x; h.root.position.z = h.z; h.root.rotation.y = h.face;
    return;
  }
  const inp = readInput(), manual = manualActive();
  let mx: number, mz: number, atk: boolean, faceT: number | null = null;
  if (manual) {
    mx = inp.mx; mz = inp.mz; atk = inp.atk; h.goal = null; h.path = null;
    if (atk && !mx && !mz) { let bm: Monster | null = null, bd = 2.8; for (const m of G.L.monsters) { if (m.dead || m.rise > 0) continue; const d = Math.hypot(m.x - h.x, m.z - h.z); if (d < bd) { bd = d; bm = m; } } if (bm) faceT = Math.atan2(bm.x - h.x, bm.z - h.z); }
  } else { const o = heroAuto(dt); mx = o.mx; mz = o.mz; atk = o.atk; faceT = o.face; }
  for (const slot of takeBeltPresses()) drinkFromBelt(slot);
  if (!manual && h.drink <= 0 && h.atkT < 0) { const slot = autoDrinkSlot(h); if (slot >= 0) drinkFromBelt(slot); }
  h.drink -= dt;
  if (atk && h.cd <= 0 && h.atkT < 0 && h.flinch <= 0) { if (faceT !== null) h.face = faceT; startAttack(); }
  const attacking = h.atkT >= 0;
  const sp = (manual ? 4.3 : 4.0) * (attacking ? .3 : 1) * (h.drink > 0 ? .5 : 1) * (h.flinch > 0 ? .3 : 1);
  h.vx = damp(h.vx, mx * sp, 14, dt); h.vz = damp(h.vz, mz * sp, 14, dt);
  h.x += (h.vx + h.kx) * dt; h.z += (h.vz + h.kz) * dt; h.kx *= Math.exp(-9 * dt); h.kz *= Math.exp(-9 * dt);
  const spd = Math.hypot(h.vx, h.vz);
  if (!attacking) { let want: number | null = null; if (faceT !== null && (spd < 1 || (h.goal && h.goal.kind === 'mon' && Math.hypot(h.goal.ref.x - h.x, h.goal.ref.z - h.z) < 3.5))) want = faceT; else if (spd > .3) want = Math.atan2(h.vx, h.vz); if (want !== null) h.face += wrapA(want - h.face) * Math.min(1, 14 * dt); }
  // attack anim
  if (attacking) {
    h.atkT += dt; const t = h.atkT;
    let sw: number, ax: number, wx: number, tw: number;
    if (t < .1) { const k = t / .1; sw = lerp(0, -1.7, k); ax = lerp(-.4, -1.45, k); wx = lerp(PI / 2, PI, k); tw = lerp(0, -.5, k); trailMat.uniforms.uA.value = 0; }
    else if (t < .22) { const k = 1 - Math.pow(1 - (t - .1) / .12, 2); sw = lerp(-1.7, 1.5, k); ax = -1.45; wx = PI; tw = lerp(-.5, .5, k); trailMat.uniforms.uA.value = 1; if (!h.hitDone && k > .4) { h.hitDone = true; heroHitCheck(); } }
    else { const k = Math.min(1, (t - .22) / .2); sw = lerp(1.5, 0, k); ax = lerp(-1.45, -.4, k); wx = lerp(PI, PI / 2, k); tw = lerp(.5, 0, k); trailMat.uniforms.uA.value = Math.max(0, 1 - k * 2.5); if (k >= 1) h.atkT = -1; }
    h.shR.rotation.y = sw; h.armR.rotation.x = ax; h.sword.rotation.x = wx; h.torso.rotation.y = tw;
    const ang = sw + tw; trailMat.uniforms.uCur.value = Math.atan2(-Math.cos(ang), Math.sin(ang));
    h.trail.visible = true;
  } else { h.trail.visible = false; h.shR.rotation.y = damp(h.shR.rotation.y, 0, 10, dt); h.torso.rotation.y = damp(h.torso.rotation.y, 0, 10, dt); }
  walkAnim(dt, spd);
  if (h.drink > 0) { h.armR.rotation.x = -2.2; h.shR.rotation.y = .6; }
  h.body.rotation.x = h.flinch > 0 ? -.35 * (h.flinch / .28) : damp(h.body.rotation.x, attacking ? .12 : 0, 10, dt);
  // interactions
  for (const c of G.L.chests) if (!c.open && Math.hypot(c.x - h.x, c.z - h.z) < 1.5) openChest(c);
  if (G.L.locked && h.key && Math.hypot(G.L.lockedDoor.x - h.x, G.L.lockedDoor.z - h.z) < 2.2) unlockDoor();
  if (!G.L.locked && Math.abs(h.x - G.L.stairs.x) < .85 && Math.abs(h.z - G.L.stairs.z) < .85) { h.descend = .001; SFX.descend(); G.transition = { t: 0, kind: 'descend' }; }
  const rid = G.L.roomId[clamp(Math.round(h.z / T), 0, G.L.H - 1) * G.L.W + clamp(Math.round(h.x / T), 0, G.L.W - 1)]; if (rid >= 0) G.L.rooms[rid].visited = true;
}
function walkAnim(dt: number, spd: number): void {
  const h = G.hero, amt = clamp(spd / 3.5, 0, 1);
  const prev = Math.sin(h.phase); h.phase += dt * (2 + spd * 2.6); const s = Math.sin(h.phase);
  if (amt > .3 && Math.sign(prev) !== Math.sign(s)) SFX.step(.8);
  h.legs[0].rotation.x = s * .7 * amt; h.legs[1].rotation.x = -s * .7 * amt;
  h.body.position.y = Math.abs(s) * .055 * amt + Math.sin(G.now * 2) * .008;
  if (h.atkT < 0 && h.drink <= 0) h.armR.rotation.x = damp(h.armR.rotation.x, -.35 - s * .35 * amt, 12, dt);
  h.armL.rotation.z = Math.sin(h.phase) * .09 * amt + Math.sin(G.now * 1.3) * .03;
  h.armL.rotation.x = -2.3 + Math.cos(h.phase * 2) * .06 * amt;
  h.torch.rotation.x = 2.3 - Math.cos(h.phase * 2) * .06 * amt;
  h.cloak.rotation.x = damp(h.cloak.rotation.x, -spd * .09, 6, dt) + Math.sin(G.now * 2.2) * .01;
  h.head.rotation.z = Math.sin(h.phase) * .04 * amt;
}
