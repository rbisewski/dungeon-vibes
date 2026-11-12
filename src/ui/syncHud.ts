import { manualActive } from '../core/input';
import { G } from '../game/state';
import { hud } from './store';

/** Copies game state into HUD signals; signals skip unchanged values. */
export function syncHud(): void {
  const h = G.hero, L = G.L;
  hud.hp.value = Math.max(0, h.hp);
  hud.gold.value = h.gold;
  hud.slain.value = h.slain;
  hud.depth.value = L.depth;
  hud.potions.value = h.potions;
  hud.key.value = h.key;
  hud.manual.value = manualActive();
  const boss = L.monsters.find(m => m.type === 'boss' && !m.dead && m.aware);
  hud.bossVisible.value = !!boss;
  if (boss) hud.bossFrac.value = Math.max(0, boss.hp) / boss.maxHp;
}
