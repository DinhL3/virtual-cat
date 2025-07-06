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
      <div class="wash-container bg-light-yellow">
        <div class="wash-header">
          <h5 class="text-primary">Cat Washing Time!</h5>
          <button class="close-button" (click)="onClose()" type="button">
            ✕
          </button>
        </div>

        <div class="wash-content">
          <div class="instruction text-secondary">
            Wash the <strong>{{ currentBodyPart() }}</strong>
          </div>

          <div class="game-area">
            <p>Mini-game area - Canvas will be here</p>
          </div>

          <div class="progress text-tertiary">Progress: {{ progress() }}%</div>
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
        border-radius: 8px;
        padding: 16px;
      }

      .wash-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        // border-bottom: 1px solid #fed9b7;
      }

      .close-button {
        background: #00afb9;
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
        background: #0081a7;
      }

      .instruction {
        text-align: center;
        font-size: 16px;
        margin-bottom: 16px;
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
