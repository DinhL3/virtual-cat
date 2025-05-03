import { AnimationName } from './canvas.types';

// --- Canvas Dimensions ---
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// --- Sprite & Animation Constants ---
export const FRAME_SIZE = 96;
export const DEFAULT_FRAME_DELAY = 150; // ms
export const MAX_DELTA_TIME = 100; // ms

export const ANIMATION_ROWS: Readonly<Record<AnimationName, number>> = {
  'sit-blink': 0,
  'sit-tail-whip': 1,
  'sit-groom-paw': 2,
  'walk-left': 3,
  'walk-right': 4,
  carried: 5,
};

export const FRAME_COUNTS: Readonly<Record<AnimationName, number>> = {
  'walk-left': 9,
  'sit-blink': 4,
  'sit-tail-whip': 6,
  'sit-groom-paw': 15,
  'walk-right': 9,
  carried: 1,
};

// --- Cat Behavior Constants ---
export const WALK_SPEED = 2;
export const PAUSE_DURATION = 2000; // ms
export const CAT_SITTING_Y = 32; // Final Y position (near top)
export const CAT_TARGET_X = 696; // Final X position (near right)

// --- Asset Paths ---
export const CAT_SPRITE_SHEET_PATH = './assets/sprites/cats/orange-cat.png';
export const TUB_SPRITE_PATH = './assets/sprites/stations/tub.png';

// --- Static Sprite Configurations ---
export const STATIC_SPRITE_CONFIGS = [
  {
    id: 'tub',
    src: TUB_SPRITE_PATH,
    x: (CANVAS_WIDTH - FRAME_SIZE) / 2, // Center horizontally
    y: (CANVAS_HEIGHT - FRAME_SIZE) / 2, // Center vertically
    width: FRAME_SIZE,
    height: FRAME_SIZE,
  },
  // Add other static sprites here if needed
];
