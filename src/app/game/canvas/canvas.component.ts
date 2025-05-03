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
} from '@angular/core';
import { CommonModule } from '@angular/common';

// Import types, config, and services
import { AnimatedSprite, CatState, GameSprite } from './canvas.types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAX_DELTA_TIME } from './canvas.config';
import { AssetLoaderService } from './asset-loader.service';
import { CatBehaviorService, CatUpdateResult } from './cat-behavior.service';

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
        background-color: #fdfcdc; /* Or import from config if needed */
      }
      .cursor-wait {
        cursor: wait;
      }
      .cursor-default {
        cursor: default;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush, // Suitable for canvas updates
})
export class CanvasComponent implements AfterViewInit {
  @ViewChild('gameCanvas') private canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;

  // Inject dependencies
  private destroyRef = inject(DestroyRef);
  private assetLoader = inject(AssetLoaderService);
  private catBehavior = inject(CatBehaviorService);

  // Make constants available to the template if needed (or use directly in styles)
  protected readonly canvasWidth = CANVAS_WIDTH;
  protected readonly canvasHeight = CANVAS_HEIGHT;

  // Game state signals
  private isLoading = signal(true);
  private sprites = signal<Map<string, GameSprite>>(new Map());
  private cat = signal<AnimatedSprite | null>(null);
  private catState = signal<CatState>(CatState.WALKING_TO_SPOT);
  private lastSitStartTime = signal<number>(0);

  // Computed values
  protected canvasClass = computed(() => ({
    'cursor-wait': this.isLoading(),
    'cursor-default': !this.isLoading(),
  }));

  private animationFrameId?: number;

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get 2D rendering context');
      this.isLoading.set(false);
      return;
    }
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false; // Keep pixel art crisp
    this.initializeGame();
  }

  private async initializeGame(): Promise<void> {
    this.isLoading.set(true);
    try {
      const assets = await this.assetLoader.loadGameAssets();
      this.sprites.set(assets.staticSprites);
      this.cat.set(assets.cat);
      this.catState.set(CatState.WALKING_TO_SPOT); // Ensure initial state
      this.isLoading.set(false);
      this.startGameLoop();
    } catch (error) {
      console.error('Game initialization failed:', error);
      this.isLoading.set(false);
      // Handle initialization error (e.g., show error message)
    }
  }

  private startGameLoop(): void {
    let lastTime = performance.now();

    const gameLoop = (timestamp: number) => {
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;
      // Clamp delta time to prevent large jumps if the tab was inactive
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
    if (!currentCat || this.isLoading()) return; // Don't update if no cat or still loading

    const currentState = this.catState();
    const currentSitStartTime = this.lastSitStartTime();

    // Delegate cat state logic to the service
    const updateResult = this.catBehavior.updateCat(
      currentCat,
      currentState,
      currentSitStartTime,
      timestamp,
    );

    // Apply updates returned by the service
    if (updateResult.updatedCat) {
      // Create a new object instance for the signal update
      this.cat.update((cat) =>
        cat ? { ...cat, ...updateResult.updatedCat } : null,
      );
    }
    if (updateResult.nextState !== undefined) {
      // Check for undefined, as 0 is a valid state
      this.catState.set(updateResult.nextState);
    }
    if (updateResult.nextSitStartTime !== undefined) {
      this.lastSitStartTime.set(updateResult.nextSitStartTime);
    }
  }

  private draw(): void {
    if (!this.ctx || this.isLoading()) return; // Don't draw if no context or loading

    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Draw static sprites
    for (const sprite of this.sprites().values()) {
      this.ctx.drawImage(
        sprite.image,
        sprite.x,
        sprite.y,
        sprite.width,
        sprite.height,
      );
    }

    // Draw cat
    const cat = this.cat();
    if (!cat) return;

    const animation = cat.animations.get(cat.currentAnimation);
    // Ensure animation and frame exist before drawing
    if (!animation || cat.currentFrame >= animation.frames.length) {
      console.warn(
        `Animation or frame not found for cat: ${cat.currentAnimation}, frame ${cat.currentFrame}`,
      );
      return;
    }
    const frame = animation.frames[cat.currentFrame];

    this.ctx.drawImage(
      cat.image,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      Math.round(cat.x), // Round positions for potentially sharper rendering
      Math.round(cat.y),
      cat.width,
      cat.height,
    );
  }
}
