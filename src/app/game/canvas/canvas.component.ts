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
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AnimatedSprite, CatState, GameSprite } from './canvas.types';
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
    /* Styles remain the same */
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

  // Inject dependencies
  private destroyRef = inject(DestroyRef);
  private assetLoader = inject(AssetLoaderService);
  private catBehavior = inject(CatBehaviorService);
  private inputService = inject(InputService);

  protected readonly canvasWidth = CANVAS_WIDTH;
  protected readonly canvasHeight = CANVAS_HEIGHT;

  // --- Game state signals ---
  private isLoading = signal(true);
  private sprites = signal<Map<string, GameSprite>>(new Map());
  private cat = signal<AnimatedSprite | null>(null);
  private catState = signal<CatState>(CatState.WALKING_TO_SPOT);
  private lastSitStartTime = signal<number>(0);

  // --- Dragging State (Now driven by InputService) ---

  // Computed values
  protected canvasClass = computed(() => ({
    'cursor-wait': this.isLoading(),
    // Use isDragging signal from InputService
    'cursor-default': !this.isLoading() && !this.inputService.isDragging(),
    'cursor-grabbing': this.inputService.isDragging(),
  }));

  private animationFrameId?: number;

  constructor() {
    // --- React to InputService Events ---
    this.inputService.dragStart
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((dragEvent) => {
        console.log('CanvasComponent: Drag Start Detected', dragEvent);
        this.catState.set(CatState.DRAGGED);
        this.cat.update((cat) =>
          cat
            ? {
                ...cat,
                currentAnimation: 'carried',
                currentFrame: 0,
              }
            : null,
        );
        // Note: Offset isn't directly needed in the component state anymore
      });

    this.inputService.dragMove
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((position) => {
        // Update cat position based on InputService emission
        this.cat.update((c) =>
          c ? { ...c, x: position.x, y: position.y } : null,
        );
      });

    this.inputService.dragEnd
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        console.log('CanvasComponent: Drag End Detected');
        // Reset cat state when drag ends
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

    // Initialize InputService with the canvas element
    this.inputService.initialize(canvas);

    this.initializeGame();
  }

  private async initializeGame(): Promise<void> {
    this.isLoading.set(true);
    try {
      const assets = await this.assetLoader.loadGameAssets();
      this.sprites.set(assets.staticSprites);
      this.cat.set(assets.cat);
      this.catState.set(CatState.WALKING_TO_SPOT);
      this.isLoading.set(false);
      this.startGameLoop();
    } catch (error) {
      console.error('Game initialization failed:', error);
      this.isLoading.set(false);
    }
  }

  private startGameLoop(): void {
    // ... (logic remains the same)
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
        console.log('Game loop stopped.');
      }
    });
    console.log('Game loop started.');
  }

  private update(deltaTime: number, timestamp: number): void {
    const currentCat = this.cat();
    // Use isDragging signal from InputService
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
  }

  private draw(): void {
    // ... (draw logic remains the same)
    if (!this.ctx || this.isLoading()) return;
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    for (const sprite of this.sprites().values()) {
      this.ctx.drawImage(
        sprite.image,
        sprite.x,
        sprite.y,
        sprite.width,
        sprite.height,
      );
    }
    const cat = this.cat();
    if (!cat) return;
    const animation = cat.animations.get(cat.currentAnimation);
    if (!animation || cat.currentFrame >= animation.frames.length) {
      // console.warn(`Animation or frame not found for cat: ${cat.currentAnimation}, frame ${cat.currentFrame}`);
      return; // Don't warn excessively if frame temporarily out of sync during state change
    }
    const frame = animation.frames[cat.currentFrame];
    this.ctx.drawImage(
      cat.image,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      Math.round(cat.x),
      Math.round(cat.y),
      cat.width,
      cat.height,
    );
  }

  // --- Mouse Event Handlers (Simplified) ---

  // Keep listening for mousedown on the canvas element itself
  @HostListener('mousedown', ['$event'])
  onCanvasMouseDown(event: MouseEvent): void {
    // Delegate the check and potential drag start to the InputService
    this.inputService.handleMouseDown(
      event,
      this.cat(), // Pass the current cat data
      () => {
        // Pass the check function
        const currentState = this.catState();
        return (
          !this.isLoading() &&
          (currentState === CatState.SITTING_AT_SPOT ||
            currentState === CatState.ANIMATING_AT_SPOT)
        );
      },
    );
  }

  // --- Helper Functions ---

  private resetCatAfterDrag(): void {
    const currentTimestamp = performance.now();
    this.cat.update((cat) => {
      if (!cat) return null;
      return {
        ...cat,
        x: CAT_TARGET_X,
        y: CAT_SITTING_Y,
        currentAnimation: 'sit-blink',
        currentFrame: 0,
        lastFrameTime: currentTimestamp,
      };
    });
    this.catState.set(CatState.SITTING_AT_SPOT);
    this.lastSitStartTime.set(currentTimestamp);
  }
}
