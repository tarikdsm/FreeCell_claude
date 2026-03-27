import { MenuBar, type MenuBarCallbacks } from './MenuBar';
import { StatusBar } from './StatusBar';
import { GameSelector } from './GameSelector';
import { WinScreen } from './WinScreen';

/**
 * Callbacks from UI to the application layer.
 */
export interface UICallbacks extends MenuBarCallbacks {
  onReplay(): void;
  onSelectDeal(dealNumber: number): void;
}

/**
 * UIManager creates and manages all DOM overlay elements.
 */
export class UIManager {
  readonly menuBar: MenuBar;
  readonly statusBar: StatusBar;
  readonly gameSelector: GameSelector;
  readonly winScreen: WinScreen;

  constructor(root: HTMLElement, callbacks: UICallbacks) {
    this.menuBar = new MenuBar({
      onNewGame: callbacks.onNewGame,
      onSelectGame: () => this.gameSelector.show((n) => callbacks.onSelectDeal(n)),
      onUndo: callbacks.onUndo,
      onRedo: callbacks.onRedo,
      onAutoComplete: callbacks.onAutoComplete,
    });

    this.statusBar = new StatusBar();
    this.gameSelector = new GameSelector();
    this.winScreen = new WinScreen(callbacks.onNewGame, callbacks.onReplay);

    // Assemble DOM: menu at top, canvas container in middle, status at bottom
    root.appendChild(this.menuBar.element);

    const canvasContainer = document.createElement('div');
    canvasContainer.id = 'canvas-container';
    root.appendChild(canvasContainer);

    root.appendChild(this.statusBar.element);
    root.appendChild(this.gameSelector.element);
    root.appendChild(this.winScreen.element);
  }

  /** Returns the canvas container for the CanvasManager to attach to */
  getCanvasContainer(): HTMLElement {
    return document.getElementById('canvas-container')!;
  }
}
