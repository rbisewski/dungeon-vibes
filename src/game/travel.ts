/**
 * Moving between levels (SPEC §11, §13): stairs, town entrances, Town Portal, and waking in town after death. The
 * level being left is captured into the character's level deltas before the next one is built.
 */
import { clearArrows } from '../actors/arrows';
import { clearShots } from '../actors/shots';
import { clearSpellFx } from '../actors/spells';
import { SFX } from '../audio/sfx';
import { toast } from '../ui/store';
import { addPortalExit, buildLevel, placeHero } from '../world/level';
import { captureLevel } from '../world/levelDelta';
import { circleBlocked } from '../world/nav';
import { G } from './state';
import type { Exit } from './types';

function leaveLevel(): void {
  clearSpellFx(); clearArrows(); clearShots();
  if (G.charId) G.levels[G.depth] = captureLevel();
}

/** A free spot next to an exit (in front of it first), for arriving beside stairs. */
function besideExit(e: Exit): { x: number; z: number } {
  for (const [dx, dz] of [[0, 1.7], [1.7, 0], [-1.7, 0], [0, -1.7], [1.3, 1.3], [-1.3, 1.3], [1.3, -1.3], [-1.3, -1.3]]) {
    const x = e.x + dx, z = e.z + dz;
    if (!circleBlocked(x, z, .45, true) && !G.L.exits.some(o => Math.abs(x - o.x) < o.r + .3 && Math.abs(z - o.z) < o.r + .3)) return { x, z };
  }
  return { x: e.x, z: e.z + 1.7 };
}

/** Goes through `ex` to the level it leads to. */
export function travel(ex: Exit): void {
  const h = G.hero, from = G.depth;
  // Returning to the dungeon through the portal closes the pair; the hero lands where it was opened.
  const portalEnd = ex.kind === 'portal' && ex.to !== 0 ? G.portal : null;
  if (portalEnd) G.portal = null;
  leaveLevel();
  // Taking stairs down restores a fifth of max life (the legacy +2 of 10 hearts).
  if (ex.kind === 'down' && from > 0) h.life = Math.min(h.d.maxLife, h.life + h.d.maxLife * .2);
  G.depth = ex.to;
  G.deepest = Math.max(G.deepest, ex.to);
  buildLevel(ex.to);
  if (ex.kind === 'up') {
    const back = G.L.exits.find(e => e.kind === 'down' && e.to === from);
    if (back) { const p = besideExit(back); placeHero(p.x, p.z); }
  } else if (portalEnd) {
    placeHero(portalEnd.x, portalEnd.z);
  } else if (ex.kind === 'portal') {
    const back = G.L.exits.find(e => e.kind === 'portal');
    if (back) placeHero(back.x, back.z, back);
  }
}

/** After death: wake in town with full life and mana (SPEC §11, §13). The graves stay in the level's delta. */
export function wakeInTown(): void {
  const h = G.hero;
  leaveLevel();
  const graves = Object.values(G.levels).some(d => d.graves.length);
  G.depth = 0;
  buildLevel(0);
  h.life = h.d.maxLife; h.mana = h.d.maxMana;
  toast('YOU WAKE IN TOWN', graves ? 'YOUR BELONGINGS LIE WHERE YOU FELL' : '');
}

/** Town Portal (SPEC §13): opens a portal in front of the hero, replacing any open one. Fizzles in town. */
export function openTownPortal(): boolean {
  const h = G.hero, L = G.L;
  if (G.depth === 0) { SFX.fizzle(); toast('THE PORTAL WILL NOT OPEN HERE'); return false; }
  const old = L.exits.find(e => e.kind === 'portal');
  if (old) { if (old.o) L.group.remove(old.o); L.exits.splice(L.exits.indexOf(old), 1); }
  let x = h.x + Math.sin(h.face) * 1.4, z = h.z + Math.cos(h.face) * 1.4;
  if (circleBlocked(x, z, .5, true)) { x = h.x; z = h.z; }
  G.portal = { depth: G.depth, x, z };
  // the hero may be standing in it: it only works after stepping off and on
  const e = addPortalExit(x, z, 0);
  if (Math.abs(h.x - x) < e.r && Math.abs(h.z - z) < e.r) h.onExit = e;
  SFX.cast();
  toast('A PORTAL OPENS', 'IT LEADS TO TOWN');
  return true;
}
