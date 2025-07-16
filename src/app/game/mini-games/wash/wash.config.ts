import { BodyPartHitbox, WashBodyPart } from './wash.types';

// Canvas and sprite configuration
export const WASH_SPRITE_SIZE = 192; // 192x192 pixels
export const GRID_SIZE = 16; // 16x16 grid
export const CELL_SIZE = WASH_SPRITE_SIZE / GRID_SIZE; // 12 pixels per cell

// Cleaning mechanics
export const TRACE_COMPLETION_PERCENTAGE: { [key in WashBodyPart]?: number } = {
  head: 0.75,
  torso: 0.75,
};

// Body part sequence (order matters!)
export const BODY_PART_SEQUENCE: WashBodyPart[] = [
  'head',
  'torso',
  'front-leg',
  'back-leg',
  'tail',
];

// Sprite sheet row mapping
export const WASH_SPRITE_ROWS = {
  'all-clean': 0,
  'all-dirty': 1,
  'head-clean': 2,
  'head-torso-clean': 3,
  'head-torso-frontleg-clean': 4,
  'head-torso-frontleg-backleg-clean': 5,
} as const;

// Hit detection areas (16x16 grid coordinates)
export const BODY_PART_HITBOXES: BodyPartHitbox[] = [
  {
    part: 'head',
    cells: [
      { x: 2, y: 3 },
      { x: 2, y: 4 },
      { x: 3, y: 4 },
      { x: 1, y: 5 },
      { x: 2, y: 5 },
      { x: 3, y: 5 },
      { x: 1, y: 6 },
      { x: 2, y: 6 },
      { x: 3, y: 6 },
      { x: 1, y: 7 },
      { x: 2, y: 7 },
      { x: 3, y: 7 },
    ],
  },
  {
    part: 'torso',
    cells: generateRectangleCells(4, 6, 11, 9), // 8x4 rectangle from (4,6) to (11,9)
  },
  {
    part: 'front-leg',
    cells: [
      { x: 4, y: 10 },
      { x: 4, y: 11 },
      { x: 3, y: 12 },
      { x: 4, y: 12 },
    ],
  },
  {
    part: 'back-leg',
    cells: [
      { x: 10, y: 10 },
      { x: 11, y: 10 },
      { x: 11, y: 11 },
      { x: 10, y: 12 },
      { x: 11, y: 12 },
    ],
  },
  {
    part: 'tail',
    cells: [
      { x: 12, y: 6 },
      { x: 13, y: 7 },
      { x: 13, y: 8 },
      { x: 13, y: 9 },
      { x: 13, y: 10 },
    ],
  },
];

// Helper function to generate rectangle cells
function generateRectangleCells(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const cells = [];
  for (let x = x1; x <= x2; x++) {
    for (let y = y1; y <= y2; y++) {
      cells.push({ x, y });
    }
  }
  return cells;
}

// Path to wash sprite sheet
export const WASH_CAT_SPRITE_PATH =
  './assets/sprites/cats/orange-cat-minigame-bath.png';
