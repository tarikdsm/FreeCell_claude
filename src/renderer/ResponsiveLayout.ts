import { NUM_CASCADES, NUM_FREECELLS, NUM_FOUNDATIONS } from '../core/entities/Pile';
import type { GameState } from '../core/game/GameState';

/**
 * Computed positions and sizes for the entire table layout.
 * All values are in logical (CSS) pixels.
 */
export interface TableLayout {
  readonly tableWidth: number;
  readonly tableHeight: number;
  readonly cardWidth: number;
  readonly cardHeight: number;
  readonly cardCornerRadius: number;
  readonly columnGap: number;
  readonly cascadeOverlap: number;
  readonly topZoneY: number;
  readonly cascadeZoneY: number;
  readonly freeCellSlots: ReadonlyArray<{ readonly x: number; readonly y: number }>;
  readonly foundationSlots: ReadonlyArray<{ readonly x: number; readonly y: number }>;
  readonly cascadeOrigins: ReadonlyArray<{ readonly x: number; readonly y: number }>;
}

/** Height reserved for menu bar at top */
const MENU_BAR_HEIGHT = 48;
/** Height reserved for status bar at bottom */
const STATUS_BAR_HEIGHT = 36;
/** Padding around the table edges */
const TABLE_PADDING = 8;
/** Gap between top zone (freecells/foundations) and cascades */
const ZONE_GAP = 12;

/**
 * Computes the full table layout based on viewport dimensions and game state.
 *
 * @param viewportWidth - Available width in CSS pixels
 * @param viewportHeight - Available height in CSS pixels
 * @param state - Current game state (used to compute adaptive cascade overlap)
 */
export function computeLayout(
  viewportWidth: number,
  viewportHeight: number,
  state?: GameState,
): TableLayout {
  const tableWidth = viewportWidth;
  const tableHeight = viewportHeight - MENU_BAR_HEIGHT - STATUS_BAR_HEIGHT;

  // Card width: fit 8 columns + gaps
  const isMobile = viewportWidth < 768;
  const divisor = isMobile ? 8.8 : 10;
  let cardWidth = Math.min((viewportWidth - TABLE_PADDING * 2) / divisor, 100);
  cardWidth = Math.max(cardWidth, 45); // absolute minimum
  cardWidth = Math.floor(cardWidth);

  const cardHeight = Math.floor(cardWidth * 1.4);
  const cardCornerRadius = Math.max(3, Math.floor(cardWidth * 0.06));

  // Column layout: 8 columns centered
  const columnGap = Math.floor(cardWidth * 0.12);
  const totalColumnsWidth = NUM_CASCADES * cardWidth + (NUM_CASCADES - 1) * columnGap;
  const leftMargin = Math.floor((tableWidth - totalColumnsWidth) / 2);

  // Top zone: freecells on left, foundations on right
  const topZoneY = TABLE_PADDING;
  // FreeCells: 4 slots starting from left margin
  const freeCellSlots: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < NUM_FREECELLS; i++) {
    freeCellSlots.push({
      x: leftMargin + i * (cardWidth + columnGap),
      y: topZoneY,
    });
  }

  // Foundations: 4 slots aligned to right
  const foundationSlots: Array<{ x: number; y: number }> = [];
  const foundationStartX = leftMargin + totalColumnsWidth - NUM_FOUNDATIONS * cardWidth - (NUM_FOUNDATIONS - 1) * columnGap;
  for (let i = 0; i < NUM_FOUNDATIONS; i++) {
    foundationSlots.push({
      x: foundationStartX + i * (cardWidth + columnGap),
      y: topZoneY,
    });
  }

  // Cascade zone
  const cascadeZoneY = topZoneY + cardHeight + ZONE_GAP;

  // Cascade origins (top-left of each column)
  const cascadeOrigins: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < NUM_CASCADES; i++) {
    cascadeOrigins.push({
      x: leftMargin + i * (cardWidth + columnGap),
      y: cascadeZoneY,
    });
  }

  // Adaptive cascade overlap
  const maxCascadeCards = state
    ? Math.max(1, ...state.cascades.map((c) => c.length))
    : 7;
  const availableHeight = tableHeight - cascadeZoneY - TABLE_PADDING;
  const defaultOverlap = Math.floor(cardHeight * 0.28);
  const adaptiveOverlap = maxCascadeCards > 1
    ? Math.floor((availableHeight - cardHeight) / (maxCascadeCards - 1))
    : defaultOverlap;
  const cascadeOverlap = Math.max(
    Math.floor(cardHeight * 0.12), // minimum overlap so cards are always visible
    Math.min(defaultOverlap, adaptiveOverlap),
  );

  return {
    tableWidth,
    tableHeight,
    cardWidth,
    cardHeight,
    cardCornerRadius,
    columnGap,
    cascadeOverlap,
    topZoneY,
    cascadeZoneY,
    freeCellSlots,
    foundationSlots,
    cascadeOrigins,
  };
}

/**
 * Computes the position of a specific card in a cascade.
 */
export function cardPositionInCascade(
  layout: TableLayout,
  col: number,
  row: number,
): { x: number; y: number } {
  const origin = layout.cascadeOrigins[col]!;
  return {
    x: origin.x,
    y: origin.y + row * layout.cascadeOverlap,
  };
}
