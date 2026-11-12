import { G } from '../game/state';

const keys = new Set<string>();
let lastInput = -1e9, atkQueued = false, padAtkPrev = false;
const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

addEventListener('keydown', e => {
  // UI handlers claim their keys with preventDefault; nothing reaches the game while a panel pauses it.
  if (e.defaultPrevented || G.paused) return;
  if (MOVE_KEYS.includes(e.code) || e.code === 'Space') {
    e.preventDefault();
    keys.add(e.code);
    lastInput = G.now;
    if (e.code === 'Space') atkQueued = true;
  }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

/** Drops held keys and any queued attack (used when a panel opens so the hero doesn't keep walking). */
export function resetInput(): void { keys.clear(); atkQueued = false; }

export interface InputState { mx: number; mz: number; atk: boolean }

/** Reads keyboard + gamepads into a world-space move vector (isometric) and an attack edge. */
export function readInput(): InputState {
  let ix = 0, iy = 0, atk = atkQueued;
  atkQueued = false;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) iy += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) iy -= 1;
  if (ix || iy) lastInput = G.now;
  if (keys.has('Space')) { atk = true; lastInput = G.now; }
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) {
    if (!p) continue;
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    if (Math.hypot(ax, ay) > 0.25) { ix += ax; iy -= ay; lastInput = G.now; }
    if (p.buttons[12]?.pressed) { iy += 1; lastInput = G.now; }
    if (p.buttons[13]?.pressed) { iy -= 1; lastInput = G.now; }
    if (p.buttons[14]?.pressed) { ix -= 1; lastInput = G.now; }
    if (p.buttons[15]?.pressed) { ix += 1; lastInput = G.now; }
    const b = !!(p.buttons[0]?.pressed || p.buttons[2]?.pressed);
    if (b && !padAtkPrev) atk = true;
    if (b) lastInput = G.now;
    padAtkPrev = b;
  }
  const l = Math.hypot(ix, iy);
  if (l > 1) { ix /= l; iy /= l; }
  return { mx: (ix - iy) * 0.7071, mz: (-ix - iy) * 0.7071, atk };
}

/** The player has control while they gave input in the last 4 s of game time; otherwise AUTO plays. */
export const manualActive = (): boolean => G.now - lastInput < 4;
