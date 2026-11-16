import { useEffect, useRef, useState } from 'preact/hooks';
import { chooseClass, closeClassSelect, menuClass, menuStep, startRun } from '../game/classSelect';
import { listCharacters } from '../game/save';
import { openTitle } from '../game/title';
import { CLASS, CLASS_BLURB, CLASS_IDS } from '../rules/classes';
import { SKILLS, CLASS_SKILL } from '../rules/skills';
import { derive } from '../rules/stats';
import { Field } from './Panel';

const MAX_NAME = 12;

/** Class select and name entry (SPEC §3.1, §10.8). Arrow keys choose, Enter confirms; Esc goes back. */
export function ClassSelect() {
  const step = menuStep.value, cls = menuClass.value, def = CLASS[cls];
  const [name, setName] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== 'class') return;
    const onKey = (e: KeyboardEvent) => {
      const i = CLASS_IDS.indexOf(menuClass.value);
      if (['ArrowLeft', 'KeyA', 'ArrowUp', 'KeyW'].includes(e.code)) { e.preventDefault(); chooseClass(CLASS_IDS[(i + 2) % 3]); }
      else if (['ArrowRight', 'KeyD', 'ArrowDown', 'KeyS'].includes(e.code)) { e.preventDefault(); chooseClass(CLASS_IDS[(i + 1) % 3]); }
      else if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); menuStep.value = 'name'; }
      else if (e.code === 'Escape' && listCharacters().length) { e.preventDefault(); closeClassSelect(); openTitle(); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [step]);

  useEffect(() => { if (step === 'name') input.current?.focus(); }, [step]);

  if (!step) return null;
  const d = derive({ cls, clvl: 1, base: def.base });
  const start = () => startRun((name.trim() || def.name).toUpperCase());

  const back = () => { if (step === 'name') menuStep.value = 'class'; else { closeClassSelect(); openTitle(); } };
  const canBack = step === 'name' || listCharacters().length > 0;
  return (
    <div id="classSelect" class="px screen">
      <div class="logo">DUNGEON VIBES</div>
      <div class="logoSub">New hero</div>
      <div class="panel frame dialog">
        <div class="cols">
          <div class="box well">
            <div class="boxHead">CHOOSE CLASS</div>
            <div class="menuList">
              {CLASS_IDS.map(c => (
                <button key={c} class={'mItem' + (c === cls ? ' on' : '')} onClick={() => { chooseClass(c); menuStep.value = 'class'; }}>{CLASS[c].name}</button>
              ))}
            </div>
            <div class="blurb dim">{CLASS_BLURB[cls]}</div>
          </div>
          <div class="box well">
            <div class="boxHead">{def.name.toUpperCase()}</div>
            <div class="stats2">
              <Field label="STRENGTH">{def.base.str}</Field>
              <Field label="LIFE">{d.maxLife}</Field>
              <Field label="INTELLIGENCE">{def.base.int}</Field>
              <Field label="MANA">{d.maxMana}</Field>
              <Field label="DEXTERITY">{def.base.dex}</Field>
              <Field label="VITALITY">{def.base.vit}</Field>
            </div>
            <Field label="SKILL">{SKILLS[CLASS_SKILL[cls]].name.toUpperCase()}</Field>
            {step === 'name' && (
              <div class="field">
                <span class="label">NAME</span>
                <input
                  ref={input}
                  class="well"
                  value={name}
                  maxLength={MAX_NAME}
                  placeholder={def.name.toUpperCase()}
                  onInput={e => setName((e.currentTarget as HTMLInputElement).value.toUpperCase().replace(/[^A-Z0-9 '-]/g, ''))}
                  onKeyDown={e => {
                    e.stopPropagation();
                    if (e.key === 'Enter') start();
                    if (e.key === 'Escape') menuStep.value = 'class';
                  }}
                />
              </div>
            )}
          </div>
        </div>
        <div class="actions">
          <button class="mItem sm" onClick={() => (step === 'name' ? start() : (menuStep.value = 'name'))}>{step === 'name' ? 'START' : 'OK'}</button>
          {canBack && <button class="mItem sm" onClick={back}>BACK</button>}
        </div>
        <div class="panelFoot">
          {step === 'class' ? <>UP / DOWN CHOOSE · ENTER OK{listCharacters().length ? ' · ESC BACK' : ''}</> : <>TYPE A NAME · ENTER START · ESC BACK</>}
        </div>
      </div>
    </div>
  );
}
