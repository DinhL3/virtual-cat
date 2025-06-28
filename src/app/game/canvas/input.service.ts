import {
  Injectable,
  signal,
  WritableSignal,
  inject,
  DestroyRef,
} from '@angular/core';
import { fromEvent, Subject, Subscription } from 'rxjs';
import { map, takeUntil, switchMap, filter, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AnimatedSprite } from './canvas.types';

export interface DragEvent {
  offsetX: number;
  offsetY: number;
}

export interface Position {
  x: number;
  y: number;
}

@Injectable({
  providedIn: 'root',
})
export class InputService {
  private destroyRef = inject(DestroyRef);
  private canvasEl!: HTMLCanvasElement;
  private document = document;

  private readonly _isDragging = signal(false);
  readonly isDragging = this._isDragging.asReadonly();

  readonly dragStart = new Subject<DragEvent>();
  readonly dragMove = new Subject<Position>();
  readonly dragEnd = new Subject<void>();

  private mouseMoveSubscription: Subscription | null = null;
  private mouseUpSubscription: Subscription | null = null;

  initialize(canvasElement: HTMLCanvasElement): void {
    if (!canvasElement) {
      console.error('InputService: Canvas element not provided for initialization.');
      return;
    }
    this.canvasEl = canvasElement;
  }

  // Called by the component on mousedown
  handleMouseDown(
    event: MouseEvent,
    draggableSprite: AnimatedSprite | null,
    canDragCheck: () => boolean, // Function to check if dragging is allowed
  ): void {
    if (this._isDragging() || !draggableSprite || !this.canvasEl) return;

    // Check if the component logic allows dragging based on current state
    if (!canDragCheck()) {
      return;
    }

    const { mouseX, mouseY } = this.getMousePos(event);

    // Hit test
    if (
      mouseX >= draggableSprite.x &&
      mouseX <= draggableSprite.x + draggableSprite.width &&
      mouseY >= draggableSprite.y &&
      mouseY <= draggableSprite.y + draggableSprite.height
    ) {
      event.preventDefault(); // Prevent default browser drag/text selection

      const offsetX = mouseX - draggableSprite.x;
      const offsetY = mouseY - draggableSprite.y;

      this._isDragging.set(true);
      this.dragStart.next({ offsetX, offsetY }); // Emit drag start event with offset

      // --- Setup Mouse Move Listener (on document/window) ---
      this.mouseMoveSubscription = fromEvent<MouseEvent>(
        this.document,
        'mousemove',
      )
        .pipe(
          takeUntilDestroyed(this.destroyRef), // Auto-unsubscribe on service destroy
        )
        .subscribe((moveEvent) => {
          const { mouseX: moveMouseX, mouseY: moveMouseY } =
            this.getMousePos(moveEvent);
          const newX = moveMouseX - offsetX;
          const newY = moveMouseY - offsetY;
          this.dragMove.next({ x: newX, y: newY }); // Emit new position
        });

      // --- Setup Mouse Up Listener (on document/window, listen only once) ---
      this.mouseUpSubscription = fromEvent<MouseEvent>(this.document, 'mouseup')
        .pipe(
          takeUntilDestroyed(this.destroyRef), // Auto-unsubscribe on service destroy
        )
        .subscribe(() => {
          this.stopDragging();
        });
    }
  }

  private stopDragging(): void {
    if (this._isDragging()) {
      this._isDragging.set(false);
      this.dragEnd.next(); // Emit drag end event

      // Clean up listeners specific to this drag instance
      this.mouseMoveSubscription?.unsubscribe();
      this.mouseUpSubscription?.unsubscribe();
      this.mouseMoveSubscription = null;
      this.mouseUpSubscription = null;
    }
  }

  // Helper to get mouse coordinates relative to the canvas
  private getMousePos(event: MouseEvent): { mouseX: number; mouseY: number } {
    if (!this.canvasEl) return { mouseX: 0, mouseY: 0 }; // Should not happen if initialized

    const rect = this.canvasEl.getBoundingClientRect();
    const scaleX = this.canvasEl.width / rect.width; // Handle CSS scaling
    const scaleY = this.canvasEl.height / rect.height;
    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;
    return { mouseX, mouseY };
  }
}
