import type { GameState } from '../core/game/GameState';
import type { Move } from '../core/game/Move';

/**
 * Entry in the undo/redo history.
 * Stores the state BEFORE the move was applied, along with the move itself.
 */
interface HistoryEntry {
  readonly stateBefore: GameState;
  readonly move: Move;
  /** Auto-moves that were applied after the player's move */
  readonly autoMoves: readonly Move[];
}

/**
 * UndoManager implements the Command pattern for undo/redo support.
 *
 * Each entry stores the state before a move, enabling unlimited undo.
 * Redo stack is cleared when a new move is made (branching history).
 */
export class UndoManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];

  /**
   * Records a move for undo support.
   * Clears the redo stack (new move branches history).
   *
   * @param stateBefore - Game state before the move
   * @param move - The player's move
   * @param autoMoves - Auto-moves applied after the player's move
   */
  record(stateBefore: GameState, move: Move, autoMoves: readonly Move[] = []): void {
    this.undoStack.push({ stateBefore, move, autoMoves });
    this.redoStack = []; // New move invalidates redo history
  }

  /**
   * Undoes the last move, returning the state before it.
   * @returns The previous state and the move that was undone, or null if nothing to undo
   */
  undo(): { readonly state: GameState; readonly move: Move; readonly autoMoves: readonly Move[] } | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;

    this.redoStack.push(entry);
    return { state: entry.stateBefore, move: entry.move, autoMoves: entry.autoMoves };
  }

  /**
   * Redoes the last undone move.
   * @returns The move to redo, or null if nothing to redo
   */
  redo(): { readonly move: Move; readonly autoMoves: readonly Move[] } | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;

    this.undoStack.push(entry);
    return { move: entry.move, autoMoves: entry.autoMoves };
  }

  /** Whether there are moves to undo */
  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** Whether there are moves to redo */
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Number of moves that can be undone */
  get undoCount(): number {
    return this.undoStack.length;
  }

  /** Number of moves that can be redone */
  get redoCount(): number {
    return this.redoStack.length;
  }

  /** Clears all history */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
