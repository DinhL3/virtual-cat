import {
  Component,
  EventEmitter,
  Output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type WashBodyPart = 'head' | 'torso' | 'front-leg' | 'back-leg' | 'tail';

@Component({
  selector: 'app-wash-minigame',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wash-overlay">
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
            <p>Mini-game area - Canvas will be here</p>
          </div>

          <div class="progress">Progress: {{ progress() }}%</div>
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WashMinigameComponent {
  @Output() gameComplete = new EventEmitter<void>();
  @Output() gameClosed = new EventEmitter<void>();

  // Game state signals
  protected currentBodyPart = signal<WashBodyPart>('head');
  protected progress = signal(0);

  onClose(): void {
    this.gameClosed.emit();
  }

  // TODO: Add mini-game logic methods here
}
