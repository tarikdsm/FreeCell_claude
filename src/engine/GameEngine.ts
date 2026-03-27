import type { GameState } from '../core/game/GameState';
import { createDealtState } from '../core/game/GameState';
import type { Move } from '../core/game/Move';
import { isValidMove, availableMoves } from '../core/game/MoveValidator';
import { applyMove } from '../core/game/MoveExecutor';
import { generateDeal } from '../core/game/DealGenerator';
import { applyAllAutoMoves } from '../core/game/AutoMove';
import { isGameWon, isAutoCompletable } from '../core/game/WinDetector';
import { UndoManager } from './UndoManager';
import { EventBus } from '../utils/EventBus';

/**
 * Game phases as a state machine.
 */
export type GamePhase = 'idle' | 'dealing' | 'playing' | 'won';

/**
 * Events emitted by the GameEngine.
 */
export type GameEvents = {
  stateChange: { readonly state: GameState; readonly phase: GamePhase };
  move: { readonly move: Move; readonly state: GameState };
  autoMove: { readonly moves: readonly Move[]; readonly state: GameState };
  win: { readonly state: GameState; readonly moveCount: number };
  invalidMove: { readonly reason: string };
  undo: { readonly state: GameState };
  redo: { readonly state: GameState };
  newGame: { readonly dealNumber: number; readonly state: GameState };
};

/**
 * GameEngine orchestrates the FreeCell game, managing state transitions,
 * move validation, undo/redo, and auto-moves.
 *
 * State machine: idle → dealing → playing → won → idle
 */
export class GameEngine {
  private _state: GameState;
  private _phase: GamePhase = 'idle';
  private _dealNumber = 0;
  private readonly undoManager = new UndoManager();
  readonly events = new EventBus<GameEvents>();

  constructor() {
    this._state = createDealtState(Array.from({ length: 8 }, () => []));
  }

  /** Current game state (immutable) */
  get state(): GameState {
    return this._state;
  }

  /** Current game phase */
  get phase(): GamePhase {
    return this._phase;
  }

  /** Current deal number */
  get dealNumber(): number {
    return this._dealNumber;
  }

  /** Whether undo is available */
  get canUndo(): boolean {
    return this.undoManager.canUndo;
  }

  /** Whether redo is available */
  get canRedo(): boolean {
    return this.undoManager.canRedo;
  }

  /**
   * Starts a new game with the given deal number.
   * If no deal number is provided, generates a random one.
   */
  newGame(dealNumber?: number): void {
    this._dealNumber = dealNumber ?? Math.floor(Math.random() * 1000000) + 1;
    this._phase = 'dealing';

    const cascades = generateDeal(this._dealNumber);
    this._state = createDealtState(cascades);
    this.undoManager.clear();

    this._phase = 'playing';

    // Apply initial auto-moves
    const { state: autoState, moves: autoMoves } = applyAllAutoMoves(this._state);
    if (autoMoves.length > 0) {
      this._state = autoState;
      this.events.emit('autoMove', { moves: autoMoves, state: this._state });
    }

    this.events.emit('newGame', { dealNumber: this._dealNumber, state: this._state });
    this.events.emit('stateChange', { state: this._state, phase: this._phase });

    this.checkWin();
  }

  /**
   * Executes a move.
   *
   * @param move - The move to execute
   * @returns true if the move was executed successfully
   */
  move(move: Move): boolean {
    if (this._phase !== 'playing') {
      this.events.emit('invalidMove', { reason: 'Game is not in playing phase' });
      return false;
    }

    if (!isValidMove(this._state, move)) {
      this.events.emit('invalidMove', { reason: 'Invalid move' });
      return false;
    }

    const stateBefore = this._state;
    this._state = applyMove(this._state, move);
    this.events.emit('move', { move, state: this._state });

    // Apply auto-moves after player's move
    const { state: autoState, moves: autoMoves } = applyAllAutoMoves(this._state);
    if (autoMoves.length > 0) {
      this._state = autoState;
      this.events.emit('autoMove', { moves: autoMoves, state: this._state });
    }

    // Record for undo (stores state before player's move + any auto-moves)
    this.undoManager.record(stateBefore, move, autoMoves);

    this.events.emit('stateChange', { state: this._state, phase: this._phase });
    this.checkWin();

    return true;
  }

  /**
   * Attempts to move a card from a cascade to the best available target.
   * Tries: foundation → cascade → free cell.
   */
  moveFromCascade(cascadeIndex: number): boolean {
    const cascade = this._state.cascades[cascadeIndex];
    if (!cascade || cascade.length === 0) return false;

    const moves = availableMoves(this._state);

    // Priority: foundation > non-empty cascade > free cell
    const relevantMoves = moves.filter(
      (m) => m.from.kind === 'cascade' && m.from.index === cascadeIndex,
    );

    // Try foundation first
    const foundationMove = relevantMoves.find((m) => m.to.kind === 'foundation');
    if (foundationMove) return this.move(foundationMove);

    // Try non-empty cascade
    const cascadeMove = relevantMoves.find(
      (m) => m.to.kind === 'cascade' && this._state.cascades[m.to.index]!.length > 0,
    );
    if (cascadeMove) return this.move(cascadeMove);

    // Try empty cascade
    const emptyCascadeMove = relevantMoves.find(
      (m) => m.to.kind === 'cascade' && this._state.cascades[m.to.index]!.length === 0,
    );
    if (emptyCascadeMove) return this.move(emptyCascadeMove);

    // Try free cell
    const freeCellMove = relevantMoves.find((m) => m.to.kind === 'freecell');
    if (freeCellMove) return this.move(freeCellMove);

    return false;
  }

  /**
   * Attempts to move a card from a free cell to the best available target.
   */
  moveFromFreeCell(freeCellIndex: number): boolean {
    const card = this._state.freeCells[freeCellIndex];
    if (!card) return false;

    const moves = availableMoves(this._state);
    const relevantMoves = moves.filter(
      (m) => m.from.kind === 'freecell' && m.from.index === freeCellIndex,
    );

    // Try foundation first
    const foundationMove = relevantMoves.find((m) => m.to.kind === 'foundation');
    if (foundationMove) return this.move(foundationMove);

    // Try non-empty cascade
    const cascadeMove = relevantMoves.find(
      (m) => m.to.kind === 'cascade' && this._state.cascades[m.to.index]!.length > 0,
    );
    if (cascadeMove) return this.move(cascadeMove);

    return false;
  }

  /**
   * Undoes the last move, restoring the previous state.
   */
  undo(): boolean {
    if (this._phase !== 'playing' && this._phase !== 'won') return false;

    const result = this.undoManager.undo();
    if (!result) return false;

    this._state = result.state;
    this._phase = 'playing';

    this.events.emit('undo', { state: this._state });
    this.events.emit('stateChange', { state: this._state, phase: this._phase });
    return true;
  }

  /**
   * Redoes the last undone move.
   */
  redo(): boolean {
    if (this._phase !== 'playing') return false;

    const result = this.undoManager.redo();
    if (!result) return false;

    // Re-apply the move
    this._state = applyMove(this._state, result.move);

    // Re-apply auto-moves
    for (const autoMove of result.autoMoves) {
      this._state = applyMove(this._state, autoMove);
    }

    this.events.emit('redo', { state: this._state });
    this.events.emit('stateChange', { state: this._state, phase: this._phase });
    this.checkWin();
    return true;
  }

  /**
   * Auto-completes the game if possible.
   * Moves all remaining cards to foundations in order.
   *
   * @returns true if auto-complete was successful
   */
  autoComplete(): boolean {
    if (this._phase !== 'playing') return false;
    if (!isAutoCompletable(this._state)) return false;

    // Keep moving cards to foundations until the game is won
    let safety = 200; // Prevent infinite loops
    while (!isGameWon(this._state) && safety-- > 0) {
      const moves = availableMoves(this._state);
      const foundationMove = moves.find((m) => m.to.kind === 'foundation');
      if (!foundationMove) break;

      const stateBefore = this._state;
      this._state = applyMove(this._state, foundationMove);
      this.undoManager.record(stateBefore, foundationMove);
      this.events.emit('move', { move: foundationMove, state: this._state });
    }

    this.events.emit('stateChange', { state: this._state, phase: this._phase });
    this.checkWin();
    return isGameWon(this._state);
  }

  /**
   * Returns all currently valid moves.
   */
  getAvailableMoves(): readonly Move[] {
    if (this._phase !== 'playing') return [];
    return availableMoves(this._state);
  }

  private checkWin(): void {
    if (isGameWon(this._state)) {
      this._phase = 'won';
      this.events.emit('win', { state: this._state, moveCount: this._state.moveCount });
      this.events.emit('stateChange', { state: this._state, phase: this._phase });
    }
  }
}
