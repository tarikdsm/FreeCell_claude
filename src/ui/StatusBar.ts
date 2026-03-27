/**
 * StatusBar displays game info: deal number, move count, timer.
 */
export class StatusBar {
  readonly element: HTMLElement;
  private dealSpan: HTMLSpanElement;
  private movesSpan: HTMLSpanElement;
  private timerSpan: HTMLSpanElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.id = 'status-bar';
    this.element.className = 'status-bar';

    this.dealSpan = document.createElement('span');
    this.dealSpan.className = 'status-deal';

    this.movesSpan = document.createElement('span');
    this.movesSpan.className = 'status-moves';

    this.timerSpan = document.createElement('span');
    this.timerSpan.className = 'status-timer';

    this.element.append(this.dealSpan, this.movesSpan, this.timerSpan);
  }

  update(dealNumber: number, moveCount: number, seconds: number): void {
    this.dealSpan.textContent = `Game #${dealNumber}`;
    this.movesSpan.textContent = `Moves: ${moveCount}`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    this.timerSpan.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
