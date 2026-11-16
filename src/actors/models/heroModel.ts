/**
 * Hero models (SPEC §10.5). All three classes share one rig (legs, torso, cloak, head, sword arm with a weapon
 * anchor, torch arm with `flameAnchor`), so the hero animations work unchanged; the parts under each joint are
 * built with the modelling kit and differ per class: the Warrior in plate with a nasal helm and tabard, the Thief in
 * a leather jerkin, hood and mask with a quiver, the Mage in a trimmed robe, mantle and pointed hat.
 */
import * as THREE from 'three';
import { PI } from '../../core/math';
import { makeFlames } from '../../render/flames';
import { GEO, glowSprite } from '../../render/geometry';
import { trailMat } from '../../render/materials';
import { scene } from '../../render/renderer';
import type { HeroParts } from '../../game/types';
import type { ClassId, WeaponKind } from '../../rules/classes';
import { part, Skin, type Kit, type V2, type V3 } from './kit';

interface Look { cloak: number; tunic: number; armor: number; armorRough: number; armorMetal: number; hair: number; skin: number }
const LOOK: Record<ClassId, Look> = {
  warrior: { cloak: 0x7a2a20, tunic: 0x3a3028, armor: 0xb8bcc6, armorRough: .32, armorMetal: .8, hair: 0x6a3a1c, skin: 0xc8906c },
  thief: { cloak: 0x2e3e26, tunic: 0x2a2018, armor: 0x6a4428, armorRough: .75, armorMetal: 0, hair: 0x2a1c14, skin: 0xb88262 },
  mage: { cloak: 0x2c2c74, tunic: 0x22204a, armor: 0x3a3488, armorRough: .9, armorMetal: 0, hair: 0xe0dcd4, skin: 0xc8967a },
};

/** The torso's cross-section is an ellipse: this much as deep as it is wide. */
const DEPTH = .8;
/** Torso profile ([radius, height] from the waist), shared by the body and the garments laid over it. */
const CHEST: V2[] = [[.17, .06], [.178, .16], [.2, .28], [.206, .36], [.19, .43], [.14, .49], [.08, .525], [.055, .55], [0, .55]];
const HIPS: V2[] = [[0, -.14], [.15, -.14], [.186, -.07], [.19, 0], [.172, .08]];

/** Mirrors a builder across x (left/right). */
const both = (f: (s: number) => void): void => { f(-1); f(1); };

function legs(k: Kit, cls: ClassId): void {
  // thigh, knee, shin; the hip joint is at the origin
  k.limb('tunic', [0, 0, 0], [0, -.24, .012], .078, .062, { fade: .25 });
  k.limb('tunic', [0, -.24, .012], [0, -.36, 0], .058, .052);
  // boot: shaft, cuff, foot, sole
  k.lathe('leather', [[.06, -.47], [.064, -.42], [.06, -.36], [.066, -.33], [.07, -.32], [0, -.32]], { seg: 10, fade: .4 });
  k.box('leather', [.115, .07, .2], { at: [0, -.465, .045], r: .028, fade: .3 });
  k.box('leatherDark', [.12, .02, .21], { at: [0, -.495, .045], r: .008 });
  k.ring('leatherDark', .066, .012, { at: [0, -.32, 0], rot: [PI / 2, 0, 0], seg: 5 });
  if (cls === 'warrior') {
    // greave and knee cop
    k.lathe('steel', [[.064, -.43], [.068, -.36], [.066, -.28], [0, -.28]], { seg: 10, scale: [1, 1, 1.05], arc: [-.9, 1.8] });
    k.ball('steel', [0, -.245, .03], [.06, .055, .045], { seg: 10 });
    k.spike('steel', [0, -.25, .06], [0, -.25, .1], .025, { seg: 6 });
  } else if (cls === 'thief') {
    for (const y of [-.38, -.34, -.3, -.26]) k.ring('leatherDark', .062, .008, { at: [0, y, 0], rot: [PI / 2 + .25, 0, 0], seg: 4 });
  }
}

function torso(k: Kit, cls: ClassId): void {
  k.lathe('tunic', HIPS, { scale: [1, 1, DEPTH], fade: .3 });
  k.lathe('armor', CHEST, { scale: [1, 1, DEPTH], fade: .15 });
  k.limb('skin', [0, .48, 0], [0, .62, 0], .058, .05, { caps: false });
  // belt and buckle
  k.lathe('leather', [[.178, .045], [.188, .07], [.188, .1], [.178, .125]], { scale: [1, 1, DEPTH], seg: 16 });
  k.box('gold', [.06, .05, .02], { at: [0, .085, .152], r: .008 });
  k.box('leatherDark', [.03, .022, .025], { at: [0, .085, .155], r: .004 });
  if (cls === 'warrior') {
    // breastplate with a centre ridge, the plackart edge, fauld lames, gorget and pauldrons
    k.lathe('steel', [[.184, .12], [.192, .2], [.214, .3], [.216, .37], [.198, .44], [.15, .49], [.1, .515]], { scale: [1, 1, DEPTH + .03] });
    k.tube('steel', [[0, .14, .18], [0, .26, .185], [0, .38, .18], [0, .47, .135]], .01, { seg: 5 });
    k.ring('steel', .19, .01, { at: [0, .2, 0], rot: [PI / 2, 0, 0], scale: [1, DEPTH + .05, 1], seg: 5 });
    for (let i = 0; i < 3; i++) {
      const y = .03 - i * .055, r = .196 + i * .012;
      k.lathe('steel', [[r - .01, y], [r + .006, y - .06]], { scale: [1, 1, DEPTH + .04], fade: .2 });
    }
    k.lathe('steel', [[.11, .49], [.095, .55], [.08, .58], [.07, .585]], { seg: 12 });
    both(s => {
      k.ball('steel', [s * .22, .45, 0], [.115, .085, .105], { seg: 14 });
      k.ball('steel', [s * .24, .385, 0], [.105, .06, .1], { seg: 14, tint: .9 });
      k.ball('steel', [s * .25, .335, 0], [.095, .05, .09], { seg: 12, tint: .82 });
      k.ball('gold', [s * .245, .5, .05], .014, { seg: 6 });
    });
    // tabard, front and back, with a gold border
    for (const z of [.185, -.19]) {
      const sz = Math.sign(z), tab: V2[] = [[-.085, .02], [.085, .02], [.075, -.28], [0, -.33], [-.075, -.28]];
      k.plate('gold', tab, .012, { at: [0, 0, z], rot: [sz * -.1, sz > 0 ? 0 : PI, 0] });
      k.plate('cloak', tab.map(([x, y]) => [x * .82, y * .9 + .002] as const), .016, { at: [0, 0, z + sz * .004], rot: [sz * -.1, sz > 0 ? 0 : PI, 0] });
    }
    k.box('gold', [.02, .1, .01], { at: [0, -.1, .2], r: .004, rot: [-.1, 0, 0] });
    k.box('gold', [.07, .02, .01], { at: [0, -.07, .198], r: .004, rot: [-.1, 0, 0] });
  } else if (cls === 'thief') {
    // jerkin seams and lacing, a strap across the chest, pouches, a dagger, the quiver
    k.tube('leatherDark', [[0, .1, .17], [0, .26, .175], [0, .4, .16], [0, .5, .1]], .008, { seg: 4 });
    for (let i = 0; i < 4; i++) k.box('leatherDark', [.05, .008, .01], { at: [0, .2 + i * .065, .176], rot: [0, 0, i % 2 ? .5 : -.5] });
    k.tube('leatherDark', [[.15, .46, .1], [.07, .33, .172], [-.06, .19, .172], [-.16, .07, .14]], .02, { seg: 5 });
    k.ball('gold', [.02, .29, .18], .016, { seg: 6 });
    both(s => k.box('leather', [.08, .08, .05], { at: [s * .15, .02, .12], r: .015, rot: [0, s * -.6, 0], fade: .3 }));
    k.box('leatherDark', [.035, .16, .025], { at: [-.19, -.04, .02], r: .008, rot: [0, 0, .15] });
    k.limb('wood', [-.2, .05, .02], [-.21, .11, .02], .012, .012);
    k.ball('gold', [-.21, .125, .02], .016, { seg: 6 });
    k.limb('leather', [.03, .1, -.19], [-.11, .52, -.23], .055, .062, { seg: 10, fade: .3 });
    k.ring('leatherDark', .062, .01, { at: [-.1, .49, -.226], rot: [PI / 2, 0, .32], seg: 5 });
    for (const [dx, dz] of [[-.02, .01], [.015, -.01], [-.04, -.015], [0, .02]] as const) {
      const base: V3 = [-.11 + dx, .5, -.23 + dz], tip: V3 = [-.17 + dx, .7, -.24 + dz];
      k.limb('wood', base, tip, .007, .007, { caps: false, seg: 4 });
      k.plate('bone', [[0, 0], [.025, .02], [.025, .06], [0, .04]], .004, { at: [tip[0] - .005, tip[1] - .065, tip[2]], rot: [0, 0, .3] });
    }
    // collar of the shoulder mantle
    k.lathe('cloak', [[.06, .56], [.14, .52], [.21, .45], [.235, .4]], { scale: [1, 1, .92], seg: 16, fadeUp: -.1 });
  } else {
    // robe skirt to the floor with a gold hem and front trim, a sash with hanging ends, a high collar and a mantle
    const skirt: V2[] = [[.172, .08], [.19, -.02], [.235, -.2], [.285, -.4], [.31, -.49], [0, -.49]];
    k.lathe('armor', skirt, { scale: [1, 1, .92], seg: 18, fade: .35 });
    k.lathe('gold', [[.302, -.47], [.315, -.47], [.317, -.445], [.305, -.44]], { scale: [1, 1, .92], seg: 18 });
    k.tube('gold', [[0, .06, .16], [0, -.1, .2], [0, -.3, .25], [0, -.47, .285]], .012, { seg: 4 });
    k.tube('gold', [[0, .1, .17], [0, .26, .175], [0, .42, .155]], .01, { seg: 4 });
    k.lathe('cloak', [[.18, .05], [.19, .075], [.19, .105], [.18, .13]], { scale: [1, 1, DEPTH + .02], seg: 16 });
    k.box('cloak', [.05, .2, .015], { at: [.06, -.06, .17], rot: [-.12, 0, .12], r: .006 });
    k.box('cloak', [.045, .16, .015], { at: [.1, -.04, .16], rot: [-.1, 0, -.1], r: .006 });
    k.lathe('armor', [[.07, .5], [.085, .58], [.1, .64], [.095, .645]], { seg: 14, arc: [-2.2, 4.4] });
    k.lathe('cloak', [[.06, .56], [.14, .53], [.22, .46], [.27, .38], [.275, .33]], { scale: [1, 1, .9], seg: 18 });
    k.lathe('gold', [[.27, .335], [.282, .33], [.28, .315]], { scale: [1, 1, .9], seg: 18 });
    k.box('leather', [.09, .11, .04], { at: [.17, -.08, .08], r: .012, rot: [0, -.5, .05], fade: .3 });
  }
}

/** The cloak hangs from the shoulders down the back; folds deepen toward the hem. */
function cloakPart(k: Kit, cls: ClassId): void {
  const len = cls === 'warrior' ? .58 : .62;
  const g = new THREE.LatheGeometry([[.2, 0], [.235, -.12], [.27, -.3], [.31, -len]].map(([r, y]) => new THREE.Vector2(r, y)), 22, PI * .52, PI * .96);
  g.scale(1, 1, .85);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, z), r = Math.hypot(x, z), d = -y / len;
    const rr = r + Math.sin(a * 9) * .022 * d;
    p.setXYZ(i, Math.sin(a) * rr, y + (Math.abs(Math.sin(a * 9 + 1.3)) - .5) * .02 * d, Math.cos(a) * rr);
  }
  g.computeVertexNormals();
  k.add('cloak', g, { fade: .45 });
  k.ring('cloak', .14, .028, { at: [0, .02, 0], rot: [PI / 2, 0, 0], scale: [1, .88, 1], seg: 6 });
  both(s => k.ball('gold', [s * .1, .0, .105], .022, { seg: 8 }));
  k.limb('gold', [-.1, 0, .105], [.1, 0, .105], .007, .007, { caps: false, seg: 4 });
}

function headPart(k: Kit, cls: ClassId): void {
  // face: cheeks, jaw, nose, ears, brows and eyes
  k.ball('skin', [0, -.012, .035], [.1, .118, .1], { seg: 16 });
  k.ball('skin', [0, -.07, .07], [.07, .05, .06], { seg: 12 });
  k.spike('skin', [0, .005, .12], [0, -.03, .155], .02, { seg: 6 });
  both(s => {
    k.ball('skin', [s * .1, -.01, .02], [.018, .03, .02], { seg: 6 });
    k.ball('dark', [s * .038, .012, .126], .014, { seg: 6 });
    k.box('hair', [.045, .012, .014], { at: [s * .04, .042, .125], rot: [0, 0, s * .2], r: .004 });
  });
  if (cls === 'warrior') {
    k.ball('hair', [0, -.075, .085], [.078, .062, .05], { seg: 12 });
    k.box('hair', [.08, .016, .02], { at: [0, -.04, .135], r: .007 });
    k.lathe('steel', [[.158, -.02], [.155, .04], [.14, .1], [.105, .148], [.055, .17], [0, .176]], { seg: 18 });
    k.ring('steel', .157, .014, { at: [0, -.015, 0], rot: [PI / 2, 0, 0], seg: 5 });
    k.tube('steel', [[0, .17, .02], [0, .12, .12], [0, .03, .155]], .012, { seg: 5 });
    k.box('steel', [.026, .11, .022], { at: [0, -.03, .16], r: .008 });
    both(s => {
      k.plate('steel', [[0, 0], [.05, .01], [.05, -.08], [.015, -.11], [0, -.09]], .014, { at: [s * .125, -.01, .07], rot: [0, s * (PI / 2 - .5), 0] });
      k.ball('gold', [s * .12, .0, .1], .011, { seg: 6 });
    });
  } else if (cls === 'thief') {
    k.ball('cloak', [0, .015, -.02], [.172, .182, .175], { seg: 16, fade: .2 });
    k.ball('dark', [0, -.01, .085], [.115, .13, .06], { seg: 14 });
    k.ring('cloak', .115, .026, { at: [0, -.008, .1], scale: [1, 1.12, 1], seg: 6 });
    k.ball('skin', [0, .0, .102], [.08, .085, .045], { seg: 12 });
    both(s => k.ball('dark', [s * .036, .015, .14], .012, { seg: 6 }));
    k.ball('dark', [0, -.055, .116], [.086, .055, .052], { seg: 12 });
    k.tube('cloak', [[0, .12, -.1], [0, .06, -.2], [0, -.06, -.26], [0, -.18, -.27]], t => .06 * (1 - t) + .01, { seg: 8 });
  } else {
    // long white beard and moustache, bushy brows, the tall bent hat with a band and buckle
    k.tube('hair', [[0, -.06, .1], [0, -.14, .13], [0, -.24, .13], [.01, -.34, .11]], t => .062 * (1 - t) + .008, { seg: 10 });
    both(s => {
      k.tube('hair', [[0, -.035, .14], [s * .04, -.05, .135], [s * .07, -.09, .11]], .015, { seg: 5 });
      k.ball('hair', [s * .105, -.02, -.02], [.04, .07, .07], { seg: 10 });
      k.box('hair', [.05, .02, .02], { at: [s * .04, .045, .126], rot: [0, 0, s * .3], r: .008 });
    });
    k.lathe('cloak', [[0, .09], [.28, .085], [.3, .07], [.28, .06], [0, .07]], { seg: 22, fadeUp: -.15 });
    k.tube('cloak', [[0, .08, -.01], [0, .26, -.03], [0, .42, -.1], [.02, .52, -.2], [.04, .56, -.3]], t => .175 * (1 - t) ** 1.1 + .012, { seg: 14, segs: 20 });
    k.lathe('gold', [[.172, .085], [.176, .1], [.166, .125], [.162, .13]], { seg: 18 });
    k.box('gold', [.05, .05, .015], { at: [0, .105, .17], r: .006 });
    k.ball('gold', [.04, .565, -.3], .022, { seg: 8 });
  }
}

/** Shoulder, upper arm, elbow, forearm (bracer, vambrace or sleeve) and hand; the shoulder joint is at the origin. */
function armPart(k: Kit, cls: ClassId): void {
  k.ball('armor', [0, -.01, 0], .07, { seg: 12 });
  k.limb('tunic', [0, -.02, 0], [0, -.15, .005], .056, .05);
  k.ball('tunic', [0, -.155, .005], .05, { seg: 10 });
  if (cls === 'warrior') {
    k.limb('steel', [0, -.16, .005], [0, -.28, 0], .056, .05, { seg: 10 });
    k.ball('steel', [0, -.155, -.02], [.05, .05, .04], { seg: 10 });
    k.box('steel', [.085, .075, .085], { at: [0, -.325, .005], r: .025 });
    k.box('steel', [.075, .03, .04], { at: [0, -.35, .045], r: .012, tint: .85 });
  } else if (cls === 'thief') {
    k.limb('leather', [0, -.16, .005], [0, -.28, 0], .052, .046, { seg: 10 });
    for (const y of [-.19, -.235]) k.ring('leatherDark', .052, .008, { at: [0, y, 0], rot: [PI / 2, 0, 0], seg: 4 });
    k.box('leatherDark', [.075, .07, .08], { at: [0, -.32, .005], r: .025 });
  } else {
    k.lathe('armor', [[.05, -.15], [.07, -.22], [.095, -.29], [.1, -.3], [.06, -.3]], { seg: 14, fade: .2 });
    k.lathe('gold', [[.096, -.29], [.104, -.298], [.1, -.305]], { seg: 14 });
    k.ball('skin', [0, -.325, .005], [.042, .048, .04], { seg: 10 });
  }
  if (cls !== 'mage') k.limb(cls === 'warrior' ? 'steel' : 'leatherDark', [.032, -.31, .03], [.035, -.34, .055], .016, .014, { seg: 6 });
  else k.limb('skin', [.03, -.31, .028], [.033, -.34, .05], .014, .012, { seg: 6 });
}

function torchPart(k: Kit): void {
  k.limb('wood', [0, -.08, 0], [0, .38, 0], .026, .03, { seg: 7, fade: .2 });
  k.lathe('dark', [[.03, .32], [.052, .35], [.055, .41], [.042, .45], [0, .45]], { seg: 10 });
  for (const y of [.35, .395]) k.ring('leatherDark', .054, .009, { at: [0, y, 0], rot: [PI / 2, 0, 0], seg: 4 });
}

export function buildHero(cls: ClassId): HeroParts {
  const look = LOOK[cls];
  const M = new Skin({
    cloak: { color: look.cloak, rough: .95, side: THREE.DoubleSide },
    tunic: { color: look.tunic, rough: 1 },
    armor: { color: look.armor, rough: look.armorRough, metal: look.armorMetal },
    leather: { color: 0x5a3a22, rough: .78 },
    leatherDark: { color: 0x2e1e14, rough: .85 },
    skin: { color: look.skin, rough: .7 },
    hair: { color: look.hair, rough: .9 },
    steel: { color: 0xc8ccd4, rough: .28, metal: .85 },
    steelDark: { color: 0x7a808c, rough: .38, metal: .85 },
    gold: { color: 0xe0a840, rough: .32, metal: .9 },
    wood: { color: 0x5e3e24, rough: .88 },
    bone: { color: 0xd8d0bc, rough: .7 },
    gem: { color: 0x8ab8ff, rough: .1, metal: .2, emissive: 0x2a4ab0, envI: 1.2 },
    dark: { color: 0x0c0908, rough: 1, rim: false },
  });
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const legs_: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(.1 * s, .5, 0); body.add(hip);
    part(hip, `hero:${cls}:leg`, k => legs(k, cls), M);
    legs_.push(hip);
  }
  const torsoG = new THREE.Group(); torsoG.position.y = .5; body.add(torsoG);
  part(torsoG, `hero:${cls}:torso`, k => torso(k, cls), M);
  const cloak = new THREE.Group(); cloak.position.set(0, .5, 0); torsoG.add(cloak);
  part(cloak, `hero:${cls}:cloak`, k => cloakPart(k, cls), M);
  const head = new THREE.Group(); head.position.y = .64; torsoG.add(head);
  part(head, `hero:${cls}:head`, k => headPart(k, cls), M);
  // weapon arm (right, -x)
  const shR = new THREE.Group(); shR.position.set(-.24, .42, 0); torsoG.add(shR);
  const armR = new THREE.Group(); shR.add(armR);
  part(armR, `hero:${cls}:armR`, k => armPart(k, cls), M);
  const sword = new THREE.Group(); sword.position.y = -.32; armR.add(sword);
  sword.rotation.x = PI / 2;
  // torch arm (left, +x): the same arm, mirrored
  const shL = new THREE.Group(); shL.position.set(.24, .42, 0); torsoG.add(shL);
  const armL = new THREE.Group(); shL.add(armL);
  const armLMesh = new THREE.Group(); armLMesh.scale.x = -1; armL.add(armLMesh);
  part(armLMesh, `hero:${cls}:armR`, k => armPart(k, cls), M);
  const torch = new THREE.Group(); torch.position.y = -.32; armL.add(torch);
  part(torch, 'hero:torch', torchPart, M);
  const flameAnchor = new THREE.Object3D(); flameAnchor.position.y = .44; torch.add(flameAnchor);
  const flame = makeFlames([{ x: 0, y: 0, z: 0, s: 1.15, seed: .37 }]); flameAnchor.add(flame);
  armL.rotation.x = -2.3; torch.rotation.x = 2.3;
  const trail = new THREE.Mesh(GEO.trail, trailMat); trail.rotation.x = -PI / 2; trail.position.set(-.1, .95, 0); trail.frustumCulled = false; root.add(trail);
  scene.add(root);
  return { root, body, legs: legs_, torso: torsoG, cloak, head, shR, armR, sword, shL, armL, torch, flameAnchor, trail, skin: M, flashMats: M.mats };
}

/* ---------- held weapons: built along +y from the grip in the anchor frame ---------- */

function swordPart(k: Kit): void {
  k.limb('leather', [0, -.07, 0], [0, .055, 0], .021, .021, { seg: 7 });
  for (let y = -.06; y < .05; y += .022) k.ring('leatherDark', .022, .005, { at: [0, y, 0], rot: [PI / 2, 0, .3], seg: 4 });
  k.ball('gold', [0, -.095, 0], [.03, .028, .03], { seg: 10 });
  k.tube('steel', [[-.12, .085, 0], [-.06, .065, 0], [0, .062, 0], [.06, .065, 0], [.12, .085, 0]], .014, { seg: 6 });
  k.ball('gold', [0, .068, 0], [.026, .022, .02], { seg: 8 });
  const blade: V2[] = [[-.03, .07], [.03, .07], [.028, .72], [0, .86], [-.028, .72]];
  k.plate('steel', blade, .016, { bevel: .006 });
  k.plate('steelDark', [[-.007, .1], [.007, .1], [.007, .62], [0, .66], [-.007, .62]], .018, { bevel: .002 });
}

function axePart(k: Kit): void {
  k.limb('wood', [0, -.1, 0], [0, .74, 0], .022, .024, { seg: 7, fade: .2 });
  for (const y of [-.08, -.04, 0]) k.ring('leatherDark', .025, .006, { at: [0, y, 0], rot: [PI / 2, 0, 0], seg: 4 });
  const head: V2[] = [[0, .5], [-.05, .5], [-.17, .44], [-.25, .48], [-.28, .6], [-.25, .72], [-.17, .76], [-.05, .7], [0, .7]];
  k.plate('steel', head, .026, { bevel: .008 });
  k.plate('steel', [[.02, .56], [.11, .6], [.02, .64]], .022, { bevel: .006 });
  k.box('steelDark', [.06, .2, .05], { at: [0, .6, 0], r: .012 });
  k.ball('steelDark', [0, .74, 0], .026, { seg: 8 });
}

function macePart(k: Kit): void {
  k.limb('wood', [0, -.1, 0], [0, .44, 0], .022, .024, { seg: 7 });
  for (const y of [-.08, -.04, 0]) k.ring('leatherDark', .025, .006, { at: [0, y, 0], rot: [PI / 2, 0, 0], seg: 4 });
  k.lathe('steelDark', [[0, .42], [.045, .43], [.055, .52], [.04, .6], [0, .62]], { seg: 10 });
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * PI * 2;
    k.plate('steel', [[0, .42], [.06, .46], [.075, .54], [.05, .6], [0, .6]], .012, { rot: [0, a, 0], bevel: .004 });
  }
  k.spike('steel', [0, .61, 0], [0, .67, 0], .02, { seg: 6 });
}

function staffPart(k: Kit): void {
  // held upright: in the anchor frame world up is -z
  k.tube('wood', [[0, 0, .42], [.01, 0, .1], [-.01, 0, -.3], [.01, 0, -.7], [0, 0, -1.02]], t => .028 - t * .006, { seg: 7, segs: 24 });
  for (const z of [-.1, .2]) k.ball('wood', [.01, 0, z], [.034, .034, .04], { seg: 8 });
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * PI * 2, c = Math.cos(a), s = Math.sin(a);
    k.tube('wood', [[c * .02, s * .02, -1.0], [c * .07, s * .07, -1.1], [c * .045, s * .045, -1.19], [c * .015, s * .015, -1.22]], t => .016 - t * .01, { seg: 5 });
  }
  k.ball('gem', [0, 0, -1.12], [.05, .05, .065], { seg: 10 });
  k.ring('gold', .03, .008, { at: [0, 0, -1.0], seg: 4 });
}

function bowPart(k: Kit): void {
  // anchor frame: +y forward, ±z world up/down; the limbs curve back toward the archer
  const pts = (s: number): V3[] => [0, .25, .5, .75, 1].map(u => [0, -.16 * u * u + (u > .85 ? .03 * (u - .85) / .15 : 0), s * .44 * u] as const);
  for (const s of [1, -1]) k.tube('wood', pts(s), t => .026 - t * .014, { seg: 6, segs: 16 });
  for (const s of [1, -1]) k.ball('bone', [0, -.13, s * .44], .013, { seg: 6 });
  k.limb('bone', [0, -.13, -.44], [0, -.13, .44], .004, .004, { caps: false, seg: 3 });
  k.limb('leather', [0, .005, -.07], [0, .005, .07], .032, .032, { seg: 8 });
  for (const z of [-.07, .07]) k.ring('gold', .033, .006, { at: [0, .005, z], seg: 4 });
}

const WEAPON: Partial<Record<WeaponKind, (k: Kit) => void>> = { sword: swordPart, axe: axePart, club: macePart, staff: staffPart, bow: bowPart };

/**
 * Replaces the mesh in the weapon anchor. The anchor points forward along +y after its own rotation; meshes are
 * built along +y from the grip.
 */
export function setHeldWeapon(p: HeroParts, kind: WeaponKind): void {
  const a = p.sword;
  for (const c of [...a.children]) { a.remove(c); if (c instanceof THREE.Sprite) c.material.dispose(); }
  const make = WEAPON[kind];
  if (!make) return;
  part(a, `hw:${kind}`, make, p.skin);
  if (kind === 'staff') glowSprite(0x8ab8ff, .55, a, 0, 0, -1.12);
}
