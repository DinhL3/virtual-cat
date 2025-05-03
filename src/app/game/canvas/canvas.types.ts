export type AnimationName =
  | 'walk-left'
  | 'sit-blink'
  | 'sit-tail-whip'
  | 'sit-groom-paw'
  | 'walk-right'
  | 'carried';

export interface SpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Animation {
  name: AnimationName;
  frames: SpriteFrame[];
  frameDelay: number;
}

export interface AnimatedSprite {
  image: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
  currentAnimation: AnimationName;
  currentFrame: number;
  lastFrameTime: number;
  animations: Map<AnimationName, Animation>;
}

export enum CatState {
  WALKING_TO_SPOT,
  SITTING_AT_SPOT,
  ANIMATING_AT_SPOT,
  DRAGGED,
}

export enum CatSitAnimation {
  BLINK = 'sit-blink',
  TAIL_WHIP = 'sit-tail-whip',
  GROOM_PAW = 'sit-groom-paw',
}

export interface GameSprite {
  image: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Optional: Define a structure for loaded assets if needed by the component
export interface LoadedAssets {
  staticSprites: Map<string, GameSprite>;
  cat: AnimatedSprite;
}
