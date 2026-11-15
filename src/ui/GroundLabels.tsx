import { signal } from '@preact/signals';
import * as THREE from 'three';
import { G } from '../game/state';
import { camera } from '../render/renderer';
import { itemName, quality, type Quality } from '../rules/inventory';
import { disarmChance } from '../rules/skills';

/** `cls` is the label's colour class: an item quality, or `trap` for a Thief's disarm chance. */
interface Label { key: number | string; x: number; y: number; text: string; dim: boolean; cls: `q-${Quality}` | 'trap' | 'place' }
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
      cls: `q-${quality(p.item)}`,
    });
  }
  // SPEC §3.1a: a Thief sees each nearby trap's disarm chance.
  if (h.stats.cls === 'thief') G.L.traps.forEach((tr, i) => {
    if (tr.disabled || Math.hypot(tr.x - h.x, tr.z - h.z) > 3) return;
    _v.set(tr.x, .6, tr.z).project(camera);
    out.push({ key: `trap${i}`, x: (_v.x * .5 + .5) * innerWidth, y: (-_v.y * .5 + .5) * innerHeight, text: `DISARM ${disarmChance(h.d.attr.dex, G.L.depth)}% (R)`, dim: false, cls: 'trap' });
  });
  // Exits and the stash (SPEC §13): named when the hero is within 5 m.
  const place = (key: string, x: number, y: number, z: number, text: string, dim = false): void => {
    if (Math.hypot(x - h.x, z - h.z) > 5) return;
    _v.set(x, y, z).project(camera);
    out.push({ key, x: (_v.x * .5 + .5) * innerWidth, y: (-_v.y * .5 + .5) * innerHeight, text, dim, cls: 'place' });
  };
  G.L.exits.forEach((e, i) => {
    const where = e.to === 0 ? 'TOWN' : `DEPTH ${e.to}`;
    const text = e.kind === 'portal' ? `PORTAL TO ${where}` : e.kind === 'up' ? `UP TO ${where}` : G.depth === 0 ? (e.open ? where : `${where} - SEALED`) : '';
    if (text) place(`exit${i}`, e.x, e.kind === 'portal' ? 2.6 : 1.2, e.z, text, !e.open);
  });
  if (G.L.stash) place('stash', G.L.stash.x, 1.6, G.L.stash.z, 'STASH');
  if (out.length || labels.value.length) labels.value = out;
}

export function GroundLabels() {
  return (
    <>
      {labels.value.map(l => (
        <div key={l.key} class={`groundLabel px ${l.cls}` + (l.dim ? ' dim' : '')} style={{ left: l.x, top: l.y }}>{l.text}</div>
      ))}
    </>
  );
}
