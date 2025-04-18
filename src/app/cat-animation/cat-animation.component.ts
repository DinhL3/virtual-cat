import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  OnInit,
  OnDestroy,
  AfterViewInit,
  HostBinding,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cat-animation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cat-animation.component.html',
  styleUrls: ['./cat-animation.component.scss'],
})
export class CatAnimationComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('catCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private spriteImage = new Image();
  private isImageLoaded = false;

  // Original frame dimensions
  private frameWidth = 96;
  private frameHeight = 96;

  // Canvas dimensions (always use integer sizes)
  get canvasWidth(): number {
    return this.frameWidth;
  }

  get canvasHeight(): number {
    return this.frameHeight;
  }

  // Host bindings for proper layout
  @HostBinding('style.width.px') get hostW() {
    return Math.round(this.frameWidth * this.scale);
  }

  @HostBinding('style.height.px') get hostH() {
    return Math.round(this.frameHeight * this.scale);
  }

  @HostBinding('style.flex') hostFlex = '0 0 auto';

  // Input properties
  @Input() scale = 1;

  // Spritesheet path
  private spritesheet = './assets/sprites/cats/orange-cat-sit-idle.png';

  // Animation configuration
  private animations = [
    {
      name: 'blink',
      row: 0,
      frames: 4,
      duration: 400,
    },
    {
      name: 'tail-whip',
      row: 1,
      frames: 6,
      duration: 600,
    },
    {
      name: 'look-left',
      row: 2,
      frames: 30,
      duration: 3000,
    },
  ];

  // Animation state
  private currentAnimation = this.animations[0];
  private currentFrame = 0;
  private currentRow = 0;

  // Timers
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private frameDuration = 0;
  private idleTimer: any;
  private idleTime = 2000; // Time between animations in milliseconds

  constructor() {
    // Load the sprite image
    this.spriteImage.src = this.spritesheet;
    this.spriteImage.onload = () => {
      this.isImageLoaded = true;
      this.drawFrame(); // Draw initial frame once loaded
    };
  }

  ngOnInit(): void {
    this.startIdleTimer();
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d', { alpha: true })!;

    // Critical: Disable image smoothing for pixel-perfect rendering
    this.ctx.imageSmoothingEnabled = false;

    // Draw initial frame if image is already loaded
    if (this.isImageLoaded) {
      this.drawFrame();
    }
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private startIdleTimer(): void {
    // Clear any existing timers
    this.clearTimers();

    // Start new idle timer
    this.idleTimer = setTimeout(() => {
      this.playRandomAnimation();
    }, this.idleTime);
  }

  private playRandomAnimation(): void {
    // Cancel any ongoing animation
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Select a random animation
    const randomIndex = Math.floor(Math.random() * this.animations.length);
    this.currentAnimation = this.animations[randomIndex];

    // Update current row and reset frame
    this.currentRow = this.currentAnimation.row;
    this.currentFrame = 0;

    // Calculate frame duration
    this.frameDuration =
      this.currentAnimation.duration / this.currentAnimation.frames;

    // Start animation loop
    this.lastFrameTime = performance.now();
    this.animateFrame();
  }

  private animateFrame(timestamp = performance.now()): void {
    // Calculate elapsed time since last frame
    const elapsed = timestamp - this.lastFrameTime;

    // Check if it's time to advance to the next frame
    if (elapsed >= this.frameDuration) {
      this.currentFrame++;
      this.lastFrameTime = timestamp;

      // Check if we've completed the animation
      if (this.currentFrame >= this.currentAnimation.frames) {
        // Reset to idle frame
        this.currentFrame = 0;

        // Start idle timer for next animation
        this.startIdleTimer();

        // Draw the final frame
        this.drawFrame();
        return;
      }
    }

    // Draw the current frame
    this.drawFrame();

    // Continue the animation loop
    this.animationFrameId = requestAnimationFrame(this.animateFrame.bind(this));
  }

  private drawFrame(): void {
    if (!this.ctx || !this.isImageLoaded) return;

    // Clear the canvas first
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Calculate source position in the spritesheet
    const srcX = Math.floor(this.currentFrame * this.frameWidth);
    const srcY = Math.floor(this.currentRow * this.frameHeight);

    // Draw the frame at the original resolution (96×96)
    this.ctx.drawImage(
      this.spriteImage,
      srcX,
      srcY,
      this.frameWidth,
      this.frameHeight,
      0,
      0,
      this.frameWidth,
      this.frameHeight,
    );
  }

  private clearTimers(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
