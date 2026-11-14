import type { LootCtx } from '../rules/loot';
import type { Actor, Hero, Level, Transition } from './types';

/** Mutable world state shared across systems. Single instance; never reassigned. */
export const G = {
  /** Current level. Set by `buildLevel` before anything reads it. */
  L: null as unknown as Level,
  /** The player. Set at boot before the first level is built. */
  hero: null as unknown as Hero,
  /** Game clock in seconds; advances by the fixed simulation step. */
  now: 0,
  depth: 1,
  shake: 0,
  hitstop: 0,
  transition: null as Transition | null,
  /** True while a UI panel is open: the world does not advance. */
  paused: false,
  /** Run-wide loot state (uniques already generated). */
  loot: { found: new Set() } as LootCtx,
};

export const isHero = (a: Actor): a is Hero => a === G.hero;

export const addShake = (v: number): void => { G.shake = Math.max(G.shake, v); };
