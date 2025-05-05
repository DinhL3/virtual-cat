import {
  Component,
  ElementRef,
  HostBinding,
  Input,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
  viewChild,
  DestroyRef,
  afterNextRender,
} from '@angular/core';

// Configuration Constants
const FRAME_WIDTH = 96;
const FRAME_HEIGHT = 96;
const IDLE_TIME_MS = 2000;
const SPRITESHEET_PATH = './assets/sprites/cats/orange-cat-old.png'; // Ensure this path is correct

interface AnimationConfig {
  name: string;
  row: number;
  frames: number;
  duration: number; // in milliseconds
}

@Component({
  selector: 'app-cat-animation',
  standalone: true,
  imports: [], // CommonModule is often not needed for simple templates
  templateUrl: './cat-animation.component.html',
  styleUrls: ['./cat-animation.component.scss'],
})
export class CatAnimationComponent {
  // --- Dependencies ---
  private destroyRef = inject(DestroyRef);

  // --- Inputs ---
  scale = input(1); // Use signal input for reactive scaling

  // --- View Child ---
  // Use required viewChild for guaranteed access after view initialization
  private canvasRef =
    viewChild.required<ElementRef<HTMLCanvasElement>>('catCanvas');

  // --- Host Bindings ---
  // Compute host dimensions based on the scale input signal
  private hostWidthPx = computed(() => Math.round(FRAME_WIDTH * this.scale()));
  private hostHeightPx = computed(() =>
    Math.round(FRAME_HEIGHT * this.scale()),
  );

  @HostBinding('style.width.px') get hostW() {
    return this.hostWidthPx();
  }
  @HostBinding('style.height.px') get hostH() {
    return this.hostHeightPx();
  }
  // Keep flex setting if it's relevant to your layout context
  @HostBinding('style.flex') hostFlex = '0 0 auto';
  @HostBinding('style.display') hostDisplay = 'block'; // Ensure display is set

  // --- Canvas Properties (Used directly in template) ---
  readonly canvasWidth = FRAME_WIDTH;
  readonly canvasHeight = FRAME_HEIGHT;

  // --- Private Properties ---
  private ctx?: CanvasRenderingContext2D; // Optional until initialized
  private spriteImage = new Image();
  private isImageLoaded = signal(false); // Signal to track image load status

  // --- Animation Configuration ---
  private readonly animations: ReadonlyArray<AnimationConfig> = [
    { name: 'blink', row: 0, frames: 4, duration: 400 },
    { name: 'tail-whip', row: 1, frames: 6, duration: 600 },
    { name: 'look-left', row: 2, frames: 30, duration: 3000 },
    { name: 'groom-head', row: 3, frames: 12, duration: 1200 },
    { name: 'groom-body', row: 4, frames: 17, duration: 1700 },
  ];

  // --- Animation State ---
  private currentAnimation: Readonly<AnimationConfig> = this.animations[0]; // Start with default
  private currentFrame = 0;
  private currentRow = 0;

  // --- Timers ---
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private frameDuration = 0;
  private idleTimerId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Initiate image loading immediately
    this.loadImage();

    // Use afterNextRender for DOM-dependent setup (canvas context)
    afterNextRender(() => {
      this.initializeCanvas();
      // Only start animations if image is already loaded, otherwise wait for loadImage promise
      if (this.isImageLoaded()) {
        this.drawFrame(); // Draw initial frame
        this.startIdleTimer();
      }
    });
  }

  // Loads the sprite image and returns a promise
  private async loadImage(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.spriteImage.onload = () => {
        this.isImageLoaded.set(true);
        // If canvas is ready, draw initial frame and start idle timer
        if (this.ctx) {
          this.drawFrame();
          this.startIdleTimer();
        }
        resolve();
      };
      this.spriteImage.onerror = (error) => {
        console.error('Failed to load cat spritesheet:', error);
        reject(error); // Reject promise on error
      };
      this.spriteImage.src = SPRITESHEET_PATH;
    });
  }

  // Sets up the canvas context and rendering properties
  private initializeCanvas(): void {
    const canvas = this.canvasRef().nativeElement;
    const context = canvas.getContext('2d', { alpha: true }); // Keep alpha for transparency
    if (!context) {
      console.error('Failed to get 2D context');
      return;
    }
    this.ctx = context;
    // Ensure pixelated rendering for crisp pixel art
    this.ctx.imageSmoothingEnabled = false;
  }

  // Clears existing timers and starts the idle timeout
  private startIdleTimer(): void {
    this.clearTimers(); // Clear any previous timers
    this.idleTimerId = setTimeout(() => {
      this.playRandomAnimation();
    }, IDLE_TIME_MS);

    // Register cleanup with DestroyRef
    this.destroyRef.onDestroy(() => {
      this.clearTimers();
    });
  }

  // Selects and initiates a random animation sequence
  private playRandomAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId); // Stop any current animation loop
      this.animationFrameId = null;
    }

    const randomIndex = Math.floor(Math.random() * this.animations.length);
    this.currentAnimation = this.animations[randomIndex];
    this.currentRow = this.currentAnimation.row;
    this.currentFrame = 0; // Start from the first frame
    this.frameDuration =
      this.currentAnimation.duration / this.currentAnimation.frames;
    this.lastFrameTime = performance.now();

    this.animateFrame(); // Start the animation loop
  }

  // The core animation loop using requestAnimationFrame
  private animateFrame = (timestamp = performance.now()): void => {
    if (!this.ctx) return; // Don't run if context isn't ready

    const elapsed = timestamp - this.lastFrameTime;

    // Advance frame if enough time has passed
    if (elapsed >= this.frameDuration) {
      this.currentFrame++;
      this.lastFrameTime = timestamp - (elapsed % this.frameDuration); // Adjust for potential overshoot

      // Check if animation is complete
      if (this.currentFrame >= this.currentAnimation.frames) {
        this.currentFrame = 0; // Reset to the idle frame (frame 0)
        this.currentRow = this.animations[0].row; // Ensure row is reset to default (blink/idle)
        this.drawFrame(); // Draw the final (idle) frame
        this.startIdleTimer(); // Go back to waiting
        this.animationFrameId = null; // Stop the loop
        return; // Exit loop
      }
    }

    // Draw the current frame
    this.drawFrame();

    // Request the next frame
    this.animationFrameId = requestAnimationFrame(this.animateFrame);
    // Ensure cleanup is registered for the animation frame as well
    this.destroyRef.onDestroy(() => {
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
      }
    });
  };

  // Draws the current frame from the spritesheet onto the canvas
  private drawFrame(): void {
    if (!this.ctx || !this.isImageLoaded()) return; // Guard against missing context or image

    // Calculate source coordinates on the spritesheet
    const srcX = Math.floor(this.currentFrame * FRAME_WIDTH);
    const srcY = Math.floor(this.currentRow * FRAME_HEIGHT);

    // Clear previous frame and draw the new one
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.ctx.drawImage(
      this.spriteImage,
      srcX,
      srcY,
      FRAME_WIDTH,
      FRAME_HEIGHT,
      0, // Destination X on canvas
      0, // Destination Y on canvas
      this.canvasWidth, // Destination width on canvas
      this.canvasHeight, // Destination height on canvas
    );
  }

  // Utility to clear all active timers
  private clearTimers(): void {
    if (this.idleTimerId !== null) {
      clearTimeout(this.idleTimerId);
      this.idleTimerId = null;
    }
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
