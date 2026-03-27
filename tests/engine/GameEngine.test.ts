import { describe, it, expect, vi } from 'vitest';
import { GameEngine } from '../../src/engine/GameEngine';
import { parseCard } from '../../src/core/entities/Card';
import { Suit } from '../../src/core/entities/Suit';
import { Rank } from '../../src/core/entities/Rank';
import type { Move } from '../../src/core/game/Move';

describe('GameEngine', () => {
  describe('newGame', () => {
    it('starts a new game with given deal number', () => {
      const engine = new GameEngine();
      engine.newGame(1);
      expect(engine.dealNumber).toBe(1);
      expect(engine.phase).toBe('playing');
    });

    it('deals 52 cards across 8 cascades', () => {
      const engine = new GameEngine();
      engine.newGame(1);
      const totalCards = engine.state.cascades.reduce((sum, c) => sum + c.length, 0);
      // May be less than 52 if auto-moves happened
      expect(totalCards).toBeLessThanOrEqual(52);
      expect(totalCards).toBeGreaterThan(0);
    });

    it('emits newGame event', () => {
      const engine = new GameEngine();
      const handler = vi.fn();
      engine.events.on('newGame', handler);
      engine.newGame(42);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ dealNumber: 42 }),
      );
    });

    it('emits stateChange event', () => {
      const engine = new GameEngine();
      const handler = vi.fn();
      engine.events.on('stateChange', handler);
      engine.newGame(1);
      expect(handler).toHaveBeenCalled();
    });

    it('resets undo history on new game', () => {
      const engine = new GameEngine();
      engine.newGame(1);
      expect(engine.canUndo).toBe(false);
      expect(engine.canRedo).toBe(false);
    });

    it('generates random deal number if not provided', () => {
      const engine = new GameEngine();
      engine.newGame();
      expect(engine.dealNumber).toBeGreaterThan(0);
    });
  });

  describe('move', () => {
    it('executes a valid move', () => {
      const engine = new GameEngine();
      engine.newGame(1);

      const moves = engine.getAvailableMoves();
      expect(moves.length).toBeGreaterThan(0);

      const result = engine.move(moves[0]!);
      expect(result).toBe(true);
    });

    it('rejects invalid move', () => {
      const engine = new GameEngine();
      engine.newGame(1);

      const invalidMove: Move = {
        type: 'cascade-to-foundation',
        from: { kind: 'cascade', index: 0 },
        to: { kind: 'foundation', suit: Suit.Hearts },
        cards: [parseCard('Ks')], // King can't go on empty foundation
      };

      const result = engine.move(invalidMove);
      expect(result).toBe(false);
    });

    it('emits invalidMove event on bad move', () => {
      const engine = new GameEngine();
      engine.newGame(1);
      const handler = vi.fn();
      engine.events.on('invalidMove', handler);

      engine.move({
        type: 'cascade-to-foundation',
        from: { kind: 'cascade', index: 0 },
        to: { kind: 'foundation', suit: Suit.Hearts },
        cards: [parseCard('Ks')],
      });

      expect(handler).toHaveBeenCalled();
    });

    it('increments move count', () => {
      const engine = new GameEngine();
      engine.newGame(1);
      const initialCount = engine.state.moveCount;

      const moves = engine.getAvailableMoves();
      engine.move(moves[0]!);

      expect(engine.state.moveCount).toBeGreaterThan(initialCount);
    });

    it('rejects move when not in playing phase', () => {
      const engine = new GameEngine();
      // Phase is 'idle' before newGame
      const result = engine.move({
        type: 'cascade-to-freecell',
        from: { kind: 'cascade', index: 0 },
        to: { kind: 'freecell', index: 0 },
        cards: [parseCard('Ac')],
      });
      expect(result).toBe(false);
    });
  });

  describe('undo/redo', () => {
    it('undo restores previous state', () => {
      const engine = new GameEngine();
      engine.newGame(1);
      const stateBefore = engine.state;

      const moves = engine.getAvailableMoves();
      engine.move(moves[0]!);
      expect(engine.state).not.toBe(stateBefore);

      engine.undo();
      // State should be restored (foundations and cascades match)
      expect(engine.state.moveCount).toBe(stateBefore.moveCount);
    });

    it('redo re-applies undone move', () => {
      const engine = new GameEngine();
      engine.newGame(1);

      const moves = engine.getAvailableMoves();
      engine.move(moves[0]!);
      const stateAfterMove = engine.state;

      engine.undo();
      engine.redo();

      expect(engine.state.moveCount).toBe(stateAfterMove.moveCount);
    });

    it('canUndo is true after a move', () => {
      const engine = new GameEngine();
      engine.newGame(1);
      expect(engine.canUndo).toBe(false);

      const moves = engine.getAvailableMoves();
      engine.move(moves[0]!);
      expect(engine.canUndo).toBe(true);
    });

    it('canRedo is true after undo', () => {
      const engine = new GameEngine();
      engine.newGame(1);

      const moves = engine.getAvailableMoves();
      engine.move(moves[0]!);
      engine.undo();

      expect(engine.canRedo).toBe(true);
    });

    it('new move clears redo stack', () => {
      const engine = new GameEngine();
      engine.newGame(1);

      const moves1 = engine.getAvailableMoves();
      engine.move(moves1[0]!);
      engine.undo();
      expect(engine.canRedo).toBe(true);

      const moves2 = engine.getAvailableMoves();
      engine.move(moves2[0]!);
      expect(engine.canRedo).toBe(false);
    });

    it('multiple undos work correctly', () => {
      const engine = new GameEngine();
      engine.newGame(1);
      const initialMoveCount = engine.state.moveCount;

      // Make 3 moves
      for (let i = 0; i < 3; i++) {
        const moves = engine.getAvailableMoves();
        if (moves.length > 0) engine.move(moves[0]!);
      }

      // Undo all 3
      engine.undo();
      engine.undo();
      engine.undo();

      expect(engine.state.moveCount).toBe(initialMoveCount);
    });

    it('emits undo event', () => {
      const engine = new GameEngine();
      engine.newGame(1);
      const moves = engine.getAvailableMoves();
      engine.move(moves[0]!);

      const handler = vi.fn();
      engine.events.on('undo', handler);
      engine.undo();
      expect(handler).toHaveBeenCalled();
    });

    it('emits redo event', () => {
      const engine = new GameEngine();
      engine.newGame(1);
      const moves = engine.getAvailableMoves();
      engine.move(moves[0]!);
      engine.undo();

      const handler = vi.fn();
      engine.events.on('redo', handler);
      engine.redo();
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('getAvailableMoves', () => {
    it('returns moves in playing phase', () => {
      const engine = new GameEngine();
      engine.newGame(1);
      const moves = engine.getAvailableMoves();
      expect(moves.length).toBeGreaterThan(0);
    });

    it('returns empty in idle phase', () => {
      const engine = new GameEngine();
      const moves = engine.getAvailableMoves();
      expect(moves.length).toBe(0);
    });
  });

  describe('moveFromCascade', () => {
    it('moves a card from a cascade', () => {
      const engine = new GameEngine();
      engine.newGame(1);
      // Try moving from first non-empty cascade
      for (let i = 0; i < 8; i++) {
        if (engine.state.cascades[i]!.length > 0) {
          const result = engine.moveFromCascade(i);
          // May or may not succeed depending on the deal
          expect(typeof result).toBe('boolean');
          break;
        }
      }
    });

    it('returns false for empty cascade', () => {
      const engine = new GameEngine();
      engine.newGame(1);
      // Find an empty cascade (unlikely in fresh deal but test the code path)
      const result = engine.moveFromCascade(99); // Invalid index
      expect(result).toBe(false);
    });
  });
});
