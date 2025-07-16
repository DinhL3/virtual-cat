import {
  Component,
  EventEmitter,
  Output,
  signal,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  inject,
  DestroyRef,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WashService } from './wash.service';
import { WashBodyPart, WashGameState, MouseScrubData } from './wash.types';
import {
  WASH_SPRITE_SIZE,
  WASH_CAT_SPRITE_PATH,
  BODY_PART_SEQUENCE,
  CELL_SIZE,
} from './wash.config';

@Component({
  selector: 'app-wash-minigame',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="wash-overlay"
      (mousedown)="$event.stopPropagation()"
      (mouseup)="$event.stopPropagation()"
    >
      <div class="wash-container">
        <div class="wash-header">
          <button class="close-button" (click)="onClose()" type="button">
            ✕
          </button>
        </div>

        <div class="wash-content">
          <div class="instruction">
            <ng-container
              *ngIf="!gameState().isGameComplete; else completeMessage"
            >
              Wash the <strong>{{ currentBodyPart() }}</strong>
            </ng-container>
            <ng-template #completeMessage>The cat is clean!</ng-template>
          </div>

          <div class="game-area">
            <canvas
              #washCanvas
              [width]="canvasSize"
              [height]="canvasSize"
              (mousedown)="onMouseDown($event)"
              (mousemove)="onMouseMove($event)"
              (mouseup)="onMouseUp()"
              (mouseleave)="onMouseUp()"
              style="touch-action: none;"
              [class.scrubbing-cursor]="isScrubbing()"
            ></canvas>
          </div>

          <!-- Progress indicator -->
          <div class="progress-container">
            <div class="progress-bar">
              <div
                class="progress-fill"
                [style.width.%]="progressPercentage()"
              ></div>
            </div>
            <div class="progress-text">
              {{ gameState().completedParts.length }} / {{ totalParts }} parts
              cleaned
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .wash-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(
          0,
          129,
          167,
          0.85
        ); /* $color-dark-blue with opacity */
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        backdrop-filter: blur(2px);
      }

      .wash-container {
        background: #fdfcdc; /* $color-light-yellow */
        border-radius: 16px;
        padding: 24px;
        max-width: 520px;
        width: 90%;
      }

      .wash-header {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
        width: 100%;
      }

      .close-button {
        background: #f07167; /* $color-salmon */
        color: #fdfcdc; /* $color-light-yellow */
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        cursor: pointer;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(240, 113, 103, 0.3);
      }

      .close-button:hover {
        transform: scale(1.1);
      }

      .instruction {
        text-align: center;
        font-size: 18px;
        color: #0081a7; /* $color-dark-blue */
        font-weight: 500;
      }

      .instruction strong {
        color: #f07167; /* $color-blue */
        text-transform: capitalize;
      }

      .game-area {
        background: none;
        text-align: center;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      canvas {
        border-radius: 8px;
        border: 1px solid #fed9b7;
        background: #fdfcdc;
        margin: 16px 0;
      }

      .progress-container {
        text-align: center;
      }

      .progress-bar {
        background: #fed9b7; /* $color-light-orange */
        border-radius: 12px;
        height: 8px;
        overflow: hidden;
        margin-bottom: 8px;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(
          90deg,
          #00afb9 0%,
          #0081a7 100%
        ); /* $color-blue to $color-dark-blue */
        transition: width 0.3s ease;
        border-radius: 12px;
      }

      .progress-text {
        font-size: 14px;
        color: #0081a7; /* $color-dark-blue */
        font-weight: 500;
      }

      .scrubbing-cursor {
        cursor: grabbing;
      }

      /* Hover effects */
      .wash-container:hover {
        box-shadow: 0 16px 48px rgba(0, 129, 167, 0.4);
      }

      /* Animation for game completion */
      @keyframes completion-pulse {
        0%,
        100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.02);
        }
      }

      .game-complete {
        animation: completion-pulse 0.6s ease-in-out;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WashMinigameComponent implements AfterViewInit {
  @ViewChild('washCanvas') private canvasRef!: ElementRef<HTMLCanvasElement>;
  @Output() gameComplete = new EventEmitter<void>();
  @Output() gameClosed = new EventEmitter<void>();

  private destroyRef = inject(DestroyRef);
  private washService = inject(WashService);
  private ctx!: CanvasRenderingContext2D;
  private catImage: HTMLImageElement | null = null;

  // Game state
  protected gameState = signal<WashGameState>(
    this.washService.createInitialGameState(),
  );
  protected readonly canvasSize = WASH_SPRITE_SIZE;
  protected readonly totalParts = BODY_PART_SEQUENCE.length;
  protected isScrubbing = signal(false);

  protected currentBodyPart = computed(() =>
    this.gameState().currentPart.replace(/-/g, ' '),
  );
  protected progressPercentage = computed(
    () => (this.gameState().completedParts.length / this.totalParts) * 100,
  );

  // Mouse/scrub state
  private scrubData: MouseScrubData = {
    isDown: false,
    lastPosition: null,
    currentStreak: 0,
    totalDistance: 0,
  };

  async ngAfterViewInit(): Promise<void> {
    // Use setTimeout to ensure DOM is fully rendered when component is conditionally shown
    setTimeout(async () => {
      // Add safety check for ViewChild
      if (!this.canvasRef?.nativeElement) {
        console.error('Canvas element not found');
        return;
      }

      const canvas = this.canvasRef.nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Failed to get 2D rendering context for wash canvas');
        return;
      }

      this.ctx = ctx;
      this.ctx.imageSmoothingEnabled = false;

      try {
        // Load cat sprite
        await this.loadCatSprite();
        this.draw();
      } catch (error) {
        console.error('Failed to initialize wash mini-game:', error);
      }
    }, 0);
  }

  private async loadCatSprite(): Promise<void> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        this.catImage = image;
        resolve();
      };
      image.onerror = () => reject('Failed to load wash cat sprite');
      image.src = WASH_CAT_SPRITE_PATH;
    });
  }

  private draw(): void {
    if (!this.ctx || !this.catImage) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvasSize, this.canvasSize);

    // Get current sprite row based on progress
    const currentRow = this.washService.getCurrentSpriteRow(
      this.gameState().completedParts,
    );

    // Draw cat sprite
    this.ctx.drawImage(
      this.catImage,
      0, // source x
      currentRow * WASH_SPRITE_SIZE, // source y (row)
      WASH_SPRITE_SIZE, // source width
      WASH_SPRITE_SIZE, // source height
      0, // dest x
      0, // dest y
      this.canvasSize, // dest width
      this.canvasSize, // dest height
    );

    // Optional: Draw hit cells for visual feedback
    this.drawHitCells();
  }

  private drawHitCells(): void {
    if (!this.ctx) return;

    // Draw hit cells with a subtle overlay
    this.ctx.fillStyle = 'rgba(0, 175, 185, 0.3)'; // $color-blue with opacity
    this.gameState().hitCells.forEach((cell) => {
      this.ctx.fillRect(
        cell.x * CELL_SIZE,
        cell.y * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE,
      );
    });
  }

  // Mouse event handlers
  onMouseDown(event: MouseEvent): void {
    if (this.gameState().isGameComplete) return;
    event.preventDefault(); // Prevent default drag behavior
    this.isScrubbing.set(true);
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const mousePos = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    this.scrubData.isDown = true;
    this.scrubData.lastPosition = mousePos;
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.scrubData.isDown || this.gameState().isGameComplete) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const mousePos = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    // Process interaction
    const newGameState = this.washService.processInteraction(
      this.gameState(),
      this.scrubData,
      mousePos,
    );

    // Update game state if changed
    if (newGameState !== this.gameState()) {
      this.gameState.set(newGameState);
      this.draw();

      // Check if game is complete
      if (newGameState.isGameComplete) {
        setTimeout(() => this.gameComplete.emit(), 500); // Small delay for effect
      }
    }

    this.scrubData.lastPosition = mousePos;
  }

  onMouseUp(): void {
    this.isScrubbing.set(false);
    this.scrubData.isDown = false;
    this.scrubData.lastPosition = null;
  }

  onClose(): void {
    this.gameClosed.emit();
  }
}
