/**
 * GameSelector modal dialog for entering a specific deal number.
 */
export class GameSelector {
  readonly element: HTMLElement;
  private input: HTMLInputElement;
  private onSelect: ((dealNumber: number) => void) | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.id = 'game-selector';
    this.element.className = 'modal-overlay hidden';

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';

    const title = document.createElement('h2');
    title.textContent = 'Select Game';

    const label = document.createElement('label');
    label.textContent = 'Deal number (1 - 1000000):';
    label.htmlFor = 'deal-input';

    this.input = document.createElement('input');
    this.input.id = 'deal-input';
    this.input.type = 'number';
    this.input.min = '1';
    this.input.max = '1000000';
    this.input.placeholder = 'e.g. 11982';
    this.input.className = 'modal-input';

    const btnRow = document.createElement('div');
    btnRow.className = 'modal-buttons';

    const playBtn = document.createElement('button');
    playBtn.className = 'modal-btn modal-btn-primary';
    playBtn.textContent = 'Play';
    playBtn.addEventListener('click', () => this.submit());

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-btn modal-btn-cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this.hide());

    btnRow.append(playBtn, cancelBtn);

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submit();
      if (e.key === 'Escape') this.hide();
    });

    dialog.append(title, label, this.input, btnRow);
    this.element.appendChild(dialog);

    // Close on overlay click
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) this.hide();
    });
  }

  show(callback: (dealNumber: number) => void): void {
    this.onSelect = callback;
    this.input.value = '';
    this.element.classList.remove('hidden');
    this.input.focus();
  }

  hide(): void {
    this.element.classList.add('hidden');
    this.onSelect = null;
  }

  private submit(): void {
    const val = parseInt(this.input.value, 10);
    if (val >= 1 && val <= 1000000) {
      this.onSelect?.(val);
      this.hide();
    } else {
      this.input.classList.add('shake');
      setTimeout(() => this.input.classList.remove('shake'), 400);
    }
  }
}
