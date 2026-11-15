/** Player settings (SPEC §10, §12.2), kept in `localStorage['dv.settings']`, separate from character saves. */
import { signal } from '@preact/signals';
import { Snd } from '../audio/sound';

export interface Settings {
  /** Floating damage numbers; off by default, as in D1. */
  damageNumbers: boolean;
  sound: boolean;
}

const KEY = 'dv.settings';
const DEFAULTS: Settings = { damageNumbers: false, sound: true };

function load(): Settings {
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>) }; } catch { return { ...DEFAULTS }; }
}

export const settings = signal<Settings>(load());
Snd.setVolume(settings.value.sound ? .8 : 0);

export function setSetting<K extends keyof Settings>(k: K, v: Settings[K]): void {
  settings.value = { ...settings.value, [k]: v };
  try { localStorage.setItem(KEY, JSON.stringify(settings.value)); } catch { /* storage full or blocked: keep the in-memory value */ }
  if (k === 'sound') Snd.setVolume(v ? .8 : 0);
}
