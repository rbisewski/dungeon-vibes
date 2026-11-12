import * as THREE from 'three';
import { clamp } from '../core/math';
import { camera, pxU, renderer, scene } from './renderer';
import postFrag from './shaders/post.frag.glsl?raw';

const FULLSCREEN_VERT = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;

/** Depth-of-field, tonemap, grade, vignette and dither pass over the half-res scene. */
export const postMat = new THREE.ShaderMaterial({
  uniforms: {
    tColor: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2(2, 2) },
    uFocusY: { value: 0.5 }, uFocusD: { value: 0.5 }, uTime: { value: 0 }, uMaxR: { value: 7 }, uExposure: { value: 1.45 },
  },
  vertexShader: FULLSCREEN_VERT,
  fragmentShader: postFrag,
  depthTest: false, depthWrite: false,
});
const blitMat = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: null } },
  vertexShader: FULLSCREEN_VERT,
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tDiffuse, vUv); }`,
  depthTest: false, depthWrite: false,
});
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const postScene = new THREE.Scene(), blitScene = new THREE.Scene();
{
  const q1 = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat); q1.frustumCulled = false; postScene.add(q1);
  const q2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blitMat); q2.frustumCulled = false; blitScene.add(q2);
}

let rtA: THREE.WebGLRenderTarget | null = null, rtB: THREE.WebGLRenderTarget | null = null;

function resize(): void {
  const w = Math.max(2, innerWidth), h = Math.max(2, innerHeight);
  renderer.setSize(w, h, false);
  const lw = Math.max(2, Math.floor(w / 2)), lh = Math.max(2, Math.floor(h / 2));
  if (rtA && rtB) { rtA.depthTexture.dispose(); rtA.dispose(); rtB.dispose(); }
  rtA = new THREE.WebGLRenderTarget(lw, lh, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
  rtA.depthTexture = new THREE.DepthTexture(lw, lh);
  rtB = new THREE.WebGLRenderTarget(lw, lh, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
  const aspect = w / h;
  const halfH = aspect >= 1 ? 7.2 : (7.2 * 0.8) / Math.max(aspect, 0.45);
  camera.left = -halfH * aspect; camera.right = halfH * aspect; camera.top = halfH; camera.bottom = -halfH;
  camera.updateProjectionMatrix();
  pxU.value = lh / (2 * halfH);
  postMat.uniforms.uRes.value.set(lw, lh);
  postMat.uniforms.uMaxR.value = clamp(lh / 75, 4, 9);
}
addEventListener('resize', resize);
resize();

/** Scene → half-res target → post pass → upscale blit to the canvas. */
export function renderFrame(): void {
  const a = rtA!, b = rtB!;
  renderer.setRenderTarget(a); renderer.render(scene, camera);
  postMat.uniforms.tColor.value = a.texture; postMat.uniforms.tDepth.value = a.depthTexture;
  renderer.setRenderTarget(b); renderer.render(postScene, postCam);
  blitMat.uniforms.tDiffuse.value = b.texture;
  renderer.setRenderTarget(null); renderer.render(blitScene, postCam);
}
