import { ALL_SUITS } from '../entities/Suit';
import type { GameState } from './GameState';

/**
 * Returns true if the game is won (all 52 cards on foundations).
 * Each foundation must have King (rank 13) as top card.
 */
export function isGameWon(state: GameState): boolean {
  return ALL_SUITS.every((suit) => state.foundations[suit] === 13);
}

/**
 * Returns true if the game is auto-completable.
 *
 * A game is auto-completable when all remaining cards in cascades
 * and free cells can be moved to foundations without any further
 * player decisions. This is true when:
 *
 * 1. All free cells are empty (or their cards can go to foundation)
 * 2. All cascades have cards in strictly descending rank order
 *    (every card is smaller than the card below it)
 *
 * This ensures we can always move the smallest available card to
 * its foundation without needing to rearrange anything.
 */
export function isAutoCompletable(state: GameState): boolean {
  // Check cascades: every cascade must be in descending rank order
  for (const cascade of state.cascades) {
    for (let i = 0; i < cascade.length - 1; i++) {
      const lower = cascade[i]!;
      const upper = cascade[i + 1]!;
      // Each card must have a lower rank than the one below it
      if (upper.rank >= lower.rank) {
        return false;
      }
    }
  }

  // All cascades are in order — the game can be auto-completed
  // (free cell cards will naturally go to foundation when their turn comes)
  return true;
}

/**
 * Calculates the number of cards still needed on foundations to win.
 */
export function cardsRemainingToWin(state: GameState): number {
  return 52 - ALL_SUITS.reduce<number>((sum, suit) => sum + state.foundations[suit], 0);
}
