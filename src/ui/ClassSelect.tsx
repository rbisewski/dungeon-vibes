import { useEffect, useRef, useState } from 'preact/hooks';
import { chooseClass, closeClassSelect, menuClass, menuStep, startRun } from '../game/classSelect';
import { listCharacters } from '../game/save';
import { openTitle } from '../game/title';
import { CLASS, CLASS_BLURB, CLASS_IDS } from '../rules/classes';
import { SKILLS, CLASS_SKILL } from '../rules/skills';
import { derive } from '../rules/stats';
import { panelStyle } from './pixel/frame';

const MAX_NAME = 12;

/** Class select and name entry (SPEC §3.1). Arrow keys choose, Enter confirms; Esc on the name step goes back. */
export function ClassSelect() {
  const step = menuStep.value, cls = menuClass.value, def = CLASS[cls];
  const [name, setName] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== 'class') return;
    const onKey = (e: KeyboardEvent) => {
      const i = CLASS_IDS.indexOf(menuClass.value);
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); chooseClass(CLASS_IDS[(i + 2) % 3]); }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); chooseClass(CLASS_IDS[(i + 1) % 3]); }
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

  return (
    <div id="classSelect" class="px">
      <div class="title">DUNGEON VIBES</div>
      <div class="classTabs">
        {CLASS_IDS.map(c => (
          <button key={c} class={c === cls ? 'on' : ''} onClick={() => { chooseClass(c); menuStep.value = 'class'; }}>{CLASS[c].name.toUpperCase()}</button>
        ))}
      </div>
      <div class="panel classCard" style={panelStyle}>
        <div class="blurb">{CLASS_BLURB[cls]}</div>
        <div class="attrs4">
          <span>STR <b>{def.base.str}</b></span><span>INT <b>{def.base.int}</b></span>
          <span>DEX <b>{def.base.dex}</b></span><span>VIT <b>{def.base.vit}</b></span>
        </div>
        <div class="attrs4">
          <span>LIFE <b>{d.maxLife}</b></span><span>MANA <b>{d.maxMana}</b></span>
          <span>SKILL <b>{SKILLS[CLASS_SKILL[cls]].name.toUpperCase()}</b></span>
        </div>
        {step === 'class' ? (
          <div class="hint">LEFT / RIGHT CHOOSE - ENTER SELECT{listCharacters().length ? ' - ESC BACK' : ''}</div>
        ) : (
          <div class="nameRow">
            <span>NAME</span>
            <input
              ref={input}
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
            <button onClick={start}>START</button>
          </div>
        )}
      </div>
    </div>
  );
}
