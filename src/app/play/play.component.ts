// play.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { CatService } from '../services/cat.service';
import { Cat } from '../models/cat.model';
import { catchError, finalize, of } from 'rxjs';

@Component({
  selector: 'app-play',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './play.component.html',
  styleUrl: './play.component.scss',
})
export class PlayComponent implements OnInit {
  hasCat: boolean = false;
  cat: Cat | null = null;
  loading: boolean = true;
  username: string = '';

  constructor(
    private auth: AuthService,
    private router: Router,
    private catService: CatService,
  ) {}

  ngOnInit() {
    const user = this.auth.getUser();
    if (!user) {
      this.auth.logout();
      this.router.navigate(['/login']);
      return;
    }

    this.username = user.username;
    // this.checkForCat();
  }

  private checkForCat() {
    this.loading = true;
    this.catService
      .getUserCat()
      .pipe(
        catchError((error) => {
          console.error('Error fetching cat:', error);
          if (error.status === 401) {
            // Only logout and redirect if it's an authentication error
            this.auth.logout();
            this.router.navigate(['/login']);
          }
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe((cat) => {
        // cat being null is a valid state - it just means the user hasn't adopted yet
        this.cat = cat;
        this.hasCat = !!cat;
      });
  }

  onLogout() {
    this.auth.logout();
    this.router.navigate(['/welcome']);
  }

  onAdopt() {
    this.router.navigate(['/adopt']);
  }
}
