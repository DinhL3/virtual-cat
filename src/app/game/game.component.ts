import {
  Component,
  inject,
  signal,
  computed,
  HostListener,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameService } from '../services/game.service';
import { AuthService } from '../services/auth.service';
import { CanvasComponent } from './canvas/canvas.component';
import { firstValueFrom } from 'rxjs';

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
  private auth = inject(AuthService);
  private elementRef = inject(ElementRef);

  protected isLoading = signal(true);
  protected errorMessage = signal<string | null>(null);
  protected gameSave = signal<GameSave | null>(null);
  protected isMenuOpen = signal(false);

  @ViewChild('burgerButton', { static: false })
  burgerButtonRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('burgerMenu', { static: false })
  burgerMenuRef?: ElementRef<HTMLDivElement>;

  protected showGame = computed(
    () => !this.isLoading() && !this.errorMessage() && this.gameSave(),
  );

  constructor() {
    this.loadGameSave();
  }

  toggleMenu(): void {
    this.isMenuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  async returnToMainMenu(): Promise<void> {
    this.closeMenu();
    await this.router.navigate(['/main-menu']);
  }

  async logout(): Promise<void> {
    this.closeMenu();
    this.auth.logout();
    await this.router.navigate(['/welcome']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isMenuOpen()) {
      return;
    }
    const target = event.target as Node;
    if (!target) {
      return;
    }
    const clickedOnButton =
      this.burgerButtonRef?.nativeElement.contains(target);
    const clickedInsideMenu =
      this.burgerMenuRef?.nativeElement.contains(target);

    if (!clickedOnButton && !clickedInsideMenu) {
      this.closeMenu();
    }
  }

  private async loadGameSave(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const response = await firstValueFrom(this.gameService.loadGame());

      if (response && response.gameSave) {
        this.gameSave.set(response.gameSave);
      } else {
        console.warn('Game data not found in response.');
        await this.router.navigate(['/new-game']);
      }
      this.isLoading.set(false);
    } catch (error: any) {
      this.isLoading.set(false);
      if (error.status === 404) {
        await this.router.navigate(['/new-game']);
      } else {
        this.errorMessage.set(
          'Failed to load game: ' + (error.message || 'Unknown server error'),
        );
        console.error('Error loading game save:', error);
      }
    }
  }
}
