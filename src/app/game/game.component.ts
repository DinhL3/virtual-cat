import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameService } from '../services/game.service';
import { CanvasComponent } from './canvas/canvas.component';

interface GameState {
  currentDay: number;
  money: number;
}

interface GameSave {
  gameState: GameState;
}

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, CanvasComponent],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss',
})
export class GameComponent {
  private router = inject(Router);
  private gameService = inject(GameService);

  // Reactive state using signals
  protected isLoading = signal(true);
  protected errorMessage = signal<string | null>(null);
  protected gameSave = signal<GameSave | null>(null);

  // Computed values
  protected showGame = computed(
    () => !this.isLoading() && !this.errorMessage() && this.gameSave(),
  );

  constructor() {
    // Load game on component creation
    this.loadGameSave();
  }

  private async loadGameSave(): Promise<void> {
    try {
      const response = await this.gameService.loadGame().toPromise();
      if (response) {
        this.gameSave.set(response.gameSave);
      }
      this.isLoading.set(false);
    } catch (error: any) {
      this.isLoading.set(false);

      if (error.status === 404) {
        await this.router.navigate(['/new-game']);
      } else {
        this.errorMessage.set(
          'Failed to load game: ' + (error.message || 'Unknown error'),
        );
        console.error('Error loading game save:', error);
      }
    }
  }
}
