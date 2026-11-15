/**
 * Class select (SPEC §3.1): the three heroes stand in the town square; the chosen one steps forward into the
 * torchlight. Runs while the world is paused, through the loop's menu tick.
 */
import { signal } from '@preact/signals';
import { createHero } from '../actors/hero';
import { damp } from '../core/math';
import { updateCamera } from '../render/cameraRig';
import { updateLights } from '../render/lights';
import { GU, scene } from '../render/renderer';
import { CLASS_IDS, type ClassId } from '../rules/classes';
import { fade } from '../ui/store';
import { buildLevel } from '../world/level';
import { beginNewCharacter, saveGame } from './save';
import { setMenuTick } from './loop';
import { G } from './state';
import type { Hero } from './types';

export type MenuStep = 'class' | 'name';
export const menuStep = signal<MenuStep | null>(null);
export const menuClass = signal<ClassId>('warrior');

let heroes: Hero[] = [];
/** Screen-right and towards-camera directions on the floor (camera sits at +x, +z). */
const RIGHT = [Math.SQRT1_2, -Math.SQRT1_2], TOWARD = [Math.SQRT1_2, Math.SQRT1_2];

function tick(dt: number): void {
  G.now += dt;
  GU.uTime.value = G.now;
  fade.value = Math.max(0, fade.value - dt * 1.2);
  const cx = G.L.startRoom.cx * 2, cz = G.L.startRoom.cy * 2;
  heroes.forEach((h, i) => {
    const sel = h === G.hero, side = (i - 1) * 1.5, fwd = sel ? .9 : 0;
    h.x = damp(h.x, cx + RIGHT[0] * side + TOWARD[0] * fwd, 6, dt);
    h.z = damp(h.z, cz + RIGHT[1] * side + TOWARD[1] * fwd, 6, dt);
    h.root.position.set(h.x, 0, h.z);
    h.root.rotation.y = h.face = Math.PI / 4;
    h.body.position.y = Math.abs(Math.sin(G.now * 2 + i)) * (sel ? .03 : .01);
    h.armL.rotation.x = -2.3 + Math.sin(G.now * 1.3 + i) * .04;
  });
  updateLights(dt);
  updateCamera(dt, false);
}

/**
 * Shows the class select in town. `fresh` rebuilds the town and draws a new run seed first (coming from the title
 * screen, where some other character's level may be on screen).
 */
export function openClassSelect(fresh = false): void {
  if (fresh) {
    G.charId = null; G.levels = {}; G.portal = null; G.deepest = 0;
    G.runSeed = (Math.random() * 2 ** 32) >>> 0; G.depth = 0;
    buildLevel(0);
  }
  scene.remove(G.hero.root);
  heroes = CLASS_IDS.map(c => createHero(c, ''));
  const cx = G.L.startRoom.cx * 2, cz = G.L.startRoom.cy * 2;
  heroes.forEach((h, i) => { h.x = cx + RIGHT[0] * (i - 1) * 1.5; h.z = cz + RIGHT[1] * (i - 1) * 1.5; });
  G.hero = heroes[0];
  menuClass.value = 'warrior';
  menuStep.value = 'class';
  G.paused = true;
  G.inMenu = true;
  setMenuTick(tick);
  updateCamera(0, true);
}

/** Leaves class select without starting a run (back to the title screen). */
export function closeClassSelect(): void {
  for (const h of heroes) scene.remove(h.root);
  heroes = [];
  setMenuTick(null);
  menuStep.value = null;
}

export function chooseClass(c: ClassId): void {
  menuClass.value = c;
  G.hero = heroes[CLASS_IDS.indexOf(c)];
}

/** Starts the run with the chosen class and name in town (as in D1, SPEC §13). */
export function startRun(name: string): void {
  const chosen = G.hero;
  for (const h of heroes) if (h !== chosen) scene.remove(h.root);
  heroes = [];
  chosen.name = name;
  chosen.root.rotation.y = 0;
  chosen.body.position.y = 0;
  setMenuTick(null);
  menuStep.value = null;
  G.inMenu = false;
  G.paused = false;
  fade.value = 1;
  G.depth = 0;
  beginNewCharacter();
  buildLevel(0);
  saveGame();
}
