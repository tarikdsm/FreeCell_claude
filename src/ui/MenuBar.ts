/**
 * MenuBar provides the top navigation bar with game controls.
 */
export interface MenuBarCallbacks {
  onNewGame(): void;
  onSelectGame(): void;
  onUndo(): void;
  onRedo(): void;
  onAutoComplete(): void;
}

export class MenuBar {
  readonly element: HTMLElement;
  private undoBtn: HTMLButtonElement;
  private redoBtn: HTMLButtonElement;
  private autoCompleteBtn: HTMLButtonElement;

  constructor(callbacks: MenuBarCallbacks) {
    this.element = document.createElement('div');
    this.element.id = 'menu-bar';
    this.element.className = 'menu-bar';

    // Left group: New Game + Select
    const leftGroup = document.createElement('div');
    leftGroup.className = 'menu-group';

    const newGameBtn = this.createButton('New Game', 'btn-new-game', () => callbacks.onNewGame());
    const selectBtn = this.createButton('Select #', 'btn-select', () => callbacks.onSelectGame());
    leftGroup.append(newGameBtn, selectBtn);

    // Center: Title
    const title = document.createElement('div');
    title.className = 'menu-title';
    title.textContent = 'FreeCell';

    // Right group: Undo, Redo, Auto-complete
    const rightGroup = document.createElement('div');
    rightGroup.className = 'menu-group';

    this.undoBtn = this.createButton('Undo', 'btn-undo', () => callbacks.onUndo());
    this.redoBtn = this.createButton('Redo', 'btn-redo', () => callbacks.onRedo());
    this.autoCompleteBtn = this.createButton('Auto', 'btn-auto', () => callbacks.onAutoComplete());

    rightGroup.append(this.undoBtn, this.redoBtn, this.autoCompleteBtn);

    this.element.append(leftGroup, title, rightGroup);
  }

  /** Update button enabled states */
  update(canUndo: boolean, canRedo: boolean, canAutoComplete: boolean): void {
    this.undoBtn.disabled = !canUndo;
    this.redoBtn.disabled = !canRedo;
    this.autoCompleteBtn.disabled = !canAutoComplete;
  }

  private createButton(text: string, className: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `menu-btn ${className}`;
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
  }
}
