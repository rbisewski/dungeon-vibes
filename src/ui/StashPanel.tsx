import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { G, STASH_H, STASH_W } from '../game/state';
import { itemAt, itemSize, meetsReq, type Item } from '../rules/inventory';
import { clickStash, closePanel, cursor, depositGold, held, invVersion, stashToPack, withdrawGold } from './actions';
import { attrs, CELL, describe, Icon } from './InventoryPanel';
import { panelStyle } from './pixel/frame';

/**
 * The stash (SPEC §13.1): a 10×10 grid on the left, the inventory on the right. Click to pick up or place (with
 * swap); right-click or X moves an item across. Gold is one counter: deposit or withdraw all of it.
 */
export function StashPanel() {
  void invVersion.value;
  const g = G.stash.grid, cur = cursor.value;
  const [hover, setHover] = useState<Item | null>(null);
  const cellOf = (e: MouseEvent): [number, number] => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return [Math.floor((e.clientX - r.left) / CELL), Math.floor((e.clientY - r.top) / CELL)];
  };
  const box = (x: number, y: number, w: number, h: number): JSX.CSSProperties => ({ left: x * CELL, top: y * CELL, width: w * CELL - 1, height: h * CELL - 1 });
  const shown = hover && g.items.some(p => p.item === hover) ? hover : null;

  return (
    <div id="stashPanel" class="px panel" style={panelStyle}>
      <div class="panelHead">
        <span>STASH</span>
        <button class="close" onClick={() => closePanel('stash')} title="Close (Esc)">X</button>
      </div>
      <div class="goldRow">
        <span>GOLD {G.stash.gold}</span>
        <button onClick={depositGold} disabled={!G.hero.gold}>DEPOSIT</button>
        <button onClick={withdrawGold} disabled={!G.stash.gold}>WITHDRAW</button>
      </div>
      <div class="grid" style={{ width: STASH_W * CELL - 1, height: STASH_H * CELL - 1 }}
        onMouseDown={e => { if (e.button === 0) { const [x, y] = cellOf(e); clickStash(x, y); } }}
        onContextMenu={e => { e.preventDefault(); const [x, y] = cellOf(e); const p = itemAt(g, x, y); if (p && !held.value) stashToPack(p.item); }}
        onMouseMove={e => { const [x, y] = cellOf(e); setHover(itemAt(g, x, y)?.item ?? null); }}
        onMouseLeave={() => setHover(null)}>
        {cur.area === 'stash' && <div class="cursor" style={box(cur.x, cur.y, 1, 1)} />}
        {g.items.map(p => {
          const s = itemSize(p.item);
          return (
            <div key={p.item.uid} class={'item' + (meetsReq(p.item, attrs()) ? '' : ' bad')} style={box(p.x, p.y, s.w, s.h)}>
              <Icon it={p.item} />
            </div>
          );
        })}
      </div>
      <div class="desc">
        {shown ? describe(shown).map((l, i) => <div key={i} class={l.cls}>{l.text}</div>) : <div class="hint">CLICK TO MOVE. RIGHT-CLICK OR X SENDS AN ITEM ACROSS. ARROWS + ENTER. ESC CLOSES.</div>}
      </div>
    </div>
  );
}
