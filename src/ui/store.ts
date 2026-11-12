import { signal } from '@preact/signals';

/** HUD values mirrored from game state by `syncHud` (UI never reads game objects directly). */
export const hud = {
  hp: signal(10),
  gold: signal(0),
  slain: signal(0),
  depth: signal(1),
  potions: signal(1),
  key: signal(false),
  manual: signal(false),
  bossVisible: signal(false),
  bossFrac: signal(1),
};

export const toastText = signal('');
export const toastSub = signal('');
export const toastOn = signal(false);
let toastT = 0;

/** Shows a centred banner for 2.6 s. */
export function toast(text: string, sub = ''): void {
  toastText.value = text;
  toastSub.value = sub;
  toastOn.value = true;
  toastT = 2.6;
}
export function tickToast(dt: number): void {
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) toastOn.value = false; }
}

/** Full-screen black overlay opacity used by level transitions. */
export const fade = signal(1);
export const soundOn = signal(false);
