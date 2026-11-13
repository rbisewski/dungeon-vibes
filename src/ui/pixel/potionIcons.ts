import type { PotionId } from '../../rules/potions';
import { pixImage, type PixImage } from './pixArt';

/** 14×14 cell art. `L`/`l` are the liquid's light/dark shade, filled per potion colour. */
const SMALL = [
  '..............',
  '.....kkkk.....',
  '.....kcck.....',
  '......kk......',
  '.....kWgk.....',
  '....kLLLLk....',
  '...kLwLLLLk...',
  '..kLwLLLLLLk..',
  '..kLLLLLLLLk..',
  '..kLLLLLLLlk..',
  '..klLLLLLLlk..',
  '...kllllllk...',
  '....kkkkkk....',
  '..............',
];
/** Full potions: bigger flask with a gold rim. */
const FULL = [
  '.....YYYY.....',
  '.....YccY.....',
  '.....YkkY.....',
  '....YgWWgY....',
  '...YLLLLLLY...',
  '..YLwLLLLLLY..',
  '.YLwLLLLLLLLY.',
  '.YLLLLLLLLLLY.',
  '.YLLLLLLLLLLY.',
  '.YLLLLLLLLLlY.',
  '.YlLLLLLLLllY.',
  '..YllllllllY..',
  '...YYYYYYYY...',
  '..............',
];

const paint = (rows: string[], light: string, dark: string): PixImage =>
  pixImage(rows.map(r => r.replace(/L/g, light).replace(/l/g, dark)));

export const POTION_ICON: Record<PotionId, PixImage> = {
  heal: paint(SMALL, 'R', 'r'),
  fullHeal: paint(FULL, 'R', 'r'),
  mana: paint(SMALL, 'N', 'n'),
  fullMana: paint(FULL, 'N', 'n'),
  rejuv: paint(SMALL, 'U', 'u'),
  fullRejuv: paint(FULL, 'U', 'u'),
};
