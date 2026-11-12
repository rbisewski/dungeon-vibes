import { spendHeroPoint } from '../actors/heroStats';
import { resetInput } from '../core/input';
import { G } from '../game/state';
import type { Attr } from '../rules/classes';
import { panel, type Panel } from './store';
import { syncHud, syncSheet } from './syncHud';

/** Panels cannot open mid-transition or while the hero is dead or descending. */
const canOpen = (): boolean => !G.transition && !G.hero.dead && G.hero.descend <= 0;

export function openPanel(p: Panel): void {
  if (!canOpen()) return;
  panel.value = p;
  G.paused = true;
  resetInput();
  syncSheet();
}

export function closePanels(): void {
  panel.value = null;
  G.paused = false;
  resetInput();
}

export function togglePanel(p: Panel): void {
  if (panel.value === p) closePanels();
  else openPanel(p);
}

/** Spends one level-up point; the sheet and HUD refresh immediately (the game is paused). */
export function spendPoint(a: Attr): void {
  if (spendHeroPoint(a)) { syncSheet(); syncHud(); }
}

addEventListener('keydown', e => {
  if (e.code === 'KeyC') { e.preventDefault(); togglePanel('char'); return; }
  if (panel.value && (e.code === 'Escape' || e.code === 'Space')) { e.preventDefault(); closePanels(); }
});
