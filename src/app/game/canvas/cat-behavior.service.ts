import { Injectable } from '@angular/core';
import {
  AnimatedSprite,
  CatState,
  CatSitAnimation,
  AnimationName, // Ensure AnimationName is imported if needed, though not directly used in logic here
} from './canvas.types';
import {
  WALK_SPEED,
  CAT_TARGET_X,
  CAT_SITTING_Y,
  PAUSE_DURATION,
  FRAME_COUNTS,
} from './canvas.config';

// Interface remains the same
export interface CatUpdateResult {
  nextState?: CatState;
  updatedCat?: Partial<AnimatedSprite>;
  nextSitStartTime?: number;
}

@Injectable({
  providedIn: 'root', // Provide globally or limit if preferred
})
export class CatBehaviorService {
  updateCat(
    currentCat: AnimatedSprite,
    currentState: CatState,
    lastSitStartTime: number,
    timestamp: number,
  ): CatUpdateResult {
    const result: CatUpdateResult = {};
    const mutableCat: Partial<AnimatedSprite> = {}; // Track changes
    let stateChanged = false;
    let catPropsChanged = false;

    const currentAnimationDef = currentCat.animations.get(
      currentCat.currentAnimation,
    );

    // Add a check for DRAGGED state early, as it bypasses normal animation logic
    // Also check if currentAnimationDef exists to prevent errors
    if (!currentAnimationDef || currentState === CatState.DRAGGED) {
      // If dragged, the component handles position and state transitions.
      // No state transitions or property updates initiated from this service while DRAGGED.
      return {}; // Return empty result
    }

    // Proceed with normal state logic only if not DRAGGED
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
              (currentCat.currentFrame + 1) % FRAME_COUNTS['walk-left'];
            mutableCat.lastFrameTime = timestamp;
            catPropsChanged = true;
          }
        } else {
          // Reached destination
          //   console.log('Cat reached target spot, switching to SITTING_AT_SPOT');
          mutableCat.x = CAT_TARGET_X; // Snap to exact target X
          mutableCat.y = CAT_SITTING_Y; // Ensure Y is correct target Y
          mutableCat.currentAnimation = 'sit-blink';
          mutableCat.currentFrame = 0;
          mutableCat.lastFrameTime = timestamp;
          catPropsChanged = true;

          result.nextSitStartTime = timestamp; // Start the pause timer
          result.nextState = CatState.SITTING_AT_SPOT;
          stateChanged = true;
        }
        break;

      case CatState.SITTING_AT_SPOT:
        if (timestamp - lastSitStartTime >= PAUSE_DURATION) {
          // Pause is over
          //   console.log('Pause finished, starting random animation at spot');
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
        // No visual updates during pause itself
        break;

      case CatState.ANIMATING_AT_SPOT:
        if (
          timestamp - currentCat.lastFrameTime >=
          currentAnimationDef.frameDelay
        ) {
          const nextFrame = currentCat.currentFrame + 1;

          if (nextFrame >= FRAME_COUNTS[currentCat.currentAnimation]) {
            // Animation finished
            // console.log(
            //   `Animation ${currentCat.currentAnimation} finished, returning to SITTING_AT_SPOT`,
            // );
            mutableCat.currentAnimation = 'sit-blink'; // Back to base sit pose
            mutableCat.currentFrame = 0;
            mutableCat.lastFrameTime = timestamp;
            catPropsChanged = true;

            result.nextSitStartTime = timestamp; // Start the pause timer *now*
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

      // NOTE: No DRAGGED case needed here as it's handled by the early return check
    }

    if (catPropsChanged) {
      result.updatedCat = mutableCat;
    }

    // Only return state if it actually changed
    if (!stateChanged) {
      delete result.nextState;
    }

    return result;
  }
}
