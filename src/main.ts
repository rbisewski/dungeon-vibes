import '@fontsource/press-start-2p/400.css';
import './style.css';
import { render, h } from 'preact';
import { Hud } from './ui/Hud';
import { soundOn } from './ui/store';
import { Snd } from './audio/sound';
import { G } from './game/state';
import { createHero } from './actors/hero';
import { buildLevel } from './world/level';
import { simulate, startLoop } from './game/loop';
import { openClassSelect } from './game/classSelect';
import { renderer } from './render/renderer';

render(h(Hud, null), document.getElementById('ui')!);

addEventListener('pointerdown', () => { Snd.init(); soundOn.value = true; }, { once: true });

// A placeholder hero lets depth 1 build behind the class select, which replaces it.
G.hero = createHero('warrior', '');
buildLevel(G.depth);
startLoop();
openClassSelect();

// Dev-only handle for inspecting live state from the browser console.
if (import.meta.env.DEV) Object.assign(window, { G, renderer, simulate, buildLevel });
