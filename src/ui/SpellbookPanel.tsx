import { useEffect, useState } from 'preact/hooks';
import { spellIcon } from '../art/itemIcons';
import { heroManaCost, spellLevel } from '../actors/spells';
import { G } from '../game/state';
import { SPELL_IDS, SPELLS, spellEffectText, type SpellId } from '../rules/spells';
import { closePanel, hoverSpell, invVersion, readySpell } from './actions';
import { panelStyle } from './pixel/frame';
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
        class={'spell' + (h.readied === id ? ' ready' : '') + (i === sel ? ' sel' : '')}
        onMouseDown={() => readySpell(id)}
        onMouseEnter={() => { hoverSpell.value = id; setSel(i); }}
        onMouseLeave={() => { if (hoverSpell.value === id) hoverSpell.value = null; }}
      >
        <img src={ic.src} width={ic.w * 2} height={ic.h * 2} alt="" draggable={false} />
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
    <div id="bookPanel" class="px panel" style={panelStyle}>
      <div class="panelHead">
        <span>SPELLBOOK</span>
        <span>MANA {Math.round(h.mana)}/{h.d.maxMana}</span>
        <button class="close" onClick={() => closePanel('book')} title="Close (B / Esc)">X</button>
      </div>
      {known.length ? known.map(row) : <div class="dim">NO SPELLS YET. READ A SPELLBOOK: RIGHT-CLICK IT IN THE INVENTORY (I).</div>}
      <div class="hint">CLICK OR ENTER: READY FOR Q. HOVER + F5-F8: HOTKEY. B / ESC CLOSE.</div>
    </div>
  );
}
