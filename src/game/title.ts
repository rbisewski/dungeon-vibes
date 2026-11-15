/**
 * Title screen (SPEC §12.2): lists saved characters (class, name, clvl, depth) over the dungeon backdrop.
 * CONTINUE loads one, NEW CHARACTER opens class select, DELETE removes one.
 */
import { signal } from '@preact/signals';
import { updateCamera } from '../render/cameraRig';
import { updateLights } from '../render/lights';
import { GU } from '../render/renderer';
import { closePanels } from '../ui/actions';
import { fade } from '../ui/store';
import { openClassSelect } from './classSelect';
import { setMenuTick } from './loop';
import { canSave, continueCharacter, deleteCharacter, listCharacters, saveGame, type CharSave } from './save';
import { G } from './state';

export const titleOpen = signal(false);
export const titleChars = signal<CharSave[]>([]);

function tick(dt: number): void {
  G.now += dt;
  GU.uTime.value = G.now;
  fade.value = Math.max(0, fade.value - dt * 1.2);
  updateLights(dt);
  updateCamera(dt, false);
}

/** Shows the title over whatever level is built; without saved characters, goes straight to class select. */
export function openTitle(): void {
  const chars = listCharacters();
  if (!chars.length) { openClassSelect(); return; }
  titleChars.value = chars;
  G.hero.root.visible = false;
  G.paused = true;
  G.inMenu = true;
  titleOpen.value = true;
  setMenuTick(tick);
}

function closeTitle(): void {
  titleOpen.value = false;
  setMenuTick(null);
}

export function titleContinue(id: string): void {
  closeTitle();
  G.inMenu = false;
  G.paused = false;
  fade.value = 1;
  if (!continueCharacter(id)) openTitle();
}

export function titleNew(): void {
  closeTitle();
  openClassSelect(true);
}

export function titleDelete(id: string): void {
  deleteCharacter(id);
  titleChars.value = listCharacters();
  if (!titleChars.value.length) { closeTitle(); openClassSelect(); }
}

/** Saves the character being played and returns to the title screen. */
export function quitToTitle(): void {
  if (canSave()) saveGame();
  closePanels();
  G.charId = null;
  G.levels = {};
  openTitle();
}
