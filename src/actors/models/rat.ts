import * as THREE from 'three';
import { PI } from '../../core/math';
import { gBox, gCone, gCyl, gSph, glowSprite, mesh } from '../../render/geometry';
import { MAT } from '../../render/materials';
import type { RatParts } from '../../game/types';

export function buildRat(): RatParts {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const fur = new THREE.MeshStandardMaterial({ color: 0x4e4239, roughness: 1 }), pink = new THREE.MeshStandardMaterial({ color: 0x9a6a62, roughness: .8 });
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xff3020 });
  const tor = mesh(gSph(.3, 10, 8), fur, 0, .3, -.05, body); tor.scale.set(.85, .72, 1.45);
  const head = new THREE.Group(); head.position.set(0, .32, .36); body.add(head);
  const sn = mesh(gCone(.17, .38, 8), fur, 0, 0, .14, head); sn.rotation.x = PI / 2;
  mesh(gSph(.04, 5, 4), pink, 0, 0, .33, head);
  for (const s of [-1, 1]) { mesh(gSph(.075, 6, 5), pink, .1 * s, .12, -.02, head).scale.set(1, 1, .3); }
  const eyes: THREE.Sprite[] = [];
  for (const s of [-1, 1]) { mesh(gSph(.03, 5, 4), eyeM, .08 * s, .07, .1, head, false); eyes.push(glowSprite(0xff3018, .18, head, .085 * s, .07, .13)); }
  mesh(gBox(.06, .05, .03), MAT.bone, 0, -.06, .27, head);
  const legs: THREE.Group[] = [];
  for (const [x, z] of [[-.16, .22], [.16, .22], [-.17, -.25], [.17, -.25]]) { const l = new THREE.Group(); l.position.set(x, .2, z); body.add(l); mesh(gBox(.07, .2, .09), fur, 0, -.1, 0, l); legs.push(l); }
  const tail: THREE.Group[] = [], pz = -.45; let par: THREE.Group = body;
  for (let k = 0; k < 5; k++) { const g = new THREE.Group(); g.position.set(0, k === 0 ? .26 : 0, k === 0 ? pz : -.17); par.add(g); const c = mesh(gCyl(+(.03 - k * .005).toFixed(3), +(.025 - k * .004).toFixed(3), .18, 5), pink, 0, 0, -.09, g); c.rotation.x = PI / 2; tail.push(g); par = g; }
  root.scale.setScalar(1.2);
  return { root, body, head, legs, tail, eyes, mats: [fur, pink, eyeM, ...eyes.map(e => e.material)], flashMats: [fur, pink] };
}
