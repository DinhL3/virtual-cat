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
    // Check if this is a new game or loading an existing one
    this.route.queryParams.subscribe((params) => {
      const isNewGame = params['new'] === 'true';

      if (isNewGame) {
        // A new game was just created, data should already be in the backend
        this.loadGameSave();
      } else {
        // Check if there's an existing save
        this.checkExistingSave();
      }
    });
  }

  private checkExistingSave(): void {
    this.gameService.checkGameSave().subscribe({
      next: (response) => {
        if (response.hasSave) {
          this.loadGameSave();
        } else {
          // No save found, redirect to new game creation
          this.router.navigate(['/new-game']);
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage =
          'Failed to check for existing save: ' +
          (error.message || 'Unknown error');
        console.error('Error checking game save:', error);
      },
    });
  }

  private loadGameSave(): void {
    this.gameService.loadGame().subscribe({
      next: (response) => {
        this.gameSave = response.gameSave;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage =
          'Failed to load game: ' + (error.message || 'Unknown error');
        console.error('Error loading game save:', error);
      },
    });
  }
}
