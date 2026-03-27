import { describe, it, expect } from 'vitest';
import { GameEngine } from '../../src/engine/GameEngine';
import { generateDeal } from '../../src/core/game/DealGenerator';
import { createDealtState, isWon } from '../../src/core/game/GameState';
import { availableMoves } from '../../src/core/game/MoveValidator';
import { applyMove } from '../../src/core/game/MoveExecutor';
import { isGameWon, isAutoCompletable } from '../../src/core/game/WinDetector';
import { parseCard } from '../../src/core/entities/Card';
import { Suit } from '../../src/core/entities/Suit';
import { Rank } from '../../src/core/entities/Rank';
import type { GameState } from '../../src/core/game/GameState';
import type { Move } from '../../src/core/game/Move';

describe('Full Game Integration', () => {
  it('can start a new game and make moves', () => {
    const engine = new GameEngine();
    engine.newGame(1);

    expect(engine.phase).toBe('playing');
    const moves = engine.getAvailableMoves();
    expect(moves.length).toBeGreaterThan(0);

    const result = engine.move(moves[0]!);
    expect(result).toBe(true);
  });

  it('can undo and redo moves in a game', () => {
    const engine = new GameEngine();
    engine.newGame(1);

    // Make a few moves
    const move1 = engine.getAvailableMoves()[0]!;
    engine.move(move1);
    const stateAfter1 = engine.state;

    const move2 = engine.getAvailableMoves()[0]!;
    engine.move(move2);

    // Undo second move
    engine.undo();
    // State should match after first move
    expect(engine.state.moveCount).toBe(stateAfter1.moveCount);

    // Redo
    engine.redo();
    expect(engine.state.moveCount).toBeGreaterThan(stateAfter1.moveCount);
  });

  it('new game resets everything', () => {
    const engine = new GameEngine();
    engine.newGame(1);

    // Make some moves
    const moves = engine.getAvailableMoves();
    engine.move(moves[0]!);
    engine.move(engine.getAvailableMoves()[0]!);

    // Start new game
    engine.newGame(42);
    expect(engine.dealNumber).toBe(42);
    expect(engine.canUndo).toBe(false);
    expect(engine.canRedo).toBe(false);
    expect(engine.phase).toBe('playing');
  });

  it('multiple games can be played sequentially', () => {
    const engine = new GameEngine();

    for (let deal = 1; deal <= 5; deal++) {
      engine.newGame(deal);
      expect(engine.phase).toBe('playing');
      expect(engine.dealNumber).toBe(deal);

      const moves = engine.getAvailableMoves();
      expect(moves.length).toBeGreaterThan(0);
      engine.move(moves[0]!);
    }
  });

  it('deal generation is consistent across engine restarts', () => {
    const engine1 = new GameEngine();
    engine1.newGame(12345);

    const engine2 = new GameEngine();
    engine2.newGame(12345);

    // Same deal should produce same initial state
    // (auto-moves may have been applied, so check cascade structure)
    for (let i = 0; i < 8; i++) {
      expect(engine1.state.cascades[i]!.length).toBe(engine2.state.cascades[i]!.length);
    }
  });

  it('game state is immutable after moves', () => {
    const engine = new GameEngine();
    engine.newGame(1);

    const state1 = engine.state;
    const cascade0Length = state1.cascades[0]!.length;

    // Make a move that affects cascade 0
    const moves = engine.getAvailableMoves().filter(
      (m) => m.from.kind === 'cascade' && m.from.index === 0,
    );
    if (moves.length > 0) {
      engine.move(moves[0]!);
      // Original state reference should be unchanged
      expect(state1.cascades[0]!.length).toBe(cascade0Length);
    }
  });

  it('can play through many moves without errors', () => {
    const engine = new GameEngine();
    engine.newGame(100);

    let movesPlayed = 0;
    const maxMoves = 50;

    while (movesPlayed < maxMoves && engine.phase === 'playing') {
      const moves = engine.getAvailableMoves();
      if (moves.length === 0) break;

      // Pick a "smart" move: prefer foundation > cascade > freecell
      const foundationMove = moves.find((m) => m.to.kind === 'foundation');
      const cascadeMove = moves.find(
        (m) => m.to.kind === 'cascade' && m.type === 'cascade-to-cascade',
      );
      const anyMove = foundationMove ?? cascadeMove ?? moves[0]!;

      const result = engine.move(anyMove);
      if (result) {
        movesPlayed++;
      }
      // Move may fail if auto-moves from previous turn changed state
    }

    expect(movesPlayed).toBeGreaterThan(0);
  });

  it('auto-complete works on a pre-arranged winning position', () => {
    const engine = new GameEngine();
    engine.newGame(1);

    // We can't easily force a win, but we can test auto-complete on a
    // near-complete state by using the raw game state functions
    const state: GameState = {
      cascades: [
        [parseCard('Kc')],
        [parseCard('Kd')],
        [parseCard('Kh')],
        [parseCard('Ks')],
        [], [], [], [],
      ],
      freeCells: [null, null, null, null],
      foundations: {
        [Suit.Clubs]: 12,
        [Suit.Diamonds]: 12,
        [Suit.Hearts]: 12,
        [Suit.Spades]: 12,
      },
      moveCount: 50,
    } as GameState;

    expect(isAutoCompletable(state)).toBe(true);

    // Apply moves manually to simulate auto-complete
    const moves = availableMoves(state);
    const foundationMoves = moves.filter((m) => m.to.kind === 'foundation');
    expect(foundationMoves.length).toBe(4); // All 4 Kings can go to foundation

    let current = state;
    for (const move of foundationMoves) {
      current = applyMove(current, move);
    }
    expect(isGameWon(current)).toBe(true);
  });

  it('event system works throughout a game lifecycle', () => {
    const engine = new GameEngine();
    const events: string[] = [];

    engine.events.on('newGame', () => events.push('newGame'));
    engine.events.on('stateChange', () => events.push('stateChange'));
    engine.events.on('move', () => events.push('move'));
    engine.events.on('undo', () => events.push('undo'));
    engine.events.on('redo', () => events.push('redo'));

    engine.newGame(1);
    expect(events).toContain('newGame');
    expect(events).toContain('stateChange');

    const moves = engine.getAvailableMoves();
    engine.move(moves[0]!);
    expect(events).toContain('move');

    engine.undo();
    expect(events).toContain('undo');

    engine.redo();
    expect(events).toContain('redo');
  });

  it('all deals 1-10 generate valid initial states', () => {
    for (let deal = 1; deal <= 10; deal++) {
      const cascades = generateDeal(deal);
      const state = createDealtState(cascades);

      // Should have 52 total cards
      const totalCards = state.cascades.reduce((sum, c) => sum + c.length, 0);
      expect(totalCards).toBe(52);

      // Should have available moves
      const moves = availableMoves(state);
      expect(moves.length).toBeGreaterThan(0);
    }
  });

  it('moveFromCascade convenience method works', () => {
    const engine = new GameEngine();
    engine.newGame(1);

    // Try each cascade until one works
    let moved = false;
    for (let i = 0; i < 8; i++) {
      if (engine.moveFromCascade(i)) {
        moved = true;
        break;
      }
    }
    expect(moved).toBe(true);
  });
});
