import { useEffect, useState } from 'preact/hooks';
import { spellIcon } from '../art/itemIcons';
import { heroManaCost, spellLevel } from '../actors/spells';
import { G } from '../game/state';
import { SPELL_IDS, SPELLS, spellEffectText, type SpellId } from '../rules/spells';
import { closePanel, hoverSpell, invVersion, readySpell } from './actions';
import { Field, Panel } from './Panel';
import { isOpen } from './store';

/** D1-style spellbook: learned spells with level, mana and effect; click or Enter readies, F5–F8 assigns. Pauses the game. */
export function SpellbookPanel() {
  void invVersion.value;
  const h = G.hero;
  const known = SPELL_IDS.filter(id => h.spells[id]);
  const [sel, setSel] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isOpen('inv') || !known.length) return; // the inventory owns the arrow keys while it is open
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); setSel(i => { const n = (i + known.length - 1) % known.length; hoverSpell.value = known[n]; return n; }); }
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); setSel(i => { const n = (i + 1) % known.length; hoverSpell.value = known[n]; return n; }); }
      else if (e.code === 'Enter') { e.preventDefault(); setSel(i => { readySpell(known[i]); return i; }); }
    };
    addEventListener('keydown', onKey);
    return () => { removeEventListener('keydown', onKey); hoverSpell.value = null; };
  }, [known.join()]);

  const row = (id: SpellId, i: number) => {
    const slvl = spellLevel(h, id), bonus = slvl - (h.spells[id] ?? 0), cost = heroManaCost(h, id), key = h.hotkeys.indexOf(id);
    const ic = spellIcon(id);
    return (
      <div
        key={id}
        class={'spell well' + (h.readied === id ? ' ready' : '') + (i === sel ? ' sel' : '')}
        onMouseDown={() => readySpell(id)}
        onMouseEnter={() => { hoverSpell.value = id; setSel(i); }}
        onMouseLeave={() => { if (hoverSpell.value === id) hoverSpell.value = null; }}
      >
        <img src={ic.src} width={ic.w} height={ic.h} alt="" draggable={false} />
        <div class="spellText">
          <div class="spellName">
            {SPELLS[id].name.toUpperCase()}
            {key >= 0 && <span class="fkey">F{key + 5}</span>}
          </div>
          <div>LEVEL {slvl}{bonus > 0 && <span class="blue"> (+{bonus})</span>} - MANA {cost}</div>
          <div class="dim">{spellEffectText(id, { cls: h.stats.cls, clvl: h.stats.clvl, slvl, int: h.d.attr.int })}</div>
        </div>
      </div>
    );
  };

  return (
    <Panel id="bookPanel" side="left" title="SPELLBOOK" close={() => closePanel('book')} closeKeys="B / Esc"
      foot="CLICK OR ENTER READIES FOR Q · HOVER + F5-F8 SETS A HOTKEY · B / ESC CLOSE">
      <Field label="MANA">{Math.round(h.mana)}/{h.d.maxMana}</Field>
      <div class="rule" />
      {known.length
        ? <div class="spells">{known.map(row)}</div>
        : <div class="empty">NO SPELLS YET.<br />READ A SPELLBOOK: RIGHT-CLICK IT<br />IN THE INVENTORY (I).</div>}
    </Panel>
  );
}
