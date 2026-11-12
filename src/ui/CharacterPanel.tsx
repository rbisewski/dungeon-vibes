import { useEffect, useState } from 'preact/hooks';
import { ATTRS, CLASS, type Attr } from '../rules/classes';
import { closePanels, spendPoint } from './actions';
import { panelStyle } from './pixel/frame';
import { sheet } from './store';

const ATTR_NAME: Record<Attr, string> = { str: 'STRENGTH', int: 'INTELLIGENCE', dex: 'DEXTERITY', vit: 'VITALITY' };

/** D1-style character screen: identity and XP, attributes (base / current / +), then combat stats. Pauses the game. */
export function CharacterPanel() {
  const s = sheet.value;
  const [sel, setSel] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); setSel(i => (i + 3) % 4); }
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); setSel(i => (i + 1) % 4); }
      else if (e.code === 'Enter' || e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); setSel(i => { spendPoint(ATTRS[i]); return i; }); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  if (!s) return null;
  return (
    <div id="charPanel" class="px panel" style={panelStyle}>
      <div class="panelHead">
        <span>{CLASS[s.cls].name.toUpperCase()}</span>
        <span>LEVEL {s.clvl}</span>
        <button class="close" onClick={closePanels} title="Close (C / Esc)">X</button>
      </div>
      <div class="kv"><span>EXPERIENCE</span><b>{s.xp}</b></div>
      <div class="kv"><span>NEXT LEVEL</span><b>{s.nextXp ?? 'MAX'}</b></div>

      <table class="attrs">
        <thead><tr><th /><th>BASE</th><th>NOW</th><th /></tr></thead>
        <tbody>
          {ATTRS.map((a, i) => {
            const capped = s.base[a] >= s.cap[a];
            const cur = s.cur[a], delta = cur - s.base[a];
            return (
              <tr key={a} class={i === sel && s.unspent > 0 ? 'sel' : ''}>
                <td>{ATTR_NAME[a]}</td>
                <td class={capped ? 'gold' : ''}>{s.base[a]}</td>
                <td class={delta > 0 ? 'blue' : delta < 0 ? 'red' : ''}>{cur}</td>
                <td>
                  {s.unspent > 0 && (
                    <button class="plus" disabled={capped} onClick={() => spendPoint(a)} title={capped ? 'At class maximum' : 'Spend a point'}>+</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div class={'kv points' + (s.unspent > 0 ? ' gold' : '')}><span>POINTS TO SPEND</span><b>{s.unspent}</b></div>

      <div class="stats">
        <div class="kv"><span>LIFE</span><b>{s.life}/{s.maxLife}</b></div>
        <div class="kv"><span>MANA</span><b>{s.mana}/{s.maxMana}</b></div>
        <div class="kv"><span>ARMOR CLASS</span><b>{s.ac}</b></div>
        <div class="kv"><span>TO HIT</span><b>{s.toHit}%</b></div>
        <div class="kv"><span>SPELL HIT</span><b>{s.spellHit}%</b></div>
        <div class="kv"><span>DAMAGE</span><b>{s.dmgMin}-{s.dmgMax}</b></div>
        <div class="kv"><span>BLOCK</span><b>{s.block}%</b></div>
        {s.crit > 0 && <div class="kv"><span>CRITICAL</span><b>{s.crit}%</b></div>}
        <div class="kv"><span>GOLD</span><b>{s.gold}</b></div>
      </div>
      <div class="hint">C / ESC CLOSE{s.unspent > 0 ? ' - UP/DOWN + ENTER SPEND' : ''}</div>
    </div>
  );
}
