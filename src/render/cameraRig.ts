import * as THREE from 'three';
import { damp, rr } from '../core/math';
import { G } from '../game/state';
import { CAM_OFF, camera, cutU } from './renderer';
import { postMat } from './post';

/** Point on the floor the camera looks at. */
export const camTarget = new THREE.Vector3();
const _proj = new THREE.Vector3();

/** Follows the hero with a facing lead, applies screen shake, and feeds the wall-cut and focus uniforms. */
export function updateCamera(dt: number, snap: boolean): void {
  const hero = G.hero;
  const lead = hero.dead ? 0 : 0.9;
  camTarget.x = damp(camTarget.x, hero.x + Math.sin(hero.face) * lead, 3.2, dt);
  camTarget.z = damp(camTarget.z, hero.z + Math.cos(hero.face) * lead, 3.2, dt);
  if (snap) camTarget.set(hero.x, 0, hero.z);
  G.shake = Math.max(0, G.shake - dt * 2.2);
  const sh = G.shake * G.shake * 0.5;
  camera.position.set(camTarget.x + CAM_OFF.x + rr(-sh, sh), CAM_OFF.y + rr(-sh, sh), camTarget.z + CAM_OFF.z + rr(-sh, sh));
  camera.lookAt(camTarget.x, 0, camTarget.z);
  camera.updateMatrixWorld();
  cutU.uPlayer.value.set(hero.x, 0, hero.z);
  _proj.set(hero.x, 0.8, hero.z).project(camera);
  postMat.uniforms.uFocusY.value = _proj.y * 0.5 + 0.5;
  postMat.uniforms.uFocusD.value = _proj.z * 0.5 + 0.5;
  postMat.uniforms.uTime.value = G.now;
}
