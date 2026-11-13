import type * as THREE from 'three';
import type { MonsterRoll } from '../rules/monsters';
import type { CharState, Derived } from '../rules/stats';
import type { Progress } from '../rules/xp';
import type { Inventory, Item } from '../rules/inventory';

export type HeroStats = CharState & Progress;

/**
 * Tile codes in `Level.tiles`:
 * 0 wall, 1 room floor, 2 corridor, 3 open door, 4 locked door, 5 bars, 6 stairs.
 */
export type Tile = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Axis = 'x' | 'z';

export interface Room { x: number; y: number; w: number; h: number; cx: number; cy: number; id: number; visited: boolean }

export interface Layout {
  W: number; H: number; N: number;
  tiles: Uint8Array; roomId: Int16Array; rooms: Room[];
  startRoom: Room; stairsRoom: Room;
  lockedCell: { tx: number; tz: number; axis: Axis };
}

export interface LightSrc { x: number; y: number; z: number; base: number; cold: boolean; seed: number; pulse?: boolean; steady?: boolean; /** Squared distance to the hero, refreshed each frame for light assignment. */ d: number }
export interface FlameSpec { x: number; y: number; z: number; s: number; seed: number }
export interface PropBlock { x: number; z: number; r: number }

export interface Chest {
  g: THREE.Group; lid: THREE.Group; glow: THREE.Sprite | null;
  open: boolean; t: number; x: number; z: number; isKey: boolean; gold: number; /** Rolled at creation: the chest also holds an item. */ hasItem: boolean;
}
export interface Door {
  pivot: THREE.Group; axis: Axis; sign: number; open: number; locked: boolean;
  tx: number; tz: number; x: number; z: number; glow: THREE.Sprite | null; wasOpen: boolean;
}
export interface SpikeTrap { kind: 'spike'; tx: number; tz: number; x: number; z: number; t: number; g: THREE.Group; hit: Set<Actor>; up: boolean }
export interface BladeTrap { kind: 'blade'; tx: number; tz: number; x: number; z: number; along: Axis; sw: THREE.Group; ph: number; w: number; ang: number; prev: number; hitT: Map<Actor, number> }
export type Trap = SpikeTrap | BladeTrap;

interface PickupBody { o: THREE.Object3D; x: number; z: number; y: number; vx: number; vz: number; vy: number; t: number }
/**
 * Something lying on the floor. `discarded` items were dropped by the player: they are only picked up again with `E`,
 * never by walking over them or by AUTO.
 */
export type Pickup = PickupBody & ({ kind: 'coin'; amount: number } | { kind: 'item'; item: Item; discarded: boolean });
export interface Debris { o: THREE.Mesh; vx: number; vy: number; vz: number; sx: number; sz: number; t: number; life: number; rest: boolean }
export interface Decal { o: THREE.Mesh; t: number }

export interface Level extends Layout {
  depth: number;
  group: THREE.Group;
  navBlock: Uint8Array;
  trap: Int16Array;
  propAt: (PropBlock | null)[];
  dist: Float64Array;
  traps: Trap[]; doors: Door[]; chests: Chest[]; monsters: Monster[]; pickups: Pickup[];
  debris: Debris[]; decals: Decal[]; lights: LightSrc[]; flames: FlameSpec[];
  pillars: { x: number; z: number }[]; runes: THREE.Mesh[]; moons: { x: number; z: number }[];
  disposeGeo: THREE.BufferGeometry[]; disposeInst: THREE.InstancedMesh[]; disposeMat: THREE.Material[];
  locked: boolean; fieldT: number; quietT: number; killsHere: number;
  startIdx: number;
  stairs: { tx: number; tz: number; x: number; z: number };
  lockedDoor: Door;
  flameMesh: THREE.InstancedMesh | null;
}

/* ---------- models ---------- */

interface ModelBase {
  root: THREE.Group; body: THREE.Group;
  eyes: THREE.Sprite[];
  mats: THREE.Material[];
  flashMats: THREE.MeshStandardMaterial[];
}
export interface SkeletonParts extends ModelBase {
  legs: { hip: THREE.Group; knee: THREE.Group }[];
  torso: THREE.Group; head: THREE.Group; jaw: THREE.Mesh;
  armR: THREE.Group; elR: THREE.Group; armL: THREE.Group; weapon: THREE.Group;
}
export interface RatParts extends ModelBase { head: THREE.Group; legs: THREE.Group[]; tail: THREE.Group[] }
export interface SlimeParts extends ModelBase { blob: THREE.Mesh }

export interface HeroParts {
  root: THREE.Group; body: THREE.Group; legs: THREE.Group[]; torso: THREE.Group; cloak: THREE.Group; head: THREE.Group;
  shR: THREE.Group; armR: THREE.Group; sword: THREE.Group; shL: THREE.Group; armL: THREE.Group; torch: THREE.Group;
  flameAnchor: THREE.Object3D; trail: THREE.Mesh;
  M: Record<string, THREE.MeshStandardMaterial>;
  flashMats: THREE.MeshStandardMaterial[];
}

/* ---------- actors ---------- */

export type MonsterType = 'skeleton' | 'rat' | 'slime' | 'boss';
export type MonsterState = 'idle' | 'chase' | 'windup' | 'recover' | 'stun';
/** Movement and attack timing per monster type; combat numbers come from `rules/monsters` (`roll`). */
export interface MonsterBody { r: number; speed: number; reach: number; windup: number; cd: number; mass: number }

export interface MonsterCommon {
  st: MonsterBody;
  roll: MonsterRoll;
  x: number; z: number; kx: number; kz: number; vx: number; vz: number;
  face: number; r: number; mass: number; speed: number;
  hp: number; maxHp: number;
  state: MonsterState; t: number; cd: number; lunge: number;
  aware: boolean; home: { x: number; z: number };
  wt: number; wx: number; wz: number;
  flash: number; phase: number; rise: number;
  dead: boolean; deadT: number; remove: boolean; eyeBoost: number; ignoreT: number;
  /** Boss stagger cooldown (bosses stagger at most once per 3 s). */
  staggerT: number;
}
export type Monster = MonsterCommon & (
  | ({ type: 'skeleton' | 'boss' } & SkeletonParts)
  | ({ type: 'rat' } & RatParts)
  | ({ type: 'slime' } & SlimeParts)
);

export type GoalKind = 'mon' | 'pick' | 'chest' | 'room' | 'door' | 'stairs';
export type Goal =
  | { kind: 'mon'; ref: Monster; tx: number; tz: number }
  | { kind: 'pick'; ref: Pickup; tx: number; tz: number }
  | { kind: 'chest'; ref: Chest; tx: number; tz: number }
  | { kind: 'room'; ref: Room; tx: number; tz: number }
  | { kind: 'door'; ref: Door; tx: number; tz: number }
  | { kind: 'stairs'; ref: null; tx: number; tz: number };

export interface Hero extends HeroParts {
  x: number; z: number; vx: number; vz: number; kx: number; kz: number;
  face: number; r: number; mass: number; rise: number;
  /** Class, level, experience and base attributes. */
  stats: HeroStats;
  /** Derived stats; refreshed only by `recompute`. */
  d: Derived;
  life: number; mana: number;
  gold: number; inv: Inventory; key: boolean; slain: number;
  cd: number; atkT: number; hitDone: boolean; /** Post-hit invulnerability timer. */ invuln: number; flinch: number; flash: number; drink: number; phase: number;
  path: { x: number; z: number }[] | null; pi: number;
  goal: Goal | null; goalKey: string; goalT: number; repath: number; aiT: number;
  dead: boolean; deadT: number; descend: number;
  stuckT: number; stuck: number; sx: number; sz: number; unstickT: number; ux: number; uz: number;
  killsAtGoal: number; waitTrap: boolean;
}

export type Actor = Hero | Monster;

export interface Transition { t: number; kind: 'descend' | 'death'; built?: boolean }
