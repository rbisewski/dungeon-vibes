/** Bat, giant spider, Brood Mother and egg sac models (SPEC §8.3, §9). */
import * as THREE from 'three';
import { PI } from '../../core/math';
import { gBox, gCone, gCyl, gSph, glowSprite, mesh } from '../../render/geometry';
import type { BatParts, EggParts, SpiderParts } from '../../game/types';

/** Winged Fiend: furry body and two membrane wings; the body flies at about 1.1 m (set by the animation). */
export function buildBat(): BatParts {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const fur = new THREE.MeshStandardMaterial({ color: 0x3a2a26, roughness: 1 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x5a3a36, roughness: .9, side: THREE.DoubleSide });
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xff3020 });
  mesh(gSph(.14, 8, 6), fur, 0, 0, 0, body).scale.set(1, .9, 1.2);
  mesh(gSph(.09, 8, 6), fur, 0, .05, .14, body);
  for (const s of [-1, 1]) { const ear = mesh(gCone(.035, .1, 4), fur, .05 * s, .14, .14, body); ear.rotation.z = -.3 * s; }
  const eyes: THREE.Sprite[] = [];
  for (const s of [-1, 1]) { mesh(gSph(.02, 4, 3), eyeM, .04 * s, .07, .22, body, false); eyes.push(glowSprite(0xff3018, .16, body, .04 * s, .07, .24)); }
  const wings: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(.1 * s, .02, 0); body.add(w);
    // membrane: three fingers fanning out
    for (let k = 0; k < 3; k++) {
      const f = mesh(gBox(.36, .015, .12), skin, .2 * s, 0, .06 - k * .1, w, false);
      f.rotation.y = s * (k - 1) * .25;
    }
    mesh(gCyl(.012, .012, .42, 4), fur, .21 * s, .01, .08, w, false).rotation.z = PI / 2;
    wings.push(w);
  }
  return { root, body, wings, eyes, mats: [fur, skin, eyeM, ...eyes.map(e => e.material)], flashMats: [fur, skin] };
}

/**
 * Giant spider: thorax and abdomen, eight two-segment legs, a cluster of red eyes. `brood` builds the Brood Mother's
 * colouring (dark violet, a red hourglass on the abdomen); the caller scales it up.
 */
export function buildSpider(brood = false): SpiderParts {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const shell = new THREE.MeshStandardMaterial({ color: brood ? 0x1c1424 : 0x2a2420, roughness: .7, metalness: .1 });
  const hair = new THREE.MeshStandardMaterial({ color: brood ? 0x3a2448 : 0x4a3a2c, roughness: 1 });
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xff2010 });
  mesh(gSph(.2, 10, 8), shell, 0, .42, .12, body).scale.set(1, .75, 1.1);
  mesh(gSph(.3, 10, 8), hair, 0, .5, -.32, body).scale.set(1, .85, 1.25);
  if (brood) for (const s of [-1, 1]) { const g = mesh(gCone(.08, .14, 4), eyeM, 0, .76, -.32 + s * .07, body, false); g.rotation.x = s > 0 ? PI : 0; g.scale.set(1, 1, .3); }
  for (const s of [-1, 1]) { const f = mesh(gCone(.03, .14, 4), shell, .06 * s, .34, .32, body); f.rotation.x = PI * .8; }
  const eyes: THREE.Sprite[] = [];
  for (let k = 0; k < 8; k++) { const x = ((k % 4) - 1.5) * .04, y = .5 + Math.floor(k / 4) * .04; mesh(gSph(.016, 4, 3), eyeM, x, y, .29, body, false); }
  for (const s of [-1, 1]) eyes.push(glowSprite(0xff2010, .2, body, .05 * s, .52, .31));
  const legs: SpiderParts['legs'] = [];
  for (let i = 0; i < 8; i++) {
    const s = i < 4 ? -1 : 1, k = i % 4, z = .22 - k * .12;
    const hip = new THREE.Group(); hip.position.set(.14 * s, .44, z); body.add(hip);
    hip.rotation.y = s * (PI / 2) - s * (k - 1.5) * .45;
    // Upper leg rises outward at 60°; the lower leg drops from the knee to the floor, slightly outward.
    const upper = mesh(gCyl(.025, .02, .42, 5), hair, 0, .105, .18, hip); upper.rotation.x = 1.05;
    const knee = new THREE.Group(); knee.position.set(0, .21, .36); hip.add(knee);
    const lower = mesh(gCyl(.02, .012, .68, 5), shell, 0, -.32, .1, knee); lower.rotation.x = PI - .32;
    legs.push({ hip, knee });
  }
  return { root, body, legs, eyes, mats: [shell, hair, eyeM, ...eyes.map(e => e.material)], flashMats: [shell, hair] };
}

/** Brood Mother egg sac: a pale, veined blob on a web mat; the animation makes it pulse. */
export function buildEggSac(): EggParts {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const skin = new THREE.MeshStandardMaterial({ color: 0xc8c0a0, roughness: .5, emissive: 0x302810 });
  const web = new THREE.MeshStandardMaterial({ color: 0xd8d8d0, roughness: 1, transparent: true, opacity: .35, side: THREE.DoubleSide });
  const vein = new THREE.MeshStandardMaterial({ color: 0x6a3040, roughness: .8 });
  const sac = mesh(gSph(.36, 12, 10), skin, 0, .34, 0, body); sac.scale.set(1, 1.15, 1);
  for (let k = 0; k < 5; k++) { const v = mesh(gBox(.02, .5, .02), vein, Math.sin(k * 1.26) * .33, .36, Math.cos(k * 1.26) * .33, body, false); v.rotation.set(Math.cos(k * 1.26) * .5, 0, -Math.sin(k * 1.26) * .5); }
  const mat = mesh(gCyl(.75, .75, .01, 12), web, 0, .01, 0, body, false); mat.scale.set(1, 1, .8);
  return { root, body, sac, eyes: [], mats: [skin, web, vein], flashMats: [skin] };
}
