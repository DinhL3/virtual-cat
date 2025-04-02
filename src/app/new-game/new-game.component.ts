import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GameService } from '../services/game.service';
import { catchError, finalize, of } from 'rxjs';

@Component({
  selector: 'app-new-game',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './new-game.component.html',
  styleUrl: './new-game.component.scss',
})
export class NewGameComponent {
  newGameForm: FormGroup;
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private gameService: GameService,
    private router: Router,
  ) {
    this.newGameForm = this.fb.group({
      characterName: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(20),
        ],
      ],
    });
  }

  onSubmit() {
    if (this.newGameForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;
    const { characterName } = this.newGameForm.value;

    this.gameService
      .newGame(characterName)
      .pipe(
        catchError((err) => {
          this.error = 'Failed to create new game. Please try again.';
          return of({ message: '', gameSave: null });
        }),
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe((response) => {
        if (response.gameSave) {
          // Navigate to the game screen
          this.router.navigate(['/game']);
        } else {
          this.error = 'Could not create a new game.';
        }
      });
  }

  onCancel() {
    this.router.navigate(['/main-menu']);
  }
}
