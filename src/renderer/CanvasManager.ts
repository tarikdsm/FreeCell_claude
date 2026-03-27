/**
 * CanvasManager handles the physical canvas element, DPR scaling,
 * resize handling, and the requestAnimationFrame game loop.
 */
export class CanvasManager {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private rafId = 0;
  private dirty = true;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private onRender: ((dt: number) => void) | null = null;
  private onResize: ((w: number, h: number) => void) | null = null;
  private lastTime = 0;
  private _logicalWidth = 0;
  private _logicalHeight = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'game-canvas';
    this.canvas.style.display = 'block';
    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.handleResize();
    window.addEventListener('resize', this.onWindowResize);
  }

  /** Current logical width (CSS pixels) */
  get logicalWidth(): number { return this._logicalWidth; }

  /** Current logical height (CSS pixels) */
  get logicalHeight(): number { return this._logicalHeight; }

  /** Device pixel ratio */
  get dpr(): number { return window.devicePixelRatio || 1; }

  /** Mark canvas as needing redraw */
  markDirty(): void { this.dirty = true; }

  /** Force immediate resize recalculation */
  handleResize(): void {
    const rect = this.container.getBoundingClientRect();
    this._logicalWidth = rect.width;
    this._logicalHeight = rect.height;
    const dpr = this.dpr;

    this.canvas.width = this._logicalWidth * dpr;
    this.canvas.height = this._logicalHeight * dpr;
    this.canvas.style.width = this._logicalWidth + 'px';
    this.canvas.style.height = this._logicalHeight + 'px';

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dirty = true;
    this.onResize?.(this._logicalWidth, this._logicalHeight);
  }

  private onWindowResize = (): void => {
    if (this.resizeTimer !== null) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      this.handleResize();
    }, 100);
  };

  /**
   * Starts the RAF game loop.
   * @param renderFn Called each frame with deltaTime in ms; should check dirty flag
   * @param resizeFn Called on resize with new logical dimensions
   */
  start(renderFn: (dt: number) => void, resizeFn?: (w: number, h: number) => void): void {
    this.onRender = renderFn;
    this.onResize = resizeFn ?? null;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  /** Stops the game loop */
  stop(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  /** Returns true and clears the dirty flag if canvas needs redraw */
  consumeDirty(): boolean {
    if (this.dirty) {
      this.dirty = false;
      return true;
    }
    return false;
  }

  /** Clears the entire canvas */
  clear(): void {
    this.ctx.clearRect(0, 0, this._logicalWidth, this._logicalHeight);
  }

  private loop = (now: number): void => {
    const dt = now - this.lastTime;
    this.lastTime = now;
    this.onRender?.(dt);
    this.rafId = requestAnimationFrame(this.loop);
  };

  /** Cleanup all listeners and stop loop */
  destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.onWindowResize);
    if (this.resizeTimer !== null) clearTimeout(this.resizeTimer);
    this.canvas.remove();
  }
}
