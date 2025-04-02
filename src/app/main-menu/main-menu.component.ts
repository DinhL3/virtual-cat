import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { GameService } from '../services/game.service';
import { catchError, finalize, of } from 'rxjs';

@Component({
  selector: 'app-main-menu',
  imports: [CommonModule],
  templateUrl: './main-menu.component.html',
  styleUrl: './main-menu.component.scss',
  standalone: true,
})
export class MainMenuComponent implements OnInit {
  hasGameSaves: boolean = false;
  loading: boolean = true;
  username: string = '';
  saveData: any = null;
  error: string | null = null;

  constructor(
    private auth: AuthService,
    private gameService: GameService,
    private router: Router,
  ) {}

  ngOnInit() {
    const user = this.auth.getUser();
    if (!user) {
      this.auth.logout();
      this.router.navigate(['/login']);
      return;
    }

    this.username = user.username;

    // Check if user has any game
    this.checkForGameSaves();
  }

  private checkForGameSaves() {
    this.loading = true;
    this.error = null;

    this.gameService
      .checkGameSave()
      .pipe(
        catchError((err) => {
          this.error = 'Failed to check for game saves. Please try again.';
          return of({ hasSave: false, saveData: null });
        }),
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe((response) => {
        this.hasGameSaves = response.hasSave;
        this.saveData = response.saveData;
      });
  }

  onLogout() {
    this.auth.logout();
    this.router.navigate(['/welcome']);
  }

  onNewGame() {
    this.router.navigate(['/new-game']);
  }

  onResumeGame() {
    // First, load the game data to ensure we have the latest state
    this.loading = true;
    this.error = null;

    this.gameService
      .loadGame()
      .pipe(
        catchError((err) => {
          this.error = 'Failed to load game. Please try again.';
          return of({ message: '', gameSave: null });
        }),
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe((response) => {
        if (response.gameSave) {
          // Store game data in a service or state management solution if needed
          this.router.navigate(['/game']);
        } else {
          this.error = 'Could not load your saved game.';
          // Refresh save status
          this.checkForGameSaves();
        }
      });
  }
}
