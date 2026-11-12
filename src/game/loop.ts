import { computeField } from '../world/nav';
import { buildLevel } from '../world/level';
import { resolveCollisions } from '../world/collisions';
import { updateWorld } from '../world/update';
import { updateHero } from '../actors/hero';
import { updateMonsters } from '../actors/monsterAI';
import { updateLights } from '../render/lights';
import { fxAdd, fxNorm } from '../render/particles';
import { renderFrame } from '../render/post';
import { GU } from '../render/renderer';
import { updateCamera } from '../render/cameraRig';
import { Snd } from '../audio/sound';
import { SFX } from '../audio/sfx';
import { clamp, R, rr } from '../core/math';
import { fade, tickToast } from '../ui/store';
import { syncHud } from '../ui/syncHud';
import { G } from './state';

/** Simulation step: the world always advances in 1/60 s increments. */
export const STEP = 1 / 60;
/** Hitstop slows the simulation to this fraction of real time. */
const HITSTOP_SCALE = 0.08;

let last = performance.now(), acc = 0, crackAcc = 0, dripT = 3, hudT = 0;

/** Advances fade-out → rebuild → fade-in for descend and death transitions. */
function updateTransition(dt: number): void {
  const tr = G.transition;
  if (!tr) { fade.value = Math.max(0, fade.value - dt * 1.2); return; }
  tr.t += dt;
  const out = tr.kind === 'descend' ? 1.3 : 0.9;
  if (tr.t < out) fade.value = Math.max(fade.value, tr.t / out);
  else if (!tr.built) {
    tr.built = true;
    fade.value = 1;
    const hero = G.hero;
    if (tr.kind === 'descend') { G.depth++; hero.hp = Math.min(hero.maxHp, hero.hp + 2); }
    else { hero.hp = hero.maxHp; hero.potions = Math.max(hero.potions, 1); }
    buildLevel(G.depth);
  } else {
    fade.value = Math.max(0, fade.value - dt * 1.4);
    if (fade.value <= 0) G.transition = null;
  }
}

/** One fixed simulation step; returns the (hitstop-scaled) time the world advanced. */
function step(frozen: boolean): number {
  G.now += STEP;
  let g = STEP;
  if (G.hitstop > 0) { G.hitstop -= STEP; g = STEP * HITSTOP_SCALE; }
  if (!frozen) {
    const L = G.L;
    L.fieldT -= g;
    if (L.fieldT <= 0) { L.fieldT = 0.25; computeField(); }
    updateHero(g); updateMonsters(g); resolveCollisions(); updateWorld(g);
  }
  return g;
}

function ambientSound(dt: number): void {
  if (!Snd.on) return;
  crackAcc += dt * 12;
  while (crackAcc > 1) { crackAcc -= rr(0.5, 1.5); if (R() < 0.7) SFX.crackle(); }
  dripT -= dt;
  if (dripT <= 0) { dripT = rr(3, 8); SFX.drip(); }
}

function frame(nowMs: number): void {
  requestAnimationFrame(frame);
  const dt = clamp((nowMs - last) / 1000, 0, 0.05);
  last = nowMs;
  updateTransition(dt);
  const tr = G.transition;
  const frozen = !!(tr && tr.built && fade.value >= 1);
  acc += dt;
  let simDt = 0;
  while (acc >= STEP) { acc -= STEP; simDt += step(frozen); }
  GU.uTime.value = G.now;
  const hero = G.hero;
  hero.root.position.x = hero.x; hero.root.position.z = hero.z; hero.root.rotation.y = hero.face;
  updateLights(dt);
  fxAdd.update(simDt, G.now); fxNorm.update(simDt, G.now);
  ambientSound(dt);
  updateCamera(dt, !!(tr && tr.built && fade.value >= 0.99));
  tickToast(dt);
  hudT -= dt;
  if (hudT <= 0) { hudT = 0.1; syncHud(); }
  renderFrame();
}

export function startLoop(): void {
  last = performance.now();
  requestAnimationFrame(frame);
}
