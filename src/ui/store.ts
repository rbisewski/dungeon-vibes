import { signal } from '@preact/signals';
import type { Attrs, ClassId } from '../rules/classes';
import type { PotionId } from '../rules/potions';

/** HUD values mirrored from game state by `syncHud` (UI never reads game objects directly). */
export const hud = {
  life: signal(70),
  maxLife: signal(70),
  mana: signal(10),
  maxMana: signal(10),
  clvl: signal(1),
  /** Progress from the current level's XP threshold to the next, 0–1. */
  xpFrac: signal(0),
  unspent: signal(0),
  gold: signal(0),
  slain: signal(0),
  depth: signal(1),
  /** Potion in each belt slot (null = empty). Replaced as a whole when anything changes. */
  belt: signal<(PotionId | null)[]>(Array(8).fill(null)),
  key: signal(false),
  manual: signal(false),
  bossVisible: signal(false),
  bossFrac: signal(1),
};

/** Everything the character screen shows. */
export interface CharSheet {
  cls: ClassId;
  clvl: number;
  xp: number;
  /** XP needed to reach the next level, or null at level 50. */
  nextXp: number | null;
  base: Attrs;
  cur: Attrs;
  cap: Attrs;
  unspent: number;
  life: number; maxLife: number;
  mana: number; maxMana: number;
  ac: number;
  toHit: number;
  spellHit: number;
  dmgMin: number; dmgMax: number;
  block: number;
  crit: number;
  gold: number;
}
export const sheet = signal<CharSheet | null>(null);

export type Panel = 'char';
/** The open panel, if any. Any open panel pauses the game. */
export const panel = signal<Panel | null>(null);

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
