import * as THREE from 'three';
import { GU, cutU, renderer } from './renderer';
import { mkC } from './canvas';
import { TEX } from './textures';
import type { PotionId } from '../rules/potions';
import flameFrag from './shaders/flame.frag.glsl?raw';

/**
 * Fades an instanced mesh out with a screen-door dither (whole pixels dropped in a pattern, like D1's see-through
 * walls) when it stands between the camera and the hero: walls, houses and trees stay recognisable while the hero
 * is behind them. `near`–`far`: the distance from the hero over which the fade dies out.
 */
/** How much of a wall in front of the hero is dropped (the rest of its pixels stay). */
export const WALL_FADE = .6;

export function applyFade(mat: THREE.Material, maxFade: number, near = 9, far = 13): void {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uPlayer = cutU.uPlayer;
    sh.vertexShader = 'uniform vec3 uPlayer;\nvarying float vFade;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
vFade = 0.0;
#ifdef USE_INSTANCING
{ vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
  float s = (ip.x - uPlayer.x) + (ip.z - uPlayer.z);
  vFade = smoothstep(-0.6, 1.8, s) * (1.0 - smoothstep(${near.toFixed(1)}, ${far.toFixed(1)}, length(ip.xz - uPlayer.xz))); }
#endif`);
    sh.fragmentShader = 'varying float vFade;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
{ vec2 c = mod(floor(gl_FragCoord.xy), 4.0);
  float b = mod(c.x * 2.0 + c.y * 3.0, 4.0) / 4.0 + mod(c.y, 2.0) * 0.125;
  if (b < vFade * ${maxFade.toFixed(3)}) discard; }`);
  };
  mat.customProgramCacheKey = () => `fade${maxFade}|${near}|${far}`;
}

/**
 * Rim light for characters: a cool edge glow where the surface turns away from the camera, scaled by the light
 * already falling on it, so figures stand out from the floor without glowing in the dark.
 */
export function rimLit<T extends THREE.MeshStandardMaterial>(mat: T): T {
  mat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `{
  float rim = 1.0 - saturate(dot(normal, geometryViewDir)); rim *= rim*rim;
  float lit = dot(reflectedLight.directDiffuse + reflectedLight.indirectDiffuse, vec3(0.3333));
  outgoingLight += vec3(0.62, 0.78, 1.0)*rim*(0.05 + lit*1.6); }
#include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'rim';
  return mat;
}

export const MAT = {
  wallSide: new THREE.MeshStandardMaterial({ map: TEX.wall, bumpMap: TEX.wall, bumpScale: 2.2, roughness: .94 }),
  wallTop: new THREE.MeshStandardMaterial({ map: TEX.wall, color: 0x6a645c, roughness: 1 }),
  pillar: new THREE.MeshStandardMaterial({ map: TEX.wall, bumpMap: TEX.wall, bumpScale: 2, roughness: .94, color: 0xc4bcb0 }),
  // caves (SPEC §12.3): rough rock walls and an earth floor
  rockSide: new THREE.MeshStandardMaterial({ map: TEX.rock, bumpMap: TEX.rock, bumpScale: 3, roughness: .97 }),
  rockTop: new THREE.MeshStandardMaterial({ map: TEX.rock, color: 0x5a544c, roughness: 1 }),
  earth: new THREE.MeshStandardMaterial({ map: TEX.earth, bumpMap: TEX.earth, bumpScale: 1.8, roughness: 1, vertexColors: true }),
  // damp patches (roughness map) catch the torchlight
  floor: new THREE.MeshStandardMaterial({ map: TEX.floor, bumpMap: TEX.floor, bumpScale: 1.6, roughness: 1, roughnessMap: TEX.floorRough, metalness: .05, vertexColors: true }),
  stone: new THREE.MeshStandardMaterial({ map: TEX.wall, bumpMap: TEX.wall, bumpScale: 1.5, roughness: .95, color: 0xaaa296 }),
  wood: new THREE.MeshStandardMaterial({ map: TEX.wood, bumpMap: TEX.wood, bumpScale: 1, roughness: .85 }),
  iron: new THREE.MeshStandardMaterial({ color: 0x45454c, roughness: .5, metalness: .55 }),
  rust: new THREE.MeshStandardMaterial({ color: 0x5c3a26, roughness: .8, metalness: .3 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x8c9098, roughness: .35, metalness: .7 }),
  bone: new THREE.MeshStandardMaterial({ color: 0xc4b898, roughness: .85 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd8a040, roughness: .35, metalness: .8, emissive: 0x2a1600 }),
  web: new THREE.MeshStandardMaterial({ map: TEX.web, transparent: true, opacity: .5, depthWrite: false, side: THREE.DoubleSide, roughness: 1 }),
  banner: new THREE.MeshStandardMaterial({ map: TEX.banner, side: THREE.DoubleSide, alphaTest: .5, roughness: 1 }),
  coal: new THREE.MeshStandardMaterial({ color: 0x1a0600, emissive: 0xff4a10, emissiveIntensity: 1.4, roughness: 1 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x040404, roughness: 1 }),
  puddle: new THREE.MeshStandardMaterial({ color: 0x1c232c, roughness: .07, metalness: .5, transparent: true, opacity: .62, depthWrite: false }),
  goo: new THREE.MeshStandardMaterial({ color: 0x2c5a1c, roughness: .2, transparent: true, opacity: .8, depthWrite: false }),
  blood: new THREE.MeshStandardMaterial({ color: 0x3a0606, roughness: .15, metalness: .3, transparent: true, opacity: .85, depthWrite: false }),
  flesh: new THREE.MeshStandardMaterial({ color: 0x7a4a40, roughness: .8 }),
  // the town (SPEC §13)
  grass: new THREE.MeshStandardMaterial({ map: TEX.grass, bumpMap: TEX.grass, bumpScale: .8, roughness: 1, vertexColors: true }),
  tuft: new THREE.MeshStandardMaterial({ color: 0x6a9a4a, emissive: 0x070d05, roughness: 1, flatShading: true }),
};
/** Ground-potion glass per type: red healing, blue mana, purple rejuvenation. */
const potionGlass = (color: number, emissive: number) => new THREE.MeshStandardMaterial({ color, emissive, roughness: .25 });
const RED = potionGlass(0xa01828, 0x400008), BLUE = potionGlass(0x2040c0, 0x081040), PURPLE = potionGlass(0x8a30b0, 0x2a0840);
export const POTION_MAT: Record<PotionId, THREE.Material> = { heal: RED, fullHeal: RED, mana: BLUE, fullMana: BLUE, rejuv: PURPLE, fullRejuv: PURPLE };
// walls and pillars between the camera and the hero turn see-through (SPEC §10.6)
for (const m of [MAT.wallSide, MAT.wallTop, MAT.pillar, MAT.rockSide, MAT.rockTop]) applyFade(m, WALL_FADE, 17, 23);
// wall textures follow world position, so brick courses and rock strata run on across blocks (SPEC §10.6)
for (const m of [MAT.wallSide, MAT.wallTop, MAT.rockSide, MAT.rockTop]) worldUV(m);

/**
 * Maps an instanced block material's textures from world position instead of per face: sides by the horizontal
 * axis they run along (one texture per 2 m) and height (one per 3 m), tops by x and z. Adds to the material's
 * existing shader changes (the see-through fade).
 */
function worldUV(mat: THREE.Material): void {
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey();
  mat.onBeforeCompile = (sh, r) => {
    prev.call(mat, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
#ifdef USE_INSTANCING
{ vec4 wq = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vec3 wn = abs(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vec2 wuv = wn.y > max(wn.x, wn.z) ? wq.xz / 2.0 : vec2(wn.x > wn.z ? wq.z : wq.x, wq.y * 2.0 / 3.0) / 2.0;
  #ifdef USE_MAP
  vMapUv = wuv;
  #endif
  #ifdef USE_BUMPMAP
  vBumpMapUv = wuv;
  #endif
}
#endif`);
  };
  mat.customProgramCacheKey = () => prevKey + '|worldUV';
}
// houses and trees are instanced: they fade (dithered) when the hero walks behind them
MAT.banner.onBeforeCompile = sh => {
  sh.uniforms.uTime = GU.uTime;
  sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  { float sw = 1.0 - uv.y; transformed += objectNormal * sin(uTime*1.7 + position.x*1.3 + position.z*1.1) * 0.08 * sw * sw; }`);
};
export const flameMat = new THREE.ShaderMaterial({
  uniforms: { uTime: GU.uTime },
  vertexShader: `attribute float aSeed; attribute float aScale; varying vec2 vUv; varying float vSeed;
    void main(){ vUv=uv; vSeed=aSeed; vec4 c = modelMatrix * instanceMatrix * vec4(0.0,0.0,0.0,1.0); vec4 mv = viewMatrix * c; mv.xy += position.xy*aScale; mv.z += 0.3; gl_Position = projectionMatrix*mv; }`,
  fragmentShader: flameFrag,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
});
export const beamMat = new THREE.ShaderMaterial({
  uniforms: { uTime: GU.uTime },
  vertexShader: `varying vec2 vUv; varying float vH; void main(){ vUv=uv; vH=position.y/7.0+0.5; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform float uTime; varying vec2 vUv; varying float vH; void main(){ float e=smoothstep(0.0,0.4,vUv.x)*smoothstep(1.0,0.6,vUv.x); float v=smoothstep(0.0,0.12,vH)*pow(1.0-vH,1.3); gl_FragColor=vec4(vec3(0.42,0.58,1.0)*e*v*0.28*(0.85+0.15*sin(uTime*0.6)),1.0); }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
});
export const runeMat = new THREE.MeshBasicMaterial({ map: TEX.rune, color: 0x3a7cff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
export const grateMat = new THREE.MeshBasicMaterial({ map: TEX.grate, color: 0x6a88c8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
export const trailMat = new THREE.ShaderMaterial({
  uniforms: { uA: { value: 0 }, uCur: { value: 0 } },
  vertexShader: `varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform float uA, uCur; varying vec2 vP; void main(){ float a=atan(vP.y,vP.x); float d=mod(uCur-a+3.14159265,6.2831853)-3.14159265; float k=(d>=0.0&&d<1.5)?pow(1.0-d/1.5,1.6):0.0; float r=length(vP); float rad=smoothstep(0.35,0.9,r)*smoothstep(1.45,1.2,r); gl_FragColor=vec4(vec3(1.0,0.85,0.6)*k*rad*uA*1.6,1.0); }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
});

let envTex: THREE.Texture | null = null;
/**
 * A small prefiltered environment for character metals: dark stone all round, a band of warm torchlight at eye
 * height with a few hot spots, a faint cold sky above. Built on first use.
 */
export function pmrem(): THREE.Texture {
  if (envTex) return envTex;
  const W = 128, H = 64, c = mkC(W, H), g = c.getContext('2d')!;
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#1c2433'); sky.addColorStop(.38, '#2a2420'); sky.addColorStop(.5, '#7a4422'); sky.addColorStop(.62, '#1e140e'); sky.addColorStop(1, '#0a0705');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  for (const [x, y, r, a] of [[14, 28, 9, .9], [52, 30, 7, .7], [88, 27, 10, 1], [116, 31, 6, .6]]) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(255,190,110,${a})`); gr.addColorStop(1, 'rgba(255,140,60,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
  const gen = new THREE.PMREMGenerator(renderer);
  envTex = gen.fromEquirectangular(t).texture;
  gen.dispose(); t.dispose();
  return envTex;
}
