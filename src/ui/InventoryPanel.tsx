import { useEffect, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { itemIcon } from '../art/itemIcons';
import { G } from '../game/state';
import { base } from '../rules/bases';
import { isTwoHanded, itemAt, itemName, itemSize, meetsReq, PACK_H, PACK_W, slotFor, type EquipSlot, type Item } from '../rules/inventory';
import { POTIONS } from '../rules/potions';
import { clickEquip, clickPack, closePanel, cursor, dropHeld, held, invVersion, unequip, usePackItem } from './actions';
import { panelStyle } from './pixel/frame';

/** One backpack cell in CSS px (28 px art + 1 px separator). */
const CELL = 29;

/** Paper-doll slot rectangles in cells (D1 layout, 10 × 6). */
const DOLL: Record<EquipSlot, { x: number; y: number; w: number; h: number; label: string }> = {
  head: { x: 4, y: 0, w: 2, h: 2, label: 'HEAD' },
  amulet: { x: 7, y: 1, w: 1, h: 1, label: 'NECK' },
  weapon: { x: 0, y: 2, w: 2, h: 3, label: 'WEAPON' },
  body: { x: 4, y: 2, w: 2, h: 3, label: 'BODY' },
  shield: { x: 8, y: 2, w: 2, h: 3, label: 'SHIELD' },
  ring1: { x: 2, y: 5, w: 1, h: 1, label: 'RING' },
  ring2: { x: 7, y: 5, w: 1, h: 1, label: 'RING' },
};
const SLOTS = Object.keys(DOLL) as EquipSlot[];

const attrs = () => G.hero.stats.base;

function Icon({ it, dim }: { it: Item; dim?: boolean }) {
  const ic = itemIcon(it);
  return <img src={ic.src} width={ic.w * 2} height={ic.h * 2} style={dim ? { opacity: .3, filter: 'grayscale(1)' } : undefined} alt="" draggable={false} />;
}

/** Description lines for the hovered or held item (D1 description box). */
function describe(it: Item): { text: string; cls?: string }[] {
  const lines: { text: string; cls?: string }[] = [{ text: itemName(it).toUpperCase(), cls: 'name' }];
  if (it.kind === 'potion') {
    const p = POTIONS[it.potion];
    const what = [p.life !== 'none' && (p.life === 'full' ? 'ALL LIFE' : 'SOME LIFE'), p.mana !== 'none' && (p.mana === 'full' ? 'ALL MANA' : 'SOME MANA')].filter(Boolean).join(' AND ');
    lines.push({ text: `RESTORES ${what}` }, { text: 'RIGHT-CLICK OR X TO DRINK', cls: 'hint' });
  } else if (it.kind === 'elixir') {
    lines.push({ text: `+1 ${{ str: 'STRENGTH', int: 'INTELLIGENCE', dex: 'DEXTERITY', vit: 'VITALITY' }[it.attr]} PERMANENTLY` }, { text: 'RIGHT-CLICK OR X TO DRINK', cls: 'hint' });
  } else {
    const b = base(it.base);
    if (b.kind === 'weapon') lines.push({ text: `DAMAGE: ${b.dmg[0]}-${b.dmg[1]}` }, { text: b.twoHanded ? 'TWO-HANDED' : 'ONE-HANDED' });
    else lines.push({ text: `ARMOR: ${it.ac}` });
    const req = (['str', 'dex', 'int'] as const).filter(a => b.req[a]);
    if (req.length) lines.push({ text: 'REQUIRES ' + req.map(a => `${b.req[a]} ${a.toUpperCase()}`).join(', '), cls: meetsReq(it, attrs()) ? undefined : 'red' });
    lines.push({ text: 'RIGHT-CLICK OR X TO EQUIP', cls: 'hint' });
  }
  return lines;
}

/** D1 inventory: paper doll, 10×4 backpack and a description box. Pauses the game. */
export function InventoryPanel() {
  void invVersion.value; // re-render on every inventory change
  const inv = G.hero.inv, h = held.value, cur = cursor.value;
  const [hover, setHover] = useState<Item | null>(null);
  const [mouse, setMouse] = useState({ x: -100, y: -100 });

  useEffect(() => {
    const move = (e: PointerEvent) => setMouse({ x: e.clientX, y: e.clientY });
    // Clicking the game view while holding an item drops it on the floor (D1).
    const down = (e: PointerEvent) => { if (e.target === document.getElementById('c') && held.value) dropHeld(); };
    addEventListener('pointermove', move);
    addEventListener('pointerdown', down);
    return () => { removeEventListener('pointermove', move); removeEventListener('pointerdown', down); };
  }, []);

  const cellOf = (e: MouseEvent): [number, number] => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return [Math.floor((e.clientX - r.left) / CELL), Math.floor((e.clientY - r.top) / CELL)];
  };
  const packDown = (e: MouseEvent) => { if (e.button === 0) { const [x, y] = cellOf(e); clickPack(x, y); } };
  const packMenu = (e: MouseEvent) => { e.preventDefault(); const [x, y] = cellOf(e); const p = itemAt(inv.pack, x, y); if (p) usePackItem(p.item); };
  const packMove = (e: MouseEvent) => { const [x, y] = cellOf(e); setHover(itemAt(inv.pack, x, y)?.item ?? null); };

  const shown = hover ?? h;
  const fitsHeld = (s: EquipSlot) => !!h && slotFor(h) === s && meetsReq(h, attrs());
  const box = (x: number, y: number, w: number, hh: number): JSX.CSSProperties => ({ left: x * CELL, top: y * CELL, width: w * CELL - 1, height: hh * CELL - 1 });

  return (
    <div id="invPanel" class="px panel" style={panelStyle}>
      <div class="panelHead">
        <span>INVENTORY</span>
        <span>GOLD {G.hero.gold}</span>
        <button class="close" onClick={() => closePanel('inv')} title="Close (I / Esc)">X</button>
      </div>

      <div class="doll" style={{ width: PACK_W * CELL - 1, height: 6 * CELL - 1 }}>
        {SLOTS.map(s => {
          const d = DOLL[s], it = inv.equip[s];
          const ghost = s === 'shield' && !it && isTwoHanded(inv.equip.weapon) ? inv.equip.weapon : null;
          const sel = cur.area === 'equip' && cur.slot === s;
          return (
            <div
              key={s}
              class={'slot' + (it && !meetsReq(it, attrs()) ? ' bad' : '') + (fitsHeld(s) ? ' ok' : '') + (sel ? ' cur' : '')}
              style={box(d.x, d.y, d.w, d.h)}
              onMouseDown={e => { if (e.button === 0) clickEquip(s); }}
              onContextMenu={e => { e.preventDefault(); unequip(s); }}
              onMouseEnter={() => setHover(it)}
              onMouseLeave={() => setHover(null)}
            >
              {it ? <Icon it={it} /> : ghost ? <Icon it={ghost} dim /> : <span class="slotLabel">{d.label}</span>}
            </div>
          );
        })}
      </div>

      <div class="grid" style={{ width: PACK_W * CELL - 1, height: PACK_H * CELL - 1 }}
        onMouseDown={packDown} onContextMenu={packMenu} onMouseMove={packMove} onMouseLeave={() => setHover(null)}>
        {cur.area === 'pack' && <div class="cursor" style={box(cur.x, cur.y, 1, 1)} />}
        {inv.pack.items.map(p => {
          const s = itemSize(p.item);
          return (
            <div key={p.item.uid} class={'item' + (meetsReq(p.item, attrs()) ? '' : ' bad')} style={box(p.x, p.y, s.w, s.h)}>
              <Icon it={p.item} />
            </div>
          );
        })}
      </div>

      <div class="desc">
        {shown ? describe(shown).map((l, i) => <div key={i} class={l.cls}>{l.text}</div>) : <div class="hint">HOVER AN ITEM. I / ESC CLOSE. ARROWS + ENTER MOVE, X USE, G DROP.</div>}
        {h && shown !== h && <div class="hint">HOLDING {itemName(h).toUpperCase()}</div>}
      </div>

      {h && (
        <div class="heldItem" style={{ left: mouse.x, top: mouse.y }}>
          <Icon it={h} />
        </div>
      )}
    </div>
  );
}
