import { describe, it, expect } from 'vitest';
import { isSafeAutoMove, findSafeAutoMoves, applyAllAutoMoves } from '../../src/core/game/AutoMove';
import { parseCard, cardOf } from '../../src/core/entities/Card';
import { Suit } from '../../src/core/entities/Suit';
import { Rank } from '../../src/core/entities/Rank';
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

describe('AutoMove', () => {
  describe('isSafeAutoMove', () => {
    it('Ace is always safe to auto-move', () => {
      const state = makeState();
      expect(isSafeAutoMove(parseCard('Ac'), state)).toBe(true);
      expect(isSafeAutoMove(parseCard('Ah'), state)).toBe(true);
    });

    it('Two is always safe to auto-move when Ace is on foundation', () => {
      const state = makeState({
        foundations: { [Suit.Clubs]: 1, [Suit.Diamonds]: 0, [Suit.Hearts]: 0, [Suit.Spades]: 0 },
      });
      expect(isSafeAutoMove(parseCard('2c'), state)).toBe(true);
    });

    it('red 3 is safe when both black 2s are on foundations', () => {
      const state = makeState({
        foundations: { [Suit.Clubs]: 2, [Suit.Diamonds]: 2, [Suit.Hearts]: 0, [Suit.Spades]: 2 },
      });
      expect(isSafeAutoMove(parseCard('3d'), state)).toBe(true);
    });

    it('red 3 is NOT safe when a black 2 is missing from foundation', () => {
      const state = makeState({
        foundations: { [Suit.Clubs]: 2, [Suit.Diamonds]: 2, [Suit.Hearts]: 0, [Suit.Spades]: 1 },
      });
      expect(isSafeAutoMove(parseCard('3d'), state)).toBe(false);
    });

    it('black 5 is safe when both red 4s are on foundations', () => {
      const state = makeState({
        foundations: { [Suit.Clubs]: 4, [Suit.Diamonds]: 4, [Suit.Hearts]: 4, [Suit.Spades]: 4 },
      });
      // Spades foundation at 4, so 5s can go on it; both red 4s are there
      expect(isSafeAutoMove(parseCard('5s'), state)).toBe(true);
    });

    it('black 5 is NOT safe when a red 4 is missing', () => {
      const state = makeState({
        foundations: { [Suit.Clubs]: 4, [Suit.Diamonds]: 3, [Suit.Hearts]: 4, [Suit.Spades]: 4 },
      });
      expect(isSafeAutoMove(parseCard('5s'), state)).toBe(false);
    });

    it('card that cannot go on foundation is not safe', () => {
      const state = makeState({
        foundations: { [Suit.Clubs]: 0, [Suit.Diamonds]: 0, [Suit.Hearts]: 0, [Suit.Spades]: 0 },
      });
      // 3 of clubs can't go on empty foundation
      expect(isSafeAutoMove(parseCard('3c'), state)).toBe(false);
    });

    it('King is safe when all opposite 12s (Queens) are on foundations', () => {
      const state = makeState({
        foundations: { [Suit.Clubs]: 12, [Suit.Diamonds]: 12, [Suit.Hearts]: 12, [Suit.Spades]: 12 },
      });
      expect(isSafeAutoMove(parseCard('Kc'), state)).toBe(true);
    });
  });

  describe('findSafeAutoMoves', () => {
    it('finds Aces in cascades', () => {
      const state = makeState({
        cascades: [
          [parseCard('Ac')],
          [parseCard('5h')],
          [], [], [], [], [], [],
        ],
      });
      const moves = findSafeAutoMoves(state);
      expect(moves.length).toBe(1);
      expect(moves[0]!.cards[0]!.rank).toBe(Rank.Ace);
    });

    it('finds Aces in free cells', () => {
      const state = makeState({
        freeCells: [parseCard('Ah'), null, null, null],
      });
      const moves = findSafeAutoMoves(state);
      expect(moves.length).toBe(1);
    });

    it('returns empty when no safe moves', () => {
      const state = makeState({
        cascades: [
          [parseCard('5h')],
          [parseCard('Kc')],
          [], [], [], [], [], [],
        ],
      });
      const moves = findSafeAutoMoves(state);
      expect(moves.length).toBe(0);
    });

    it('finds multiple safe moves', () => {
      const state = makeState({
        cascades: [
          [parseCard('Ac')],
          [parseCard('Ad')],
          [parseCard('Ah')],
          [parseCard('As')],
          [], [], [], [],
        ],
      });
      const moves = findSafeAutoMoves(state);
      expect(moves.length).toBe(4);
    });
  });

  describe('applyAllAutoMoves', () => {
    it('chains multiple auto-moves', () => {
      // Ac on cascade, 2c can chain after Ac
      const state = makeState({
        cascades: [
          [parseCard('2c'), parseCard('Ac')],
          [], [], [], [], [], [], [],
        ],
        foundations: { [Suit.Clubs]: 0, [Suit.Diamonds]: 0, [Suit.Hearts]: 0, [Suit.Spades]: 0 },
      });
      const result = applyAllAutoMoves(state);
      // Ac should be auto-moved, then 2c becomes top and is also safe
      expect(result.moves.length).toBe(2);
      expect(result.state.foundations[Suit.Clubs]).toBe(2);
    });

    it('returns unchanged state when no auto-moves', () => {
      const state = makeState({
        cascades: [[parseCard('5h')], [], [], [], [], [], [], []],
      });
      const result = applyAllAutoMoves(state);
      expect(result.moves.length).toBe(0);
      expect(result.state).toBe(state);
    });

    it('auto-moves all 4 Aces', () => {
      const state = makeState({
        cascades: [
          [parseCard('Ac')], [parseCard('Ad')],
          [parseCard('Ah')], [parseCard('As')],
          [], [], [], [],
        ],
      });
      const result = applyAllAutoMoves(state);
      expect(result.moves.length).toBe(4);
      expect(result.state.foundations[Suit.Clubs]).toBe(1);
      expect(result.state.foundations[Suit.Diamonds]).toBe(1);
      expect(result.state.foundations[Suit.Hearts]).toBe(1);
      expect(result.state.foundations[Suit.Spades]).toBe(1);
    });
  });
});
