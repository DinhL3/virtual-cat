import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cat-animation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cat-animation.component.html',
  styleUrls: ['./cat-animation.component.scss'],
})
export class CatAnimationComponent implements OnInit, OnDestroy {
  // Single spritesheet path
  spritesheet = './assets/sprites/cats/orange-cat-sit-idle.png';

  // Animation configuration
  animations = [
    {
      name: 'blink',
      row: 0,
      frames: 4,
      duration: 400,
    },
    {
      name: 'tail-whip',
      row: 1,
      frames: 6,
      duration: 600,
    },
    {
      name: 'look-left',
      row: 2,
      frames: 30,
      duration: 3000,
    },
  ];

  // Animation state
  currentAnimation = this.animations[0];
  currentFrame = 0;
  currentRow = 0;
  frameWidth = 96;
  frameHeight = 96;

  // Timers
  animationInterval: any;
  idleTimer: any;
  idleTime = 2000; // Time between animations in milliseconds

  ngOnInit(): void {
    this.startIdleTimer();
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  startIdleTimer(): void {
    // Clear any existing timers
    this.clearTimers();

    // Start new idle timer
    this.idleTimer = setTimeout(() => {
      this.playRandomAnimation();
    }, this.idleTime);
  }

  playRandomAnimation(): void {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }

    const randomIndex = Math.floor(Math.random() * this.animations.length);
    this.currentAnimation = this.animations[randomIndex];

    // Update current row and reset frame
    this.currentRow = this.currentAnimation.row;
    this.currentFrame = 0;

    const frameRate =
      this.currentAnimation.duration / this.currentAnimation.frames;

    this.animationInterval = setInterval(() => {
      this.currentFrame++;

      if (this.currentFrame >= this.currentAnimation.frames) {
        clearInterval(this.animationInterval);
        // Set back to frame 0 (resting pose) of current row
        this.currentFrame = 0;
        this.startIdleTimer();
      }
    }, frameRate);
  }

  clearTimers(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }
  }

  // Calculate the background position for the current frame
  get spritePosition(): string {
    const xPos = -(this.currentFrame * this.frameWidth);
    const yPos = -(this.currentRow * this.frameHeight);
    return `${xPos}px ${yPos}px`;
  }
}
