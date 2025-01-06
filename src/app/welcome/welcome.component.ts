import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { gameCat } from '@ng-icons/game-icons';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [RouterLink, NgIcon],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
  viewProviders: [provideIcons({ gameCat })],
})
export class WelcomeComponent {}
