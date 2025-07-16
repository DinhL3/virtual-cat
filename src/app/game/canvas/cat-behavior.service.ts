import { Injectable } from '@angular/core';
import {
  AnimatedSprite,
  CatState,
  CatSitAnimation,
  AnimationName,
} from './canvas.types';
import {
  WALK_SPEED,
  CAT_TARGET_X,
  CAT_SITTING_Y,
  PAUSE_DURATION,
  CAT_FRAME_COUNTS,
} from './canvas.config';

export interface CatUpdateResult {
  nextState?: CatState;
  updatedCat?: Partial<AnimatedSprite>;
  nextSitStartTime?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CatBehaviorService {
  updateCat(
    currentCat: AnimatedSprite,
    currentState: CatState,
    lastSitStartTime: number,
    timestamp: number,
  ): CatUpdateResult {
    const result: CatUpdateResult = {};
    const mutableCat: Partial<AnimatedSprite> = {};
    let stateChanged = false;
    let catPropsChanged = false;

    const currentAnimationDef = currentCat.animations.get(
      currentCat.currentAnimation,
    );

    // Skip animation logic for DRAGGED and IN_TUB states
    if (
      !currentAnimationDef ||
      currentState === CatState.DRAGGED ||
      currentState === CatState.IN_TUB
    ) {
      // For IN_TUB state, the cat should stay in the 'in-tub' animation
      // No state transitions or updates needed while in tub
      return {};
    }

    // Proceed with normal state logic for other states
    switch (currentState) {
      case CatState.WALKING_TO_SPOT:
        if (currentCat.x > CAT_TARGET_X) {
          // Move left
          mutableCat.x = currentCat.x - WALK_SPEED;
          catPropsChanged = true;

          // Animate walk
          if (
            timestamp - currentCat.lastFrameTime >=
            currentAnimationDef.frameDelay
          ) {
            mutableCat.currentFrame =
              (currentCat.currentFrame + 1) % CAT_FRAME_COUNTS['walk-left'];
            mutableCat.lastFrameTime = timestamp;
            catPropsChanged = true;
          }
        } else {
          // Reached destination
          mutableCat.x = CAT_TARGET_X;
          mutableCat.y = CAT_SITTING_Y;
          mutableCat.currentAnimation = 'sit-blink';
          mutableCat.currentFrame = 0;
          mutableCat.lastFrameTime = timestamp;
          catPropsChanged = true;

          result.nextSitStartTime = timestamp;
          result.nextState = CatState.SITTING_AT_SPOT;
          stateChanged = true;
        }
        break;

      case CatState.SITTING_AT_SPOT:
        if (timestamp - lastSitStartTime >= PAUSE_DURATION) {
          // Pause is over
          const sitAnimations: CatSitAnimation[] = [
            CatSitAnimation.BLINK,
            CatSitAnimation.TAIL_WHIP,
            CatSitAnimation.GROOM_PAW,
          ];
          const nextAnimation =
            sitAnimations[Math.floor(Math.random() * sitAnimations.length)];

          mutableCat.currentAnimation = nextAnimation;
          mutableCat.currentFrame = 0;
          mutableCat.lastFrameTime = timestamp;
          catPropsChanged = true;

          result.nextState = CatState.ANIMATING_AT_SPOT;
          stateChanged = true;
        }
        break;

      case CatState.ANIMATING_AT_SPOT:
        if (
          timestamp - currentCat.lastFrameTime >=
          currentAnimationDef.frameDelay
        ) {
          const nextFrame = currentCat.currentFrame + 1;

          if (
            nextFrame >=
            CAT_FRAME_COUNTS[
              currentCat.currentAnimation as keyof typeof CAT_FRAME_COUNTS
            ]
          ) {
            // Animation finished
            mutableCat.currentAnimation = 'sit-blink';
            mutableCat.currentFrame = 0;
            mutableCat.lastFrameTime = timestamp;
            catPropsChanged = true;

            result.nextSitStartTime = timestamp;
            result.nextState = CatState.SITTING_AT_SPOT;
            stateChanged = true;
          } else {
            // Animation still playing
            mutableCat.currentFrame = nextFrame;
            mutableCat.lastFrameTime = timestamp;
            catPropsChanged = true;
          }
        }
        break;

      case CatState.WALKING_AWAY:
        // Always move left, no destination check
        mutableCat.x = currentCat.x - WALK_SPEED;
        catPropsChanged = true;

        // Animate walk-left
        if (
          timestamp - currentCat.lastFrameTime >=
          currentAnimationDef.frameDelay
        ) {
          mutableCat.currentFrame =
            (currentCat.currentFrame + 1) % CAT_FRAME_COUNTS['walk-left'];
          mutableCat.lastFrameTime = timestamp;
          catPropsChanged = true;
        }

        // Note: No state transition - cat will keep walking until manually stopped
        // or until the component detects it's off-screen
        break;
    }

    if (catPropsChanged) {
      result.updatedCat = mutableCat;
    }

    if (!stateChanged) {
      delete result.nextState;
    }

    return result;
  }
}
