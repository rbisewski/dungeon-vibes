import { useEffect, useRef, useState } from 'preact/hooks';
import { setSetting, settings } from '../game/settings';
import { quitToTitle } from '../game/title';
import { closePanels } from './actions';
import { panelStyle } from './pixel/frame';

/** Esc menu (D1's game menu): resume, settings, save and quit to the title screen. Up/Down and Enter, Esc closes. */
export function GameMenu() {
  const s = settings.value;
  const items: { label: string; act: () => void }[] = [
    { label: 'RESUME', act: closePanels },
    { label: `DAMAGE NUMBERS: ${s.damageNumbers ? 'ON' : 'OFF'}`, act: () => setSetting('damageNumbers', !settings.value.damageNumbers) },
    { label: `SOUND: ${s.sound ? 'ON' : 'OFF'}`, act: () => setSetting('sound', !settings.value.sound) },
    { label: 'SAVE AND QUIT TO TITLE', act: quitToTitle },
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
    <div id="gameMenu" class="panel px" style={panelStyle}>
      {items.map((it, i) => (
        <button key={it.label} class={i === sel ? 'on' : ''} onMouseEnter={() => setSel(() => i)} onClick={it.act}>{it.label}</button>
      ))}
    </div>
  );
}
