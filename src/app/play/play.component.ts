// src/app/play/play.component.ts
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
  styleUrls: ['./play.component.scss'], // changed to styleUrls
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

    // **Important**: We want to check if the user already has a cat.
    this.checkForCat();
  }

  private checkForCat() {
    this.loading = true;
    this.catService
      .getUserCat()
      .pipe(
        catchError((error) => {
          console.error('Error fetching cat:', error);
          // If we get a 401, it might be an expired token or unauthorized user
          if (error.status === 401) {
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
        // cat being null = user has no cat
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
