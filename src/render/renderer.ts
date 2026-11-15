import * as THREE from 'three';

export const canvas = document.getElementById('c') as HTMLCanvasElement;
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
export const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 1, 110);
export const CAM_OFF = new THREE.Vector3(18, 22, 18);

/** Shared uniforms. */
export const GU = { uTime: { value: 0 } };
/** Pixels per world unit in the low-res target (point-sprite sizing). */
export const pxU = { value: 30 };
/** Hero position, used by the wall-cut shader. */
export const cutU = { uPlayer: { value: new THREE.Vector3() } };

export const ambient = new THREE.AmbientLight(0x56688a, 2.2);
/** The cold key light: moonlight in town, a faint light from above in the dungeon. It casts shadows in both. */
const coldKey = new THREE.DirectionalLight(0x7a92c8, 1.5);
const KEY_DIR = new THREE.Vector3(-5, 10, 2).normalize();
/** Half-size of the area around the camera target covered by the key light's shadow map. */
const KEY_SPAN = 24, KEY_MAP = 2048;
coldKey.castShadow = true;
coldKey.shadow.mapSize.set(KEY_MAP, KEY_MAP);
coldKey.shadow.camera.left = coldKey.shadow.camera.bottom = -KEY_SPAN;
coldKey.shadow.camera.right = coldKey.shadow.camera.top = KEY_SPAN;
coldKey.shadow.camera.near = 1; coldKey.shadow.camera.far = 120;
coldKey.shadow.bias = -0.0015; coldKey.shadow.normalBias = .04;
scene.add(ambient, coldKey, coldKey.target);

const _right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), KEY_DIR).normalize();
const _up = new THREE.Vector3().crossVectors(KEY_DIR, _right).normalize();
/**
 * Keeps the key light's shadow map centred on (x, z). The centre moves in whole shadow texels along the light's own
 * axes, so shadow edges do not crawl as the camera follows the hero.
 */
export function aimKeyLight(x: number, z: number): void {
  const texel = (2 * KEY_SPAN) / KEY_MAP, t = coldKey.target.position.set(x, 0, z);
  const r = Math.round(t.dot(_right) / texel) * texel, u = Math.round(t.dot(_up) / texel) * texel, d = t.dot(KEY_DIR);
  t.set(0, 0, 0).addScaledVector(_right, r).addScaledVector(_up, u).addScaledVector(KEY_DIR, d);
  coldKey.position.copy(t).addScaledVector(KEY_DIR, 60);
  coldKey.target.updateMatrixWorld();
}

/** Outdoors (the town): a stronger, bluer moon and a night-sky background; indoors: the dungeon's cold key. */
export function setOutdoor(on: boolean): void {
  coldKey.intensity = on ? 3.4 : 1.5;
  coldKey.color.setHex(on ? 0x8aa4e0 : 0x7a92c8);
  ambient.color.setHex(on ? 0x5a6c98 : 0x56688a);
  (scene.background as THREE.Color).setHex(on ? 0x0a1020 : 0x05060a);
}

export const torchLight = new THREE.PointLight(0xff9440, 30, 21, 1.45);
torchLight.castShadow = true;
torchLight.shadow.mapSize.set(1024, 1024);
torchLight.shadow.camera.near = 0.08;
torchLight.shadow.camera.far = 21;
torchLight.shadow.bias = -0.004;
scene.add(torchLight);

export const heroFill = new THREE.PointLight(0xffa060, 2.2, 3.2, 2);
scene.add(heroFill);

/** Pooled point lights assigned each frame to the nearest warm/cold sources. */
export const warmPool: THREE.PointLight[] = [];
export const coldPool: THREE.PointLight[] = [];
/** The nearest `WARM_SHADOWS` warm sources cast shadows; their maps refresh in turn, one per frame. */
export const WARM_SHADOWS = 3;
for (let i = 0; i < 8; i++) {
  const l = new THREE.PointLight(0xff8236, 0, 9.5, 1.5);
  if (i < WARM_SHADOWS) {
    l.castShadow = true;
    l.shadow.mapSize.set(512, 512);
    l.shadow.camera.near = .12; l.shadow.camera.far = 9.5;
    l.shadow.bias = -0.006;
    l.shadow.autoUpdate = false;
  }
  scene.add(l); warmPool.push(l);
}
for (let i = 0; i < 2; i++) { const l = new THREE.PointLight(0x6a92ff, 0, 10, 1.5); scene.add(l); coldPool.push(l); }
