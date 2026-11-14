/** Casting and live spell effects. SPEC.md §5.4, §5.5. */
import { SFX } from '../audio/sfx';
import { PI, R, TAU, rr, wrapA } from '../core/math';
import { G, addShake, isHero } from '../game/state';
import type { Actor, Hero, LightSrc, Monster, SpellFx, WallFlame } from '../game/types';
import { glowSprite } from '../render/geometry';
import { fxAdd, impact } from '../render/particles';
import { CLASS } from '../rules/classes';
import { magicHitChance, roll } from '../rules/combat';
import {
  chainRange, fireWallTime, healAmount, manaCost, sparkCount, spellDamage, SPELLS, stoneTime, type Caster, type SpellId,
} from '../rules/spells';
import { toast } from '../ui/store';
import { T } from '../world/consts';
import { collect } from '../world/groundItems';
import { circleBlocked, navOK } from '../world/nav';
import { damageHero, damageMonster, missMonster, openChest } from './combat';

/** Fraction of the class cast time at which the spell is released [OURS]. */
const RELEASE = .4;
/** Aim cone half-angle (SPEC §5.4). */
const CONE = 35 * PI / 180;

/** Effective level: learned level plus +spell-level items; scrolls of unknown spells cast at level 1 (D1). */
export function spellLevel(h: Hero, id: SpellId): number {
  return Math.max(1, (h.spells[id] ?? 0) + h.d.spellLevels);
}

const caster = (h: Hero, slvl: number): Caster => ({ cls: h.stats.cls, clvl: h.stats.clvl, slvl, int: h.d.attr.int });

/** Mana the hero pays to cast `id` now. */
export const heroManaCost = (h: Hero, id: SpellId): number => manaCost(id, spellLevel(h, id), h.stats.clvl, h.stats.cls);

/** Nearest aware, living monster inside the aim cone and range (SPEC §5.4). */
export function findTarget(h: Hero, range: number, face = h.face, cone = CONE): Monster | null {
  let best: Monster | null = null, bd = range;
  for (const m of G.L.monsters) {
    if (m.dead || m.rise > 0 || !m.aware) continue;
    const dx = m.x - h.x, dz = m.z - h.z, d = Math.hypot(dx, dz);
    if (d < bd && Math.abs(wrapA(Math.atan2(dx, dz) - face)) < cone) { bd = d; best = m; }
  }
  return best;
}

/**
 * Starts casting. Pays mana unless `free` (scrolls). Returns false, changing nothing, when the hero is busy or
 * lacks mana.
 */
export function startCast(id: SpellId, free: boolean): boolean {
  const h = G.hero;
  if (h.dead || h.descend > 0 || h.cast || h.atkT >= 0 || h.flinch > 0) return false;
  const cost = free ? 0 : heroManaCost(h, id);
  if (h.mana < cost) { SFX.fizzle(); toast('NOT ENOUGH MANA'); return false; }
  h.mana -= cost;
  const def = SPELLS[id];
  const target = def.range > 0 && def.delivery !== 'nova' ? findTarget(h, def.range) : null;
  const aim = target ? Math.atan2(target.x - h.x, target.z - h.z) : h.face;
  h.face = aim;
  h.cast = { spell: id, slvl: spellLevel(h, id), t: 0, fired: false, aim };
  SFX.cast();
  return true;
}

/** Advances the hero's cast; the effect is released partway through, then the hero recovers. */
export function updateCast(dt: number): void {
  const h = G.hero, c = h.cast;
  if (!c) return;
  const total = CLASS[h.stats.cls].cast;
  c.t += dt;
  if (!c.fired && c.t >= total * RELEASE) { c.fired = true; release(h, c.spell, c.slvl, c.aim); }
  if (c.t >= total) { h.cast = null; h.cd = Math.max(h.cd, .25); }
}

/* ---------- release ---------- */

const COLOR: Partial<Record<SpellId, number>> = {
  firebolt: 0xff7a30, fireball: 0xff5a18, holy_bolt: 0xfff2c8, charged_bolt: 0x8ab8ff, stone_curse: 0xc8c4b0,
};

function addLight(x: number, z: number, cold: boolean, base: number): LightSrc {
  const l: LightSrc = { x, y: 1, z, base, cold, seed: R() * 100, steady: true, d: 0 };
  G.L.lights.push(l);
  return l;
}

function launch(h: Hero, id: SpellId, slvl: number, dir: number, speed: number, life: number, size: number): void {
  const color = COLOR[id] ?? 0xffffff;
  const sprite = glowSprite(color, size, G.L.group, h.x, 1, h.z);
  const fire = SPELLS[id].school === 'fire';
  G.L.spellFx.push({
    kind: 'missile', spell: id, slvl, t: 0, x: h.x + Math.sin(dir) * .5, z: h.z + Math.cos(dir) * .5,
    dx: Math.sin(dir), dz: Math.cos(dir), speed, life, sprite, light: addLight(h.x, h.z, !fire, fire ? 7 : 5),
  });
}

function release(h: Hero, id: SpellId, slvl: number, aim: number): void {
  const c = caster(h, slvl);
  switch (id) {
    case 'firebolt': case 'holy_bolt': SFX.fireWhoosh(); launch(h, id, slvl, aim, 12, 1.4, .9); break;
    case 'fireball': SFX.fireWhoosh(); launch(h, id, slvl, aim, 10, 1.7, 1.5); break;
    case 'stone_curse': launch(h, id, slvl, aim, 14, .8, .8); break;
    case 'charged_bolt':
      SFX.zap();
      for (let i = 0; i < sparkCount(slvl); i++) launch(h, id, slvl, aim + rr(-.6, .6), rr(5, 7), rr(1.1, 1.5), .5);
      break;
    case 'lightning': SFX.zap(); lightningLine(h, c, aim); break;
    case 'chain_lightning': {
      SFX.zap();
      const hit = lightningLine(h, c, aim);
      for (const m of G.L.monsters) {
        if (m.dead || m.rise > 0 || hit.has(m) || Math.hypot(m.x - h.x, m.z - h.z) > chainRange(slvl)) continue;
        if (circleBlocked((h.x + m.x) / 2, (h.z + m.z) / 2, .05, true)) continue;
        bolt(h.x, h.z, m.x, m.z);
        spellHit(m, id, c, m.x - h.x, m.z - h.z);
      }
      break;
    }
    case 'inferno': SFX.fireWhoosh(); G.L.spellFx.push({ kind: 'jet', spell: id, slvl, t: 0, life: .6, tick: 0, light: addLight(h.x, h.z, false, 9) }); break;
    case 'fire_wall': fireWall(h, slvl, aim); break;
    case 'flash': {
      SFX.zap(); addShake(.25);
      for (let k = 0; k < 70; k++) { const a = (k / 70) * TAU; fxAdd.spawn(h.x, .8, h.z, Math.sin(a) * 7, rr(-.2, .4), Math.cos(a) * 7, .45, .9, .7, 1.8, .07, 0, 2.5, 0); }
      for (const m of G.L.monsters) if (!m.dead && m.rise <= 0 && Math.hypot(m.x - h.x, m.z - h.z) < SPELLS.flash.range + m.r) spellHit(m, id, c, m.x - h.x, m.z - h.z);
      break;
    }
    case 'healing': {
      const v = healAmount(R, c);
      h.life = Math.min(h.d.maxLife, h.life + v);
      SFX.heal(); toast('HEALING', `+${v} LIFE`);
      for (let k = 0; k < 40; k++) fxAdd.spawn(h.x + rr(-.5, .5), rr(.1, 1.2), h.z + rr(-.5, .5), 0, rr(1, 2.5), 0, rr(.6, 1.1), 1.6, .4, .5, rr(.05, .08), -.5, .5, 2);
      break;
    }
    case 'mana_shield': h.manaShield = true; SFX.heal(); toast('MANA SHIELD'); break;
    case 'telekinesis': telekinesis(h); break;
    case 'phasing': phase(h); break;
    case 'identify': break; // handled by the inventory's identify mode, never cast here
  }
}

/** One spell hit on a monster: magic to-hit (AC ignored), damage, stagger by the usual rule. */
function spellHit(m: Monster, id: SpellId, c: Caster, dx: number, dz: number): void {
  const d = Math.hypot(dx, dz) || 1, nx = dx / d, nz = dz / d;
  if (id === 'holy_bolt' && !m.roll.undead) { SFX.fizzle(); impact(m.x, .9, m.z, 0x888888, .8); return; }
  if (!roll(R, magicHitChance(c.cls, G.hero.d, m.roll.mlvl))) { missMonster(m, nx, nz); return; }
  damageMonster(m, spellDamage(id, R, c), nx, nz, true);
}

/** Jagged particle bolt between two points. */
function bolt(x0: number, z0: number, x1: number, z1: number): void {
  const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / .35));
  for (let i = 0; i <= n; i++) {
    const k = i / n, j = i === 0 || i === n ? 0 : .22;
    fxAdd.spawn(x0 + (x1 - x0) * k + rr(-j, j), 1 + rr(-j, j), z0 + (z1 - z0) * k + rr(-j, j), 0, 0, 0, rr(.18, .3), 1.1, 1.4, 2.4, rr(.05, .08), 0, 0, 0);
  }
  impact(x1, 1, z1, 0x9ac0ff, 1.2);
}

/** Lightning: an instant line up to its range or the first wall; every monster on it is struck once. */
function lightningLine(h: Hero, c: Caster, aim: number): Set<Monster> {
  const dx = Math.sin(aim), dz = Math.cos(aim);
  let len = 0;
  while (len < SPELLS.lightning.range && !circleBlocked(h.x + dx * (len + .3), h.z + dz * (len + .3), .05, true)) len += .3;
  const ex = h.x + dx * len, ez = h.z + dz * len, hit = new Set<Monster>();
  bolt(h.x + dx * .4, h.z + dz * .4, ex, ez);
  for (const m of G.L.monsters) {
    if (m.dead || m.rise > 0) continue;
    const t = (m.x - h.x) * dx + (m.z - h.z) * dz;
    if (t < 0 || t > len + m.r) continue;
    if (Math.hypot(h.x + dx * t - m.x, h.z + dz * t - m.z) > m.r + .35) continue;
    hit.add(m);
    spellHit(m, 'lightning', c, dx, dz);
  }
  return hit;
}

/** 11 flames across the aim line, 4 m ahead; flames inside walls are skipped. All flames share one burn timer per target. */
function fireWall(h: Hero, slvl: number, aim: number): void {
  SFX.fireWhoosh();
  const cx = h.x + Math.sin(aim) * 4, cz = h.z + Math.cos(aim) * 4, px = Math.cos(aim), pz = -Math.sin(aim);
  const burnT = new Map<Actor, number>(), life = fireWallTime(slvl);
  for (let i = -5; i <= 5; i++) {
    const x = cx + px * i * .5, z = cz + pz * i * .5;
    if (circleBlocked(x, z, .1, true)) continue;
    const sprite = glowSprite(0xff7020, 1.2, G.L.group, x, .55, z);
    G.L.spellFx.push({ kind: 'flame', spell: 'fire_wall', slvl, t: 0, x, z, life, burnT, sprite, light: i % 4 === 0 ? addLight(x, z, false, 8) : undefined });
  }
}

function telekinesis(h: Hero): void {
  let best: { d: number; go: () => void; x: number; z: number } | null = null;
  for (const p of G.L.pickups) {
    const d = Math.hypot(p.x - h.x, p.z - h.z);
    if (d < SPELLS.telekinesis.range && (!best || d < best.d)) best = { d, x: p.x, z: p.z, go: () => { if (!collect(p)) { p.x = h.x; p.z = h.z; } } };
  }
  for (const c of G.L.chests) {
    const d = Math.hypot(c.x - h.x, c.z - h.z);
    if (!c.open && d < SPELLS.telekinesis.range && (!best || d < best.d)) best = { d, x: c.x, z: c.z, go: () => openChest(c) };
  }
  if (!best) { SFX.fizzle(); toast('NOTHING IN REACH'); return; }
  for (let k = 0; k <= 12; k++) { const t = k / 12; fxAdd.spawn(h.x + (best.x - h.x) * t, .9, h.z + (best.z - h.z) * t, 0, .4, 0, .4, 1.2, .5, 1.6, .06, 0, 0, 2); }
  SFX.heal();
  best.go();
}

/** Phasing: a random walkable tile 4–8 m away that the hero can reach (distance field is finite). */
function phase(h: Hero): void {
  const L = G.L, cands: number[] = [];
  for (let i = 0; i < L.N; i++) {
    if (!navOK(i) || L.tiles[i] === 6 || L.trap[i] >= 0 || !(L.dist[i] < 1e8)) continue;
    const x = (i % L.W) * T, z = Math.floor(i / L.W) * T, d = Math.hypot(x - h.x, z - h.z);
    if (d >= 4 && d <= 8) cands.push(i);
  }
  if (!cands.length) { SFX.fizzle(); return; }
  const i = cands[Math.floor(R() * cands.length)];
  const burst = (x: number, z: number) => { for (let k = 0; k < 30; k++) fxAdd.spawn(x + rr(-.3, .3), rr(.1, 1.6), z + rr(-.3, .3), rr(-1, 1), rr(.5, 2), rr(-1, 1), rr(.4, .8), 1.1, .5, 1.8, rr(.05, .08), 0, 1, 2); };
  burst(h.x, h.z);
  h.x = (i % L.W) * T; h.z = Math.floor(i / L.W) * T; h.vx = h.vz = h.kx = h.kz = 0; h.path = null;
  burst(h.x, h.z);
  SFX.zap();
}

function petrify(m: Monster, slvl: number): void {
  if (m.type === 'boss') { SFX.fizzle(); toast('IMMUNE'); return; }
  if (!m.stoneCols) {
    m.stoneCols = m.flashMats.map(mt => mt.color.clone());
    for (const mt of m.flashMats) mt.color.setHex(0x8a8884);
  }
  m.stoneT = stoneTime(slvl);
  m.state = 'idle';
  impact(m.x, .9, m.z, 0xc8c4b0, 1.4);
}

/** Restores a monster's colours when Stone Curse ends. */
export function unpetrify(m: Monster): void {
  if (!m.stoneCols) return;
  m.flashMats.forEach((mt, i) => mt.color.copy(m.stoneCols![i]));
  m.stoneCols = null;
}

/* ---------- live effects ---------- */

function removeFx(i: number): void {
  const f = G.L.spellFx[i];
  if (f.kind !== 'jet') { G.L.group.remove(f.sprite); f.sprite.material.dispose(); }
  if (f.light) G.L.lights.splice(G.L.lights.indexOf(f.light), 1);
  G.L.spellFx.splice(i, 1);
}

function explode(x: number, z: number, c: Caster): void {
  SFX.fireWhoosh(); addShake(.3); impact(x, .8, z, 0xff8030, 2.6);
  for (let k = 0; k < 50; k++) { const a = R() * TAU, s = rr(1, 5); fxAdd.spawn(x, .8, z, Math.cos(a) * s, rr(.5, 4), Math.sin(a) * s, rr(.4, .8), 2, .9, .3, rr(.06, .11), 4, 1, 2); }
  for (const m of G.L.monsters) if (!m.dead && m.rise <= 0 && Math.hypot(m.x - x, m.z - z) < 1.6 + m.r) spellHit(m, 'fireball', c, m.x - x, m.z - z);
}

function updateMissile(f: Extract<SpellFx, { kind: 'missile' }>, dt: number, c: Caster): boolean {
  if (f.spell === 'charged_bolt') { const a = Math.atan2(f.dx, f.dz) + rr(-4, 4) * dt; f.dx = Math.sin(a); f.dz = Math.cos(a); }
  f.x += f.dx * f.speed * dt; f.z += f.dz * f.speed * dt; f.life -= dt;
  f.sprite.position.set(f.x, f.spell === 'charged_bolt' ? .35 : 1, f.z);
  if (f.light) { f.light.x = f.x; f.light.z = f.z; }
  const hex = COLOR[f.spell] ?? 0xffffff, r = (hex >> 16 & 255) / 160, g = (hex >> 8 & 255) / 160, b = (hex & 255) / 160;
  for (let k = 0; k < 2; k++) fxAdd.spawn(f.x + rr(-.08, .08), f.sprite.position.y + rr(-.08, .08), f.z + rr(-.08, .08), rr(-.3, .3), rr(0, .6), rr(-.3, .3), rr(.15, .35), r, g, b, rr(.04, .07), 0, 1, 2);
  if (circleBlocked(f.x, f.z, .12, true)) { if (f.spell === 'fireball') explode(f.x, f.z, c); else impact(f.x, 1, f.z, COLOR[f.spell] ?? 0xffffff, .9); return false; }
  for (const m of G.L.monsters) {
    if (m.dead || m.rise > 0 || Math.hypot(m.x - f.x, m.z - f.z) > m.r + .3) continue;
    if (f.spell === 'fireball') explode(f.x, f.z, c);
    else if (f.spell === 'stone_curse') petrify(m, f.slvl);
    else { spellHit(m, f.spell, c, f.dx, f.dz); impact(f.x, 1, f.z, COLOR[f.spell] ?? 0xffffff, 1); }
    return false;
  }
  return f.life > 0;
}

function updateJet(f: Extract<SpellFx, { kind: 'jet' }>, dt: number, c: Caster): boolean {
  const h = G.hero, dx = Math.sin(h.face), dz = Math.cos(h.face), range = SPELLS.inferno.range;
  f.life -= dt; f.tick -= dt;
  if (f.light) { f.light.x = h.x + dx * 1.5; f.light.z = h.z + dz * 1.5; }
  for (let k = 0; k < 6; k++) { const s = rr(5, 8), a = h.face + rr(-.35, .35); fxAdd.spawn(h.x + dx * .5, .9, h.z + dz * .5, Math.sin(a) * s, rr(0, .8), Math.cos(a) * s, rr(.25, .45), 2, .8, .25, rr(.07, .12), -1, 2, 2); }
  if (f.tick <= 0) {
    f.tick = .15;
    for (const m of G.L.monsters) {
      if (m.dead || m.rise > 0) continue;
      const mx = m.x - h.x, mz = m.z - h.z, d = Math.hypot(mx, mz);
      if (d < range + m.r && Math.abs(wrapA(Math.atan2(mx, mz) - h.face)) < .55) spellHit(m, 'inferno', c, mx, mz);
    }
  }
  return f.life > 0 && !h.dead;
}

function updateFlame(f: WallFlame, dt: number, c: Caster): boolean {
  f.life -= dt;
  const s = 1.1 + .25 * Math.sin(G.now * 17 + f.x * 3) + .1 * Math.sin(G.now * 31 + f.z * 5);
  f.sprite.scale.set(s * .8, s * 1.3, 1);
  f.sprite.material.opacity = Math.min(1, f.life * 2);
  if (R() < dt * 70) fxAdd.spawn(f.x + rr(-.2, .2), rr(.05, .3), f.z + rr(-.2, .2), rr(-.2, .2), rr(1.5, 3.2), rr(-.2, .2), rr(.35, .8), 2, .75, .25, rr(.09, .16), -1, 1, 2);
  const actors: Actor[] = [G.hero, ...G.L.monsters];
  for (const a of actors) {
    if (isHero(a) ? a.dead : (a.dead || a.rise > 0)) continue;
    if (Math.hypot(a.x - f.x, a.z - f.z) > a.r + .3 || (f.burnT.get(a) ?? 0) > G.now) continue;
    f.burnT.set(a, G.now + .5);
    // Fire Wall hurts its caster too (D1).
    if (isHero(a)) damageHero(spellDamage('fire_wall', R, c), 0, 0);
    else spellHit(a, 'fire_wall', c, a.x - f.x, a.z - f.z);
  }
  return f.life > 0;
}

/** Advances every live spell effect. Effects use the caster's current level and Intelligence. */
export function updateSpellFx(dt: number): void {
  const L = G.L, h = G.hero;
  for (let i = L.spellFx.length - 1; i >= 0; i--) {
    const f = L.spellFx[i];
    f.t += dt;
    const c = caster(h, f.slvl);
    const alive = f.kind === 'missile' ? updateMissile(f, dt, c) : f.kind === 'jet' ? updateJet(f, dt, c) : updateFlame(f, dt, c);
    if (!alive) removeFx(i);
  }
}

/* ---------- AUTO ---------- */

/** Whether AUTO should cast the readied spell now (SPEC §14). */
export function autoCastWanted(h: Hero, healingPotions: number): boolean {
  const id = h.readied;
  if (!id || h.cast || h.atkT >= 0 || h.cd > 0) return false;
  const cost = heroManaCost(h, id);
  if (h.mana < cost) return false;
  if (id === 'healing') return h.life < h.d.maxLife * .35 && healingPotions === 0;
  const def = SPELLS[id];
  if (!def.attack) return false;
  // Casters spend freely; others keep half their mana.
  if (h.stats.cls !== 'mage' && h.mana < h.d.maxMana * .5) return false;
  const t = def.delivery === 'nova' ? findTarget(h, def.range, h.face, PI) : findTarget(h, def.range);
  if (!t) return false;
  return id !== 'holy_bolt' || t.roll.undead;
}
