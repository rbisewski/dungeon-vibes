import { monsterStrike } from './combat';
import { monsterTypeFor, spawnMonster } from './monsters';
import { SFX, vol } from '../audio/sfx';
import { PI, R, TAU, clamp, damp, lerp, pick, ri, rr, wrapA } from '../core/math';
import { G, addShake } from '../game/state';
import { fxNorm, impact } from '../render/particles';
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
  let nearAware = false;
  for (const m of G.L.monsters) {
    if (m.dead) {
      m.deadT += dt;
      if (m.type === 'rat') { m.root.rotation.z = damp(m.root.rotation.z, PI / 2, 10, dt); m.root.position.y = m.deadT > 1.4 ? -(m.deadT - 1.4) * .35 : .1; if (m.deadT > 3) m.remove = true; }
      continue;
    }
    m.ignoreT -= dt;
    if (m.rise > 0) { m.rise -= dt; m.root.position.y = -Math.max(0, m.rise) * 1.6 * (m.type === 'boss' ? 2 : 1); m.root.position.x = m.x; m.root.position.z = m.z; if (R() < .5) fxNorm.spawn(m.x + rr(-.4, .4), .05, m.z + rr(-.4, .4), rr(-.3, .3), rr(.3, .9), rr(-.3, .3), rr(.5, .9), .15, .13, .12, rr(.1, .2), .3, 1.5, 3); continue; }
    m.cd -= dt; m.flash -= dt; m.staggerT -= dt; m.eyeBoost = Math.max(0, m.eyeBoost - dt);
    const fl = Math.max(0, m.flash) / .14; for (const mt of m.flashMats) mt.emissive.setRGB(fl * 1.6, fl * 1.5, fl * 1.3);
    if (m.type === 'slime' && fl <= 0) m.flashMats[0].emissive.setHex(0x0e2a08);
    const dx = h.x - m.x, dz = h.z - m.z, d = Math.hypot(dx, dz) || .001, heroOK = !h.dead && h.descend <= 0;
    if (!m.aware && heroOK && ((d < 4 && fieldAt(m.x, m.z) < 4) || (d < 10 && clearLine(m.x, m.z, h.x, h.z, .05, false)))) { m.aware = true; m.eyeBoost = .6; SFX.squeal(m.type, vol(m.x, m.z)); if (m.type === 'boss') toast('THE BONE WARDEN', 'GUARDIAN OF THE STAIRS'); }
    if (m.aware && (d > 24 || !heroOK)) { m.aware = false; m.state = 'idle'; }
    if (m.aware && d < 14 && fieldAt(m.x, m.z) < 10) nearAware = true;
    let mvx = 0, mvz = 0, want: number | null = null, speedMul = 1;
    const reach = m.st.reach + h.r;
    switch (m.state) {
      case 'stun': m.t -= dt; if (m.t <= 0) m.state = m.aware ? 'chase' : 'idle'; break;
      case 'windup': m.t -= dt; want = Math.atan2(dx, dz); if (m.t <= 0) {
        m.state = 'recover'; m.t = .4; m.lunge = .15;
        const facing = Math.abs(wrapA(Math.atan2(dx, dz) - m.face)) < 1.3;
        if (d <= reach + .25 && facing) monsterStrike(m, dx / d, dz / d);
        if (m.type === 'boss') { addShake(.3); impact(m.x + Math.sin(m.face) * 1.6, .2, m.z + Math.cos(m.face) * 1.6, 0xffb070, 2.4); }
      } break;
      case 'recover': m.t -= dt; if (m.t <= 0) m.state = m.aware ? 'chase' : 'idle'; break;
      case 'idle':
        if (m.aware) { m.state = 'chase'; break; }
        m.wt -= dt;
        if (m.wt <= 0) { m.wt = rr(2, 5); const a = R() * TAU, r = rr(1, 4); const wx = m.home.x + Math.cos(a) * r, wz = m.home.z + Math.sin(a) * r; if (clearLine(m.x, m.z, wx, wz, m.r, false)) { m.wx = wx; m.wz = wz; } }
        { const ex = m.wx - m.x, ez = m.wz - m.z, ed = Math.hypot(ex, ez); if (ed > .3) { mvx = ex / ed; mvz = ez / ed; speedMul = .35; } }
        break;
      case 'chase':
        if (!m.aware) { m.state = 'idle'; break; }
        if (d <= reach * .92 && m.cd <= 0 && windups < 3 && heroOK) { m.state = 'windup'; m.t = m.st.windup; m.cd = m.st.cd * rr(.85, 1.2); windups++; if (m.type === 'rat' || m.type === 'skeleton') SFX.squeal(m.type, vol(m.x, m.z) * .5); break; }
        if (d > m.r + h.r + .25) {
          if (d < 9 && clearLine(m.x, m.z, h.x, h.z, m.r * .9, false)) { mvx = dx / d; mvz = dz / d; }
          else { const s = flowStep(m); if (s) { const ex = s.x - m.x, ez = s.z - m.z, ed = Math.hypot(ex, ez) || 1; mvx = ex / ed; mvz = ez / ed; } }
        }
        want = Math.atan2(dx, dz);
        break;
    }
    if (m.type === 'slime') speedMul *= .4 + Math.max(0, Math.sin(m.phase * 1.0)) * 1.4;
    const sp = m.speed * speedMul;
    m.vx = damp(m.vx, mvx * sp, 10, dt); m.vz = damp(m.vz, mvz * sp, 10, dt);
    if (m.lunge > 0) { m.lunge -= dt; m.vx += Math.sin(m.face) * 3 * dt * 10; m.vz += Math.cos(m.face) * 3 * dt * 10; }
    m.x += (m.vx + m.kx) * dt; m.z += (m.vz + m.kz) * dt; m.kx *= Math.exp(-8 * dt); m.kz *= Math.exp(-8 * dt);
    const spd = Math.hypot(m.vx, m.vz);
    if (want === null && spd > .2) want = Math.atan2(m.vx, m.vz);
    if (want !== null) m.face += wrapA(want - m.face) * Math.min(1, (m.type === 'boss' ? 5 : 10) * dt);
    animateMonster(m, dt, spd);
  }
  // remove finished
  for (let i = G.L.monsters.length - 1; i >= 0; i--) { const m = G.L.monsters[i]; if (m.remove) { G.L.group.remove(m.root); m.mats.forEach(x => x.dispose()); G.L.monsters.splice(i, 1); } }
  // keep the action going: wandering monsters rise from the dark
  G.L.quietT = nearAware ? 0 : G.L.quietT + dt;
  const alive = G.L.monsters.filter(m => !m.dead).length;
  if (G.L.quietT > 3 && alive < 24 && !h.dead && h.descend <= 0) {
    G.L.quietT = 0;
    const ok = (i: number): boolean => { const dd = G.L.dist[i]; return dd >= 3 && dd <= 6.5 && G.L.tiles[i] !== 6 && G.L.trap[i] < 0 && navOK(i); };
    const cands: number[] = [];
    if (h.path && h.path.length > h.pi + 3) for (let k = h.pi + 3; k < h.path.length; k++) { const p = h.path[k], i = Math.round(p.z / T) * G.L.W + Math.round(p.x / T); if (ok(i)) cands.push(i); }
    if (!cands.length) for (let i = 0; i < G.L.N; i++) if (ok(i)) cands.push(i);
    if (cands.length) {
      const c = pick(cands), n = ri(1, Math.min(3, 1 + Math.floor(G.L.depth / 2))), cx = (c % G.L.W) * T, cz = Math.floor(c / G.L.W) * T;
      const type = monsterTypeFor(G.L.depth);
      for (let k = 0; k < n; k++) { const m = spawnMonster(k === 0 ? type : monsterTypeFor(G.L.depth), cx + rr(-.5, .5), cz + rr(-.5, .5), .9 + k * .25); m.aware = true; m.state = 'chase'; }
    }
  }
}
function animateMonster(m: Monster, dt: number, spd: number): void {
  m.root.position.set(m.x, m.root.position.y, m.z); m.root.rotation.y = m.face;
  const amt = clamp(spd / m.speed, 0, 1);
  m.phase += dt * (3 + spd * 3);
  const s = Math.sin(m.phase);
  const eb = 1 + m.eyeBoost * 2 + (m.state === 'windup' ? 1 : 0);
  for (const e of m.eyes) e.material.opacity = Math.min(1, .7 * eb);
  if (m.type === 'skeleton' || m.type === 'boss') {
    m.legs[0].hip.rotation.x = s * .6 * amt; m.legs[1].hip.rotation.x = -s * .6 * amt;
    m.legs[0].knee.rotation.x = Math.max(0, -s) * .7 * amt; m.legs[1].knee.rotation.x = Math.max(0, s) * .7 * amt;
    m.body.position.y = Math.abs(s) * .04 * amt;
    m.armL.rotation.x = -s * .4 * amt - (m.aware ? .3 : 0);
    let ax = -.35, ex = -.3;
    if (m.state === 'windup') { const k = 1 - m.t / m.st.windup; ax = lerp(-.35, -2.8, Math.min(1, k * 1.6)); ex = -.6; }
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
  }
}
