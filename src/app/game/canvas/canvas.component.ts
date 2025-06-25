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
  // effect, // Not used in this snippet, remove if not needed elsewhere
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  AnimatedSprite,
  CatState,
  GameSprite,
  AnimationName,
} from './canvas.types'; // Added AnimationName
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

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <canvas
      #gameCanvas
      [attr.width]="canvasWidth"
      [attr.height]="canvasHeight"
      [class]="canvasClass()"
      style="touch-action: none;"
    ></canvas>
  `,
  styles: [
    `
      :host {
        display: block;
        width: ${CANVAS_WIDTH}px;
        height: ${CANVAS_HEIGHT}px;
        margin: auto;
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
  private sprites = signal<Map<string, GameSprite>>(new Map()); // For other static sprites
  private cat = signal<AnimatedSprite | null>(null);
  private tub = signal<AnimatedSprite | null>(null); // Signal for the tub
  private catState = signal<CatState>(CatState.WALKING_TO_SPOT);
  private lastSitStartTime = signal<number>(0);

  protected canvasClass = computed(() => ({
    'cursor-wait': this.isLoading(),
    'cursor-default': !this.isLoading() && !this.inputService.isDragging(),
    'cursor-grabbing': this.inputService.isDragging(),
  }));

  private animationFrameId?: number;

  constructor() {
    this.inputService.dragStart
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((dragEvent) => {
        this.catState.set(CatState.DRAGGED);
        this.cat.update((cat) =>
          cat
            ? {
                ...cat,
                currentAnimation: 'carried' as AnimationName, // Ensure type compatibility
                currentFrame: 0,
              }
            : null,
        );
      });

    this.inputService.dragMove
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((position) => {
        this.cat.update((c) =>
          c ? { ...c, x: position.x, y: position.y } : null,
        );
      });

    this.inputService.dragEnd
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.resetCatAfterDrag();
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
      this.tub.set(assets.tub); // Set the tub signal
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
    if (!currentCat || this.isLoading() || this.inputService.isDragging())
      return;

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
    // Note: Tub animation/state is not updated here yet.
    // To change tub state, you would do:
    // this.tub.update(t => t ? {...t, currentAnimation: 'tub-filled'} : null);
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

    // Draw Tub
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

    // Draw Cat
    const catSprite = this.cat();
    if (catSprite) {
      const animation = catSprite.animations.get(catSprite.currentAnimation);
      // Check if animation and frame are valid to prevent errors during state transitions
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
      const currentState = this.catState();
      return (
        !this.isLoading() &&
        (currentState === CatState.SITTING_AT_SPOT ||
          currentState === CatState.ANIMATING_AT_SPOT)
      );
    });
  }

  private resetCatAfterDrag(): void {
    const currentTimestamp = performance.now();
    this.cat.update((cat) => {
      if (!cat) return null;
      return {
        ...cat,
        x: CAT_TARGET_X,
        y: CAT_SITTING_Y,
        currentAnimation: 'sit-blink' as AnimationName, // Ensure type compatibility
        currentFrame: 0,
        lastFrameTime: currentTimestamp,
      };
    });
    this.catState.set(CatState.SITTING_AT_SPOT);
    this.lastSitStartTime.set(currentTimestamp);
  }
}
