import { describe, it, expect } from 'vitest';
import {
  cardOf, cardFromId, parseCard, cardToString,
  isRed, isBlack, isOppositeColor, cardEquals,
  canStackOnCascade, canPlaceOnFoundation, createDeck, DECK_SIZE,
} from '../../src/core/entities/Card';
import type { CardId } from '../../src/core/entities/Card';
import { Suit } from '../../src/core/entities/Suit';
import { Rank } from '../../src/core/entities/Rank';

describe('Card', () => {
  describe('cardOf', () => {
    it('creates a card with correct suit and rank', () => {
      const card = cardOf(Suit.Hearts, Rank.Ace);
      expect(card.suit).toBe(Suit.Hearts);
      expect(card.rank).toBe(Rank.Ace);
    });

    it('encodes card ID as (suit << 4) | rank', () => {
      const card = cardOf(Suit.Spades, Rank.King);
      expect(card.id).toBe((Suit.Spades << 4) | Rank.King);
    });

    it('creates unique IDs for all 52 cards', () => {
      const ids = new Set<number>();
      for (const suit of [Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades]) {
        for (let rank = Rank.Ace; rank <= Rank.King; rank++) {
          ids.add(cardOf(suit, rank as Rank).id);
        }
      }
      expect(ids.size).toBe(52);
    });
  });

  describe('cardFromId', () => {
    it('reconstructs card from ID', () => {
      const original = cardOf(Suit.Diamonds, Rank.Queen);
      const reconstructed = cardFromId(original.id);
      expect(reconstructed.suit).toBe(Suit.Diamonds);
      expect(reconstructed.rank).toBe(Rank.Queen);
    });

    it('roundtrips all 52 cards', () => {
      const deck = createDeck();
      for (const card of deck) {
        const rt = cardFromId(card.id);
        expect(rt.suit).toBe(card.suit);
        expect(rt.rank).toBe(card.rank);
      }
    });
  });

  describe('parseCard', () => {
    it('parses "Ah" as Ace of Hearts', () => {
      const card = parseCard('Ah');
      expect(card.suit).toBe(Suit.Hearts);
      expect(card.rank).toBe(Rank.Ace);
    });

    it('parses "Ks" as King of Spades', () => {
      const card = parseCard('Ks');
      expect(card.suit).toBe(Suit.Spades);
      expect(card.rank).toBe(Rank.King);
    });

    it('parses "Td" as Ten of Diamonds', () => {
      const card = parseCard('Td');
      expect(card.suit).toBe(Suit.Diamonds);
      expect(card.rank).toBe(Rank.Ten);
    });

    it('throws on invalid notation', () => {
      expect(() => parseCard('X')).toThrow();
      expect(() => parseCard('ABC')).toThrow();
      expect(() => parseCard('Zz')).toThrow();
    });
  });

  describe('cardToString', () => {
    it('converts Ace of Hearts to "Ah"', () => {
      expect(cardToString(cardOf(Suit.Hearts, Rank.Ace))).toBe('Ah');
    });

    it('roundtrips with parseCard', () => {
      const notations = ['Ac', '2d', '5h', 'Ts', 'Jc', 'Qd', 'Ks'];
      for (const n of notations) {
        expect(cardToString(parseCard(n))).toBe(n);
      }
    });
  });

  describe('color functions', () => {
    it('diamonds are red', () => {
      expect(isRed(cardOf(Suit.Diamonds, Rank.Five))).toBe(true);
      expect(isBlack(cardOf(Suit.Diamonds, Rank.Five))).toBe(false);
    });

    it('hearts are red', () => {
      expect(isRed(cardOf(Suit.Hearts, Rank.King))).toBe(true);
    });

    it('clubs are black', () => {
      expect(isBlack(cardOf(Suit.Clubs, Rank.Ace))).toBe(true);
      expect(isRed(cardOf(Suit.Clubs, Rank.Ace))).toBe(false);
    });

    it('spades are black', () => {
      expect(isBlack(cardOf(Suit.Spades, Rank.Seven))).toBe(true);
    });

    it('opposite color detection works', () => {
      expect(isOppositeColor(
        cardOf(Suit.Hearts, Rank.Five),
        cardOf(Suit.Spades, Rank.Six),
      )).toBe(true);
      expect(isOppositeColor(
        cardOf(Suit.Hearts, Rank.Five),
        cardOf(Suit.Diamonds, Rank.Six),
      )).toBe(false);
    });
  });

  describe('cardEquals', () => {
    it('same suit and rank are equal', () => {
      const a = cardOf(Suit.Hearts, Rank.Ace);
      const b = cardOf(Suit.Hearts, Rank.Ace);
      expect(cardEquals(a, b)).toBe(true);
    });

    it('different cards are not equal', () => {
      expect(cardEquals(
        cardOf(Suit.Hearts, Rank.Ace),
        cardOf(Suit.Spades, Rank.Ace),
      )).toBe(false);
    });
  });

  describe('canStackOnCascade', () => {
    it('red 5 can stack on black 6', () => {
      expect(canStackOnCascade(
        cardOf(Suit.Hearts, Rank.Five),
        cardOf(Suit.Spades, Rank.Six),
      )).toBe(true);
    });

    it('black 5 can stack on red 6', () => {
      expect(canStackOnCascade(
        cardOf(Suit.Clubs, Rank.Five),
        cardOf(Suit.Diamonds, Rank.Six),
      )).toBe(true);
    });

    it('same color cannot stack', () => {
      expect(canStackOnCascade(
        cardOf(Suit.Hearts, Rank.Five),
        cardOf(Suit.Diamonds, Rank.Six),
      )).toBe(false);
    });

    it('wrong rank cannot stack', () => {
      expect(canStackOnCascade(
        cardOf(Suit.Hearts, Rank.Five),
        cardOf(Suit.Spades, Rank.Eight),
      )).toBe(false);
    });

    it('Ace cannot stack on Ace', () => {
      expect(canStackOnCascade(
        cardOf(Suit.Hearts, Rank.Ace),
        cardOf(Suit.Spades, Rank.Ace),
      )).toBe(false);
    });
  });

  describe('canPlaceOnFoundation', () => {
    it('Ace goes on empty foundation (rank 0)', () => {
      expect(canPlaceOnFoundation(cardOf(Suit.Hearts, Rank.Ace), 0)).toBe(true);
    });

    it('Two goes on Ace foundation (rank 1)', () => {
      expect(canPlaceOnFoundation(cardOf(Suit.Hearts, Rank.Two), 1)).toBe(true);
    });

    it('King goes on Queen foundation (rank 12)', () => {
      expect(canPlaceOnFoundation(cardOf(Suit.Hearts, Rank.King), 12)).toBe(true);
    });

    it('rejects wrong rank', () => {
      expect(canPlaceOnFoundation(cardOf(Suit.Hearts, Rank.Three), 0)).toBe(false);
    });
  });

  describe('createDeck', () => {
    it('creates 52 unique cards', () => {
      const deck = createDeck();
      expect(deck.length).toBe(DECK_SIZE);
      const ids = new Set(deck.map((c) => c.id));
      expect(ids.size).toBe(52);
    });

    it('contains all suits and ranks', () => {
      const deck = createDeck();
      for (const suit of [Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades]) {
        for (let rank = Rank.Ace; rank <= Rank.King; rank++) {
          const found = deck.find((c) => c.suit === suit && c.rank === rank as Rank);
          expect(found).toBeDefined();
        }
      }
    });
  });
});
