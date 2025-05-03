import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  signal,
  computed,
  // effect, // Keep if needed for other things
  DestroyRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

// --- Types (Assuming these are defined correctly elsewhere) ---
export type AnimationName =
  | 'walk-left'
  | 'sit-blink'
  | 'sit-tail-whip'
  | 'sit-groom-paw'
  | 'walk-right'
  | 'carried';

export interface SpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Animation {
  name: AnimationName;
  frames: SpriteFrame[];
  frameDelay: number;
}
export interface AnimatedSprite {
  image: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
  currentAnimation: AnimationName;
  currentFrame: number;
  lastFrameTime: number;
  animations: Map<AnimationName, Animation>;
}
// --- Updated State Names ---
export enum CatState {
  WALKING_TO_SPOT, // Renamed from WALKING_TO_FLOOR_SPOT
  SITTING_AT_SPOT, // Renamed from SITTING_ON_FLOOR
  ANIMATING_AT_SPOT, // Renamed from ANIMATING_ON_FLOOR
}
export enum CatSitAnimation {
  BLINK = 'sit-blink',
  TAIL_WHIP = 'sit-tail-whip',
  GROOM_PAW = 'sit-groom-paw',
}
interface GameSprite {
  image: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
}
// --- End Types ---

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <canvas
      #gameCanvas
      width="800"
      height="600"
      [class]="canvasClass()"
    ></canvas>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 800px;
        height: 600px;
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
    `,
  ],
})
export class CanvasComponent implements AfterViewInit {
  @ViewChild('gameCanvas') private canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private destroyRef = inject(DestroyRef);
  private animationFrameId?: number;

  // Game state signals
  private isLoading = signal(true);
  private sprites = signal<Map<string, GameSprite>>(new Map());
  private cat = signal<AnimatedSprite | null>(null);
  // Initial state: Walking to the target spot
  private catState = signal<CatState>(CatState.WALKING_TO_SPOT); // <-- Use updated state name
  // Timestamp when the current SITTING state (pause) began
  private lastSitStartTime = signal<number>(0);

  // Constants
  private readonly FRAME_SIZE = 96;
  private readonly WALK_SPEED = 2;
  private readonly PAUSE_DURATION = 2000; // ms - Pause time between animations when sitting
  // --- Top-Right Sitting Constants ---
  private readonly CAT_SITTING_Y = 32; // Final Y position (near top)
  private readonly CAT_TARGET_X = 696; // Final X position (near right)
  // --- End Top-Right Sitting Constants ---
  private readonly MAX_DELTA_TIME = 100; // ms

  // Animation configurations (Rows and Counts remain the same)
  private readonly ANIMATION_ROWS: Record<AnimationName, number> = {
    'sit-blink': 0,
    'sit-tail-whip': 1,
    'sit-groom-paw': 2,
    'walk-left': 3,
    'walk-right': 4,
    carried: 5,
  } as const;
  private readonly FRAME_COUNTS: Record<AnimationName, number> = {
    'walk-left': 9,
    'sit-blink': 4,
    'sit-tail-whip': 6,
    'sit-groom-paw': 15,
    'walk-right': 9,
    carried: 1,
  } as const;
  // Adjust this delay to control animation speed (lower = faster, higher = slower)
  private readonly DEFAULT_FRAME_DELAY = 150; // ms

  // Computed values
  protected canvasClass = computed(() => ({
    'cursor-wait': this.isLoading(),
    'cursor-default': !this.isLoading(),
  }));

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get 2D rendering context');
      this.isLoading.set(false);
      return;
    }
    this.ctx = ctx;
    // Disable image smoothing for crisp pixel art
    this.ctx.imageSmoothingEnabled = false;
    this.loadSprites();
  }

  private async loadSprites(): Promise<void> {
    this.isLoading.set(true);
    try {
      // Define static sprites (Tub only, stool removed)
      const spriteConfigs = [
        {
          id: 'tub',
          src: './assets/sprites/stations/tub.png',
          x: (800 - 96) / 2, // Center horizontally
          y: (600 - 96) / 2, // Center vertically
          width: 96,
          height: 96,
        },
      ];

      const loadedSprites = new Map<string, GameSprite>();
      const catImage = new Image();
      catImage.src = './assets/sprites/cats/orange-cat.png';
      await catImage.decode();

      // Create animations (logic remains the same)
      const animations = new Map<AnimationName, Animation>();
      const createAnimation = (name: AnimationName): Animation => ({
        name,
        frames: Array.from({ length: this.FRAME_COUNTS[name] }, (_, i) => ({
          x: i * this.FRAME_SIZE,
          y: this.ANIMATION_ROWS[name] * this.FRAME_SIZE,
          width: this.FRAME_SIZE,
          height: this.FRAME_SIZE,
        })),
        frameDelay: this.DEFAULT_FRAME_DELAY,
      });
      (Object.keys(this.ANIMATION_ROWS) as AnimationName[]).forEach(
        (animName) => {
          animations.set(animName, createAnimation(animName));
        },
      );

      // Initialize cat sprite - Starts walking towards the top-right spot
      const initialCat: AnimatedSprite = {
        image: catImage,
        x: 800, // Start off-screen right
        y: this.CAT_SITTING_Y, // Start at the target Y level
        width: this.FRAME_SIZE,
        height: this.FRAME_SIZE,
        currentAnimation: 'walk-left', // Start walking left
        currentFrame: 0,
        lastFrameTime: 0,
        animations,
      };

      // Load static sprites
      await Promise.all(
        spriteConfigs.map(async (config) => {
          const image = new Image();
          image.src = config.src;
          await image.decode();
          loadedSprites.set(config.id, {
            image,
            x: config.x,
            y: config.y,
            width: config.width,
            height: config.height,
          });
        }),
      );

      // Update signals and start game
      this.sprites.set(loadedSprites);
      this.cat.set(initialCat);
      this.isLoading.set(false);
      this.startGameLoop();
    } catch (error) {
      console.error('Failed to load sprites:', error);
      this.isLoading.set(false);
    }
  }

  // Using the simpler, non-throttled game loop
  private startGameLoop(): void {
    let lastTime = performance.now();

    const gameLoop = (timestamp: number) => {
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;
      const clampedDeltaTime = Math.min(deltaTime, this.MAX_DELTA_TIME);

      this.update(clampedDeltaTime, timestamp);
      this.draw(); // Draw every frame

      this.animationFrameId = requestAnimationFrame(gameLoop);
    };
    this.animationFrameId = requestAnimationFrame(gameLoop);
    this.destroyRef.onDestroy(() => {
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
      console.log('Game loop stopped.');
    });
    console.log('Game loop started.');
  }

  private update(deltaTime: number, timestamp: number): void {
    const currentCat = this.cat();
    if (!currentCat) return;

    let catChanged = false;
    const mutableCat = { ...currentCat };
    const currentAnimationDef = mutableCat.animations.get(
      mutableCat.currentAnimation,
    );
    if (!currentAnimationDef) return;

    const currentState = this.catState();

    switch (currentState) {
      // State: Walking towards the designated spot (top-right)
      case CatState.WALKING_TO_SPOT: // <-- Use updated state name
        if (mutableCat.x > this.CAT_TARGET_X) {
          // Check if target X reached
          // Move left
          mutableCat.x -= this.WALK_SPEED;
          catChanged = true;

          // Animate walk
          if (
            timestamp - mutableCat.lastFrameTime >=
            currentAnimationDef.frameDelay
          ) {
            mutableCat.currentFrame =
              (mutableCat.currentFrame + 1) % this.FRAME_COUNTS['walk-left'];
            mutableCat.lastFrameTime = timestamp;
            catChanged = true;
          }
        } else {
          // Reached destination - Transition to SITTING_AT_SPOT (pause state)
          console.log('Cat reached target spot, switching to SITTING_AT_SPOT'); // <-- Use updated state name
          mutableCat.x = this.CAT_TARGET_X; // Snap to exact target X
          mutableCat.y = this.CAT_SITTING_Y; // Ensure Y is correct target Y
          mutableCat.currentAnimation = 'sit-blink'; // Show base sit pose
          mutableCat.currentFrame = 0; // First frame of sit-blink
          mutableCat.lastFrameTime = timestamp;
          this.lastSitStartTime.set(timestamp); // Start the pause timer
          this.catState.set(CatState.SITTING_AT_SPOT); // <-- Use updated state name
          catChanged = true; // Position, animation, frame changed
        }
        break;

      // State: Pausing while sitting at the spot
      case CatState.SITTING_AT_SPOT: // <-- Use updated state name
        if (timestamp - this.lastSitStartTime() >= this.PAUSE_DURATION) {
          // Pause is over, Transition to ANIMATING_AT_SPOT
          console.log('Pause finished, starting random animation at spot'); // <-- Use updated state name
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
          this.catState.set(CatState.ANIMATING_AT_SPOT); // <-- Use updated state name
          catChanged = true;
        }
        // No visual frame updates during the pause itself
        break;

      // State: Playing a random sit animation while at the spot
      case CatState.ANIMATING_AT_SPOT: // <-- Use updated state name
        if (
          timestamp - mutableCat.lastFrameTime >=
          currentAnimationDef.frameDelay
        ) {
          mutableCat.currentFrame++;
          catChanged = true;

          if (
            mutableCat.currentFrame >=
            this.FRAME_COUNTS[mutableCat.currentAnimation]
          ) {
            // Animation finished, Transition back to SITTING_AT_SPOT (pause state)
            console.log(
              `Animation ${mutableCat.currentAnimation} finished, returning to SITTING_AT_SPOT`,
            ); // <-- Use updated state name
            mutableCat.currentAnimation = 'sit-blink'; // Back to base sit pose
            mutableCat.currentFrame = 0;
            mutableCat.lastFrameTime = timestamp;
            this.lastSitStartTime.set(timestamp); // Start the pause timer *now*
            this.catState.set(CatState.SITTING_AT_SPOT); // <-- Use updated state name
            // catChanged is already true
          } else {
            // Animation still playing, just update frame time
            mutableCat.lastFrameTime = timestamp;
            // catChanged is already true
          }
        }
        break;
    }

    // Update the signal ONLY if changes occurred
    if (catChanged) {
      this.cat.set(mutableCat);
    }
  }

  // Draw method remains the same
  private draw(): void {
    if (!this.ctx) return;
    const canvasWidth = this.canvasRef.nativeElement.width;
    const canvasHeight = this.canvasRef.nativeElement.height;
    this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);

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
    if (!animation || !animation.frames[cat.currentFrame]) return;
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
}
