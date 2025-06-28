import {
  AnimationName,
  TubAnimationName,
  CatAnimationName,
} from './canvas.types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const FRAME_SIZE = 96;
export const DEFAULT_FRAME_DELAY = 150;
export const MAX_DELTA_TIME = 100;

export const CAT_ANIMATION_ROWS: Readonly<Record<CatAnimationName, number>> = {
  'sit-blink': 0,
  'sit-tail-whip': 1,
  'sit-groom-paw': 2,
  'walk-left': 3,
  'walk-right': 4,
  carried: 5,
  'in-tub': 6,
};

export const CAT_FRAME_COUNTS: Readonly<Record<CatAnimationName, number>> = {
  'walk-left': 9,
  'sit-blink': 4,
  'sit-tail-whip': 6,
  'sit-groom-paw': 15,
  'walk-right': 9,
  carried: 1,
  'in-tub': 1,
};

export const WALK_SPEED = 2;
export const PAUSE_DURATION = 2000;
export const CAT_SITTING_Y = 32;
export const CAT_TARGET_X = 696;

export const CAT_SPRITE_SHEET_PATH = './assets/sprites/cats/orange-cat.png';
export const TUB_SPRITE_SHEET_PATH = './assets/sprites/stations/tub-sheet.png';

export const TUB_FRAME_SIZE = FRAME_SIZE;
export const TUB_DEFAULT_X = (CANVAS_WIDTH - TUB_FRAME_SIZE) / 2;
export const TUB_DEFAULT_Y = (CANVAS_HEIGHT - TUB_FRAME_SIZE) / 2;

export const TUB_ANIMATION_ROWS: Readonly<Record<TubAnimationName, number>> = {
  'tub-empty': 0,
  'tub-filled': 1,
};

export const TUB_FRAME_COUNTS: Readonly<Record<TubAnimationName, number>> = {
  'tub-empty': 1,
  'tub-filled': 1,
};

export interface StaticSpriteConfig {
  readonly id: string;
  readonly src: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const STATIC_SPRITE_CONFIGS: readonly StaticSpriteConfig[] = [
  // Example static sprites - uncomment and modify as needed:
  // {
  //   id: 'background',
  //   src: './assets/sprites/background.png',
  //   x: 0,
  //   y: 0,
  //   width: CANVAS_WIDTH,
  //   height: CANVAS_HEIGHT,
  // },
  // {
  //   id: 'food-bowl',
  //   src: './assets/sprites/stations/food-bowl.png',
  //   x: 100,
  //   y: 400,
  //   width: FRAME_SIZE,
  //   height: FRAME_SIZE,
  // },
] as const;
