/** Floating damage numbers (SPEC §3.4): off by default, as in D1; the game menu turns them on. */
import { signal } from '@preact/signals';
import * as THREE from 'three';
import { G } from '../game/state';
import { settings } from '../game/settings';
import { camera } from '../render/renderer';

/** `dealt`: hero damage on a monster; `crit`: a critical hit; `taken`: damage to the hero; `warded`: reduced by a ward. */
export type NumKind = 'dealt' | 'crit' | 'taken' | 'warded';
interface Num { id: number; x: number; y: number; z: number; text: string; kind: NumKind; born: number }
interface Shown { id: number; left: number; top: number; text: string; kind: NumKind; alpha: number }

const LIFE = 1, MAX = 40;
let nums: Num[] = [], nextId = 0;
const shown = signal<Shown[]>([]);
const _v = new THREE.Vector3();

export function addDamageNumber(x: number, y: number, z: number, amount: number, kind: NumKind): void {
  if (!settings.value.damageNumbers || amount <= 0) return;
  nums.push({ id: nextId++, x: x + (Math.random() - .5) * .3, y, z, text: String(Math.round(amount)), kind, born: G.now });
  if (nums.length > MAX) nums = nums.slice(-MAX);
}

/** Projects live numbers to the screen; they rise and fade over 1 s of game time (frozen while paused). */
export function updateDamageNumbers(): void {
  nums = nums.filter(n => G.now - n.born < LIFE);
  if (!nums.length && !shown.value.length) return;
  shown.value = nums.map(n => {
    const age = (G.now - n.born) / LIFE;
    _v.set(n.x, n.y + age * .9, n.z).project(camera);
    return { id: n.id, left: (_v.x * .5 + .5) * innerWidth, top: (-_v.y * .5 + .5) * innerHeight, text: n.text, kind: n.kind, alpha: 1 - age * age };
  });
}

export function DamageNumbers() {
  return (
    <>
      {shown.value.map(n => (
        <div key={n.id} class={`dmgNum px ${n.kind}`} style={{ left: n.left, top: n.top, opacity: n.alpha }}>{n.text}</div>
      ))}
    </>
  );
}
