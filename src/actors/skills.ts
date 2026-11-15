/** Class skills on R / gamepad LB (SPEC §3.1a). Cooldowns run on game time, so they pause with the game. */
import { SFX } from '../audio/sfx';
import { R, TAU, rr } from '../core/math';
import { G, addShake } from '../game/state';
import type { Hero, Trap } from '../game/types';
import { fxAdd, impact } from '../render/particles';
import { roll } from '../rules/combat';
import { CLASS_SKILL, DISARM_RANGE, disarmChance, manaSurge, SKILLS, WAR_CRY, type SkillId } from '../rules/skills';
import { toast } from '../ui/store';
import { damageHero, trapDamage } from './combat';

export const heroSkill = (h: Hero): SkillId => CLASS_SKILL[h.stats.cls];

/** Nearest armed trap within reach of the hero. */
export function trapInReach(h: Hero, range = DISARM_RANGE): Trap | null {
  let best: Trap | null = null, bd = range;
  for (const tr of G.L.traps) {
    if (tr.disabled) continue;
    const d = Math.hypot(tr.x - h.x, tr.z - h.z);
    if (d < bd) { bd = d; best = tr; }
  }
  return best;
}

function warCry(h: Hero): boolean {
  SFX.warCry(); addShake(.4);
  for (let k = 0; k < 80; k++) { const a = (k / 80) * TAU; fxAdd.spawn(h.x, .4, h.z, Math.sin(a) * 9, rr(0, .5), Math.cos(a) * 9, .45, 1.4, .9, .5, .08, 0, 2.2, 0); }
  for (const m of G.L.monsters) {
    if (m.dead || m.rise > 0 || Math.hypot(m.x - h.x, m.z - h.z) > WAR_CRY.radius + m.r) continue;
    m.aware = true;
    if (m.boss) { m.slowT = WAR_CRY.bossSlowTime; continue; }
    m.state = 'stun'; m.t = WAR_CRY.stun;
  }
  return true;
}

function disarm(h: Hero): boolean {
  const tr = trapInReach(h);
  if (!tr) { toast('NO TRAP IN REACH'); return false; }
  if (roll(R, disarmChance(h.d.attr.dex, G.L.depth))) {
    tr.disabled = true;
    if (tr.kind === 'spike') tr.g.position.y = -.6;
    else tr.sw.rotation.x = 0;
    SFX.unlock(); toast('TRAP DISARMED');
    impact(tr.x, .3, tr.z, 0xc8d8ff, 1.2);
  } else {
    // [OURS] A failed attempt sets the trap off on the Thief.
    toast('DISARM FAILED');
    h.invuln = 0;
    damageHero(trapDamage(), 0, 0);
  }
  return true;
}

function surge(h: Hero): boolean {
  const v = manaSurge(h.life, h.mana, h.d.maxMana);
  if (!v) { toast(h.mana >= h.d.maxMana ? 'MANA IS FULL' : 'TOO WEAK'); return false; }
  h.life -= v; h.mana += v;
  SFX.heal(); toast('MANA SURGE', `+${v} MANA`);
  for (let k = 0; k < 40; k++) { const a = k * .5, r = .2 + k * .012; fxAdd.spawn(h.x + Math.cos(a) * r, .2 + k * .03, h.z + Math.sin(a) * r, 0, rr(.5, 1.2), 0, rr(.5, .9), k < 20 ? 1.6 : .4, .3, k < 20 ? .3 : 1.8, rr(.05, .08), -.3, .5, 2); }
  return true;
}

/** Uses the class skill if it is off cooldown. A use that finds nothing to do (no trap, full mana) costs no cooldown. */
export function useSkill(): void {
  const h = G.hero;
  if (h.dead || h.descend > 0 || h.skillCd > 0) return;
  const id = heroSkill(h);
  const used = id === 'war_cry' ? warCry(h) : id === 'disarm' ? disarm(h) : surge(h);
  if (used) h.skillCd = SKILLS[id].cooldown;
}

/** AUTO use of the class skill (SPEC §14). */
export function autoSkillWanted(h: Hero): boolean {
  if (h.skillCd > 0 || h.dead) return false;
  switch (heroSkill(h)) {
    case 'war_cry': {
      let near = 0;
      for (const m of G.L.monsters) {
        if (m.dead || m.rise > 0) continue;
        const d = Math.hypot(m.x - h.x, m.z - h.z);
        if (m.boss && d < 2.6) return true;
        if (d < WAR_CRY.radius) near++;
      }
      return near >= 3;
    }
    case 'disarm': { const tr = trapInReach(h); return !!tr && disarmChance(h.d.attr.dex, G.L.depth) >= 50; }
    case 'mana_surge': return h.mana < h.d.maxMana * .2 && h.life > h.d.maxLife * .7;
  }
}
