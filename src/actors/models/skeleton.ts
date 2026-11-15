/**
 * Humanoid monsters on one rig (hips/knees, torso, head with jaw, two arms, weapon in the right hand), so they share
 * the walk and attack animation: skeleton, Bone Warden, zombie, Fallen and skeleton archer (SPEC §8.3).
 */
import * as THREE from 'three';
import { PI } from '../../core/math';
import { GEO, gBox, gCone, gCyl, gSph, glowSprite, mesh } from '../../render/geometry';
import { MAT } from '../../render/materials';
import type { HumanoidType, SkeletonParts } from '../../game/types';

const std = (color: number, roughness: number, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

const EYES: Record<HumanoidType, number> = { skeleton: 0xff5a22, boss: 0xc070ff, archer: 0xff7a2a, zombie: 0xd0c040, fallen: 0xffc020 };

export function buildHumanoid(type: HumanoidType): SkeletonParts {
  const boss = type === 'boss', flesh = type === 'zombie' || type === 'fallen';
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  // `bone` is the main body material: bone for the undead, skin for zombies and Fallen.
  const bone = std(boss ? 0x9c9282 : type === 'zombie' ? 0x6f7f5a : type === 'fallen' ? 0x9a3024 : 0xcdc2a4, .85);
  const metal = std(boss ? 0x3a3438 : type === 'zombie' ? 0x3a3428 : 0x6a4a36, type === 'zombie' ? 1 : .6, type === 'zombie' ? 0 : .45);
  const dark = std(0x0a0806, 1);
  const eyeCol = EYES[type];
  const eyeM = new THREE.MeshBasicMaterial({ color: eyeCol });
  const limb = flesh ? 1.5 : 1;
  const legs: SkeletonParts['legs'] = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(.1 * s, .62, 0); body.add(hip);
    mesh(gCyl(.035 * limb, .03 * limb, .32, 6), type === 'zombie' ? metal : bone, 0, -.16, 0, hip);
    const knee = new THREE.Group(); knee.position.y = -.32; hip.add(knee);
    mesh(gCyl(.03 * limb, .025 * limb, .27, 6), bone, 0, -.135, 0, knee); mesh(gBox(.08, .04, .15), bone, 0, -.28, .03, knee);
    legs.push({ hip, knee });
  }
  mesh(gBox(.26, .08, .12), flesh ? metal : bone, 0, .64, 0, body);
  const torso = new THREE.Group(); torso.position.y = .66; body.add(torso);
  if (flesh) {
    // a fleshy trunk instead of ribs; zombies wear rags
    mesh(gCyl(.17, .15, .44, 8), type === 'zombie' ? metal : bone, 0, .22, 0, torso);
    if (type === 'zombie') { mesh(gBox(.3, .14, .2), bone, 0, .4, .02, torso); mesh(gBox(.05, .12, .02), dark, .06, .18, .16, torso); }
  } else {
    mesh(gCyl(.03, .03, .4, 6), bone, 0, .2, -.05, torso);
    for (let k = 0; k < 4; k++) mesh(gBox(+(.3 - k * .025).toFixed(3), .035, .2), bone, 0, .2 + k * .07, 0, torso);
  }
  mesh(gBox(.42, .05, .1), bone, 0, .46, 0, torso);
  const head = new THREE.Group(); head.position.y = .62; torso.add(head);
  const sk = mesh(gSph(.14, 10, 8), bone, 0, 0, 0, head); sk.scale.set(1, 1.08, 1.05);
  const jaw = mesh(gBox(.15, .05, .12), bone, 0, -.12, .03, head);
  const eyes: THREE.Sprite[] = [];
  for (const s of [-1, 1]) { mesh(gSph(.035, 6, 5), dark, .05 * s, .01, .115, head, false); mesh(gSph(.018, 5, 4), eyeM, .05 * s, .01, .135, head, false); eyes.push(glowSprite(eyeCol, .2, head, .05 * s, .01, .16)); }
  const arms: { sh: THREE.Group; el: THREE.Group }[] = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(.22 * s, .44, 0); torso.add(sh);
    mesh(gCyl(.03 * limb, .025 * limb, .27, 6), bone, 0, -.135, 0, sh);
    const el = new THREE.Group(); el.position.y = -.27; sh.add(el);
    mesh(gCyl(.025 * limb, .022 * limb, .25, 6), bone, 0, -.125, 0, el); mesh(gSph(.04 * limb, 6, 5), bone, 0, -.26, 0, el);
    arms.push({ sh, el });
  }
  const weapon = new THREE.Group(); weapon.position.y = -.27; arms[0].el.add(weapon); weapon.rotation.x = PI;
  switch (type) {
    case 'boss':
      mesh(gCyl(.03, .03, 1.1, 6), MAT.wood, 0, .35, 0, weapon);
      { const ax = mesh(GEO.blade, metal, 0, .82, .0, weapon); ax.scale.set(.6, 1, .6); ax.rotation.set(0, PI / 2, PI / 2); }
      for (const s of [-1, 1]) { const h = mesh(gCone(.06, .32, 6), bone, .11 * s, .14, -.02, head); h.rotation.z = -.9 * s; }
      for (const s of [-1, 1]) mesh(gSph(.13, 8, 6), metal, .24 * s, .46, 0, torso).scale.set(1, .7, 1);
      mesh(gCyl(.16, .2, .26, 8), metal, 0, .3, 0, torso);
      root.scale.setScalar(1.8);
      break;
    case 'skeleton':
      mesh(gBox(.05, .62, .015), metal, 0, .38, 0, weapon); mesh(gBox(.16, .03, .04), metal, 0, .07, 0, weapon); mesh(gCyl(.02, .02, .1, 5), MAT.wood, 0, 0, 0, weapon);
      break;
    case 'archer': {
      // Bow along the weapon's ±y, limbs curving back in x; quiver on the back.
      const pt = (u: number): [number, number] => [.08 * u * u, .27 * u];
      for (const s of [1, -1]) for (let k = 0; k < 4; k++) {
        const [x0, y0] = pt(k / 4), [x1, y1] = pt((k + 1) / 4);
        const seg = mesh(gBox(.025, Math.hypot(x1 - x0, y1 - y0) + .01, .025), MAT.wood, (x0 + x1) / 2, s * (y0 + y1) / 2, 0, weapon);
        seg.rotation.z = -s * Math.atan2(x1 - x0, y1 - y0);
      }
      mesh(gBox(.005, .54, .005), MAT.bone, .08, 0, 0, weapon, false);
      const q = mesh(gCyl(.05, .045, .36, 6), metal, -.06, .3, -.14, torso); q.rotation.z = .3;
      break;
    }
    case 'fallen':
      // horns and a short spear
      for (const s of [-1, 1]) { const h = mesh(gCone(.035, .16, 5), MAT.bone, .08 * s, .14, 0, head); h.rotation.z = -.5 * s; }
      mesh(gCyl(.015, .015, .7, 5), MAT.wood, 0, .25, 0, weapon); mesh(gCone(.035, .12, 5), metal, 0, .64, 0, weapon);
      root.scale.setScalar(.72);
      break;
    case 'zombie':
      // no weapon: clawing hands
      break;
  }
  return { root, body, legs, torso, head, jaw, armR: arms[0].sh, elR: arms[0].el, armL: arms[1].sh, weapon, eyes, mats: [bone, metal, dark, eyeM, ...eyes.map(e => e.material)], flashMats: [bone, metal] };
}
