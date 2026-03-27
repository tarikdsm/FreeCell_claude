import type { Card } from '../entities/Card';
import { oppositeSuits } from '../entities/Suit';
import { Rank } from '../entities/Rank';
import { canPlaceOnFoundation } from '../entities/Card';
import { cascadeTop } from '../entities/Pile';
import type { GameState } from './GameState';
import type { Move } from './Move';
import { applyMove } from './MoveExecutor';

/**
 * Determines if a card can be safely auto-moved to its foundation.
 *
 * A card is safe to auto-move when keeping it in play cannot benefit
 * any future move. This is true when:
 * - The card is an Ace or Two (always safe)
 * - Both opposite-color suits have rank-1 already on their foundations
 *
 * @example
 * // Red 5 is safe if both black 4s are on foundations
 * isSafeAutoMove(redFive, state) // checks Clubs and Spades foundations >= 4
 */
export function isSafeAutoMove(card: Card, state: GameState): boolean {
  // Can't auto-move if it doesn't fit on the foundation
  const foundationRank = state.foundations[card.suit];
  if (foundationRank === undefined || !canPlaceOnFoundation(card, foundationRank)) {
    return false;
  }

  // Aces and Twos are always safe to auto-move
  if (card.rank <= Rank.Two) {
    return true;
  }

  // Check that both opposite-color suits have at least (rank - 1) on foundation
  // This ensures no card of opposite color with rank-1 is still needed in cascades
  const opposite = oppositeSuits(card.suit);
  return opposite.every((suit) => state.foundations[suit] >= card.rank - 1);
}

/**
 * Finds all safe auto-moves in the current state.
 * Checks both cascade tops and free cells.
 *
 * @returns Array of safe moves to foundations
 */
export function findSafeAutoMoves(state: GameState): Move[] {
  const moves: Move[] = [];

  // Check free cells
  for (let i = 0; i < state.freeCells.length; i++) {
    const card = state.freeCells[i];
    if (card != null && isSafeAutoMove(card, state)) {
      moves.push({
        type: 'freecell-to-foundation',
        from: { kind: 'freecell', index: i },
        to: { kind: 'foundation', suit: card.suit },
        cards: [card],
      });
    }
  }

  // Check cascade tops
  for (let i = 0; i < state.cascades.length; i++) {
    const cascade = state.cascades[i]!;
    const top = cascadeTop(cascade);
    if (top !== undefined && isSafeAutoMove(top, state)) {
      moves.push({
        type: 'cascade-to-foundation',
        from: { kind: 'cascade', index: i },
        to: { kind: 'foundation', suit: top.suit },
        cards: [top],
      });
    }
  }

  return moves;
}

/**
 * Applies all safe auto-moves in a cascade (chain reaction).
 * After each auto-move, re-checks for new safe auto-moves.
 *
 * @returns Object with the final state and all moves applied
 */
export function applyAllAutoMoves(state: GameState): {
  readonly state: GameState;
  readonly moves: readonly Move[];
} {
  const allMoves: Move[] = [];
  let current = state;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const autoMoves = findSafeAutoMoves(current);
    if (autoMoves.length === 0) break;

    // Apply the first safe auto-move and re-check
    const move = autoMoves[0]!;
    current = applyMove(current, move);
    allMoves.push(move);
  }

  return { state: current, moves: allMoves };
}
