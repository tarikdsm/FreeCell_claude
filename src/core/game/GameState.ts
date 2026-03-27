import type { Card } from '../entities/Card';
import type { Suit } from '../entities/Suit';
import { ALL_SUITS, Suit as SuitEnum } from '../entities/Suit';
import { NUM_CASCADES } from '../entities/Pile';

/**
 * Immutable game state for FreeCell.
 *
 * Every operation that modifies state returns a NEW GameState.
 * All arrays and records are readonly to enforce immutability.
 */
export interface GameState {
  /** 8 cascade columns, each an array of cards (bottom to top) */
  readonly cascades: ReadonlyArray<ReadonlyArray<Card>>;
  /** 4 free cell slots (null = empty) */
  readonly freeCells: readonly [Card | null, Card | null, Card | null, Card | null];
  /** Foundation top rank per suit (0 = empty, 1 = Ace, ..., 13 = King) */
  readonly foundations: Readonly<Record<Suit, number>>;
  /** Number of moves made */
  readonly moveCount: number;
}

/**
 * Type alias for the free cells tuple.
 */
export type FreeCellSlots = readonly [Card | null, Card | null, Card | null, Card | null];

/**
 * Type alias for foundation state.
 */
export type Foundations = Readonly<Record<Suit, number>>;

/**
 * Creates an empty initial game state (no cards dealt).
 */
export function createEmptyState(): GameState {
  const cascades: ReadonlyArray<ReadonlyArray<Card>> = Array.from(
    { length: NUM_CASCADES },
    () => [] as Card[],
  );
  return {
    cascades,
    freeCells: [null, null, null, null],
    foundations: {
      [SuitEnum.Clubs]: 0,
      [SuitEnum.Diamonds]: 0,
      [SuitEnum.Hearts]: 0,
      [SuitEnum.Spades]: 0,
    } as Foundations,
    moveCount: 0,
  };
}

/**
 * Creates a game state with the given cascades (after dealing).
 */
export function createDealtState(cascades: ReadonlyArray<ReadonlyArray<Card>>): GameState {
  return {
    cascades,
    freeCells: [null, null, null, null],
    foundations: {
      [SuitEnum.Clubs]: 0,
      [SuitEnum.Diamonds]: 0,
      [SuitEnum.Hearts]: 0,
      [SuitEnum.Spades]: 0,
    } as Foundations,
    moveCount: 0,
  };
}

/**
 * Returns the number of empty free cell slots.
 */
export function emptyFreeCellCount(state: GameState): number {
  return state.freeCells.filter((c) => c === null).length;
}

/**
 * Returns the number of empty cascade columns.
 */
export function emptyCascadeCount(state: GameState): number {
  return state.cascades.filter((c) => c.length === 0).length;
}

/**
 * Returns the index of the first empty free cell, or -1 if all occupied.
 */
export function firstEmptyFreeCell(state: GameState): number {
  return state.freeCells.indexOf(null);
}

/**
 * Returns true if all 52 cards are on the foundations (game won).
 */
export function isWon(state: GameState): boolean {
  return ALL_SUITS.every((suit) => state.foundations[suit] === 13);
}

/**
 * Returns total number of cards currently on all foundations.
 */
export function foundationCardCount(state: GameState): number {
  return ALL_SUITS.reduce<number>((sum, suit) => sum + state.foundations[suit], 0);
}
