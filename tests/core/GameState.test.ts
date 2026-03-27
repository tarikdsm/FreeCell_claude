import { describe, it, expect } from 'vitest';
import {
  createEmptyState, createDealtState,
  emptyFreeCellCount, emptyCascadeCount, firstEmptyFreeCell,
  isWon, foundationCardCount,
} from '../../src/core/game/GameState';
import { parseCard } from '../../src/core/entities/Card';
import { Suit } from '../../src/core/entities/Suit';
import { applyMove } from '../../src/core/game/MoveExecutor';
import type { Move } from '../../src/core/game/Move';
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

describe('GameState', () => {
  describe('createEmptyState', () => {
    it('creates state with 8 empty cascades', () => {
      const state = createEmptyState();
      expect(state.cascades.length).toBe(8);
      state.cascades.forEach((c) => expect(c.length).toBe(0));
    });

    it('creates state with 4 null free cells', () => {
      const state = createEmptyState();
      expect(state.freeCells).toEqual([null, null, null, null]);
    });

    it('creates state with empty foundations', () => {
      const state = createEmptyState();
      expect(state.foundations[Suit.Clubs]).toBe(0);
      expect(state.foundations[Suit.Diamonds]).toBe(0);
      expect(state.foundations[Suit.Hearts]).toBe(0);
      expect(state.foundations[Suit.Spades]).toBe(0);
    });

    it('starts with moveCount 0', () => {
      const state = createEmptyState();
      expect(state.moveCount).toBe(0);
    });
  });

  describe('createDealtState', () => {
    it('creates state with given cascades', () => {
      const cascades = [
        [parseCard('Ks')],
        [parseCard('Qh')],
        [], [], [], [], [], [],
      ];
      const state = createDealtState(cascades);
      expect(state.cascades[0]![0]!.id).toBe(parseCard('Ks').id);
      expect(state.cascades[1]![0]!.id).toBe(parseCard('Qh').id);
    });
  });

  describe('emptyFreeCellCount', () => {
    it('returns 4 when all free cells empty', () => {
      expect(emptyFreeCellCount(createEmptyState())).toBe(4);
    });

    it('returns 2 when 2 free cells occupied', () => {
      const state = makeState({
        freeCells: [parseCard('Ac'), null, parseCard('Ad'), null],
      });
      expect(emptyFreeCellCount(state)).toBe(2);
    });

    it('returns 0 when all occupied', () => {
      const state = makeState({
        freeCells: [parseCard('Ac'), parseCard('Ad'), parseCard('Ah'), parseCard('As')],
      });
      expect(emptyFreeCellCount(state)).toBe(0);
    });
  });

  describe('emptyCascadeCount', () => {
    it('returns 8 when all empty', () => {
      expect(emptyCascadeCount(createEmptyState())).toBe(8);
    });

    it('returns correct count', () => {
      const state = makeState({
        cascades: [
          [parseCard('Ks')], [], [parseCard('Qh')],
          [], [], [], [], [],
        ],
      });
      expect(emptyCascadeCount(state)).toBe(6);
    });
  });

  describe('firstEmptyFreeCell', () => {
    it('returns 0 when all empty', () => {
      expect(firstEmptyFreeCell(createEmptyState())).toBe(0);
    });

    it('returns first null index', () => {
      const state = makeState({
        freeCells: [parseCard('Ac'), null, parseCard('Ad'), null],
      });
      expect(firstEmptyFreeCell(state)).toBe(1);
    });

    it('returns -1 when all occupied', () => {
      const state = makeState({
        freeCells: [parseCard('Ac'), parseCard('Ad'), parseCard('Ah'), parseCard('As')],
      });
      expect(firstEmptyFreeCell(state)).toBe(-1);
    });
  });

  describe('isWon', () => {
    it('returns false for empty state', () => {
      expect(isWon(createEmptyState())).toBe(false);
    });

    it('returns true when all foundations at 13', () => {
      const state = makeState({
        foundations: { [Suit.Clubs]: 13, [Suit.Diamonds]: 13, [Suit.Hearts]: 13, [Suit.Spades]: 13 },
      });
      expect(isWon(state)).toBe(true);
    });

    it('returns false when one foundation incomplete', () => {
      const state = makeState({
        foundations: { [Suit.Clubs]: 13, [Suit.Diamonds]: 13, [Suit.Hearts]: 12, [Suit.Spades]: 13 },
      });
      expect(isWon(state)).toBe(false);
    });
  });

  describe('foundationCardCount', () => {
    it('returns 0 for empty state', () => {
      expect(foundationCardCount(createEmptyState())).toBe(0);
    });

    it('returns sum of all foundations', () => {
      const state = makeState({
        foundations: { [Suit.Clubs]: 5, [Suit.Diamonds]: 3, [Suit.Hearts]: 7, [Suit.Spades]: 1 },
      });
      expect(foundationCardCount(state)).toBe(16);
    });

    it('returns 52 for won game', () => {
      const state = makeState({
        foundations: { [Suit.Clubs]: 13, [Suit.Diamonds]: 13, [Suit.Hearts]: 13, [Suit.Spades]: 13 },
      });
      expect(foundationCardCount(state)).toBe(52);
    });
  });

  describe('immutability', () => {
    it('applyMove returns a new state object', () => {
      const state = makeState({
        cascades: [[parseCard('Ah')], [], [], [], [], [], [], []],
      });
      const move: Move = {
        type: 'cascade-to-foundation',
        from: { kind: 'cascade', index: 0 },
        to: { kind: 'foundation', suit: Suit.Hearts },
        cards: [parseCard('Ah')],
      };
      const newState = applyMove(state, move);
      expect(newState).not.toBe(state);
      expect(newState.foundations[Suit.Hearts]).toBe(1);
      expect(state.foundations[Suit.Hearts]).toBe(0); // Original unchanged
    });

    it('move count increments in new state only', () => {
      const state = makeState({
        cascades: [[parseCard('Ah')], [], [], [], [], [], [], []],
      });
      const move: Move = {
        type: 'cascade-to-foundation',
        from: { kind: 'cascade', index: 0 },
        to: { kind: 'foundation', suit: Suit.Hearts },
        cards: [parseCard('Ah')],
      };
      const newState = applyMove(state, move);
      expect(state.moveCount).toBe(0);
      expect(newState.moveCount).toBe(1);
    });
  });
});
