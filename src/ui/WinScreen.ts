/**
 * WinScreen overlay shown when the player wins.
 */
export class WinScreen {
  readonly element: HTMLElement;
  private movesSpan: HTMLSpanElement;
  private timeSpan: HTMLSpanElement;

  constructor(onNewGame: () => void, onReplay: () => void) {
    this.element = document.createElement('div');
    this.element.id = 'win-screen';
    this.element.className = 'modal-overlay hidden';

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog win-dialog';

    const title = document.createElement('h2');
    title.textContent = 'You Win!';
    title.className = 'win-title';

    const stats = document.createElement('div');
    stats.className = 'win-stats';

    this.movesSpan = document.createElement('span');
    this.timeSpan = document.createElement('span');
    stats.append(this.movesSpan, this.timeSpan);

    const btnRow = document.createElement('div');
    btnRow.className = 'modal-buttons';

    const newBtn = document.createElement('button');
    newBtn.className = 'modal-btn modal-btn-primary';
    newBtn.textContent = 'New Game';
    newBtn.addEventListener('click', () => {
      this.hide();
      onNewGame();
    });

    const replayBtn = document.createElement('button');
    replayBtn.className = 'modal-btn modal-btn-cancel';
    replayBtn.textContent = 'Replay';
    replayBtn.addEventListener('click', () => {
      this.hide();
      onReplay();
    });

    btnRow.append(newBtn, replayBtn);
    dialog.append(title, stats, btnRow);
    this.element.appendChild(dialog);
  }

  show(moveCount: number, seconds: number): void {
    this.movesSpan.textContent = `Moves: ${moveCount}`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    this.timeSpan.textContent = `Time: ${mins}:${secs.toString().padStart(2, '0')}`;
    this.element.classList.remove('hidden');
  }

  hide(): void {
    this.element.classList.add('hidden');
  }
}
