import { Injectable } from '@angular/core';
import {
  BODY_PART_HITBOXES,
  BODY_PART_SEQUENCE,
  CELL_SIZE,
  TRACE_COMPLETION_PERCENTAGE,
  WASH_SPRITE_ROWS,
} from './wash.config';
import {
  GridCell,
  MouseScrubData,
  WashBodyPart,
  WashGameState,
} from './wash.types';

@Injectable({
  providedIn: 'root',
})
export class WashService {
  // Convert mouse position to grid coordinates
  getGridPosition(mouseX: number, mouseY: number): GridCell {
    return {
      x: Math.floor(mouseX / CELL_SIZE),
      y: Math.floor(mouseY / CELL_SIZE),
    };
  }

  // Check which body part (if any) is at the given grid position
  getBodyPartAtPosition(gridX: number, gridY: number): WashBodyPart | null {
    for (const hitbox of BODY_PART_HITBOXES) {
      if (hitbox.cells.some((cell) => cell.x === gridX && cell.y === gridY)) {
        return hitbox.part;
      }
    }
    return null;
  }

  // Process user interaction and return updated game state
  processInteraction(
    gameState: WashGameState,
    _scrubData: MouseScrubData, // No longer used
    mousePos: { x: number; y: number },
  ): WashGameState {
    return this.processTrace(gameState, mousePos);
  }

  // Process trace attempt for body parts
  private processTrace(
    gameState: WashGameState,
    mousePos: { x: number; y: number },
  ): WashGameState {
    const gridPos = this.getGridPosition(mousePos.x, mousePos.y);
    const bodyPartAtPos = this.getBodyPartAtPosition(gridPos.x, gridPos.y);

    // Not on the right part, do nothing
    if (bodyPartAtPos !== gameState.currentPart) {
      return gameState;
    }

    // Add the new cell to hitCells if it's not already there
    const alreadyHit = gameState.hitCells.some(
      (cell) => cell.x === gridPos.x && cell.y === gridPos.y,
    );
    if (alreadyHit) {
      return gameState;
    }

    const newHitCells = [...gameState.hitCells, gridPos];

    // Check for completion
    const targetHitbox = BODY_PART_HITBOXES.find(
      (hb) => hb.part === gameState.currentPart,
    );

    if (targetHitbox) {
      const requiredPercentage =
        TRACE_COMPLETION_PERCENTAGE[gameState.currentPart] ?? 1.0;
      const requiredCells = Math.floor(
        targetHitbox.cells.length * requiredPercentage,
      );

      if (newHitCells.length >= requiredCells) {
        return this.completeCurrentBodyPart(gameState);
      }
    }

    return {
      ...gameState,
      hitCells: newHitCells,
    };
  }

  // Mark current body part as complete and move to next
  private completeCurrentBodyPart(gameState: WashGameState): WashGameState {
    const newCompletedParts = [
      ...gameState.completedParts,
      gameState.currentPart,
    ];
    const currentIndex = BODY_PART_SEQUENCE.indexOf(gameState.currentPart);
    const nextIndex = currentIndex + 1;

    // Check if game is complete
    if (nextIndex >= BODY_PART_SEQUENCE.length) {
      return {
        ...gameState,
        completedParts: newCompletedParts,
        isGameComplete: true,
        hitCells: [],
      };
    }

    // Move to next body part
    return {
      ...gameState,
      currentPart: BODY_PART_SEQUENCE[nextIndex],
      completedParts: newCompletedParts,
      currentScrubCount: 0,
      hitCells: [], // Reset for the new part
    };
  }

  // Get current sprite row based on completed parts
  getCurrentSpriteRow(completedParts: WashBodyPart[]): number {
    if (completedParts.length === 0) return WASH_SPRITE_ROWS['all-dirty'];
    if (completedParts.includes('head') && completedParts.length === 1)
      return WASH_SPRITE_ROWS['head-clean'];
    if (completedParts.includes('torso') && completedParts.length === 2)
      return WASH_SPRITE_ROWS['head-torso-clean'];
    if (completedParts.includes('front-leg') && completedParts.length === 3)
      return WASH_SPRITE_ROWS['head-torso-frontleg-clean'];
    if (completedParts.includes('back-leg') && completedParts.length === 4)
      return WASH_SPRITE_ROWS['head-torso-frontleg-backleg-clean'];
    if (completedParts.length === 5) return WASH_SPRITE_ROWS['all-clean'];

    return WASH_SPRITE_ROWS['all-dirty'];
  }

  // Initialize game state
  createInitialGameState(): WashGameState {
    return {
      currentPart: BODY_PART_SEQUENCE[0],
      completedParts: [],
      currentScrubCount: 0,
      isGameComplete: false,
      hitCells: [],
    };
  }
}
