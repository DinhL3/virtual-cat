import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { matLogIn } from '@ng-icons/material-icons/baseline';
import { gameCat } from '@ng-icons/game-icons';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  viewProviders: [provideIcons({ matLogIn, gameCat })],
})
export class AppComponent {
  title = 'Virtual Cat';

  showAlert() {
    alert('Button clicked!');
  }
}
