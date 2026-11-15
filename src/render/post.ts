import * as THREE from 'three';
import { clamp } from '../core/math';
import { camera, pxU, renderer, scene } from './renderer';
import postFrag from './shaders/post.frag.glsl?raw';
import aoFrag from './shaders/ao.frag.glsl?raw';
import brightFrag from './shaders/bright.frag.glsl?raw';
import blurFrag from './shaders/blur.frag.glsl?raw';

const FULLSCREEN_VERT = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;

/** Depth-of-field, mist, bloom, tonemap, grade, vignette and dither pass over the half-res scene. */
export const postMat = new THREE.ShaderMaterial({
  uniforms: {
    tColor: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2(2, 2) },
    tBloom1: { value: null }, tBloom2: { value: null }, tBloom3: { value: null }, tScatter: { value: null },
    uFocusY: { value: 0.5 }, uFocusD: { value: 0.5 }, uTime: { value: 0 }, uMaxR: { value: 7 }, uExposure: { value: 1.45 },
    uBloom: { value: 1 }, uMist: { value: .5 }, uInvViewProj: { value: new THREE.Matrix4() },
  },
  vertexShader: FULLSCREEN_VERT,
  fragmentShader: postFrag,
  depthTest: false, depthWrite: false,
});
const fsMat = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>, extra: THREE.ShaderMaterialParameters = {}): THREE.ShaderMaterial =>
  new THREE.ShaderMaterial({ uniforms, vertexShader: FULLSCREEN_VERT, fragmentShader, depthTest: false, depthWrite: false, ...extra });
const blitMat = fsMat(`uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tDiffuse, vUv); }`, { tDiffuse: { value: null } });
const aoMat = fsMat(aoFrag, {
  tDepth: { value: null }, uRes: { value: new THREE.Vector2(2, 2) }, uHalf: { value: new THREE.Vector2(1, 1) },
  uNear: { value: 1 }, uFar: { value: 100 }, uRadius: { value: .7 }, uIntensity: { value: 1.1 },
});
/** Multiplies the blurred occlusion into the scene; occluded areas keep a little cold light rather than going black. */
const aoApplyMat = fsMat(`uniform sampler2D tAO; uniform vec2 uTexel; varying vec2 vUv;
void main(){
  float ao = 0.25*(texture2D(tAO, vUv+uTexel*vec2(-1.0,-1.0)).r + texture2D(tAO, vUv+uTexel*vec2(1.0,-1.0)).r + texture2D(tAO, vUv+uTexel*vec2(-1.0,1.0)).r + texture2D(tAO, vUv+uTexel*vec2(1.0,1.0)).r);
  gl_FragColor = vec4(mix(vec3(0.10, 0.11, 0.16), vec3(1.0), ao), 1.0);
}`, { tAO: { value: null }, uTexel: { value: new THREE.Vector2() } }, { blending: THREE.MultiplyBlending, transparent: true });
const brightMat = fsMat(brightFrag, { tColor: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 1 }, uKnee: { value: .5 } });
const blurMat = fsMat(blurFrag, { tColor: { value: null }, uDir: { value: new THREE.Vector2() } });

const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blitMat); quad.frustumCulled = false;
const quadScene = new THREE.Scene(); quadScene.add(quad);

/** Draws a full-screen pass with `mat` into `target` (null: the canvas). */
function pass(mat: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null): void {
  quad.material = mat;
  renderer.setRenderTarget(target);
  renderer.render(quadScene, postCam);
}

/** Look tuning, read every frame. */
export const POST = {
  /** Bloom strength, and its threshold in scene-linear units (before exposure): flames, embers, spells and glows pass it; lit stone does not. */
  bloom: .8, bloomThreshold: 2,
  /** Ambient occlusion strength and sampling radius in world units. */
  ao: 1.6, aoRadius: .9,
  /** Ground mist density; the level sets it (thicker in the dungeon than in town). */
  mist: .5,
};

interface Targets {
  /** Half-res HDR scene with depth. */
  scene: THREE.WebGLRenderTarget;
  ldr: THREE.WebGLRenderTarget;
  ao: THREE.WebGLRenderTarget;
  /** Bloom pyramid: [a, b] per level, at 1/2, 1/4 and 1/8 of the scene. */
  bloom: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget][];
  /** Unthresholded scene at 1/2 … 1/16 for the mist's light. */
  scatter: THREE.WebGLRenderTarget[];
  scatterTmp: THREE.WebGLRenderTarget;
}
let rt: Targets | null = null;

const linearRT = (w: number, h: number): THREE.WebGLRenderTarget =>
  new THREE.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });

function resize(): void {
  const w = Math.max(2, innerWidth), h = Math.max(2, innerHeight);
  renderer.setSize(w, h, false);
  const lw = Math.max(2, Math.floor(w / 2)), lh = Math.max(2, Math.floor(h / 2));
  if (rt) {
    rt.scene.depthTexture.dispose();
    for (const t of [rt.scene, rt.ldr, rt.ao, ...rt.bloom.flat(), ...rt.scatter, rt.scatterTmp]) t.dispose();
  }
  const scene = new THREE.WebGLRenderTarget(lw, lh, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
  scene.depthTexture = new THREE.DepthTexture(lw, lh);
  const div = (n: number): [number, number] => [Math.floor(lw / n), Math.floor(lh / n)];
  rt = {
    scene,
    ldr: new THREE.WebGLRenderTarget(lw, lh, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false }),
    ao: new THREE.WebGLRenderTarget(lw, lh, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false }),
    bloom: [2, 4, 8].map(n => [linearRT(...div(n)), linearRT(...div(n))]),
    scatter: [2, 4, 8, 16].map(n => linearRT(...div(n))),
    scatterTmp: linearRT(...div(16)),
  };
  const aspect = w / h;
  const halfH = aspect >= 1 ? 7.2 : (7.2 * 0.8) / Math.max(aspect, 0.45);
  camera.left = -halfH * aspect; camera.right = halfH * aspect; camera.top = halfH; camera.bottom = -halfH;
  camera.updateProjectionMatrix();
  pxU.value = lh / (2 * halfH);
  postMat.uniforms.uRes.value.set(lw, lh);
  postMat.uniforms.uMaxR.value = clamp(lh / 75, 4, 9);
  aoMat.uniforms.uRes.value.set(lw, lh);
  aoMat.uniforms.uHalf.value.set(camera.right, camera.top);
  aoMat.uniforms.uNear.value = camera.near; aoMat.uniforms.uFar.value = camera.far;
  aoApplyMat.uniforms.uTexel.value.set(1 / lw, 1 / lh);
}
addEventListener('resize', resize);
resize();

/** Gaussian-blurs `a` in place, using `b` as the intermediate. */
function blur(a: THREE.WebGLRenderTarget, b: THREE.WebGLRenderTarget): void {
  blurMat.uniforms.tColor.value = a.texture; blurMat.uniforms.uDir.value.set(1 / a.width, 0); pass(blurMat, b);
  blurMat.uniforms.tColor.value = b.texture; blurMat.uniforms.uDir.value.set(0, 1 / a.height); pass(blurMat, a);
}

function downsample(from: THREE.WebGLRenderTarget, to: THREE.WebGLRenderTarget): void {
  blitMat.uniforms.tDiffuse.value = from.texture; pass(blitMat, to);
}

/**
 * Scene → half-res HDR target → bloom and scatter pyramids (taken before occlusion, so glows stay bright) →
 * ambient occlusion multiplied in → post pass → upscale blit to the canvas.
 */
export function renderFrame(): void {
  const t = rt!, s = t.scene, u = postMat.uniforms;
  renderer.setRenderTarget(s); renderer.render(scene, camera);
  const auto = renderer.autoClear; renderer.autoClear = false;

  brightMat.uniforms.tColor.value = s.texture; brightMat.uniforms.uTexel.value.set(1 / s.width, 1 / s.height);
  brightMat.uniforms.uThreshold.value = POST.bloomThreshold; brightMat.uniforms.uKnee.value = .5;
  pass(brightMat, t.bloom[0][0]);
  t.bloom.forEach(([a, b], i) => { if (i) downsample(t.bloom[i - 1][0], a); blur(a, b); });
  brightMat.uniforms.uThreshold.value = 0; brightMat.uniforms.uKnee.value = 0;
  pass(brightMat, t.scatter[0]);
  for (let i = 1; i < t.scatter.length; i++) downsample(t.scatter[i - 1], t.scatter[i]);
  const wide = t.scatter[t.scatter.length - 1];
  blur(wide, t.scatterTmp);

  aoMat.uniforms.tDepth.value = s.depthTexture; aoMat.uniforms.uIntensity.value = POST.ao; aoMat.uniforms.uRadius.value = POST.aoRadius;
  pass(aoMat, t.ao);
  aoApplyMat.uniforms.tAO.value = t.ao.texture; pass(aoApplyMat, s);

  u.tColor.value = s.texture; u.tDepth.value = s.depthTexture;
  u.tBloom1.value = t.bloom[0][0].texture; u.tBloom2.value = t.bloom[1][0].texture; u.tBloom3.value = t.bloom[2][0].texture;
  u.tScatter.value = wide.texture; u.uBloom.value = POST.bloom; u.uMist.value = POST.mist;
  u.uInvViewProj.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert();
  pass(postMat, t.ldr);
  renderer.autoClear = auto;
  blitMat.uniforms.tDiffuse.value = t.ldr.texture; pass(blitMat, null);
}
