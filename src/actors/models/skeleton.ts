/**
 * Humanoid monsters on one rig (hips/knees, torso, head with jaw, two arms, weapon in the right hand), so they share
 * the walk and attack animation: skeleton, zombie, Fallen, skeleton archer (SPEC §8.3) and the Bone Warden, Gorger and
 * Ember Lich (SPEC §9). Parts are built with the modelling kit: real bone anatomy for the undead (rib cage, spine,
 * pelvis, skull with sockets and teeth, fingers), fleshy bodies for the zombie, Fallen and Gorger, and armour, robes
 * and weapons per type.
 */
import * as THREE from 'three';
import { PI } from '../../core/math';
import { gSph, glowSprite, mesh } from '../../render/geometry';
import type { HumanoidType, SkeletonParts } from '../../game/types';
import { part, Skin, type Kit, type V2, type V3 } from './kit';

const EYES: Record<HumanoidType, number> = { skeleton: 0xff5a22, warden: 0xc070ff, archer: 0xff7a2a, zombie: 0xd0c040, fallen: 0xffc020, gorger: 0xff2a10, lich: 0xff8a20 };
/** Main body material: bone for the undead, skin for the zombie, Fallen and Gorger. */
const BONE: Record<HumanoidType, number> = { skeleton: 0xd6cbad, archer: 0xd0c4a4, warden: 0xa49a88, zombie: 0x82a070, fallen: 0xa0322a, gorger: 0xd8967e, lich: 0xc0b49c };
/** Secondary material: rags, leather, armour, the Gorger's apron, the Lich's robe. */
const METAL: Record<HumanoidType, number> = { skeleton: 0x5a3e2c, archer: 0x4a3a2a, fallen: 0x5a3a22, warden: 0x3a3640, zombie: 0x4a4230, gorger: 0x6e4a30, lich: 0x3a1418 };

const UNDEAD: Record<HumanoidType, boolean> = { skeleton: true, archer: true, warden: true, lich: true, zombie: false, fallen: false, gorger: false };
const both = (f: (s: number) => void): void => { f(-1); f(1); };

/* ---------- bones ---------- */

function femur(k: Kit): void {
  k.ball('bone', [0, 0, 0], .042, { seg: 8 });
  k.limb('bone', [0, -.02, 0], [0, -.29, .012], .024, .021, { seg: 7 });
  both(s => k.ball('bone', [s * .018, -.3, .012], [.026, .028, .03], { seg: 7 }));
}

function shinFoot(k: Kit, toes = 4): void {
  k.ball('bone', [0, .0, .035], [.022, .026, .016], { seg: 7 });
  k.limb('bone', [0, -.01, .005], [0, -.255, 0], .022, .017, { seg: 7 });
  k.limb('bone', [.022, -.02, -.005], [.02, -.25, -.004], .01, .009, { seg: 5, tint: .9 });
  k.ball('bone', [0, -.27, 0], [.03, .024, .036], { seg: 7 });
  for (let i = 0; i < toes; i++) {
    const x = (i - (toes - 1) / 2) * .02;
    k.limb('bone', [x * .6, -.28, .02], [x, -.3, .1], .009, .007, { seg: 5 });
  }
}

/** Pelvis in the body frame (hip joints at y .62). */
function pelvis(k: Kit): void {
  both(s => {
    k.ball('bone', [s * .075, .69, -.01], [.07, .06, .03], { seg: 10, rot: [0, s * .4, s * .3] });
    k.ball('bone', [s * .1, .63, .0], .03, { seg: 7 });
  });
  k.limb('bone', [-.05, .6, .045], [.05, .6, .045], .016, .016, { seg: 6 });
  k.ball('bone', [0, .68, -.045], [.04, .05, .03], { seg: 8 });
}

/** Rib cage, spine, sternum, clavicles and shoulder blades in the torso frame (shoulders at y .44). */
function ribcage(k: Kit, ribs = 5): void {
  for (let i = 0; i < 9; i++) k.ball('bone', [0, .02 + i * .062, -.06 - Math.sin(i / 8 * PI) * .015], [.026, .02, .026], { seg: 7 });
  for (let i = 0; i < ribs; i++) {
    const y = .38 - i * .055, w = .15 - Math.abs(i - 1.2) * .012 - i * .006, d = .1 - i * .006;
    both(s => k.tube('bone', [[s * .02, y + .01, -.06], [s * w * .8, y + .02, -.04], [s * w, y - .01, .02], [s * w * .7, y - .035, .08], [s * .02, y - .03, d]], .011, { seg: 5, segs: 14 }));
  }
  k.box('bone', [.04, .2, .022], { at: [0, .3, .1], r: .01, rot: [.12, 0, 0] });
  both(s => {
    k.limb('bone', [s * .02, .42, .09], [s * .2, .45, .01], .012, .014, { seg: 6 });
    k.ball('bone', [s * .1, .36, -.085], [.065, .08, .02], { seg: 9, rot: [.2, s * -.3, 0] });
  });
  k.limb('bone', [0, .46, -.04], [0, .6, -.01], .02, .018, { seg: 6 });
}

function skull(k: Kit): void {
  k.ball('bone', [0, .035, -.012], [.118, .12, .135], { seg: 16 });
  k.ball('bone', [0, -.035, .06], [.085, .07, .07], { seg: 12 });
  both(s => {
    k.ball('dark', [s * .045, .008, .098], [.034, .03, .022], { seg: 9 });
    k.ball('bone', [s * .072, -.03, .07], [.03, .022, .03], { seg: 7 });
    k.box('bone', [.035, .014, .02], { at: [s * .045, .038, .108], rot: [0, 0, s * .25], r: .006 });
  });
  k.spike('dark', [0, -.045, .115], [0, -.01, .128], .016, { seg: 5 });
  for (let i = -3; i <= 3; i++) k.box('bone', [.014, .022, .012], { at: [i * .016, -.088, .102 - Math.abs(i) * .006], r: .003, tint: 1.08 });
}

function mandible(k: Kit): void {
  k.tube('bone', [[-.072, .03, -.035], [-.066, -.02, .03], [-.03, -.04, .085], [.03, -.04, .085], [.066, -.02, .03], [.072, .03, -.035]], .015, { seg: 5, segs: 16 });
  for (let i = -2; i <= 2; i++) k.box('bone', [.013, .02, .012], { at: [i * .016, -.022, .085 - Math.abs(i) * .007], r: .003, tint: 1.08 });
}

function humerus(k: Kit): void {
  k.ball('bone', [0, 0, 0], .036, { seg: 8 });
  k.limb('bone', [0, -.02, 0], [0, -.255, 0], .021, .018, { seg: 7 });
  both(s => k.ball('bone', [s * .016, -.265, 0], .022, { seg: 7 }));
}

/** Radius and ulna and a bony hand; `grip` curls the fingers around a weapon. */
function forearmHand(k: Kit, grip: boolean): void {
  k.limb('bone', [.01, -.01, 0], [.012, -.235, .005], .015, .013, { seg: 6 });
  k.limb('bone', [-.012, -.01, 0], [-.01, -.235, -.005], .013, .012, { seg: 6, tint: .92 });
  k.ball('bone', [0, -.255, 0], [.03, .026, .022], { seg: 8 });
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * .014;
    k.tube('bone', grip ? [[x, -.27, .0], [x, -.3, .02], [x, -.3, .045], [x, -.28, .045]] : [[x, -.27, 0], [x * 1.2, -.31, .015], [x * 1.3, -.34, .02]], .0075, { seg: 4, segs: 6 });
  }
  k.tube('bone', [[.025, -.255, .01], [.035, -.28, .03], [.025, -.3, .045]], .008, { seg: 4, segs: 5 });
}

/* ---------- flesh (zombie, Fallen, Gorger) ---------- */

function fleshThigh(k: Kit, r: number, cloth: boolean): void {
  k.limb(cloth ? 'metal' : 'bone', [0, 0, 0], [0, -.3, .015], r, r * .8, { seg: 9, fade: .2 });
  k.ball(cloth ? 'metal' : 'bone', [0, -.305, .02], r * .82, { seg: 8 });
}

function fleshShin(k: Kit, r: number, o: { claws?: boolean; boot?: boolean; ragged?: boolean }): void {
  k.limb('bone', [0, 0, .01], [0, -.25, 0], r * .8, r * .62, { seg: 9 });
  if (o.ragged) for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; k.spike('metal', [Math.sin(a) * r * .8, -.02, Math.cos(a) * r * .8], [Math.sin(a) * r, -.09 - (i % 2) * .04, Math.cos(a) * r], .025, { seg: 4 }); }
  if (o.boot) {
    k.lathe('metal', [[r * .75, -.29], [r * .8, -.2], [r * .85, -.12], [r * .9, -.11], [0, -.11]], { seg: 10, fade: .3 });
    k.box('metal', [r * 1.8, .06, .17], { at: [0, -.29, .04], r: .025 });
  } else {
    k.ball('bone', [0, -.28, .035], [r * .85, .03, .08], { seg: 9 });
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * r * .5;
      if (o.claws) k.spike('horn', [x, -.29, .1], [x * 1.2, -.3, .14], .01, { seg: 4 });
      else k.ball('bone', [x, -.295, .1], .013, { seg: 5 });
    }
  }
}

function fleshArm(k: Kit, r: number, sleeve: boolean): void {
  k.ball(sleeve ? 'metal' : 'bone', [0, 0, 0], r * 1.15, { seg: 9 });
  k.limb(sleeve ? 'metal' : 'bone', [0, -.01, 0], [0, -.26, 0], r, r * .82, { seg: 9 });
  if (sleeve) for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; k.spike('metal', [Math.sin(a) * r * .9, -.2, Math.cos(a) * r * .9], [Math.sin(a) * r * 1.05, -.28 - (i % 2) * .03, Math.cos(a) * r * 1.05], .02, { seg: 4 }); }
}

function fleshForearm(k: Kit, r: number, o: { claws?: boolean; grip?: boolean }): void {
  k.ball('bone', [0, 0, 0], r * .85, { seg: 8 });
  k.limb('bone', [0, 0, 0], [0, -.235, 0], r * .8, r * .62, { seg: 9 });
  k.ball('bone', [0, -.265, .005], [r * .85, r * .9, r * .6], { seg: 9 });
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * r * .4;
    const pts: V3[] = o.grip ? [[x, -.28, .01], [x, -.31, .03], [x, -.305, .05]] : [[x, -.29, 0], [x * 1.2, -.33, .015], [x * 1.3, -.36, .025]];
    k.tube('bone', pts, r * .2, { seg: 4, segs: 5 });
    if (o.claws) k.spike('horn', pts[2], [pts[2][0], pts[2][1] - .03, pts[2][2] + .02], r * .14, { seg: 4 });
  }
}

/* ---------- weapons (in the weapon frame: +y runs down the arm from the hand) ---------- */

function rustySword(k: Kit): void {
  k.limb('wood', [0, -.05, 0], [0, .06, 0], .018, .018, { seg: 6 });
  k.ball('steel', [0, -.07, 0], .024, { seg: 7 });
  k.tube('steel', [[-.08, .085, 0], [0, .07, 0], [.08, .085, 0]], .012, { seg: 5 });
  const blade: V2[] = [[-.026, .08], [.026, .08], [.024, .4], [.03, .44], [.022, .52], [.018, .62], [0, .7], [-.022, .62], [-.026, .5], [-.02, .46], [-.024, .3]];
  k.plate('steel', blade, .014, { bevel: .005 });
}

function bow(k: Kit): void {
  // along the weapon's ±y, limbs curving back in x; string at the tips
  const pts = (s: number): V3[] => [0, .25, .5, .75, 1].map(u => [.085 * u * u - (u > .85 ? .02 : 0), s * .28 * u, 0] as const);
  for (const s of [1, -1]) k.tube('wood', pts(s), t => .02 - t * .011, { seg: 6, segs: 12 });
  k.limb('bone', [.065, -.28, 0], [.065, .28, 0], .003, .003, { caps: false, seg: 3 });
  k.limb('metal', [0, -.05, 0], [0, .05, 0], .024, .024, { seg: 7 });
}

function quiver(k: Kit): void {
  k.limb('metal', [.02, .08, -.12], [-.1, .45, -.16], .045, .05, { seg: 9, fade: .3 });
  for (const [dx, dz] of [[-.015, .01], [.012, -.008], [-.03, -.012]] as const) {
    const base: V3 = [-.1 + dx, .43, -.16 + dz], tip: V3 = [-.15 + dx, .6, -.17 + dz];
    k.limb('wood', base, tip, .006, .006, { caps: false, seg: 4 });
    k.plate('bone', [[0, 0], [.02, .016], [.02, .05], [0, .034]], .004, { at: [tip[0] - .004, tip[1] - .055, tip[2]], rot: [0, 0, .3] });
  }
}

function wardenAxe(k: Kit): void {
  k.limb('wood', [0, -.25, 0], [0, 1.0, 0], .028, .03, { seg: 7, fade: .2 });
  for (const y of [-.15, .0, .15]) k.ring('metal', .031, .008, { at: [0, y, 0], rot: [PI / 2, 0, 0], seg: 4 });
  const blade: V2[] = [[0, .7], [.08, .66], [.24, .6], [.32, .7], [.34, .84], [.3, .98], [.2, 1.05], [.08, .95], [0, .92]];
  k.plate('steel', blade, .03, { bevel: .01 });
  k.plate('steel', [[0, .74], [-.14, .78], [-.18, .83], [-.14, .87], [0, .9]], .026, { bevel: .008 });
  k.box('metal', [.07, .26, .06], { at: [0, .82, 0], r: .015 });
  k.spike('steel', [0, 1.0, 0], [0, 1.14, 0], .025, { seg: 6 });
}

function spear(k: Kit): void {
  k.limb('wood', [0, -.25, 0], [0, .62, 0], .014, .014, { seg: 6 });
  k.plate('steel', [[-.025, .6], [.025, .6], [.012, .72], [0, .78], [-.012, .72]], .012, { bevel: .004 });
  for (const y of [.58, .55]) k.ring('metal', .016, .005, { at: [0, y, 0], rot: [PI / 2, 0, 0], seg: 4 });
  both(s => k.plate('blood', [[0, 0], [.03, -.03], [.025, -.08], [0, -.06]], .004, { at: [s * .012, .53, 0], rot: [0, s > 0 ? 0 : PI, 0] }));
}

function cleaver(k: Kit): void {
  k.limb('wood', [0, -.08, 0], [0, .18, 0], .026, .026, { seg: 7 });
  for (const y of [-.05, .05]) k.ball('steel', [0, y, .022], .008, { seg: 5 });
  k.plate('steel', [[-.03, .16], [.03, .16], [.04, .5], [.0, .52], [-.24, .5], [-.25, .46], [-.22, .2], [-.12, .16]], .02, { bevel: .006, rot: [0, PI / 2, 0] });
  k.plate('blood', [[-.2, .38], [-.12, .4], [-.06, .46], [-.18, .47], [-.23, .44]], .022, { bevel: .002, rot: [0, PI / 2, 0] });
  k.ball('steel', [0, .45, -.2], .015, { seg: 6 });
}

function lichStaff(k: Kit): void {
  k.tube('wood', [[0, -.3, 0], [.01, .3, 0], [-.01, .8, 0], [0, 1.12, 0]], t => .022 - t * .005, { seg: 7, segs: 20 });
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * PI * 2, c = Math.cos(a), s = Math.sin(a);
    k.tube('gold', [[c * .015, 1.08, s * .015], [c * .07, 1.16, s * .07], [c * .06, 1.26, s * .06], [c * .02, 1.3, s * .02]], .009, { seg: 4, segs: 8 });
  }
  // a small skull holds the ember
  k.ball('bone', [0, 1.18, 0], [.05, .05, .055], { seg: 10 });
  both(s => k.ball('dark', [s * .02, 1.185, .04], .012, { seg: 5 }));
}

/* ---------- builders per type ---------- */

interface Parts { body: (k: Kit) => void; hip: (k: Kit) => void; knee: (k: Kit) => void; torso: (k: Kit) => void; head: (k: Kit) => void; jaw: (k: Kit) => void; arm: (k: Kit) => void; elR: (k: Kit) => void; elL: (k: Kit) => void; weapon?: (k: Kit) => void }

function undeadParts(type: HumanoidType): Parts {
  const p: Parts = {
    body: pelvis, hip: femur, knee: k => shinFoot(k), torso: k => ribcage(k), head: skull, jaw: mandible,
    arm: humerus, elR: k => forearmHand(k, true), elL: k => forearmHand(k, false),
  };
  if (type === 'skeleton') {
    const body = p.body, elL = p.elL;
    // a rotting loincloth, a rusty sword, a cracked round shield
    p.body = k => { body(k); k.plate('metal', [[-.09, .66], [.09, .66], [.08, .5], [.03, .44], [-.02, .5], [-.07, .46]], .012, { at: [0, 0, .055], fade: .3 }); k.lathe('metal', [[.11, .63], [.115, .68], [.11, .7]], { scale: [1, 1, .8], seg: 12 }); };
    p.elL = k => { elL(k); k.lathe('wood', [[0, .02], [.13, .015], [.14, -.005], [.13, -.012], [0, -.008]], { at: [.045, -.15, 0], rot: [0, 0, -PI / 2], seg: 14, fade: .3 }); k.ring('steel', .135, .01, { at: [.05, -.15, 0], rot: [0, PI / 2, 0], seg: 4 }); k.ball('steel', [.065, -.15, 0], [.012, .04, .04], { seg: 8 }); };
    p.weapon = rustySword;
  } else if (type === 'archer') {
    const torso = p.torso, head = p.head;
    p.torso = k => { torso(k); quiver(k); k.limb('metal', [.17, .43, .02], [-.12, .1, .1], .012, .012, { caps: false, seg: 4 }); };
    // a ragged leather hood
    p.head = k => { head(k); k.ball('metal', [0, .05, -.04], [.135, .13, .14], { seg: 14, fade: .2 }); k.tube('metal', [[0, .11, -.1], [0, .05, -.2], [0, -.08, -.22]], t => .05 * (1 - t) + .01, { seg: 6 }); };
    p.weapon = bow;
  } else if (type === 'warden') {
    const torso = p.torso, head = p.head, body = p.body;
    p.torso = k => {
      torso(k);
      // a breastplate over the upper ribs, spiked pauldrons, a gorget
      k.lathe('metal', [[.16, .22], [.18, .3], [.18, .4], [.14, .47], [.09, .5]], { scale: [1, 1, .78], seg: 14, arc: [-1.6, 3.2] });
      both(s => {
        k.ball('metal', [s * .22, .46, 0], [.12, .09, .11], { seg: 12 });
        k.ball('metal', [s * .245, .39, 0], [.1, .055, .1], { seg: 12, tint: .85 });
        for (const dz of [-.04, .04]) k.spike('steel', [s * .25, .5, dz], [s * .3, .62, dz * 1.4], .022, { seg: 5 });
      });
      k.lathe('metal', [[.1, .46], [.085, .54], [.07, .56]], { seg: 12 });
    };
    p.head = k => {
      head(k);
      k.lathe('metal', [[.13, -.0], [.135, .06], [.12, .12], [.08, .16], [0, .175]], { seg: 16, arc: [-2.2, 4.4] });
      both(s => k.tube('bone', [[s * .1, .1, -.02], [s * .19, .15, -.04], [s * .23, .24, -.08], [s * .22, .32, -.12]], t => .03 * (1 - t) + .006, { seg: 6 }));
    };
    p.body = k => { body(k); k.lathe('metal', [[.12, .58], [.14, .66], [.13, .72]], { scale: [1, 1, .8], seg: 14 }); for (let i = 0; i < 5; i++) { const x = (i - 2) * .05; k.plate('metal', [[-.022, 0], [.022, 0], [.02, -.16], [-.02, -.16]], .01, { at: [x, .6, .1], rot: [-.15, 0, 0] }); } };
    p.weapon = wardenAxe;
  } else if (type === 'lich') {
    const head = p.head;
    p.head = k => {
      head(k);
      // a gold crown and a hood falling to the shoulders
      k.lathe('gold', [[.118, .07], [.124, .1], [.12, .12], [.114, .12]], { seg: 16 });
      for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2; k.spike('gold', [Math.sin(a) * .12, .115, Math.cos(a) * .12], [Math.sin(a) * .13, .2, Math.cos(a) * .13], .018, { seg: 4 }); }
      k.ball('ruby', [0, .1, .124], .016, { seg: 6 });
      k.lathe('metal', [[.06, .2], [.14, .12], [.16, .0], [.16, -.12], [.18, -.2]], { seg: 16, arc: [PI * .55, PI * .9], fade: .3 });
    };
    p.body = k => {
      pelvis(k);
      k.lathe('metal', [[.17, .76], [.19, .6], [.25, .35], [.31, .1], [.34, 0], [0, 0]], { scale: [1, 1, .9], seg: 18, fade: .45 });
      k.lathe('gold', [[.33, .02], [.345, .02], [.34, .05], [.33, .05]], { scale: [1, 1, .9], seg: 18 });
      for (let i = 0; i < 5; i++) { const a = PI * (.7 + i * .15); k.spike('metal', [Math.sin(a) * .32, .08, Math.cos(a) * .29], [Math.sin(a) * .36, -.0, Math.cos(a) * .32], .04, { seg: 4 }); }
    };
    p.torso = k => {
      ribcage(k, 3);
      k.lathe('metal', [[.17, .1], [.18, .22], [.2, .34], [.19, .42], [.13, .48], [.07, .52]], { scale: [1, 1, .85], seg: 16 });
      k.lathe('metal', [[.08, .54], [.17, .5], [.26, .42], [.29, .34], [.28, .3]], { scale: [1, 1, .9], seg: 18 });
      k.lathe('gold', [[.28, .31], [.292, .305], [.288, .29]], { scale: [1, 1, .9], seg: 18 });
      k.tube('gold', [[0, .12, .15], [0, .3, .17], [0, .47, .12]], .01, { seg: 4 });
      for (let i = 0; i < 3; i++) k.ball('ruby', [0, .2 + i * .1, .17], .014, { seg: 6 });
    };
    p.arm = k => { humerus(k); k.lathe('metal', [[.05, .02], [.07, -.1], [.08, -.26], [.065, -.27]], { seg: 12 }); };
    p.elR = k => { forearmHand(k, true); k.lathe('metal', [[.06, .0], [.08, -.12], [.11, -.22], [.115, -.23]], { seg: 12, fade: .2 }); k.lathe('gold', [[.11, -.22], [.12, -.23], [.115, -.24]], { seg: 12 }); };
    p.elL = k => { forearmHand(k, false); k.lathe('metal', [[.06, .0], [.08, -.12], [.11, -.22], [.115, -.23]], { seg: 12, fade: .2 }); k.lathe('gold', [[.11, -.22], [.12, -.23], [.115, -.24]], { seg: 12 }); };
    p.weapon = lichStaff;
  }
  return p;
}

function zombieParts(): Parts {
  return {
    body: k => {
      k.lathe('metal', [[.13, .52], [.15, .58], [.155, .66], [.15, .72]], { scale: [1, 1, .8], seg: 12, fade: .2 });
      for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2; k.spike('metal', [Math.sin(a) * .14, .54, Math.cos(a) * .11], [Math.sin(a) * .15, .44 - (i % 3) * .03, Math.cos(a) * .12], .03, { seg: 4 }); }
    },
    hip: k => fleshThigh(k, .052, true),
    knee: k => fleshShin(k, .05, { ragged: true }),
    torso: k => {
      // a hunched, rotting trunk in a torn shirt; ribs show through a gash
      const hunch: V3 = [.42, 0, 0];
      k.lathe('bone', [[0, -.04], [.14, -.03], [.16, .08], [.17, .24], [.185, .36], [.16, .44], [.1, .5], [.06, .53], [0, .53]], { scale: [1, 1, .78], seg: 14, rot: hunch });
      // the shirt covers the shoulders and back only; the front is torn open
      k.lathe('metal', [[.168, .2], [.178, .24], [.192, .36], [.168, .44], [.12, .49]], { scale: [1, 1, .82], seg: 14, arc: [1.1, 4.1], rot: hunch, fade: .25 });
      for (let i = 0; i < 9; i++) { const a = 1.2 + i * .44; k.spike('metal', [Math.sin(a) * .17, .22, Math.cos(a) * .14], [Math.sin(a) * .18, .1 - (i % 3) * .04, Math.cos(a) * .15], .035, { seg: 4, rot: hunch }); }
      // a gash in the belly with ribs showing through
      k.ball('flesh', [.06, .26, .115], [.07, .1, .035], { seg: 10, rot: hunch });
      for (let i = 0; i < 3; i++) k.tube('ribs', [[.0, .32 - i * .05, .14], [.06, .32 - i * .05, .14], [.12, .3 - i * .05, .09]], .011, { seg: 5, rot: hunch });
      k.lathe('metal', [[.15, -.03], [.165, .04], [.165, .08]], { scale: [1, 1, .8], seg: 12, rot: hunch });
      k.limb('bone', [0, .43, .15], [0, .54, .24], .055, .05, { caps: false });
    },
    head: k => {
      k.ball('bone', [0, .02, .0], [.115, .125, .125], { seg: 14 });
      both(s => {
        k.ball('dark', [s * .043, .0, .1], [.03, .025, .02], { seg: 8 });
        k.ball('bone', [s * .045, .03, .1], [.032, .012, .022], { seg: 7, tint: .85 });
        k.ball('bone', [s * .11, -.0, .0], [.02, .035, .025], { seg: 6 });
      });
      k.spike('bone', [0, -.03, .11], [0, -.05, .13], .018, { seg: 5 });
      for (let i = 0; i < 6; i++) { const a = -1 + i * .4; k.tube('hair', [[Math.sin(a) * .1, .1, Math.cos(a) * .06 - .03], [Math.sin(a) * .13, .03, Math.cos(a) * .07 - .06], [Math.sin(a) * .135, -.06, Math.cos(a) * .06 - .07]], .006, { seg: 3 }); }
    },
    jaw: k => {
      k.ball('bone', [0, -.035, .06], [.075, .045, .06], { seg: 10 });
      k.ball('dark', [0, -.02, .1], [.045, .022, .02], { seg: 8 });
      for (let i = -1; i <= 1; i++) k.box('ribs', [.012, .018, .01], { at: [i * .018, -.012, .108], r: .003 });
    },
    arm: k => fleshArm(k, .05, true),
    elR: k => fleshForearm(k, .046, { claws: true }),
    elL: k => fleshForearm(k, .046, { claws: true }),
  };
}

function fallenParts(): Parts {
  return {
    body: k => {
      k.lathe('metal', [[.11, .54], [.125, .62], [.125, .7]], { scale: [1, 1, .85], seg: 12 });
      k.plate('metal', [[-.07, 0], [.07, 0], [.05, -.16], [0, -.2], [-.05, -.16]], .012, { at: [0, .62, .09], rot: [-.15, 0, 0] });
      k.plate('metal', [[-.07, 0], [.07, 0], [.05, -.13], [-.05, -.13]], .012, { at: [0, .62, -.09], rot: [.15, PI, 0] });
      // a thin tail with a barbed tip
      k.tube('bone', [[0, .64, -.1], [0, .5, -.25], [.05, .32, -.34], [.08, .22, -.3]], t => .025 * (1 - t) + .006, { seg: 6, segs: 16 });
      k.spike('horn', [.08, .22, -.3], [.1, .16, -.24], .022, { seg: 4 });
    },
    hip: k => fleshThigh(k, .045, false),
    knee: k => fleshShin(k, .045, { claws: true }),
    torso: k => {
      k.lathe('bone', [[0, -.02], [.12, -.01], [.14, .12], [.16, .28], [.17, .38], [.14, .45], [.08, .5], [0, .52]], { scale: [1, 1, .8], seg: 14 });
      for (let i = 0; i < 3; i++) k.ring('bone', .13 + i * .006, .01, { at: [0, .14 + i * .07, .02], rot: [PI / 2, 0, 0], scale: [1, .8, 1], arc: PI, seg: 4, tint: .85 });
      k.limb('bone', [0, .45, 0], [0, .58, .02], .05, .045, { caps: false });
      k.limb('metal', [.15, .44, .06], [-.13, .12, .1], .012, .012, { caps: false, seg: 4 });
      for (let i = 0; i < 3; i++) k.ball('horn', [.08 - i * .1, .36 - i * .1, .12], .012, { seg: 5 });
    },
    head: k => {
      // a big imp head: brow ridge, hooked nose, long ears, curling horns
      k.ball('bone', [0, .03, -.01], [.13, .125, .13], { seg: 14 });
      k.ball('bone', [0, .045, .08], [.11, .035, .05], { seg: 10, tint: .9 });
      k.tube('bone', [[0, .03, .12], [0, -.02, .16], [0, -.06, .155]], t => .025 * (1 - t) + .008, { seg: 5 });
      both(s => {
        k.ball('dark', [s * .05, .015, .108], [.026, .02, .016], { seg: 7 });
        k.tube('bone', [[s * .11, .03, -.01], [s * .19, .06, -.03], [s * .25, .11, -.06]], t => .03 * (1 - t) + .005, { seg: 5 });
        k.tube('horn', [[s * .07, .13, -.01], [s * .13, .2, -.04], [s * .15, .27, -.12], [s * .12, .29, -.19]], t => .028 * (1 - t) + .005, { seg: 6, segs: 12 });
      });
    },
    jaw: k => {
      k.ball('bone', [0, -.05, .07], [.09, .05, .06], { seg: 10 });
      k.ball('dark', [0, -.035, .11], [.06, .018, .02], { seg: 8 });
      both(s => k.spike('horn', [s * .04, -.03, .115], [s * .045, .005, .12], .009, { seg: 4 }));
    },
    arm: k => fleshArm(k, .04, false),
    elR: k => fleshForearm(k, .038, { claws: true, grip: true }),
    elL: k => fleshForearm(k, .038, { claws: true }),
    weapon: spear,
  };
}

function gorgerParts(): Parts {
  return {
    body: k => {
      k.lathe('metal', [[.15, .54], [.17, .62], [.17, .7]], { scale: [1, 1, .9], seg: 14 });
      // meat hooks and a chain on the belt
      both(s => {
        k.tube('steel', [[s * .16, .66, .08], [s * .19, .56, .1], [s * .2, .48, .08], [s * .17, .45, .05], [s * .15, .48, .06]], .009, { seg: 4, segs: 14 });
        for (let i = 0; i < 4; i++) k.ring('steel', .016, .005, { at: [s * .16, .63 - i * .028, .095], rot: [0, i % 2 ? PI / 2 : 0, 0], seg: 3 });
      });
    },
    hip: k => fleshThigh(k, .09, true),
    knee: k => fleshShin(k, .08, { boot: true }),
    torso: k => {
      // the bloated belly and chest, an apron with blood on it, stitches across the belly
      k.lathe('bone', [[0, -.04], [.17, -.03], [.24, .08], [.27, .2], [.25, .32], [.22, .42], [.15, .48], [.08, .52], [0, .52]], { scale: [1, 1, .95], seg: 18, fade: .2 });
      k.ball('bone', [0, .15, .1], [.24, .22, .2], { seg: 16 });
      // the apron wraps the front of the belly; blood soaks its middle and hem
      const apron: V2[] = [[.16, .4], [.24, .3], [.29, .15], [.3, .02], [.28, -.12], [.27, -.22]];
      k.lathe('metal', apron, { at: [0, 0, .1], scale: [.92, 1, .98], seg: 14, arc: [-.95, 1.9], fade: .25 });
      k.lathe('blood', apron.slice(1, 5).map(([r, y]) => [r + .006, y] as const), { at: [0, 0, .1], scale: [.92, 1, .98], seg: 8, arc: [-.35, .6] });
      k.lathe('blood', [[.276, -.16], [.278, -.22]], { at: [0, 0, .1], scale: [.92, 1, .98], seg: 12, arc: [-.9, 1.8] });
      both(s => k.tube('metal', [[s * .17, .36, .25], [s * .2, .44, .1], [s * .1, .5, -.08]], .012, { seg: 4 }));
      for (let i = 0; i < 6; i++) k.box('dark', [.008, .03, .008], { at: [-.1 + i * .04, .28, .22 + Math.sin(i / 5 * PI) * .03], r: .002, rot: [0, 0, .5] });
      both(s => k.ball('bone', [s * .23, .44, 0], [.11, .09, .1], { seg: 12 }));
      k.limb('bone', [0, .44, 0], [0, .58, .03], .07, .06, { caps: false });
    },
    head: k => {
      // a small, bald, scarred head on the huge body
      k.ball('bone', [0, .0, .0], [.12, .125, .125], { seg: 14 });
      k.ball('bone', [0, -.04, .07], [.09, .07, .07], { seg: 11 });
      both(s => {
        k.ball('dark', [s * .042, .015, .105], .018, { seg: 6 });
        k.box('bone', [.05, .016, .02], { at: [s * .043, .04, .108], rot: [0, 0, s * -.35], r: .006, tint: .85 });
        k.ball('bone', [s * .118, .0, .0], [.02, .035, .025], { seg: 6 });
      });
      k.ball('bone', [0, -.01, .125], [.022, .028, .02], { seg: 7 });
      k.box('dark', [.008, .09, .006], { at: [-.06, .05, .09], rot: [.2, -.5, .3], r: .002 });
    },
    jaw: k => {
      k.ball('bone', [0, -.07, .06], [.09, .045, .06], { seg: 10 });
      k.ball('dark', [0, -.055, .105], [.05, .015, .02], { seg: 8 });
    },
    arm: k => fleshArm(k, .068, false),
    elR: k => { fleshForearm(k, .062, { grip: true }); k.ring('metal', .065, .012, { at: [0, -.2, 0], rot: [PI / 2, 0, 0], seg: 4 }); },
    elL: k => { fleshForearm(k, .062, {}); k.ring('metal', .065, .012, { at: [0, -.2, 0], rot: [PI / 2, 0, 0], seg: 4 }); },
    weapon: cleaver,
  };
}

const SCALE: Partial<Record<HumanoidType, number>> = { warden: 1.8, fallen: .72, gorger: 1.7, lich: 1.5 };

export function buildHumanoid(type: HumanoidType): SkeletonParts {
  const undead = UNDEAD[type];
  const eyeCol = EYES[type];
  const M = new Skin({
    bone: { color: BONE[type], rough: undead ? .75 : .7 },
    metal: { color: METAL[type], rough: type === 'warden' ? .4 : .95, metal: type === 'warden' ? .7 : 0 },
    dark: { color: 0x0a0706, rough: 1, rim: false },
    wood: { color: 0x5a3e26, rough: .85 },
    steel: { color: type === 'skeleton' || type === 'warden' ? 0x8a7c6e : 0xa8acb4, rough: type === 'skeleton' ? .6 : .32, metal: .8 },
    gold: { color: 0xd8a440, rough: .32, metal: .9 },
    horn: { color: 0xd8c8a8, rough: .6 },
    blood: { color: 0x7a0c0c, rough: .25 },
    ribs: { color: 0xc8bca0, rough: .7 },
    flesh: { color: 0x6a2a2a, rough: .5 },
    hair: { color: 0x1a1612, rough: .9 },
    ruby: { color: 0xd02020, rough: .2, metal: .3, emissive: 0x400808, envI: 1 },
  });

  const P = undead ? undeadParts(type) : type === 'zombie' ? zombieParts() : type === 'fallen' ? fallenParts() : gorgerParts();
  const add = (g: THREE.Object3D, name: string, make: (k: Kit) => void) => part(g, `hum:${type}:${name}`, make, M);
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  add(body, 'body', P.body);
  const legs: SkeletonParts['legs'] = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(.1 * s, .62, 0); body.add(hip);
    add(hip, 'hip', P.hip);
    const knee = new THREE.Group(); knee.position.y = -.32; hip.add(knee);
    add(knee, 'knee', P.knee);
    legs.push({ hip, knee });
  }
  const torso = new THREE.Group(); torso.position.y = .66; body.add(torso);
  add(torso, 'torso', P.torso);
  // the zombie's head hangs forward on its hunched neck
  const head = new THREE.Group(); head.position.set(0, type === 'zombie' ? .58 : .62, type === 'zombie' ? .2 : 0); torso.add(head);
  add(head, 'head', P.head);
  const jaw = new THREE.Group(); jaw.position.set(0, -.05, .0); head.add(jaw);
  add(jaw, 'jaw', P.jaw);
  const eyeM = new THREE.MeshBasicMaterial({ color: eyeCol });
  const eyes: THREE.Sprite[] = [];
  const ex = type === 'fallen' ? .05 : type === 'gorger' ? .042 : .045, ey = type === 'gorger' ? .015 : type === 'zombie' ? 0 : .008, ez = type === 'fallen' ? .118 : .108;
  for (const s of [-1, 1]) {
    mesh(gSph(.013, 6, 4), eyeM, s * ex, ey, ez, head, false);
    eyes.push(glowSprite(eyeCol, .2, head, s * ex, ey, ez + .03));
  }
  const arms: { sh: THREE.Group; el: THREE.Group }[] = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(.22 * s, .44, 0); torso.add(sh);
    add(sh, 'arm', P.arm);
    const el = new THREE.Group(); el.position.y = -.27; sh.add(el);
    add(el, s < 0 ? 'elR' : 'elL', s < 0 ? P.elR : P.elL);
    arms.push({ sh, el });
  }
  const weapon = new THREE.Group(); weapon.position.y = -.27; arms[0].el.add(weapon); weapon.rotation.x = PI;
  if (P.weapon) add(weapon, 'weapon', P.weapon);
  const extra: THREE.Material[] = [];
  if (type === 'lich') { const glow = glowSprite(0xff7020, .5, weapon, 0, 1.2, .0); extra.push(glow.material); }
  const sc = SCALE[type];
  if (sc) root.scale.setScalar(sc);
  return {
    root, body, legs, torso, head, jaw, armR: arms[0].sh, elR: arms[0].el, armL: arms[1].sh, weapon, eyes,
    mats: [...M.mats, eyeM, ...eyes.map(e => e.material), ...extra], flashMats: M.mats,
  };
}
