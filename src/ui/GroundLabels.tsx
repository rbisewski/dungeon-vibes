import { signal } from '@preact/signals';
import * as THREE from 'three';
import { G } from '../game/state';
import { camera } from '../render/renderer';
import { itemName } from '../rules/inventory';

interface Label { key: number; x: number; y: number; text: string; dim: boolean }
const labels = signal<Label[]>([]);

let altHeld = false;
addEventListener('keydown', e => { if (e.key === 'Alt') { e.preventDefault(); altHeld = true; } });
addEventListener('keyup', e => { if (e.key === 'Alt') altHeld = false; });
addEventListener('blur', () => { altHeld = false; });

const _v = new THREE.Vector3();

/**
 * Projects floor items to screen labels (SPEC §10.4): items within 2.5 m of the hero, or every item on screen while
 * Alt is held. Called once per rendered frame; a no-op signal write when nothing is labelled.
 */
export function updateGroundLabels(): void {
  const h = G.hero, out: Label[] = [];
  for (const p of G.L.pickups) {
    if (p.kind !== 'item' || p.t < .5) continue;
    if (!altHeld && Math.hypot(p.x - h.x, p.z - h.z) > 2.5) continue;
    _v.set(p.x, p.y + .45, p.z).project(camera);
    if (_v.x < -1 || _v.x > 1 || _v.y < -1 || _v.y > 1) continue;
    out.push({
      key: p.item.uid,
      x: (_v.x * .5 + .5) * innerWidth,
      y: (-_v.y * .5 + .5) * innerHeight,
      text: itemName(p.item).toUpperCase(),
      dim: p.discarded,
    });
  }
  if (out.length || labels.value.length) labels.value = out;
}

export function GroundLabels() {
  return (
    <>
      {labels.value.map(l => (
        <div key={l.key} class={'groundLabel px' + (l.dim ? ' dim' : '')} style={{ left: l.x, top: l.y }}>{l.text}</div>
      ))}
    </>
  );
}
