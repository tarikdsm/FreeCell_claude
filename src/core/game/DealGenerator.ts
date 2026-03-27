import type { Card } from '../entities/Card';
import { Suit } from '../entities/Suit';
import type { Rank } from '../entities/Rank';
import { cardOf } from '../entities/Card';
import { NUM_CASCADES } from '../entities/Pile';

/**
 * Microsoft FreeCell deal generation.
 *
 * Uses the exact Linear Congruential Generator (LCG) from Microsoft's
 * Visual C++ runtime to produce deals identical to Windows FreeCell.
 *
 * LCG parameters:
 * - Multiplier: 214013
 * - Increment: 2531011
 * - Modulus: 2^32
 *
 * @see docs/research/ALGORITHMS.md for detailed algorithm description
 */

/**
 * Maps a Microsoft card index (0-51) to our Card representation.
 *
 * Microsoft ordering: interleaved by suit
 * - index % 4 = suit (0=Clubs, 1=Diamonds, 2=Hearts, 3=Spades)
 * - floor(index / 4) = rank (0=Ace, 1=Two, ..., 12=King)
 */
function msCardToCard(msIndex: number): Card {
  const msSuit = msIndex % 4;
  const msRank = Math.floor(msIndex / 4) + 1; // +1 because our Rank.Ace = 1

  const suit = msSuit as typeof Suit.Clubs | typeof Suit.Diamonds | typeof Suit.Hearts | typeof Suit.Spades;
  const rank = msRank as Rank;

  return cardOf(suit, rank);
}

/**
 * Generates a shuffled deck using the Microsoft FreeCell LCG algorithm.
 *
 * @param dealNumber - The deal number (1 to 2^31-1 for classic, up to 2^32 for extended)
 * @returns Array of 52 cards in dealing order
 *
 * @example
 * const deck = generateMicrosoftDeal(1);
 * // deck[0] is the first card dealt, deck[51] is the last
 */
export function generateMicrosoftDeal(dealNumber: number): readonly Card[] {
  // Initialize deck with indices 0-51
  const deck: number[] = Array.from({ length: 52 }, (_, i) => i);

  // Use BigInt for 32-bit unsigned arithmetic to match Microsoft's LCG exactly
  let seed = BigInt(dealNumber);
  const MULT = 214013n;
  const INC = 2531011n;
  const MOD = 0x100000000n; // 2^32

  for (let i = 0; i < 52; i++) {
    const cardsLeft = 52 - i;

    // LCG step
    seed = (seed * MULT + INC) % MOD;

    // Extract bits 16-30 (15-bit random number)
    const rand = Number((seed >> 16n) & 0x7FFFn);

    // Position selection
    const pos = rand % cardsLeft;

    // Fisher-Yates swap
    const temp = deck[pos]!;
    deck[pos] = deck[cardsLeft - 1]!;
    deck[cardsLeft - 1] = temp;
  }

  // Reverse to get dealing order (Microsoft deals last-shuffled first)
  deck.reverse();

  // Convert Microsoft indices to our Card objects
  return deck.map(msCardToCard);
}

/**
 * Deals cards from a deck into 8 cascades.
 *
 * Cards are dealt left-to-right across the 8 columns:
 * - Columns 0-3 get 7 cards each (28 cards)
 * - Columns 4-7 get 6 cards each (24 cards)
 *
 * @param deck - 52 cards in dealing order
 * @returns 8 cascade arrays
 */
export function dealToCascades(deck: readonly Card[]): ReadonlyArray<ReadonlyArray<Card>> {
  const cascades: Card[][] = Array.from({ length: NUM_CASCADES }, () => []);

  for (let i = 0; i < deck.length; i++) {
    const col = i % NUM_CASCADES;
    cascades[col]!.push(deck[i]!);
  }

  return cascades;
}

/**
 * Generates a complete dealt game state's cascades for a given deal number.
 *
 * @param dealNumber - Microsoft FreeCell deal number
 * @returns 8 cascade arrays ready for createDealtState()
 */
export function generateDeal(dealNumber: number): ReadonlyArray<ReadonlyArray<Card>> {
  const deck = generateMicrosoftDeal(dealNumber);
  return dealToCascades(deck);
}
