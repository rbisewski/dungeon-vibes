/**
 * Save file (SPEC §12.2): up to 6 characters in `localStorage['dv.save.v3']`. A character keeps its hero, run seed,
 * depth and the delta of every level it has visited; loading rebuilds the level from its seed and re-applies the delta.
 */
import { createHero } from '../actors/hero';
import { recompute } from '../actors/heroStats';
import { clearShots } from '../actors/shots';
import { scene } from '../render/renderer';
import type { UniqueId } from '../rules/affixes';
import type { ClassId } from '../rules/classes';
import { carried, reserveUids, type Inventory } from '../rules/inventory';
import type { SpellId } from '../rules/spells';
import { buildLevel } from '../world/level';
import { captureLevel, type LevelDelta } from '../world/levelDelta';
import { circleBlocked, computeField } from '../world/nav';
import { camTarget } from '../render/cameraRig';
import { G } from './state';
import type { HeroStats } from './types';

export const SAVE_KEY = 'dv.save.v3';
export const MAX_CHARACTERS = 6;

export interface HeroSave {
  stats: HeroStats;
  inv: Inventory;
  gold: number; slain: number; key: boolean;
  spells: Partial<Record<SpellId, number>>;
  readied: SpellId | null;
  hotkeys: (SpellId | null)[];
  life: number; mana: number; lifeDrain: number;
  /** Where the hero stood (mid-level saves). */
  x: number; z: number;
}

export interface CharSave {
  id: string;
  cls: ClassId;
  name: string;
  /** Shown on the title screen without unpacking the hero. */
  clvl: number;
  depth: number;
  /** Each level's seed derives from it (SPEC §12.1). */
  runSeed: number;
  savedAt: number;
  hero: HeroSave;
  levels: Record<number, LevelDelta>;
  uniquesFound: UniqueId[];
}

export interface SaveFile { characters: CharSave[]; lastPlayed: string | null }

const empty = (): SaveFile => ({ characters: [], lastPlayed: null });

export function readSaves(): SaveFile {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const f = raw ? (JSON.parse(raw) as SaveFile) : null;
    return f && Array.isArray(f.characters) ? f : empty();
  } catch {
    return empty();
  }
}

function writeSaves(f: SaveFile): void {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(f)); } catch (e) { console.warn('save failed', e); }
}

/** Characters for the title screen, last played first, then most recently saved. */
export function listCharacters(): CharSave[] {
  const f = readSaves();
  return [...f.characters].sort((a, b) => (a.id === f.lastPlayed ? -1 : b.id === f.lastPlayed ? 1 : b.savedAt - a.savedAt));
}

export function deleteCharacter(id: string): void {
  const f = readSaves();
  f.characters = f.characters.filter(c => c.id !== id);
  if (f.lastPlayed === id) f.lastPlayed = null;
  writeSaves(f);
}

/** Whether the world is in a state worth saving: a character in play, alive, not between levels. */
export const canSave = (): boolean => !!G.charId && !G.inMenu && !G.transition && !G.hero.dead && G.hero.descend <= 0;

/** Writes the current character (its current level's delta included) to its slot. */
export function saveGame(): void {
  if (!canSave()) return;
  const h = G.hero, id = G.charId!;
  const hero: HeroSave = {
    stats: h.stats, inv: h.inv, gold: h.gold, slain: h.slain, key: h.key,
    spells: h.spells, readied: h.readied, hotkeys: h.hotkeys,
    life: h.life, mana: h.mana, lifeDrain: h.lifeDrain, x: h.x, z: h.z,
  };
  const c: CharSave = {
    id, cls: h.stats.cls, name: h.name, clvl: h.stats.clvl, depth: G.depth, runSeed: G.runSeed, savedAt: Date.now(),
    hero, levels: { ...G.levels, [G.depth]: captureLevel() }, uniquesFound: [...G.loot.found],
  };
  const f = readSaves();
  const i = f.characters.findIndex(x => x.id === id);
  if (i >= 0) f.characters[i] = c; else f.characters.push(c);
  f.lastPlayed = id;
  writeSaves(f);
  G.saveT = 30;
}

/** Room for one more character? */
export const hasFreeSlot = (): boolean => readSaves().characters.length < MAX_CHARACTERS;

/** Starts tracking a brand-new character (class select done, depth 1 about to be built); saves it at once. */
export function beginNewCharacter(): void {
  G.charId = `c${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  G.levels = {};
  G.loot.found = new Set();
}

/** Loads a saved character and puts them back where they were. */
export function continueCharacter(id: string): boolean {
  const c = readSaves().characters.find(x => x.id === id);
  if (!c) return false;
  scene.remove(G.hero.root);
  const h = createHero(c.cls, c.name), s = c.hero;
  Object.assign(h, {
    stats: s.stats, inv: s.inv, gold: s.gold, slain: s.slain,
    spells: s.spells, readied: s.readied, hotkeys: s.hotkeys, lifeDrain: s.lifeDrain,
  });
  reserveUids(Math.max(0, ...carried(h.inv).map(it => it.uid), ...Object.values(c.levels).flatMap(d => [...d.ground, ...d.graves.flatMap(g => g.pickups)].flatMap(p => ('item' in p ? [p.item.uid] : [])))));
  recompute(h);
  h.life = Math.min(s.life, h.d.maxLife); h.mana = Math.min(s.mana, h.d.maxMana);
  G.hero = h;
  G.charId = c.id;
  G.runSeed = c.runSeed;
  G.depth = c.depth;
  G.loot.found = new Set(c.uniquesFound);
  // the saved current level is rebuilt like any other visited level
  G.levels = { ...c.levels };
  clearShots();
  buildLevel(c.depth);
  // after the build: generating a level takes the previous level's key away
  h.key = s.key;
  if ((s.x || s.z) && !circleBlocked(s.x, s.z, h.r, true)) {
    h.x = s.x; h.z = s.z; h.root.position.set(h.x, 0, h.z);
    camTarget.set(h.x, 0, h.z); computeField();
  }
  const f = readSaves(); f.lastPlayed = c.id; writeSaves(f);
  return true;
}
