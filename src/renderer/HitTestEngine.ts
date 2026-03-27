import type { TableLayout } from './ResponsiveLayout';
import { cardPositionInCascade } from './ResponsiveLayout';
import type { GameState } from '../core/game/GameState';
import { Suit } from '../core/entities/Suit';

/**
 * Result of a hit test against the game table.
 */
export type HitTestResult =
  | { kind: 'card'; cascadeIndex: number; cardIndex: number }
  | { kind: 'freecell-card'; slotIndex: number }
  | { kind: 'freecell-slot'; slotIndex: number }
  | { kind: 'foundation-slot'; suit: typeof Suit[keyof typeof Suit] }
  | { kind: 'cascade-slot'; cascadeIndex: number }
  | { kind: 'none' };

/**
 * HitTestEngine determines what element the user clicked/touched
 * by checking coordinates against the known layout positions.
 *
 * Tests from top to bottom (last drawn = first tested) for correct z-order.
 */
export class HitTestEngine {

  /**
   * Performs a hit test at the given logical coordinates.
   */
  test(x: number, y: number, layout: TableLayout, state: GameState): HitTestResult {
    // Test cascades (cards drawn bottom-up, test top-down)
    for (let col = 0; col < state.cascades.length; col++) {
      const cascade = state.cascades[col]!;
      // Test from top card down
      for (let row = cascade.length - 1; row >= 0; row--) {
        const pos = cardPositionInCascade(layout, col, row);
        // Last card in cascade gets full height, others get overlap height
        const hitH = row === cascade.length - 1 ? layout.cardHeight : layout.cascadeOverlap;
        if (x >= pos.x && x <= pos.x + layout.cardWidth && y >= pos.y && y <= pos.y + hitH) {
          return { kind: 'card', cascadeIndex: col, cardIndex: row };
        }
      }
      // Empty cascade slot
      if (cascade.length === 0) {
        const origin = layout.cascadeOrigins[col]!;
        if (x >= origin.x && x <= origin.x + layout.cardWidth && y >= origin.y && y <= origin.y + layout.cardHeight) {
          return { kind: 'cascade-slot', cascadeIndex: col };
        }
      }
    }

    // Test free cells
    for (let i = 0; i < state.freeCells.length; i++) {
      const slot = layout.freeCellSlots[i]!;
      if (x >= slot.x && x <= slot.x + layout.cardWidth && y >= slot.y && y <= slot.y + layout.cardHeight) {
        if (state.freeCells[i] != null) {
          return { kind: 'freecell-card', slotIndex: i };
        }
        return { kind: 'freecell-slot', slotIndex: i };
      }
    }

    // Test foundations
    const suitOrder: Array<typeof Suit[keyof typeof Suit]> = [Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades];
    for (let i = 0; i < layout.foundationSlots.length; i++) {
      const slot = layout.foundationSlots[i]!;
      if (x >= slot.x && x <= slot.x + layout.cardWidth && y >= slot.y && y <= slot.y + layout.cardHeight) {
        return { kind: 'foundation-slot', suit: suitOrder[i]! };
      }
    }

    return { kind: 'none' };
  }
}
