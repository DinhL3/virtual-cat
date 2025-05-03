// src/app/canvas/canvas.component.ts
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

// Import types, config, and services
import {
  AnimatedSprite,
  CatState,
  GameSprite,
  AnimationName, // <-- Import AnimationName
} from './canvas.types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  MAX_DELTA_TIME,
  CAT_TARGET_X, // <-- Import target position
  CAT_SITTING_Y, // <-- Import target position
} from './canvas.config';
import { AssetLoaderService } from './asset-loader.service';
import { CatBehaviorService } from './cat-behavior.service'; // Service signature doesn't change

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
        background-color: #fdfcdc; /* Or import from config if needed */
      }
      .cursor-wait {
        cursor: wait;
      }
      .cursor-default {
        cursor: default;
      }
      .cursor-grabbing {
        cursor: grabbing;
      } /* Add grabbing cursor style */
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

  // --- Game state signals ---
  private isLoading = signal(true);
  private sprites = signal<Map<string, GameSprite>>(new Map());
  private cat = signal<AnimatedSprite | null>(null);
  private catState = signal<CatState>(CatState.WALKING_TO_SPOT);
  private lastSitStartTime = signal<number>(0);

  // --- Dragging State ---
  private isDragging = signal(false);
  private dragOffsetX = signal(0); // Offset from cat's top-left to mouse click point
  private dragOffsetY = signal(0);

  // Computed values
  protected canvasClass = computed(() => ({
    'cursor-wait': this.isLoading(),
    'cursor-default': !this.isLoading() && !this.isDragging(), // Default when not loading or dragging
    'cursor-grabbing': this.isDragging(), // Grabbing cursor when dragging
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

      this.update(clampedDeltaTime, timestamp); // Pass timestamp
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
    // Accept timestamp
    const currentCat = this.cat();
    // Don't update cat behavior via service if dragging or loading
    if (!currentCat || this.isLoading() || this.isDragging()) return;

    const currentState = this.catState();
    const currentSitStartTime = this.lastSitStartTime();

    // Delegate cat state logic to the service
    const updateResult = this.catBehavior.updateCat(
      currentCat,
      currentState,
      currentSitStartTime,
      timestamp, // Pass timestamp to service
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

  // --- Mouse Event Handlers ---

  @HostListener('window:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    if (this.isDragging()) {
      this.isDragging.set(false);
      const currentTimestamp = performance.now(); // Get current time for reset

      // Reset cat to sitting spot and state
      this.cat.update((cat) => {
        if (!cat) return null;
        return {
          ...cat,
          x: CAT_TARGET_X, // Snap back to target X
          y: CAT_SITTING_Y, // Snap back to target Y
          currentAnimation: 'sit-blink', // Back to base sit pose
          currentFrame: 0,
          lastFrameTime: currentTimestamp, // Reset frame time
        };
      });
      this.catState.set(CatState.SITTING_AT_SPOT); // Go back to sitting state
      this.lastSitStartTime.set(currentTimestamp); // Start the pause timer
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging()) return;

    const cat = this.cat();
    if (!cat) return; // Should not happen if dragging is true

    const { mouseX, mouseY } = this.getMousePos(event);
    const newX = mouseX - this.dragOffsetX();
    const newY = mouseY - this.dragOffsetY();

    // Update cat position directly - ensure animation remains 'carried'
    this.cat.update((c) =>
      c
        ? {
            ...c,
            x: newX,
            y: newY,
            currentAnimation: 'carried', // Ensure animation is correct
            currentFrame: 0, // 'carried' only has one frame
          }
        : null,
    );
  }

  // Use HostListener on the canvas itself for mousedown to ensure the click starts within the canvas
  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    if (this.isLoading() || this.isDragging()) return; // Don't start drag if loading or already dragging

    const currentCat = this.cat();
    const currentState = this.catState();
    if (!currentCat) return;

    // Allow dragging only when sitting or doing a sit animation
    const canDrag =
      currentState === CatState.SITTING_AT_SPOT ||
      currentState === CatState.ANIMATING_AT_SPOT;
    if (!canDrag) return;

    const { mouseX, mouseY } = this.getMousePos(event);

    // Hit test: Check if the click is within the cat's bounds
    if (
      mouseX >= currentCat.x &&
      mouseX <= currentCat.x + currentCat.width &&
      mouseY >= currentCat.y &&
      mouseY <= currentCat.y + currentCat.height
    ) {
      event.preventDefault(); // Prevent text selection/default drag behavior

      this.isDragging.set(true);
      this.dragOffsetX.set(mouseX - currentCat.x);
      this.dragOffsetY.set(mouseY - currentCat.y);

      // Immediately switch state and animation
      this.catState.set(CatState.DRAGGED);
      this.cat.update((cat) =>
        cat
          ? {
              ...cat,
              currentAnimation: 'carried', // Switch to carried animation
              currentFrame: 0, // Reset frame for carried animation
            }
          : null,
      );
    }
  }

  // Helper to get mouse coordinates relative to the canvas
  private getMousePos(event: MouseEvent): { mouseX: number; mouseY: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const scaleX = this.canvasRef.nativeElement.width / rect.width; // Handle CSS scaling
    const scaleY = this.canvasRef.nativeElement.height / rect.height;
    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;
    return { mouseX, mouseY };
  }
}
