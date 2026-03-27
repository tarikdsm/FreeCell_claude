import { describe, it, expect } from 'vitest';
import { generateMicrosoftDeal, dealToCascades, generateDeal } from '../../src/core/game/DealGenerator';
import { cardToString } from '../../src/core/entities/Card';
import { Suit } from '../../src/core/entities/Suit';
import { Rank } from '../../src/core/entities/Rank';

describe('DealGenerator', () => {
  describe('generateMicrosoftDeal', () => {
    it('generates exactly 52 cards', () => {
      const deck = generateMicrosoftDeal(1);
      expect(deck.length).toBe(52);
    });

    it('generates all unique cards', () => {
      const deck = generateMicrosoftDeal(1);
      const ids = new Set(deck.map((c) => c.id));
      expect(ids.size).toBe(52);
    });

    it('is deterministic - same deal number gives same deck', () => {
      const deck1 = generateMicrosoftDeal(42);
      const deck2 = generateMicrosoftDeal(42);
      for (let i = 0; i < 52; i++) {
        expect(deck1[i]!.id).toBe(deck2[i]!.id);
      }
    });

    it('different deal numbers give different decks', () => {
      const deck1 = generateMicrosoftDeal(1);
      const deck2 = generateMicrosoftDeal(2);
      // Very unlikely to be the same
      let different = false;
      for (let i = 0; i < 52; i++) {
        if (deck1[i]!.id !== deck2[i]!.id) {
          different = true;
          break;
        }
      }
      expect(different).toBe(true);
    });

    // Validate Deal #1 against known Microsoft FreeCell layout
    // The deck starts: JD 2D 9H JC 5D 7H 7C 5H ...
    // After round-robin dealing to 8 cascades:
    // Col 0: JD KD 2S 4C 3S 6D 6S
    it('deal #1 matches known Microsoft FreeCell layout', () => {
      const deck = generateMicrosoftDeal(1);

      // First card in deck should be Jack of Diamonds
      expect(cardToString(deck[0]!)).toBe('Jd');

      const cascades = dealToCascades(deck);
      const col0 = cascades[0]!.map(cardToString);
      expect(col0[0]).toBe('Jd');
      expect(col0[1]).toBe('Kd');
      expect(col0[2]).toBe('2s');
      expect(col0[3]).toBe('4c');
      expect(col0[4]).toBe('3s');
      expect(col0[5]).toBe('6d');
      expect(col0[6]).toBe('6s');

      // Also verify deck positions that correspond to known MS FreeCell deal #1
      // Deck: Jd 2d 9h Jc 5d 7h 7c 5h (first 8 = first card of each cascade)
      expect(cardToString(deck[1]!)).toBe('2d');
      expect(cardToString(deck[2]!)).toBe('9h');
      expect(cardToString(deck[3]!)).toBe('Jc');
    });

    it('deal #617 generates valid deck', () => {
      const deck = generateMicrosoftDeal(617);
      expect(deck.length).toBe(52);
      const ids = new Set(deck.map((c) => c.id));
      expect(ids.size).toBe(52);
    });

    it('deal #11982 generates valid deck', () => {
      const deck = generateMicrosoftDeal(11982);
      expect(deck.length).toBe(52);
      const ids = new Set(deck.map((c) => c.id));
      expect(ids.size).toBe(52);
    });

    it('handles large deal numbers', () => {
      const deck = generateMicrosoftDeal(1000000);
      expect(deck.length).toBe(52);
      const ids = new Set(deck.map((c) => c.id));
      expect(ids.size).toBe(52);
    });
  });

  describe('dealToCascades', () => {
    it('creates 8 cascades', () => {
      const deck = generateMicrosoftDeal(1);
      const cascades = dealToCascades(deck);
      expect(cascades.length).toBe(8);
    });

    it('first 4 cascades have 7 cards, last 4 have 6 cards', () => {
      const deck = generateMicrosoftDeal(1);
      const cascades = dealToCascades(deck);
      for (let i = 0; i < 4; i++) {
        expect(cascades[i]!.length).toBe(7);
      }
      for (let i = 4; i < 8; i++) {
        expect(cascades[i]!.length).toBe(6);
      }
    });

    it('contains all 52 cards across cascades', () => {
      const deck = generateMicrosoftDeal(1);
      const cascades = dealToCascades(deck);
      const allCards = cascades.flat();
      expect(allCards.length).toBe(52);
      const ids = new Set(allCards.map((c) => c.id));
      expect(ids.size).toBe(52);
    });

    it('deals cards in round-robin order', () => {
      const deck = generateMicrosoftDeal(1);
      const cascades = dealToCascades(deck);
      // First card goes to cascade 0, second to cascade 1, etc.
      expect(cascades[0]![0]!.id).toBe(deck[0]!.id);
      expect(cascades[1]![0]!.id).toBe(deck[1]!.id);
      expect(cascades[7]![0]!.id).toBe(deck[7]!.id);
      expect(cascades[0]![1]!.id).toBe(deck[8]!.id);
    });
  });

  describe('generateDeal', () => {
    it('returns 8 cascades for any deal number', () => {
      const cascades = generateDeal(100);
      expect(cascades.length).toBe(8);
    });

    it('cascades have correct card counts', () => {
      const cascades = generateDeal(500);
      const total = cascades.reduce((sum, c) => sum + c.length, 0);
      expect(total).toBe(52);
    });
  });
});
