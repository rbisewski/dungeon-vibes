# Dungeon Vibes — Diablo-Style Progression Spec

Status: draft v5. All questions (Q1–Q9) are answered and folded in (see §16). The single-file constraint is lifted (§2.1). **Implemented:** Phases 0–12.

This spec layers a Diablo 1 (D1) style character, spell, and loot system onto the existing game. The game is first ported from the single `index.html` to a TypeScript project (§2.1). It keeps the game's look, controls, and AUTO mode.

How rules are sourced:
- **No tag:** the rule comes from D1 sources (§17).
- **[OURS]:** D1 has no such rule, or our game differs in shape, so the rule is our own design.
- **[USER]:** a decision made by the project owner.

**Naming [USER]:** D1's *Magic* attribute is called **Intelligence (Int)** everywhere in this spec and in the game.

---

## 1. Research summary: Diablo 1 rules we adopt

Unless noted, numbers are D1 v1.09 single-player values from Jarulf's Guide.

### 1.1 Attributes and derived stats

| D1 class → ours [USER] | Str | Int (D1 Mag) | Dex | Vit | Life | Mana | Per level | Caps (Str/Int/Dex/Vit) |
|---|---|---|---|---|---|---|---|---|
| Warrior → **Warrior** | 30 | 10 | 20 | 25 | 70 | 10 | +2 life, +1 mana | 250 / 50 / 60 / 100 |
| Rogue → **Thief** | 20 | 15 | 30 | 20 | 45 | 22 | +2 life, +2 mana | 55 / 70 / 250 / 80 |
| Sorcerer → **Mage** | 15 | 35 | 15 | 20 | 30 | 70 | +1 life, +2 mana | 45 / 250 / 85 / 80 |

**Levels and caps**
- Each level grants **5 attribute points**. Max level is 50.
- Base attributes are capped per class (table above).
- A capped attribute is drawn in gold.

**Level-up**
- Life and mana are fully restored.
- A level-up badge appears (since the UI rework, §10.8, on the control bar's CHAR button). Points are spent on the character screen.

**Formulas**

| Derived stat | Formula |
|---|---|
| Life | Warrior: `2·Vit_base + 2·Vit_items + 2·clvl + Life_items + 18`<br>Thief: `Vit_base + 1.5·Vit_items + 2·clvl + Life_items + 23`<br>Mage: `Vit_base + Vit_items + clvl + Life_items + 9` |
| Mana | Warrior: `Int_base + Int_items + clvl + Mana_items − 1`<br>Thief: `Int_base + 1.5·Int_items + 2·clvl + Mana_items + 5`<br>Mage: `2·Int_base + 2·Int_items + 2·clvl + Mana_items − 2` |
| Armor Class (AC) | `Dex/5 + AC_items` |
| Player melee to-hit % | `50 + Dex/2 + ToHit_items + clvl + classMelee − AC_monster`, clamped 5–95 |
| Player arrow to-hit % | `50 + Dex + ToHit_items + clvl + classArrow − AC_monster − distance²/2`, clamped 5–95. Distance is flight time in 1/20 s ticks. |
| Player magic to-hit % | `50 + Int − 2·mlvl + classMagic`, clamped 5–95. Monster AC is not subtracted. |
| Character damage, melee | Warrior `Str·clvl/100`<br>Thief `(Str+Dex)·clvl/200`<br>Mage `Str·clvl/100` |
| Character damage, bow | Warrior `Str·clvl/200`<br>Thief `(Str+Dex)·clvl/200`<br>Mage `Str·clvl/200` |
| Total damage | `weapon roll · (1 + %dmg_items) + flat_dmg_items + character damage` |
| Critical hit (melee) | **Warrior only.** Chance `clvl`%. Double damage. |
| Monster to-hit % | `30 + ToHit_monster + 2·(mlvl − clvl) − Dex/5 − AC_items`, minimum 15 |
| Block % | `Dex + 2·clvl + classBlock − 2·mlvl`, clamped 0–100. Needs a shield, and the hero must be standing or attacking. |

Notes on the formulas:
- In the monster to-hit formula, AC counts in full. Some secondary sites wrongly say `AC/5`.
- **Hit recovery:** a monster only goes into hit recovery when a single hit deals at least `mlvl + 3` damage.

### 1.1a Class differences (D1 Warrior / Rogue / Sorcerer)

| Property | Warrior | Thief (Rogue) | Mage (Sorcerer) |
|---|---|---|---|
| Hidden to-hit bonus: melee / arrow / magic | 20 / 10 / 0 | 0 / 20 / 0 | 0 / 0 / 20 |
| Block bonus | 30 | 20 | 10 |
| Healing potion bonus / Mana potion bonus | 2.0 / 1.0 | 1.5 / 1.5 | 1.0 / 2.0 |
| Healing spell bonus | 2.0 | 1.5 | 1.0 |
| Spell mana cost | 100 % | 75 % | 100 % |
| Swing time (s), sword/club | 0.45 | 0.50 | 0.60 |
| Swing time (s), axe | 0.50 | 0.65 | 0.80 |
| Swing time (s), staff | 0.55 | 0.55 | 0.60 |
| Swing time (s), bow | 0.55 | **0.35** | 0.80 |
| Cast time (s) | 0.70 | 0.60 | **0.40** |
| Hit recovery (s) | 0.30 | 0.35 | 0.40 |
| Arrow speed | `32 + (clvl−1)/8` | `32 + (clvl−1)/4` | `32` |
| Class skill | Repair items | Disarm traps: success if `2·Dex − 5·dlvl > Rnd[100]` | Recharge staves |
| Starting kit | Short Sword, Buckler, Club, 2 Healing, 100 gold | Short Bow, 2 Healing, 100 gold | Short Staff of Charged Bolt (40 charges), 2 Mana, 100 gold |

### 1.2 Experience

- XP per kill is `base_xp · (1 + 0.1·(mlvl − clvl))`.
- A kill gives no XP once `clvl ≥ mlvl + 10`.
- Single player has no per-kill XP cap.

Experience needed per level:

| clvl | XP | clvl | XP | clvl | XP |
|---|---|---|---|---|---|
| 2 | 2 000 | 9 | 47 622 | 16 | 313 656 |
| 3 | 4 620 | 10 | 63 364 | 17 | 424 067 |
| 4 | 8 040 | 11 | 83 419 | 18 | 571 190 |
| 5 | 12 489 | 12 | 108 879 | 19 | 766 569 |
| 6 | 18 258 | 13 | 141 086 | 20 | 1 025 154 |
| 7 | 25 712 | 14 | 181 683 | … | full table to 50 in Jarulf §2.6 |
| 8 | 35 309 | 15 | 231 075 | 50 | 1 310 707 109 |

### 1.3 Items

**Equipment and storage**
- **Equipment slots:** head, torso, right hand (weapon), left hand, amulet, and two rings (one per hand).
  - The left hand holds a shield. A two-handed weapon greys it out.
- **Backpack:** a 10×4 grid. Items have different footprints, so the backpack may need rearranging.
- **Belt:** 8 slots that hold potions and scrolls. Keys `1`–`8` use them.
  - A small usable item that is picked up goes onto the belt automatically if there is room.

**Quality and requirements**
- **Quality:** normal (white), magic (blue; one prefix and/or one suffix), unique (gold name; up to 6 properties).
- Rings and amulets are always magic or unique.
- **Requirements:** items need a minimum Str, Dex, or Int. Items the hero cannot use are shown in red.

**Identification**
- Magic and unique items drop unidentified.
- Their quality colour is visible, but their properties stay hidden until identified.
- The D1 manual says the Character Information screen does not include effects from unidentified items.
- D1 identifies items via Cain, Scrolls of Identify (qlvl 1), or Staves. Identify is never a book in D1.

**Drops from a normal monster**

| Outcome | Chance |
|---|---|
| Gold | 30.3 % |
| Item | 10.7 % |
| Nothing | 59 % |

**Drop rules**
- Winged Fiends never drop items.
- Unique monsters always drop an item. It is 100 % magic and has a 16 % unique chance.
- Bookcases always drop a book.

**Generation steps**
1. Choose a base uniformly among bases with `qlvl ≤ ilvl`, where `ilvl = mlvl`. Books and scrolls are base items in this pool.
2. Roll magic at `(11 + 0.89·(ilvl + 1)) %`.
3. If magic, roll unique at 2 %.
4. Choose affixes with `qlvl ≤ ilvl`.

**Potions**

| Potion | Effect |
|---|---|
| Healing | Restores `bonus·maxLife/8 … bonus·3·maxLife/8`, instantly. Warrior bonus is 2.0, so 25–75 % of max life. |
| Full Healing | Restores 100 % of life. |
| Mana / Full Mana | Same rules for mana. Warrior bonus is 1.0. |
| Rejuvenation | Counts as one healing potion plus one mana potion. |
| Elixir | +1 permanently to Str, Int, Dex, or Vit. |

### 1.4 Spells, books, scrolls

**Learning from books**
- Reading a *Book of X* teaches spell X at slvl 1, or raises the known slvl by 1. The maximum is slvl 15.
- To read it, Int must be at least the requirement for the next slvl. That requirement is the slvl-1 value × 1.2 per extra slvl, and is set to 255 once it reaches 213.
- Reading consumes the book.
- Reading also restores mana equal to the spell's initial mana cost.

**Casting**
- Casting costs mana. The initial cost drops each slvl until it reaches a minimum.
- Scrolls cast the spell once at the known slvl, or at slvl 1 if the spell isn't known.
  - Scrolls cost **no mana**.
  - They still need some Int ("a bit less" than the book).
- **Spell damage scales with clvl and slvl.** Int raises mana and gates learning. The exceptions are Firebolt and Charged Bolt, whose damage also adds Int.

**D1 spell data**

| Spell | Learn Int (slvl 1) | Mana (initial, −/slvl) | Book qlvl | Scroll qlvl | Effect |
|---|---|---|---|---|---|
| Firebolt | 15 | 6, −0.5 | 1 | — | Fire bolt, `Rnd[10] + slvl + Int/8 + 1` |
| Charged Bolt | 25 | 6, −0 | 1 | — | `4 + slvl/2` erratic sparks, each `1 … 1 + Int/4` |
| Healing | 17 | `8 + 2·clvl − 3·slvl` | 1 | 1 | Heals `2.0·(Rnd[10] + Σclvl Rnd[4]+1 + Σslvl Rnd[6]+1 + 1)` for a Warrior |
| Holy Bolt | 20 | 7, −1 | 1 | — | `9 + clvl … 18 + clvl`. Hits **undead only**. |
| Inferno | 20 | 11, −1 | 3 | 1 | Short flame jet, range 3 |
| Lightning | 20 | 10, −1 | 4 | 4 | Bolt `4 … 4 + 2·clvl`. Hits repeatedly along its line. |
| Fire Wall | 27 | 28, −2 | 3 | 4 | Wall of 11 flames. Lasts `8 + 8·slvl` s. **Can burn the caster.** |
| Flash | 33 | 30, −2 | 5 | 6 | Ring of magic damage around the caster |
| Telekinesis | 33 | 15, −2 | 2 | — | Picks up items and opens chests at range. Knocks monsters back. |
| Phasing | 39 | 12, −2 | 7 | 6 | Random short-range teleport |
| Mana Shield | 25 | 33, −0 | 6 | 8 | Damage is taken from mana instead, reduced by 33 %. Ends at 0 mana or on leaving the level. |
| Stone Curse | 51 | 60, −3 | 6 | 6 | Petrifies a monster for `4.8 + 0.8·slvl` s (max 12) |
| Fireball | 48 | 16, −1 | 8 | 8 | `Rec(slvl, 2·(Rnd[10]+Rnd[10]+clvl)+4)`, with splash |
| Chain Lightning | 54 | 30, −1 | 8 | 10 | Lightning bolt plus one extra bolt per monster in range `2 + slvl` |
| Identify | — | — | — (scroll only in D1) | 1 | Identifies one item |
| Town Portal | 20 | 35, −3 | 3 | 4 | Portal to town |
| Nova | 87 | 60, −3 | — (scroll/staff only in D1) | 14 | Ring of lightning around the caster |

Notes on the table:
- `Rec(slvl, x)` multiplies `x` by 9/8 once per slvl.
- The D1 spellbook UI has 4 pages of spells, opened with `B`.
- One spell is "readied" and cast with right-click. F5–F8 hotkeys can ready a spell.
- The readied spell's icon sits at the bottom right of the screen.

### 1.5 Monsters and bosses

**Levels and families**
- D1 has 16 dungeon levels in 4 themes: Church 1–4, Catacombs 5–8, Caves 9–12, Hell 13–16.
- Each monster family has 4 recoloured subtypes of increasing level. For example, Zombie → Ghoul → Rotting Carcass → Black Death.
- Each level selects only a few families, limited by a size budget of 4000.

**Special behaviours**
- Fallen Ones flee briefly whenever a monster near them dies.
- Hidden are invisible until close.
- Giant spiders only exist in Hellfire: Arachnon and Spider Lord. Spider Lords spit magic.
- Undead are the Zombie, Skeleton, and Skeleton Captain/Archer families, plus the Skeleton King. This matters for Holy Bolt.

**Bosses and uniques**
- Fixed bosses: The Butcher on dlvl 2; the Skeleton King on dlvl 3, who raises dead skeletons in single player; and Diablo on dlvl 16.
- Named unique monsters come with a mob, have special attacks, and always drop magic loot.

### 1.6 D1 features out of scope for now

| Feature | Status |
|---|---|
| Town, merchants, Cain, Wirt | Out now. **Town is planned later [USER]**; see §13. |
| Durability and repair | Out. The Warrior gets War Cry instead of Repair (§3.1a). |
| Staff spell charges | Out. Staves are plain weapons. The Mage gets Mana Surge instead of Recharge (§3.1a). |
| Shared stash | D1 has none. Ours is a [USER] addition in town (§13.1). |
| Resistances | Out until spells are in. Then fire, lightning, and magic resists become relevant for monster spells; see §8.5. |
| Multiplayer | Out |
| Nightmare and Hell difficulties | Out |

---

## 2. Current game baseline (legacy `index.html`, ~1800 lines, single ES module)

Line numbers (`L1234`) in this spec refer to the legacy `index.html`. Phase 0 (§15) commits that file to git before porting, so the references stay resolvable.

| Area | Today | Hook point |
|---|---|---|
| Hero | `hp:10`, hearts at 2 HP each, `potions` count, `key`, `gold`, `slain` (L1735) | Replaced by the stat model (§3) |
| Combat | `heroHitCheck` (L1303) deals 1 dmg, 12 % chance of 2. Monsters deal `st.dmg` 1–3 (L1507). Hero `inv` is 0.5 s. | Replaced by the formulas in §3.3 |
| Monsters | `MON` table (L1120): rat, skeleton, slime, boss. Slow depth HP scaling (L1129). `monsterTypeFor` (L1136). | Becomes the family table (§8) |
| Boss | Bone Warden at `depth % 3 === 0` in the stairs room (L1223) | Mini-boss every 5 depths (§9) |
| Drops | `killMonster` (L1273): 45 % chance of 1–3 coins, 4 % potion. Chests give gold, potion, key (L1285). | Drop pipeline (§6.3) |
| Potions | Single counter, auto-drunk at hp ≤ 3/4, flat heal of 6 (L1422) | Belt (§7) |
| Death | `transition 'death'` → `buildLevel(depth)` **regenerates** the level, full HP, gold kept (L1753–1755) | Death rework (§11) |
| Level RNG | `R = Math.random`, unseeded (L53) | Seeded per level (§12) |
| HUD | DOM overlay. `pixCanvas(rows, scale)` draws ASCII pixel art with the `PAL` palette (L537). | Reused for all icons and panels |
| AUTO | `heroAuto` takes over after 4 s with no input (L600, L1347) | Must keep working (§14) |
| Persistence | None | §12 |

**Kept from the current game**
- **Rendering style:**
  - 3D low-poly procedural meshes.
  - Half-res pixelated post-processing.
  - DOM HUD in "Press Start 2P".
- **Controls and AUTO mode.**

**Dropped [USER]:** the single self-contained `index.html` constraint.

### 2.1 Tech stack and architecture [OURS]

**Stack**

| Concern | Choice | Why |
|---|---|---|
| Language | **TypeScript**, `strict` | The item, affix, spell, class, and save data is large and table-driven. Types catch mismatched stat keys and save-schema drift. |
| Build and dev server | **Vite** | Zero-config TS, fast HMR, and a static `dist/` output. Shaders can be imported as strings (`?raw`). |
| 3D | **three.js** from npm, pinned to **0.160.x** (the version the game uses now) | All existing rendering is three-based. Pinning avoids lighting and colour-management changes during the port. Upgrade as a separate step later. |
| UI panels and HUD | **Preact** with `@preact/signals` | Inventory, stash, character, spellbook, tooltips, and class select are stateful DOM. Preact keeps them declarative for about 4 KB, using JSX and TS types. HUD values such as the orbs, belt, and cooldowns are signals, so the per-frame render loop never re-renders panels. |
| Tests and simulations | **Vitest** | Unit tests for rule formulas, plus headless simulations for the acceptance criteria that call for them (drop rates, XP pacing, time-to-kill). |
| Lint | **ESLint** (flat config) + `typescript-eslint` | `no-restricted-imports` keeps `src/rules` free of three.js and the DOM (see below). |
| Font | `@fontsource/press-start-2p` | Self-hosted, so there are no runtime CDN calls. Today's page loads both three.js and the font from CDNs. |

**Not chosen**
- **A game engine** (Phaser, Babylon, PlayCanvas). Phaser is 2D. The others would mean rewriting the renderer, materials, and post-processing that already work.
- **React** or **Vue**. Fine choices, but heavier than Preact for no gain here.
- **An ECS library.** About 100 actors don't need one. Plain typed objects plus tables keep the code simple.

**Source layout**

```
src/
  main.ts                 boot, title / class select, game loop
  core/                   rng.ts (mulberry32, Rng interface), math.ts, heap.ts, events.ts, input.ts (keyboard + gamepad), time.ts
  rules/                  PURE: no three.js, no DOM. Deterministic given an injected Rng.
    classes.ts            CLASS table (§3.1)
    stats.ts              recompute(), formulas from §1.1
    combat.ts             toHit, damage, block, crit, stun rules
    xp.ts                 XP table and per-kill XP
    items/                bases.ts, affixes.ts, uniques.ts, generate.ts, identify.ts, names.ts
    loot.ts               rollDrop (§6.3)
    spells.ts             SPELLS data, mana cost, learn requirements, damage formulas
    monsters.ts           family table and scaling (§8.1, §8.3)
    grid.ts               backpack and stash grid placement
  world/                  layout.ts, decorate.ts, props.ts, traps.ts, nav.ts (flow field, paths), level.ts (build, delta apply)
  actors/                 hero.ts, heroAuto.ts, monsterAI.ts, projectiles.ts, skills.ts
    models/               hero-warrior.ts, hero-thief.ts, hero-mage.ts, skeleton.ts, rat.ts, slime.ts, spider.ts, …
    bosses/               boneWarden.ts, gorger.ts, broodMother.ts, emberLich.ts
  render/                 renderer.ts, post.ts (+ shaders/*.glsl), textures.ts, materials.ts, geometry.ts, particles.ts, lights.ts, groundItems.ts
  audio/                  snd.ts, sfx.ts
  ui/                     Preact: Hud.tsx, Orbs.tsx, Belt.tsx, CharacterPanel.tsx, InventoryPanel.tsx, StashPanel.tsx, SpellbookPanel.tsx, Tooltip.tsx, ClassSelect.tsx, TitleScreen.tsx
    pixel/                palette.ts, pixCanvas.ts, frame9.ts, icons/{weapons,armor,jewelry,potions,books,scrolls,spells}.ts
  save/                   schema.ts (versioned types), save.ts, migrate.ts
tests/                    rules/*.test.ts, sim/{drops,pacing,ttk}.test.ts
```

**Architecture rules**
- **`src/rules` is pure.** Formulas, tables, item generation, and loot take state and an `Rng`, and return results. The game, the UI, and the simulations all call the same functions, so what the simulations measure is what players get.
- **Two RNG streams:**
  - `levelRng`, seeded per level (§12.1), drives layout, decoration, and spawns.
  - `rollRng`, seeded per session, drives combat and loot.
  - `Math.random` is not used in gameplay code. Cosmetic particles may still use it.
- **Fixed-step simulation:** the world updates at 60 Hz through an accumulator, and rendering runs once per `requestAnimationFrame`.
  - This replaces today's variable `dt` clamped to 0.05.
  - Pausing (§10.1) means the accumulator stops being fed.
  - Hitstop scales the simulation step, as it does today.
- **Game state** is plain serializable data: hero stats, inventory, belt, level delta. It is separate from three.js objects (meshes, lights). This makes saving (§12.2) a projection of state, not a scene walk.
- **UI reads state and sends commands** (`equip`, `move item`, `spend point`, `read book`) through one `actions` module. Every command calls `recompute()` where needed. Panels never mutate the hero directly.
- **Content as typed TS tables**, not JSON. Item bases, affixes, uniques, spells, classes, and monster families are `as const satisfies …` tables, so a typo in a stat key is a compile error.

**Commands**

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check, then `vite build` to `dist/` (static; can be hosted on GitHub Pages, Netlify, or itch.io) |
| `npm run preview` | Serves `dist/` locally |
| `npm test` | Vitest: rules and simulations |
| `npm run lint` | ESLint plus `tsc --noEmit` |

**Consequence:** the game no longer runs by double-clicking a file. Use `npm run dev`, or open the built `dist/` from any static server. If a single-file build is wanted later (for example for itch.io), `vite-plugin-singlefile` can produce one from the same source.

---

## 3. Character system

### 3.1 Classes [USER]

There are three playable classes: **Warrior**, **Thief**, and **Mage**. They are D1's Warrior, Rogue, and Sorcerer, using that class's data from §1.1 and §1.1a.

| Class | Plays as | Model [OURS] |
|---|---|---|
| Warrior | Melee and shield. Tanky. The only class with crits. | Existing sword-and-cloak hero |
| Thief | Bow first, kites enemies. Fastest bow. High Dex gives damage, AC, and to-hit. Cheap spells (75 % mana). | Hooded leather jerkin, quiver, short bow. Dagger mesh when using melee. |
| Mage | Caster with the most mana and the fastest cast. Weak in melee. | Long robe, tall hat, staff with a glowing tip. The staff tip is a `glowSprite` that lights the hero. |

All class differences come from one table, so no code branches on the class name:

```js
const CLASS = {
  warrior: { base: { str: 30, int: 10, dex: 20, vit: 25 }, cap: { str: 250, int: 50, dex: 60, vit: 100 },
             life: [2, 2, 2, 18], mana: [1, 1, 1, -1],            // [·base, ·items, ·clvl, const]
             meleeChar: s => s.str * s.clvl / 100, bowChar: s => s.str * s.clvl / 200,
             hit: { melee: 20, arrow: 10, magic: 0 }, block: 30, potion: { heal: 2, mana: 1 }, healSpell: 2,
             manaCost: 1, crit: true, swing: { sword: .45, club: .45, axe: .50, staff: .55, bow: .55, bare: .45 }, cast: .70, recover: .30,
             arrowSpeed: c => 32 + (c - 1) / 8, skill: 'repair', kit: [...], startSpells: {} },
  thief: { ... },  mage: { ..., startSpells: { charged_bolt: 1 } },
};
```

**Starting kits**
- D1 kits are used as-is, except the Mage.
- **Mage start:** D1's Sorcerer also starts knowing **Firebolt at spell level 2** (devilutionX `CreatePlayer`; recalled from the source, not re-checked this session), so the Mage starts with Firebolt 2, readied. **[OURS]** D1's Short Staff of Charged Bolt depends on staff charges, which are out of scope; the Mage gets a plain Short Staff and knows **Charged Bolt at slvl 1** instead. Their Int of 35 meets both requirements.

**As implemented in Phase 6** [OURS unless noted]
- **Bows:** `Space` draws and releases on the class's bow time; the arrow leaves at 60 % of it. Arrows fly at 12 m/s × (D1 arrow speed / 32), up to 16 m, aimed at the nearest aware monster within ±40° of facing. A miss lets the arrow fly on (D1); each arrow hits at most one monster. Item life and mana steal apply to arrows.
- **Weapon meshes** follow the equipped weapon kind (sword, axe, club, staff with a glowing tip, bow), even when its requirements are unmet.
- **Class select** runs over depth 1 with the world paused; after the name is entered, depth 1 is rebuilt fresh for the chosen hero. The name keeps letters, digits, space, `'` and `-`; an empty name uses the class name.
- **Belt priority:** a picked-up potion moves a scroll from a full belt into the backpack (when it has room), so potions are never stuck in the backpack where AUTO cannot drink them.
- **Monster risers:** the legacy rule that raised 1–3 monsters near the hero after 3 s without a fight was capped at 10 per level here (unlimited, it made every level endless). **Removed after Phase 9 [USER, Q11]:** levels hold only their generated monsters, as in D1. AUTO pacing without it (Phase 10): all three classes reach depth 6 at clvl 8–9, matching `depth + 2`.
- **AUTO acceptance runs** use a dev-only `simulate(seconds)` that advances the fixed-step game without rendering, so results do not depend on browser frame throttling.

**Class selection screen [OURS]** (shown on `NEW RUN`)
- Three heroes stand on a torch-lit landing, built from the real 3D models.
- Left and right arrows choose a class; the chosen hero steps forward into the torchlight.
- A pixel-art panel shows the class's starting attributes, Life, Mana, and a one-line description.
- `Enter` confirms. The player then types a name (12 characters max).

**Hero state**

```js
hero.stats = {
  cls: 'warrior', name: 'AIDAN',
  clvl: 1, xp: 0, unspent: 0,
  base: { ...CLASS[cls].base },
  life, mana,
  spells: { ...CLASS[cls].startSpells },   // { charged_bolt: 1 }
  readied: null,
  // derived by recompute(): maxLife, maxMana, ac, meleeHit, arrowHit, magicHit, dmgMin, dmgMax, block, critPct, attackTime, castTime, attr
};
```

**Int caps use D1 values per class.** The v2 decision to raise the Warrior's Int cap to 100 is reverted, because the Mage is now the spell class. With Int capped at 50, a Warrior cannot reach Stone Curse (51), Chain Lightning (54), or the Identify book (60) from points alone. A Warrior relies on +Int items and Scrolls of Identify.

`recompute(hero)` is the only place derived stats are computed. It runs on:
- equip and unequip
- identify
- level-up
- spending a point
- drinking an elixir
- an Int change, which can change whether item requirements are met

Item requirements:
- Bonuses only count from equipped items whose requirements are met.
- An equipped item whose requirements are unmet gives nothing, and its icon is tinted red.

### 3.1a Class skills [USER Q8]

Each class has one skill, used with `R` (gamepad `LB`). A skill costs no mana.

| Class | Skill | Source | Effect | Cooldown |
|---|---|---|---|---|
| Warrior | **War Cry** | [OURS], replaces D1 Repair | Stuns every monster within 4 m for 1 s. Bosses are not stunned; they are slowed by 30 % for 1 s instead. Effects: a shockwave ring (`fxAdd`), camera shake, and `SFX.warCry`. | 20 s |
| Thief | **Disarm Trap** | D1 | Works on a spike or blade trap within 1.5 m. Success chance is `2·Dex − 5·depth` %, clamped 0–100. On success the trap is disabled for good, which is saved in the level delta (§12.2). On failure the trap fires once on the Thief [OURS]. Each trap's tooltip shows the chance. | 1 s |
| Mage | **Mana Surge** | [OURS], replaces D1 Recharge | Converts 20 % of current life into the same amount of mana, capped at max mana. It never lowers life below 1. It does nothing when mana is full. Effects: a red-to-blue particle spiral and `SFX.manaSurge`. | 30 s |

- **HUD:** the skill icon sits beside the readied-spell icon, with a radial sweep while it is cooling down.
- **Pause:** cooldowns pause with the game.
- **Saving:** cooldowns are not saved.
- Repair and Recharge may come back with the town, once durability and staff charges exist. They would be town services, as in D1.

### 3.2 Experience and level-up

**On kill**
- Add XP: `xp += floor(base_xp · max(0, 10 + mlvl − clvl) / 10)`. This is D1's formula, rounded down, in integer form to avoid float drift.
- Levels follow the D1 table (§1.2).

**On level-up**
- `unspent += 5`.
- Life and mana are restored to full.
- A gold particle burst plays, along with `SFX.levelUp`.
- Toast: `LEVEL n`.
- A pulsing **"+"** button appears by the life orb.

**Spending points**
- Points are spent on the character screen, one point per click on a `+` button.
- A `+` button is disabled once its attribute is at the cap.

**XP bar [OURS]:** a 2 px bar under the belt. D1 has no XP bar.

### 3.3 Combat conversion

Monsters gain `mlvl`, `ac`, `toHit`, `dmg: [min, max]`, `xp`, and `undead: bool`.

**Attack timing:** the hero's attack cooldown (`startAttack`, currently a fixed 0.44 s) becomes `CLASS[cls].swing[weaponKind] · (1 − speedBonus)`. The swing animation is scaled to match.

**Hero melee (`heroHitCheck`)**
1. For each monster in the swing arc, roll to-hit (§1.1).
2. On a miss:
   - Play `SFX.whiff`.
   - Deal no damage; apply a small knockback.
3. On a hit:
   - Roll damage.
   - Roll for a crit (Warrior only). A crit uses a brighter impact and adds hitstop.
4. Stun (`state='stun'`) **only if `dmg ≥ mlvl + 3`**. This replaces the current 35 % interrupt roll.

**Hero bow attack** (any class; the Thief's main attack)
- `Space` with a bow equipped draws and fires an arrow on the class's bow swing time.
- Aiming uses the same auto-target cone as spells (§5.4).
- The arrow is a projectile. Speed [OURS] is `12 m/s · arrowSpeed(clvl)/32`.
- Walls stop arrows. An arrow hits the first monster in its path.
- To-hit uses the arrow formula. Damage uses bow character damage.
- Ammunition is unlimited, as in D1.
- The bow is two-handed, so the shield slot is greyed out.

**Monster attack (end of windup, L1507)**
1. Roll monster to-hit.
2. Roll block. A successful block plays `SFX.block`, flashes the shield, and deals 0 damage.
3. If Mana Shield is active, route damage per §5.4.
4. Otherwise apply the damage.

**Hero flinch [OURS]:** only when damage is at least 5 % of max life. The flinch lasts the class's hit-recovery time (§1.1a). This prevents stun-lock from chip damage.

**Traps [OURS]:** spikes and blades deal `5–10 + 2·depth` to the hero and to monsters. Trap kills give no XP.

**HUD**
- Hearts are replaced by D1-style pixel **life and mana orbs** (red and blue).
- Each orb is a canvas with a liquid level, highlight, and 1 px dark outline.
- Hovering an orb shows its value, e.g. `LIFE 54/70`.
- Floating damage numbers are off by default, as in D1. A settings toggle turns them on.
  - **As implemented in Phase 10** [OURS]: the Esc game menu holds the toggle. Numbers rise and fade over 1 s above the target: white for hero damage, gold and larger for crits, orange when the Ember Lich's ward reduced it, red for damage the hero takes.

### 3.4 Character screen (`C`)

A pixel-art panel on the left half of the screen.

**Header**
- Name and class.
- Level, XP, and XP to the next level.

**Attributes** — one row each for Str, Int, Dex, Vit:
- Base value and current value.
- The current value is blue when items raise it and red when items lower it.
- Effects of **unidentified** items are applied in play but **excluded from the displayed values**, as in the D1 manual.
- A `+` button appears while `unspent > 0`.

**Right column**
- AC, Melee To-Hit %, Arrow To-Hit % (shown when a bow is equipped), Spell To-Hit %, Damage min–max, Block %.
- Life and mana as current/max.
- Gold.

---

## 4. Intelligence and mana

Int has three jobs:
1. It raises max mana (§1.1).
2. It gates spell learning and casting from scrolls.
3. It meets item Int requirements.

Mana regenerates [OURS] at **`1.5 % maxMana/s`** for every class (`MANA_REGEN` in `rules/stats.ts`). D1 has no natural mana regeneration outside items. v1 proposed 0.5 %; in Phase 6 AUTO runs a Mage at 0.5 % never got past depth 2 (13–18 deaths in 25 game minutes, three runs), while at 1.5 % it cleared depths 1–3 in two of three runs. Without a town to buy mana potions, 0.5 % starves casters.

---

## 5. Spells, spellbooks, scrolls [USER]

### 5.1 Learning from spellbooks

**Where books come from**
- Monsters and chests drop books through the normal item pool (§6.3).
- **Bookshelves [OURS, D1 bookcase]:** a new room prop. One appears per level with 35 % chance. Walking into it drops one book at `ilvl = 2·depth`.

**Reading a book**
- Right-click it in the backpack.
- If `Int ≥ req(spell, known_slvl + 1)`:
  - Learn the spell, or raise its slvl by 1.
  - Restore mana equal to the spell's initial mana cost.
  - Toast: `LEARNED FIREBOLT` or `FIREBOLT LEVEL 3`.
  - Consume the book.
- Otherwise, the requirement line in the tooltip is red, the book stays, and the toast reads `NOT ENOUGH INTELLIGENCE`.

**Requirement formula:** `req(spell, n) = round(learnInt · 1.2^(n−1))`. A result of 213 or more becomes 255, which is unreachable without items. The maximum slvl is 15.

**Item size and display**
- Books are 2×2 items.
- They are named *Book of Firebolt*.
- Each book shows the requirement for the **next** level the hero would learn.

### 5.2 Spell list (phase 1 of spells)

Data comes from D1 (§1.4) unless tagged.

**Shipped spells**

| Spell | Learn Int | Mana | Book qlvl | Scroll qlvl | Notes for our game |
|---|---|---|---|---|---|
| Firebolt | 15 | 6 (min 3) | 1 | — | Projectile with fire trail (`fxAdd`) |
| Healing | 17 | `8 + 2·clvl − 3·slvl` (min 4) | 1 | 1 | Self only |
| Holy Bolt | 20 | 7 (min 3) | 1 | — | No effect on non-undead (shows a fizzle) |
| Charged Bolt | 25 | 6 | 1 | — | 4+ sparks that wander along the floor |
| Lightning | 20 | 10 (min 5) | 4 | 4 | Instant line, multi-hit |
| Inferno | 20 | 11 (min 5) | 3 | 1 | Short cone, channel-free |
| Fire Wall | 27 | 28 (min 14) | 3 | 4 | Wall perpendicular to facing, 4 m ahead. **Hurts the hero.** |
| Mana Shield | 25 | 33 | 6 | 8 | Blue bubble around the hero |
| Flash | 33 | 30 (min 15) | 5 | 6 | Ring burst |
| Telekinesis | 33 | 15 (min 7) | 2 | — | Pulls the nearest item or opens the nearest chest within 8 m |
| Phasing | 39 | 12 (min 6) | 7 | 6 | Random teleport 4–8 m to a reachable tile |
| Fireball | 48 | 16 (min 8) | 8 | 8 | Projectile with splash |
| Stone Curse | 51 | 60 (min 30) | 6 | 6 | Grey-stone material swap. Bosses are immune [OURS]. |
| Chain Lightning | 54 | 30 (min 15) | 8 | 10 | Arcs to every monster within range |
| **Identify** | **60 [OURS/USER]** | **10 [OURS]** | **10 [OURS/USER]** | 1 | Learnable, unlike D1. Opens the inventory in target mode (§10.2). |

**Deferred spells**

| Spell | Scroll qlvl | Deferred until |
|---|---|---|
| Nova | 14 | The scroll-only spell set ships |

Notes:
- Minimum mana costs are **[OURS]**: `ceil(initial/2)`. The web copy of Jarulf's table drops the minimum column.
- `slvl` raises damage as in D1. It also lowers mana cost by the per-level decrease (§1.4) down to the minimum.

**As implemented in Phase 5** [OURS unless noted]
- **Damage formulas** follow §1.4 for Firebolt, Charged Bolt, Holy Bolt, Fireball (with `Rec`) and Healing. D1's formulas for the others are not reproduced; ours are:
  - Lightning and Chain Lightning: `4 … 4 + 2·clvl`, +10 % per spell level above 1.
  - Inferno: `1 … 3 + clvl/2` per 0.15 s tick for 0.6 s, in a ±30° cone 3.5 m long; +10 % per level.
  - Fire Wall: `1 … 4 + clvl/2` every 0.5 s to anything standing in it (the hero included); +10 % per level. It lasts `4 + 2·slvl` s: the v1 table's `8 + 8·slvl` reads like D1 game ticks rather than seconds (unverified), and 16+ s walls would block corridors for too long.
  - Flash: `2 + clvl … 4 + 3·clvl` to every monster within 3.2 m, once; +10 % per level.
- **Spell level** used for casting is the learned level plus +spell-level items; scrolls of unknown spells cast at level 1 plus that bonus.
- **Release:** the spell takes effect at 40 % of the class cast time; the hero moves at 30 % speed while casting and cannot swing.
- **Lightning** is an instant line to its 10 m range or the first wall, striking each monster on it once. **Chain Lightning** adds a bolt to every other monster within `2·(2 + slvl)` m (max 14) that has a clear line from the hero.
- **Charged Bolt** sparks fly ±0.6 rad around the aim and wander randomly; each spark hits one monster.
- **Mana Shield:** each hit costs ⅔ of its damage in mana; when mana cannot cover it, the remainder ×1.5 hits life and the shield ends.
- **Telekinesis** picks up the nearest item within 8 m (or pulls it to the hero's feet when there is no room), or opens the nearest closed chest or bookshelf, whichever is closer. It does not knock back monsters.
- **Phasing** lands on a random walkable, reachable tile 4–8 m away, never on stairs or traps.
- **Stone Curse** fires a bolt; the first monster hit is frozen (it still takes damage). Bosses are immune.
- **Mana regeneration** (§4) and **AUTO casting** (§14) are in. AUTO only casts what the player has readied.
- **Bookshelves** appear on 35 % of levels, against a room wall. AUTO treats them like chests.
- **Scroll drops:** Identify 50 %, Healing 15 %, the rest uniform among scrolls with `scrollQ ≤ ilvl`. **Book drops:** uniform among spells with `bookQ ≤ ilvl`.

### 5.3 Scrolls

- A scroll is a 1×1 item that casts its spell once, at the known slvl or slvl 1.
- It costs **no mana**, as in D1.
- Its Int requirement is `ceil(0.75 · learnInt)` **[OURS]**. D1 only says "a bit less". **Scrolls of Identify have no Int requirement [USER]; neither do Scrolls of Town Portal [OURS, as in D1].**
- Scrolls can go on the **belt**, as in D1. Belt hotkeys `1`–`8` read them.
- Identify scrolls are common [USER]. Weights are in §6.3.

### 5.4 Casting controls and rules

**Spellbook (`B`)**
- A pixel panel listing learned spells with:
  - icon
  - slvl
  - mana cost
  - damage or effect range at the current clvl/slvl
- Clicking a spell, or pressing `Enter` on it, **readies** it.
- `F5`–`F8` can be assigned to spells by hovering a spell and pressing the key, as in D1. Pressing an assigned key later readies that spell.
- It pauses the game, like every panel (§10.1).

**Casting**
- `Q` casts the readied spell. On a gamepad, `RB` does.
- The readied spell's icon is drawn to the right of the mana orb. It shows greyed when the hero lacks mana.

**Targeting [OURS]** (the game has no world mouse aiming)
- Projectile and line spells aim at the nearest aware monster within a ±35° cone of facing and within the spell's range.
- If there is none, they fire straight ahead.
- Self and area spells ignore aim.
- Mouse aiming may be added later. It is not required.

**Timing**
- Cast time is the class's cast time (§1.1a): Warrior 0.70 s, Thief 0.60 s, Mage 0.40 s. During a cast the existing attack slow-down applies (`sp × 0.3`).
- After a cast there is a 0.25 s cooldown before the next spell or swing.
- Mana cost is multiplied by `CLASS.manaCost` (Thief 0.75), but never drops below the spell's minimum.

**Spell to-hit:** rolls the player magic to-hit (§1.1). Lightning, Chain Lightning, and Flash roll once per tick of damage, as in D1.

**Spell damage and stun:** spell damage stuns monsters under the same `dmg ≥ mlvl + 3` rule.

**Mana Shield:** while active, damage is subtracted from mana at ×0.67 (D1's 33 % reduction). It ends at 0 mana or when changing level.

### 5.5 Visuals and sound

**Projectiles**
- Each projectile is a small emissive mesh, with a borrowed light from `warmPool` (fire) or `coldPool` (lightning and magic), plus an `fxAdd` trail.
- The renderer stays pixel-crisp, as today.

**Sound** — new SFX built from the existing `Snd.noise` and `Snd.tone` primitives:
- `cast`
- `fireWhoosh`
- `zap`
- `heal`
- `fizzle`
- `learn`

**Spell icons:** 14×14 pixel art, the same pipeline as item icons (§10.3).

---

## 6. Items

### 6.1 Base items (D1 subset, D1 stats)

| Group | Bases: dmg or AC, requirements, qlvl | Footprint |
|---|---|---|
| Swords | Dagger 1–4 (q1)<br>Short Sword 2–6, Str18 (q1)<br>Sabre 1–8, Str17 (q1)<br>Falchion 4–8, Str30 (q2)<br>Scimitar 3–7, Str23 Dex23 (q4)<br>Long Sword 2–10, Str30 Dex30 (q6)<br>Broad Sword 4–12, Str40 (q8)<br>Bastard Sword 6–15, Str50 (q10)<br>Great Sword 10–20, Str75 (q17, two-handed) | Dagger 1×2<br>Most swords 1×3<br>Great Sword 2×3 |
| Axes (two-handed) | Small Axe 2–10 (q2)<br>Axe 4–12, Str22 (q4)<br>Large Axe 6–16, Str30 (q6)<br>Broad Axe 8–20, Str50 (q8)<br>Battle Axe 10–25, Str65 (q10)<br>Great Axe 12–30, Str80 (q12) | 2×3 |
| Clubs | Club 1–6 (q1)<br>Mace 1–8, Str16 (q2)<br>Morning Star 1–10, Str26 (q3)<br>War Hammer 5–9, Str40 (q5)<br>Flail 2–12, Str30 (q7)<br>Maul 6–20, Str55 (q10, two-handed) | 1×3<br>Maul 2×3 |
| Helms | Cap 1–3 (q1)<br>Skull Cap 2–4 (q4)<br>Helm 4–6, Str25 (q8)<br>Full Helm 6–8, Str35 (q12)<br>Crown 8–12 (q16)<br>Great Helm 10–15, Str50 (q20) | 2×2 |
| Armor | Rags 2–6 (q1)<br>Cape 1–5 (q1)<br>Cloak 3–7 (q2)<br>Robe 4–7 (q3)<br>Quilted 7–10 (q4)<br>Leather 10–13 (q6)<br>Hard Leather 11–14 (q7)<br>Studded 15–17, Str20 (q9)<br>Ring Mail 17–20, Str25 (q11)<br>Chain Mail 18–22, Str30 (q13)<br>Scale 23–28, Str35 (q15)<br>Breast Plate 20–24, Str40 (q16)<br>Splint 30–35, Str40 (q17)<br>Plate 42–50, Str60 (q19)<br>Field Plate 40–45, Str65 (q21)<br>Gothic Plate 50–60, Str80 (q23)<br>Full Plate 60–75, Str90 (q25) | 2×3 |
| Shields | Buckler 1–5 (q1)<br>Small 3–8, Str25 (q5)<br>Large 5–10, Str40 (q9)<br>Kite 8–15, Str50 (q14)<br>Tower 12–20, Str60 (q20)<br>Gothic 14–18, Str80 (q23) | 2×2<br>Kite, Tower, Gothic 2×3 |
| Jewelry | Ring (q5, 10, 15)<br>Amulet (q8, 16) | 1×1 |
| Potions | Healing, Full Healing, Mana, Full Mana (q1)<br>Rejuvenation (q3)<br>Full Rejuvenation (q7) | 1×1 |
| Elixirs | Elixir of Str / **Int** / Dex (q15)<br>Elixir of Vit (q20) | 1×1 |
| Books | *Book of X*: qlvl is the spell's book qlvl (§5.2) | 2×2 |
| Scrolls | *Scroll of X*: qlvl is the spell's scroll qlvl (§5.2) | 1×1 |
| Bows (two-handed) | Short Bow 1–4 (q1)<br>Hunter's Bow 2–5, Str20 Dex35 (q3)<br>Long Bow 1–6, Str25 Dex30 (q5)<br>Composite Bow 3–6, Str25 Dex40 (q7)<br>Short Battle Bow 3–7, Str30 Dex50 (q9)<br>Long Battle Bow 1–10, Str30 Dex60 (q11)<br>Short War Bow 4–8, Str35 Dex70 (q15)<br>Long War Bow 1–14, Str45 Dex80 (q19) | 2×3 |
| Staves (two-handed, no charges) | Short Staff 2–4 (q1)<br>Long Staff 4–8 (q4)<br>Composite Staff 5–10 (q6)<br>Quarter Staff 6–12, Str20 (q9)<br>War Staff 8–16, Str30 (q12) | 1×4 |

- Bows and staves are in now that the Thief and Mage exist. Staff spell charges stay out (§1.6).
- D1 counts bows twice in monster drops. We keep that rule.
- Footprints are **[OURS]**: D1-like, but not verified against D1 data.
- AC is rolled within its range when the item is created.

### 6.2 Affixes (D1 names and values, subset)

**Prefixes**

| Effect | Tiers: value (qlvl) |
|---|---|
| +% To-Hit | Bronze 1–5 (q1)<br>Iron 6–10 (q4)<br>Steel 11–15 (q6)<br>Silver 16–20 (q9)<br>Gold 21–30 (q12)<br>Platinum 31–40 (q16)<br>Mithril 41–60 (q20)<br>Meteoric 61–80 (q23) |
| +% Damage | Jagged 20–35 (q4)<br>Deadly 36–50 (q6)<br>Heavy 51–65 (q9)<br>Vicious 66–80 (q12)<br>Brutal 81–95 (q16)<br>Massive 96–110 (q20)<br>Savage 111–125 (q23)<br>Ruthless 126–150 (q35) |
| +% To-Hit / +% Damage | Sharp 1–5 / 20–35 (q1)<br>Fine 6–10 / 36–50 (q6)<br>Warrior's 11–15 / 51–65 (q10)<br>Soldier's 16–20 / 66–80 (q15)<br>Lord's 21–30 / 81–95 (q19)<br>Knight's 31–40 / 96–110 (q23)<br>Master's 41–50 / 111–125 (q28)<br>King's 76–100 / 151–175 (q28) |
| +% AC | Fine 20–30 (q1)<br>Strong 31–40 (q3)<br>Grand 41–55 (q6)<br>Valiant 56–70 (q10)<br>Glorious 71–90 (q14)<br>Blessed 91–110 (q19)<br>Saintly 111–130 (q24)<br>Awesome 131–150 (q28)<br>Holy 151–170 (q35) |
| +Mana | Spider's 10–15 (q1)<br>Raven's 15–20 (q5)<br>Snake's 21–30 (q9)<br>Serpent's 30–40 (q15)<br>Drake's 41–50 (q21)<br>Dragon's 51–60 (q27) |
| +Spell levels | Angel's +1 (q15)<br>Arch-Angel's +2 (q25) |

**Suffixes**

| Effect | Tiers: value (qlvl) |
|---|---|
| +Str | of Strength 1–5 (q1)<br>Might 6–10 (q5)<br>Power 11–15 (q11)<br>Giants 16–20 (q17)<br>Titans 21–30 (q23) |
| +Dex | of Dexterity 1–5 (q1)<br>Skill 6–10 (q5)<br>Accuracy 11–15 (q11)<br>Precision 16–20 (q17)<br>Perfection 21–30 (q23) |
| +Vit | of Vitality 1–5 (q1)<br>Zest 6–10 (q5)<br>Vim 11–15 (q11)<br>Vigor 16–20 (q17)<br>Life 21–30 (q23) |
| +Int | of Magic 1–5 (q1)<br>the Mind 6–10 (q5)<br>Brilliance 11–15 (q11)<br>Sorcery 16–20 (q17)<br>Wizardry 21–30 (q23) |
| +All attributes | of the Sky 1–3 (q5)<br>the Moon 4–7 (q11)<br>the Stars 8–11 (q17)<br>the Heavens 12–15 (q25)<br>the Zodiac 16–20 (q30) |
| +Life | of the Fox 10–15 (q1)<br>Jaguar 16–20 (q5)<br>Eagle 21–30 (q9)<br>Wolf 30–40 (q15)<br>Tiger 41–50 (q21)<br>Lion 51–60 (q27) |
| +Damage | of Quality 1–2 (q2)<br>Maiming 3–5 (q7)<br>Slaying 6–8 (q15)<br>Gore 9–12 (q25) |
| −Damage taken | of Health 1 (q2)<br>Protection 2 (q6)<br>Absorption 3 (q12)<br>Deflection 4 (q20) |
| Life steal | of the Leech 3 % (q8)<br>of Blood 5 % (q19) |
| Mana steal | of the Bat 3 % (q8)<br>of Vampires 5 % (q19) |
| Attack speed | of Readiness −4 % (q1)<br>Swiftness −8 % (q10)<br>Speed −12 % (q19)<br>Haste −16 % (q27) |
| Thorns | of Thorns: the attacker takes 1–3 (q1) |

Notes:
- **Int suffix names:** D1's *of Magic … of Wizardry* names are kept. The effect is now +Int.
- **Attack speed [OURS]:** scales `hero.cd` (0.44 s) and the swing animation by `1 − bonus`.
- **Cursed affixes [OURS]:** affixes with negative values are left out of the first pass.
- **Slot eligibility:** follows D1's occurrence table (Jarulf §3.13.6).
- **Spell-level affixes:** Angel's and Arch-Angel's are limited to jewelry and helms **[OURS]**. Their bonus is stored and shown; it takes effect when spells arrive (Phase 5).

**As implemented in Phase 4**
- **Which affixes:** a magic item gets a prefix with 1/4 chance and a suffix with 2/3 chance; if neither, one of the two at random (D1, devilutionX `GetItemPower`). Each affix is drawn uniformly from those allowed on the base with qlvl in `[ilvl/2, ilvl]` (D1); when that window has none for the slot, any qlvl ≤ ilvl.
- **Two-effect affixes** (Sharp … King's) roll both values at the same point of their ranges.
- **Slot tags [OURS, approximating Jarulf §3.13.6]:** To-Hit on weapons and jewelry; +% damage, To-Hit/damage, flat damage and attack speed on weapons; +% armor and Thorns on armor; +mana on jewelry and staves; attributes on everything; +life and −damage taken on armor and jewelry; life and mana steal on weapons and jewelry.
- **+% armor** raises only that item's own armor class (D1). **−Damage taken** never lowers a hit below 1. **Thorns:** an attacker that hits takes 1–3 damage per Thorns point (kills by Thorns give XP). **Life / mana steal** returns that % of each melee hit's damage. **Attack speed** shortens the attack time and speeds up the swing animation to match.
- **Requirements** use current attributes (base + items), so one item can enable another (D1); items whose requirements are unmet give nothing.

### 6.3 Drop pipeline

`rollDrop(source, ilvl)` replaces L1273–1275.

**1. Outcome**

| Source | Gold | Item | Nothing |
|---|---|---|---|
| Normal monster | 30.3 % | 10.7 % | 59 % |
| Unique or boss | — | 100 % | — |

**2. Item category [OURS]** — weights for item outcomes. D1 picks uniformly from its whole base pool; ours is smaller, so the weights are explicit.

| Category | Weight | Notes |
|---|---|---|
| Equipment | 45 | |
| Potion | 30 | 50 below depth 3 |
| Scroll | 15 | Identify is 50 % of scroll drops; Healing 15 %; the rest is uniform among eligible scrolls |
| Book | 8 | |
| Elixir | 2 | Depth 8 and deeper only |

**3. Equipment** follows the D1 generation steps (§1.3).

**4. Identification state:** magic and unique items are created with `identified: false`.

**Uniques [OURS]:** when the 2 % unique roll succeeds, a unique is picked uniformly among those with `qlvl ≤ ilvl` not yet generated this run, and the item takes *that unique's* base. D1 instead requires the unique to match the already-chosen base; with our 26 uniques that would make them far rarer than D1's ~0.4 % at ilvl 10. With no eligible unique the item stays magic. A unique counts as generated when it drops, even if it is never picked up.

**Boss drops:** one equipment item that is always magic with a 16 % unique chance (D1 unique-monster rule), one potion, one Scroll of Identify, and 10× a gold pile.

**Scrolls:** until Phase 5, every scroll drop is a Scroll of Identify (weight 15).

**Item level**
- Monster drops: `ilvl = mlvl`.
- Chests and bookshelves: `ilvl = 2·depth`.

**Gold [OURS]**
- Gold stays a counter, not backpack cells.
- A gold drop gives `ri(1,3)·(mlvl+1) + ri(0, mlvl)` gold, split over up to 6 coins on the floor.

**As implemented in Phase 3** [OURS]
- Item categories until scrolls and books exist (Phase 5): equipment 45, potion 30 (50 below depth 3), elixir 2 (depth 8+).
- Chests: their gold, plus one item at `ilvl = 2·depth` with 50 % chance.
- The Bone Warden always drops one equipment item, one potion and 10× a normal gold pile, until the §9 boss drops land.
- Bows wait for bow attacks (Phase 6); rings and amulets wait for magic items (Phase 4), since they are always magic.
- Potion type within the potion category: weighted among potions with `qlvl ≤ ilvl`. Weights: Healing 50, Mana 22, Rejuvenation 10, Full Healing 8, Full Mana 5, Full Rejuvenation 5.
- Ground equipment and elixirs lie on the floor as their pixel icon (billboarded sprite); potions keep their 3D flask.
- Pickups may fly out of a prop (chest loot starts inside the chest) but not into one. One that still ends up inside a prop can be collected from 1.4 m instead of 0.55 m. AUTO gives up on a pickup it has not reached after 8 s.
- The starting kit is equipped: Short Sword and Buckler, a Club in the backpack, two Potions of Healing on the belt (D1 Warrior kit).

**Breakable barrels [USER, after Phase 12]** (D1, devilution `AddBarrel`/`BreakBarrel`)
- Every barrel in the dungeon breaks from any blow: a melee swing (every barrel in the arc), an arrow or bolt that strikes its cluster (the barrel nearest the impact), a fireball's blast (every barrel in it), or the end of a lightning bolt. Town barrels are scenery.
- **Contents (D1 rates):** one barrel in five holds something.
  - A third of those: a Potion of Healing or Mana (even odds); from depth 2, a Scroll of Town Portal a third of the time instead.
  - The rest: a random drop at `ilvl = 2·depth`, gold three times in four (a normal gold pile at that level), otherwise an item through the normal pipeline above.
  - [OURS] D1 rolls the contents when the barrel is created; ours rolls them when it breaks, so level generation draws no extra numbers and existing saves rebuild their levels unchanged. The odds are the same.
- **Not ported:** D1's skeletons that climb out of one barrel in five, and its explosive barrels (about one in four or five).
- **Looks:** the barrel bursts into splinters and dust with a wooden crack. Its remains stay: the lower staves snapped at jagged heights, the bottom hoop, loose staves and a hoop on the floor.
- **Movement:** a cell holding only barrels stops blocking once they are all broken; a cell shared with a crate keeps blocking.
- **Manual play:** Space with no monster within reach turns to the nearest barrel within 2 m and swings.

### 6.4 Identification [USER]

- **Normal items never need identifying.**
- **Unidentified magic and unique items:**
  - Their name shows only the base name, e.g. *Short Sword*, in blue (magic) or gold (unique).
  - The tooltip shows `NOT IDENTIFIED` plus the base stats and requirements.
  - Their properties **do apply** when equipped, as in D1, but are hidden in the tooltip and the character screen (§3.4). The character screen still shows the real life and mana pools, so the numbers there never exceed their shown maximum.
  - **Reading a scroll** (belt key, belt right-click, or right-click in the backpack) opens the inventory with every unidentified item highlighted; clicking one identifies it and uses up the scroll. `Esc` cancels without using the scroll; with nothing to identify the scroll is not read.
- **Ways to identify:**
  - **Scroll of Identify:** common; see §6.3.
  - **Identify spell:** learned from a *Book of Identify* (qlvl 10, Int 60) **[OURS/USER]**. Each cast costs 10 mana.
  - **Later:** a town NPC service (§13).
- **Identifying an item:**
  - Plays `SFX.identify`.
  - Sparkles the item's cell.
  - Reveals the full name, e.g. *Jagged Short Sword of the Fox*, and its properties.
  - Calls `recompute()` so the character screen shows the item's effects.

### 6.5 Uniques [OURS: original names]

Unique mechanics follow D1:
- A fixed base plus 2–6 fixed properties.
- Its own qlvl.
- At most one of each per run.
- Gold name.

D1's unique names are Blizzard IP, so ours are original. The full list (26, qlvl 1–20):

| Unique | Base | qlvl | Properties |
|---|---|---|---|
| Tinker's Mallet | Club | 1 | +10 To-Hit, +2 damage, +3 Str |
| Gravewhisper | Dagger | 1 | +30 % dmg, +3 Dex, 3 % life steal |
| Mourning Cloak | Cloak | 2 | +60 % AC, +4 Dex, Thorns 2 |
| Whisperwind | Sabre | 3 | 8 % faster attack, +6 Dex, +15 To-Hit |
| Hearthguard | Buckler | 3 | +100 % AC, +4 Vit, −1 dmg taken |
| Bonecrown | Skull Cap | 4 | +15 AC, +10 Life, −1 dmg taken |
| Pilgrim's Staff | Long Staff | 4 | +10 Int, +15 Mana, +20 % dmg |
| Mossbark Aegis | Small Shield | 5 | +40 % AC, +5 Vit, Thorns |
| Coppercoil | Ring | 5 | +6 Dex, +10 To-Hit, +10 Mana |
| Bloodletter | Morning Star | 5 | +60 % dmg, 3 % life steal, −3 Vit |
| Rustfang | Falchion | 6 | +70 % dmg, +10 To-Hit, −5 Dex |
| Thornbriar | Hard Leather Armor | 7 | +50 % AC, Thorns 3, +5 Str |
| Ember Band | Ring | 8 | +5 Str, +5 Vit, +10 Life |
| Stonejaw | War Hammer | 8 | +90 % dmg, +4 damage, −8 Dex |
| Grimwarden's Hide | Studded Leather Armor | 9 | +12 AC, +8 Str, +15 Life |
| The Lantern Eye | Amulet | 10 | +10 all attributes, −10 Life |
| Scholar's Cowl | Cap | 10 | +15 Int, +20 Mana, +1 spell level |
| Bulwark of Saints | Large Shield | 11 | +120 % AC, +10 Vit, −3 dmg taken |
| Widowmaker | Broad Axe | 12 | +120 % dmg, 5 % life steal, −10 AC |
| Moonshard | Amulet | 12 | +12 Int, +25 Mana, 3 % mana steal |
| Ironhide Coat | Chain Mail | 13 | +80 % AC, +20 Life, −2 dmg taken |
| Spinneret | Scimitar | 15 | +60 % dmg, 16 % faster attack, +15 Dex (spider mini-boss, §9) |
| Serpent's Coil | Ring (q15) | 15 | +4 all attributes, 3 % life steal, 3 % mana steal |
| Crown of Ash | Crown | 16 | +6 all attributes, +20 Life, +1 spell level |
| Sunder | Great Axe | 18 | +140 % dmg, +20 To-Hit, 8 % faster attack |
| Kingslayer's Oath | Bastard Sword | 20 | +150 % dmg, +30 To-Hit, +10 Str, crit chance ×2 |

Widowmaker's "−20 % AC" from v1 became a flat −10 AC: +% armor only applies to an item's own armor, and an axe has none.

### 6.6 Item data model

```js
const ITEM_BASES = { short_sword: { name: 'Short Sword', slot: 'hand', kind: 'sword', w: 1, h: 3, dmg: [2, 6], req: { str: 18 }, qlvl: 1, icon: ICON.short_sword }, ... };
const SPELLS     = { firebolt: { name: 'Firebolt', learnInt: 15, mana: [6, 0.5, 3], bookQ: 1, scrollQ: null, undeadOnly: false, cast: castFirebolt, icon: ICON.sp_firebolt }, ... };
const AFFIXES    = [{ id: 'jagged', pos: 'pre', name: 'Jagged', stat: 'pctDmg', min: 20, max: 35, qlvl: 4, slots: ['weapon'] }, ...];
const UNIQUES    = [{ id: 'gravewhisper', base: 'dagger', qlvl: 1, props: [{ stat: 'pctDmg', v: 30 }, ...] }, ...];
// instance
{ uid, base: 'short_sword' | 'book' | 'scroll' | 'potion_heal' | ..., spell: 'firebolt' | null,
  q: 'normal' | 'magic' | 'unique', identified: true, pre: { id, v } | null, suf: { id, v } | null, uniq: id | null, ac: 12 }
```

---

## 7. Potions and belt

**Belt layout**
- 8 one-cell slots at the bottom centre, between the orbs.
- Keys `1`–`8` use a slot. Each slot shows its digit in a corner, as in D1.
- The belt accepts **potions and scrolls**.

**Filling the belt**
- A picked-up potion or scroll goes to the first free belt slot, otherwise to the backpack.
- [OURS] When a slot empties, it pulls a matching item from the backpack.

**Drinking**

| Potion | Effect |
|---|---|
| Healing | `bonus · rr(1/8, 3/8) · maxLife`. The bonus is the class healing-potion bonus (§1.1a), so a Warrior heals 25–75 %, a Thief 19–56 %, and a Mage 12.5–37.5 %. |
| Mana | `bonus · rr(1/8, 3/8) · maxMana`. The class mana-potion bonus is Warrior 1.0, Thief 1.5, Mage 2.0. |
| Full Healing / Full Mana | 100 % |
| Rejuvenation | Both healing and mana |

- Drinking slows movement for 0.7 s, using the existing `drink` animation and particles.

**Elixirs** (shipped in Phase 3)
- Use with right-click in the backpack.
- +1 permanently to a base attribute; refused at the class maximum.

**Using the belt [OURS]:** keys `1`–`8` or right-click a slot. Drinking from the belt never takes control away from AUTO. Left-click is reserved for moving items once the inventory exists (Phase 3).

**Potion drops** follow the §6.3 pipeline since Phase 3.
- With a full belt and backpack, potions stay on the floor and AUTO ignores them.

**Removed code:** `hero.potions`, `#pots`, and the auto-drink at L1422. After a death, the hero is given one Potion of Healing if they carry no life potion (until the Phase 7 death rules).

**Starting kit:** two Potions of Healing on the belt (D1 Warrior kit).

**Potion icons:**
- Healing: red flask.
- Mana: blue flask.
- Rejuvenation: purple flask.
- Full versions: larger, with a gold outline.
- Elixirs: tall vial.

---

## 8. Monsters

### 8.1 Scaling [OURS]

```
mlvl      = max(1, depth + family.lvlOff)
hp        = round(family.hp · (1 + 0.35·(mlvl − 1)) · rr(0.9, 1.1))
dmg       = family.dmg.map(d => round(d · (1 + 0.20·(mlvl − 1))))
ac        = family.ac + 2·mlvl
toHit     = family.toHit
base_xp   = round(family.xpMul · (40·mlvl^1.6 + 20))
subtype   = min(3, floor((depth − family.minDepth) / 4))   // +15 % hp/dmg per tier, recolour
```

**Pacing targets** — check these with a headless simulation before tuning:
- Level 2 around the end of depth 1. At mlvl 1, `base_xp ≈ 60 · xpMul`, so 2000 XP is about 35 kills.
- `clvl ≈ depth + 2` through depth 10.
- A normal monster dies in 2–3 melee hits with level-appropriate gear.
- Firebolt at slvl 1 kills a depth-1 monster in about 2 casts.
- The hero survives about 10 normal hits from full life.

### 8.2 Level composition

- Each depth picks **3 families** from those allowed at that depth. This mirrors D1's limit on families per level, and replaces `monsterTypeFor` (L1136).
- Spawn counts stay as they are (L1222, L1227).
- **As implemented in Phase 8** [OURS]: the three are picked uniformly (no weights) inside the level's seeded stream. When fewer than three families qualify (very deep), the families whose depth range ended most recently fill in. Each spawn picks uniformly among the level's three. The start room holds one monster of the level's first family, never a pack. A Fallen placement brings 2–4 more Fallen around it (packs of 3–5), on top of the usual counts.

### 8.3 Family table

| Family | D1 inspiration | Depth | Undead | hp | dmg | ac | toHit | xpMul |
|---|---|---|---|---|---|---|---|---|
| Rat (existing) | Scavenger | 1–8 | | 6 | 4–8 | 5 | 30 | 0.8 |
| Skeleton (existing) | Skeleton | 1–14 | ✔ | 8 | 5–10 | 10 | 35 | 1.0 |
| Slime (existing) | [OURS] | 2–12 | | 12 | 6–11 | 0 | 30 | 1.1 |
| **Zombie** | Zombie | 1–10 | ✔ | 12 | 5–11 | 5 | 25 | 1.1 |
| **Fallen** | Fallen One | 1–9 | | 5 | 3–6 | 5 | 30 | 0.7 |
| **Skeleton Archer** | Skeleton Archer | 3–14 | ✔ | 7 | 3–7 | 8 | 40 | 1.2 |
| **Bat** | Winged Fiend | 2–12 | | 4 | 3–6 | 10 | 35 | 0.6 |
| **Giant Spider** | Hellfire Arachnon / Spider Lord | 4–16 | | 10 | 4–9 | 15 | 40 | 1.4 |
| Goat Man (stretch, not built) | Goat Men | 8+ | | 20 | 4–9 | 25 | 40 | 1.6 |
| Hidden (stretch, not built) | Hidden | 6+ | | 15 | 3–8 | 20 | 35 | 1.5 |

Damage and to-hit for every family sit above D1 (about ×2 damage, +10 to-hit), the same uplift the first three families got in Phase 1; at D1-like values the heroes were almost never hurt. The v1 D1-like values of the new families were 2–5/15, 1–3/20, 1–4/30, 1–3/25 and 2–6/30.

**As implemented in Phase 8** [OURS unless noted]
- **Movement:** zombie speed 1.4 with a 0.8 s windup; Fallen 3.1; archer 2.3 (draw 0.6 s, 2 s between shots); bat 4.0 (0.25 s swoop); spider 3.6 (0.45 s leap).
- **Archers** hold 5–8 m, stepping back when the hero is closer, and shoot at up to 8.5 m with a clear line; very close they still shoot. Arrows fly at 11 m/s; to-hit is the monster's melee to-hit minus `2 × flight in 1/20 s`, at least 5 %; the hero's shield can block them (D1). Archers shatter into bones like skeletons.
- **Spiders** leap from up to 4.2 m (the windup is the pounce) and spit a web every 4–7 s at 4.5–8 m. The web uses monster magic to-hit (§8.5) and slows the hero 40 % for 2 s. From tier 2 a landed bite poisons: 2 % of max life per second for 3 s, ignoring Mana Shield.
- **Bats** weave across their line of approach and swoop down to strike; they still drop gold, never items.
- **Fallen** within 6 m of any monster's death flee for 1.5–3 s (D1).
- **Slimes** from tier 2 split into two half-size, half-HP slimes that do not split again.
- **Black Death** (zombie tier 3): each landed hit lowers the hero's max life by 1 for the rest of the run.
- **Subtype tiers** step every 4 depths after a family's first depth (max 3), add 15 % HP and damage each, and tint the model (spiders also grow 12 % per tier). Subtype names are data only for now; nothing displays them.
- **Corpses** of zombies, Fallen, bats, spiders and rats fall over and sink; skeletons, archers and slimes burst as before.

**Pacing simulation (Phase 8)** — AUTO from depth 1 to 9 (game time, depths 1–9, with the since-removed riser rule capped at 10 per level):

| Class | Reached depth 9 | clvl on reaching depth 2 / 4 / 6 / 9 | Deaths |
|---|---|---|---|
| Warrior | 38 min | 2 / 6 / 9 / 12 | 1 |
| Thief | 62 min | 2 / 6 / 9 / 12 | 45 (0 before depth 6, then 5, 10, 11, 19 per level) |
| Mage | 38 min | 2 / 6 / 9 / 12 | 19 |

Level pacing meets the targets: level 2 after depth 1, then about `depth + 2` (12 at depth 9). AUTO never spends attribute points, so these heroes are weaker than played ones. The Thief's deaths start at depth 6 and every one of depths 6–9 had spiders in that run; causes of death were not recorded, so spiders (whose leap and web counter kiting) are the likely but unconfirmed culprit.

| Family | Behaviour | Subtypes (tiers 0–3) |
|---|---|---|
| Rat | Fast, low mass | Rat, Sewer Rat, Plague Rat, Bloat Rat |
| Skeleton | Existing AI | Skeleton, Corpse Axe, Burning Dead, Horror |
| Slime | Slow, heavy. From tier 2, splits into 2 small slimes on death. | Ooze, Bog Slime, Acid Slime, Grave Jelly |
| **Zombie** | Very slow, long windup, hard hit. Tier 3 permanently costs −1 max life per hit (D1 Black Death). | Zombie, Ghoul, Rotting Carcass, Black Death |
| **Fallen** | Packs of 3–5. Flee 1.5–3 s when any monster within 6 m dies (D1 AI). | Fallen One, Carver, Devil Kin, Dark One |
| **Skeleton Archer** | Keeps 5–8 m away. Arrow with a 0.6 s telegraphed draw. Arrows can be blocked. | Archer, Corpse Bow, Burning Archer, Horror Archer |
| **Bat** | Erratic flight, swoop attack. **Never drops items** (D1). | Fiend, Blink, Gloom, Familiar |
| **Giant Spider** | Skitters fast and leaps from 4 m. Web spit slows the hero by 40 % for 2 s. From tier 2, poison deals 2 % maxLife/s for 3 s. | Cave Spider, Giant Spider, Venom Spider, Spider Lord |
| Goat Man (stretch) | Packs with a shaman leader that casts Firebolt | Flesh, Stone, Fire, Night Clan |
| Hidden (stretch) | Invisible (shimmer only) until within 3 m | Hidden, Stalker, Unseen, Illusion Weaver |

**Visuals**
- New families are procedural low-poly meshes, like `buildSkeleton` and `buildRat`.
- Subtypes reuse the family mesh with a material colour swap.
- `buildSpider()`:
  - Sphere body and abdomen.
  - 8 legs, each with 2 segments, using an alternating tetrapod gait.
  - 8 red emissive eyes.

### 8.4 Elite packs

- From depth 3, each level has a 20 % chance of one named elite, e.g. `Gutripper the Foul`.
- The elite gets 3× HP and +5 mlvl.
- It has one modifier: Fast, Stoneskin (+50 AC), Vampiric, Berserker (+50 % dmg), or **Spellcaster** (casts Firebolt or Lightning).
- 2–4 escorts accompany it. They share the modifier and have 2× HP.
- Its loot follows the unique-monster drop rules.

**As implemented in Phase 10** [OURS unless noted]
- **Placement:** the roll happens inside the level's seeded generation, so a level always has the same pack (saves rely on it). The pack stands in a random room other than the start and stairs rooms, and its family is one of the level's three. In 150 seeds at depth 4, 15 % of levels had a pack (some rolls find no free cell).
- **Stats:** the leader is rolled at depth + 5 for its mlvl, HP, damage and XP, but keeps the depth's subtype tier; it is 1.25× the size. Fast: movement ×1.5, windup and attack cooldown ×0.7. Vampiric: heals by the life each landed hit takes. Spellcaster: every 3–4 s, from more than 2.5 m with a clear line, casts straight-flying Firebolt or Lightning (per pack). Both use monster magic to-hit, can be blocked, deal the caster's normal damage, and fly at 5 and 14 m/s.
- **Look:** every pack member has a glowing aura in the modifier's colour. On first sight the leader's name and modifier toast plays; the boss bar shows "<Name> - <Modifier>" while the leader is aware and within 14 m (a boss takes precedence).
- **Loot:** the leader drops one item that is always magic (16 % unique), plus 3× a gold pile; escorts drop normally.

### 8.5 Monster spells

- Monster projectiles (Skeleton Archer arrows; shaman, elite, and boss spells) use the same projectile system as player spells (§5.5).
- Monster magic to-hit is `40 + 2·(mlvl − clvl)`. Hero AC does not apply.
- Arrows use the monster's melee to-hit, minus 2 × flight time in ticks.
- Resistances stay out of scope until monster spells are common.

---

## 9. Mini-bosses every 5 depths

Mini-bosses appear on depths 5, 10, 15, 20, … This replaces the current `depth % 3` rule.

**Placement and presentation**
- The boss guards the stairs room, as today (L1223).
- On first sight, a name and title toast plays, and the `#boss` bar shows.

**Roster cycle**
- The roster repeats every 4 bosses.
- On repeats the boss is prefixed "Ascended" and gets +mlvl from the depth formula.

| Depth | Boss | D1 inspiration | Mechanics | Guaranteed drop |
|---|---|---|---|---|
| 5 | **The Bone Warden** (reworked existing) | Skeleton King | Existing slam AOE. Raises 2 skeletons from bone piles at 66 % and 33 % HP. Undead, so Holy Bolt works. | 16 % unique roll, otherwise a magic item at ilvl mlvl+4. Also 2 potions, 1 Scroll of Identify, gold ×10. |
| 10 | **The Gorger** | The Butcher | Fast brute with a cleaver. Telegraphed line charge. Hitting a wall stuns it for 1 s. Arena: blood decals and hanging corpses. | Same as above, plus 25 % chance of *Widowmaker* |
| 15 | **The Brood Mother** | Spider Lord (Hellfire) | Web cone slows the hero. 4 egg sacs hatch 3 Cave Spiders every 8 s until destroyed. Below 50 % HP, leaps land in poison pools. | Same, plus 25 % chance of *Spinneret* |
| 20 | **The Ember Lich** | Lazarus / Diablo flavour | Undead. Teleports between 3 rune circles (`texRune`). Fires slow homing Firebolts (blockable). Summons 2 Burning Dead. Vulnerable for 2 s after each teleport. | Same, plus a guaranteed ring or amulet and a guaranteed book with qlvl ≥ 6 |

**Boss stats**
- `hp = 5 ×` the family-equivalent hp at `mlvl = depth + 2`.
- Damage is 1.5× the normal formula.
- **Tuned in Phase 1** down from 10× HP and 2.5× damage, because the hero has no gear yet. Retune in Phase 9 once items exist.
- `xpMul` is 8.
- Bosses stagger only when hit for `dmg ≥ mlvl + 3`, and at most once per 3 s.
- Bosses are immune to Stone Curse [OURS].

**As implemented in Phase 9** [OURS unless noted]
- **Stat basis:** each boss scales a family's stats: Bone Warden and Ember Lich from Skeleton, the Gorger from Zombie, the Brood Mother from Giant Spider. The ×5 HP and ×1.5 damage multipliers are unchanged (see the pacing note below). Ascended bosses (depth 25+) are named "Ascended …"; their extra strength is just the higher mlvl at that depth.
- **Presentation:** arriving on a boss depth toasts "<NAME> GUARDS THE STAIRS"; on first sight the name and title toast plays, and the `#boss` bar shows that boss's name.
- **Bone Warden:** raises 2 skeletons (current tier) out of the floor near itself on crossing 66 % and again 33 % HP, with a toast.
- **Gorger** (speed 3.2, `r` 0.7): charges when it sees the hero 3–10 m away along a clear line, ready on first sight and then every 5–8 s. It plants its feet for 0.8 s (red sparks, eyes flare), then runs at 11 m/s for up to 1.3 s. Reaching the hero, it makes a normal strike roll (blockable) and knocks the hero back. Running into a wall stuns it for 1 s. Arena: 9 blood pools and 3 corpses hanging on chains along the stairs room's edge.
- **Brood Mother** (the spider rig at 2.3× scale, dark violet with a red hourglass): leaps from up to 5.5 m, and every 6–8 s spits a cone of 5 webs (each a normal web: magic to-hit, 40 % slow). Below 50 % HP each leap leaves a poison pool (radius 1.6 m, 6 s) that poisons the hero standing in it. 4 egg sacs (3× a Cave Spider's HP, no attack, no drops) stand in her room; from 4 s after she first sees the hero, each hatches 3 tier-0 Giant Spiders ("Cave Spiders") every 8 s, at most 12 hatchlings alive. Arena: cobwebs in the room's corners and webs on the floor.
- **Ember Lich** (speed 1.3, 1.5× scale, robe, crown, staff with an ember): starts on one of 3 rune circles placed far apart in the stairs room. Every 6–8 s, or sooner when the hero gets within 2.2 m, it teleports to the circle farthest from the hero and is vulnerable for 2 s. Outside that window it takes 25 % damage (a faint ember glow). It fires a homing firebolt every 2–2.6 s at up to 12 m: 5 m/s, turns 1.6 rad/s (can be outrun sideways), monster magic to-hit, blockable, normal boss damage. Every 12 s it raises 2 tier-2 skeletons (Burning Dead) while fewer than 4 skeletons stand near it. It holds its ground and casts, fighting in melee only when the hero is within 2.4 m.
- **Drops:** as specified. The Lich's extra ring or amulet is always magic, never unique (a unique would bring its own base and break the guarantee). Its extra book is a uniform pick among books with qlvl 6 to ilvl.
- **Pacing (Phase 9 simulation, AUTO to depth 11):** players reach the Warden at clvl 7 and the Gorger at clvl 13. The Warrior died 0 times on depth 5 and 7 times on depth 10. The Thief and Mage die more throughout depths 6–10, mostly to normal monsters. AUTO never spends attribute points and never equips found gear (§14), so these runs fight bosses in starting gear and say little about boss strength for a real player. The multipliers stay as specified until there is play data.

---

## 10. UI and pixel art

### 10.1 Panels and pausing [USER]

| Key | Panel | Position |
|---|---|---|
| `C` | Character | left half |
| `I` | Inventory | right half |
| `B` | Spellbook | left half; replaces Character if it is open |
| (walk into Stash chest, town only) | Stash | left half, with Inventory forced open on the right |

- **While any panel is open, the game is paused.** The world update is skipped, as it is during a transition. Particles and lights are frozen too.
- `Space` or `Esc` closes all panels.
- AUTO's idle timer (`manualActive`) does not count paused time.

### 10.2 Inventory panel

**Layout**
- Paper doll with helm 2×2, amulet 1×1, weapon 2×3, armor 2×3, shield 2×3, and 2 rings at 1×1.
- Below the doll, the 10×4 backpack.
- At the bottom, a description box.

**Mouse**
- Left-click picks up or places an item, swapping with whatever is there, as in D1.
- Right-click on an item:
  - potion: drink
  - scroll: read
  - book: learn
  - elixir: drink
  - equipment: equip or unequip

**Keyboard and gamepad**
- [USER, after Phase 12] The keyboard cell cursor (arrow keys, `Enter`, `X`) was removed: the inventory, stash and shops are mouse-driven.
- `G` drops the held item on the ground.
- The gamepad path (`padAtkPrev`, L580) gets matching bindings.

**Identify target mode**
- Triggered by reading a Scroll of Identify or casting Identify.
- The cursor becomes a magnifying-glass icon.
- Only unidentified items are highlighted.
- Selecting one identifies it. `Esc` cancels, and the scroll is not consumed.
- Casting Identify with no unidentified items: `NOTHING TO IDENTIFY`, and no mana is spent.

**Styling**
- DOM panels with a 9-slice pixel frame drawn by `pixCanvas`.
- Dark stone background cropped from `texWall`.
- Cells are 28×28 px with 1 px separators.
- An item whose requirements are not met gets a red cell background, as in D1.

### 10.3 Pixel-art icons

**As reworked after Phase 12 [USER: "more pixels and more detail"; style choices OURS]**
- **Size:** icons are painted at **28 px per inventory cell**, twice the old 14 px. They are shown at one CSS pixel per art pixel, so items keep their size on screen with four times the pixels. The readied spell and skill buttons grew from 46 to 60 px, to show their glyphs at 2×.
- **Painter** (`src/art/painter.ts`): shapes (rods, balls, domes, bevelled polygons) are filled from a material's six-tone colour ramp. Each pixel's tone comes from lighting the shape's surface normal from the upper left, with a specular highlight on metal, glass and gems. Shadows lean cool and highlights warm. Tones are whole steps, never blended, so the result stays crisp pixel art.
- **Outlines:** every icon gets a 1 px outline tinted toward the material it borders, instead of flat black. Overlapping parts draw a dark seam where they meet, so they read as separate pieces.
- **Detail:**
  - Weapons: edges, fullers and two diagonal glints on blades, wood grain on hafts, spiral leather wraps on grips, rivets, recurved bow limbs with a string.
  - Armour: chain, ring, scale and splint patterns, quilting, laces, belts with buckles, pauldrons, skirt lames, and a helm crest and visor slits.
  - Shields: planks, rims, rivets, bosses; the kite shield has a heraldic cross and the gothic shield is fluted.
  - Jewelry: faceted gems in gold settings.
  - Potions: round or conical glass with a meniscus and bubbles; full potions have gold stoppers. Elixirs are caged vials.
  - Spell glyphs: drawn as glowing effects (flames, bolts, swirls) on a 28 px canvas.
  - Books: tooled gilt borders, spine bands, a clasp and the glyph on the cover. Scrolls: tied and sealed in the school colour.
- **Unchanged:**
  - Every base has its own icon, and magic items reuse it, as in D1.
  - Uniques get a gold outline [OURS].
  - School colours: fire red, lightning blue, magic purple, holy white, utility green.
- **Caching:** icons are painted once at startup (uniques on first use). They are shared by the inventory, stash, shops, belt and spellbook (`toDataURL`) and by ground sprites.
- **Ground sprites** are now mipmapped with an alpha cutoff of 0.3, because the larger icons cover only about 10 screen pixels per cell on the floor and would shimmer with nearest filtering.

### 10.4 Ground items

**Dropping**
- Items drop with D1's flip arc, using the `L.pickups` physics.
- They land as a **billboarded pixel sprite** about 0.1 above the floor.

**Glow**
- Magic items: blue `glowSprite`.
- Unique items: gold glow plus a borrowed `warmPool` light.

**Labels**
- Shown while `Alt` is held, or when the hero is within 2.5 m.
- Text colour: white for normal, blue for magic, gold for unique.
- An unidentified item shows its base name in its quality colour.

**Pickup [USER]**
- Gold, potions, and scrolls are auto-collected by the existing magnet.
- Other items are picked up on walk-over **only if the backpack has room**. They go straight into the backpack and **are never auto-equipped**.
- If the backpack is full, toast `BACKPACK FULL` and leave the item on the ground.
- `E` picks up the nearest item within 1.5 m.

### 10.5 Class models and equipped visuals

**Class models (required with Phase 6):** each class has its own procedural hero model (§3.1), built like `buildHero` (L1138). Each model has the same rig: `armR`, `shR`, `torso`, a weapon anchor, and a `flameAnchor`. That way `updateHero` and the attack and drink animations work unchanged.

**Weapon meshes (required):**
- Sword, axe, club, staff, and bow each have a mesh, attached to the weapon anchor.
- Bow attacks use a draw-and-release pose instead of the swing arc. They do not show `trailMat`.

**Stretch:**
- A helm mesh is shown when a helm is equipped.
- A shield mesh is shown when a shield is equipped.
- The `trailMat` colour follows the weapon's quality: blue for magic, gold for unique.

**As reworked after Phase 12 [USER: "more detailed and higher quality" models; design OURS]**
- **Modelling kit** (`src/actors/models/kit.ts`): models are built from shaped pieces instead of boxes and spheres: tapered limbs with rounded ends, lathed bodies, tapered tubes, bevelled boxes, extruded blades and plates, and flat membranes. Each piece bakes its colour and a cheap occlusion (darker toward its base) into vertex colours.
- **One mesh per surface:** each joint's pieces are merged per surface kind (roughness and metalness in coarse steps, sidedness, emissive, reflections). The merged geometry is cached per model and shared by every instance.
  - Materials are white per model instance and tinted by the vertex colours, so tier tints, hit flashes and the Ember Lich's ward still act on the whole model.
  - Stone Curse switches vertex colours off while it lasts, so a stoned monster is plain grey.
- **Detail scales with size:** a piece's segment count scales with its radius, and boxes too small to show rounding are plain.
- **Cost:** draw calls are on par with the old models (a crowd of 80 monsters: 2 530 vs 2 230 per frame; the Brood Mother's room: 1 690 vs 1 800). Models are 1 100 (bat) to 8 000 (hero) triangles; a skeleton is about 5 400.
- **Reflections:** metal, gems, shells and wet surfaces reflect a small procedural environment (dark stone, a warm band of torchlight, a faint cold sky).
- **Rigs unchanged:** every rig keeps its joints and pivots, so all animations are unchanged. The humanoid jaw is now a group; the zombie's head sits forward on a hunched neck.
- **Heroes:**
  - Shared by all classes: a shaped torso, belt and buckle, boots, a cloak with folds and a clasp, faces with nose, ears and brows, and hands.
  - **Warrior:** breastplate with a ridge, layered pauldrons, faulds, gorget, greaves, a nasal helm with cheek guards, and a red tabard with a gold border.
  - **Thief:** laced leather jerkin, chest strap, pouches, a dagger at the hip, wrapped shins, a hood with a mask, and a quiver with fletched arrows.
  - **Mage:** robe to the floor with gold hem and trim, sash, mantle, flared sleeves, beard, and a tall bent hat with band and buckle.
  - **Weapons:** a sword with fuller and curved guard, a crescent axe, a flanged mace, a staff with a clawed crystal head, and a bow with tapered limbs.
- **Monsters:**
  - **Undead:** skeletons have a pelvis, spine, rib cage, sternum, clavicles, shoulder blades, a skull with sockets, cheekbones and teeth, a jaw, and fingers. The skeleton carries a loincloth, a notched rusty sword and a round shield; the archer a hood, bow and quiver.
  - **Bone Warden:** breastplate, spiked pauldrons, a horned helm, a fauld skirt and a great axe.
  - **Ember Lich:** robe with gold trim and rubies, a hood, a gold crown, and a staff with a skull in gold claws.
  - **Zombie:** hunched and green, with a torn shirt, a gash showing ribs, and sparse hair.
  - **Fallen:** horns, long ears, a hooked nose, claws, a barbed tail, a loincloth and a spear.
  - **Gorger:** a belly with stitches, a leather apron soaked in blood, meat hooks and chains on the belt, boots, and a cleaver.
  - **Rat:** bristled spine, snout with whiskers and teeth, pink ears, paws with claws, and a ringed tail.
  - **Slime:** lumpy, glossy, sagging goo with drips, bubbles and a swallowed skull and coins inside.
  - **Bat:** membrane wings stretched between finger bones, big ears and fangs.
  - **Spiders:** jointed, banded and bristled legs, fangs, palps, an eye cluster, and a marked abdomen with spinnerets; the Brood Mother's markings form a red hourglass.
  - **Egg sac:** lumpy and translucent, with veins on its surface, hatchlings showing through, and web strands.
- **Townsfolk:** reworked in the scenery pass (§10.7).

### 10.6 Rendering [USER: "significantly improve the graphics"; choices OURS]

The look stays the same in kind: low-poly meshes drawn at half resolution, dithered to 30 levels, with the DOM HUD on top. Within that, the picture gained light, depth and atmosphere.

- **Pipeline:** scene (half-res, HDR, with depth) → bloom and scatter pyramids → ambient occlusion multiplied into the scene → one post pass (depth of field, mist, bloom, tonemap, grade, vignette, dither) → upscale.
- **Bloom:** pixels brighter than 2.0 (scene-linear, before exposure) glow, with a soft knee, blurred at 1/2, 1/4 and 1/8 of the scene. Flames, embers, spells, runes, portals, glows and lit windows pass the threshold; lit stone does not.
- **Ambient occlusion:** computed from the depth buffer (14 samples within 0.9 m, strength 1.6), blurred, and multiplied in. Occluded areas keep a little cold light. Glows are taken before it, so they are not dimmed.
- **Ground mist:** thickest at the floor, drifting slowly, and lit only by a wide blur of the scene around it. It glows near torches and stays black in the dark. Density 0.7 in the dungeon, 0.3 in town.
- **Shadows:**
  - The hero's torch casts shadows, as before.
  - The three warm lights nearest the hero (wall torches, braziers, lanterns) now cast shadows too, from 512-pixel cube maps refreshed in turn, one per frame.
  - The cold key light casts shadows from a 2048-pixel map covering 48 m around the camera: moon shadows from houses, trees and posts in town, and a darker floor behind walls in the dungeon. Its centre moves in whole texels so edges do not crawl.
- **Characters:** hero, monsters and townsfolk get a cool rim light on edges turned away from the camera, scaled by the light already on them, so they stand out without glowing in the dark.
- **Floors:** a roughness map gives flagstones and cobbles damp patches that catch torchlight.
- **Depth of field:** kept, but weaker; the sharp band around the hero is about twice as tall.
- **Town:** grass tufts (about 1 900), fireflies around the hero, and brighter windows.
- **See-through walls [USER, after Phase 12: "make the walls transparent instead"]:** wall blocks and pillars between the camera and the hero, within 17 m (fading out by 23 m), turn see-through with a screen-door dither, like D1's checkered walls. Whole pixels are dropped in a fixed pattern, up to 60 % of them (`WALL_FADE`, `render/materials.ts`). The amount follows the block's position relative to the hero smoothly, so walls thin out gradually as the hero walks along them. This replaces the earlier cut-away, which squashed those walls to 16 % of their height (20 % for pillars) and made them drop and spring back. Shadows still come from the full walls, as before.
- **Tuning:** the values above live in `POST` (`render/post.ts`).
- **Cost:** 60 fps held at 2560×1440 on the development machine (Radeon RX 7600), in town and in a boss room. There is no low-quality setting yet.

### 10.7 Scenery models [USER: "improve the barrels, boxes, townsfolk, buildings, well and trees in a similar manner"; choices OURS]

**As reworked after Phase 12.** Props, buildings, trees and townsfolk use the modelling kit of §10.5.

- **How props are built** (`world/propKit.ts`, `world/propModels.ts`, `world/townModels.ts`):
  - One shared palette (`PROPS`) holds every prop surface. Props never flash or tint, so their materials are shared.
  - Boxes are sharp by default. Only large stones, the house plinth and the chimney keep rounded edges.
  - Each model is built once per level session and cached. Builders take variation from a fixed hash, never from the level's random stream, so dungeon layouts are unchanged.
  - Placed props (`SK`) bake their transform into the level's static geometry, merged per surface and per 16 m square. The camera and each light's shadow pass then cull the squares out of reach.
  - Houses and trees stay instanced (per surface and per 16 m square), so they still fade out when the hero walks behind them.
- **Barrels:** 14 staves with dark gaps, four iron hoops, and a planked lid with a bung. Two stave colourings, chosen from the barrel's position.
- **Crates:** planks on every face, a frame board on every edge, a diagonal brace and iron corner caps. Two colourings.
- **Chests:** plank body, a curved planked lid with bands, corner brackets, feet, and a lock plate with keyhole. Iron-bound, or gold-bound for the key chest and the stash. The lid still hinges.
- **Well:** three courses of dressed stones with a cap, a dark shaft with water, a shingled gable roof on braced posts, a winch with a rope coil and crank, and a bucket on the rope.
- **Market stalls:** planked counter, posts, a striped awning with a scalloped edge. The red stall sells pottery; the green one has hanging herbs and potion bottles.
- **Workplaces:**
  - **Smith:** an anvil on a tree stump, and a brick forge with a glowing coal bed, hood and chimney, bellows and tongs.
  - **Witch:** an iron cauldron on three feet over a small log fire. [OURS] It no longer sits on a brazier.
  - **Sage:** a lectern with an open book and a lit candle.
- **Houses:**
  - Construction: a stone plinth, a timber frame (posts, rails, studs, braces) over plaster, gables with a king post, shingle rows, bargeboards, a ridge cap and a stone chimney.
  - Front: a plank door with iron straps, ring and step.
  - Windows: four lit windows with mullions, sills and open shutters; some have a flower box.
- **Trees:** two pine shapes (jagged, drooping tiers, lighter toward the top, flared roots) and the odd bare dead tree.
- **Palisade:** split-log stakes, sharpened and lashed with rope, on round rails.
- **Abbey:**
  - Entrances: pointed archways of dressed stones with a keystone.
  - Between them: stepped buttresses and a string course.
  - Battlements on both walls, and a rose window of coloured glass high on the back wall.
  - [OURS] The wall heights are now even (4.6 m front, 6.4 m back) so the battlements sit level.
- **Townsfolk:** the same rig and idle, rebuilt with faces like the heroes'.
  - **Smith:** bald and bearded, with rolled sleeves, a leather apron, trousers and boots, and a hammer.
  - **Witch:** ragged robe, shawl, pendant, long black hair, a crooked nose, a pointed hat with a bent tip, and a gnarled staff with a glowing orb.
  - **Healer:** a tonsure, a red sash with a cross, a rope belt, and a red flask.
  - **Sage:** cowl, long white hair and beard, and a staff with a gold ring.
  - **Peddler:** hood, cape, trousers and boots, a walking stick, and a framed pack with a blanket roll, a pan and a jug.
- **Cost, measured at the same run seed:**

  | Scene | Draw calls (old → new) | Triangles per frame, all passes (old → new) |
  |---|---|---|
  | Depth 1 | 1 900 → 1 870 | 521 k → 475 k |
  | Town | 460 → 810 | 445 k → 824 k |

### 10.8 UI style and layout [USER: "make the UI panels consistent and aligned, improve the menus, hide the key list unless the menu is open, a style that reflects a dungeon explorer"; choices OURS]

**As reworked after Phase 12**, after Diablo 1's interface:
- D1's side panels fill fixed halves of the screen and are framed in gold on stone.
- Values sit in recessed boxes, and labels are in a carved capital face (Exocet).
- Menus mark the selected entry with a pentagram on each side.
- A stone control panel holds the orbs, belt and panel buttons.

- **Shared parts:**
  - **Chrome** (`ui/pixel/frame.ts`, published as CSS variables): a pixel-art gold frame with a diamond-chain band top and bottom and corner studs; dark cracked flagstones as the fill; a red sigil for selected menu entries; the paper doll's silhouette.
  - **Styles** (`style.css`): `.frame` (panels, dialogs, control bar), `.plaque` (the same frame at half scale, for small HUD boxes), `.well` (a recessed box with a gold edge), `.btn` (a carved stone button), `.mItem` (a menu entry), `.field`/`.val` (a label and its value well), `.rule` (a gold separator).
  - **Components:** `Panel` and `Field` (`ui/Panel.tsx`), and `Desc` for item descriptions.
- **Type:**
  - Cinzel (bundled) for titles, labels, buttons and menu entries.
  - Cinzel Decorative for the flame-gradient logo.
  - The pixel font stays for numbers, item names and running text.
- **Side panels:**
  - Every side panel has the same size: 360 px wide and up to 600 px tall, from 12 px below the top edge.
  - Left column: character, spellbook, stash and shops. Right column: inventory.
  - Each has a title plaque with a close button, a body, and its key hints in a fixed-height footer, so footer rules line up across the two columns.
  - Description wells sit at the bottom of their panel, so the inventory's lines up with the stash's or shop's.
- **Character panel:** class, level, experience and next level in wells; then attributes with base, now and the + buttons; then the points to spend; then combat stats in two columns. [OURS] Critical is always listed (0% for classes without it), so the grid stays fixed.
- **Control bar** (D1's control panel), at the bottom centre, left to right:
  - CHAR (with the level-up badge) and MENU buttons;
  - the life orb in a gold socket;
  - the belt above the experience bar;
  - the class skill and the readied spell;
  - the mana orb;
  - INV and SPELLS buttons.
- **Top of the screen:** a plaque with gold, kills and depth (and the key) at the top left. At the top right, a plaque with AUTO or YOU and "ESC MENU".
- **Key reference:** [USER] it is shown only in the Esc menu, beside the menu entries, grouped as dungeon, panels and inventory.
- **Menus:**
  - Title screen and class select: the logo over the town, then one framed dialog with two boxes.
    - **Title screen:** the chosen hero's details, and the list of heroes.
    - **Class select:** the class list and blurb, and the class's attributes, life, mana and skill. The name entry joins the second box on the second step.
    - Below the boxes: text actions (CONTINUE / NEW HERO / DELETE, or OK / START / BACK), then a footer with the keys.
    - Class select also takes Up and Down.
  - **Esc menu:** RESUME, DAMAGE NUMBERS, SOUND, SAVE AND QUIT, with sigils on the selected entry, and the controls.
- **No keyboard cursor:** [USER] the blue keyboard cursor in the inventory, stash and shop list is gone, along with arrow-key inventory control (§10.2).
- **Also restyled:** the boss bar (a plaque above the control bar), the toast (carved capitals), the sound prompt (a plaque), ground labels (a thin gold edge), and PAUSED (carved capitals, hidden while the menu is open).

---

## 11. Death [USER]

The target behaviour, once the town exists:
1. All carried items and all gold drop on the ground where the hero died.
2. The hero respawns in town.

**Until the town exists** (Phases 7–10; since Phase 11 the hero wakes in town, §13, and the respawn rules below no longer apply):

**Drop**
- Everything drops at the death spot:
  - all equipped items
  - backpack contents
  - belt contents
  - all gold, as one gold pile
- Items scatter within 1.5 m using the drop arc.

**Marker**
- The death spot gets a **grave marker**: a small bone-pile prop plus a cold blue beacon light from `coldPool`.
- The marker shows through the wall-cut, so the hero can find it again.

**Respawn**
- The hero respawns at the **start of the same level**, with full life and mana.
- **The level is not regenerated.** This is a change from today's `buildLevel(depth)` in the death transition (L1754–1755).
- The hero keeps clvl, XP, attributes, and known spells.

**Monsters after respawn**
- Monsters keep their current HP and positions.
- Aware state is cleared.
- Monsters within 6 tiles of the start room are pushed back to their `home`.

**Recovering items**
- Walking onto the pile collects the gold.
- Equipment is picked up through the normal backpack rules (§10.4).
- **[OURS]** When the backpack is empty and the paper doll is bare, recovered equipment goes back into its **previous equipped slot** if the requirements are still met. This restores the hero in one pass and is not auto-equipping new loot.

**If the hero dies again**
- Another pile is created at the new death spot.
- Earlier piles stay where they are.

**Unarmed fallback [OURS]**
- Without a weapon, the hero deals `1–2 + Str·clvl/100` damage.
- The sword mesh is hidden.

**As implemented in Phase 7** [OURS unless noted]
- Belongings drop the moment the hero dies (during the death animation), gear tagged with the slot it was worn in. Gold is split over up to six coins.
- The marker is a small bone pile with a pulsing blue beacon drawn over walls, plus a cold pooled light. It disappears, with `BELONGINGS RECOVERED`, once every pickup from that pile is gone.
- Recovered gear goes back into its old slot whenever that slot is free and the hero meets its requirements; otherwise it follows the normal belt/backpack rules.
- The old "free Potion of Healing after death" stopgap is removed.
- Spells and arrows in flight vanish on respawn.
- **AUTO** goes for its own grave before anything else, fighting only monsters within 2.5 m of its path. Items it cannot carry (full backpack) or reach stay behind. On the stairs, AUTO descends after 2 s even when warned; the player must step off and on again.
- **As changed in Phase 9** [OURS]: AUTO gets 60 s to reach a grave pickup (other pickups: 8 s), then retries it 20 s later. It gives a pickup up only after 3 failed attempts, and does not head for the stairs while any grave pickup is still worth recovering. Before, an 8 s limit made AUTO abandon its gear for the rest of the run after one death far from the start room.

**Leaving the level** (taking the stairs down) with piles still on the floor:
- The level's delta is saved with the piles on it (Q7, §12.2). They stay where they are.
- A confirmation toast warns before leaving: `YOUR BELONGINGS REMAIN HERE`. Since Phase 11 the level can be reached again by up-stairs, town entrances or Town Portal (§13), and this applies to every exit.

---

## 12. Persistence and seeded levels [OURS]

### 12.1 Seeded levels

- Each level gets a seed.
- `generateLayout`, `decorate`, and the monster spawns draw from a seeded PRNG (`mulberry32`) instead of `Math.random`.
- Combat and loot rolls use the separate session-seeded `rollRng` (§2.1), so they don't disturb the layout sequence.
- This is required for saving mid-level. It is also required for the planned town, because leaving a level and coming back must rebuild the same layout.
- **As implemented in Phase 7:** `G.runSeed` is drawn once per page load; each level's seed is `deriveSeed(runSeed, depth)` (a 32-bit hash). `buildLevel` runs generation (layout, decoration, floor and wall detail, monster spawns including their HP rolls) inside `withRng(mulberry32(seed))`; everything else draws from a session roll stream. Rebuilding a depth in the same run gives the identical level (tested in `tests/world/layout.test.ts` and in the browser).

### 12.2 Save file

Saved to `localStorage['dv.save.v3']`. There are up to 6 character slots:

```js
{ characters: [ { id, cls, name, depth, levelSeed, hero: { stats, equip, backpack, belt, gold, slain },
                  levels: { [depth]: { seed, groundItems, gravePiles, deadMonsterIds, openedChests, unlockedDoor } },
                  town: { groundItems }, stash: { grid }, uniquesFound } ],
  lastPlayed: id }
```

**Level deltas [USER Q7]**
- Every visited level keeps its seed and its delta.
- Items left anywhere stay there: on any dungeon level, and in town.
- Deltas are small, but `groundItems` per level is capped at 200 to bound storage. When the cap is hit, the oldest **normal-quality** items are removed first.

**When it saves**
- On descent.
- On death.
- On closing the stash.
- Every 30 s while unpaused.

**On load**
- The title screen lists characters, showing class, name, clvl, and depth.
- Choices are `CONTINUE`, `NEW CHARACTER` (opens class select, §3.1), and `DELETE`.
- `CONTINUE` rebuilds the layout from `levelSeed` and reapplies the level delta.

**As implemented in Phase 10** [OURS unless noted]
- **Format:** each character stores its `runSeed` (every level's seed derives from it, §12.1) instead of per-level seeds. It also stores the hero's position, life and mana, so a reload continues mid-level. The town and stash parts of the format arrive with Phase 11.
- **Level delta:** floor items and gold (oldest normal-quality items dropped first beyond 200), grave piles, killed generated monsters (by spawn order in generation), opened chests and bookshelves, broken barrels (absent in older saves, read as none), disarmed traps, the unlocked door, and visited rooms. Living monsters come back at full health where they were generated; monsters added later (boss summons, hatchlings, slime splits) are not saved.
- **When:** at the end of the descend and death transitions, every 30 s of game time, on Save and Quit, and when the page is hidden or closed (`pagehide`, `visibilitychange`), so a reload loses nothing.
- **Title screen:** on start-up it lists the characters, last played first. Up/Down choose, Enter continues, N starts a new character (class select, disabled at 6), Delete asks to confirm with Y. With no characters the game opens class select directly; Esc in class select goes back to the title.
- **Game menu (Esc):** Resume, Damage Numbers on/off, Sound on/off, Save and Quit to Title. It pauses like every panel. Settings live in `localStorage['dv.settings']`, apart from characters.
- **Layout version [USER, after Phase 12]:** each character stores the generator its level deltas were recorded on (`layout`; absent = 1, the generator before room styles; now 2). A save from an older generator rebuilds its levels with the new layouts and keeps only what lay on the floor there, graves included. Kills, opened chests, broken barrels, disarmed traps, the unlocked door and explored rooms start over; the town keeps everything.
- **Relocation:** floor items, graves and a Town Portal end restored onto a cell that is now rock move to the centre of the nearest walkable cell (`openSpot`). A hero saved inside rock starts at the start room, as before.

### 12.3 Level layouts and room styles [USER, after Phase 12; choices OURS unless noted]

After D1, whose four dungeon types each had their own generator:
- **Cathedral:** a spine of large rooms, smaller rooms budding off it, four-pillar chambers and wide halls.
- **Catacombs:** recursive area splitting.
- **Caves:** grown and smoothed blobs.
- **Hell:** mirrored blocks.

Ours mixes room styles within every level instead (`world/layout.ts`).

- **Map:** 52×52 tiles (was 46×46) holding 7–10 rooms (was 6–8), at least 3 tiles apart.
- **Room styles:**

  | Style | Size (tiles) | Notes |
  |---|---|---|
  | `room` | 4–7 × 4–6 | The old rectangle; four pillars when 6 × 5 or larger, 70 % of the time |
  | `cell` | 3–4 × 3–4 | Never the start room (no space for the up stairs) |
  | `gallery` | 10–13 × 3–4 | Long and narrow, either way round |
  | `hall` | 8–11 × 6–8 | D1's pillared chambers: two colonnades, a pillar every 3 tiles |
  | `lshape` | 6–9 × 6–8 | A corner quadrant removed, leaving arms 3–4 thick |
  | `cross` | 7–9 × 7–9 | Two crossing bars, 3 thick |
  | `octagon` | 6–9 square | Corners cut diagonally (by 2, or 3 from 8 tiles); four pillars from 8 tiles |
  | `cave` | 8–12 × 7–10 | Random fill in an ellipse with a solid core, 3 rounds of a cellular automaton, the largest 4-connected part (≥ 16 cells); rock walls and an earth floor |

- **Mix by depth [USER: "more halls and caves deeper"]:** weights `room 30, cell 12, gallery 10, lshape 12, cross 8, octagon 8, hall 6 + 0.75·d, cave 3 + 1.25·d`, with `d` the depth capped at 16. Every style can appear at any depth. By weight, halls and caves are about 12 % of rooms at depth 1 and 34 % from depth 16.
- **Stairs room:** always a `room` (at least 5×5), `hall` or `octagon`, so boss arenas keep their space and the locked door's row or column is full. The first room placed is always one of these; the stairs room is the one of them farthest from the start.
- **Corridors:** as before (A* with turn costs, a minimum spanning tree plus up to 3 extra links), but 35 % of links are dug two tiles wide (D1's halls), always widening on the same side. The locked door's corridor stays narrow. Wooden doors and swinging blades keep to the narrow ones.
- **Rooms in code:** a room keeps its bounding box and gains its style (`shape`) and floor `cells`; its centre (`cx`, `cy`) is the floor cell nearest the middle of the box. Decoration, monster and elite placement, the up stairs, boss arenas and AUTO's room targets all work from the cells:
  - wall features go on cells with a wall on that side;
  - clutter goes on cells with any wall beside them;
  - braziers and moonlight go on cells without one.
- **Caves:** no banners or prison alcoves. Wall blocks bordering a cave are rough rock, each a little wider (up to 16 %), taller or lower (0.8–1.3×) and turned (up to ±0.18 rad).
- **Monsters:** one per 12 floor cells as before; a room of 60 cells or more holds up to 6 (others 4).
- **Checked:**
  - Tests: over 18 depth/seed pairs, room cells match the tile map, every walkable tile is reachable, and the stairs room is reachable only through its door; all eight styles appear at depths 1 and 14, with halls and caves at least 1.5× as common at depth 14.
  - Simulation: AUTO cleared depths 1–16 and 20 (every boss, the Ember Lich twice) in 170–400 s of game time each.

---

## 13. Town [USER]

**Scope (Phase 11) [USER Q13]:** the town, the stash, travel between town and dungeon, and Town Portal. Merchants (potions, Scrolls of Identify, basic equipment, books), a Cain-like identify service, and Repair/Recharge come in a later phase.

**The town [OURS]** is depth 0: a fixed, hand-built walled square, the same on every run. It has no monsters and no traps.
- A courtyard of about 24×18 tiles, with a well in the middle, a few house blocks, braziers, barrels, crates and banners. Moonlight shafts stand in for open sky, and ambient light is brighter than in the dungeon.
- Fixed spots: the **stash** chest (§13.1), the **dungeon entrances** along one wall, the **portal** spot, and the **respawn** point by the well.
- **Items dropped in town stay there [USER Q7]:** the town keeps a level delta like any dungeon level (depth 0 in the save).
- **New characters start in town [OURS, as in D1]**, and the class select stands in the town.

**Dungeon entrances [USER Q14, D1-like]**
- An entrance to depth 1 is always open.
- An entrance to depths 5, 10, 15, … opens once the character has reached that depth (`deepest`). Unopened ones show as a sealed grate.
- Each entrance is labelled with its depth, and stepping on it leads to that depth's start room.

**Up-stairs [USER Q16]:** every dungeon level has up-stairs in its start room.
- Up-stairs lead to the level above, arriving next to its down-stairs. Depth 1's up-stairs lead to town, arriving at the depth 1 entrance.
- Down-stairs work as before.
- Leaving a level that still has grave piles, by any stairs or portal, warns once (§11).

**Town Portal [USER Q15, D1]:** Learn Int 20; mana 35, −3 per slvl, at least 18; book qlvl 3; scroll qlvl 4.
- Cast in the dungeon, it opens a blue portal at the hero's feet and a matching one at the town's portal spot.
- Stepping into either portal travels to the other one. Returning to the dungeon through it closes the pair.
- Only one pair exists at a time; casting again moves it. In town the spell fizzles.
- The portal is saved with the character.

**Death [USER Q5]:** belongings drop at the death spot under a grave marker (§11), and the hero wakes in town at the respawn point with full life and mana. The "until the town exists" respawn rules of §11 no longer apply.

**AUTO in town:** AUTO never uses the stash.
- It leaves town through an open portal if there is one. Otherwise it takes the deepest open entrance at or above its target depth: the depth of its deepest grave, else the deepest depth reached.
- In the dungeon it plays as before and never takes up-stairs.

**Save (§12.2):** each character adds `deepest`, `portal` (depth and position), and `stash` (grid and gold). The town's delta is `levels[0]`.

**As implemented in Phase 11** [OURS unless noted]
- **Town map:** 30×26 tiles: a 24×20 square, four 3×3 house blocks, six entrances along the north for depths 1, 5, 10, 15, 20 and 25 (no deeper shortcuts). The square holds the well with the respawn point just south of it, the stash, five braziers, two closed market stalls (where merchants will stand) and six lantern posts. Its props draw from a fixed seed. The HUD shows `TOWN`.
- **Outdoor look (after Phase 11) [OURS]:** the town is drawn as open ground under the night sky, not as a dungeon chamber.
  - **Ground:** grass with cobbled streets (before the abbey, a north–south avenue, a cross street and the stash square), stretching 9 tiles past the map so the square sits in open land.
  - **North:** the ruined abbey façade, two rows of tall stone with archways and buttresses, with the dungeon stairwells at its foot.
  - **Other sides:** a palisade of sharpened stakes; about 70 pines beyond it and two inside.
  - **Houses:** timber-framed with plaster, shingled gable roofs, lit windows (each with a warm light) and doors facing the well.
  - **Light:** a brighter, bluer moon (key light 3.4 against 1.5) with a night-blue background.
  - **Fading:** houses and trees fade with a screen-door dither when the hero walks behind them (dungeon walls do the same since §10.6's see-through walls).
  - **Removed:** the ceiling-grate moonbeams and the side-wall torches.
- **Exits** are one system on every level: down-stairs, up-stairs, town entrances and portals. Stepping on one (the player) leaves at once. AUTO only uses the exit it is heading for. With a grave pile on the level, the first step warns (`STEP ON AGAIN TO LEAVE`). Leaving by the down-stairs still restores a fifth of max life. Labels name exits within 5 m (`DEPTH 5`, `DEPTH 10 - SEALED`, `UP TO TOWN`, `PORTAL TO DEPTH 3`), and the stash.
- **Up-stairs:** a new tile (7). The hero can walk on it, monsters cannot, and the floor is drawn. It sits on an edge cell of the start room with a wall behind it, away from the room's openings and the start landing. It is drawn as four steps rising into a dark archway.
- **The key belongs to its level:** whenever a level is rebuilt with its key chest open and its door still locked, the hero holds the key. Leaving through a portal and returning keeps it, and saves no longer store it.
- **Town Portal:** the portal opens 1.4 m in front of the hero, or at the hero's feet if that spot is blocked. Arriving through a portal puts the hero on the other end, which works only after stepping off and on again. Scrolls of Town Portal need no Int, as in D1. AUTO never casts or reads it.
- **Stash:** walking into the stash opens it, only when the player is moving the hero (never in AUTO); it opens again after stepping away. Click to pick up, place or swap. Right-click sends an item across: stash to backpack, or backpack to stash while the stash is open. `DEPOSIT` and `WITHDRAW` move all gold. Closing the stash saves.
- **Pacing (AUTO from a new character to depth 6):** all classes arrive at clvl 8–9. On dying (Thief at depth 4, Mage four times at depth 5), AUTO woke in town, walked back down through its cleared levels (about 30 s each) or took the depth 5 entrance, and recovered its grave.

### 13.1 Stash [USER]

- **The Stash** is a large iron-bound chest in town, built as a bigger, gold-trimmed `makeChest` (L799).
- Walking into it opens the **stash panel**:
  - The stash grid is on the left and the inventory on the right.
  - The game is paused, like every panel (§10.1).
- **Grid [OURS]:** 10×10 cells. D1 has no stash; this size matches D2R's stash.
- Items move between the stash and the backpack the same way they move within the inventory: click to pick up or place (with swap).
- Gold can be deposited and withdrawn as a single counter, which shows the stash's gold.
- Unidentified items keep that state inside the stash.
- **Persistence:** the stash is saved with the character (§12.2). It survives death, because only carried items drop.
- **The stash belongs to one character [USER Q9].** Each character has their own stash, so items cannot be passed between characters through it.

### 13.2 Merchants and the sage (Phase 12)

D1's town has four shopkeepers, plus Wirt. They sell, buy and identify; Griswold also repairs and Adria recharges, but those need durability and charges, which we don't have.

| D1 NPC | Ours [Q17] | Sells | Buys | Service |
|---|---|---|---|---|
| Griswold (blacksmith) | **The smith** | basic (normal) and premium (magic) weapons, armor, shields, helms, jewelry | weapons, armor, shields, helms, jewelry | — (repair: no durability) |
| Adria (witch) | **The witch** | unlimited mana potions, Full Mana, Scrolls of Town Portal, **Scrolls of Identify** [OURS, per §13 hooks]; 7–14 random books, scrolls and staves | books, scrolls, staves | — (recharge: no charges) |
| Pepin (healer) | **The healer** | unlimited Healing and Full Healing potions, Rejuvenation; 7–14 random potions | nothing | heals the hero to full for free on each visit |
| Cain (elder) | **The sage** | nothing | nothing | identifies any item for **100 gold** |
| Wirt (peddler) | **The peddler [Q18]** | one premium item at 150 % price; 50 gold to look | nothing | — |

**Prices (D1, Jarulf §3.1–3.6)**
- **Potions:** Healing 50, Full Healing 150, Mana 50, Full Mana 150, Rejuvenation 120, Full Rejuvenation 600. Elixirs are never sold (they stay dungeon finds).
- **Scrolls and books:** the D1 table, e.g. Identify scroll 100; Town Portal scroll 200, book 3 000; Firebolt book 1 000; Healing scroll 50, book 1 000; Lightning scroll 150, book 3 000; Fireball scroll 300, book 8 000; Mana Shield scroll 1 200, book 16 000; Chain Lightning scroll 750, book 11 000. Our Identify book has no D1 price: **[OURS] 5 000**.
- **Base items:** the D1 price column of each base (e.g. Dagger 60, Buckler 30, Short Bow 100, Rags 5, Quilted Armor 200). Rings and amulets have no normal version, so only magic prices apply.
- **Magic items:** D1's formula (devilutionX `CalcItemValue`): `value = add₁ + add₂ + (mult₁ + mult₂) · I`, where `I` is the base price. Each affix's `add` is interpolated by roll position between its D1 `minVal` and `maxVal` in whole percent (`PLVal`); two-effect affixes (Sharp … King's) use their damage roll. Every one of our 89 affixes matches a D1 affix by name, so all use D1 data (`item_prefixes.tsv`, `item_suffixes.tsv`).
- **Uniques [OURS]:** each positive property is priced as the D1 affix of the same stat whose range is nearest its value, summed by the same formula, ×1.5. Properties with no D1 counterpart (flat AC, crit multiplier) and negative ones add nothing. Uniques are never sold by merchants, only bought from the player.
- **Unidentified magic and unique items** are priced at their base item's price (D1). Identify first to sell high.
- **Selling:** merchants pay **¼ of the price** (D1), rounded down, at least 1. Gold has no cap (our gold is a counter, not inventory cells).

**Stock**
- **Item level:** basic stock (smith's basic, witch, healer) uses D1's single-player `ilvl = clamp(deepest + 2, 6, 16)`. The smith's premium slots use `clvl + [−1, −1, 0, 0, +1, +2]`, at most 30, with base qlvl in [ilvl/4, ilvl] and affix qlvl in [ilvl/2, ilvl] (D1).
- **Basic stock (D1):** the smith has 10–19 normal items, never staves or jewelry, with bows drawn at double weight. The witch and the healer each have 7–14 random items beside their unlimited ones.
  - **Witch:** books (book qlvl ≤ ilvl), scrolls other than her fixed ones, and staves. A staff turns magic with the dungeon chance, with affixes from [ilvl, 2·ilvl].
  - **Healer:** Potions of Rejuvenation and Full Rejuvenation (from qlvl 7), and Scrolls of Healing.
  - **Picking:** the random items are drawn uniformly among eligible bases, then grouped by kind, slot and price (D1 `SortVendor`).
- **Premium stock:** 6 magic items at the smith (D1 Diablo, not Hellfire's 15), never staves, identified.
- **Value caps (D1):** the smith never offers an item worth over 140 000; the peddler never one over 90 000 (rerolled until under).
- **Restocking (D1):** basic stock and the witch's and healer's random items renew each time the hero comes up from the dungeon, by any way including death. A bought premium item is replaced at once at its slot's level. For each level gained, premium items 2–4 move down to slots 0–2, item 5 moves to slot 4, and slots 3 and 5 are rerolled. The peddler brings a new item after his last one was bought and the hero has been down again, or when the hero reaches an even level. Level changes apply when someone in town is next spoken to.
- **Uniques:** shops never stock uniques, and stocking does not touch `uniquesFound`.
- **Saving [USER Q19]:** the smith's basic and premium stock and the peddler's item are saved with the character. The witch's and healer's random items are not: loading a character rerolls them, as in D1 single player. Their fixed (unlimited) items never change.

**Interaction and UI**
- **NPC figures:** each stands at a fixed spot in town with a name label, on the hero model rig with its own clothing and a slow idle. The smith stands by an anvil and forge at a market stall, the witch at a stall with a cauldron, the healer by the well, and the sage by a lectern near the stash.
- **Opening a shop:** walking into an NPC (player-driven movement only, like the stash) opens the **shop panel** on the left and the inventory on the right, pausing the game. The sage opens the inventory in identify mode, paying 100 gold per item, and keeps it open for more.
- **Shop panel:** a list of rows (icon, name in quality colour, price). The price is red when the hero can't afford it, or grey with `NO ROOM` when it wouldn't fit. Hovering shows the usual description box. Click buys.
- **Selling:** with a shop open, right-click on a backpack item sells it to a merchant who buys that kind. The description box shows `SELLS FOR n GOLD` or `THE SMITH WILL NOT BUY THIS`. Equipped items must be unequipped first (D1).
- **Bought items** go to the backpack (potions and scrolls to the belt first, by the usual pickup rules).
- **AUTO never trades** [USER, §14]: trading is a player decision. The healer's free heal still applies whenever the player walks up.

**Decisions [USER]:** Q17 original names with roles; Q18 the peddler is included; Q19 reloading rerolls the witch's and healer's random items, as in D1 single player (the smith's and peddler's stock is saved).

**As implemented in Phase 12** [OURS unless noted]
- **Names:** Halvard the Smith, Morwen the Witch, Aldric the Healer, Tobias the Sage, Pip the Peddler. Their names float over them within 5 m.
- **Places:**
  - **Smith:** north of the red market stall, with an anvil on a stump and a stone forge.
  - **Witch:** south of the green stall, with a bubbling cauldron.
  - **Healer:** beside the well.
  - **Sage:** with a lectern and open book, west of the stash.
  - **Peddler:** with his crates, near the abbey street.
- **Figures:** a simple standing rig in role clothing (apron and hammer; pointed hat and staff; white robe, red sash and satchel; long beard and staff; hood and backpack). They breathe and sway, and turn their heads toward the hero within 6 m. Their tiles block movement.
- **Trigger:** walking within 1.5 m (player-driven only) opens them, once until the hero steps away, like the stash.
- **Keys:** with a shop open, Left from the backpack's first column enters the shop list, Up/Down move, Enter buys, and Right returns. Tab switches the smith between BASIC and PREMIUM.
- **Panels:** closing the shop or the inventory closes both and saves.
- **Healer:** restores life (not mana) and clears poison on every visit where life is below full. Black Death's lost life is not restored (D1).
- **Sage:** with nothing unidentified carried, he only says so. He needs 100 gold to begin, and identify mode ends when the gold runs out or nothing unidentified is left.
- **Peddler:** shows `"I HAVE SOMETHING SPECIAL. 50 GOLD JUST TO LOOK."` until paid. The fee holds until the item changes.
- **Selling:** sold items' gold is added at once; selling is refused for kinds the merchant does not buy. Nobody buys potions or elixirs (D1).
- **Saves from Phase 11 or earlier:** they have no shop stock; continuing one stocks the shops fresh.

---

## 14. AUTO mode

AUTO keeps playing well and never makes the player's decisions.

| Action | AUTO does it? |
|---|---|
| Pick up gold, potions, scrolls, items | Yes. Items go to the backpack if there is room. Ground items become `pick` goals in `chooseGoal`. |
| Recover its own grave pile | Yes, top priority after respawning |
| Break barrels | Yes. An intact barrel counts like an unopened chest when AUTO chooses where to explore. AUTO walks to the reachable cell beside it (nearest by walk plus reach, sides before corners), then straight at it, and swings. It breaks the barrel anyway after 25 s, as with a chest. |
| Drink from the belt | Yes. Healing below 50 % life [OURS, Phase 9; was 35 %]; Full Healing first below 20 %. A Mage drinks mana below 25 % mana. The belt comes first, then the backpack [OURS, Phase 9]: a belt full of mana potions used to hide every Healing potion from a Warrior or Thief. |
| Fight in the class style | **Warrior:** melee, as today. **Thief with a bow:** keeps 4–7 m from the target, steps back when a monster closes within 3 m, and fires when the target is in the aim cone. **Mage:** casts the readied attack spell whenever mana allows, kites like the Thief, and only uses melee when out of mana. |
| Cast the readied spell | Yes, if it is an attack spell and a target is in range. The Warrior and Thief need mana above 50 % first; the Mage needs only enough mana for the cast. It casts Healing if that is readied and life is below 35 % with no healing potions left. It never casts Fire Wall, Phasing, Stone Curse, or Identify. |
| Use the class skill | **Warrior:** War Cry when 3 or more monsters are within 4 m, or when a boss is in melee range. **Thief:** Disarm Trap on a trap in its path, if the chance is at least 50 %. **Mage:** Mana Surge when mana is below 20 % and life is above 70 %. |
| Avoid bosses until healthy | Yes. It waits outside aggro range while life is below 60 % and potions remain. |
| Allocate points, equip, read books, identify, drop items, use the stash | **No** [USER] |

---

## 15. Delivery phases

Each phase ships playable and is verified in the browser before the next starts. Phases that touch `src/rules` also add or update Vitest tests for those formulas.

| # | Phase | Contents | Acceptance |
|---|---|---|---|
| 0 | **Port to TypeScript** | §2.1:<br>`git init` and commit the legacy `index.html`.<br>Scaffold Vite, TS, Preact, Vitest, and ESLint.<br>Port the legacy code module by module into the §2.1 layout, **without changing behaviour**.<br>Move HUD and toasts to Preact.<br>Self-host the font.<br>Move to the fixed-step loop.<br>Add seeded `Rng` plumbing; levels may stay unseeded until Phase 7.<br>Delete the legacy `index.html` once at parity. | In `npm run dev`, the game looks and plays like the legacy build: same lighting and post-processing, traps, chests, key and door, Bone Warden, toasts, sound, and AUTO clearing depths 1–3. No console errors. `npm run build`, `npm test`, and `npm run lint` are clean. No runtime CDN requests. |
| 1 | **Stats and XP** | §3.2–3.4, `CLASS` table with Warrior data only, `recompute`, orbs, D1 combat formulas, XP and levels, level-up, character screen, panel pause (§10.1) | About 35 depth-1 kills reach level 2. Spending points changes AC, To-Hit, Damage, Life, and Mana as the formulas predict. Misses, blocks, and crits are readable. Opening `C` pauses the game. AUTO clears depths 1–5. |
| 2 | **Potions and belt** | §7 | Keys 1–8 drink. Pickup fills the belt first, then the backpack. AUTO survives on belt potions. The old potion code is removed. |
| 3 | **Items and inventory (normal)** | §6.1, §6.3, §6.6, §10.2–10.4 | About 10.7 % of kills drop an item. Ground sprites and labels show. Grid placement, swaps, equip, and requirements work. Picking up never equips. |
| 4 | **Magic and unique items + identification** | §6.2, §6.4, §6.5; Scroll of Identify | A headless simulation of 10 000 drops at ilvl 10 gives about 20 % magic and 0.4 % unique. Unidentified items hide their properties but still apply them. A scroll identifies one item. Names are correct. Each unique appears at most once. |
| 5 | **Spells, books, scrolls** | §4, §5: spellbook panel, readied spell and `Q`, F5–F8, every spell in §5.2, bookshelves, Identify book | Books teach spells and raise slvl when Int is high enough, and are refused otherwise. Scrolls cast without mana and can sit on the belt. Holy Bolt only hurts undead. Fire Wall can burn the hero. Mana Shield routes damage to mana. The Identify spell works. |
| 6 | **Classes** | §3.1, §3.1a, §1.1a: Thief and Mage data, class select screen, Thief and Mage models, bows and arrows, staves, class kits, class skills (War Cry, Disarm Trap, Mana Surge), class AUTO behaviour (§14), weapon meshes (§10.5) | Each class starts with its D1 stats and kit. Derived stats match §1.1 per class. Swing and cast times differ per class. A Thief with a bow clears depths 1–3 in AUTO by kiting. A Mage clears depths 1–3 in AUTO with Charged Bolt and mana potions. `R` triggers each class's skill with its cooldown shown. War Cry stuns nearby normal monsters. Disarm Trap disables spike and blade traps at the formula's rate. Mana Surge converts life to mana and never kills. |
| 7 | **Death and seeded levels** | §11, §12.1 | Dying drops everything plus gold in a marked pile and respawns the hero at the level start in the same layout. The pile can be recovered. Descending warns while piles remain. |
| 8 | **New monsters** | §8 | Each family's behaviour is visible in play. Pacing targets hold in a simulation for every class. Fallen flee. Bats drop no items. Archers' arrows can be blocked. |
| 9 | **Mini-bosses** | §9 | Depths 5, 10, 15, and 20 have the right boss, mechanics, and guaranteed drops. |
| 10 | **Persistence and polish** | §12.2 (character slots, level deltas), §8.4, settings (damage numbers) | Reloading mid-level continues with the same layout, ground items, and gear. Several characters can be saved side by side. |
| 11 | **Town** | §13, §13.1 | Death respawns the hero in town. The stash stores items across sessions. Items dropped in town stay there. |
| 12 | **Merchants and the sage** | §13.2 | Each merchant sells and buys its kinds at D1 prices; selling pays ¼. Stock follows `deepest`/clvl and restocks on returning from the dungeon. The sage identifies for 100 gold. The healer heals for free. The smith's and peddler's stock survives a reload; the witch's and healer's random items reroll. AUTO never trades. |

---

## 16. Decisions log

| # | Question | Decision |
|---|---|---|
| Q1 | What does Magic do? | **[USER]** Renamed to **Intelligence**. It raises mana, which is spent on spells. Monsters drop spellbooks with Int requirements. Scrolls cast a spell once. |
| Q2 | Pause while panels are open? | **[USER]** Yes. Opening the inventory pauses the game; this applies to all panels. |
| Q3 | Should AUTO auto-equip? | **[USER]** No. Picking up an item puts it in the inventory if there is space. |
| Q4 | Identification? | **[USER]** Normal items don't need it; magic and unique items do. Identify is a spell learnable at high Int, and Scrolls of Identify are fairly common. A town comes later. |
| Q5 | Death penalty? | **[USER]** Items and gold drop on the ground. The hero respawns in town, or at the level start until the town exists. |
| Q6 | Which classes? | **[USER]** Three: Warrior, Thief, and Mage. They map to D1's Warrior, Rogue, and Sorcerer. |
| Q7 | Do items left behind persist? | **[USER]** Yes, including items left in town. Plus a **Stash** chest in town for storage. |
| D1 | Int caps | **[OURS]** Back to D1's per-class caps; the v2 Warrior Int cap of 100 is reverted. |
| D2 | Does death drop the belt? | **[OURS]** Yes. "Items" is read as everything carried. |
| D3 | Mana regeneration | **[OURS]** 0.5 % maxMana/s for every class. |
| D4 | Mage starting staff | **[OURS]** A plain Short Staff, plus knowing Charged Bolt at slvl 1, instead of D1's charged staff. |
| D5 | Stash size | **[OURS]** 10×10. |
| Q8 | Class skills | **[USER]** New skills on `R`: Warrior **War Cry**, Thief **Disarm Trap** (D1), Mage **Mana Surge**. Repair and Recharge are revisited with the town. |
| Q9 | Shared stash? | **[USER]** No. Each character has their own stash. |
| Q10 | Keep the single `index.html`? | **[USER]** No. **[OURS]** The project moves to Vite + TypeScript + three.js 0.160 + Preact + Vitest (§2.1), via a behaviour-preserving port in Phase 0. |
| Q11 | The legacy "rise from the dark" rule raised monsters near a hero out of combat for 3 s. Keep it? | **[USER]** No: removed after Phase 9. Levels hold only their generated monsters, as in D1. |

---

## 17. Sources

- **Jarulf's Guide to Diablo and Hellfire v1.63** (freeablo edition): <https://wheybags.gitlab.io/jarulfs-guide/>. Sections used:
  - §2.1 stats, life and mana formulas
  - §2.1.4 AC and to-hit
  - §2.2.2 damage and critical hits
  - §2.2.3 / §2.3 weapon, cast, and arrow speeds, and hit recovery per class
  - §2.4 class skills
  - §2.5 starting equipment
  - §4.3 traps
  - §2.6 experience table
  - §3.1 base items
  - §3.2.2 potions
  - §3.2.3 book and scroll qlvls
  - §3.8 item creation and drop rates
  - §3.13 affix and unique qlvls and effects
  - §4.1.1–4.1.6 spell list, spell effects, mana costs, Magic requirements, scrolls cost no mana
  - §5.1 / §6.2.3 monster to-hit and block
  - §5.3.4 hit recovery
  - §5.6.4 monster levels
- **Diablo manual** (Blizzard, 1996): <http://ftp.blizzard.com/pub/misc/Diablo.PDF>. Used for:
  - Character Information screen
  - unidentified items being excluded from displayed stats
  - inventory slots
  - belt and hotkeys 1–8
  - level-up flow
  - item colours
  - instant potions
  - spellbook and speedbook, with F5–F8
- **DiabloBytes**, D1 mechanics overview: <https://diablobytes.com/diablo-i/mechanics/>. Used for orientation, and for the fact that D1 has no shared stash. Its `AC/5` monster to-hit formula and its "potions heal over time" claim contradict Jarulf and the manual, so neither is used.
