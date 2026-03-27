import { GameEngine } from '../engine/GameEngine';
import { Timer } from '../engine/Timer';
import { loadStats, saveStats, recordWin } from '../engine/Statistics';
import { CanvasManager } from '../renderer/CanvasManager';
import { CardRenderer } from '../renderer/CardRenderer';
import { TableRenderer } from '../renderer/TableRenderer';
import type { DragRenderState } from '../renderer/TableRenderer';
import { HitTestEngine } from '../renderer/HitTestEngine';
import { SelectionManager } from '../renderer/SelectionManager';
import { AnimationEngine } from '../renderer/AnimationEngine';
import { DragDropHandler } from '../renderer/DragDropHandler';
import { computeLayout } from '../renderer/ResponsiveLayout';
import type { TableLayout } from '../renderer/ResponsiveLayout';
import { UIManager } from '../ui/UIManager';
import { isAutoCompletable } from '../core/game/WinDetector';
import type { Move } from '../core/game/Move';

/**
 * App is the top-level compositor that wires together:
 * engine, renderer, input handling, animations, and DOM UI.
 */
export class App {
  private engine: GameEngine;
  private timer: Timer;
  private canvasManager: CanvasManager;
  private cardRenderer: CardRenderer;
  private tableRenderer: TableRenderer;
  private hitTest: HitTestEngine;
  private selection: SelectionManager;
  private animation: AnimationEngine;
  private dragDrop: DragDropHandler;
  private ui: UIManager;
  private layout!: TableLayout;
  private lastCacheWidth = 0;

  constructor(root: HTMLElement) {
    // Engine
    this.engine = new GameEngine();
    this.timer = new Timer();

    // UI DOM
    this.ui = new UIManager(root, {
      onNewGame: () => this.newGame(),
      onSelectGame: () => { /* handled by UIManager internally */ },
      onUndo: () => this.undo(),
      onRedo: () => this.redo(),
      onAutoComplete: () => this.autoComplete(),
      onReplay: () => this.replay(),
      onSelectDeal: (n) => this.newGame(n),
    });

    // Canvas & Renderer
    const container = this.ui.getCanvasContainer();
    this.canvasManager = new CanvasManager(container);

    this.cardRenderer = new CardRenderer();
    this.selection = new SelectionManager();
    this.tableRenderer = new TableRenderer(this.cardRenderer, this.selection);
    this.hitTest = new HitTestEngine();
    this.animation = new AnimationEngine();

    // Compute initial layout
    this.layout = computeLayout(
      this.canvasManager.logicalWidth,
      this.canvasManager.logicalHeight,
      this.engine.state,
    );
    this.regenerateCardCache();

    // Drag & Drop
    this.dragDrop = new DragDropHandler(
      this.canvasManager.canvas,
      this.hitTest,
      this.selection,
      {
        getState: () => this.engine.state,
        getLayout: () => this.layout,
        getAvailableMoves: () => this.engine.getAvailableMoves() as Move[],
        executeMove: (move) => this.executeMove(move),
        markDirty: () => this.canvasManager.markDirty(),
      },
    );

    // Animation dirty callback
    this.animation.setDirtyCallback(() => this.canvasManager.markDirty());

    // Engine events
    this.engine.events.on('win', ({ moveCount }) => {
      this.timer.pause();
      const stats = recordWin(loadStats(), moveCount, this.timer.seconds);
      saveStats(stats);
      // Delay win screen slightly for last animation
      setTimeout(() => {
        this.ui.winScreen.show(moveCount, this.timer.seconds);
      }, 600);
    });

    this.engine.events.on('autoMove', () => {
      // Animate auto-moves to foundation
      this.animateAutoMoves();
    });

    // Start RAF loop
    this.canvasManager.start(
      (dt) => this.onFrame(dt),
      (w, h) => this.onResize(w, h),
    );

    // Start first game
    this.newGame();
  }

  private newGame(dealNumber?: number): void {
    this.animation.cancelAll();
    this.selection.clear();
    this.timer.reset();

    this.engine.newGame(dealNumber);

    this.layout = computeLayout(
      this.canvasManager.logicalWidth,
      this.canvasManager.logicalHeight,
      this.engine.state,
    );
    this.regenerateCardCache();

    this.timer.start((secs) => {
      this.ui.statusBar.update(this.engine.dealNumber, this.engine.state.moveCount, secs);
    });

    this.canvasManager.markDirty();
    this.updateUI();
  }

  private replay(): void {
    this.newGame(this.engine.dealNumber);
  }

  private undo(): void {
    if (this.engine.undo()) {
      this.selection.clear();
      this.layout = computeLayout(
        this.canvasManager.logicalWidth,
        this.canvasManager.logicalHeight,
        this.engine.state,
      );
      this.canvasManager.markDirty();
      this.updateUI();
    }
  }

  private redo(): void {
    if (this.engine.redo()) {
      this.selection.clear();
      this.layout = computeLayout(
        this.canvasManager.logicalWidth,
        this.canvasManager.logicalHeight,
        this.engine.state,
      );
      this.canvasManager.markDirty();
      this.updateUI();
    }
  }

  private autoComplete(): void {
    if (this.engine.autoComplete()) {
      this.selection.clear();
      this.canvasManager.markDirty();
      this.updateUI();
    }
  }

  private executeMove(move: Move): boolean {
    const result = this.engine.move(move);
    if (result) {
      this.layout = computeLayout(
        this.canvasManager.logicalWidth,
        this.canvasManager.logicalHeight,
        this.engine.state,
      );
      this.canvasManager.markDirty();
      this.updateUI();
    }
    return result;
  }

  private animateAutoMoves(): void {
    this.canvasManager.markDirty();
  }

  private onFrame(_dt: number): void {
    const timestamp = performance.now();
    const animating = this.animation.update(timestamp);

    if (this.canvasManager.consumeDirty() || animating) {
      this.canvasManager.clear();

      const dragVisual = this.dragDrop.dragVisual;
      const dragState: DragRenderState | null = dragVisual
        ? { cards: dragVisual.cards, x: dragVisual.x, y: dragVisual.y }
        : null;

      this.tableRenderer.render(
        this.canvasManager.ctx,
        this.layout,
        this.engine.state,
        this.animation,
        dragState,
      );
    }
  }

  private onResize(w: number, h: number): void {
    this.layout = computeLayout(w, h, this.engine.state);
    this.regenerateCardCache();
    this.canvasManager.markDirty();
  }

  private regenerateCardCache(): void {
    if (this.layout.cardWidth !== this.lastCacheWidth) {
      this.lastCacheWidth = this.layout.cardWidth;
      this.cardRenderer.generateCache(
        this.layout.cardWidth,
        this.layout.cardHeight,
        this.layout.cardCornerRadius,
      );
    }
  }

  private updateUI(): void {
    this.ui.menuBar.update(
      this.engine.canUndo,
      this.engine.canRedo,
      this.engine.phase === 'playing' && isAutoCompletable(this.engine.state),
    );
    this.ui.statusBar.update(
      this.engine.dealNumber,
      this.engine.state.moveCount,
      this.timer.seconds,
    );
  }
}
