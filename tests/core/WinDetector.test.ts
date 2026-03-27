import { describe, it, expect } from 'vitest';
import { isGameWon, isAutoCompletable, cardsRemainingToWin } from '../../src/core/game/WinDetector';
import { parseCard } from '../../src/core/entities/Card';
import { Suit } from '../../src/core/entities/Suit';
import type { GameState } from '../../src/core/game/GameState';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    cascades: Array.from({ length: 8 }, () => []),
    freeCells: [null, null, null, null],
    foundations: { [Suit.Clubs]: 0, [Suit.Diamonds]: 0, [Suit.Hearts]: 0, [Suit.Spades]: 0 },
    moveCount: 0,
    ...overrides,
  } as GameState;
}

describe('WinDetector', () => {
  describe('isGameWon', () => {
    it('returns false for empty state', () => {
      expect(isGameWon(makeState())).toBe(false);
    });

    it('returns true when all foundations have King', () => {
      const state = makeState({
        foundations: { [Suit.Clubs]: 13, [Suit.Diamonds]: 13, [Suit.Hearts]: 13, [Suit.Spades]: 13 },
      });
      expect(isGameWon(state)).toBe(true);
    });

    it('returns false when one foundation is incomplete', () => {
      const state = makeState({
        foundations: { [Suit.Clubs]: 13, [Suit.Diamonds]: 13, [Suit.Hearts]: 13, [Suit.Spades]: 12 },
      });
      expect(isGameWon(state)).toBe(false);
    });

    it('returns false when partially complete', () => {
      const state = makeState({
        foundations: { [Suit.Clubs]: 5, [Suit.Diamonds]: 8, [Suit.Hearts]: 3, [Suit.Spades]: 10 },
      });
      expect(isGameWon(state)).toBe(false);
    });
  });

  describe('isAutoCompletable', () => {
    it('empty board is auto-completable', () => {
      expect(isAutoCompletable(makeState())).toBe(true);
    });

    it('cascades in descending order are auto-completable', () => {
      const state = makeState({
        cascades: [
          [parseCard('5h'), parseCard('4c'), parseCard('3d'), parseCard('2s')],
          [parseCard('Kc'), parseCard('Qs'), parseCard('Jd')],
          [], [], [], [], [], [],
        ],
      });
      expect(isAutoCompletable(state)).toBe(true);
    });

    it('cascades with ascending cards are NOT auto-completable', () => {
      const state = makeState({
        cascades: [
          [parseCard('2s'), parseCard('5h')],  // 5 > 2 — blocked
          [], [], [], [], [], [], [],
        ],
      });
      expect(isAutoCompletable(state)).toBe(false);
    });

    it('single card per cascade is auto-completable', () => {
      const state = makeState({
        cascades: [
          [parseCard('5h')],
          [parseCard('Ks')],
          [], [], [], [], [], [],
        ],
      });
      expect(isAutoCompletable(state)).toBe(true);
    });

    it('free cells with cards are still auto-completable if cascades ok', () => {
      const state = makeState({
        cascades: [
          [parseCard('5h'), parseCard('3c')],
          [], [], [], [], [], [], [],
        ],
        freeCells: [parseCard('Ac'), null, null, null],
      });
      expect(isAutoCompletable(state)).toBe(true);
    });

    it('two equal ranks in same cascade is NOT auto-completable', () => {
      const state = makeState({
        cascades: [
          [parseCard('5h'), parseCard('5c')], // 5 = 5, not strictly descending
          [], [], [], [], [], [], [],
        ],
      });
      expect(isAutoCompletable(state)).toBe(false);
    });

    it('near-win state is auto-completable', () => {
      const state = makeState({
        cascades: [
          [parseCard('Kc')],
          [parseCard('Kd')],
          [parseCard('Kh')],
          [parseCard('Ks')],
          [], [], [], [],
        ],
        foundations: { [Suit.Clubs]: 12, [Suit.Diamonds]: 12, [Suit.Hearts]: 12, [Suit.Spades]: 12 },
      });
      expect(isAutoCompletable(state)).toBe(true);
    });
  });

  describe('cardsRemainingToWin', () => {
    it('returns 52 for empty state', () => {
      expect(cardsRemainingToWin(makeState())).toBe(52);
    });

    it('returns 0 for won state', () => {
      const state = makeState({
        foundations: { [Suit.Clubs]: 13, [Suit.Diamonds]: 13, [Suit.Hearts]: 13, [Suit.Spades]: 13 },
      });
      expect(cardsRemainingToWin(state)).toBe(0);
    });

    it('returns correct count for partial progress', () => {
      const state = makeState({
        foundations: { [Suit.Clubs]: 5, [Suit.Diamonds]: 3, [Suit.Hearts]: 7, [Suit.Spades]: 1 },
      });
      expect(cardsRemainingToWin(state)).toBe(52 - 16);
    });

    it('returns 48 when only Aces on foundations', () => {
      const state = makeState({
        foundations: { [Suit.Clubs]: 1, [Suit.Diamonds]: 1, [Suit.Hearts]: 1, [Suit.Spades]: 1 },
      });
      expect(cardsRemainingToWin(state)).toBe(48);
    });
  });
});
