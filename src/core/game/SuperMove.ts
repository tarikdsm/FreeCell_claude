import type { GameState } from './GameState';
import { emptyFreeCellCount } from './GameState';

/**
 * Calculates the maximum number of cards that can be moved at once
 * from one cascade to another, based on available free cells and empty cascades.
 *
 * Formula: maxCards = (1 + emptyFreeCells) * 2^emptyTableauColumns
 *
 * When moving to an empty cascade, that cascade doesn't count as empty
 * (we're filling it), so we subtract 1 from empty cascade count.
 *
 * @param state - Current game state
 * @param fromCascadeIdx - Source cascade index
 * @param toCascadeIdx - Target cascade index
 * @returns Maximum number of cards that can be moved
 *
 * @complexity O(n) where n = number of cascades + freecells
 */
export function maxMovableCards(
  state: GameState,
  fromCascadeIdx: number,
  toCascadeIdx: number,
): number {
  const freeSlots = emptyFreeCellCount(state);

  // Count empty cascades, excluding source and target
  let emptyCascades = 0;
  for (let i = 0; i < state.cascades.length; i++) {
    if (i !== fromCascadeIdx && i !== toCascadeIdx && state.cascades[i]!.length === 0) {
      emptyCascades++;
    }
  }

  // Formula: (1 + freeCells) * 2^emptyCascades
  return (1 + freeSlots) * Math.pow(2, emptyCascades);
}

/**
 * Determines whether a super-move of `numCards` cards is possible
 * from one cascade to another.
 */
export function canSuperMove(
  state: GameState,
  fromCascadeIdx: number,
  toCascadeIdx: number,
  numCards: number,
): boolean {
  return numCards <= maxMovableCards(state, fromCascadeIdx, toCascadeIdx);
}
