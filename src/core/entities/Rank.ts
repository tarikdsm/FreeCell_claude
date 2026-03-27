/**
 * Rank represents card ranks from Ace (1) through King (13).
 * Stored as 4 bits (1-13) in the low nibble of the card ID.
 *
 * Ace = 1 (not 0) so that foundation empty state = 0 works naturally.
 */
export const Rank = {
  Ace: 1,
  Two: 2,
  Three: 3,
  Four: 4,
  Five: 5,
  Six: 6,
  Seven: 7,
  Eight: 8,
  Nine: 9,
  Ten: 10,
  Jack: 11,
  Queen: 12,
  King: 13,
} as const;

export type Rank = (typeof Rank)[keyof typeof Rank];

/** All thirteen ranks in ascending order */
export const ALL_RANKS: readonly Rank[] = [
  Rank.Ace, Rank.Two, Rank.Three, Rank.Four, Rank.Five, Rank.Six,
  Rank.Seven, Rank.Eight, Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen, Rank.King,
] as const;

/**
 * Returns the next higher rank, or null if already King.
 */
export function nextRank(rank: Rank): Rank | null {
  if (rank >= Rank.King) return null;
  return (rank + 1) as Rank;
}

/**
 * Returns the next lower rank, or null if already Ace.
 */
export function prevRank(rank: Rank): Rank | null {
  if (rank <= Rank.Ace) return null;
  return (rank - 1) as Rank;
}

/**
 * Returns the display name of a rank.
 */
export function rankName(rank: Rank): string {
  switch (rank) {
    case Rank.Ace: return 'Ace';
    case Rank.Two: return '2';
    case Rank.Three: return '3';
    case Rank.Four: return '4';
    case Rank.Five: return '5';
    case Rank.Six: return '6';
    case Rank.Seven: return '7';
    case Rank.Eight: return '8';
    case Rank.Nine: return '9';
    case Rank.Ten: return '10';
    case Rank.Jack: return 'Jack';
    case Rank.Queen: return 'Queen';
    case Rank.King: return 'King';
  }
}

/**
 * Returns the single-character symbol for a rank.
 */
export function rankSymbol(rank: Rank): string {
  switch (rank) {
    case Rank.Ace: return 'A';
    case Rank.Ten: return 'T';
    case Rank.Jack: return 'J';
    case Rank.Queen: return 'Q';
    case Rank.King: return 'K';
    default: return String(rank);
  }
}

/**
 * Parses a single-character rank symbol to a Rank value.
 * @throws Error if the character is not a valid rank symbol
 */
export function parseRank(ch: string): Rank {
  switch (ch.toUpperCase()) {
    case 'A': return Rank.Ace;
    case '2': return Rank.Two;
    case '3': return Rank.Three;
    case '4': return Rank.Four;
    case '5': return Rank.Five;
    case '6': return Rank.Six;
    case '7': return Rank.Seven;
    case '8': return Rank.Eight;
    case '9': return Rank.Nine;
    case 'T': return Rank.Ten;
    case 'J': return Rank.Jack;
    case 'Q': return Rank.Queen;
    case 'K': return Rank.King;
    default: throw new Error(`Invalid rank character: '${ch}'`);
  }
}
