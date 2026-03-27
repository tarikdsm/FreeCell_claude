import { type Suit, ALL_SUITS, isRedSuit, suitSymbol, parseSuit } from './Suit';
import { type Rank, ALL_RANKS, rankSymbol, parseRank } from './Rank';

/**
 * Branded type for card IDs to prevent mixing with plain numbers.
 * Encoding: (suit << 4) | rank — gives range 1..0x3D (1..61)
 */
export type CardId = number & { readonly __brand: 'CardId' };

/**
 * Card is an immutable value object representing a single playing card.
 *
 * Internal encoding: `(suit << 4) | rank`
 * - Bits 0-3: rank (1-13)
 * - Bits 4-5: suit (0-3)
 *
 * This encoding allows fast rank extraction via `id & 0xF` and suit via `id >> 4`.
 */
export interface Card {
  /** Unique numeric ID encoding suit and rank */
  readonly id: CardId;
  /** The card's suit */
  readonly suit: Suit;
  /** The card's rank */
  readonly rank: Rank;
}

/**
 * Creates a Card from suit and rank.
 *
 * @example
 * const aceOfSpades = cardOf(Suit.Spades, Rank.Ace);
 */
export function cardOf(suit: Suit, rank: Rank): Card {
  const id = ((suit << 4) | rank) as CardId;
  return { id, suit, rank };
}

/**
 * Creates a Card from its numeric ID.
 *
 * @example
 * const card = cardFromId(0x31 as CardId); // Ace of Spades
 */
export function cardFromId(id: CardId): Card {
  const rank = (id & 0xF) as Rank;
  const suit = (id >> 4) as Suit;
  return { id, suit, rank };
}

/**
 * Parses a two-character card string like "Ah" (Ace of hearts) or "Ts" (Ten of spades).
 *
 * @example
 * const card = parseCard("Ah"); // Ace of Hearts
 * const card2 = parseCard("Ks"); // King of Spades
 *
 * @throws Error if the string is not a valid card notation
 */
export function parseCard(notation: string): Card {
  if (notation.length !== 2) {
    throw new Error(`Card notation must be 2 characters, got '${notation}'`);
  }
  const rank = parseRank(notation[0]!);
  const suit = parseSuit(notation[1]!);
  return cardOf(suit, rank);
}

/**
 * Returns the two-character string representation of a card.
 *
 * @example
 * cardToString(cardOf(Suit.Hearts, Rank.Ace)) // "Ah"
 */
export function cardToString(card: Card): string {
  return rankSymbol(card.rank) + suitSymbol(card.suit);
}

/**
 * Returns true if the card is red (Diamonds or Hearts).
 */
export function isRed(card: Card): boolean {
  return isRedSuit(card.suit);
}

/**
 * Returns true if the card is black (Clubs or Spades).
 */
export function isBlack(card: Card): boolean {
  return !isRedSuit(card.suit);
}

/**
 * Returns true if two cards have opposite colors.
 */
export function isOppositeColor(a: Card, b: Card): boolean {
  return isRed(a) !== isRed(b);
}

/**
 * Returns true if two cards are the same card (same suit and rank).
 */
export function cardEquals(a: Card, b: Card): boolean {
  return a.id === b.id;
}

/**
 * Checks if `card` can be placed on top of `target` in a cascade.
 * Rule: card must be opposite color and exactly one rank lower.
 */
export function canStackOnCascade(card: Card, target: Card): boolean {
  return isOppositeColor(card, target) && card.rank === target.rank - 1;
}

/**
 * Checks if `card` can be placed on a foundation with the given top rank.
 * Rule: card must be the next rank in sequence (topRank + 1).
 * A topRank of 0 means the foundation is empty and only an Ace can be placed.
 */
export function canPlaceOnFoundation(card: Card, foundationTopRank: number): boolean {
  return card.rank === foundationTopRank + 1;
}

/**
 * Generates a complete 52-card deck in a deterministic order.
 */
export function createDeck(): readonly Card[] {
  const cards: Card[] = [];
  for (const suit of ALL_SUITS) {
    for (const rank of ALL_RANKS) {
      cards.push(cardOf(suit, rank));
    }
  }
  return cards;
}

/** Total number of cards in a standard deck */
export const DECK_SIZE = 52;
