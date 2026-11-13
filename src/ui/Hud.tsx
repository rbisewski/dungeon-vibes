import { useEffect, useRef } from 'preact/hooks';
import type { PixImage } from './pixel/pixArt';
import { drawOrb, LIFE_ORB, MANA_ORB, ORB_PX, type OrbColors } from './pixel/orb';
import { ICON } from './icons';
import { POTION_ICON } from './pixel/potionIcons';
import { POTIONS } from '../rules/potions';
import { beltClick, invVersion, openPanel } from './actions';
import { CharacterPanel } from './CharacterPanel';
import { fade, hud, isOpen, openPanels, soundOn, toastOn, toastSub, toastText } from './store';
import { InventoryPanel } from './InventoryPanel';
import { GroundLabels } from './GroundLabels';

function Pix({ img, scale = 3, style }: { img: PixImage; scale?: number; style?: Record<string, string> }) {
  return <img src={img.src} width={img.w * scale} height={img.h * scale} style={style} alt="" />;
}

/** Life or mana globe; redraws only when the visible fill level changes. */
function Orb({ id, label, cur, max, colors }: { id: string; label: string; cur: number; max: number; colors: OrbColors }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const frac = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0;
  const level = Math.round(frac * ORB_PX);
  useEffect(() => { const g = ref.current?.getContext('2d'); if (g) drawOrb(g, level / ORB_PX, colors); }, [level, colors]);
  return (
    <div id={id} class="orb px">
      <canvas ref={ref} width={ORB_PX} height={ORB_PX} />
      <div class="orbText">{label} {cur}/{max}</div>
    </div>
  );
}

function Orbs() {
  return (
    <>
      <Orb id="lifeOrb" label="LIFE" cur={hud.life.value} max={hud.maxLife.value} colors={LIFE_ORB} />
      <Orb id="manaOrb" label="MANA" cur={hud.mana.value} max={hud.maxMana.value} colors={MANA_ORB} />
      {hud.unspent.value > 0 && !openPanels.value.length && (
        <button id="lvlUp" class="px" onClick={() => openPanel('char')} title="Level up! Spend points (C)">+</button>
      )}
    </>
  );
}

/** D1 belt: 8 slots with hotkey digits. Right-click (or 1–8) drinks; with the inventory open, left-click moves potions. */
function Belt() {
  void invVersion.value; // paused inventory edits refresh the belt immediately
  return (
    <div id="belt" class="px">
      {hud.belt.value.map((p, i) => (
        <div
          key={i}
          class="slot"
          title={p ? `${POTIONS[p].name} - right-click or ${i + 1} to drink` : `Belt slot ${i + 1}`}
          onMouseDown={e => { if (e.button === 0) beltClick(i, 'left'); }}
          onContextMenu={e => { e.preventDefault(); beltClick(i, 'right'); }}
        >
          {p && <Pix img={POTION_ICON[p]} scale={2} />}
          <span class="key">{i + 1}</span>
        </div>
      ))}
    </div>
  );
}

function XpBar() {
  return (
    <div id="xp" class="px" title="Experience">
      <span>LV {hud.clvl}</span>
      <div class="bar"><div style={{ width: `${(100 * hud.xpFrac.value).toFixed(1)}%` }} /></div>
    </div>
  );
}

function Stats() {
  return (
    <div id="hud" class="px">
      <div class="row"><Pix img={ICON.gold} /><span>{hud.gold}</span></div>
      <div class="row"><Pix img={ICON.slain} /><span>{hud.slain}</span></div>
      <div class="row">
        <Pix img={ICON.depth} /><span>DEPTH {hud.depth}</span>
        {hud.key.value && <Pix img={ICON.key} style={{ marginLeft: '10px' }} />}
      </div>
    </div>
  );
}

function Mode() {
  return (
    <div id="mode" class="px">
      <div>{hud.manual.value ? 'YOU' : 'AUTO'}</div>
      <div class="sub">WASD/ARROWS MOVE<br />SPACE ATTACK<br />1-8 POTIONS<br />C CHARACTER<br />I INVENTORY<br />E PICK UP · ALT ITEMS</div>
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
    <div id="boss" class="px" style={{ opacity: hud.bossVisible.value ? 1 : 0 }}>
      <div>BONE WARDEN</div>
      <div class="bar"><div id="bossfill" style={{ width: `${100 * hud.bossFrac.value}%` }} /></div>
    </div>
  );
}

function Fade() {
  return <div id="fade" style={{ opacity: fade.value.toFixed(3) }} />;
}

function SoundPrompt() {
  const on = soundOn.value;
  return (
    <div id="snd" class={'px' + (on ? ' off' : '')} title="Enable sound">
      <Pix img={ICON.sound} scale={2} /><span>CLICK FOR SOUND</span>
    </div>
  );
}

export function Hud() {
  return (
    <>
      <GroundLabels />
      <Stats />
      <Mode />
      <Toast />
      <BossBar />
      <Belt />
      <XpBar />
      <Orbs />
      {isOpen('char') && <CharacterPanel />}
      {isOpen('inv') && <InventoryPanel />}
      {openPanels.value.length > 0 && <div id="paused" class="px">PAUSED</div>}
      <Fade />
      <SoundPrompt />
    </>
  );
}
