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
          <h3>Cat Washing Time!</h3>
          <button class="close-button" (click)="onClose()" type="button">
            ✕
          </button>
        </div>

        <div class="wash-content">
          <div class="instruction">
            Wash the <strong>{{ currentBodyPart() }}</strong>
          </div>

          <!-- Mini-game canvas will go here -->
          <div class="game-area">
            <canvas
              #washCanvas
              [width]="canvasSize"
              [height]="canvasSize"
              (mousedown)="onMouseDown($event)"
              (mousemove)="onMouseMove($event)"
              (mouseup)="onMouseUp()"
              (mouseleave)="onMouseUp()"
              style="touch-action: none; border-radius: 6px; background: #e9ecef;"
              [class.scrubbing-cursor]="isScrubbing()"
            ></canvas>
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
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }

      .wash-container {
        background: white;
        border-radius: 12px;
        padding: 20px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      }

      .wash-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        border-bottom: 2px solid #f0f0f0;
        padding-bottom: 10px;
      }

      .wash-header h3 {
        margin: 0;
        color: #333;
      }

      .close-button {
        background: #ff6b6b;
        color: white;
        border: none;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        cursor: pointer;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .close-button:hover {
        background: #ff5252;
      }

      .instruction {
        text-align: center;
        font-size: 18px;
        margin-bottom: 20px;
        color: #555;
      }

      .game-area {
        background: #f8f9fa;
        border: 2px dashed #dee2e6;
        border-radius: 8px;
        padding: 40px;
        text-align: center;
        margin-bottom: 20px;
        min-height: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .progress {
        text-align: center;
        font-weight: bold;
        color: #007bff;
      }

      .scrubbing-cursor {
        cursor: grabbing;
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
  protected isScrubbing = signal(false);

  protected currentBodyPart = computed(() => this.gameState().currentPart);

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

    // Draw grid overlay for debugging (optional)
    // this.drawGrid();
  }

  // Mouse event handlers
  onMouseDown(event: MouseEvent): void {
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
    if (!this.scrubData.isDown) return;

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
