import type { Card } from '../core/entities/Card';
import type { PileLocation } from '../core/entities/Pile';
import type { GameState } from '../core/game/GameState';
import type { Move } from '../core/game/Move';
import type { TableLayout } from './ResponsiveLayout';
import { cardPositionInCascade } from './ResponsiveLayout';
import type { HitTestEngine, HitTestResult } from './HitTestEngine';
import type { SelectionManager } from './SelectionManager';
import { cascadeSortedRunLength } from '../core/entities/Pile';

/** Minimum pixel distance before a pointerdown becomes a drag */
const DRAG_THRESHOLD = 5;

/**
 * Callback interface for the DragDropHandler to communicate with the App.
 */
export interface DragDropCallbacks {
  getState(): GameState;
  getLayout(): TableLayout;
  getAvailableMoves(): readonly Move[];
  executeMove(move: Move): boolean;
  markDirty(): void;
}

/**
 * DragRender state exposed to the table renderer.
 */
export interface DragVisualState {
  readonly cards: readonly Card[];
  readonly x: number;
  readonly y: number;
}

/**
 * DragDropHandler manages click-to-move and drag-and-drop interactions.
 * Uses Pointer Events for unified mouse+touch support.
 */
export class DragDropHandler {
  private hitTest: HitTestEngine;
  private selection: SelectionManager;
  private canvas: HTMLCanvasElement;
  private callbacks: DragDropCallbacks;

  private pointerDownPos: { x: number; y: number } | null = null;
  private pointerDownHit: HitTestResult | null = null;
  private isDragging = false;
  private dragCards: Card[] = [];
  private dragFrom: PileLocation | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private _dragVisual: DragVisualState | null = null;

  /** Current drag visual state for the renderer */
  get dragVisual(): DragVisualState | null { return this._dragVisual; }

  constructor(
    canvas: HTMLCanvasElement,
    hitTest: HitTestEngine,
    selection: SelectionManager,
    callbacks: DragDropCallbacks,
  ) {
    this.canvas = canvas;
    this.hitTest = hitTest;
    this.selection = selection;
    this.callbacks = callbacks;

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('dblclick', this.onDoubleClick);

    // Prevent context menu on long press
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private getCanvasCoords(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private onPointerDown = (e: PointerEvent): void => {
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);

    const coords = this.getCanvasCoords(e);
    const layout = this.callbacks.getLayout();
    const state = this.callbacks.getState();
    const hit = this.hitTest.test(coords.x, coords.y, layout, state);

    this.pointerDownPos = coords;
    this.pointerDownHit = hit;
    this.isDragging = false;
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.pointerDownPos) return;
    e.preventDefault();

    const coords = this.getCanvasCoords(e);
    const dx = coords.x - this.pointerDownPos.x;
    const dy = coords.y - this.pointerDownPos.y;

    if (!this.isDragging && Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD) {
      this.startDrag();
    }

    if (this.isDragging) {
      this._dragVisual = {
        cards: this.dragCards,
        x: coords.x - this.dragOffsetX,
        y: coords.y - this.dragOffsetY,
      };
      this.callbacks.markDirty();
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    e.preventDefault();

    if (this.isDragging) {
      this.endDrag(e);
    } else if (this.pointerDownHit) {
      this.handleClick(this.pointerDownHit);
    }

    this.pointerDownPos = null;
    this.pointerDownHit = null;
    this.isDragging = false;
    this._dragVisual = null;
    this.callbacks.markDirty();
  };

  private onDoubleClick = (e: MouseEvent): void => {
    const coords = { x: e.clientX - this.canvas.getBoundingClientRect().left, y: e.clientY - this.canvas.getBoundingClientRect().top };
    const layout = this.callbacks.getLayout();
    const state = this.callbacks.getState();
    const hit = this.hitTest.test(coords.x, coords.y, layout, state);

    if (hit.kind === 'card') {
      // Try to auto-move top card to foundation
      const cascade = state.cascades[hit.cascadeIndex]!;
      if (hit.cardIndex === cascade.length - 1) {
        const card = cascade[hit.cardIndex]!;
        const move = this.findFoundationMove(card, { kind: 'cascade', index: hit.cascadeIndex });
        if (move) {
          this.selection.clear();
          this.callbacks.executeMove(move);
        }
      }
    } else if (hit.kind === 'freecell-card') {
      const card = state.freeCells[hit.slotIndex]!;
      const move = this.findFoundationMove(card, { kind: 'freecell', index: hit.slotIndex });
      if (move) {
        this.selection.clear();
        this.callbacks.executeMove(move);
      }
    }
  };

  private handleClick(hit: HitTestResult): void {
    const state = this.callbacks.getState();
    const moves = this.callbacks.getAvailableMoves();

    if (this.selection.hasSelection) {
      // Second click: try to execute move to clicked target
      const target = this.hitToLocation(hit, state);
      if (target) {
        const move = this.findMoveToTarget(this.selection.selectedFrom!, target, moves);
        if (move) {
          this.callbacks.executeMove(move);
          this.selection.clear();
          this.callbacks.markDirty();
          return;
        }
      }
      // Clicked something else — clear and maybe re-select
      this.selection.clear();
    }

    // First click: select card(s)
    if (hit.kind === 'card') {
      const cascade = state.cascades[hit.cascadeIndex]!;
      const from: PileLocation = { kind: 'cascade', index: hit.cascadeIndex };
      // Select the run from clicked card to top
      const runLength = cascadeSortedRunLength(cascade);
      const firstMovableIdx = cascade.length - runLength;
      if (hit.cardIndex >= firstMovableIdx) {
        const cards = cascade.slice(hit.cardIndex);
        const targets = this.findValidTargets(from, cards, moves);
        this.selection.select(cards, from, targets);
      }
    } else if (hit.kind === 'freecell-card') {
      const card = state.freeCells[hit.slotIndex];
      if (card != null) {
        const from: PileLocation = { kind: 'freecell', index: hit.slotIndex };
        const targets = this.findValidTargets(from, [card], moves);
        this.selection.select([card], from, targets);
      }
    }

    this.callbacks.markDirty();
  }

  private startDrag(): void {
    const hit = this.pointerDownHit;
    if (!hit) return;

    const state = this.callbacks.getState();
    const layout = this.callbacks.getLayout();

    this.selection.clear();

    if (hit.kind === 'card') {
      const cascade = state.cascades[hit.cascadeIndex]!;
      const runLength = cascadeSortedRunLength(cascade);
      const firstMovableIdx = cascade.length - runLength;

      if (hit.cardIndex >= firstMovableIdx) {
        this.dragCards = [...cascade.slice(hit.cardIndex)];
        this.dragFrom = { kind: 'cascade', index: hit.cascadeIndex };
        this.isDragging = true;

        const cardPos = cardPositionInCascade(layout, hit.cascadeIndex, hit.cardIndex);
        this.dragOffsetX = this.pointerDownPos!.x - cardPos.x;
        this.dragOffsetY = this.pointerDownPos!.y - cardPos.y;

        // Show drop targets
        const moves = this.callbacks.getAvailableMoves();
        const targets = this.findValidTargets(this.dragFrom, this.dragCards, moves);
        this.selection.select(this.dragCards, this.dragFrom, targets);
      }
    } else if (hit.kind === 'freecell-card') {
      const card = state.freeCells[hit.slotIndex];
      if (card != null) {
        this.dragCards = [card];
        this.dragFrom = { kind: 'freecell', index: hit.slotIndex };
        this.isDragging = true;

        const slot = layout.freeCellSlots[hit.slotIndex]!;
        this.dragOffsetX = this.pointerDownPos!.x - slot.x;
        this.dragOffsetY = this.pointerDownPos!.y - slot.y;

        const moves = this.callbacks.getAvailableMoves();
        const targets = this.findValidTargets(this.dragFrom, [card], moves);
        this.selection.select([card], this.dragFrom, targets);
      }
    }
  }

  private endDrag(e: PointerEvent): void {
    if (!this.dragFrom || this.dragCards.length === 0) return;

    const coords = this.getCanvasCoords(e);
    const layout = this.callbacks.getLayout();
    const state = this.callbacks.getState();
    const hit = this.hitTest.test(coords.x, coords.y, layout, state);
    const target = this.hitToLocation(hit, state);

    if (target) {
      const moves = this.callbacks.getAvailableMoves();
      const move = this.findMoveToTarget(this.dragFrom, target, moves);
      if (move) {
        this.callbacks.executeMove(move);
      }
    }

    this.selection.clear();
    this.dragCards = [];
    this.dragFrom = null;
  }

  private hitToLocation(hit: HitTestResult, _state: GameState): PileLocation | null {
    switch (hit.kind) {
      case 'card':
        return { kind: 'cascade', index: hit.cascadeIndex };
      case 'cascade-slot':
        return { kind: 'cascade', index: hit.cascadeIndex };
      case 'freecell-slot':
        return { kind: 'freecell', index: hit.slotIndex };
      case 'freecell-card':
        return { kind: 'freecell', index: hit.slotIndex };
      case 'foundation-slot':
        return { kind: 'foundation', suit: hit.suit };
      default:
        return null;
    }
  }

  private findMoveToTarget(from: PileLocation, target: PileLocation, moves: readonly Move[]): Move | undefined {
    return moves.find((m) => {
      if (!this.locationsMatch(m.from, from)) return false;
      if (!this.locationsMatch(m.to, target)) return false;
      return true;
    });
  }

  private findFoundationMove(card: Card, from: PileLocation): Move | undefined {
    const moves = this.callbacks.getAvailableMoves();
    return moves.find((m) =>
      this.locationsMatch(m.from, from) &&
      m.to.kind === 'foundation' &&
      m.cards.length === 1 &&
      m.cards[0]!.id === card.id,
    );
  }

  private findValidTargets(from: PileLocation, cards: readonly Card[], moves: readonly Move[]): PileLocation[] {
    const targets: PileLocation[] = [];
    for (const m of moves) {
      if (!this.locationsMatch(m.from, from)) continue;
      // Check cards match (at least first card matches)
      if (cards.length > 0 && m.cards.length > 0 && m.cards[0]!.id === cards[0]!.id) {
        targets.push(m.to);
      }
    }
    return targets;
  }

  private locationsMatch(a: PileLocation, b: PileLocation): boolean {
    if (a.kind !== b.kind) return false;
    if (a.kind === 'cascade' && b.kind === 'cascade') return a.index === b.index;
    if (a.kind === 'freecell' && b.kind === 'freecell') return a.index === b.index;
    if (a.kind === 'foundation' && b.kind === 'foundation') return a.suit === b.suit;
    return false;
  }

  /** Cleanup event listeners */
  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('dblclick', this.onDoubleClick);
  }
}
