import type { LootCtx } from '../rules/loot';
import type { Grid } from '../rules/inventory';
import type { LevelDelta } from '../world/levelDelta';
import type { Actor, Hero, Level, Transition } from './types';

/** Stash grid size [OURS]: 10×10, as D2R's stash. */
export const STASH_W = 10, STASH_H = 10;

/** Mutable world state shared across systems. Single instance; never reassigned. */
export const G = {
  /** Current level. Set by `buildLevel` before anything reads it. */
  L: null as unknown as Level,
  /** The player. Set at boot before the first level is built. */
  hero: null as unknown as Hero,
  /** Game clock in seconds; advances by the fixed simulation step. */
  now: 0,
  /** Current depth; 0 is the town. */
  depth: 0,
  shake: 0,
  hitstop: 0,
  transition: null as Transition | null,
  /** True while a UI panel is open: the world does not advance. */
  paused: false,
  /** Seed of this run; each level's seed derives from it (SPEC §12.1). */
  runSeed: (Math.random() * 2 ** 32) >>> 0,
  /** A full-screen menu (class select) owns the input; the HUD is hidden. */
  inMenu: false,
  /** Run-wide loot state (uniques already generated). */
  loot: { found: new Set() } as LootCtx,
  /** Save slot of the character being played; null on the title screen and in class select. */
  charId: null as string | null,
  /** Deltas of the levels this character has left (the current level's is captured when saving). */
  levels: {} as Record<number, LevelDelta>,
  /** Game seconds until the next autosave. */
  saveT: 30,
  /** Deepest depth this character has reached (opens town entrances, SPEC §13). */
  deepest: 0,
  /** The open Town Portal's dungeon end, if any (its town end is the town's portal spot). */
  portal: null as { depth: number; x: number; z: number } | null,
  /** The character's stash (SPEC §13.1). */
  stash: { grid: { w: STASH_W, h: STASH_H, items: [] } as Grid, gold: 0 },
};

export const isHero = (a: Actor): a is Hero => a === G.hero;

export const addShake = (v: number): void => { G.shake = Math.max(G.shake, v); };
