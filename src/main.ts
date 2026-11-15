import '@fontsource/press-start-2p/400.css';
import './style.css';
import { render, h } from 'preact';
import { Hud } from './ui/Hud';
import { soundOn } from './ui/store';
import { Snd } from './audio/sound';
import { G } from './game/state';
import { createHero } from './actors/hero';
import { buildLevel } from './world/level';
import { spawnMonster } from './actors/monsters';
import { simulate, startLoop } from './game/loop';
import { openTitle } from './game/title';
import { saveGame } from './game/save';
import { camera, renderer } from './render/renderer';
import { camTarget } from './render/cameraRig';
import { POST, postMat } from './render/post';
import { circleBlocked, clearLine } from './world/nav';

render(h(Hud, null), document.getElementById('ui')!);

addEventListener('pointerdown', () => { Snd.init(); soundOn.value = true; }, { once: true });

// A placeholder hero lets depth 1 build behind the title screen and class select, which replace it.
G.hero = createHero('warrior', '');
buildLevel(G.depth);
startLoop();
openTitle();
// Reloading or closing the tab keeps the run exactly where it was (SPEC §12.2).
addEventListener('pagehide', saveGame);
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveGame(); });

// Dev-only handle for inspecting live state from the browser console.
if (import.meta.env.DEV) Object.assign(window, { G, renderer, simulate, buildLevel, spawnMonster, camTarget, camera, postMat, POST, nav: { circleBlocked, clearLine } });
