import { useEffect, useState } from 'preact/hooks';
import { ATTRS, CLASS, type Attr } from '../rules/classes';
import { closePanels, spendPoint } from './actions';
import { Field, Panel } from './Panel';
import { isOpen, sheet } from './store';

const ATTR_NAME: Record<Attr, string> = { str: 'STRENGTH', int: 'INTELLIGENCE', dex: 'DEXTERITY', vit: 'VITALITY' };

/** D1-style character screen: identity and XP, attributes (base / current / +), then combat stats. Pauses the game. */
export function CharacterPanel() {
  const s = sheet.value;
  const [sel, setSel] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isOpen('inv')) return; // the inventory owns the arrow keys while it is open
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); setSel(i => (i + 3) % 4); }
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); setSel(i => (i + 1) % 4); }
      else if (e.code === 'Enter' || e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); setSel(i => { spendPoint(ATTRS[i]); return i; }); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  if (!s) return null;
  return (
    <Panel id="charPanel" side="left" title={s.name} close={closePanels} closeKeys="C / Esc"
      foot={<>C / ESC CLOSE{s.unspent > 0 && <> · UP / DOWN + ENTER SPEND</>}</>}>
      <div class="ident">
        <Field label="CLASS">{CLASS[s.cls].name.toUpperCase()}</Field>
        <Field label="LEVEL">{s.clvl}</Field>
        <Field label="EXPERIENCE">{s.xp}</Field>
        <Field label="NEXT LEVEL">{s.nextXp ?? 'MAX'}</Field>
      </div>
      <div class="rule" />
      <div class="attrs">
        <span /><span class="hd">BASE</span><span class="hd">NOW</span><span />
        {ATTRS.map((a, i) => {
          const capped = s.base[a] >= s.cap[a], cur = s.cur[a], delta = cur - s.base[a];
          return [
            <span key={a + 'n'} class={'label' + (i === sel && s.unspent > 0 ? ' sel' : '')}>{ATTR_NAME[a]}</span>,
            <span key={a + 'b'} class={'val well' + (capped ? ' gold' : '')}>{s.base[a]}</span>,
            <span key={a + 'c'} class={'val well' + (delta > 0 ? ' blue' : delta < 0 ? ' red' : '')}>{cur}</span>,
            s.unspent > 0
              ? <button key={a + 'p'} class="btn" disabled={capped} onClick={() => spendPoint(a)} title={capped ? 'At class maximum' : 'Spend a point'}>+</button>
              : <span key={a + 'p'} />,
          ];
        })}
      </div>
      <Field label="POINTS TO SPEND" cls="points">{s.unspent}</Field>
      <div class="rule" />
      <div class="stats">
        <Field label="LIFE">{s.life}/{s.maxLife}</Field>
        <Field label="MANA">{s.mana}/{s.maxMana}</Field>
        <Field label="ARMOR">{s.ac}</Field>
        <Field label="DAMAGE">{s.dmgMin}-{s.dmgMax}</Field>
        <Field label="TO HIT">{s.toHit}%</Field>
        <Field label="SPELL HIT">{s.spellHit}%</Field>
        <Field label="BLOCK">{s.block}%</Field>
        <Field label="CRITICAL">{s.crit}%</Field>
        <Field label="GOLD">{s.gold}</Field>
      </div>
    </Panel>
  );
}
