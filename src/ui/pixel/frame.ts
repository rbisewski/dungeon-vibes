import { WALL_CANVAS } from '../../render/textures';
import { pixImage } from './pixArt';

/** 9-slice pixel border (3 px corners/edges, scaled 3× in CSS via `border-image`). */
const FRAME = pixImage([
  '.kkkkkkk.',
  'kyyyyyyyk',
  'kygggggyk',
  'kyg...gyk',
  'kyg...gyk',
  'kyg...gyk',
  'kygggggyk',
  'kyyyyyyyk',
  '.kkkkkkk.',
]);

/** Inline style for a pixel-framed panel on darkened dungeon stone. */
export const panelStyle: Record<string, string> = {
  borderStyle: 'solid',
  borderWidth: '9px',
  borderImage: `url(${FRAME.src}) 3 / 9px stretch`,
  background: `linear-gradient(rgba(10,7,6,.86), rgba(10,7,6,.86)), url(${WALL_CANVAS.toDataURL()}) 0 0 / 192px`,
};
