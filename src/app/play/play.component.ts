import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-play',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './play.component.html',
  styleUrl: './play.component.scss',
})
export class PlayComponent {
  constructor(private auth: AuthService, private router: Router) {}

  onLogout() {
    this.auth.logout();
    this.router.navigate(['/welcome']);
  }
}
