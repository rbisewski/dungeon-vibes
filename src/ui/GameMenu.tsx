import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { setSetting, settings } from '../game/settings';
import { quitToTitle } from '../game/title';
import { closePanels } from './actions';
import './pixel/frame';

/** The key reference, shown only here (SPEC §10.8): the HUD keeps the screen clear. */
const CONTROLS: readonly (readonly [string, string] | string)[] = [
  'IN THE DUNGEON',
  ['WASD', 'MOVE (THE HERO PLAYS ITSELF WHEN LEFT ALONE)'],
  ['SPACE', 'ATTACK'],
  ['Q', 'CAST THE READIED SPELL'],
  ['R', 'CLASS SKILL'],
  ['1-8', 'USE A BELT ITEM'],
  ['F5-F8', 'CAST A HOTKEYED SPELL'],
  ['E', 'PICK UP'],
  ['ALT', 'SHOW ITEMS ON THE GROUND'],
  'PANELS',
  ['C', 'CHARACTER'],
  ['I', 'INVENTORY'],
  ['B', 'SPELLBOOK'],
  ['ESC', 'MENU, OR CLOSE PANELS'],
  'IN THE INVENTORY',
  ['ARROWS', 'MOVE THE CURSOR'],
  ['ENTER', 'PICK UP OR PLACE'],
  ['X', 'USE, EQUIP, OR SELL'],
  ['G', 'DROP THE HELD ITEM'],
];

/** Esc menu (D1's game menu): resume, settings, save and quit; and the controls. Up/Down and Enter, Esc closes. */
export function GameMenu() {
  const s = settings.value;
  const items: { label: string; state?: ComponentChildren; act: () => void }[] = [
    { label: 'RESUME', act: closePanels },
    { label: 'DAMAGE NUMBERS', state: s.damageNumbers ? 'ON' : 'OFF', act: () => setSetting('damageNumbers', !settings.value.damageNumbers) },
    { label: 'SOUND', state: s.sound ? 'ON' : 'OFF', act: () => setSetting('sound', !settings.value.sound) },
    { label: 'SAVE AND QUIT', act: quitToTitle },
  ];
  const [sel, setSelState] = useState(0);
  // The key handler reads the selection through a ref: effects (and so a re-registered handler) only run after the
  // next paint, which can lag behind fast key presses.
  const cur = useRef({ sel, items });
  cur.current = { sel: cur.current.sel, items };
  const setSel = (f: (i: number) => number): void => { cur.current.sel = f(cur.current.sel); setSelState(cur.current.sel); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = cur.current.items.length;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); setSel(i => (i + n - 1) % n); }
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); setSel(i => (i + 1) % n); }
      else if (e.code === 'Enter') { e.preventDefault(); cur.current.items[cur.current.sel].act(); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  return (
    <div id="gameMenu" class="px panel frame center">
      <div class="panelHead"><span class="title">MENU</span></div>
      <div class="cols">
        <div class="menuList">
          {items.map((it, i) => (
            <button key={it.label} class={'mItem' + (i === sel ? ' on' : '')} onMouseEnter={() => setSel(() => i)} onClick={it.act}>
              {it.label}{it.state && <> <span class="state">{it.state}</span></>}
            </button>
          ))}
        </div>
        <div class="sep" />
        <div class="controls">
          {CONTROLS.map(c => typeof c === 'string'
            ? <span key={c} class="h label">{c}</span>
            : [<span key={c[0]} class="kbd well">{c[0]}</span>, <span key={c[0] + 'a'}>{c[1]}</span>])}
        </div>
      </div>
      <div class="panelFoot">UP / DOWN CHOOSE · ENTER SELECT · ESC RESUME</div>
    </div>
  );
}
