/**
 * Townsfolk (SPEC §13.2): a simple standing rig (legs, robe, torso, head, two arms) dressed per role. They do not
 * walk; `animateNpc` gives them a slow idle and turns the head toward the hero.
 */
import * as THREE from 'three';
import { PI, R, clamp, wrapA } from '../../core/math';
import { G } from '../../game/state';
import type { NpcId } from '../../game/shops';
import { gBox, gCone, gCyl, gSph, mesh } from '../../render/geometry';
import { rimLit } from '../../render/materials';

export interface NpcParts { root: THREE.Group; body: THREE.Group; head: THREE.Group; armR: THREE.Group; armL: THREE.Group; phase: number }

interface Look { robe: number; trim: number; skin: number; hair: number; scale: number }
const LOOK: Record<NpcId, Look> = {
  smith: { robe: 0x4a3a2c, trim: 0x2a2018, skin: 0xc49070, hair: 0x3a2618, scale: 1.12 },
  witch: { robe: 0x3a2050, trim: 0x6a3a8a, skin: 0xb8a088, hair: 0x18141a, scale: 1 },
  healer: { robe: 0xd8d0c0, trim: 0x8a2a2a, skin: 0xc8a080, hair: 0x6a5a48, scale: 1 },
  sage: { robe: 0x5a5a62, trim: 0x2a2a40, skin: 0xc0a088, hair: 0xd8d8d0, scale: .98 },
  peddler: { robe: 0x3a4a2a, trim: 0x6a5030, skin: 0xc8a080, hair: 0x5a3a20, scale: .9 },
};

export function buildNpc(id: NpcId): NpcParts {
  const L = LOOK[id];
  const std = (color: number, roughness = .9, metalness = 0) => {
    const m = rimLit(new THREE.MeshStandardMaterial({ color, roughness, metalness }));
    G.L.disposeMat.push(m);
    return m;
  };
  const robe = std(L.robe), trim = std(L.trim), skin = std(L.skin, .8), hair = std(L.hair), dark = std(0x141010), wood = std(0x5a4030), iron = std(0x6a6a72, .45, .6);
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); root.scale.setScalar(L.scale);
  for (const s of [-1, 1]) mesh(gBox(.13, .5, .14), dark, .09 * s, .25, 0, body);
  mesh(gCyl(.2, .3, .62, 10), robe, 0, .5, 0, body);
  mesh(gCyl(.21, .21, .07, 10), trim, 0, .78, 0, body);
  const torso = new THREE.Group(); torso.position.y = .8; body.add(torso);
  mesh(gCyl(.21, .2, .42, 10), robe, 0, .2, 0, torso);
  const head = new THREE.Group(); head.position.y = .55; torso.add(head);
  mesh(gSph(.15, 10, 8), skin, 0, 0, 0, head);
  for (const s of [-1, 1]) mesh(gBox(.03, .02, .02), dark, .05 * s, .02, .14, head, false);
  const arm = (s: number): THREE.Group => {
    const sh = new THREE.Group(); sh.position.set(.25 * s, .38, 0); torso.add(sh);
    mesh(gCyl(.06, .055, .34, 6), robe, 0, -.17, 0, sh); mesh(gSph(.055, 6, 5), skin, 0, -.36, 0, sh, false);
    sh.rotation.z = .12 * s;
    return sh;
  };
  const armR = arm(-1), armL = arm(1);
  switch (id) {
    case 'smith': {
      // bald, bearded, leather apron, a hammer in hand
      mesh(gBox(.3, .5, .05), trim, 0, .5, .2, body);
      mesh(gSph(.12, 8, 6), hair, 0, -.08, .07, head).scale.set(1, .8, .7);
      const ham = new THREE.Group(); ham.position.y = -.38; armR.add(ham); ham.rotation.x = PI / 2.3;
      mesh(gCyl(.025, .025, .45, 6), wood, 0, .2, 0, ham); mesh(gBox(.1, .16, .1), iron, 0, .45, 0, ham);
      break;
    }
    case 'witch': {
      // pointed hat, long dark hair, a gnarled staff
      mesh(gCyl(.24, .24, .03, 12), trim, 0, .1, 0, head); mesh(gCone(.15, .42, 10), trim, 0, .32, -.03, head).rotation.x = -.2;
      mesh(gBox(.3, .3, .1), hair, 0, -.08, -.1, head);
      const st = new THREE.Group(); st.position.y = -.36; armL.add(st);
      mesh(gCyl(.025, .03, 1.5, 6), wood, 0, .2, 0, st); mesh(gSph(.06, 8, 6), std(0x6aff8a, .3), 0, .95, 0, st, false);
      break;
    }
    case 'healer': {
      // shaved head with a fringe, red sash, a satchel
      mesh(gSph(.155, 10, 8), hair, 0, .02, -.02, head).scale.set(1, .6, 1);
      mesh(gBox(.06, .5, .44), trim, 0, .22, 0, torso).rotation.z = .6;
      mesh(gBox(.22, .2, .12), wood, .22, .48, .05, body);
      break;
    }
    case 'sage': {
      // long white beard and hair, a tall staff
      mesh(gCone(.11, .4, 8), hair, 0, -.22, .09, head).rotation.x = PI;
      mesh(gSph(.155, 10, 8), hair, 0, .03, -.03, head).scale.set(1, .9, 1);
      const st = new THREE.Group(); st.position.y = -.36; armL.add(st);
      mesh(gCyl(.025, .025, 1.7, 6), wood, 0, .3, 0, st);
      break;
    }
    case 'peddler': {
      // hood and a big pack on the back
      mesh(gSph(.17, 10, 8), robe, 0, .02, -.02, head).scale.set(1, 1.05, 1.05);
      mesh(gBox(.38, .5, .26), wood, 0, .25, -.28, torso);
      mesh(gCyl(.08, .08, .4, 8), trim, 0, .55, -.28, torso).rotation.z = PI / 2;
      break;
    }
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
