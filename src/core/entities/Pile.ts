import type { Card } from './Card';
import type { Suit } from './Suit';

/**
 * Location types for piles in the game.
 * Uses discriminated unions for type-safe pile identification.
 */
export type PileLocation =
  | CascadeLocation
  | FreeCellLocation
  | FoundationLocation;

export interface CascadeLocation {
  readonly kind: 'cascade';
  /** Index 0-7 for the 8 cascade columns */
  readonly index: number;
}

export interface FreeCellLocation {
  readonly kind: 'freecell';
  /** Index 0-3 for the 4 free cell slots */
  readonly index: number;
}

export interface FoundationLocation {
  readonly kind: 'foundation';
  /** The suit this foundation pile belongs to */
  readonly suit: Suit;
}

/** Creates a cascade location reference */
export function cascade(index: number): CascadeLocation {
  return { kind: 'cascade', index };
}

/** Creates a free cell location reference */
export function freeCell(index: number): FreeCellLocation {
  return { kind: 'freecell', index };
}

/** Creates a foundation location reference */
export function foundation(suit: Suit): FoundationLocation {
  return { kind: 'foundation', suit };
}

/**
 * Returns the top card of a cascade, or undefined if empty.
 */
export function cascadeTop(cards: readonly Card[]): Card | undefined {
  return cards[cards.length - 1];
}

/**
 * Returns how many cards at the bottom of a cascade form a valid
 * descending sequence with alternating colors (starting from the top/end).
 *
 * @example
 * // Cascade: [Kh, Qs, Jd] → sorted run length = 3
 * // Cascade: [Kh, Qh, Jd] → sorted run length = 1 (Qh same color as Kh breaks it)
 */
export function cascadeSortedRunLength(cards: readonly Card[]): number {
  if (cards.length === 0) return 0;

  let count = 1;
  for (let i = cards.length - 2; i >= 0; i--) {
    const lower = cards[i + 1]!;
    const upper = cards[i]!;
    // Check: upper is opposite color and exactly one rank higher
    const oppositeColor = ((upper.suit ^ lower.suit) & 1) !== 0;
    if (!oppositeColor || upper.rank !== lower.rank + 1) {
      break;
    }
    count++;
  }
  return count;
}

/** Number of cascade columns in FreeCell */
export const NUM_CASCADES = 8;

/** Number of free cell slots */
export const NUM_FREECELLS = 4;

/** Number of foundation piles (one per suit) */
export const NUM_FOUNDATIONS = 4;
