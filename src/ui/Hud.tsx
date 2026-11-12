import type { PixImage } from './pixel/pixArt';
import { ICON } from './icons';
import { fade, hud, soundOn, toastOn, toastSub, toastText } from './store';

function Pix({ img, scale = 3, style }: { img: PixImage; scale?: number; style?: Record<string, string> }) {
  return <img src={img.src} width={img.w * scale} height={img.h * scale} style={style} alt="" />;
}

function Hearts() {
  const hp = hud.hp.value;
  return (
    <div id="hearts">
      {[0, 1, 2, 3, 4].map(i => {
        const v = hp - i * 2;
        return <Pix key={i} img={v >= 2 ? ICON.heartFull : v === 1 ? ICON.heartHalf : ICON.heartEmpty} />;
      })}
    </div>
  );
}

function Stats() {
  return (
    <div id="hud" class="px">
      <Hearts />
      <div class="row"><Pix img={ICON.gold} /><span>{hud.gold}</span></div>
      <div class="row"><Pix img={ICON.slain} /><span>{hud.slain}</span></div>
      <div class="row"><Pix img={ICON.depth} /><span>DEPTH {hud.depth}</span></div>
      <div class="row">
        <Pix img={ICON.potion} /><span>{hud.potions}</span>
        {hud.key.value && <Pix img={ICON.key} style={{ marginLeft: '10px' }} />}
      </div>
    </div>
  );
}

function Mode() {
  return (
    <div id="mode" class="px">
      <div>{hud.manual.value ? 'YOU' : 'AUTO'}</div>
      <div class="sub">WASD/ARROWS MOVE<br />SPACE ATTACK</div>
    </div>
  );
}

function Toast() {
  return (
    <div id="toast" class="px" style={{ opacity: toastOn.value ? 1 : 0 }}>
      {toastText}
      {toastSub.value && <span class="sub">{toastSub}</span>}
    </div>
  );
}

function BossBar() {
  return (
    <div id="boss" class="px" style={{ opacity: hud.bossVisible.value ? 1 : 0 }}>
      <div>BONE WARDEN</div>
      <div class="bar"><div id="bossfill" style={{ width: `${100 * hud.bossFrac.value}%` }} /></div>
    </div>
  );
}

function Fade() {
  return <div id="fade" style={{ opacity: fade.value.toFixed(3) }} />;
}

function SoundPrompt() {
  const on = soundOn.value;
  return (
    <div id="snd" class={'px' + (on ? ' off' : '')} title="Enable sound">
      <Pix img={ICON.sound} scale={2} /><span>CLICK FOR SOUND</span>
    </div>
  );
}

export function Hud() {
  return (
    <>
      <Stats />
      <Mode />
      <Toast />
      <BossBar />
      <Fade />
      <SoundPrompt />
    </>
  );
}
