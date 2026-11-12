import * as THREE from 'three';
import { GU, cutU } from './renderer';
import { TEX } from './textures';
import flameFrag from './shaders/flame.frag.glsl?raw';

function applyCut(mat: THREE.Material, factor: number): void {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uPlayer = cutU.uPlayer;
    sh.vertexShader = 'uniform vec3 uPlayer;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
{ vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
  float s = (ip.x - uPlayer.x) + (ip.z - uPlayer.z);
  float cut = smoothstep(-0.6, 1.8, s) * (1.0 - smoothstep(17.0, 23.0, length(ip.xz - uPlayer.xz)));
  transformed.y *= mix(1.0, ${factor.toFixed(3)}, cut); }
#endif`);
  };
  mat.customProgramCacheKey = () => 'cut' + factor;
}
export const MAT = {
  wallSide: new THREE.MeshStandardMaterial({ map: TEX.wall, bumpMap: TEX.wall, bumpScale: 2.2, roughness: .94 }),
  wallTop: new THREE.MeshStandardMaterial({ map: TEX.wall, color: 0x6a645c, roughness: 1 }),
  pillar: new THREE.MeshStandardMaterial({ map: TEX.wall, bumpMap: TEX.wall, bumpScale: 2, roughness: .94, color: 0xc4bcb0 }),
  floor: new THREE.MeshStandardMaterial({ map: TEX.floor, bumpMap: TEX.floor, bumpScale: 1.6, roughness: .9, vertexColors: true }),
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
  potion: new THREE.MeshStandardMaterial({ color: 0xa01828, emissive: 0x400008, roughness: .25 }),
  goo: new THREE.MeshStandardMaterial({ color: 0x2c5a1c, roughness: .2, transparent: true, opacity: .8, depthWrite: false })
};
applyCut(MAT.wallSide, .16); applyCut(MAT.wallTop, .16); applyCut(MAT.pillar, .2);
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
