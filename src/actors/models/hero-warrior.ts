import * as THREE from 'three';
import { PI } from '../../core/math';
import { makeFlames } from '../../render/flames';
import { GEO, gBox, gCone, gCyl, gSph, mesh } from '../../render/geometry';
import { MAT, trailMat } from '../../render/materials';
import { scene } from '../../render/renderer';
import type { HeroParts } from '../../game/types';

export function buildHero(): HeroParts {
  const M = {
    cloak: new THREE.MeshStandardMaterial({ color: 0x5a2c22, roughness: 1, side: THREE.DoubleSide }),
    tunic: new THREE.MeshStandardMaterial({ color: 0x3c3428, roughness: 1 }),
    armor: new THREE.MeshStandardMaterial({ color: 0x9a9aa2, roughness: .42, metalness: .55 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: .9 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xc08a68, roughness: .85 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xd0d4dc, roughness: .28, metalness: .85 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x5a3c22, roughness: .9 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x080606, roughness: 1 })
  };
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const legs: THREE.Group[] = [];
  for (const s of [-1, 1]) { const hip = new THREE.Group(); hip.position.set(.1 * s, .5, 0); body.add(hip); mesh(gBox(.13, .28, .14), M.tunic, 0, -.14, 0, hip); mesh(gBox(.15, .24, .2), M.leather, 0, -.38, .025, hip); legs.push(hip); }
  const torso = new THREE.Group(); torso.position.y = .5; body.add(torso);
  mesh(gCyl(.19, .23, .18, 8), M.tunic, 0, 0, 0, torso);
  mesh(gCyl(.2, .2, .06, 8), M.leather, 0, .1, 0, torso);
  mesh(gBox(.07, .05, .03), MAT.gold, 0, .1, .2, torso);
  mesh(gCyl(.21, .18, .36, 8), M.armor, 0, .3, 0, torso);
  for (const s of [-1, 1]) mesh(gSph(.1, 8, 6), M.armor, .2 * s, .45, 0, torso).scale.set(1, .8, 1);
  const cloak = new THREE.Group(); cloak.position.set(0, .5, 0); torso.add(cloak);
  mesh(GEO.cloak, M.cloak, 0, -.3, 0, cloak);
  const head = new THREE.Group(); head.position.y = .64; torso.add(head);
  mesh(gSph(.165, 10, 8), M.cloak, 0, 0, -.01, head, false).scale.set(1, 1.08, 1.05);
  mesh(gSph(.105, 8, 6), M.skin, 0, -.02, .085, head, false).scale.set(1, 1, .6);
  for (const s of [-1, 1]) mesh(gBox(.03, .02, .02), M.dark, .04 * s, 0, .15, head, false);
  const tip = mesh(gCone(.08, .2, 6), M.cloak, 0, .07, -.15, head, false); tip.rotation.x = -1.1;
  // sword arm (right, -x)
  const shR = new THREE.Group(); shR.position.set(-.24, .42, 0); torso.add(shR);
  const armR = new THREE.Group(); shR.add(armR);
  mesh(gCyl(.055, .05, .3, 6), M.armor, 0, -.15, 0, armR); mesh(gSph(.055, 6, 5), M.leather, 0, -.32, 0, armR);
  const sword = new THREE.Group(); sword.position.y = -.32; armR.add(sword);
  mesh(gCyl(.022, .022, .14, 6), M.leather, 0, -.02, 0, sword); mesh(gBox(.2, .035, .05), M.steel, 0, .06, 0, sword);
  mesh(gBox(.055, .78, .018), M.steel, 0, .47, 0, sword); mesh(gSph(.03, 6, 4), MAT.gold, 0, -.1, 0, sword);
  sword.rotation.x = PI / 2;
  // torch arm (left, +x)
  const shL = new THREE.Group(); shL.position.set(.24, .42, 0); torso.add(shL);
  const armL = new THREE.Group(); shL.add(armL);
  mesh(gCyl(.055, .05, .3, 6), M.armor, 0, -.15, 0, armL, false); mesh(gSph(.055, 6, 5), M.leather, 0, -.32, 0, armL, false);
  const torch = new THREE.Group(); torch.position.y = -.32; armL.add(torch);
  mesh(gCyl(.03, .025, .5, 6), M.wood, 0, .15, 0, torch, false); mesh(gCyl(.048, .036, .1, 6), M.dark, 0, .4, 0, torch, false);
  const flameAnchor = new THREE.Object3D(); flameAnchor.position.y = .44; torch.add(flameAnchor);
  const flame = makeFlames([{ x: 0, y: 0, z: 0, s: 1.15, seed: .37 }]); flameAnchor.add(flame);
  armL.rotation.x = -2.3; torch.rotation.x = 2.3;
  const trail = new THREE.Mesh(GEO.trail, trailMat); trail.rotation.x = -PI / 2; trail.position.set(-.1, .95, 0); trail.frustumCulled = false; root.add(trail);
  scene.add(root);
  return { root, body, legs, torso, cloak, head, shR, armR, sword, shL, armL, torch, flameAnchor, trail, M, flashMats: [M.cloak, M.tunic, M.armor, M.leather] };
}
