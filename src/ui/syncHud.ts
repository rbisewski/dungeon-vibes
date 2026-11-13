import { manualActive } from '../core/input';
import { G } from '../game/state';
import { CLASS } from '../rules/classes';
import { MAX_LEVEL, xpForLevel } from '../rules/xp';
import { hud, panel, sheet } from './store';

/** Copies game state into HUD signals; signals skip unchanged values. */
export function syncHud(): void {
  const h = G.hero, L = G.L, s = h.stats, d = h.d;
  hud.life.value = Math.max(0, Math.round(h.life));
  hud.maxLife.value = d.maxLife;
  hud.mana.value = Math.round(h.mana);
  hud.maxMana.value = d.maxMana;
  hud.clvl.value = s.clvl;
  const lo = xpForLevel(s.clvl), hi = s.clvl >= MAX_LEVEL ? lo : xpForLevel(s.clvl + 1);
  hud.xpFrac.value = hi > lo ? (s.xp - lo) / (hi - lo) : 1;
  hud.unspent.value = s.unspent;
  hud.gold.value = h.gold;
  hud.slain.value = h.slain;
  hud.depth.value = L.depth;
  const belt = h.inv.belt.map(it => it?.potion ?? null);
  if (belt.join() !== hud.belt.value.join()) hud.belt.value = belt;
  hud.key.value = h.key;
  hud.manual.value = manualActive();
  const boss = L.monsters.find(m => m.type === 'boss' && !m.dead && m.aware);
  hud.bossVisible.value = !!boss;
  if (boss) hud.bossFrac.value = Math.max(0, boss.hp) / boss.maxHp;
  if (panel.value === 'char') syncSheet();
}

/** Character-screen snapshot (D1 layout: base vs current attributes, then combat stats). */
export function syncSheet(): void {
  const h = G.hero, s = h.stats, d = h.d, def = CLASS[s.cls];
  sheet.value = {
    cls: s.cls,
    clvl: s.clvl,
    xp: s.xp,
    nextXp: s.clvl >= MAX_LEVEL ? null : xpForLevel(s.clvl + 1),
    base: { ...s.base },
    cur: { ...d.attr },
    cap: def.cap,
    unspent: s.unspent,
    life: Math.max(0, Math.round(h.life)), maxLife: d.maxLife,
    mana: Math.round(h.mana), maxMana: d.maxMana,
    ac: d.ac,
    toHit: d.toHitShown,
    spellHit: 50 + d.attr.int + def.hit.magic,
    dmgMin: d.dmgMin, dmgMax: d.dmgMax,
    // Block against a level-0 monster: Dex + 2·clvl + class bonus (each monster level then subtracts 2).
    block: Math.min(100, d.attr.dex + 2 * s.clvl + def.blockBonus),
    crit: d.critPct,
    gold: h.gold,
  };
}
