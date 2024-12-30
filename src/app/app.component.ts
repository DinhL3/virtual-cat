import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { matLogIn } from '@ng-icons/material-icons/baseline';
import { gameCat } from '@ng-icons/game-icons';

import { ContainerComponent } from './container/container.component';
import { CardComponent } from './card/card.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ContainerComponent, NgIcon, CardComponent],
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
