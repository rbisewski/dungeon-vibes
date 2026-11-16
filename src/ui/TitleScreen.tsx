import { useEffect, useRef, useState } from 'preact/hooks';
import { hasFreeSlot, MAX_CHARACTERS } from '../game/save';
import { titleChars, titleContinue, titleDelete, titleNew } from '../game/title';
import { CLASS } from '../rules/classes';
import { Field } from './Panel';

/**
 * Title screen (SPEC §12.2). Up/Down choose a character; Enter continues, N starts a new character, Delete asks
 * to delete (Y confirms, anything else cancels).
 */
export function TitleScreen() {
  const chars = titleChars.value;
  const [selState, setSelState] = useState(0);
  const [confirmState, setConfirmState] = useState(false);
  // Key handling reads live state through a ref: a re-registered handler would only arrive after the next paint.
  const st = useRef({ sel: 0, confirm: false });
  const setSel = (i: number): void => { st.current.sel = i; setSelState(i); };
  const setConfirm = (c: boolean): void => { st.current.confirm = c; setConfirmState(c); };
  const sel = Math.min(selState, chars.length - 1), cur = chars[sel], confirm = confirmState;
  const canNew = hasFreeSlot();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const list = titleChars.value, n = list.length, i = Math.min(st.current.sel, n - 1), c = list[i];
      if (st.current.confirm) {
        e.preventDefault();
        if (e.code === 'KeyY' && c) { titleDelete(c.id); setSel(0); }
        setConfirm(false);
        return;
      }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); setSel((i + n - 1) % n); }
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); setSel((i + 1) % n); }
      else if (e.code === 'Enter' && c) { e.preventDefault(); titleContinue(c.id); }
      else if (e.code === 'KeyN' && hasFreeSlot()) { e.preventDefault(); titleNew(); }
      else if (e.code === 'Delete' || e.code === 'Backspace') { e.preventDefault(); if (c) setConfirm(true); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  return (
    <div id="title" class="px screen">
      <div class="logo">DUNGEON VIBES</div>
      <div class="logoSub">Select hero</div>
      <div class="panel frame dialog">
        <div class="cols">
          <div class="box well">
            <div class="boxHead">{cur ? cur.name : 'NO HERO'}</div>
            {cur && <>
              <Field label="CLASS">{CLASS[cur.cls].name.toUpperCase()}</Field>
              <Field label="LEVEL">{cur.clvl}</Field>
              <Field label="DEPTH">{cur.depth ? `DEPTH ${cur.depth}` : 'TOWN'}</Field>
            </>}
          </div>
          <div class="box well">
            <div class="boxHead">HEROES</div>
            <div class="heroList">
              {chars.map((c, i) => (
                <button key={c.id} class={'mItem' + (c === cur ? ' on' : '')} onClick={() => setSel(i)} onDblClick={() => titleContinue(c.id)}>
                  {c.name}<span class="meta">LEVEL {c.clvl} {CLASS[c.cls].name.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        {confirm && cur ? (
          <div class="confirm">DELETE {cur.name}? THIS CANNOT BE UNDONE.
            <div class="actions">
              <button class="mItem sm" onClick={() => { titleDelete(cur.id); setSel(0); setConfirm(false); }}>YES</button>
              <button class="mItem sm" onClick={() => setConfirm(false)}>NO</button>
            </div>
          </div>
        ) : (
          <div class="actions">
            <button class="mItem sm" onClick={() => cur && titleContinue(cur.id)}>CONTINUE</button>
            <button class="mItem sm" disabled={!canNew} title={canNew ? '' : `${MAX_CHARACTERS} characters at most`} onClick={titleNew}>NEW HERO</button>
            <button class="mItem sm" onClick={() => cur && setConfirm(true)}>DELETE</button>
          </div>
        )}
        <div class="panelFoot">UP / DOWN CHOOSE · ENTER CONTINUE · N NEW HERO · DEL DELETE{confirm ? ' · Y / N' : ''}</div>
      </div>
    </div>
  );
}
