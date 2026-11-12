import * as THREE from 'three';
import { PI, rr } from '../core/math';
import { glowSprite } from './geometry';
import { pxU, scene } from './renderer';

/**
 * Particle kinds: 0 plain fade, 1 bounces on the floor, 2 ember (sways, cools from white-hot),
 * 3 puff (fades in and out, grows).
 */
export type ParticleKind = 0 | 1 | 2 | 3;

/** Fixed-capacity point-sprite particle pool (swap-remove on death). */
export class PSys {
  readonly n: number;
  c = 0;
  readonly p: Float32Array; readonly v: Float32Array; readonly base: Float32Array; readonly col: Float32Array;
  readonly sz: Float32Array; readonly so: Float32Array; readonly life: Float32Array; readonly max: Float32Array;
  readonly g: Float32Array; readonly drag: Float32Array; readonly kind: Uint8Array;
  readonly geo: THREE.BufferGeometry;
  readonly pts: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly aP: THREE.BufferAttribute; private readonly aC: THREE.BufferAttribute; private readonly aS: THREE.BufferAttribute;

  constructor(n: number, blending: THREE.Blending) {
    this.n = n;
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.base = new Float32Array(n * 3); this.col = new Float32Array(n * 3);
    this.sz = new Float32Array(n); this.so = new Float32Array(n); this.life = new Float32Array(n); this.max = new Float32Array(n);
    this.g = new Float32Array(n); this.drag = new Float32Array(n); this.kind = new Uint8Array(n);
    const geo = new THREE.BufferGeometry();
    this.aP = new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage);
    this.aC = new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage);
    this.aS = new THREE.BufferAttribute(this.so, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.aP); geo.setAttribute('aCol', this.aC); geo.setAttribute('aSize', this.aS);
    geo.setDrawRange(0, 0);
    this.geo = geo;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uPx: pxU },
      vertexShader: `attribute float aSize; attribute vec3 aCol; varying vec3 vC; uniform float uPx; void main(){ vC=aCol; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_PointSize=max(1.0,aSize*uPx); }`,
      fragmentShader: `varying vec3 vC; void main(){ float d=length(gl_PointCoord-0.5); if(d>0.5) discard; gl_FragColor=vec4(vC, smoothstep(0.5,0.12,d)); }`,
      transparent: true, depthWrite: false, blending,
    });
    this.pts = new THREE.Points(geo, mat);
    this.pts.frustumCulled = false;
    scene.add(this.pts);
  }

  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, r: number, g: number, b: number, size: number, grav = 0, drag = 0, kind: ParticleKind = 0): void {
    if (this.c >= this.n) return;
    const i = this.c++, i3 = i * 3;
    this.p[i3] = x; this.p[i3 + 1] = y; this.p[i3 + 2] = z; this.v[i3] = vx; this.v[i3 + 1] = vy; this.v[i3 + 2] = vz;
    this.base[i3] = r; this.base[i3 + 1] = g; this.base[i3 + 2] = b; this.sz[i] = size; this.life[i] = life; this.max[i] = life;
    this.g[i] = grav; this.drag[i] = drag; this.kind[i] = kind;
  }

  private kill(i: number): void {
    const j = --this.c;
    if (i === j) return;
    const i3 = i * 3, j3 = j * 3;
    for (let k = 0; k < 3; k++) { this.p[i3 + k] = this.p[j3 + k]; this.v[i3 + k] = this.v[j3 + k]; this.base[i3 + k] = this.base[j3 + k]; }
    this.sz[i] = this.sz[j]; this.life[i] = this.life[j]; this.max[i] = this.max[j]; this.g[i] = this.g[j]; this.drag[i] = this.drag[j]; this.kind[i] = this.kind[j];
  }

  clear(): void { this.c = 0; }

  update(dt: number, time: number): void {
    for (let i = 0; i < this.c; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.kill(i); i--; continue; }
      const i3 = i * 3, k = this.kind[i], t = this.life[i] / this.max[i];
      this.v[i3 + 1] -= this.g[i] * dt;
      const dr = Math.max(0, 1 - this.drag[i] * dt);
      this.v[i3] *= dr; this.v[i3 + 1] *= dr; this.v[i3 + 2] *= dr;
      if (k === 2) { this.v[i3] += Math.sin(time * 3 + i) * dt * 0.6; this.v[i3 + 2] += Math.cos(time * 2.6 + i * 1.7) * dt * 0.6; }
      this.p[i3] += this.v[i3] * dt; this.p[i3 + 1] += this.v[i3 + 1] * dt; this.p[i3 + 2] += this.v[i3 + 2] * dt;
      if (k === 1 && this.p[i3 + 1] < 0.03) { this.p[i3 + 1] = 0.03; this.v[i3 + 1] *= -0.3; this.v[i3] *= 0.5; this.v[i3 + 2] *= 0.5; }
      let f;
      if (k === 2) {
        f = Math.min(1, (1 - t) * 6) * t;
        this.col[i3] = this.base[i3] * f; this.col[i3 + 1] = this.base[i3 + 1] * f * (0.35 + 0.65 * t); this.col[i3 + 2] = this.base[i3 + 2] * f * t;
      } else {
        f = k === 3 ? Math.sin(t * PI) : Math.min(1, t * 2.2);
        this.col[i3] = this.base[i3] * f; this.col[i3 + 1] = this.base[i3 + 1] * f; this.col[i3 + 2] = this.base[i3 + 2] * f;
      }
      this.so[i] = this.sz[i] * (k === 2 ? 0.5 + 0.5 * t : k === 3 ? 1 + (1 - t) * 1.5 : 1);
    }
    this.geo.setDrawRange(0, this.c);
    this.aP.needsUpdate = this.aC.needsUpdate = this.aS.needsUpdate = true;
  }
}

export const fxAdd = new PSys(2600, THREE.AdditiveBlending);
export const fxNorm = new PSys(900, THREE.NormalBlending);

/** Dust motes that only show where light hits them (coloured in `updateLights`). */
export const DUST_N = 220;
export const dust = {
  p: new Float32Array(DUST_N * 3), v: new Float32Array(DUST_N * 3), col: new Float32Array(DUST_N * 3), s: new Float32Array(DUST_N),
  aP: null as unknown as THREE.BufferAttribute, aC: null as unknown as THREE.BufferAttribute,
};
{
  const geo = new THREE.BufferGeometry();
  dust.aP = new THREE.BufferAttribute(dust.p, 3).setUsage(THREE.DynamicDrawUsage);
  dust.aC = new THREE.BufferAttribute(dust.col, 3).setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < DUST_N; i++) dust.s[i] = rr(0.03, 0.055);
  geo.setAttribute('position', dust.aP); geo.setAttribute('aCol', dust.aC); geo.setAttribute('aSize', new THREE.BufferAttribute(dust.s, 1));
  const pts = new THREE.Points(geo, fxAdd.pts.material);
  pts.frustumCulled = false;
  scene.add(pts);
}

/** Short additive flashes at hit points. */
interface Impact { s: THREE.Sprite; t: number; size: number }
export const impacts: Impact[] = [];
for (let i = 0; i < 8; i++) { const s = glowSprite(0xffe0a0, 1, scene); s.visible = false; impacts.push({ s, t: 0, size: 1 }); }
export function impact(x: number, y: number, z: number, color: THREE.ColorRepresentation, size = 1.4): void {
  const it = impacts.find(o => o.t <= 0) || impacts[0];
  it.t = 0.16; it.size = size;
  it.s.material.color.set(color);
  it.s.position.set(x, y, z);
  it.s.visible = true;
}
