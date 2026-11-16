import { useEffect, useRef } from 'preact/hooks';
import type { PixImage } from './pixel/pixArt';
import { drawOrb, LIFE_ORB, MANA_ORB, ORB_PX, type OrbColors } from './pixel/orb';
import { ICON } from './icons';
import { itemIcon } from '../art/itemIcons';
import { itemName } from '../rules/inventory';
import { beltClick, invVersion, openPanel, togglePanel } from './actions';
import { CharacterPanel } from './CharacterPanel';
import { fade, hud, isOpen, openPanels, soundOn, toastOn, toastSub, toastText } from './store';
import { InventoryPanel } from './InventoryPanel';
import { SpellbookPanel } from './SpellbookPanel';
import { skillIcon, spellIcon } from '../art/itemIcons';
import { SPELLS } from '../rules/spells';
import { SKILLS } from '../rules/skills';
import { useSkill } from '../actors/skills';
import { GroundLabels } from './GroundLabels';
import { ClassSelect } from './ClassSelect';
import { menuStep } from '../game/classSelect';
import { titleOpen } from '../game/title';
import { TitleScreen } from './TitleScreen';
import { GameMenu } from './GameMenu';
import { StashPanel } from './StashPanel';
import { ShopPanel } from './ShopPanel';
import { DamageNumbers } from './DamageNumbers';

function Pix({ img, scale = 3, style }: { img: PixImage; scale?: number; style?: Record<string, string> }) {
  return <img src={img.src} width={img.w * scale} height={img.h * scale} style={style} alt="" />;
}

/** Life or mana globe in its socket; redraws only when the visible fill level changes. */
function Orb({ id, label, cur, max, colors }: { id: string; label: string; cur: number; max: number; colors: OrbColors }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const frac = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0;
  const level = Math.round(frac * ORB_PX);
  useEffect(() => { const g = ref.current?.getContext('2d'); if (g) drawOrb(g, level / ORB_PX, colors); }, [level, colors]);
  return (
    <div id={id} class="socket">
      <canvas ref={ref} width={ORB_PX} height={ORB_PX} />
      <div class="orbText">{label} {cur}/{max}</div>
    </div>
  );
}

/**
 * The control bar (D1's control panel, SPEC §10.8): panel buttons, the life orb, belt and experience, skill and
 * readied spell, the mana orb, more panel buttons. A badge on CHAR marks unspent points.
 */
function ControlBar() {
  return (
    <div id="bar" class="px frame">
      <div class="btns">
        <button class="btn" onClick={() => togglePanel('char')} title="Character (C)">
          CHAR{hud.unspent.value > 0 && <span class="badge" title="Level up! Points to spend">+</span>}
        </button>
        <button class="btn" onClick={() => togglePanel('menu')} title="Menu and controls (Esc)">MENU</button>
      </div>
      <Orb id="lifeOrb" label="LIFE" cur={hud.life.value} max={hud.maxLife.value} colors={LIFE_ORB} />
      <div class="mid">
        <Belt />
        <XpBar />
      </div>
      <SkillButton />
      <ReadiedSpell />
      <Orb id="manaOrb" label="MANA" cur={hud.mana.value} max={hud.maxMana.value} colors={MANA_ORB} />
      <div class="btns">
        <button class="btn" onClick={() => togglePanel('inv')} title="Inventory (I)">INV</button>
        <button class="btn" onClick={() => togglePanel('book')} title="Spellbook (B)">SPELLS</button>
      </div>
    </div>
  );
}

/** D1 belt: 8 slots with hotkey digits. Right-click (or 1–8) drinks or reads; with the inventory open, left-click moves items. */
function Belt() {
  void invVersion.value; // paused inventory edits refresh the belt immediately
  return (
    <div id="belt">
      {hud.belt.value.map((it, i) => (
        <div
          key={i}
          class="slot well"
          title={it ? `${itemName(it)} - right-click or ${i + 1} to ${it.kind === 'scroll' ? 'read' : 'drink'}` : `Belt slot ${i + 1}`}
          onMouseDown={e => { if (e.button === 0) beltClick(i, 'left'); }}
          onContextMenu={e => { e.preventDefault(); beltClick(i, 'right'); }}
        >
          {it && <Pix img={itemIcon(it)} scale={1} />}
          <span class="key">{i + 1}</span>
        </div>
      ))}
    </div>
  );
}

/** The readied spell beside the mana orb; greyed without enough mana. Click opens the spellbook. */
function ReadiedSpell() {
  const id = hud.readied.value;
  const ic = id ? spellIcon(id) : null;
  return (
    <div id="readied" class={'action well' + (hud.readyOk.value ? '' : ' low') + (hud.manaShield.value ? ' shield' : '')} onMouseDown={() => openPanel('book')}
      title={id ? `${SPELLS[id].name} - Q to cast, B for the spellbook` : 'No spell readied - B for the spellbook'}>
      {ic ? <img src={ic.src} width={ic.w * 2} height={ic.h * 2} alt="" draggable={false} /> : <span>B</span>}
      <span class="key">Q</span>
    </div>
  );
}

/** Class skill (R) with a radial cooldown sweep. */
function SkillButton() {
  const id = hud.skill.value, ic = skillIcon(id), cd = hud.skillCd.value;
  return (
    <div id="skillBtn" class={'action well' + (cd > 0 ? ' cooling' : '')} onMouseDown={() => useSkill()} title={`${SKILLS[id].name} (R): ${SKILLS[id].desc}`}>
      <img src={ic.src} width={ic.w * 2} height={ic.h * 2} alt="" draggable={false} />
      {cd > 0 && <div class="sweep" style={{ background: `conic-gradient(rgba(0,0,0,.72) ${(cd * 360).toFixed(1)}deg, transparent 0)` }} />}
      <span class="key">R</span>
    </div>
  );
}

function XpBar() {
  return (
    <div id="xp" title="Experience">
      <span>LV {hud.clvl}</span>
      <div class="bar well"><div style={{ width: `${(100 * hud.xpFrac.value).toFixed(1)}%` }} /></div>
    </div>
  );
}

function Stats() {
  return (
    <div id="stats" class="px plaque">
      <span class="it" title="Gold"><Pix img={ICON.gold} />{hud.gold}</span>
      <span class="it" title="Monsters slain"><Pix img={ICON.slain} />{hud.slain}</span>
      <span class="it" title="Where you are"><Pix img={ICON.depth} />{hud.depth.value ? `DEPTH ${hud.depth.value}` : 'TOWN'}</span>
      {hud.key.value && <span class="it" title="Key"><Pix img={ICON.key} /></span>}
    </div>
  );
}

/** Who is playing (AUTO when left alone), and where the controls are; the full list lives in the menu (Esc). */
function Mode() {
  return (
    <div id="mode" class="px plaque">
      <span>{hud.manual.value ? 'YOU' : 'AUTO'}</span>
      <span class="sub">ESC MENU</span>
    </div>
  );
}

function Toast() {
  return (
    <div id="toast" class="px" style={{ opacity: toastOn.value ? 1 : 0 }}>
      {toastText}
      {toastSub.value && <span class="sub">{toastSub}</span>}
    </div>
  );
}

function BossBar() {
  return (
    <div id="boss" class="px plaque" style={{ opacity: hud.bossVisible.value ? 1 : 0 }}>
      <div class="name disp">{hud.bossName.value}</div>
      <div class="bar well"><div id="bossfill" style={{ width: `${100 * hud.bossFrac.value}%` }} /></div>
    </div>
  );
}

function Fade() {
  return <div id="fade" style={{ opacity: fade.value.toFixed(3) }} />;
}

function SoundPrompt() {
  const on = soundOn.value;
  return (
    <div id="snd" class={'px plaque' + (on ? ' off' : '')} title="Enable sound">
      <Pix img={ICON.sound} scale={2} /><span>CLICK FOR SOUND</span>
    </div>
  );
}

export function Hud() {
  if (titleOpen.value) return (<><Fade /><TitleScreen /><SoundPrompt /></>);
  if (menuStep.value) return (<><Fade /><ClassSelect /><SoundPrompt /></>);
  return (
    <>
      <GroundLabels />
      <DamageNumbers />
      <Stats />
      <Mode />
      <Toast />
      <BossBar />
      <ControlBar />
      {isOpen('char') && <CharacterPanel />}
      {isOpen('inv') && <InventoryPanel />}
      {isOpen('book') && <SpellbookPanel />}
      {isOpen('menu') && <GameMenu />}
      {isOpen('stash') && <StashPanel />}
      {isOpen('shop') && <ShopPanel />}
      {openPanels.value.length > 0 && !isOpen('menu') && <div id="paused" class="disp">PAUSED</div>}
      <Fade />
      <SoundPrompt />
    </>
  );
}
