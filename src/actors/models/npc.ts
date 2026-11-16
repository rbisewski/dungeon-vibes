/**
 * Townsfolk (SPEC §13.2): a standing rig (body, torso, head, two arms) built with the modelling kit and dressed per
 * role. They do not walk; `animateNpc` gives them a slow idle and turns the head toward the hero.
 */
import * as THREE from 'three';
import { PI, R, clamp, wrapA } from '../../core/math';
import { G } from '../../game/state';
import type { NpcId } from '../../game/shops';
import { Skin, part, type Kit, type V2 } from './kit';

export interface NpcParts { root: THREE.Group; body: THREE.Group; head: THREE.Group; armR: THREE.Group; armL: THREE.Group; phase: number }

interface Look { robe: number; trim: number; skin: number; hair: number; scale: number }
const LOOK: Record<NpcId, Look> = {
  smith: { robe: 0x4a3a2c, trim: 0x2a2018, skin: 0xc49070, hair: 0x3a2618, scale: 1.12 },
  witch: { robe: 0x3a2050, trim: 0x6a3a8a, skin: 0xb8a088, hair: 0x18141a, scale: 1 },
  healer: { robe: 0xd8d0c0, trim: 0x8a2a2a, skin: 0xc8a080, hair: 0x6a5a48, scale: 1 },
  sage: { robe: 0x5a5a62, trim: 0x2a2a40, skin: 0xc0a088, hair: 0xd8d8d0, scale: .98 },
  peddler: { robe: 0x3a4a2a, trim: 0x6a5030, skin: 0xc8a080, hair: 0x5a3a20, scale: .9 },
};

const both = (f: (s: number) => void): void => { f(-1); f(1); };
/** Who wears a long robe to the ground (the others show trousers and boots). */
const ROBED: Record<NpcId, boolean> = { smith: false, witch: true, healer: true, sage: true, peddler: false };

/** Legs and lower garment: a robe with a hem, or trousers and boots; belt at the waist (body frame, feet at 0). */
function lowerPart(k: Kit, id: NpcId): void {
  if (ROBED[id]) {
    const prof: V2[] = [[.31, .02], [.29, .2], [.25, .45], [.215, .7], [.2, .82]];
    const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 24);
    const p = g.attributes.position, ragged = id === 'witch';
    for (let i = 0; i < p.count; i++) {
      // folds that deepen toward the hem; the witch's hem is torn
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, z), d = 1 - y / .82, r = Math.hypot(x, z) + Math.sin(a * 8) * .018 * d;
      const tear = ragged && y < .05 ? (Math.sin(a * 13) * .5 + .5) * .08 : 0;
      p.setXYZ(i, Math.sin(a) * r, y + tear, Math.cos(a) * r);
    }
    g.computeVertexNormals();
    k.add('robe', g, { fade: .4 });
    if (!ragged) k.lathe('trim', [[.3, .03], [.315, .06], [.3, .1]], { seg: 22 });
    both(s => k.ball('dark', [s * .1, .03, .12], [.06, .04, .1], { seg: 8 }));
  } else {
    both(s => {
      k.limb('trousers', [s * .1, .8, 0], [s * .1, .45, .01], .085, .07, { seg: 10 });
      k.limb('trousers', [s * .1, .45, .01], [s * .1, .2, 0], .07, .06, { seg: 10 });
      k.lathe('boot', [[.075, 0], [.08, .1], [.07, .24], [.08, .27], [.07, .28]], { at: [s * .1, 0, 0], seg: 12, fade: .3 });
      k.ball('boot', [s * .1, .045, .07], [.07, .05, .1], { seg: 10 });
    });
    k.lathe('trousers', [[.2, .72], [.215, .8], [.21, .84]], { seg: 16 });
  }
  k.lathe(id === 'healer' ? 'rope' : 'belt', [[.205, .78], [.215, .8], [.215, .84], [.205, .86]], { seg: 18 });
}

/** Chest and shoulders (torso frame: waist at 0, neck at .5). */
function torsoPart(k: Kit, id: NpcId): void {
  const broad = id === 'smith' ? 1.15 : 1;
  k.lathe(id === 'smith' ? 'shirt' : 'robe', [[.2, -.02], [.215, .12], [.235, .28], [.22, .38], [.15, .46], [.07, .5]], { seg: 20, scale: [broad, 1, .85], fade: .2 });
  k.limb('skin', [0, .44, 0], [0, .52, .01], .058, .055, { seg: 10 });
  switch (id) {
    case 'smith':
      // a leather apron over the shirt, a pocket and a strap round the neck
      k.lathe('apron', [[.25, -.42], [.235, -.1], [.215, .0], [.24, .2], [.245, .3], [.2, .36]], { seg: 10, arc: [-.75, 1.5], scale: [broad, 1, .9], fade: .2 });
      k.box('apron', [.18, .1, .02], { at: [0, .14, .215], r: .01, tint: .8 });
      both(s => k.limb('apron', [s * .12, .35, .17], [s * .06, .48, .02], .015, .015, { seg: 4 }));
      break;
    case 'witch':
      // a shawl over the shoulders, a pendant
      k.lathe('trim', [[.17, .44], [.24, .36], [.27, .25], [.255, .2]], { seg: 20, scale: [1, 1, .9], fade: .2 });
      k.limb('gold', [-.06, .44, .1], [0, .34, .18], .006, .006, { seg: 3 }); k.limb('gold', [.06, .44, .1], [0, .34, .18], .006, .006, { seg: 3 });
      k.ball('orb', [0, .33, .185], .025, { seg: 8 });
      break;
    case 'healer':
      // a red sash across the chest with a cross on it, a satchel at the hip on its strap
      k.ring('trim', .235, .024, { at: [0, .22, 0], rot: [-PI / 2, -.6, 0], scale: [1, 1, 1.6], seg: 4 });
      k.box('cream', [.025, .08, .01], { at: [-.08, .26, .205] }); k.box('cream', [.06, .025, .01], { at: [-.08, .27, .205] });
      break;
    case 'sage':
      // a cowl gathered on the shoulders
      k.lathe('trim', [[.14, .48], [.22, .42], [.27, .32], [.26, .26]], { seg: 20, fade: .25 });
      break;
    case 'peddler':
      // a hooded cape to the knees, straps of the pack
      k.lathe('robe', [[.18, .46], [.26, .36], [.29, .1], [.31, -.2], [.3, -.38]], { seg: 20, arc: [PI * .55, PI * .9], fade: .3 });
      both(s => k.box('belt', [.04, .5, .02], { at: [s * .1, .22, .19], rot: [0, 0, s * .1], r: .006 }));
      break;
  }
}

/** The face and what is on the head (head frame; the head group is scaled 1.3). */
function headPart(k: Kit, id: NpcId): void {
  k.ball('skin', [0, -.012, .035], [.1, .118, .1], { seg: 16 });
  k.ball('skin', [0, -.07, .07], [.07, .05, .06], { seg: 12 });
  k.spike('skin', [0, .005, .12], id === 'witch' ? [.01, -.05, .185] : [0, -.03, .155], id === 'witch' ? .024 : .02, { seg: 6 });
  both(s => {
    k.ball('skin', [s * .1, -.01, .02], [.018, .03, .02], { seg: 6 });
    k.ball('dark', [s * .038, .012, .126], .014, { seg: 6 });
    k.box('hair', [.05, id === 'smith' ? .02 : .012, .016], { at: [s * .04, .042, .125], rot: [0, 0, s * .2], r: .004 });
  });
  switch (id) {
    case 'smith':
      // bald crown, a thick beard and moustache
      k.ball('hair', [0, -.085, .075], [.095, .085, .07], { seg: 12 });
      k.tube('hair', [[-.07, -.04, .12], [0, -.035, .14], [.07, -.04, .12]], .018, { seg: 6 });
      both(s => k.ball('hair', [s * .09, -.03, .04], [.03, .06, .05], { seg: 8 }));
      break;
    case 'witch':
      // long black hair, a wide-brimmed pointed hat with a bent tip and a buckled band
      k.tube('hair', [[0, .02, -.08], [0, -.12, -.12], [0, -.32, -.1]], t => .1 * (1 - t) + .04, { seg: 10 });
      both(s => k.tube('hair', [[s * .09, .02, .02], [s * .1, -.12, .0], [s * .09, -.24, -.02]], t => .035 * (1 - t) + .015, { seg: 6 }));
      k.lathe('hat', [[0, .08], [.22, .07], [.235, .058], [.215, .052], [0, .066]], { seg: 22, fadeUp: -.15 });
      k.tube('hat', [[0, .07, 0], [0, .22, -.02], [0, .36, -.07], [.03, .45, -.15], [.07, .47, -.23]], t => .135 * (1 - t) ** 1.1 + .01, { seg: 14, segs: 18 });
      k.lathe('trim', [[.136, .08], [.138, .1], [.127, .12]], { seg: 18 });
      k.box('gold', [.05, .04, .015], { at: [0, .1, .138], r: .006 });
      break;
    case 'healer':
      // a tonsure: a ring of hair round a bare crown
      k.lathe('hair', [[.104, -.02], [.11, .03], [.1, .07], [.075, .092]], { seg: 16, arc: [.75, PI * 2 - 1.5] });
      break;
    case 'sage':
      // long white hair and a beard to the waist, bushy brows
      k.ball('hair', [0, .03, -.025], [.11, .11, .105], { seg: 14 });
      k.tube('hair', [[0, -.05, .1], [0, -.16, .13], [0, -.3, .13], [.01, -.42, .1]], t => .07 * (1 - t) + .012, { seg: 10 });
      both(s => {
        k.tube('hair', [[s * .09, .0, -.02], [s * .11, -.15, -.04], [s * .1, -.3, -.06]], t => .04 * (1 - t) + .015, { seg: 6 });
        k.tube('hair', [[0, -.035, .14], [s * .04, -.05, .135], [s * .07, -.1, .11]], .014, { seg: 5 });
      });
      break;
    case 'peddler':
      // the hood up, a short beard
      k.ball('robe', [0, .015, -.02], [.155, .165, .16], { seg: 16, fade: .2 });
      k.ring('robe', .11, .024, { at: [0, -.008, .1], scale: [1, 1.15, 1], seg: 6 });
      k.tube('robe', [[0, .1, -.1], [0, .03, -.17], [0, -.08, -.19]], t => .06 * (1 - t) + .02, { seg: 8 });
      k.ball('hair', [0, -.08, .08], [.075, .055, .055], { seg: 10 });
      break;
  }
}

/** Shoulder, sleeve and hand (shoulder joint at the origin, hand at y -.36). */
function armPart(k: Kit, id: NpcId): void {
  k.ball(id === 'smith' ? 'shirt' : 'robe', [0, -.01, 0], .072, { seg: 12 });
  if (id === 'smith') {
    // rolled sleeves, bare forearms, a leather bracer
    k.limb('shirt', [0, -.02, 0], [0, -.16, .005], .065, .058);
    k.ring('shirt', .062, .018, { at: [0, -.16, .005], rot: [PI / 2, 0, 0], seg: 5 });
    k.limb('skin', [0, -.17, .005], [0, -.3, 0], .055, .045, { seg: 10 });
    k.lathe('apron', [[.05, -.26], [.052, -.32], [.048, -.32]], { seg: 10 });
  } else {
    const wide = id === 'healer' || id === 'peddler' ? .085 : .1;
    k.limb('robe', [0, -.02, 0], [0, -.17, .005], .058, .052);
    k.lathe('robe', [[.052, -.16], [.07, -.24], [wide, -.31], [wide - .005, -.315], [.05, -.31]], { seg: 14, fade: .2 });
    if (id !== 'peddler') k.lathe('trim', [[wide - .004, -.3], [wide + .004, -.31], [wide - .002, -.318]], { seg: 14 });
  }
  k.ball('skin', [0, -.34, .005], [.042, .05, .04], { seg: 10 });
  k.limb('skin', [.03, -.33, .03], [.034, -.36, .05], .014, .012, { seg: 6 });
}

/** What each NPC holds (item frame at the hand), and the peddler's pack (torso frame). */
function hammerPart(k: Kit): void {
  k.limb('wood', [0, -.12, 0], [0, .34, 0], .02, .024, { seg: 7 });
  k.box('iron', [.17, .08, .08], { at: [.02, .36, 0], r: .015 });
  k.lathe('iron', [[.045, -.04], [.048, .05], [.04, .07]], { at: [.11, .36, 0], rot: [0, 0, -PI / 2], seg: 10 });
}
function gnarledStaff(k: Kit): void {
  k.tube('wood', [[0, -.55, 0], [.02, -.1, .01], [-.02, .35, -.01], [.02, .75, .01], [0, .95, 0]], t => .03 * (1 - t) + .018, { seg: 7, segs: 16 });
  for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2; k.tube('wood', [[0, .9, 0], [Math.sin(a) * .06, 1.0, Math.cos(a) * .06], [Math.sin(a) * .035, 1.1, Math.cos(a) * .035]], .009, { seg: 4 }); }
  k.ball('orb', [0, 1.04, 0], .055, { seg: 12 });
}
function sageStaff(k: Kit): void {
  k.limb('wood', [0, -.55, 0], [0, 1.15, 0], .022, .026, { seg: 8 });
  k.lathe('gold', [[.03, 1.1], [.04, 1.14], [.03, 1.18]], { seg: 10 });
  k.ring('gold', .07, .012, { at: [0, 1.27, 0], seg: 5 });
  k.ball('orb2', [0, 1.27, 0], .03, { seg: 8 });
}
function walkingStick(k: Kit): void {
  k.tube('wood', [[0, -.55, 0], [.02, .0, .01], [-.01, .5, 0], [.05, .62, .02]], .022, { seg: 7, segs: 10 });
}
function flask(k: Kit): void {
  k.lathe('glassR', [[0, -.06], [.045, -.06], [.05, -.02], [.02, .02], [.017, .06]], { seg: 10 });
  k.limb('wood', [0, .055, 0], [0, .08, 0], .016, .016, { seg: 5 });
}
function packPart(k: Kit): void {
  k.box('pack', [.4, .48, .26], { at: [0, .25, -.33], r: .05, fade: .3 });
  k.box('belt', [.36, .16, .04], { at: [0, .38, -.19], r: .02 });
  both(s => k.box('woodDark', [.04, .7, .04], { at: [s * .2, .26, -.47], r: .01 }));
  k.limb('blanket', [-.26, .56, -.35], [.26, .56, -.35], .09, .09, { seg: 12 });
  for (const y of [.53, .59]) both(s => k.ring('belt', .093, .01, { at: [s * .14, y - .03, -.35], rot: [0, PI / 2, 0], seg: 3 }));
  k.lathe('iron', [[0, -.04], [.08, -.04], [.1, .02], [.1, .03]], { at: [.25, .05, -.38], rot: [0, 0, PI / 2], seg: 12 });
  k.limb('woodDark', [.25, .05, -.38], [.25, -.12, -.38], .012, .012, { seg: 4 });
  k.lathe('clay', [[0, 0], [.05, 0], [.07, .06], [.04, .12], [.045, .14]], { at: [-.26, -.05, -.34], seg: 10 });
}

export function buildNpc(id: NpcId): NpcParts {
  const L = LOOK[id];
  const skin = new Skin({
    robe: { color: L.robe, rough: .95, side: THREE.DoubleSide },
    trim: { color: L.trim, rough: .9, side: THREE.DoubleSide },
    skin: { color: L.skin, rough: .75 },
    hair: { color: L.hair, rough: 1 },
    dark: { color: 0x141010, rough: 1 },
    wood: { color: 0x5a4030, rough: .85 },
    woodDark: { color: 0x3a2a1e, rough: .85 },
    iron: { color: 0x6a6a72, rough: .4, metal: .8, envI: 1 },
    gold: { color: 0xd8a040, rough: .3, metal: .9, envI: 1 },
    shirt: { color: 0x8a7a62, rough: .95 },
    apron: { color: 0x5a3820, rough: .7 },
    trousers: { color: 0x3a3028, rough: .95 },
    boot: { color: 0x2a1c14, rough: .7 },
    belt: { color: 0x3a2618, rough: .7 },
    rope: { color: 0xb09a70, rough: 1 },
    cream: { color: 0xe8e0d0, rough: .9 },
    hat: { color: 0x241430, rough: .95, side: THREE.DoubleSide },
    orb: { color: 0x6aff8a, rough: .2, emissive: 0x2aa040 },
    orb2: { color: 0x8ac0ff, rough: .2, emissive: 0x3060a0 },
    glassR: { color: 0xc02030, rough: .1, envI: 1, emissive: 0x400008 },
    pack: { color: 0x6a5038, rough: .9 },
    blanket: { color: 0x8a3a30, rough: 1 },
    clay: { color: 0xa85a38, rough: .9 },
  });
  G.L.disposeMat.push(...skin.mats);
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); root.scale.setScalar(L.scale);
  part(body, `npc:${id}:lower`, k => lowerPart(k, id), skin);
  const torso = new THREE.Group(); torso.position.y = .8; body.add(torso);
  part(torso, `npc:${id}:torso`, k => torsoPart(k, id), skin);
  if (id === 'peddler') part(torso, 'npc:peddler:pack', packPart, skin);
  const head = new THREE.Group(); head.position.y = .55; head.scale.setScalar(1.3); torso.add(head);
  part(head, `npc:${id}:head`, k => headPart(k, id), skin);
  const arm = (s: number): THREE.Group => {
    const sh = new THREE.Group(); sh.position.set(.25 * s, .38, 0); sh.rotation.z = .12 * s; torso.add(sh);
    // the left arm is the right arm mirrored
    const m = new THREE.Group(); m.scale.x = -s; sh.add(m);
    part(m, `npc:${id}:arm`, k => armPart(k, id), skin);
    return sh;
  };
  const armR = arm(-1), armL = arm(1);
  const hold = (arm: THREE.Group, key: string, make: (k: Kit) => void, rx = 0): void => {
    const g = new THREE.Group(); g.position.set(0, -.36, .02); g.rotation.x = rx; arm.add(g);
    part(g, key, make, skin);
  };
  switch (id) {
    case 'smith': hold(armR, 'npc:hammer', hammerPart, PI / 2.3); break;
    case 'witch': hold(armL, 'npc:gnarledStaff', gnarledStaff); break;
    case 'healer': hold(armL, 'npc:flask', flask, -.4); break;
    case 'sage': hold(armL, 'npc:sageStaff', sageStaff); break;
    case 'peddler': hold(armL, 'npc:walkingStick', walkingStick); break;
  }
  return { root, body, head, armR, armL, phase: R() * 10 };
}

/** Breathing, a slow sway, and the head turning toward the hero when within 6 m. */
export function animateNpc(p: NpcParts, now: number, hx: number, hz: number): void {
  const t = now + p.phase;
  p.body.position.y = Math.sin(t * 1.6) * .01;
  p.body.rotation.z = Math.sin(t * .7) * .02;
  p.armR.rotation.x = Math.sin(t * 1.1) * .06;
  p.armL.rotation.x = Math.sin(t * .9 + 1) * .05;
  const dx = hx - p.root.position.x, dz = hz - p.root.position.z, d = Math.hypot(dx, dz);
  const want = d < 6 ? clamp(wrapA(Math.atan2(dx, dz) - p.root.rotation.y), -.9, .9) : 0;
  p.head.rotation.y += (want - p.head.rotation.y) * .08;
}
