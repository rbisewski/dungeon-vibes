import { WAR_CRY } from '../rules/skills';
import { unpetrify } from './spells';
import { monsterStrike } from './combat';
import { fireShot } from './shots';
import { bossStrike, bossTick, updateEggSac } from './bosses';
import { SFX, vol } from '../audio/sfx';
import { PI, R, TAU, clamp, damp, lerp, rr, wrapA } from '../core/math';
import { G } from '../game/state';
import { fxNorm } from '../render/particles';
import { BOSSES } from '../rules/bosses';
import { toast } from '../ui/store';
import { DX8, DZ8, T } from '../world/consts';
import { clearLine, fieldAt, navOK } from '../world/nav';
import type { Monster } from '../game/types';

/** Next tile centre downhill on the hero distance field (stairs excluded). */
function flowStep(m: Monster): { x: number; z: number } | null {
  const { W, H, dist, tiles } = G.L, tx = Math.round(m.x / T), tz = Math.round(m.z / T);
  if (tx < 0 || tz < 0 || tx >= W || tz >= H) return null;
  let best = -1, bd = dist[tz * W + tx]; if (!(bd < Infinity)) bd = 1e9;
  for (let k = 0; k < 8; k++) {
    const dx = DX8[k], dz = DZ8[k], nx = tx + dx, nz = tz + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
    const n = nz * W + nx; if (!navOK(n) || tiles[n] === 6) continue;
    if (dx && dz && (!navOK(tz * W + nx) || !navOK(nz * W + tx))) continue;
    if (dist[n] < bd) { bd = dist[n]; best = n; }
  }
  return best < 0 ? null : { x: (best % W) * T, z: Math.floor(best / W) * T };
}
export function updateMonsters(dt: number): void {
  const h = G.hero; let windups = 0;
  for (const m of G.L.monsters) if (m.state === 'windup') windups++;
  for (const m of G.L.monsters) {
    if (m.dead) {
      // Corpses that did not shatter (skeletons and slimes are removed when killed) fall over and sink away.
      m.deadT += dt;
      m.root.rotation.z = damp(m.root.rotation.z, PI / 2, 10, dt);
      if (m.type === 'bat') m.body.position.y = damp(m.body.position.y, .15, 8, dt);
      m.root.position.y = m.deadT > 1.4 ? -(m.deadT - 1.4) * .35 : m.type === 'rat' ? .1 : 0;
      if (m.deadT > 3) m.remove = true;
      continue;
    }
    m.ignoreT -= dt;
    if (m.rise > 0) { m.rise -= dt; m.root.position.y = -Math.max(0, m.rise) * 1.6 * (m.boss ? 2 : 1); m.root.position.x = m.x; m.root.position.z = m.z; if (R() < .5) fxNorm.spawn(m.x + rr(-.4, .4), .05, m.z + rr(-.4, .4), rr(-.3, .3), rr(.3, .9), rr(-.3, .3), rr(.5, .9), .15, .13, .12, rr(.1, .2), .3, 1.5, 3); continue; }
    if (m.stoneT > 0) {
      // Stone Curse: frozen in place, still takes damage.
      m.stoneT -= dt; m.vx = m.vz = m.kx = m.kz = 0;
      if (m.stoneT <= 0) unpetrify(m);
      continue;
    }
    if (m.type === 'eggsac') { updateEggSac(m, dt); continue; }
    m.cd -= dt; m.flash -= dt; m.staggerT -= dt; m.slowT -= dt; m.fleeT -= dt; m.webCd -= dt; m.eyeBoost = Math.max(0, m.eyeBoost - dt);
    const fl = Math.max(0, m.flash) / .14; for (const mt of m.flashMats) mt.emissive.setRGB(fl * 1.6, fl * 1.5, fl * 1.3);
    if (m.type === 'slime' && fl <= 0) m.flashMats[0].emissive.setHex(0x0e2a08);
    const dx = h.x - m.x, dz = h.z - m.z, d = Math.hypot(dx, dz) || .001, heroOK = !h.dead && h.descend <= 0;
    if (!m.aware && heroOK && ((d < 4 && fieldAt(m.x, m.z) < 4) || (d < 10 && clearLine(m.x, m.z, h.x, h.z, .05, false)))) { m.aware = true; m.eyeBoost = .6; SFX.squeal(m.type, vol(m.x, m.z)); if (m.boss) toast(m.boss.name.toUpperCase(), BOSSES[m.boss.id].title.toUpperCase()); }
    if (m.aware && (d > 24 || !heroOK)) { m.aware = false; m.state = 'idle'; }
    let mvx = 0, mvz = 0, want: number | null = null, speedMul = 1;
    const reach = m.st.reach + h.r, spidery = m.type === 'spider' || m.type === 'broodmother';
    const bm = m.boss ? bossTick(m, dt, d, dx, dz, heroOK) : null;
    if (bm) ({ mvx, mvz, want, speedMul } = bm);
    else switch (m.state) {
      case 'stun': m.t -= dt; if (m.t <= 0) m.state = m.aware ? 'chase' : 'idle'; break;
      case 'windup': m.t -= dt; want = Math.atan2(dx, dz);
        // Spider leap: the windup is a pounce toward the hero.
        if (spidery && d > reach * .8) { mvx = dx / d; mvz = dz / d; speedMul = 2.8; }
        if (m.t <= 0) {
        m.state = 'recover'; m.t = .4; m.lunge = spidery || m.type === 'archer' ? 0 : .15;
        const facing = Math.abs(wrapA(Math.atan2(dx, dz) - m.face)) < 1.3;
        if (m.type === 'archer') { if (facing && heroOK && clearLine(m.x, m.z, h.x, h.z, .1, false)) fireShot(m, 'arrow'); }
        else if (d <= reach + (spidery ? .4 : .25) && facing) monsterStrike(m, dx / d, dz / d);
        if (m.boss) bossStrike(m);
      } break;
      case 'recover': m.t -= dt; if (m.t <= 0) m.state = m.aware ? 'chase' : 'idle'; break;
      case 'idle':
        if (m.aware) { m.state = 'chase'; break; }
        m.wt -= dt;
        if (m.wt <= 0) { m.wt = rr(2, 5); const a = R() * TAU, r = rr(1, 4); const wx = m.home.x + Math.cos(a) * r, wz = m.home.z + Math.sin(a) * r; if (clearLine(m.x, m.z, wx, wz, m.r, false)) { m.wx = wx; m.wz = wz; } }
        { const ex = m.wx - m.x, ez = m.wz - m.z, ed = Math.hypot(ex, ez); if (ed > .3) { mvx = ex / ed; mvz = ez / ed; speedMul = .35; } }
        break;
      case 'chase': {
        if (!m.aware) { m.state = 'idle'; break; }
        // Fallen flee for a moment when a monster near them dies (D1).
        if (m.fleeT > 0) { mvx = -dx / d; mvz = -dz / d; want = Math.atan2(mvx, mvz); break; }
        const los = heroOK && d < 9 && clearLine(m.x, m.z, h.x, h.z, .1, false);
        if (m.type === 'archer' && los && d > 2.2) {
          // Keep 5–8 m: step back when closer, shoot after a telegraphed draw.
          want = Math.atan2(dx, dz);
          if (d < 5 && clearLine(m.x, m.z, m.x - dx / d * 1.2, m.z - dz / d * 1.2, m.r, false)) { mvx = -dx / d; mvz = -dz / d; }
          if (d <= 8.5 && m.cd <= 0 && windups < 3) { m.state = 'windup'; m.t = m.st.windup; m.cd = m.st.cd * rr(.85, 1.2); windups++; break; }
          if (d <= 8) break;
        }
        if (spidery && los) {
          if (m.type === 'spider' && d > 4.5 && d < 8 && m.webCd <= 0) { fireShot(m, 'web'); m.webCd = rr(4, 7); }
          if (d <= (m.boss ? 5.5 : 4.2) && d > reach * .92 && m.cd <= 0 && windups < 3) { m.state = 'windup'; m.t = m.st.windup; m.cd = m.st.cd * rr(.85, 1.2); windups++; SFX.squeal(m.type, vol(m.x, m.z) * .6); break; }
        }
        if (d <= reach * .92 && m.cd <= 0 && windups < 3 && heroOK) { m.state = 'windup'; m.t = m.st.windup; m.cd = m.st.cd * rr(.85, 1.2); windups++; if (m.type === 'rat' || m.type === 'skeleton') SFX.squeal(m.type, vol(m.x, m.z) * .5); break; }
        if (d > m.r + h.r + .25) {
          if (d < 9 && clearLine(m.x, m.z, h.x, h.z, m.r * .9, false)) { mvx = dx / d; mvz = dz / d; }
          else { const s = flowStep(m); if (s) { const ex = s.x - m.x, ez = s.z - m.z, ed = Math.hypot(ex, ez) || 1; mvx = ex / ed; mvz = ez / ed; } }
          if (m.type === 'bat') {
            // erratic flight: weave across the line of approach
            const w = Math.sin(G.now * 5 + m.phase * 3) * .9, bx = mvx - mvz * w, bz = mvz + mvx * w, bl = Math.hypot(bx, bz) || 1;
            mvx = bx / bl; mvz = bz / bl;
          }
        }
        want = Math.atan2(dx, dz);
        break;
      }
    }
    if (m.type === 'slime') speedMul *= .4 + Math.max(0, Math.sin(m.phase * 1.0)) * 1.4;
    if (m.slowT > 0) speedMul *= 1 - WAR_CRY.bossSlow;
    const sp = m.speed * speedMul;
    m.vx = damp(m.vx, mvx * sp, 10, dt); m.vz = damp(m.vz, mvz * sp, 10, dt);
    if (m.lunge > 0) { m.lunge -= dt; m.vx += Math.sin(m.face) * 3 * dt * 10; m.vz += Math.cos(m.face) * 3 * dt * 10; }
    m.x += (m.vx + m.kx) * dt; m.z += (m.vz + m.kz) * dt; m.kx *= Math.exp(-8 * dt); m.kz *= Math.exp(-8 * dt);
    const spd = Math.hypot(m.vx, m.vz);
    if (want === null && spd > .2) want = Math.atan2(m.vx, m.vz);
    if (want !== null) m.face += wrapA(want - m.face) * Math.min(1, (m.boss ? 5 : 10) * dt);
    animateMonster(m, dt, spd);
  }
  // remove finished
  for (let i = G.L.monsters.length - 1; i >= 0; i--) { const m = G.L.monsters[i]; if (m.remove) { G.L.group.remove(m.root); m.mats.forEach(x => x.dispose()); G.L.monsters.splice(i, 1); } }
}
function animateMonster(m: Monster, dt: number, spd: number): void {
  m.root.position.set(m.x, m.root.position.y, m.z); m.root.rotation.y = m.face;
  const amt = clamp(spd / m.speed, 0, 1);
  m.phase += dt * (3 + spd * 3);
  const s = Math.sin(m.phase);
  const eb = 1 + m.eyeBoost * 2 + (m.state === 'windup' ? 1 : 0);
  for (const e of m.eyes) e.material.opacity = Math.min(1, .7 * eb);
  if (m.type === 'skeleton' || m.type === 'zombie' || m.type === 'fallen' || m.type === 'archer' || m.type === 'warden' || m.type === 'gorger' || m.type === 'lich') {
    m.legs[0].hip.rotation.x = s * .6 * amt; m.legs[1].hip.rotation.x = -s * .6 * amt;
    m.legs[0].knee.rotation.x = Math.max(0, -s) * .7 * amt; m.legs[1].knee.rotation.x = Math.max(0, s) * .7 * amt;
    m.body.position.y = Math.abs(s) * .04 * amt;
    // Zombies shamble with both arms reaching forward.
    const reachOut = m.type === 'zombie' ? -1.35 : m.type === 'lich' && m.boss?.id === 'lich' && m.boss.boltCd > 1.6 ? -1.2 : 0;
    m.armL.rotation.x = reachOut - s * .4 * amt - (m.aware ? .3 : 0);
    let ax = -.35 + reachOut, ex = -.3;
    if (m.type === 'archer' && (m.state === 'windup' || m.state === 'recover')) { ax = -1.55; ex = 0; }
    else if (m.state === 'windup') { const k = 1 - m.t / m.st.windup; ax = lerp(-.35, -2.8, Math.min(1, k * 1.6)); ex = -.6; }
    else if (m.state === 'recover') { const k = 1 - m.t / .4; ax = k < .3 ? lerp(-2.8, -.5, k / .3) : -.5; ex = -.2; }
    m.armR.rotation.x = damp(m.armR.rotation.x, ax, m.state === 'recover' ? 40 : 14, dt); m.elR.rotation.x = damp(m.elR.rotation.x, ex, 14, dt);
    m.jaw.rotation.x = m.aware ? Math.max(0, Math.sin(G.now * 18 + m.phase)) * .35 : 0;
    m.torso.rotation.x = m.state === 'windup' ? -.15 : m.state === 'recover' ? .25 : 0;
    m.body.rotation.x = m.state === 'stun' ? -.3 : 0;
  } else if (m.type === 'rat') {
    m.legs.forEach((l, i) => l.rotation.x = Math.sin(m.phase * 2 + (i % 2 ? PI : 0) + (i > 1 ? PI / 2 : 0)) * .8 * amt);
    m.tail.forEach((t, i) => t.rotation.y = Math.sin(G.now * 6 + i * .9 + m.phase * .2) * .35);
    m.body.position.y = Math.abs(Math.sin(m.phase * 2)) * .05 * amt;
    m.head.rotation.x = Math.sin(G.now * 9 + m.phase) * .08;
    m.body.position.z = m.state === 'windup' ? -.15 : m.state === 'recover' && m.t > .25 ? .22 : damp(m.body.position.z, 0, 10, dt);
    m.body.rotation.x = m.state === 'windup' ? .15 : m.state === 'stun' ? -.25 : 0;
  } else if (m.type === 'slime') {
    const hop = Math.max(0, Math.sin(m.phase * 1.0));
    let sy = 1 + Math.sin(G.now * 3 + m.phase) * .06, sxz = 1 / Math.sqrt(sy);
    if (amt > .1) { m.body.position.y = hop * .28 * amt; sy = 1 + hop * .25 * amt; sxz = 1 / Math.sqrt(sy); } else m.body.position.y = damp(m.body.position.y, 0, 8, dt);
    if (m.state === 'windup') { sy = .62; sxz = 1.25; } if (m.state === 'recover' && m.t > .25) { sy = .85; sxz = 1.1; m.body.position.z = .25; } else m.body.position.z = damp(m.body.position.z, 0, 10, dt);
    if (m.state === 'stun') { sy = 1.2; sxz = .9; }
    m.body.scale.set(damp(m.body.scale.x, sxz, 14, dt), damp(m.body.scale.y, sy, 14, dt), damp(m.body.scale.z, sxz, 14, dt));
  } else if (m.type === 'bat') {
    const flap = Math.sin(G.now * 18 + m.phase) * .8;
    m.wings[0].rotation.z = flap; m.wings[1].rotation.z = -flap;
    // flies at ~1.1 m and swoops down to strike
    const swoop = m.state === 'windup' ? 1 - m.t / m.st.windup : m.state === 'recover' ? m.t / .4 : 0;
    m.body.position.y = damp(m.body.position.y, 1.1 + Math.sin(G.now * 3 + m.phase) * .15 - swoop * .6, 10, dt);
    m.body.rotation.x = m.state === 'stun' ? .8 : swoop * .5;
  } else if (m.type === 'spider' || m.type === 'broodmother') {
    // alternating tetrapod gait: legs 0,2,5,7 move against 1,3,4,6
    m.legs.forEach((l, i) => {
      const grp = (i % 2) ^ (i >= 4 ? 1 : 0);
      l.hip.rotation.x = Math.sin(m.phase * 2.2 + grp * PI) * .35 * amt;
      l.knee.rotation.x = Math.max(0, Math.sin(m.phase * 2.2 + grp * PI)) * .3 * amt;
    });
    const leap = m.state === 'windup' ? Math.sin((1 - m.t / m.st.windup) * PI) : 0;
    m.body.position.y = leap * .45 + Math.abs(Math.sin(m.phase * 2.2)) * .03 * amt;
    m.body.rotation.x = m.state === 'stun' ? -.3 : -leap * .25;
  }
}
