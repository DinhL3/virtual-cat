import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GameService } from '../services/game.service';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
})
export class GameComponent implements OnInit {
  isLoading = true;
  gameSave: any = null;
  errorMessage: string | null = null;

  constructor(
    private gameService: GameService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // First, always attempt to load the game directly
    this.loadGameSave();

    // 1. If coming from new game, the save will exist
    // 2. If trying to resume but no save exists, the loadGame() API will return an appropriate error
    // 3. We can handle that error in the loadGameSave() method
  }

  private loadGameSave(): void {
    this.gameService.loadGame().subscribe({
      next: (response) => {
        this.gameSave = response.gameSave;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;

        // If error is due to no save found, redirect to new game
        if (error.status === 404) {
          this.router.navigate(['/new-game']);
        } else {
          this.errorMessage =
            'Failed to load game: ' + (error.message || 'Unknown error');
          console.error('Error loading game save:', error);
        }
      },
    });
  }
}
