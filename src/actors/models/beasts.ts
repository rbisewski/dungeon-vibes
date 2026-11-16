/**
 * Bat, giant spider, Brood Mother and egg sac models (SPEC §8.3, §9), built with the modelling kit: membrane wings
 * stretched between finger bones, a jointed and banded spider with fangs, palps, an eye cluster and a marked,
 * bristled abdomen, and a veined sac on a web.
 */
import * as THREE from 'three';
import { PI } from '../../core/math';
import { gSph, glowSprite, mesh } from '../../render/geometry';
import type { BatParts, EggParts, SpiderParts } from '../../game/types';
import { part, Skin, type Kit, type V2, type V3 } from './kit';

const both = (f: (s: number) => void): void => { f(-1); f(1); };

/* ---------- bat ---------- */

function batBody(k: Kit): void {
  k.ball('fur', [0, 0, 0], [.11, .1, .15], { seg: 14, fade: .3 });
  k.ball('fur', [0, .03, .02], [.12, .09, .1], { seg: 12 });
  k.ball('fur', [0, .06, .14], [.08, .075, .075], { seg: 12 });
  k.spike('skin', [0, .04, .2], [0, .02, .25], .03, { seg: 6 });
  both(s => {
    k.spike('skin', [s * .045, .1, .12], [s * .09, .22, .1], .035, { seg: 6 });
    k.spike('fur', [s * .047, .1, .115], [s * .092, .215, .095], .042, { seg: 6 });
    k.spike('fang', [s * .018, -.0, .21], [s * .02, -.04, .21], .008, { seg: 4 });
    k.ball('dark', [s * .035, .075, .19], .017, { seg: 6 });
    // feet tucked under the body, claws hooked forward
    k.limb('skin', [s * .05, -.07, -.06], [s * .06, -.13, -.04], .012, .009, { seg: 5 });
    k.spike('fang', [s * .06, -.13, -.04], [s * .06, -.15, .0], .007, { seg: 3 });
  });
}

/** One wing in its own frame (shoulder at the origin, spanning +x): an arm along the leading edge, three fingers fanning back, membrane between. */
function batWing(k: Kit): void {
  const wrist: V3 = [.2, .02, .06];
  const tips: V3[] = [[.46, .0, .02], [.42, .0, -.14], [.26, .0, -.2]];
  k.limb('bone', [0, 0, 0], wrist, .014, .01, { seg: 5 });
  for (const t of tips) k.limb('bone', wrist, t, .007, .004, { seg: 4 });
  k.spike('fang', wrist, [.23, .04, .1], .008, { seg: 3 });
  // membrane: from the body along the arm to each fingertip, scalloped between the tips
  const pts: V2[] = [[0, .03], [wrist[0], -wrist[2]]];
  const scallop = (a: V3, b: V3): V2[] => [.33, .66].map(t => [a[0] + (b[0] - a[0]) * t - .02, -(a[2] + (b[2] - a[2]) * t) + .035] as const);
  pts.push([tips[0][0], -tips[0][2]], ...scallop(tips[0], tips[1]), [tips[1][0], -tips[1][2]], ...scallop(tips[1], tips[2]), [tips[2][0], -tips[2][2]], [.12, .18], [0, .13]);
  k.sheet('membrane', pts, { rot: [-PI / 2, 0, 0], at: [0, -.002, 0] });
}

export function buildBat(): BatParts {
  const M = new Skin({
    fur: { color: 0x3e2e28, rough: 1 }, skin: { color: 0x5e3e38, rough: .8 }, dark: { color: 0x0a0606, rough: 1, rim: false },
    bone: { color: 0x4a3430, rough: .8 }, fang: { color: 0xe8dcc0, rough: .5 },
    membrane: { color: 0x5a3632, rough: .75, side: THREE.DoubleSide },
  });
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  part(body, 'bat:body', batBody, M);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xff3020 });
  const eyes: THREE.Sprite[] = [];
  for (const s of [-1, 1]) { mesh(gSph(.012, 5, 4), eyeM, s * .036, .077, .205, body, false); eyes.push(glowSprite(0xff3018, .16, body, s * .04, .07, .24)); }
  const wings: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(.08 * s, .03, .02); body.add(w);
    const inner = new THREE.Group(); inner.scale.x = s; w.add(inner);
    part(inner, 'bat:wing', batWing, M);
    wings.push(w);
  }
  return { root, body, wings, eyes, mats: [...M.mats, eyeM, ...eyes.map(e => e.material)], flashMats: M.mats };
}

/* ---------- spiders ---------- */

function spiderBody(k: Kit, brood: boolean): void {
  // cephalothorax with a raised head, an eye cluster, fangs and palps
  k.ball('shell', [0, .42, .12], [.19, .12, .21], { seg: 16, fade: .3 });
  k.ball('shell', [0, .48, .2], [.11, .08, .1], { seg: 12 });
  k.tube('shellDark', [[0, .52, .25], [0, .54, .12], [0, .5, .0]], .012, { seg: 4 });
  for (const [x, y, z, r] of [[-.035, .52, .29, .022], [.035, .52, .29, .022], [-.075, .53, .26, .014], [.075, .53, .26, .014], [-.02, .56, .26, .012], [.02, .56, .26, .012], [-.06, .55, .23, .01], [.06, .55, .23, .01]] as const) k.ball('eyeShell', [x, y, z], r, { seg: 7 });
  both(s => {
    k.ball('shell', [s * .04, .38, .29], [.035, .045, .04], { seg: 8 });
    k.tube('fang', [[s * .04, .35, .31], [s * .035, .3, .33], [s * .02, .27, .3]], t => .02 * (1 - t) + .004, { seg: 5 });
    k.tube('leg', [[s * .08, .38, .26], [s * .12, .36, .34], [s * .1, .3, .4]], .014, { seg: 5 });
  });
  // waist and abdomen with markings, bristles and spinnerets
  k.limb('shellDark', [0, .43, -.08], [0, .46, -.14], .05, .05, { seg: 8 });
  k.ball('hair', [0, .5, -.34], [.3, .26, .38], { seg: 18, fade: .35 });
  if (brood) {
    // the red hourglass
    k.ball('mark', [0, .755, -.3], [.06, .015, .07], { seg: 10, rot: [-.15, 0, 0] });
    k.ball('mark', [0, .76, -.4], [.07, .015, .065], { seg: 10, rot: [-.05, 0, 0] });
    k.ball('mark', [0, .76, -.35], [.025, .012, .03], { seg: 8 });
  } else {
    for (let i = 0; i < 4; i++) {
      const z = -.2 - i * .085, y = .75 - Math.abs(i - 1.2) * .04, w = .13 - i * .02;
      k.plate('mark', [[-w, 0], [0, -.045], [w, 0], [w * .7, .02], [0, -.015], [-w * .7, .02]], .012, { at: [0, y, z], rot: [-PI / 2 + .25, 0, 0] });
    }
  }
  for (let i = 0; i < 24; i++) {
    const a = i * 2.4, u = (i % 6) / 6, ph = .6 + u * 1.5, x = Math.sin(a) * Math.sin(ph) * .3, y = .5 + Math.cos(ph) * .26, z = -.34 + Math.cos(a) * Math.sin(ph) * .38;
    k.spike('bristle', [x * .96, y * .99, z * .99], [x * 1.12, y + (y - .5) * .1, z * 1.08], .01, { seg: 3 });
  }
  for (const s of [-1, 0, 1]) k.spike('shellDark', [s * .03, .48, -.7], [s * .04, .46, -.76], .02, { seg: 4 });
}

/** Femur from the hip up to the knee (hip frame: +z points outward). */
function spiderFemur(k: Kit): void {
  k.ball('shell', [0, 0, 0], .038, { seg: 8 });
  k.limb('leg', [0, .0, .02], [0, .21, .36], .03, .025, { seg: 8 });
  k.ball('band', [0, .21, .36], .03, { seg: 8 });
  for (let i = 0; i < 4; i++) { const t = .25 + i * .18; k.spike('bristle', [0, .21 * t + .02, .36 * t], [0, .21 * t + .07, .36 * t - .02], .007, { seg: 3 }); }
}

/** Tibia, metatarsus and claw from the knee to the floor (knee frame). */
function spiderShin(k: Kit): void {
  k.limb('leg', [0, 0, 0], [0, -.32, .12], .026, .02, { seg: 8 });
  k.ball('band', [0, -.32, .12], .021, { seg: 7 });
  k.limb('leg', [0, -.32, .12], [0, -.6, .2], .018, .011, { seg: 7 });
  k.spike('fang', [0, -.6, .2], [0, -.645, .21], .01, { seg: 4 });
  for (let i = 0; i < 3; i++) { const t = .2 + i * .25; k.spike('bristle', [0, -.32 * t, .12 * t + .015], [0, -.32 * t + .02, .12 * t + .06], .006, { seg: 3 }); }
}

export function buildSpider(brood = false): SpiderParts {
  // shell, legs, bands, bristles and fangs share one surface, so each leg joint is a single mesh
  const shell = (color: number) => ({ color, rough: .5, envI: .5 });
  const M = new Skin({
    shell: shell(brood ? 0x241a2e : 0x3a2e26), shellDark: shell(brood ? 0x140e1a : 0x221a14),
    leg: shell(brood ? 0x2a1e34 : 0x3e3026), band: shell(brood ? 0x6a4a80 : 0x8a6a4a),
    bristle: shell(brood ? 0x6a5080 : 0x8a7a62), fang: shell(0x1a1210),
    hair: { color: brood ? 0x3e2650 : 0x4e3a2c, rough: .95 },
    mark: { color: brood ? 0xd01818 : 0xb89a6a, rough: .5, emissive: brood ? 0x500404 : 0 },
    eyeShell: { color: 0x100606, rough: .05, envI: 1.4 },
  });
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  part(body, `spider:${brood ? 'brood' : 'cave'}:body`, k => spiderBody(k, brood), M);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xff2010 });
  const eyes: THREE.Sprite[] = [];
  for (const s of [-1, 1]) { mesh(gSph(.012, 5, 4), eyeM, s * .035, .525, .31, body, false); eyes.push(glowSprite(0xff2010, .2, body, s * .05, .52, .33)); }
  const legs: SpiderParts['legs'] = [];
  for (let i = 0; i < 8; i++) {
    const s = i < 4 ? -1 : 1, kk = i % 4, z = .22 - kk * .12;
    const hip = new THREE.Group(); hip.position.set(.14 * s, .44, z); body.add(hip);
    hip.rotation.y = s * (PI / 2) - s * (kk - 1.5) * .45;
    part(hip, `spider:${brood ? 'brood' : 'cave'}:femur`, spiderFemur, M);
    const knee = new THREE.Group(); knee.position.set(0, .21, .36); hip.add(knee);
    part(knee, `spider:${brood ? 'brood' : 'cave'}:shin`, spiderShin, M);
    legs.push({ hip, knee });
  }
  return { root, body, legs, eyes, mats: [...M.mats, eyeM, ...eyes.map(e => e.material)], flashMats: M.mats };
}

/* ---------- egg sac ---------- */

let sacGeo: THREE.BufferGeometry | null = null;
/** How far the lumpy, pear-shaped sac bulges at a point of the unit sphere scaled to radius .36. */
const sacBulge = (x: number, y: number, z: number): number => 1 + .07 * Math.sin(x * 14 + z * 6) * Math.sin(y * 11) + (y > 0 ? -.12 * (y / .36) ** 2 : 0);
function sacShape(): THREE.BufferGeometry {
  if (sacGeo) return sacGeo;
  const g = new THREE.SphereGeometry(.36, 22, 16), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = sacBulge(x, y, z);
    p.setXYZ(i, x * k, y * 1.15, z * k);
  }
  g.computeVertexNormals();
  g.translate(0, .38, 0);
  sacGeo = g;
  return g;
}

function sacDetail(k: Kit): void {
  // veins over the surface, curled hatchlings showing through, web strands to the floor and a web mat
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * PI * 2 + .3;
    // veins run over the surface from near the base to near the top, wandering sideways
    const pts: V3[] = [.12, .3, .5, .7, .86].map((t, j) => {
      const el = (t - .5) * PI, aa = a + Math.sin(j * 1.7 + i) * .3, x = Math.sin(aa) * Math.cos(el) * .36, y = Math.sin(el) * .36, z = Math.cos(aa) * Math.cos(el) * .36;
      const k = sacBulge(x, y, z) + .035;
      return [x * k, y * 1.15 + .38, z * k] as const;
    });
    k.tube('vein', pts, t => .016 * (1 - t * .5), { seg: 4, segs: 14 });
  }
  for (const [x, y, z] of [[.1, .42, .15], [-.12, .32, .1], [.0, .5, -.12]] as const) {
    k.ball('shadow', [x, y, z], [.07, .05, .06], { seg: 8 });
    for (let j = 0; j < 4; j++) k.limb('shadow', [x, y, z], [x + Math.sin(j * 1.6) * .1, y - .03, z + Math.cos(j * 1.6) * .1], .008, .005, { caps: false, seg: 3 });
  }
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * PI * 2;
    k.limb('web', [Math.sin(a) * .25, .35, Math.cos(a) * .25], [Math.sin(a) * .7, .01, Math.cos(a) * .6], .004, .004, { caps: false, seg: 3 });
  }
  for (const r of [.3, .5, .7]) k.ring('web', r, .004, { at: [0, .012, 0], rot: [PI / 2, 0, 0], scale: [1, .85, 1], seg: 3 });
}

export function buildEggSac(): EggParts {
  // the sac's own geometry carries no vertex colours, so it gets a plain material (spawning adds the rim light)
  const skin = new THREE.MeshStandardMaterial({ color: 0xb8a874, roughness: .3, emissive: 0x100c04, transparent: true, opacity: .72 });
  const M = new Skin({ vein: { color: 0x6a1a30, rough: .5 }, shadow: { color: 0x3a2a20, rough: 1, rim: false, shadow: false }, web: { color: 0xe0e0d8, rough: 1, rim: false, shadow: false } });
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  part(body, 'eggsac:detail', sacDetail, M);
  const sac = mesh(sacShape(), skin, 0, 0, 0, body);
  return { root, body, sac, eyes: [], mats: [skin, ...M.mats], flashMats: [skin] };
}
