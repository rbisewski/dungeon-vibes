import { useState } from 'preact/hooks';
import { G } from '../game/state';
import { NPCS, type Offer } from '../game/shops';
import { itemName, quality, storeTarget } from '../rules/inventory';
import { PEDDLER_LOOK } from '../rules/shops';
import { buyOffer, closePanel, cursor, invVersion, payPeddler, shopFor, shopOffers, smithPremium } from './actions';
import { describe, Icon } from './InventoryPanel';
import { panelStyle } from './pixel/frame';

/**
 * A merchant's shop (SPEC §13.2), beside the inventory. Rows show the item, its name and price; red prices are out
 * of reach, `NO ROOM` means it would not fit. Click or Enter buys; right-click or X on a backpack item sells it.
 */
export function ShopPanel() {
  void invVersion.value;
  const m = shopFor.value, cur = cursor.value;
  const [hover, setHover] = useState<Offer | null>(null);
  if (!m) return null;
  const list = shopOffers(), h = G.hero;
  const sel = cur.area === 'shop' ? list[cur.i] ?? null : null;
  const shown = (hover && list.find(o => o.item === hover.item)) ?? sel;
  const veiled = m === 'peddler' && !G.shops.peddler.seen && list.length > 0;

  return (
    <div id="shopPanel" class="px panel" style={panelStyle}>
      <div class="panelHead">
        <span>{NPCS[m].name.toUpperCase()}</span>
        <button class="close" onClick={() => closePanel('shop')} title="Close (Esc)">X</button>
      </div>
      {m === 'smith' && (
        <div class="tabs">
          <button class={smithPremium.value ? '' : 'on'} onClick={() => { smithPremium.value = false; }}>BASIC</button>
          <button class={smithPremium.value ? 'on' : ''} onClick={() => { smithPremium.value = true; }}>PREMIUM</button>
          <span class="hint">TAB</span>
        </div>
      )}
      {veiled ? (
        <div class="veil">
          <div>"I HAVE SOMETHING SPECIAL. {PEDDLER_LOOK} GOLD JUST TO LOOK."</div>
          <button disabled={h.gold < PEDDLER_LOOK} onClick={payPeddler}>PAY {PEDDLER_LOOK} GOLD</button>
        </div>
      ) : !list.length ? (
        <div class="veil">{m === 'peddler' ? '"NOTHING MORE TODAY. COME BACK AFTER YOUR NEXT TRIP DOWN."' : 'NOTHING FOR SALE'}</div>
      ) : (
        <div class="rows" onMouseLeave={() => setHover(null)}>
          {list.map((o, i) => {
            const fits = !!storeTarget(h.inv, o.item), afford = h.gold >= o.price;
            return (
              <div key={o.item.uid} class={'row' + (sel === o ? ' cur' : '')} onMouseEnter={() => setHover(o)}
                onMouseDown={e => { if (e.button === 0) { cursor.value = { area: 'shop', i }; buyOffer(o); } }}>
                <div class="ic"><Icon it={o.item} /></div>
                <span class={`nm q-${quality(o.item)}`}>{itemName(o.item).toUpperCase()}</span>
                <span class={'pr' + (afford ? '' : ' red') + (fits ? '' : ' full')}>{fits ? o.price : 'NO ROOM'}</span>
              </div>
            );
          })}
        </div>
      )}
      <div class="desc">
        {shown && !veiled
          ? describe(shown.item, true).map((l, i) => <div key={i} class={l.cls}>{l.text}</div>)
          : <div class="hint">CLICK OR ENTER BUYS. RIGHT-CLICK OR X ON YOUR ITEMS SELLS. ESC CLOSES.</div>}
      </div>
    </div>
  );
}
