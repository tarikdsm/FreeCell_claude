import { canStackOnCascade, canPlaceOnFoundation } from '../entities/Card';
import { cascadeTop, cascadeSortedRunLength } from '../entities/Pile';
import type { GameState } from './GameState';
import type { Move } from './Move';
import { maxMovableCards } from './SuperMove';

/**
 * Pure validation function: determines if a move is legal in the given state.
 *
 * @param state - Current game state
 * @param move - Move to validate
 * @returns true if the move is legal
 */
export function isValidMove(state: GameState, move: Move): boolean {
  switch (move.type) {
    case 'cascade-to-cascade':
      return isValidCascadeToCascade(state, move);
    case 'cascade-to-freecell':
      return isValidCascadeToFreeCell(state, move);
    case 'cascade-to-foundation':
      return isValidCascadeToFoundation(state, move);
    case 'freecell-to-cascade':
      return isValidFreeCellToCascade(state, move);
    case 'freecell-to-foundation':
      return isValidFreeCellToFoundation(state, move);
  }
}

function isValidCascadeToCascade(state: GameState, move: Move): boolean {
  if (move.from.kind !== 'cascade' || move.to.kind !== 'cascade') return false;

  const fromCascade = state.cascades[move.from.index];
  const toCascade = state.cascades[move.to.index];
  if (!fromCascade || !toCascade) return false;
  if (move.from.index === move.to.index) return false;
  if (move.cards.length === 0) return false;

  const bottomCard = move.cards[0]!;
  const targetTop = cascadeTop(toCascade);

  // If target is empty, any card/sequence can be placed
  // If target has cards, bottom card must stack on target top
  if (targetTop !== undefined && !canStackOnCascade(bottomCard, targetTop)) {
    return false;
  }

  // Verify the cards form a valid descending alternating-color sequence
  for (let i = 1; i < move.cards.length; i++) {
    if (!canStackOnCascade(move.cards[i]!, move.cards[i - 1]!)) {
      return false;
    }
  }

  // Check super-move: enough free cells and empty cascades to move this many cards
  const numCards = move.cards.length;
  if (numCards > 1) {
    const maxCards = maxMovableCards(state, move.from.index, move.to.index);
    if (numCards > maxCards) return false;
  }

  // Verify the cards are actually at the bottom of the source cascade
  const startIdx = fromCascade.length - move.cards.length;
  if (startIdx < 0) return false;
  for (let i = 0; i < move.cards.length; i++) {
    const cascadeCard = fromCascade[startIdx + i];
    if (!cascadeCard || cascadeCard.id !== move.cards[i]!.id) return false;
  }

  return true;
}

function isValidCascadeToFreeCell(state: GameState, move: Move): boolean {
  if (move.from.kind !== 'cascade' || move.to.kind !== 'freecell') return false;

  const fromCascade = state.cascades[move.from.index];
  if (!fromCascade || fromCascade.length === 0) return false;

  // Only single card moves to free cell
  if (move.cards.length !== 1) return false;

  // Target free cell must be empty
  const slot = state.freeCells[move.to.index];
  if (slot !== null && slot !== undefined) return false;

  // Card must be the top of the cascade
  const top = cascadeTop(fromCascade);
  if (!top || top.id !== move.cards[0]!.id) return false;

  return true;
}

function isValidCascadeToFoundation(state: GameState, move: Move): boolean {
  if (move.from.kind !== 'cascade' || move.to.kind !== 'foundation') return false;

  const fromCascade = state.cascades[move.from.index];
  if (!fromCascade || fromCascade.length === 0) return false;

  if (move.cards.length !== 1) return false;

  const card = move.cards[0]!;
  const top = cascadeTop(fromCascade);
  if (!top || top.id !== card.id) return false;

  // Card suit must match the foundation
  if (card.suit !== move.to.suit) return false;

  // Card must be next rank for this foundation
  const foundationRank = state.foundations[card.suit];
  if (foundationRank === undefined) return false;
  return canPlaceOnFoundation(card, foundationRank);
}

function isValidFreeCellToCascade(state: GameState, move: Move): boolean {
  if (move.from.kind !== 'freecell' || move.to.kind !== 'cascade') return false;

  if (move.cards.length !== 1) return false;

  const card = move.cards[0]!;
  const slot = state.freeCells[move.from.index];
  if (!slot || slot.id !== card.id) return false;

  const toCascade = state.cascades[move.to.index];
  if (!toCascade) return false;

  const targetTop = cascadeTop(toCascade);
  // Empty cascade accepts any card
  if (targetTop === undefined) return true;

  return canStackOnCascade(card, targetTop);
}

function isValidFreeCellToFoundation(state: GameState, move: Move): boolean {
  if (move.from.kind !== 'freecell' || move.to.kind !== 'foundation') return false;

  if (move.cards.length !== 1) return false;

  const card = move.cards[0]!;
  const slot = state.freeCells[move.from.index];
  if (!slot || slot.id !== card.id) return false;

  if (card.suit !== move.to.suit) return false;

  const foundationRank = state.foundations[card.suit];
  if (foundationRank === undefined) return false;
  return canPlaceOnFoundation(card, foundationRank);
}

/**
 * Generates all valid moves from the current game state.
 */
export function availableMoves(state: GameState): Move[] {
  const moves: Move[] = [];

  // Cascade moves
  for (let i = 0; i < state.cascades.length; i++) {
    const cascade = state.cascades[i]!;
    if (cascade.length === 0) continue;

    const top = cascadeTop(cascade)!;

    // Cascade → Foundation
    const foundationRank = state.foundations[top.suit];
    if (foundationRank !== undefined && canPlaceOnFoundation(top, foundationRank)) {
      moves.push({
        type: 'cascade-to-foundation',
        from: { kind: 'cascade', index: i },
        to: { kind: 'foundation', suit: top.suit },
        cards: [top],
      });
    }

    // Cascade → FreeCell
    for (let f = 0; f < state.freeCells.length; f++) {
      if (state.freeCells[f] === null) {
        moves.push({
          type: 'cascade-to-freecell',
          from: { kind: 'cascade', index: i },
          to: { kind: 'freecell', index: f },
          cards: [top],
        });
        break; // Only need one free cell target (they're interchangeable)
      }
    }

    // Cascade → Cascade (including super-moves)
    const sortedRun = cascadeSortedRunLength(cascade);
    for (let j = 0; j < state.cascades.length; j++) {
      if (i === j) continue;
      const targetCascade = state.cascades[j]!;
      const targetTop = cascadeTop(targetCascade);

      const maxCards = maxMovableCards(state, i, j);

      if (targetTop === undefined) {
        // Empty cascade: move up to sortedRun cards (but not entire cascade to empty — pointless)
        if (cascade.length === sortedRun) continue; // Don't move entire sorted cascade to empty
        const numToMove = Math.min(sortedRun, maxCards);
        if (numToMove > 0) {
          const cards = cascade.slice(cascade.length - numToMove);
          moves.push({
            type: 'cascade-to-cascade',
            from: { kind: 'cascade', index: i },
            to: { kind: 'cascade', index: j },
            cards,
          });
        }
      } else {
        // Non-empty cascade: find how many of the sorted run can stack
        for (let n = 1; n <= Math.min(sortedRun, maxCards); n++) {
          const bottomCard = cascade[cascade.length - n]!;
          if (canStackOnCascade(bottomCard, targetTop)) {
            const cards = cascade.slice(cascade.length - n);
            moves.push({
              type: 'cascade-to-cascade',
              from: { kind: 'cascade', index: i },
              to: { kind: 'cascade', index: j },
              cards,
            });
            break; // Only the largest valid move matters for this target
          }
        }
      }
    }
  }

  // FreeCell moves
  for (let f = 0; f < state.freeCells.length; f++) {
    const card = state.freeCells[f];
    if (card == null) continue;

    // FreeCell → Foundation
    const foundationRank = state.foundations[card.suit];
    if (foundationRank !== undefined && canPlaceOnFoundation(card, foundationRank)) {
      moves.push({
        type: 'freecell-to-foundation',
        from: { kind: 'freecell', index: f },
        to: { kind: 'foundation', suit: card.suit },
        cards: [card],
      });
    }

    // FreeCell → Cascade
    for (let j = 0; j < state.cascades.length; j++) {
      const targetCascade = state.cascades[j]!;
      const targetTop = cascadeTop(targetCascade);

      if (targetTop === undefined) {
        // Only one empty cascade target needed (interchangeable)
        moves.push({
          type: 'freecell-to-cascade',
          from: { kind: 'freecell', index: f },
          to: { kind: 'cascade', index: j },
          cards: [card],
        });
        break;
      } else if (canStackOnCascade(card, targetTop)) {
        moves.push({
          type: 'freecell-to-cascade',
          from: { kind: 'freecell', index: f },
          to: { kind: 'cascade', index: j },
          cards: [card],
        });
      }
    }
  }

  return moves;
}
