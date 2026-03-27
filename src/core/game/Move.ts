import type { Card } from '../entities/Card';
import type { PileLocation } from '../entities/Pile';

/**
 * All possible move types in FreeCell.
 */
export type MoveType =
  | 'cascade-to-cascade'
  | 'cascade-to-freecell'
  | 'cascade-to-foundation'
  | 'freecell-to-cascade'
  | 'freecell-to-foundation';

/**
 * Represents a single move in the game.
 * For super-moves, `cards` contains multiple cards moved as a unit.
 */
export interface Move {
  readonly type: MoveType;
  readonly from: PileLocation;
  readonly to: PileLocation;
  /** Cards being moved (single card for atomic, multiple for super-moves) */
  readonly cards: readonly Card[];
}

/**
 * Creates a Move value object.
 */
export function createMove(
  type: MoveType,
  from: PileLocation,
  to: PileLocation,
  cards: readonly Card[],
): Move {
  return { type, from, to, cards };
}
