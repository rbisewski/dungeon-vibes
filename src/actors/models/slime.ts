/**
 * Slime (SPEC §8.3): a lumpy, glossy, translucent blob sagging at the base, with drips, rising bubbles and a
 * swallowed skull and coins showing through, and two wet eyes.
 */
import * as THREE from 'three';
import { gSph, glowSprite, mesh } from '../../render/geometry';
import type { SlimeParts } from '../../game/types';
import { part, Skin, type Kit } from './kit';

/** The goo surface: a sphere pushed out in lumps, flattened and spread at the base where it sags. */
let blobGeo: THREE.BufferGeometry | null = null;
function blob(): THREE.BufferGeometry {
  if (blobGeo) return blobGeo;
  const g = new THREE.SphereGeometry(.46, 28, 20), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, y, z) || 1;
    const lump = 1 + .06 * Math.sin(x * 11 + y * 4) * Math.sin(z * 9 - y * 6) + .04 * Math.sin(x * 23 + z * 19);
    // the lower half spreads out over the floor
    const sag = y < 0 ? 1 + (-y / .46) ** 2 * .22 : 1;
    p.setXYZ(i, x / r * .46 * lump * sag, y * .82 * (y < 0 ? .78 : 1), z / r * .46 * lump * sag);
  }
  g.computeVertexNormals();
  g.translate(0, .38, 0);
  blobGeo = g;
  return g;
}

function insides(k: Kit): void {
  // a half-digested skull, a few bones and coins, and bubbles
  k.ball('bone', [.06, .3, -.08], [.1, .1, .11], { seg: 10, tint: .8 });
  for (const s of [-1, 1]) k.ball('dark', [.06 + s * .04, .3, .015], .025, { seg: 6 });
  k.limb('bone', [-.18, .24, .05], [-.04, .2, -.18], .018, .015, { seg: 5, tint: .75 });
  for (const [x, y, z] of [[-.12, .14, .12], [.15, .16, .1], [-.02, .12, -.06]] as const) k.lathe('coin', [[0, 0], [.035, 0], [.035, .008], [0, .008]], { at: [x, y, z], rot: [1.1, .4, .3], seg: 10 });
  for (const [x, y, z, r] of [[-.1, .45, .12, .03], [.12, .52, -.05, .022], [-.05, .6, -.1, .018], [.18, .36, .14, .02], [-.2, .34, -.1, .025]] as const) k.ball('bubble', [x, y, z], r, { seg: 8 });
}

function face(k: Kit): void {
  for (const s of [-1, 1]) {
    k.ball('eye', [s * .15, .52, .34], [.075, .08, .05], { seg: 12 });
    k.ball('dark', [s * .15, .52, .385], [.035, .045, .02], { seg: 8 });
  }
  // drips running down the front and pooling at the base
  for (const [x, z, len] of [[-.28, .26, .14], [.24, .3, .1], [.05, .4, .12], [-.12, .38, .08]] as const) {
    k.tube('drip', [[x, .3, z], [x * 1.05, .3 - len * .6, z * 1.06], [x * 1.08, .3 - len, z * 1.1]], t => .022 * (1 - t * .3), { seg: 6 });
  }
  k.lathe('drip', [[0, .004], [.52, .004], [.56, .0], [0, 0]], { seg: 20, scale: [1, 1, .95] });
}

export function buildSlime(): SlimeParts {
  const goo = new THREE.MeshStandardMaterial({ color: 0x5aa040, roughness: .14, transparent: true, opacity: .74, emissive: 0x0e2a08, depthWrite: false });
  const M = new Skin({
    bone: { color: 0xa8b088, rough: .8 }, dark: { color: 0x0a0a06, rough: 1, rim: false }, coin: { color: 0xd8a440, rough: .3, metal: .9 },
    bubble: { color: 0xc8ff90, rough: .1, emissive: 0x2a5a10 },
    eye: { color: 0xe8f0c0, rough: .15, envI: .8 },
    drip: { color: 0x4a9036, rough: .15, envI: .6 },
  });
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  part(body, 'slime:insides', insides, M);
  const blobMesh = mesh(blob(), goo, 0, 0, 0, body);
  blobMesh.renderOrder = 2;
  part(body, 'slime:face', face, M);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xd8ff60 });
  const eyes: THREE.Sprite[] = [];
  for (const s of [-1, 1]) { mesh(gSph(.016, 6, 4), eyeM, s * .15 - s * .01, .535, .405, body, false); eyes.push(glowSprite(0xb8ff40, .2, body, s * .15, .53, .43)); }
  // the goo stays first: the slime's flash code resets its emissive glow
  return { root, body, blob: blobMesh, eyes, mats: [goo, ...M.mats, eyeM, ...eyes.map(e => e.material)], flashMats: [goo, ...M.mats] };
}
