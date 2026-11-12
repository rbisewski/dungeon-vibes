import * as THREE from 'three';
import { gSph, glowSprite, mesh } from '../../render/geometry';
import { MAT } from '../../render/materials';
import type { SlimeParts } from '../../game/types';

export function buildSlime(): SlimeParts {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const goo = new THREE.MeshStandardMaterial({ color: 0x5aa040, roughness: .22, transparent: true, opacity: .82, emissive: 0x0e2a08 });
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xd8ff60 });
  const blob = mesh(gSph(.46, 14, 10), goo, 0, .4, 0, body); blob.scale.set(1, .85, 1);
  mesh(gSph(.12, 8, 6), MAT.bone, .05, .32, -.08, body, false);
  const eyes: THREE.Sprite[] = [];
  for (const s of [-1, 1]) { mesh(gSph(.065, 6, 5), MAT.dark, .15 * s, .52, .34, body, false); mesh(gSph(.025, 5, 4), eyeM, .15 * s, .53, .395, body, false); eyes.push(glowSprite(0xb8ff40, .22, body, .15 * s, .53, .42)); }
  return { root, body, blob, eyes, mats: [goo, eyeM, ...eyes.map(e => e.material)], flashMats: [goo] };
}
