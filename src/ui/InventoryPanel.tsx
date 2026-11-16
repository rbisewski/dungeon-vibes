import { useEffect, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { itemIcon } from '../art/itemIcons';
import { G } from '../game/state';
import { base } from '../rules/bases';
import { propText } from '../rules/affixes';
import { learnReq, MAX_SLVL, scrollReq, spellEffectText } from '../rules/spells';
import { spellLevel } from '../actors/spells';
import { carried, fitsSlot, isTwoHanded, isUnidentified, itemAc, itemAt, itemName, itemSize, meetsReq, quality, PACK_H, PACK_W, type EquipSlot, type Item } from '../rules/inventory';
import { POTIONS } from '../rules/potions';
import { clickEquip, clickPack, closePanel, dropHeld, held, identifying, invVersion, shopFor, sparkle, unequip, usePackItem } from './actions';
import { NPCS } from '../game/shops';
import { sellPrice } from '../rules/prices';
import { buys } from '../rules/shops';
import { Field, Panel } from './Panel';

/** One backpack cell in CSS px (28 px art + 1 px separator). */
export const CELL = 29;

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

/** Current attributes (base + items), what requirements are checked against. */
export const attrs = () => G.hero.d.attr;

export function Icon({ it, dim }: { it: Item; dim?: boolean }) {
  const ic = itemIcon(it);
  return <img src={ic.src} width={ic.w} height={ic.h} style={dim ? { opacity: .3, filter: 'grayscale(1)' } : undefined} alt="" draggable={false} />;
}

/** Description lines for the hovered or held item (D1 description box). */
/**
 * Description box lines. The closing hint says how to use a carried item; with a shop open it says what selling it
 * fetches instead, and for a shop's own wares (`forSale`) how to buy.
 */
export function describe(it: Item, forSale = false): { text: string; cls?: string }[] {
  const lines: { text: string; cls?: string }[] = [{ text: itemName(it).toUpperCase(), cls: `name q-${quality(it)}` }];
  let use: string;
  if (it.kind === 'potion') {
    const p = POTIONS[it.potion];
    const what = [p.life !== 'none' && (p.life === 'full' ? 'ALL LIFE' : 'SOME LIFE'), p.mana !== 'none' && (p.mana === 'full' ? 'ALL MANA' : 'SOME MANA')].filter(Boolean).join(' AND ');
    lines.push({ text: `RESTORES ${what}` });
    use = 'DRINK';
  } else if (it.kind === 'elixir') {
    lines.push({ text: `+1 ${{ str: 'STRENGTH', int: 'INTELLIGENCE', dex: 'DEXTERITY', vit: 'VITALITY' }[it.attr]} PERMANENTLY` });
    use = 'DRINK';
  } else if (it.kind === 'scroll') {
    const need = scrollReq(it.spell), h = G.hero;
    lines.push({ text: spellEffectText(it.spell, { cls: h.stats.cls, clvl: h.stats.clvl, slvl: spellLevel(h, it.spell), int: h.d.attr.int }) });
    if (need) lines.push({ text: `REQUIRES ${need} INT`, cls: attrs().int >= need ? undefined : 'red' });
    use = 'READ';
  } else if (it.kind === 'book') {
    // D1: a book shows the requirement for the level the hero would learn next.
    const known = G.hero.spells[it.spell] ?? 0, n = known + 1;
    if (n > MAX_SLVL) lines.push({ text: 'ALREADY MASTERED', cls: 'red' });
    else {
      lines.push({ text: known ? `RAISES TO SPELL LEVEL ${n}` : 'TEACHES THE SPELL' });
      lines.push({ text: `REQUIRES ${learnReq(it.spell, n)} INT`, cls: attrs().int >= learnReq(it.spell, n) ? undefined : 'red' });
    }
    use = 'READ';
  } else {
    const b = base(it.base);
    if (b.kind === 'weapon') lines.push({ text: `DAMAGE: ${b.dmg[0]}-${b.dmg[1]}` }, { text: b.twoHanded ? 'TWO-HANDED' : 'ONE-HANDED' });
    else if (b.kind === 'armor') lines.push({ text: `ARMOR: ${itemAc(it, it.identified)}` });
    if (!it.identified) lines.push({ text: 'NOT IDENTIFIED' });
    else for (const p of it.props) lines.push({ text: propText(p), cls: 'blue' });
    const req = (['str', 'dex', 'int'] as const).filter(a => b.req[a]);
    if (req.length) lines.push({ text: 'REQUIRES ' + req.map(a => `${b.req[a]} ${a.toUpperCase()}`).join(', '), cls: meetsReq(it, attrs()) ? undefined : 'red' });
    use = 'EQUIP';
  }
  const m = shopFor.value;
  if (forSale) lines.push({ text: 'CLICK TO BUY', cls: 'hint' });
  else if (!m) lines.push({ text: `RIGHT-CLICK TO ${use}`, cls: 'hint' });
  else if (buys(m, it)) lines.push({ text: `SELLS FOR ${sellPrice(it)} GOLD - RIGHT-CLICK`, cls: 'hint' });
  else lines.push({ text: `${NPCS[m].role.toUpperCase()} WILL NOT BUY THIS`, cls: 'red' });
  return lines;
}

/** The description well under a grid: the item's lines, or a prompt when nothing is hovered. */
export function Desc({ lines, empty, extra }: { lines: { text: string; cls?: string }[] | null; empty: string; extra?: string }) {
  return (
    <div class="desc well">
      {lines ? lines.map((l, i) => <div key={i} class={l.cls}>{l.text}</div>) : <div class="empty">{empty}</div>}
      {extra && <div class="hint">{extra}</div>}
    </div>
  );
}

/** D1 inventory: paper doll, 10×4 backpack and a description box. Pauses the game. */
export function InventoryPanel() {
  void invVersion.value; // re-render on every inventory change
  const inv = G.hero.inv, h = held.value;
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

  // A hovered item that was just used up (book read, potion drunk) no longer describes anything.
  const shown = (hover && carried(inv).includes(hover) ? hover : null) ?? h;
  const fitsHeld = (s: EquipSlot) => !!h && !identifying.value && fitsSlot(h, s) && meetsReq(h, attrs());
  const mark = (it: Item | null) => (it && identifying.value && isUnidentified(it) ? ' target' : '') + (it && sparkle.value === it.uid ? ' sparkle' : '');
  const box = (x: number, y: number, w: number, hh: number): JSX.CSSProperties => ({ left: x * CELL, top: y * CELL, width: w * CELL - 1, height: hh * CELL - 1 });

  return (
    <Panel id="invPanel" side="right" cls={identifying.value ? 'identifying' : ''} title={identifying.value ? 'IDENTIFY' : 'INVENTORY'}
      close={() => closePanel('inv')} closeKeys="I / Esc" foot="I / ESC CLOSE · RIGHT-CLICK USES · G DROPS THE HELD ITEM">
      <div class="doll" style={{ width: PACK_W * CELL - 1, height: 6 * CELL - 1 }}>
        {SLOTS.map(s => {
          const d = DOLL[s], it = inv.equip[s];
          const ghost = s === 'shield' && !it && isTwoHanded(inv.equip.weapon) ? inv.equip.weapon : null;
          return (
            <div
              key={s}
              class={'slot well' + (it && !G.hero.gearOk.has(it.uid) ? ' bad' : '') + (fitsHeld(s) ? ' ok' : '') + mark(it)}
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
        {inv.pack.items.map(p => {
          const s = itemSize(p.item);
          return (
            <div key={p.item.uid} class={'item' + (meetsReq(p.item, attrs()) ? '' : ' bad') + mark(p.item)} style={box(p.x, p.y, s.w, s.h)}>
              <Icon it={p.item} />
            </div>
          );
        })}
      </div>

      <Field label="GOLD" cls="goldLine">{G.hero.gold}</Field>
      <Desc lines={shown ? describe(shown) : null} empty="HOVER AN ITEM TO SEE IT" extra={h && shown !== h ? `HOLDING ${itemName(h).toUpperCase()}` : undefined} />

      {h && (
        <div class="heldItem" style={{ left: mouse.x, top: mouse.y }}>
          <Icon it={h} />
        </div>
      )}
    </Panel>
  );
}
