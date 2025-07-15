import { Injectable } from '@angular/core';
import {
  BODY_PART_HITBOXES,
  BODY_PART_SEQUENCE,
  CELL_SIZE,
  MIN_SCRUB_DISTANCE,
  REQUIRED_SCRUBS_PER_PART,
  SMALL_BODY_PARTS,
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

  // Check if scrubbing motion is valid
  isValidScrub(
    startPos: { x: number; y: number },
    endPos: { x: number; y: number },
  ): boolean {
    const distance = Math.sqrt(
      Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2),
    );
    return distance >= MIN_SCRUB_DISTANCE;
  }

  // Process user interaction and return updated game state
  processInteraction(
    gameState: WashGameState,
    scrubData: MouseScrubData,
    mousePos: { x: number; y: number },
  ): WashGameState {
    const isSmallPart = SMALL_BODY_PARTS.includes(gameState.currentPart);

    if (isSmallPart) {
      return this.processTrace(gameState, mousePos);
    } else {
      return this.processScrub(gameState, scrubData, mousePos);
    }
  }

  // Process trace attempt for small body parts
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
    if (targetHitbox && newHitCells.length >= targetHitbox.cells.length) {
      return this.completeCurrentBodyPart(gameState);
    }

    return {
      ...gameState,
      hitCells: newHitCells,
    };
  }

  // Process scrub attempt and return updated game state
  private processScrub(
    gameState: WashGameState,
    scrubData: MouseScrubData,
    mousePos: { x: number; y: number },
  ): WashGameState {
    // A scrub is only valid if it's a long enough drag
    if (
      !scrubData.lastPosition ||
      !this.isValidScrub(scrubData.lastPosition, mousePos)
    ) {
      return gameState;
    }

    // Check if either the start or end of the scrub is on the target body part
    const startGridPos = this.getGridPosition(
      scrubData.lastPosition.x,
      scrubData.lastPosition.y,
    );
    const endGridPos = this.getGridPosition(mousePos.x, mousePos.y);

    const startBodyPart = this.getBodyPartAtPosition(
      startGridPos.x,
      startGridPos.y,
    );
    const endBodyPart = this.getBodyPartAtPosition(endGridPos.x, endGridPos.y);

    if (
      startBodyPart !== gameState.currentPart &&
      endBodyPart !== gameState.currentPart
    ) {
      return gameState; // Scrub was not on the target part
    }

    // Scrub is valid, update the count
    const newScrubCount = gameState.currentScrubCount + 1;

    // Check if body part is now complete
    if (newScrubCount >= REQUIRED_SCRUBS_PER_PART) {
      return this.completeCurrentBodyPart(gameState);
    }

    return {
      ...gameState,
      currentScrubCount: newScrubCount,
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
