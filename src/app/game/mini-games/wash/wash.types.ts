export type WashBodyPart = 'head' | 'torso' | 'front-leg' | 'back-leg' | 'tail';

export interface GridCell {
  x: number;
  y: number;
}

export interface BodyPartHitbox {
  part: WashBodyPart;
  cells: GridCell[];
}

export interface ScrubProgress {
  bodyPart: WashBodyPart;
  scrubCount: number;
  isComplete: boolean;
}

export interface WashGameState {
  currentPart: WashBodyPart;
  completedParts: WashBodyPart[];
  currentScrubCount: number;
  isGameComplete: boolean;
  hitCells: GridCell[];
}

export interface MouseScrubData {
  isDown: boolean;
  lastPosition: { x: number; y: number } | null;
  currentStreak: number;
  totalDistance: number;
}
