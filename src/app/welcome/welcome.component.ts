import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatAnimationComponent } from '../cat-animation/cat-animation.component';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [RouterLink, CatAnimationComponent],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
})
export class WelcomeComponent {}
