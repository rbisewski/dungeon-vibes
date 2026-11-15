/**
 * Hero models (SPEC §10.5). All three classes share one rig (legs, torso, cloak, head, sword arm with a weapon
 * anchor, torch arm with `flameAnchor`), so the hero animations work unchanged; only materials and accessories differ.
 */
import * as THREE from 'three';
import { PI } from '../../core/math';
import { makeFlames } from '../../render/flames';
import { GEO, gBox, gCone, gCyl, gSph, glowSprite, mesh } from '../../render/geometry';
import { MAT, rimLit, trailMat } from '../../render/materials';
import { scene } from '../../render/renderer';
import type { HeroParts } from '../../game/types';
import type { ClassId, WeaponKind } from '../../rules/classes';

const std = (color: number, roughness: number, metalness = 0, side: THREE.Side = THREE.FrontSide) =>
  rimLit(new THREE.MeshStandardMaterial({ color, roughness, metalness, side }));

/** Per-class colours: hood/cloak, tunic, chest piece (plate, leather jerkin or robe). */
const LOOK: Record<ClassId, { cloak: number; tunic: number; armor: [number, number, number] }> = {
  warrior: { cloak: 0x5a2c22, tunic: 0x3c3428, armor: [0x9a9aa2, .42, .55] },
  thief: { cloak: 0x2c3a24, tunic: 0x2e2418, armor: [0x5a3a22, .85, 0] },
  mage: { cloak: 0x2a2a6a, tunic: 0x24204a, armor: [0x36307a, .95, 0] },
};

export function buildHero(cls: ClassId): HeroParts {
  const look = LOOK[cls];
  const M = {
    cloak: std(look.cloak, 1, 0, THREE.DoubleSide),
    tunic: std(look.tunic, 1),
    armor: std(...look.armor),
    leather: std(0x4a3020, .9),
    skin: std(0xc08a68, .85),
    steel: std(0xd0d4dc, .28, .85),
    wood: std(0x5a3c22, .9),
    dark: std(0x080606, 1),
  };
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const legs: THREE.Group[] = [];
  for (const s of [-1, 1]) { const hip = new THREE.Group(); hip.position.set(.1 * s, .5, 0); body.add(hip); mesh(gBox(.13, .28, .14), M.tunic, 0, -.14, 0, hip); mesh(gBox(.15, .24, .2), M.leather, 0, -.38, .025, hip); legs.push(hip); }
  const torso = new THREE.Group(); torso.position.y = .5; body.add(torso);
  mesh(gCyl(.19, .23, .18, 8), M.tunic, 0, 0, 0, torso);
  mesh(gCyl(.2, .2, .06, 8), M.leather, 0, .1, 0, torso);
  mesh(gBox(.07, .05, .03), MAT.gold, 0, .1, .2, torso);
  mesh(gCyl(.21, .18, .36, 8), M.armor, 0, .3, 0, torso);
  if (cls === 'warrior') for (const s of [-1, 1]) mesh(gSph(.1, 8, 6), M.armor, .2 * s, .45, 0, torso).scale.set(1, .8, 1);
  if (cls === 'thief') {
    // quiver on the back, arrows sticking out
    const q = mesh(gCyl(.06, .05, .42, 6), M.leather, -.08, .32, -.22, torso); q.rotation.z = .35;
    for (const o of [-.025, .02]) { const a = mesh(gCyl(.008, .008, .22, 4), M.wood, -.17 + o, .6, -.22, torso, false); a.rotation.z = .35; mesh(gBox(.04, .05, .01), MAT.bone, -.21 + o, .7, -.22, torso, false); }
  }
  if (cls === 'mage') {
    // robe skirt over the legs
    mesh(gCyl(.21, .3, .5, 8), M.armor, 0, -.2, 0, torso);
  }
  const cloak = new THREE.Group(); cloak.position.set(0, .5, 0); torso.add(cloak);
  mesh(GEO.cloak, M.cloak, 0, -.3, 0, cloak);
  const head = new THREE.Group(); head.position.y = .64; torso.add(head);
  mesh(gSph(.165, 10, 8), M.cloak, 0, 0, -.01, head, false).scale.set(1, 1.08, 1.05);
  mesh(gSph(.105, 8, 6), M.skin, 0, -.02, .085, head, false).scale.set(1, 1, .6);
  for (const s of [-1, 1]) mesh(gBox(.03, .02, .02), M.dark, .04 * s, 0, .15, head, false);
  if (cls === 'mage') {
    // tall pointed hat with a brim; a short white beard
    mesh(gCyl(.27, .27, .025, 12), M.cloak, 0, .1, 0, head, false);
    const hat = mesh(gCone(.17, .5, 8), M.cloak, 0, .36, -.03, head, false); hat.rotation.x = -.18;
    mesh(gCone(.07, .14, 6), MAT.bone, 0, -.13, .1, head, false).rotation.x = PI;
  } else {
    const tip = mesh(gCone(.08, .2, 6), M.cloak, 0, .07, -.15, head, false); tip.rotation.x = -1.1;
    if (cls === 'thief') mesh(gBox(.2, .06, .05), M.dark, 0, -.07, .14, head, false); // face mask
  }
  // weapon arm (right, -x)
  const shR = new THREE.Group(); shR.position.set(-.24, .42, 0); torso.add(shR);
  const armR = new THREE.Group(); shR.add(armR);
  mesh(gCyl(.055, .05, .3, 6), M.armor, 0, -.15, 0, armR); mesh(gSph(.055, 6, 5), M.leather, 0, -.32, 0, armR);
  const sword = new THREE.Group(); sword.position.y = -.32; armR.add(sword);
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

/**
 * Replaces the mesh in the weapon anchor. The anchor points forward along +y after its own rotation; meshes are
 * built along +y from the grip.
 */
export function setHeldWeapon(p: HeroParts, kind: WeaponKind): void {
  const a = p.sword, M = p.M;
  for (const c of [...a.children]) { a.remove(c); if (c instanceof THREE.Sprite) c.material.dispose(); }
  switch (kind) {
    case 'sword':
      mesh(gCyl(.022, .022, .14, 6), M.leather, 0, -.02, 0, a); mesh(gBox(.2, .035, .05), M.steel, 0, .06, 0, a);
      mesh(gBox(.055, .78, .018), M.steel, 0, .47, 0, a); mesh(gSph(.03, 6, 4), MAT.gold, 0, -.1, 0, a);
      break;
    case 'axe':
      mesh(gCyl(.024, .024, .8, 6), M.wood, 0, .3, 0, a);
      mesh(gBox(.26, .2, .03), M.steel, -.12, .62, 0, a); mesh(gBox(.06, .26, .035), M.steel, -.24, .62, 0, a);
      break;
    case 'club':
      mesh(gCyl(.024, .024, .5, 6), M.wood, 0, .18, 0, a);
      mesh(gCyl(.07, .05, .26, 7), M.steel, 0, .52, 0, a);
      for (const s of [-1, 1]) mesh(gBox(.16, .03, .03), M.steel, 0, .5 + s * .06, 0, a).rotation.y = s * .8;
      break;
    case 'staff': {
      // Held upright: in the anchor frame world-up is −z.
      mesh(gCyl(.026, .026, 1.5, 6), M.wood, 0, 0, -.35, a).rotation.x = PI / 2;
      mesh(gSph(.06, 8, 6), M.steel, 0, 0, -1.12, a);
      glowSprite(0x8ab8ff, .55, a, 0, 0, -1.12);
      break;
    }
    case 'bow': {
      // Anchor frame: +y points forward, ±z is world up/down. Limbs run along ±z and curve back toward the archer.
      const pt = (u: number): [number, number] => [-.16 * u * u, .44 * u];
      for (const s of [1, -1]) for (let k = 0; k < 5; k++) {
        const [y0, z0] = pt(k / 5), [y1, z1] = pt((k + 1) / 5);
        const seg = mesh(gBox(.03, .035, Math.hypot(y1 - y0, z1 - z0) + .01), M.wood, 0, (y0 + y1) / 2, s * (z0 + z1) / 2, a);
        seg.rotation.x = -s * Math.atan2(y1 - y0, z1 - z0);
      }
      mesh(gBox(.008, .008, .88), MAT.bone, 0, -.16, 0, a, false);
      mesh(gBox(.045, .05, .12), M.leather, 0, 0, 0, a);
      break;
    }
    case 'bare':
      break;
  }
}
