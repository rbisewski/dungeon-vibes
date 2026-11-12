import '@fontsource/press-start-2p/400.css';
import './style.css';
import { render, h } from 'preact';
import { Hud } from './ui/Hud';
import { soundOn } from './ui/store';
import { Snd } from './audio/sound';
import { G } from './game/state';
import { createHero } from './actors/hero';
import { buildLevel } from './world/level';
import { startLoop } from './game/loop';

render(h(Hud, null), document.getElementById('ui')!);

addEventListener('pointerdown', () => { Snd.init(); soundOn.value = true; }, { once: true });

G.hero = createHero();
buildLevel(G.depth);
startLoop();
