export type CatAnimationName =
  | 'walk-left'
  | 'sit-blink'
  | 'sit-tail-whip'
  | 'sit-groom-paw'
  | 'walk-right'
  | 'carried';

export type TubAnimationName = 'tub-empty' | 'tub-filled';

export type AnimationName = CatAnimationName | TubAnimationName;

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

// Static Sprite Configuration Interface
export interface StaticSpriteConfig {
  readonly id: string;
  readonly src: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

// Optional: Define a structure for loaded assets if needed by the component
export interface LoadedAssets {
  staticSprites: Map<string, GameSprite>;
  cat: AnimatedSprite;
  tub: AnimatedSprite;
}
