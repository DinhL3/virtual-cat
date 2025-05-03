import { Injectable } from '@angular/core';
import {
  Animation,
  AnimationName,
  AnimatedSprite,
  GameSprite,
  LoadedAssets,
} from './canvas.types';
import {
  ANIMATION_ROWS,
  FRAME_COUNTS,
  FRAME_SIZE,
  DEFAULT_FRAME_DELAY,
  CAT_SITTING_Y,
  CAT_SPRITE_SHEET_PATH,
  STATIC_SPRITE_CONFIGS,
  CANVAS_WIDTH, // Import CANVAS_WIDTH if needed for initial positioning
} from './canvas.config';

@Injectable({
  providedIn: 'root', // Provide globally or limit to the component if preferred
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

      // Load Static Sprites
      const loadedStaticSprites = await this.loadStaticSprites();

      return {
        staticSprites: loadedStaticSprites,
        cat: initialCat,
      };
    } catch (error) {
      console.error('Failed to load game assets:', error);
      // Re-throw or return a specific error state if needed
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
    const createAnimation = (name: AnimationName): Animation => ({
      name,
      frames: Array.from({ length: FRAME_COUNTS[name] }, (_, i) => ({
        x: i * FRAME_SIZE,
        y: ANIMATION_ROWS[name] * FRAME_SIZE,
        width: FRAME_SIZE,
        height: FRAME_SIZE,
      })),
      frameDelay: DEFAULT_FRAME_DELAY, // Use default, can be customized per animation later
    });

    (Object.keys(ANIMATION_ROWS) as AnimationName[]).forEach((animName) => {
      animations.set(animName, createAnimation(animName));
    });
    return animations;
  }

  private async loadStaticSprites(): Promise<Map<string, GameSprite>> {
    const loadedSprites = new Map<string, GameSprite>();
    await Promise.all(
      STATIC_SPRITE_CONFIGS.map(async (config) => {
        const image = await this.loadImage(config.src);
        loadedSprites.set(config.id, {
          image,
          x: config.x,
          y: config.y,
          width: config.width,
          height: config.height,
        });
      }),
    );
    return loadedSprites;
  }
}
