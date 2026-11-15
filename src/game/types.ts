import type * as THREE from 'three';
import type { FamilyId, MonsterRoll } from '../rules/monsters';
import type { BossId } from '../rules/bosses';
import type { NpcId } from './shops';
import type { NpcParts } from '../actors/models/npc';
import type { EliteMod } from '../rules/elites';
import type { CharState, Derived } from '../rules/stats';
import type { Progress } from '../rules/xp';
import type { EquipSlot, Inventory, Item } from '../rules/inventory';
import type { SpellId } from '../rules/spells';
import type { WeaponKind } from '../rules/classes';

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
  /** A bookshelf (D1 bookcase): opening it drops one book instead of gold. */
  shelf: boolean;
}
export interface Door {
  pivot: THREE.Group; axis: Axis; sign: number; open: number; locked: boolean;
  tx: number; tz: number; x: number; z: number; glow: THREE.Sprite | null; wasOpen: boolean;
}
/** `disabled`: disarmed by a Thief, for good. */
export interface SpikeTrap { disabled: boolean; kind: 'spike'; tx: number; tz: number; x: number; z: number; t: number; g: THREE.Group; hit: Set<Actor>; up: boolean }
export interface BladeTrap { disabled: boolean; kind: 'blade'; tx: number; tz: number; x: number; z: number; along: Axis; sw: THREE.Group; ph: number; w: number; ang: number; prev: number; hitT: Map<Actor, number> }
export type Trap = SpikeTrap | BladeTrap;

interface PickupBody {
  o: THREE.Object3D; x: number; z: number; y: number; vx: number; vz: number; vy: number; t: number;
  /** Borrowed warm light that follows a unique item (registered in `Level.lights`). */
  light?: LightSrc;
}
/**
 * Something lying on the floor. `discarded` items were dropped by the player: they are only picked up again with `E`,
 * never by walking over them or by AUTO.
 */
export type Pickup = PickupBody & ({ kind: 'coin'; amount: number } | { kind: 'item'; item: Item; discarded: boolean; /** Equipment slot it was worn in when the hero died (SPEC §11). */ slot?: EquipSlot });
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
  /** Live spell effects: missiles, flame jets and fire walls. */
  spellFx: SpellFx[];
  arrows: Arrow[];
  /** Death piles still on this level (SPEC §11). */
  graves: Grave[];
  /** The monster families this level draws from (SPEC §8.2). */
  families: FamilyId[];
  /** Monster projectiles: archer arrows and spider webs. */
  shots: Shot[];
  /** Ground hazards (Brood Mother poison pools). */
  hazards: Hazard[];
  /** Ember Lich teleport points (rune circles in the stairs room). */
  bossRunes: { x: number; z: number }[];
  /** The descend warning about remaining graves has been shown on this level. */
  descendWarned: boolean;
  debris: Debris[]; decals: Decal[]; lights: LightSrc[]; flames: FlameSpec[];
  pillars: { x: number; z: number }[]; runes: THREE.Mesh[]; moons: { x: number; z: number }[];
  disposeGeo: THREE.BufferGeometry[]; disposeInst: THREE.InstancedMesh[]; disposeMat: THREE.Material[];
  locked: boolean; fieldT: number; killsHere: number;
  /** `genId`s of generated monsters killed on this level (dead monsters leave `monsters` once their corpse is gone). */
  killedGen: Set<number>;
  startIdx: number;
  /** Down-stairs (in town: the depth 1 entrance). */
  stairs: { tx: number; tz: number; x: number; z: number };
  /** Ways off the level: stairs down and up, town entrances, an open Town Portal (SPEC §13). */
  exits: Exit[];
  /** The town's stash chest; null in the dungeon. */
  stash: { x: number; z: number } | null;
  /** Townsfolk (SPEC §13.2); empty in the dungeon. */
  npcs: { id: NpcId; x: number; z: number; parts: NpcParts }[];
  /** The stairs room's locked door; null in town. */
  lockedDoor: Door | null;
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
export interface BatParts extends ModelBase { wings: THREE.Group[] }
/** Eight legs, each a hip (swing) and knee joint; legs alternate in two groups of four. */
export interface SpiderParts extends ModelBase { legs: { hip: THREE.Group; knee: THREE.Group }[] }
/** Brood Mother egg sac: a pulsing blob that hatches Cave Spiders. */
export interface EggParts extends ModelBase { sac: THREE.Mesh }

export interface HeroParts {
  root: THREE.Group; body: THREE.Group; legs: THREE.Group[]; torso: THREE.Group; cloak: THREE.Group; head: THREE.Group;
  shR: THREE.Group; armR: THREE.Group; sword: THREE.Group; shL: THREE.Group; armL: THREE.Group; torch: THREE.Group;
  flameAnchor: THREE.Object3D; trail: THREE.Mesh;
  M: Record<string, THREE.MeshStandardMaterial>;
  flashMats: THREE.MeshStandardMaterial[];
}

/* ---------- actors ---------- */

/** A family (rules/monsters), a mini-boss (rules/bosses) or a Brood Mother egg sac. */
export type MonsterType = FamilyId | BossId | 'eggsac';
/** Monster types built on the humanoid skeleton rig. */
export type HumanoidType = 'skeleton' | 'zombie' | 'fallen' | 'archer' | 'warden' | 'gorger' | 'lich';
/** Monster types built on the spider rig. */
export type SpiderType = 'spider' | 'broodmother';

/** Per-boss AI state (SPEC §9). */
export type BossState = { name: string } & (
  /** `raised`: how many of the two skeleton-raising thresholds (66 %, 33 % HP) have fired. */
  | { id: 'warden'; raised: number }
  /** A charge aims (telegraph), then runs in a straight line until it hits the hero or a wall. */
  | { id: 'gorger'; chargeCd: number; charge: { phase: 'aim' | 'run'; t: number; dx: number; dz: number } | null }
  | { id: 'broodmother'; coneCd: number }
  /** `vulnT`: full damage taken while > 0 (after a teleport); `rune`: index into `Level.bossRunes`. */
  | { id: 'lich'; tpCd: number; vulnT: number; boltCd: number; summonCd: number; rune: number }
);
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
  /** Stone Curse time left; while > 0 the monster cannot act. */
  stoneT: number;
  /** Original material colours, kept while petrified. */
  stoneCols: THREE.Color[] | null;
  /** War Cry slow on bosses: 30 % slower while > 0. */
  slowT: number;
  /** Fallen: fleeing after a nearby death (s left). */
  fleeT: number;
  /** Ranged cooldown: a spider's web spit, a Spellcaster elite's cast. */
  webCd: number;
  /** A small slime split from a larger one (does not split again). */
  small: boolean;
  /** Mini-boss state; null for everything else. */
  boss: BossState | null;
  /** Spawn order in level generation (stable for a level seed, used by saves); -1 for monsters added later. */
  genId: number;
  /** Elite pack member (SPEC §8.4): the named leader or one of its escorts; null otherwise. */
  elite: EliteInfo | null;
}
export interface EliteInfo { name: string; mod: EliteMod; leader: boolean; /** Spellcaster's spell. */ spell: 'firebolt' | 'lightning' }
export type Monster = MonsterCommon & (
  | ({ type: HumanoidType } & SkeletonParts)
  | ({ type: 'rat' } & RatParts)
  | ({ type: 'slime' } & SlimeParts)
  | ({ type: 'bat' } & BatParts)
  | ({ type: SpiderType } & SpiderParts)
  | ({ type: 'eggsac' } & EggParts)
);

export type GoalKind = 'mon' | 'pick' | 'chest' | 'room' | 'door' | 'exit';
export type Goal =
  | { kind: 'mon'; ref: Monster; tx: number; tz: number }
  | { kind: 'pick'; ref: Pickup; tx: number; tz: number }
  | { kind: 'chest'; ref: Chest; tx: number; tz: number }
  | { kind: 'room'; ref: Room; tx: number; tz: number }
  | { kind: 'door'; ref: Door; tx: number; tz: number }
  | { kind: 'exit'; ref: Exit; tx: number; tz: number };

export interface Hero extends HeroParts {
  x: number; z: number; vx: number; vz: number; kx: number; kz: number;
  face: number; r: number; mass: number; rise: number;
  /** Class, level, experience and base attributes. */
  stats: HeroStats;
  /** Derived stats; refreshed only by `recompute`. */
  d: Derived;
  /** Derived stats as shown on the character screen: unidentified items' properties are hidden (D1). */
  dShown: Derived;
  /** uids of equipped items whose requirements are met. */
  gearOk: ReadonlySet<number>;
  life: number; mana: number;
  gold: number; inv: Inventory; key: boolean; slain: number;
  cd: number; atkT: number; hitDone: boolean; /** Post-hit invulnerability timer. */ invuln: number; flinch: number; flash: number; drink: number; phase: number;
  path: { x: number; z: number }[] | null; pi: number;
  goal: Goal | null; goalKey: string; goalT: number; repath: number; aiT: number;
  dead: boolean; deadT: number; descend: number;
  stuckT: number; stuck: number; sx: number; sz: number; unstickT: number; ux: number; uz: number;
  killsAtGoal: number; waitTrap: boolean;
  /** Learned spells and their level (before +spell-level items). */
  spells: Partial<Record<SpellId, number>>;
  readied: SpellId | null;
  /** Spells assigned to F5–F8. */
  hotkeys: (SpellId | null)[];
  /** Spell being cast: fires at 40 % of the class cast time. */
  cast: { spell: SpellId; slvl: number; t: number; fired: boolean; aim: number } | null;
  manaShield: boolean;
  /** Blue bubble shown while Mana Shield is up. */
  shieldFx: THREE.Sprite;
  name: string;
  /** Class skill cooldown (s). */
  skillCd: number;
  /** Weapon kind whose mesh the hero holds (the equipped weapon, usable or not). */
  heldKind: WeaponKind;
  /** The exit the hero stood on last step (null: none), and for how long (AUTO leaves 2 s after a warning). */
  onExit: Exit | null;
  stairsT: number;
  /** Spider web: 40 % slower while > 0. */
  slowT: number;
  /** Spider poison: loses 2 % of max life per second while > 0. */
  poisonT: number;
  /** Max life permanently lost to Black Death hits (D1). */
  lifeDrain: number;
}

export type Actor = Hero | Monster;

/** Leaving a level: through an exit (`travel`, to depth `to`) or by dying (to town). */
export type Transition = { t: number; built?: boolean } & ({ kind: 'travel'; exit: Exit } | { kind: 'death' });

/**
 * A way off the level. `down` and `up` are stairs; `portal` is a Town Portal. `to` is the depth it leads to (0 =
 * town). Sealed town entrances are listed with `open` false. `r` is the half-size of the square that triggers it.
 */
export interface Exit { kind: 'down' | 'up' | 'portal'; to: number; tx: number; tz: number; x: number; z: number; r: number; open: boolean; /** Portal visuals, removed when the pair closes. */ o?: THREE.Object3D }

/* ---------- spells ---------- */

interface FxBase { spell: SpellId; slvl: number; t: number; light?: LightSrc }
/** A flying spell: Firebolt, Holy Bolt, Fireball, Stone Curse bolt or a Charged Bolt spark. */
export interface Missile extends FxBase { kind: 'missile'; x: number; z: number; dx: number; dz: number; speed: number; life: number; sprite: THREE.Sprite }
/** Inferno: a flame jet in front of the hero, damaging every 0.15 s. */
export interface Jet extends FxBase { kind: 'jet'; life: number; tick: number }
/** One Fire Wall flame: burns anything standing in it every 0.5 s, the hero included. */
export interface WallFlame extends FxBase { kind: 'flame'; x: number; z: number; life: number; burnT: Map<Actor, number>; sprite: THREE.Sprite }
export type SpellFx = Missile | Jet | WallFlame;

/** A flying arrow (hero bows; monster archers later). `flight` counts seconds for the D1 distance penalty. */
export interface Arrow { x: number; z: number; dx: number; dz: number; speed: number; flight: number; mesh: THREE.Object3D; passed: Set<Monster> }

/** Where the hero died: a bone-pile marker with a beacon, and the pickups that fell there. */
export interface Grave { x: number; z: number; marker: THREE.Group; beacon: THREE.Sprite; light: LightSrc; pickups: Pickup[] }

/** A monster projectile: an archer's arrow or a spider's web. `flight` (s) feeds the arrow distance penalty. */
/** A monster projectile. The Ember Lich's firebolts home in on the hero (`homing`); an elite's fly straight. */
export interface Shot { kind: 'arrow' | 'web' | 'firebolt' | 'lightning'; from: Monster; x: number; z: number; dx: number; dz: number; speed: number; flight: number; homing: boolean; mesh: THREE.Object3D }
/** A poison pool left by the Brood Mother's leaps: poisons the hero standing in it. */
export interface Hazard { x: number; z: number; r: number; life: number; mesh: THREE.Mesh }
