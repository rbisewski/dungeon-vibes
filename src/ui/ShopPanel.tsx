import { useState } from 'preact/hooks';
import { G } from '../game/state';
import { NPCS, type Offer } from '../game/shops';
import { itemName, quality, storeTarget } from '../rules/inventory';
import { PEDDLER_LOOK } from '../rules/shops';
import { buyOffer, closePanel, invVersion, payPeddler, shopFor, shopOffers, smithPremium } from './actions';
import { Desc, describe, Icon } from './InventoryPanel';
import { Panel } from './Panel';

/**
 * A merchant's shop (SPEC §13.2), beside the inventory. Rows show the item, its name and price; red prices are out
 * of reach, `NO ROOM` means it would not fit. Click or Enter buys; right-click or X on a backpack item sells it.
 */
export function ShopPanel() {
  void invVersion.value;
  const m = shopFor.value;
  const [hover, setHover] = useState<Offer | null>(null);
  if (!m) return null;
  const list = shopOffers(), h = G.hero;
  const shown = hover && list.find(o => o.item === hover.item);
  const veiled = m === 'peddler' && !G.shops.peddler.seen && list.length > 0;

  return (
    <Panel id="shopPanel" side="left" title={NPCS[m].name.toUpperCase()} close={() => closePanel('shop')} closeKeys="Esc"
      foot={<>CLICK BUYS · RIGHT-CLICK YOUR ITEMS TO SELL{m === 'smith' && <> · TAB WARES</>} · ESC CLOSE</>}>
      {m === 'smith' && (
        <div class="tabs">
          <button class={'btn sm' + (smithPremium.value ? '' : ' on')} onClick={() => { smithPremium.value = false; }}>BASIC</button>
          <button class={'btn sm' + (smithPremium.value ? ' on' : '')} onClick={() => { smithPremium.value = true; }}>PREMIUM</button>
        </div>
      )}
      {veiled ? (
        <div class="veil well">
          <div>"I HAVE SOMETHING SPECIAL. {PEDDLER_LOOK} GOLD JUST TO LOOK."</div>
          <button class="btn" disabled={h.gold < PEDDLER_LOOK} onClick={payPeddler}>PAY {PEDDLER_LOOK} GOLD</button>
        </div>
      ) : !list.length ? (
        <div class="veil well">{m === 'peddler' ? '"NOTHING MORE TODAY. COME BACK AFTER YOUR NEXT TRIP DOWN."' : 'NOTHING FOR SALE'}</div>
      ) : (
        <div class="rows well" onMouseLeave={() => setHover(null)}>
          {list.map(o => {
            const fits = !!storeTarget(h.inv, o.item), afford = h.gold >= o.price;
            return (
              <div key={o.item.uid} class="row" onMouseEnter={() => setHover(o)}
                onMouseDown={e => { if (e.button === 0) buyOffer(o); }}>
                <div class="ic"><Icon it={o.item} /></div>
                <span class={`nm q-${quality(o.item)}`}>{itemName(o.item).toUpperCase()}</span>
                <span class={'pr' + (afford ? '' : ' red') + (fits ? '' : ' full')}>{fits ? o.price : 'NO ROOM'}</span>
              </div>
            );
          })}
        </div>
      )}
      <Desc lines={shown && !veiled ? describe(shown.item, true) : null} empty="HOVER A WARE TO SEE IT" />
    </Panel>
  );
}
