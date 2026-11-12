# Dungeon Vibes — Diablo-Style Progression Spec

Status: draft v5. All questions (Q1–Q9) are answered and folded in (see §16). The single-file constraint is lifted (§2.1). No code changes yet.

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
- A level-up button appears. Points are spent on the character screen.

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
- **Mage substitution [OURS]:** D1's Short Staff of Charged Bolt depends on staff charges, which are out of scope. The Mage instead starts with a plain Short Staff, **knows Charged Bolt at slvl 1**, and has Charged Bolt readied. Their Int of 35 meets the requirement of 25.

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

**HUD**
- Hearts are replaced by D1-style pixel **life and mana orbs** (red and blue).
- Each orb is a canvas with a liquid level, highlight, and 1 px dark outline.
- Hovering an orb shows its value, e.g. `LIFE 54/70`.
- Floating damage numbers are off by default, as in D1. A settings toggle turns them on.

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

Mana regenerates [OURS] at `0.5 % maxMana/s` for every class. D1 has no natural mana regeneration outside items; without it, a Warrior or Thief with a small mana pool could barely cast. This rate keeps mana potions valuable. It can be tuned.

---

## 5. Spells, spellbooks, scrolls [USER]

### 5.1 Learning from spellbooks

**Where books come from**
- Monsters and chests drop books through the normal item pool (§6.3).
- **Bookshelves [OURS, D1 bookcase]:** a new room prop. One appears per level with 35 % chance. Walking into it drops one book at `ilvl = 2·depth`.

**Reading a book**
- Right-click it in the backpack, or press `X` on the inventory cursor.
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
| Town Portal | 4 | Town exists (§13) |

Notes:
- Minimum mana costs are **[OURS]**: `ceil(initial/2)`. The web copy of Jarulf's table drops the minimum column.
- `slvl` raises damage as in D1. It also lowers mana cost by the per-level decrease (§1.4) down to the minimum.

### 5.3 Scrolls

- A scroll is a 1×1 item that casts its spell once, at the known slvl or slvl 1.
- It costs **no mana**, as in D1.
- Its Int requirement is `ceil(0.75 · learnInt)` **[OURS]**. D1 only says "a bit less".
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
- **Spell-level affixes:** Angel's and Arch-Angel's are limited to jewelry and helms **[OURS]**.

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

**Item level**
- Monster drops: `ilvl = mlvl`.
- Chests and bookshelves: `ilvl = 2·depth`.

**Gold [OURS]**
- Gold stays a counter, not backpack cells.
- A gold drop gives `ri(1,3)·(mlvl+1) + ri(0, mlvl)` gold. The existing coin pickups (L1278) are used.

### 6.4 Identification [USER]

- **Normal items never need identifying.**
- **Unidentified magic and unique items:**
  - Their name shows only the base name, e.g. *Short Sword*, in blue (magic) or gold (unique).
  - The tooltip shows `NOT IDENTIFIED` plus the base stats and requirements.
  - Their properties **do apply** when equipped, as in D1, but are hidden in the tooltip and the character screen (§3.4).
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

D1's unique names are Blizzard IP, so ours are original. Starter set:

| Unique | Base | qlvl | Properties |
|---|---|---|---|
| Gravewhisper | Dagger | 1 | +30 % dmg, +3 Dex, of the Leech |
| Bonecrown | Skull Cap | 4 | +15 AC, +10 Life, −1 dmg taken |
| Mossbark Aegis | Small Shield | 5 | +40 % AC, +5 Vit, Thorns |
| Rustfang | Falchion | 6 | +70 % dmg, +10 To-Hit, −5 Dex |
| Ember Band | Ring | 8 | +5 Str, +5 Vit, +10 Life |
| The Lantern Eye | Amulet | 10 | +10 all attributes, −10 Life |
| Scholar's Cowl | Cap | 10 | +15 Int, +20 Mana, +1 spell level |
| Widowmaker | Broad Axe | 12 | +120 % dmg, 5 % life steal, −20 % AC |
| Ironhide Coat | Chain Mail | 13 | +80 % AC, +20 Life, −2 dmg taken |
| Spinneret | Scimitar | 15 | +60 % dmg, Haste, +15 Dex (spider mini-boss, §9) |
| Kingslayer's Oath | Bastard Sword | 20 | +150 % dmg, +30 To-Hit, +10 Str, crit chance ×2 |

The full list is about 25 uniques, spread over qlvl 1–30.

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

**Elixirs**
- Use with right-click or `X` in the backpack.
- +1 permanently to an attribute.

**Removed code:** `hero.potions`, `#pots`, and the auto-drink at L1422.

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

- Each depth picks **3 families** from those allowed at that depth, weighted. This mirrors D1's limit on families per level, and replaces `monsterTypeFor` (L1136).
- Spawn counts stay as they are (L1222, L1227).

### 8.3 Family table

| Family | D1 inspiration | Depth | Undead | hp | dmg | ac | toHit | xpMul |
|---|---|---|---|---|---|---|---|---|
| Rat (existing) | Scavenger | 1–8 | | 6 | 1–3 | 5 | 20 | 0.8 |
| Skeleton (existing) | Skeleton | 1–14 | ✔ | 8 | 1–4 | 10 | 25 | 1.0 |
| Slime (existing) | [OURS] | 2–12 | | 12 | 2–4 | 0 | 20 | 1.1 |
| **Zombie** | Zombie | 1–10 | ✔ | 12 | 2–5 | 5 | 15 | 1.1 |
| **Fallen** | Fallen One | 1–9 | | 5 | 1–3 | 5 | 20 | 0.7 |
| **Skeleton Archer** | Skeleton Archer | 3–14 | ✔ | 7 | 1–4 | 8 | 30 | 1.2 |
| **Bat** | Winged Fiend | 2–12 | | 4 | 1–3 | 10 | 25 | 0.6 |
| **Giant Spider** | Hellfire Arachnon / Spider Lord | 4–16 | | 10 | 2–6 | 15 | 30 | 1.4 |
| Goat Man (stretch) | Goat Men | 8+ | | 20 | 4–9 | 25 | 40 | 1.6 |
| Hidden (stretch) | Hidden | 6+ | | 15 | 3–8 | 20 | 35 | 1.5 |

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

### 8.4 Elite packs (stretch)

- From depth 3, each level has a 20 % chance of one named elite, e.g. `Gutripper the Foul`.
- The elite gets 3× HP and +5 mlvl.
- It has one modifier: Fast, Stoneskin (+50 AC), Vampiric, Berserker (+50 % dmg), or **Spellcaster** (casts Firebolt or Lightning).
- 2–4 escorts accompany it. They share the modifier and have 2× HP.
- Its loot follows the unique-monster drop rules.

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
- `hp = 10 ×` the family-equivalent hp at `mlvl = depth + 2`.
- Damage is 2.5× the normal formula.
- `xpMul` is 8.
- Bosses stagger only when hit for `dmg ≥ mlvl + 3`, and at most once per 3 s.
- Bosses are immune to Stone Curse [OURS].

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
- Arrow keys move a cell cursor.
- `Enter` picks up or places.
- `X` uses, equips, or reads.
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

- Icons are drawn on a **14 px grid per cell** and rendered at scale 2, so each cell is 28 px.
- They are authored as ASCII rows for the existing `pixCanvas(rows, scale)`.
- `PAL` gains colours for steel (light and dark), leather (light and dark), wood, gems (ruby, sapphire, emerald), glass highlight, potion liquids (red, blue, purple), parchment, and book leather (one cover colour per spell school):
  - fire: red
  - lightning: blue
  - magic: purple
  - holy: white
  - utility: green
- **Item icons**
  - Every base item has one icon.
  - Magic items reuse the base icon, as in D1.
  - Uniques add a 1 px gold rim [OURS].
- **Books:** a 28×28 tome tinted by spell school, with the spell rune embossed on the cover.
- **Scrolls:** a rolled parchment with a wax seal in the school colour.
- **Spell icons:** 14×14 glyphs used in the spellbook, as the readied-spell indicator, and on the book covers.
- Icons are cached once at startup and shared by inventory cells (`toDataURL`) and ground sprites (`CanvasTexture`, `NearestFilter`).

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

---

## 11. Death [USER]

The target behaviour, once the town exists:
1. All carried items and all gold drop on the ground where the hero died.
2. The hero respawns in town.

**Until the town exists:**

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

**Leaving the level** (taking the stairs down) with piles still on the floor:
- The level's delta is saved with the piles on it (Q7, §12.2). They stay where they are.
- There is no way back up until up-stairs and the town exist (§13). So a confirmation toast warns before descending: `YOUR BELONGINGS REMAIN ABOVE — PRESS AGAIN TO DESCEND`.

---

## 12. Persistence and seeded levels [OURS]

### 12.1 Seeded levels

- Each level gets a seed.
- `generateLayout`, `decorate`, and the monster spawns draw from a seeded PRNG (`mulberry32`) instead of `Math.random`.
- Combat and loot rolls use the separate session-seeded `rollRng` (§2.1), so they don't disturb the layout sequence.
- This is required for saving mid-level. It is also required for the planned town, because leaving a level and coming back must rebuild the same layout.

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

---

## 13. Town (future) [USER]

Planned, not specified in detail yet. Hooks to keep in mind now:
- **Respawn target on death** (§11).
- **Town Portal:** spell and scroll, with D1 data (§5.2).
- **Identify service:** a Cain-like NPC.
- **Merchants:**
  - potions and Scrolls of Identify
  - basic equipment
  - books
- **Up-stairs and returning:** each level gets an up-stair next to the start room. Together with Town Portal, this makes the persisted levels (§12.2) reachable again.
- **Town ground items persist [USER]:** anything dropped in town stays where it was dropped.

### 13.1 Stash [USER]

- **The Stash** is a large iron-bound chest in town, built as a bigger, gold-trimmed `makeChest` (L799).
- Walking into it opens the **stash panel**:
  - The stash grid is on the left and the inventory on the right.
  - The game is paused, like every panel (§10.1).
- **Grid [OURS]:** 10×10 cells. D1 has no stash; this size matches D2R's stash.
- Items move between the stash and the backpack the same way they move within the inventory: click to pick up or place (with swap), and `Enter`/`X` on the keyboard.
- Gold can be deposited and withdrawn as a single counter, which shows the stash's gold.
- Unidentified items keep that state inside the stash.
- **Persistence:** the stash is saved with the character (§12.2). It survives death, because only carried items drop.
- **The stash belongs to one character [USER Q9].** Each character has their own stash, so items cannot be passed between characters through it.

---

## 14. AUTO mode

AUTO keeps playing well and never makes the player's decisions.

| Action | AUTO does it? |
|---|---|
| Pick up gold, potions, scrolls, items | Yes. Items go to the backpack if there is room. Ground items become `pick` goals in `chooseGoal`. |
| Recover its own grave pile | Yes, top priority after respawning |
| Drink from the belt | Yes. Healing below 35 % life; Full Healing first below 20 %. A Mage drinks mana below 25 % mana. |
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
| 11 | **Town** (to be specced separately) | §13, §13.1 | Death respawns the hero in town. The stash stores items across sessions. Items dropped in town stay there. |

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

### Open questions

None at the moment.

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
