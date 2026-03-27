import { describe, it, expect } from 'vitest';
import { UndoManager } from '../../src/engine/UndoManager';
import { parseCard } from '../../src/core/entities/Card';
import { Suit } from '../../src/core/entities/Suit';
import type { GameState } from '../../src/core/game/GameState';
import type { Move } from '../../src/core/game/Move';

function makeState(moveCount: number = 0): GameState {
  return {
    cascades: Array.from({ length: 8 }, () => []),
    freeCells: [null, null, null, null],
    foundations: { [Suit.Clubs]: 0, [Suit.Diamonds]: 0, [Suit.Hearts]: 0, [Suit.Spades]: 0 },
    moveCount,
  } as GameState;
}

const sampleMove: Move = {
  type: 'cascade-to-freecell',
  from: { kind: 'cascade', index: 0 },
  to: { kind: 'freecell', index: 0 },
  cards: [parseCard('Ac')],
};

describe('UndoManager', () => {
  it('starts with empty history', () => {
    const um = new UndoManager();
    expect(um.canUndo).toBe(false);
    expect(um.canRedo).toBe(false);
    expect(um.undoCount).toBe(0);
    expect(um.redoCount).toBe(0);
  });

  it('records a move', () => {
    const um = new UndoManager();
    um.record(makeState(0), sampleMove);
    expect(um.canUndo).toBe(true);
    expect(um.undoCount).toBe(1);
  });

  it('undo returns previous state', () => {
    const um = new UndoManager();
    const state0 = makeState(0);
    um.record(state0, sampleMove);

    const result = um.undo();
    expect(result).not.toBeNull();
    expect(result!.state.moveCount).toBe(0);
    expect(result!.move).toBe(sampleMove);
  });

  it('undo makes redo available', () => {
    const um = new UndoManager();
    um.record(makeState(0), sampleMove);
    um.undo();
    expect(um.canRedo).toBe(true);
    expect(um.redoCount).toBe(1);
  });

  it('redo returns the move to re-apply', () => {
    const um = new UndoManager();
    um.record(makeState(0), sampleMove);
    um.undo();

    const result = um.redo();
    expect(result).not.toBeNull();
    expect(result!.move).toBe(sampleMove);
  });

  it('new move clears redo stack', () => {
    const um = new UndoManager();
    um.record(makeState(0), sampleMove);
    um.undo();
    expect(um.canRedo).toBe(true);

    um.record(makeState(1), sampleMove);
    expect(um.canRedo).toBe(false);
  });

  it('multiple undos work in order', () => {
    const um = new UndoManager();
    um.record(makeState(0), sampleMove);
    um.record(makeState(1), sampleMove);
    um.record(makeState(2), sampleMove);

    const r3 = um.undo();
    expect(r3!.state.moveCount).toBe(2);
    const r2 = um.undo();
    expect(r2!.state.moveCount).toBe(1);
    const r1 = um.undo();
    expect(r1!.state.moveCount).toBe(0);
    expect(um.undo()).toBeNull();
  });

  it('undo then redo then undo is consistent', () => {
    const um = new UndoManager();
    um.record(makeState(0), sampleMove);

    um.undo();
    um.redo();
    expect(um.canUndo).toBe(true);
    expect(um.canRedo).toBe(false);

    um.undo();
    expect(um.canUndo).toBe(false);
    expect(um.canRedo).toBe(true);
  });

  it('clear removes all history', () => {
    const um = new UndoManager();
    um.record(makeState(0), sampleMove);
    um.record(makeState(1), sampleMove);
    um.undo();

    um.clear();
    expect(um.canUndo).toBe(false);
    expect(um.canRedo).toBe(false);
    expect(um.undoCount).toBe(0);
    expect(um.redoCount).toBe(0);
  });

  it('records auto-moves with the move', () => {
    const um = new UndoManager();
    const autoMove: Move = {
      type: 'cascade-to-foundation',
      from: { kind: 'cascade', index: 1 },
      to: { kind: 'foundation', suit: Suit.Hearts },
      cards: [parseCard('Ah')],
    };
    um.record(makeState(0), sampleMove, [autoMove]);

    const result = um.undo();
    expect(result!.autoMoves.length).toBe(1);
    expect(result!.autoMoves[0]).toBe(autoMove);
  });

  it('redo preserves auto-moves', () => {
    const um = new UndoManager();
    const autoMove: Move = {
      type: 'cascade-to-foundation',
      from: { kind: 'cascade', index: 1 },
      to: { kind: 'foundation', suit: Suit.Hearts },
      cards: [parseCard('Ah')],
    };
    um.record(makeState(0), sampleMove, [autoMove]);
    um.undo();

    const result = um.redo();
    expect(result!.autoMoves.length).toBe(1);
  });
});
