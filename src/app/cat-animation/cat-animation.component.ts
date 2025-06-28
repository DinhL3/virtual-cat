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

const FRAME_WIDTH = 96;
const FRAME_HEIGHT = 96;
const IDLE_TIME_MS = 2000;
const SPRITESHEET_PATH = './assets/sprites/cats/orange-cat-old.png';

interface AnimationConfig {
  name: string;
  row: number;
  frames: number;
  duration: number;
}

@Component({
  selector: 'app-cat-animation',
  standalone: true,
  imports: [],
  templateUrl: './cat-animation.component.html',
  styleUrls: ['./cat-animation.component.scss'],
})
export class CatAnimationComponent {
  private destroyRef = inject(DestroyRef);
  scale = input(1);
  private canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('catCanvas');

  private hostWidthPx = computed(() => Math.round(FRAME_WIDTH * this.scale()));
  private hostHeightPx = computed(() => Math.round(FRAME_HEIGHT * this.scale()));

  @HostBinding('style.width.px') get hostW() { return this.hostWidthPx(); }
  @HostBinding('style.height.px') get hostH() { return this.hostHeightPx(); }
  @HostBinding('style.flex') hostFlex = '0 0 auto';
  @HostBinding('style.display') hostDisplay = 'block';

  readonly canvasWidth = FRAME_WIDTH;
  readonly canvasHeight = FRAME_HEIGHT;

  private ctx?: CanvasRenderingContext2D;
  private spriteImage = new Image();
  private isImageLoaded = signal(false);

  private readonly animations: ReadonlyArray<AnimationConfig> = [
    { name: 'blink', row: 0, frames: 4, duration: 400 },
    { name: 'tail-whip', row: 1, frames: 6, duration: 600 },
    { name: 'look-left', row: 2, frames: 30, duration: 3000 },
    { name: 'groom-head', row: 3, frames: 12, duration: 1200 },
    { name: 'groom-body', row: 4, frames: 17, duration: 1700 },
  ];

  private currentAnimation: Readonly<AnimationConfig> = this.animations[0];
  private currentFrame = 0;
  private currentRow = 0;

  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private frameDuration = 0;
  private idleTimerId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadImage();

    afterNextRender(() => {
      this.initializeCanvas();
      if (this.isImageLoaded()) {
        this.drawFrame();
        this.startIdleTimer();
      }
    });
  }

  private async loadImage(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.spriteImage.onload = () => {
        this.isImageLoaded.set(true);
        if (this.ctx) {
          this.drawFrame();
          this.startIdleTimer();
        }
        resolve();
      };
      this.spriteImage.onerror = (error) => {
        console.error('Failed to load cat spritesheet:', error);
        reject(error);
      };
      this.spriteImage.src = SPRITESHEET_PATH;
    });
  }

  private initializeCanvas(): void {
    const canvas = this.canvasRef().nativeElement;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) {
      console.error('Failed to get 2D context');
      return;
    }
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;
  }

  private startIdleTimer(): void {
    this.clearTimers();
    this.idleTimerId = setTimeout(() => {
      this.playRandomAnimation();
    }, IDLE_TIME_MS);

    this.destroyRef.onDestroy(() => {
      this.clearTimers();
    });
  }

  private playRandomAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    const randomIndex = Math.floor(Math.random() * this.animations.length);
    this.currentAnimation = this.animations[randomIndex];
    this.currentRow = this.currentAnimation.row;
    this.currentFrame = 0;
    this.frameDuration =
      this.currentAnimation.duration / this.currentAnimation.frames;
    this.lastFrameTime = performance.now();

    this.animateFrame();
  }

  private animateFrame = (timestamp = performance.now()): void => {
    if (!this.ctx) return;

    const elapsed = timestamp - this.lastFrameTime;

    if (elapsed >= this.frameDuration) {
      this.currentFrame++;
      this.lastFrameTime = timestamp - (elapsed % this.frameDuration);

      if (this.currentFrame >= this.currentAnimation.frames) {
        this.currentFrame = 0;
        this.currentRow = this.animations[0].row;
        this.drawFrame();
        this.startIdleTimer();
        this.animationFrameId = null;
        return;
      }
    }

    this.drawFrame();

    this.animationFrameId = requestAnimationFrame(this.animateFrame);
    this.destroyRef.onDestroy(() => {
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
      }
    });
  };

  private drawFrame(): void {
    if (!this.ctx || !this.isImageLoaded()) return;

    const srcX = Math.floor(this.currentFrame * FRAME_WIDTH);
    const srcY = Math.floor(this.currentRow * FRAME_HEIGHT);

    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.ctx.drawImage(
      this.spriteImage,
      srcX,
      srcY,
      FRAME_WIDTH,
      FRAME_HEIGHT,
      0,
      0,
      this.canvasWidth,
      this.canvasHeight,
    );
  }

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
