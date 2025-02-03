import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { catchError, finalize, of } from 'rxjs';

@Component({
  selector: 'app-main-menu',
  imports: [],
  templateUrl: './main-menu.component.html',
  styleUrl: './main-menu.component.scss',
})
export class MainMenuComponent implements OnInit {
  hasGameSaves: boolean = false;
  loading: boolean = true;
  username: string = '';

  constructor(
    private auth: AuthService,
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

    // check if user has any game
    this.checkForGameSaves();
  }

  private checkForGameSaves() {
    this.loading = false;
  }

  onLogout() {
    this.auth.logout();
    this.router.navigate(['/welcome']);
  }

  onNewGame() {
    //this.router.navigate(['/new-game']);
    console.log('New game clicked!');
  }
}
