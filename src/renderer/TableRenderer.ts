import type { GameState } from '../core/game/GameState';
import { Suit } from '../core/entities/Suit';
import type { TableLayout } from './ResponsiveLayout';
import { cardPositionInCascade } from './ResponsiveLayout';
import type { CardRenderer } from './CardRenderer';
import type { SelectionManager } from './SelectionManager';
import type { AnimationEngine } from './AnimationEngine';
import type { Card } from '../core/entities/Card';
import { cardOf } from '../core/entities/Card';

/** Unicode suit symbols for foundation placeholders */
const FOUNDATION_SYMBOLS: Record<number, string> = {
  [Suit.Clubs]: '\u2663',
  [Suit.Diamonds]: '\u2666',
  [Suit.Hearts]: '\u2665',
  [Suit.Spades]: '\u2660',
};

const SUIT_ORDER: ReadonlyArray<typeof Suit[keyof typeof Suit]> = [Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades];

/**
 * TableRenderer draws the complete game table to canvas each frame.
 * Uses painter's algorithm: background → slots → static cards → animations → dragged cards.
 */
export class TableRenderer {
  constructor(
    private cardRenderer: CardRenderer,
    private selection: SelectionManager,
  ) {}

  /**
   * Renders the full game table.
   */
  render(
    ctx: CanvasRenderingContext2D,
    layout: TableLayout,
    state: GameState,
    animationEngine: AnimationEngine | null,
    dragState: DragRenderState | null,
  ): void {
    // 1. Background
    this.drawBackground(ctx, layout);

    // 2. Slot placeholders
    this.drawSlots(ctx, layout, state);

    // 3. Static cards (skip cards being animated or dragged)
    const animatingIds = animationEngine ? animationEngine.getAnimatingCardIds() : new Set<number>();
    const dragIds = dragState ? new Set(dragState.cards.map((c) => c.id)) : new Set<number>();

    this.drawStaticCards(ctx, layout, state, animatingIds, dragIds);

    // 4. Animated cards
    if (animationEngine) {
      animationEngine.renderAnimations(ctx, this.cardRenderer, layout.cardWidth, layout.cardHeight);
    }

    // 5. Dragged cards (always on top)
    if (dragState) {
      this.drawDraggedCards(ctx, layout, dragState);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, layout: TableLayout): void {
    const gradient = ctx.createRadialGradient(
      layout.tableWidth / 2, layout.tableHeight / 2,
      0,
      layout.tableWidth / 2, layout.tableHeight / 2,
      Math.max(layout.tableWidth, layout.tableHeight) * 0.7,
    );
    gradient.addColorStop(0, '#1a6b37');
    gradient.addColorStop(1, '#0d4a22');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, layout.tableWidth, layout.tableHeight);
  }

  private drawSlots(ctx: CanvasRenderingContext2D, layout: TableLayout, state: GameState): void {
    const { cardWidth, cardHeight, cardCornerRadius } = layout;

    // Free cell slots
    for (const slot of layout.freeCellSlots) {
      const isTarget = this.selection.isDropTarget({ kind: 'freecell', index: layout.freeCellSlots.indexOf(slot) });
      this.drawSlotPlaceholder(ctx, slot.x, slot.y, cardWidth, cardHeight, cardCornerRadius, isTarget);
    }

    // Foundation slots
    for (let i = 0; i < layout.foundationSlots.length; i++) {
      const slot = layout.foundationSlots[i]!;
      const suit = SUIT_ORDER[i]!;
      const isTarget = this.selection.isDropTarget({ kind: 'foundation', suit });
      this.drawSlotPlaceholder(ctx, slot.x, slot.y, cardWidth, cardHeight, cardCornerRadius, isTarget);

      // Foundation suit symbol
      if (state.foundations[suit] === 0) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `${Math.floor(cardWidth * 0.45)}px Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(FOUNDATION_SYMBOLS[suit] ?? '', slot.x + cardWidth / 2, slot.y + cardHeight / 2);
        ctx.restore();
      }
    }

    // Empty cascade slots
    for (let i = 0; i < layout.cascadeOrigins.length; i++) {
      if (state.cascades[i]!.length === 0) {
        const origin = layout.cascadeOrigins[i]!;
        const isTarget = this.selection.isDropTarget({ kind: 'cascade', index: i });
        this.drawSlotPlaceholder(ctx, origin.x, origin.y, cardWidth, cardHeight, cardCornerRadius, isTarget);
      }
    }
  }

  private drawSlotPlaceholder(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
    isDropTarget: boolean,
  ): void {
    ctx.save();
    ctx.strokeStyle = isDropTarget ? 'rgba(76, 175, 80, 0.7)' : 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = isDropTarget ? 2.5 : 1;
    if (isDropTarget) {
      ctx.shadowColor = 'rgba(76, 175, 80, 0.5)';
      ctx.shadowBlur = 8;
    }
    ctx.setLineDash(isDropTarget ? [] : [4, 3]);
    this.roundRect(ctx, x, y, w, h, r);
    ctx.stroke();
    ctx.restore();
  }

  private drawStaticCards(
    ctx: CanvasRenderingContext2D,
    layout: TableLayout,
    state: GameState,
    animatingIds: Set<number>,
    dragIds: Set<number>,
  ): void {
    const { cardWidth, cardHeight } = layout;

    // Free cell cards
    for (let i = 0; i < state.freeCells.length; i++) {
      const card = state.freeCells[i];
      if (card == null || animatingIds.has(card.id) || dragIds.has(card.id)) continue;
      const slot = layout.freeCellSlots[i]!;
      this.cardRenderer.drawCard(ctx, card, slot.x, slot.y, cardWidth, cardHeight);
      if (this.selection.isSelected(card.id)) {
        this.cardRenderer.drawCardHighlight(ctx, slot.x, slot.y, cardWidth, cardHeight);
      }
    }

    // Foundation top cards
    for (let i = 0; i < SUIT_ORDER.length; i++) {
      const suit = SUIT_ORDER[i]!;
      const rank = state.foundations[suit];
      if (rank > 0) {
        const slot = layout.foundationSlots[i]!;
        const card = cardOf(suit, rank as 1|2|3|4|5|6|7|8|9|10|11|12|13);
        if (!animatingIds.has(card.id)) {
          this.cardRenderer.drawCard(ctx, card, slot.x, slot.y, cardWidth, cardHeight);
        }
      }
    }

    // Cascade cards
    for (let col = 0; col < state.cascades.length; col++) {
      const cascade = state.cascades[col]!;
      for (let row = 0; row < cascade.length; row++) {
        const card = cascade[row]!;
        if (animatingIds.has(card.id) || dragIds.has(card.id)) continue;
        const pos = cardPositionInCascade(layout, col, row);

        // Clip partially covered cards for performance
        if (row < cascade.length - 1) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(pos.x, pos.y, cardWidth, layout.cascadeOverlap);
          ctx.clip();
          this.cardRenderer.drawCard(ctx, card, pos.x, pos.y, cardWidth, cardHeight);
          if (this.selection.isSelected(card.id)) {
            this.cardRenderer.drawCardHighlight(ctx, pos.x, pos.y, cardWidth, cardHeight);
          }
          ctx.restore();
        } else {
          // Top card: full render
          this.cardRenderer.drawCard(ctx, card, pos.x, pos.y, cardWidth, cardHeight);
          if (this.selection.isSelected(card.id)) {
            this.cardRenderer.drawCardHighlight(ctx, pos.x, pos.y, cardWidth, cardHeight);
          }
        }
      }
    }
  }

  private drawDraggedCards(
    ctx: CanvasRenderingContext2D,
    layout: TableLayout,
    dragState: DragRenderState,
  ): void {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    for (let i = 0; i < dragState.cards.length; i++) {
      const card = dragState.cards[i]!;
      const x = dragState.x;
      const y = dragState.y + i * layout.cascadeOverlap;
      this.cardRenderer.drawCard(ctx, card, x, y, layout.cardWidth, layout.cardHeight);
    }
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}

/**
 * State passed to the table renderer for drawing dragged cards.
 */
export interface DragRenderState {
  readonly cards: readonly Card[];
  readonly x: number;
  readonly y: number;
}
