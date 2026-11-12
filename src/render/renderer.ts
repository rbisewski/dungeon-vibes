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
const coldKey = new THREE.DirectionalLight(0x7a92c8, 1.5);
coldKey.position.set(-5, 10, 2);
scene.add(ambient, coldKey);

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
for (let i = 0; i < 8; i++) { const l = new THREE.PointLight(0xff8236, 0, 9.5, 1.5); scene.add(l); warmPool.push(l); }
for (let i = 0; i < 2; i++) { const l = new THREE.PointLight(0x6a92ff, 0, 10, 1.5); scene.add(l); coldPool.push(l); }
