import type { GameState, Foundations } from './GameState';
import type { Move } from './Move';
import { isValidMove } from './MoveValidator';

/**
 * Applies a move to a game state, returning a new immutable state.
 *
 * @param state - Current game state
 * @param move - Move to apply
 * @returns New game state with the move applied
 * @throws Error if the move is invalid
 */
export function applyMove(state: GameState, move: Move): GameState {
  if (!isValidMove(state, move)) {
    throw new Error(`Invalid move: ${move.type} from ${move.from.kind} to ${move.to.kind}`);
  }

  switch (move.type) {
    case 'cascade-to-cascade':
      return applyCascadeToCascade(state, move);
    case 'cascade-to-freecell':
      return applyCascadeToFreeCell(state, move);
    case 'cascade-to-foundation':
      return applyCascadeToFoundation(state, move);
    case 'freecell-to-cascade':
      return applyFreeCellToCascade(state, move);
    case 'freecell-to-foundation':
      return applyFreeCellToFoundation(state, move);
  }
}

function applyCascadeToCascade(state: GameState, move: Move): GameState {
  if (move.from.kind !== 'cascade' || move.to.kind !== 'cascade') {
    throw new Error('Invalid move locations');
  }

  const fromIdx = move.from.index;
  const toIdx = move.to.index;
  const numCards = move.cards.length;

  const newCascades = state.cascades.map((cascade, i) => {
    if (i === fromIdx) {
      // Remove cards from source
      return cascade.slice(0, cascade.length - numCards);
    }
    if (i === toIdx) {
      // Add cards to destination
      return [...cascade, ...move.cards];
    }
    return cascade;
  });

  return {
    ...state,
    cascades: newCascades,
    moveCount: state.moveCount + 1,
  };
}

function applyCascadeToFreeCell(state: GameState, move: Move): GameState {
  if (move.from.kind !== 'cascade' || move.to.kind !== 'freecell') {
    throw new Error('Invalid move locations');
  }

  const fromIdx = move.from.index;
  const toIdx = move.to.index;
  const card = move.cards[0]!;

  const newCascades = state.cascades.map((cascade, i) =>
    i === fromIdx ? cascade.slice(0, -1) : cascade,
  );

  const newFreeCells = [...state.freeCells] as [Card | null, Card | null, Card | null, Card | null];
  newFreeCells[toIdx] = card;

  return {
    ...state,
    cascades: newCascades,
    freeCells: newFreeCells,
    moveCount: state.moveCount + 1,
  };
}

function applyCascadeToFoundation(state: GameState, move: Move): GameState {
  if (move.from.kind !== 'cascade' || move.to.kind !== 'foundation') {
    throw new Error('Invalid move locations');
  }

  const fromIdx = move.from.index;
  const card = move.cards[0]!;

  const newCascades = state.cascades.map((cascade, i) =>
    i === fromIdx ? cascade.slice(0, -1) : cascade,
  );

  const newFoundations = { ...state.foundations, [card.suit]: card.rank } as Foundations;

  return {
    ...state,
    cascades: newCascades,
    foundations: newFoundations,
    moveCount: state.moveCount + 1,
  };
}

function applyFreeCellToCascade(state: GameState, move: Move): GameState {
  if (move.from.kind !== 'freecell' || move.to.kind !== 'cascade') {
    throw new Error('Invalid move locations');
  }

  const fromIdx = move.from.index;
  const toIdx = move.to.index;
  const card = move.cards[0]!;

  const newFreeCells = [...state.freeCells] as [Card | null, Card | null, Card | null, Card | null];
  newFreeCells[fromIdx] = null;

  const newCascades = state.cascades.map((cascade, i) =>
    i === toIdx ? [...cascade, card] : cascade,
  );

  return {
    ...state,
    cascades: newCascades,
    freeCells: newFreeCells,
    moveCount: state.moveCount + 1,
  };
}

function applyFreeCellToFoundation(state: GameState, move: Move): GameState {
  if (move.from.kind !== 'freecell' || move.to.kind !== 'foundation') {
    throw new Error('Invalid move locations');
  }

  const fromIdx = move.from.index;
  const card = move.cards[0]!;

  const newFreeCells = [...state.freeCells] as [Card | null, Card | null, Card | null, Card | null];
  newFreeCells[fromIdx] = null;

  const newFoundations = { ...state.foundations, [card.suit]: card.rank } as Foundations;

  return {
    ...state,
    freeCells: newFreeCells,
    foundations: newFoundations,
    moveCount: state.moveCount + 1,
  };
}

// Need Card type for the free cells tuple
import type { Card } from '../entities/Card';
