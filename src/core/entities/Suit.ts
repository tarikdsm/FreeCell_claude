/**
 * Suit represents the four card suits in a standard deck.
 * Encoded as 2 bits (0-3) for compact card representation.
 *
 * Color mapping:
 * - Black: Clubs (0), Spades (3)
 * - Red: Diamonds (1), Hearts (2)
 */
export const Suit = {
  Clubs: 0,
  Diamonds: 1,
  Hearts: 2,
  Spades: 3,
} as const;

export type Suit = (typeof Suit)[keyof typeof Suit];

/** All four suits in standard order */
export const ALL_SUITS: readonly Suit[] = [
  Suit.Clubs,
  Suit.Diamonds,
  Suit.Hearts,
  Suit.Spades,
] as const;

/**
 * Returns true if the suit is red (Diamonds or Hearts).
 */
export function isRedSuit(suit: Suit): boolean {
  return suit === Suit.Diamonds || suit === Suit.Hearts;
}

/**
 * Returns true if the suit is black (Clubs or Spades).
 */
export function isBlackSuit(suit: Suit): boolean {
  return suit === Suit.Clubs || suit === Suit.Spades;
}

/**
 * Returns the two suits of the opposite color.
 */
export function oppositeSuits(suit: Suit): readonly [Suit, Suit] {
  if (isRedSuit(suit)) {
    return [Suit.Clubs, Suit.Spades];
  }
  return [Suit.Diamonds, Suit.Hearts];
}

/**
 * Returns the display name of a suit.
 */
export function suitName(suit: Suit): string {
  switch (suit) {
    case Suit.Clubs: return 'Clubs';
    case Suit.Diamonds: return 'Diamonds';
    case Suit.Hearts: return 'Hearts';
    case Suit.Spades: return 'Spades';
  }
}

/**
 * Returns the single-character symbol for a suit.
 */
export function suitSymbol(suit: Suit): string {
  switch (suit) {
    case Suit.Clubs: return 'c';
    case Suit.Diamonds: return 'd';
    case Suit.Hearts: return 'h';
    case Suit.Spades: return 's';
  }
}

/**
 * Parses a single-character suit symbol to a Suit value.
 * @throws Error if the character is not a valid suit symbol
 */
export function parseSuit(ch: string): Suit {
  switch (ch.toLowerCase()) {
    case 'c': return Suit.Clubs;
    case 'd': return Suit.Diamonds;
    case 'h': return Suit.Hearts;
    case 's': return Suit.Spades;
    default: throw new Error(`Invalid suit character: '${ch}'`);
  }
}
