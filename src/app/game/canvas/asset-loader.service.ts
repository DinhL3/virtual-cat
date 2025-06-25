import { Injectable } from '@angular/core';
// Types
import {
  Animation,
  AnimationName,
  AnimatedSprite,
  GameSprite,
  LoadedAssets,
  CatAnimationName,
  TubAnimationName,
  StaticSpriteConfig,
} from './canvas.types';

// Cat configurations
import {
  CAT_ANIMATION_ROWS,
  CAT_FRAME_COUNTS,
  CAT_SITTING_Y,
  CAT_SPRITE_SHEET_PATH,
} from './canvas.config';

// Tub configurations
import {
  TUB_ANIMATION_ROWS,
  TUB_FRAME_COUNTS,
  TUB_FRAME_SIZE,
  TUB_DEFAULT_X,
  TUB_DEFAULT_Y,
  TUB_SPRITE_SHEET_PATH,
} from './canvas.config';

// General configurations
import {
  FRAME_SIZE,
  DEFAULT_FRAME_DELAY,
  STATIC_SPRITE_CONFIGS,
  CANVAS_WIDTH,
} from './canvas.config';

@Injectable({
  providedIn: 'root',
})
export class AssetLoaderService {
  async loadGameAssets(): Promise<LoadedAssets> {
    try {
      // Load Cat Sprite Sheet
      const catImage = await this.loadImage(CAT_SPRITE_SHEET_PATH);

      // Create Cat Animations
      const animations = this.createCatAnimations();

      // Initialize Cat Sprite
      const initialCat: AnimatedSprite = {
        image: catImage,
        x: CANVAS_WIDTH, // Start off-screen right
        y: CAT_SITTING_Y, // Start at the target Y level
        width: FRAME_SIZE,
        height: FRAME_SIZE,
        currentAnimation: 'walk-left', // Start walking left
        currentFrame: 0,
        lastFrameTime: 0,
        animations,
      };

      // Load Tub Sprite Sheet
      const tubImage = await this.loadImage(TUB_SPRITE_SHEET_PATH);
      const tubAnimations = this.createTubAnimations();
      const initialTub: AnimatedSprite = {
        image: tubImage,
        x: TUB_DEFAULT_X,
        y: TUB_DEFAULT_Y,
        width: TUB_FRAME_SIZE,
        height: TUB_FRAME_SIZE,
        currentAnimation: 'tub-empty', // Default to empty state
        currentFrame: 0,
        lastFrameTime: 0, // Not critical for single-frame states
        animations: tubAnimations,
      };

      // Load Static Sprites
      const loadedStaticSprites = await this.loadStaticSprites();

      return {
        staticSprites: loadedStaticSprites,
        cat: initialCat,
        tub: initialTub,
      };
    } catch (error) {
      console.error('Failed to load game assets:', error);
      throw error;
    }
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (err) => reject(`Failed to load image: ${src} - ${err}`);
      image.src = src;
    });
  }

  private createCatAnimations(): Map<AnimationName, Animation> {
    const animations = new Map<AnimationName, Animation>();
    const createAnimation = (name: CatAnimationName): Animation => ({
      name,
      frames: Array.from({ length: CAT_FRAME_COUNTS[name] }, (_, i) => ({
        x: i * FRAME_SIZE,
        y: CAT_ANIMATION_ROWS[name] * FRAME_SIZE,
        width: FRAME_SIZE,
        height: FRAME_SIZE,
      })),
      frameDelay: DEFAULT_FRAME_DELAY, // Use default, can be customized per animation later
    });

    (Object.keys(CAT_ANIMATION_ROWS) as CatAnimationName[]).forEach(
      (animName) => {
        animations.set(animName, createAnimation(animName));
      },
    );
    return animations;
  }

  private createTubAnimations(): Map<AnimationName, Animation> {
    const animations = new Map<AnimationName, Animation>();
    const createAnimation = (name: TubAnimationName): Animation => ({
      name,
      frames: Array.from({ length: TUB_FRAME_COUNTS[name] }, (_, i) => ({
        // For single frame animations, 'i' will always be 0.
        // Frame x position on the sheet.
        x: i * TUB_FRAME_SIZE,
        // Frame y position on the sheet based on animation row.
        y: TUB_ANIMATION_ROWS[name] * TUB_FRAME_SIZE,
        width: TUB_FRAME_SIZE,
        height: TUB_FRAME_SIZE,
      })),
      // frameDelay is less relevant for single-frame states but required by the type.
      frameDelay: DEFAULT_FRAME_DELAY,
    });

    (Object.keys(TUB_ANIMATION_ROWS) as TubAnimationName[]).forEach(
      (animName) => {
        animations.set(animName, createAnimation(animName));
      },
    );
    return animations;
  }

  private async loadStaticSprites(): Promise<Map<string, GameSprite>> {
    const loadedSprites = new Map<string, GameSprite>();

    // Early return if no static sprites configured
    if (STATIC_SPRITE_CONFIGS.length === 0) {
      return loadedSprites;
    }

    await Promise.all(
      STATIC_SPRITE_CONFIGS.map(async (config: StaticSpriteConfig) => {
        try {
          const image = await this.loadImage(config.src);
          loadedSprites.set(config.id, {
            image,
            x: config.x,
            y: config.y,
            width: config.width,
            height: config.height,
          });
        } catch (error) {
          console.error(`Failed to load static sprite ${config.id}:`, error);
          // Continue loading other sprites even if one fails
        }
      }),
    );

    return loadedSprites;
  }
}
