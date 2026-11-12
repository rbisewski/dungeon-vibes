import * as THREE from 'three';
import { PI } from '../../core/math';
import { GEO, gBox, gCone, gCyl, gSph, glowSprite, mesh } from '../../render/geometry';
import { MAT } from '../../render/materials';
import type { SkeletonParts } from '../../game/types';

export function buildSkeleton(boss: boolean): SkeletonParts {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const bone = new THREE.MeshStandardMaterial({ color: boss ? 0x9c9282 : 0xcdc2a4, roughness: .85 });
  const metal = new THREE.MeshStandardMaterial({ color: boss ? 0x3a3438 : 0x6a4a36, roughness: .6, metalness: .45 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: 1 });
  const eyeCol = boss ? 0xc070ff : 0xff5a22;
  const eyeM = new THREE.MeshBasicMaterial({ color: eyeCol });
  const legs: SkeletonParts['legs'] = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(.1 * s, .62, 0); body.add(hip);
    mesh(gCyl(.035, .03, .32, 6), bone, 0, -.16, 0, hip);
    const knee = new THREE.Group(); knee.position.y = -.32; hip.add(knee);
    mesh(gCyl(.03, .025, .27, 6), bone, 0, -.135, 0, knee); mesh(gBox(.08, .04, .15), bone, 0, -.28, .03, knee);
    legs.push({ hip, knee });
  }
  mesh(gBox(.26, .08, .12), bone, 0, .64, 0, body);
  const torso = new THREE.Group(); torso.position.y = .66; body.add(torso);
  mesh(gCyl(.03, .03, .4, 6), bone, 0, .2, -.05, torso);
  for (let k = 0; k < 4; k++) mesh(gBox(+(.3 - k * .025).toFixed(3), .035, .2), bone, 0, .2 + k * .07, 0, torso);
  mesh(gBox(.42, .05, .1), bone, 0, .46, 0, torso);
  const head = new THREE.Group(); head.position.y = .62; torso.add(head);
  const sk = mesh(gSph(.14, 10, 8), bone, 0, 0, 0, head); sk.scale.set(1, 1.08, 1.05);
  const jaw = mesh(gBox(.15, .05, .12), bone, 0, -.12, .03, head);
  const eyes: THREE.Sprite[] = [];
  for (const s of [-1, 1]) { mesh(gSph(.035, 6, 5), dark, .05 * s, .01, .115, head, false); mesh(gSph(.018, 5, 4), eyeM, .05 * s, .01, .135, head, false); eyes.push(glowSprite(eyeCol, .2, head, .05 * s, .01, .16)); }
  const arms: { sh: THREE.Group; el: THREE.Group }[] = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(.22 * s, .44, 0); torso.add(sh);
    mesh(gCyl(.03, .025, .27, 6), bone, 0, -.135, 0, sh);
    const el = new THREE.Group(); el.position.y = -.27; sh.add(el);
    mesh(gCyl(.025, .022, .25, 6), bone, 0, -.125, 0, el); mesh(gSph(.04, 6, 5), bone, 0, -.26, 0, el);
    arms.push({ sh, el });
  }
  const weapon = new THREE.Group(); weapon.position.y = -.27; arms[0].el.add(weapon); weapon.rotation.x = PI;
  if (boss) {
    mesh(gCyl(.03, .03, 1.1, 6), MAT.wood, 0, .35, 0, weapon);
    const ax = mesh(GEO.blade, metal, 0, .82, .0, weapon); ax.scale.set(.6, 1, .6); ax.rotation.set(0, PI / 2, PI / 2);
    for (const s of [-1, 1]) { const h = mesh(gCone(.06, .32, 6), bone, .11 * s, .14, -.02, head); h.rotation.z = -.9 * s; }
    for (const s of [-1, 1]) mesh(gSph(.13, 8, 6), metal, .24 * s, .46, 0, torso).scale.set(1, .7, 1);
    mesh(gCyl(.16, .2, .26, 8), metal, 0, .3, 0, torso);
  } else {
    mesh(gBox(.05, .62, .015), metal, 0, .38, 0, weapon); mesh(gBox(.16, .03, .04), metal, 0, .07, 0, weapon); mesh(gCyl(.02, .02, .1, 5), MAT.wood, 0, 0, 0, weapon);
  }
  if (boss) root.scale.setScalar(1.8);
  return { root, body, legs, torso, head, jaw, armR: arms[0].sh, elR: arms[0].el, armL: arms[1].sh, weapon, eyes, mats: [bone, metal, dark, eyeM, ...eyes.map(e => e.material)], flashMats: [bone, metal] };
}
