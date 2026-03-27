import { describe, it, expect } from 'vitest';
import { maxMovableCards, canSuperMove } from '../../src/core/game/SuperMove';
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

describe('SuperMove', () => {
  describe('maxMovableCards', () => {
    it('4 free cells + 0 empty cascades = 5 cards', () => {
      const state = makeState({
        cascades: [
          [parseCard('Ks')], [parseCard('Kd')],
          [parseCard('Kh')], [parseCard('Kc')],
          [parseCard('Qs')], [parseCard('Qd')],
          [parseCard('Qh')], [parseCard('Qc')],
        ],
      });
      // All cascades non-empty, 4 free cells
      expect(maxMovableCards(state, 0, 1)).toBe(5); // (1+4)*2^0 = 5
    });

    it('0 free cells + 0 empty cascades = 1 card', () => {
      const state = makeState({
        cascades: [
          [parseCard('Ks')], [parseCard('Kd')],
          [parseCard('Kh')], [parseCard('Kc')],
          [parseCard('Qs')], [parseCard('Qd')],
          [parseCard('Qh')], [parseCard('Qc')],
        ],
        freeCells: [parseCard('Ac'), parseCard('Ad'), parseCard('Ah'), parseCard('As')],
      });
      expect(maxMovableCards(state, 0, 1)).toBe(1);
    });

    it('2 free cells + 1 empty cascade = 6 cards', () => {
      const state = makeState({
        cascades: [
          [parseCard('Ks')], [parseCard('Kd')],
          [parseCard('Kh')], [parseCard('Kc')],
          [parseCard('Qs')], [parseCard('Qd')],
          [],  // 1 empty (excluded from/to)
          [parseCard('Qc')],
        ],
        freeCells: [parseCard('Ac'), parseCard('Ad'), null, null],
      });
      expect(maxMovableCards(state, 0, 1)).toBe(6); // (1+2)*2^1 = 6
    });

    it('1 free cell + 2 empty cascades = 8 cards', () => {
      const state = makeState({
        cascades: [
          [parseCard('Ks')], [parseCard('Kd')],
          [parseCard('Kh')], [parseCard('Kc')],
          [parseCard('Qs')], [parseCard('Qd')],
          [],  // empty
          [],  // empty
        ],
        freeCells: [parseCard('Ac'), parseCard('Ad'), parseCard('Ah'), null],
      });
      // 1 free cell, 2 empty cascades (6 and 7, excluding from=0 and to=1)
      expect(maxMovableCards(state, 0, 1)).toBe(8); // (1+1)*2^2 = 8
    });

    it('0 free cells + 3 empty cascades = 8 cards', () => {
      const state = makeState({
        cascades: [
          [parseCard('Ks')], [parseCard('Kd')],
          [parseCard('Kh')], [parseCard('Kc')],
          [parseCard('Qs')],
          [], [], [],  // 3 empty
        ],
        freeCells: [parseCard('Ac'), parseCard('Ad'), parseCard('Ah'), parseCard('As')],
      });
      expect(maxMovableCards(state, 0, 1)).toBe(8); // (1+0)*2^3 = 8
    });

    it('excludes source and target from empty cascade count', () => {
      const state = makeState({
        cascades: [
          [parseCard('5h')], // source
          [],                 // target (empty)
          [], [], [], [], [], [],
        ],
      });
      // 4 free cells, 6 empty cascades (excluding 0 and 1)
      expect(maxMovableCards(state, 0, 1)).toBe((1 + 4) * Math.pow(2, 6));
    });

    it('4 free cells + 6 empty cascades = 320 cards', () => {
      const state = makeState({
        cascades: [
          [parseCard('Ks')],
          [parseCard('Kd')],
          [], [], [], [], [], [],
        ],
      });
      expect(maxMovableCards(state, 0, 1)).toBe(5 * 64); // (1+4)*2^6 = 320
    });
  });

  describe('canSuperMove', () => {
    it('returns true when numCards within limit', () => {
      const state = makeState(); // 4 free cells, 8 empty cascades
      expect(canSuperMove(state, 0, 1, 5)).toBe(true);
    });

    it('returns false when numCards exceeds limit', () => {
      const state = makeState({
        cascades: [
          [parseCard('Ks')], [parseCard('Kd')],
          [parseCard('Kh')], [parseCard('Kc')],
          [parseCard('Qs')], [parseCard('Qd')],
          [parseCard('Qh')], [parseCard('Qc')],
        ],
        freeCells: [parseCard('Ac'), parseCard('Ad'), parseCard('Ah'), parseCard('As')],
      });
      // max = 1, requesting 2
      expect(canSuperMove(state, 0, 1, 2)).toBe(false);
    });

    it('returns true for single card move even with no free cells', () => {
      const state = makeState({
        cascades: [
          [parseCard('Ks')], [parseCard('Kd')],
          [parseCard('Kh')], [parseCard('Kc')],
          [parseCard('Qs')], [parseCard('Qd')],
          [parseCard('Qh')], [parseCard('Qc')],
        ],
        freeCells: [parseCard('Ac'), parseCard('Ad'), parseCard('Ah'), parseCard('As')],
      });
      expect(canSuperMove(state, 0, 1, 1)).toBe(true);
    });
  });
});
