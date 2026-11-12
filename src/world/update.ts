import { damageHero, damageMonster } from '../actors/combat';
import { SFX, vol } from '../audio/sfx';
import { PI, R, damp, lerp, rr } from '../core/math';
import { G, isHero } from '../game/state';
import { runeMat } from '../render/materials';
import { fxAdd, impacts } from '../render/particles';
import { circleBlocked } from './nav';

/** Traps, doors, chests, pickups, debris, decals, runes, moonlight and impact flashes. */
export function updateWorld(dt: number): void {
  const h = G.hero;
  // traps
  for (const tr of G.L.traps) {
    const near = vol(tr.x, tr.z);
    if (tr.kind === 'spike') {
      tr.t += dt; const tc = tr.t % 3.6;
      let y; if (tc < 2.2) y = -.6; else if (tc < 2.7) y = -.5 + Math.sin(tr.t * 70) * .02; else if (tc < 2.82) y = lerp(-.5, 0, (tc - 2.7) / .12); else if (tc < 3.35) y = 0; else y = lerp(0, -.6, (tc - 3.35) / .25);
      tr.g.position.y = y;
      const up = tc >= 2.74 && tc < 3.4;
      if (up && !tr.up) { tr.hit.clear(); SFX.spike(near); }
      tr.up = up;
      if (up) for (const a of [h, ...G.L.monsters]) {
        if (a.dead || a.rise > 0 || tr.hit.has(a) || (a === h && h.descend > 0)) continue;
        if (Math.abs(a.x - tr.x) < .95 && Math.abs(a.z - tr.z) < .95) { tr.hit.add(a); if (isHero(a)) damageHero(2, 0, 0); else damageMonster(a, 2, 0, 0); }
      }
    } else {
      tr.prev = tr.ang; tr.ang = 1.15 * Math.sin(tr.w * G.now + tr.ph); tr.sw.rotation.x = tr.ang;
      if (Math.sign(tr.prev) !== Math.sign(tr.ang)) SFX.whoosh(near);
      if (Math.abs(tr.ang) < .3) for (const a of [h, ...G.L.monsters]) {
        if (a.dead || a.rise > 0) continue; const along = tr.along === 'x' ? Math.abs(a.x - tr.x) : Math.abs(a.z - tr.z), across = tr.along === 'x' ? Math.abs(a.z - tr.z) : Math.abs(a.x - tr.x);
        if (along < .35 + a.r && across < 1 && (tr.hitT.get(a) || 0) < G.now) { tr.hitT.set(a, G.now + .9); const s = Math.sign(tr.ang - tr.prev) || 1, nx = tr.along === 'x' ? 0 : s, nz = tr.along === 'x' ? s : 0; if (isHero(a)) damageHero(2, nx, nz); else damageMonster(a, 2, nx, nz); }
      }
    }
  }
  // doors
  for (const d of G.L.doors) {
    let want = 0;
    if (!d.locked) { for (const a of [h, ...G.L.monsters]) if (!a.dead && Math.abs(a.x - d.x) < 2.6 && Math.abs(a.z - d.z) < 2.6) { want = 1; break; } if (d === G.L.lockedDoor) want = 1; }
    if (want && !d.wasOpen) SFX.door(vol(d.x, d.z) * .8);
    d.wasOpen = d.open > .5 || want === 1 && d.open > .05;
    d.open = damp(d.open, want, 5, dt); d.pivot.rotation.y = d.sign * 1.5 * d.open;
    if (d.glow) d.glow.material.opacity = .6 + .4 * Math.sin(G.now * 3);
  }
  // chests
  for (const c of G.L.chests) { if (c.open) c.lid.rotation.x = damp(c.lid.rotation.x, -1.9, 7, dt); else if (c.isKey && R() < dt * 5) fxAdd.spawn(c.x + rr(-.4, .4), rr(.4, .9), c.z + rr(-.4, .4), 0, .3, 0, rr(.6, 1), 1.6, 1.2, .4, .05, 0, 0, 2); if (c.glow) c.glow.material.opacity = .45 + .25 * Math.sin(G.now * 2.5); }
  // pickups
  for (let i = G.L.pickups.length - 1; i >= 0; i--) {
    const p = G.L.pickups[i]; p.t += dt;
    p.vy -= 14 * dt; p.y += p.vy * dt; if (p.y < .18) { p.y = .18; p.vy = Math.abs(p.vy) > 1 ? -p.vy * .4 : 0; p.vx *= .7; p.vz *= .7; }
    const ox = p.x, oz = p.z; p.x += p.vx * dt; p.z += p.vz * dt;
    if (circleBlocked(p.x, p.z, .12, true)) { p.x = ox; p.z = oz; p.vx *= -.4; p.vz *= -.4; }
    const dx = h.x - p.x, dz = h.z - p.z, d = Math.hypot(dx, dz);
    if (p.t > .45 && d < 1.8 && !h.dead) { p.x += dx / d * dt * 7; p.z += dz / d * dt * 7; }
    p.o.position.set(p.x, p.y + Math.sin(G.now * 4 + i) * .05, p.z); p.o.rotation.y += dt * 4;
    if (p.t > .45 && d < .55 && !h.dead) {
      if (p.kind === 'coin') { h.gold += 3; SFX.coin(); for (let k = 0; k < 6; k++) fxAdd.spawn(p.x, p.y + .2, p.z, rr(-.6, .6), rr(1, 2), rr(-.6, .6), rr(.3, .5), 1.6, 1.2, .4, .045, 3, 1, 1); }
      else { h.potions++; SFX.drink(); }
      G.L.group.remove(p.o); G.L.pickups.splice(i, 1);
    }
  }
  // bone debris
  for (let i = G.L.debris.length - 1; i >= 0; i--) {
    const b = G.L.debris[i]; b.t += dt;
    if (!b.rest) {
      b.vy -= 16 * dt; const ox = b.o.position.x, oz = b.o.position.z;
      b.o.position.x += b.vx * dt; b.o.position.y += b.vy * dt; b.o.position.z += b.vz * dt; b.o.rotation.x += b.sx * dt; b.o.rotation.z += b.sz * dt;
      if (circleBlocked(b.o.position.x, b.o.position.z, .08, true)) { b.o.position.x = ox; b.o.position.z = oz; b.vx *= -.4; b.vz *= -.4; }
      if (b.o.position.y < .05) { b.o.position.y = .05; b.vy *= -.35; b.vx *= .6; b.vz *= .6; b.sx *= .5; b.sz *= .5; if (Math.abs(b.vy) < .6) { b.rest = true; b.o.rotation.x = PI / 2 * Math.round(b.o.rotation.x / (PI / 2)); } }
    }
    if (b.t > b.life) { b.o.position.y -= dt * .25; if (b.t > b.life + 1.2) { G.L.group.remove(b.o); G.L.debris.splice(i, 1); } }
  }
  for (let i = G.L.decals.length - 1; i >= 0; i--) { const d = G.L.decals[i]; d.t += dt; if (d.t > 10) { d.o.scale.multiplyScalar(1 - dt * 1.5); if (d.t > 12) { G.L.group.remove(d.o); G.L.decals.splice(i, 1); } } }
  for (const r of G.L.runes) { r.rotation.z += dt * .15; runeMat.opacity = .75 + .25 * Math.sin(G.now * 1.7); if (R() < dt * 6) fxAdd.spawn(r.position.x + rr(-.8, .8), .1, r.position.z + rr(-.8, .8), 0, rr(.3, .8), 0, rr(1.2, 2), .3, .55, 1.6, rr(.04, .07), 0, 0, 2); }
  for (const mo of G.L.moons) if (R() < dt * 4) fxAdd.spawn(mo.x + rr(-.7, .7), rr(.3, 3), mo.z + rr(-.7, .7), rr(-.05, .05), rr(-.1, .05), rr(-.05, .05), rr(2, 3.5), .35, .45, .7, .04, 0, 0, 3);
  for (const it of impacts) if (it.t > 0) { it.t -= dt; const k = Math.max(0, it.t / .16); it.s.scale.setScalar(it.size * (1.4 - k * .6)); it.s.material.opacity = k; if (it.t <= 0) it.s.visible = false; }
}
