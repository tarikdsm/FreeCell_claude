/**
 * Simple game timer that tracks elapsed seconds.
 */
export class Timer {
  private startTime = 0;
  private elapsed = 0;
  private running = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onTick: ((seconds: number) => void) | null = null;

  /**
   * Starts the timer.
   */
  start(onTick?: (seconds: number) => void): void {
    if (this.running) return;
    this.running = true;
    this.startTime = Date.now() - this.elapsed * 1000;
    this.onTick = onTick ?? null;

    this.intervalId = setInterval(() => {
      this.elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      this.onTick?.(this.elapsed);
    }, 1000);
  }

  /**
   * Pauses the timer.
   */
  pause(): void {
    if (!this.running) return;
    this.running = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.elapsed = Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Resets the timer to zero.
   */
  reset(): void {
    this.pause();
    this.elapsed = 0;
    this.startTime = 0;
  }

  /** Current elapsed time in seconds */
  get seconds(): number {
    if (this.running) {
      return Math.floor((Date.now() - this.startTime) / 1000);
    }
    return this.elapsed;
  }

  /** Whether the timer is currently running */
  get isRunning(): boolean {
    return this.running;
  }
}
