// canvas.component.ts
import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  signal,
  computed,
  DestroyRef,
  inject,
  ChangeDetectionStrategy,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  AnimatedSprite,
  CatState,
  GameSprite,
  AnimationName,
} from './canvas.types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  MAX_DELTA_TIME,
  CAT_TARGET_X,
  CAT_SITTING_Y,
} from './canvas.config';
import { AssetLoaderService } from './asset-loader.service';
import { CatBehaviorService } from './cat-behavior.service';
import { InputService, Position } from './input.service';
import { WashMinigameComponent } from '../mini-games/wash/wash-minigame.component';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule, WashMinigameComponent],
  template: `
    <div class="game-container">
      <canvas
        #gameCanvas
        [attr.width]="canvasWidth"
        [attr.height]="canvasHeight"
        [class]="canvasClass()"
        style="touch-action: none;"
      ></canvas>

      @if (isCatInTub() && !isWashGameActive()) {
        <button
          class="button outlined primary wash-button"
          (click)="onWashButtonClick()"
          type="button"
        >
          Wash
        </button>
      }

      @if (isWashGameActive()) {
        <app-wash-minigame
          (gameComplete)="onWashGameComplete()"
          (gameClosed)="onWashGameClosed()"
        />
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: ${CANVAS_WIDTH}px;
        height: ${CANVAS_HEIGHT}px;
        margin: auto;
      }
      .game-container {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      canvas {
        display: block;
        background-color: #fdfcdc;
      }
      .cursor-wait {
        cursor: wait;
      }
      .cursor-default {
        cursor: default;
      }
      .cursor-grabbing {
        cursor: grabbing;
      }
      .wash-button {
        position: absolute;
        top: ${(CANVAS_HEIGHT - 96) / 2 +
        96 +
        10}px; /* Tub bottom + small gap */
        left: 50%;
        transform: translateX(-50%);
        z-index: 10;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CanvasComponent implements AfterViewInit {
  @ViewChild('gameCanvas') private canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;

  private destroyRef = inject(DestroyRef);
  private assetLoader = inject(AssetLoaderService);
  private catBehavior = inject(CatBehaviorService);
  private inputService = inject(InputService);

  protected readonly canvasWidth = CANVAS_WIDTH;
  protected readonly canvasHeight = CANVAS_HEIGHT;

  private isLoading = signal(true);
  private sprites = signal<Map<string, GameSprite>>(new Map());
  private cat = signal<AnimatedSprite | null>(null);
  private tub = signal<AnimatedSprite | null>(null);
  private catState = signal<CatState>(CatState.WALKING_TO_SPOT);
  private lastSitStartTime = signal<number>(0);
  protected isCatInTub = signal(false);
  protected isWashGameActive = signal(false);
  private isWashCompleted = signal(false);

  protected canvasClass = computed(() => ({
    'cursor-wait': this.isLoading(),
    'cursor-default':
      !this.isLoading() &&
      !this.inputService.isDragging() &&
      this.canInteractWithCat(),
    'cursor-grabbing': this.inputService.isDragging(),
  }));

  // Helper to determine if we can interact with the cat
  private canInteractWithCat = computed(() => {
    const currentState = this.catState();
    return (
      !this.isLoading() &&
      !this.isWashGameActive() &&
      !this.isWashCompleted() &&
      currentState !== CatState.WALKING_AWAY &&
      currentState !== CatState.WALKING_TO_SPOT
    );
  });

  private animationFrameId?: number;

  constructor() {
    this.inputService.dragStart
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((dragEvent) => {
        // Only start dragging if interactions are allowed
        if (this.canInteractWithCat()) {
          this.catState.set(CatState.DRAGGED);
          this.cat.update((cat) =>
            cat
              ? {
                  ...cat,
                  currentAnimation: 'carried' as AnimationName,
                  currentFrame: 0,
                }
              : null,
          );
        }
      });

    this.inputService.dragMove
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((position) => {
        // Only update position if interactions are allowed
        if (this.canInteractWithCat()) {
          this.cat.update((c) =>
            c ? { ...c, x: position.x, y: position.y } : null,
          );
        }
      });

    this.inputService.dragEnd
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        // Only handle drag end if interactions are allowed
        if (this.canInteractWithCat()) {
          this.handleDragEnd();
        }
      });
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get 2D rendering context');
      this.isLoading.set(false);
      return;
    }
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.inputService.initialize(canvas);
    this.initializeGame();
  }

  private async initializeGame(): Promise<void> {
    this.isLoading.set(true);
    try {
      const assets = await this.assetLoader.loadGameAssets();
      this.sprites.set(assets.staticSprites);
      this.cat.set(assets.cat);
      this.tub.set(assets.tub);
      this.catState.set(CatState.WALKING_TO_SPOT);
      this.isLoading.set(false);
      this.startGameLoop();
    } catch (error) {
      console.error('Game initialization failed:', error);
      this.isLoading.set(false);
    }
  }

  private startGameLoop(): void {
    let lastTime = performance.now();
    const gameLoop = (timestamp: number) => {
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;
      const clampedDeltaTime = Math.min(deltaTime, MAX_DELTA_TIME);
      this.update(clampedDeltaTime, timestamp);
      this.draw();
      this.animationFrameId = requestAnimationFrame(gameLoop);
    };
    this.animationFrameId = requestAnimationFrame(gameLoop);
    this.destroyRef.onDestroy(() => {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
    });
  }

  private update(deltaTime: number, timestamp: number): void {
    const currentCat = this.cat();
    if (!currentCat || this.isLoading()) return;

    // Don't update cat behavior if dragging and interactions are disabled
    if (this.inputService.isDragging() && !this.canInteractWithCat()) {
      return;
    }

    const currentState = this.catState();
    const currentSitStartTime = this.lastSitStartTime();

    const updateResult = this.catBehavior.updateCat(
      currentCat,
      currentState,
      currentSitStartTime,
      timestamp,
    );

    if (updateResult.updatedCat) {
      this.cat.update((cat) =>
        cat ? { ...cat, ...updateResult.updatedCat } : null,
      );
    }
    if (updateResult.nextState !== undefined) {
      this.catState.set(updateResult.nextState);
    }
    if (updateResult.nextSitStartTime !== undefined) {
      this.lastSitStartTime.set(updateResult.nextSitStartTime);
    }

    // Check if cat has walked completely off screen
    if (
      currentState === CatState.WALKING_AWAY &&
      currentCat.x <= -currentCat.width
    ) {
      // Cat has left the screen, could reset game state here if needed
      console.log('Cat has left the building!');
      // Optional: Reset to initial state or trigger some other game event
    }
  }

  private draw(): void {
    if (!this.ctx || this.isLoading()) return;
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Draw static sprites (if any)
    for (const sprite of this.sprites().values()) {
      this.ctx.drawImage(
        sprite.image,
        sprite.x,
        sprite.y,
        sprite.width,
        sprite.height,
      );
    }

    // Draw sprites in correct order based on whether cat is in tub
    if (this.isCatInTub()) {
      // Cat is in tub: draw cat first (behind), then tub (in front)
      this.drawCat();
      this.drawTub();
    } else {
      // Normal order: tub first, then cat
      this.drawTub();
      this.drawCat();
    }
  }

  private drawTub(): void {
    const tubSprite = this.tub();
    if (tubSprite) {
      const animation = tubSprite.animations.get(tubSprite.currentAnimation);
      if (animation && tubSprite.currentFrame < animation.frames.length) {
        const frame = animation.frames[tubSprite.currentFrame];
        this.ctx.drawImage(
          tubSprite.image,
          frame.x,
          frame.y,
          frame.width,
          frame.height,
          Math.round(tubSprite.x),
          Math.round(tubSprite.y),
          tubSprite.width,
          tubSprite.height,
        );
      }
    }
  }

  private drawCat(): void {
    const catSprite = this.cat();
    if (catSprite) {
      const animation = catSprite.animations.get(catSprite.currentAnimation);
      if (animation && catSprite.currentFrame < animation.frames.length) {
        const frame = animation.frames[catSprite.currentFrame];
        this.ctx.drawImage(
          catSprite.image,
          frame.x,
          frame.y,
          frame.width,
          frame.height,
          Math.round(catSprite.x),
          Math.round(catSprite.y),
          catSprite.width,
          catSprite.height,
        );
      }
    }
  }

  @HostListener('mousedown', ['$event'])
  onCanvasMouseDown(event: MouseEvent): void {
    this.inputService.handleMouseDown(event, this.cat(), () => {
      return this.canInteractWithCat();
    });
  }

  private handleDragEnd(): void {
    const currentCat = this.cat();
    const currentTub = this.tub();

    if (!currentCat || !currentTub) return;

    // Check if cat was dropped in the tub
    if (this.isCatInTubCollision(currentCat, currentTub)) {
      this.putCatInTub();
    } else {
      this.resetCatAfterDrag();
    }
  }

  private isCatInTubCollision(
    cat: AnimatedSprite,
    tub: AnimatedSprite,
  ): boolean {
    // Simple bounding box collision detection
    const catCenterX = cat.x + cat.width / 2;
    const catCenterY = cat.y + cat.height / 2;

    // Check if cat's center is within tub bounds
    return (
      catCenterX >= tub.x &&
      catCenterX <= tub.x + tub.width &&
      catCenterY >= tub.y &&
      catCenterY <= tub.y + tub.height
    );
  }

  private putCatInTub(): void {
    const currentTimestamp = performance.now();
    const currentTub = this.tub();

    if (!currentTub) return;

    // Position cat in the center of the tub
    const tubCenterX =
      currentTub.x + (currentTub.width - this.cat()!.width) / 2;
    const tubCenterY =
      currentTub.y + (currentTub.height - this.cat()!.height) / 2;

    // Update cat position and animation to in-tub state
    this.cat.update((cat) => {
      if (!cat) return null;
      return {
        ...cat,
        x: tubCenterX,
        y: tubCenterY,
        currentAnimation: 'in-tub' as AnimationName,
        currentFrame: 0,
        lastFrameTime: currentTimestamp,
      };
    });

    // Update tub to filled state
    this.tub.update((tub) => {
      if (!tub) return null;
      return {
        ...tub,
        currentAnimation: 'tub-filled' as AnimationName,
        currentFrame: 0,
      };
    });

    // Update states
    this.isCatInTub.set(true);
    this.catState.set(CatState.IN_TUB);
    this.lastSitStartTime.set(currentTimestamp);
  }

  private resetCatAfterDrag(): void {
    const currentTimestamp = performance.now();

    // If cat was in tub and dragged out, reset tub to empty
    if (this.isCatInTub()) {
      this.tub.update((tub) => {
        if (!tub) return null;
        return {
          ...tub,
          currentAnimation: 'tub-empty' as AnimationName,
          currentFrame: 0,
        };
      });
      this.isCatInTub.set(false);
    }

    // Reset cat to original position
    this.cat.update((cat) => {
      if (!cat) return null;
      return {
        ...cat,
        x: CAT_TARGET_X,
        y: CAT_SITTING_Y,
        currentAnimation: 'sit-blink' as AnimationName,
        currentFrame: 0,
        lastFrameTime: currentTimestamp,
      };
    });

    this.catState.set(CatState.SITTING_AT_SPOT);
    this.lastSitStartTime.set(currentTimestamp);
  }

  onWashButtonClick(): void {
    this.isWashGameActive.set(true);
  }

  onWashGameComplete(): void {
    console.log('Wash game completed!');
    this.isWashGameActive.set(false);
    this.isWashCompleted.set(true);

    // Start the cat walking away sequence
    this.startCatWalkingAway();
  }

  private startCatWalkingAway(): void {
    const currentTimestamp = performance.now();
    const currentTub = this.tub();

    if (!currentTub) return;

    // Position cat at the tub center (where it should be after washing)
    const tubCenterX =
      currentTub.x + (currentTub.width - this.cat()!.width) / 2;
    const tubCenterY =
      currentTub.y + (currentTub.height - this.cat()!.height) / 2;

    // Update cat to start walking left animation
    this.cat.update((cat) => {
      if (!cat) return null;
      return {
        ...cat,
        x: tubCenterX,
        y: tubCenterY,
        currentAnimation: 'walk-left' as AnimationName,
        currentFrame: 0,
        lastFrameTime: currentTimestamp,
      };
    });

    // Reset tub to empty state
    this.tub.update((tub) => {
      if (!tub) return null;
      return {
        ...tub,
        currentAnimation: 'tub-empty' as AnimationName,
        currentFrame: 0,
      };
    });

    // Update game state
    this.isCatInTub.set(false);
    this.catState.set(CatState.WALKING_AWAY);
    this.lastSitStartTime.set(currentTimestamp);
  }

  onWashGameClosed(): void {
    console.log('Wash game closed');
    this.isWashGameActive.set(false);

    // Only start walking away if the wash was completed
    if (this.isWashCompleted()) {
      this.startCatWalkingAway();
    }
  }
}
