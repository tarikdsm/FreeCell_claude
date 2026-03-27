import type { Card } from '../core/entities/Card';
import type { CardRenderer } from './CardRenderer';

/** Easing function: takes progress 0→1, returns eased value 0→1 */
export type EasingFn = (t: number) => number;

export const Easing = {
  linear: (t: number): number => t,
  easeInQuad: (t: number): number => t * t,
  easeOutQuad: (t: number): number => t * (2 - t),
  easeInOutQuad: (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeOutCubic: (t: number): number => (--t) * t * t + 1,
  easeInOutCubic: (t: number): number => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeOutBack: (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeOutBounce: (t: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
} as const;

interface Animation {
  id: string;
  card: Card;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
  duration: number;
  easing: EasingFn;
  onComplete?: () => void;
}

/**
 * AnimationEngine manages card movement animations with easing and sequencing.
 */
export class AnimationEngine {
  private animations: Animation[] = [];
  private nextId = 0;
  private now = 0;
  private onDirty: (() => void) | null = null;

  /** Set callback to mark canvas dirty when animations are active */
  setDirtyCallback(cb: () => void): void {
    this.onDirty = cb;
  }

  /** Update animation clock. Call every frame with timestamp from performance.now() */
  update(timestamp: number): boolean {
    this.now = timestamp;
    let anyActive = false;
    const completed: Animation[] = [];

    for (const anim of this.animations) {
      const elapsed = this.now - anim.startTime;
      if (elapsed >= anim.duration) {
        completed.push(anim);
      } else {
        anyActive = true;
      }
    }

    // Process completed animations
    for (const anim of completed) {
      this.animations = this.animations.filter((a) => a.id !== anim.id);
      anim.onComplete?.();
    }

    if (anyActive || completed.length > 0) {
      this.onDirty?.();
    }

    return anyActive;
  }

  /** Get IDs of all cards currently being animated */
  getAnimatingCardIds(): Set<number> {
    const ids = new Set<number>();
    for (const anim of this.animations) {
      ids.add(anim.card.id);
    }
    return ids;
  }

  /** Whether any animations are active */
  get isAnimating(): boolean {
    return this.animations.length > 0;
  }

  /** Render all active animations */
  renderAnimations(ctx: CanvasRenderingContext2D, cardRenderer: CardRenderer, cardWidth: number, cardHeight: number): void {
    for (const anim of this.animations) {
      const elapsed = this.now - anim.startTime;
      const progress = Math.min(1, elapsed / anim.duration);
      const eased = anim.easing(progress);

      const x = anim.fromX + (anim.toX - anim.fromX) * eased;
      const y = anim.fromY + (anim.toY - anim.fromY) * eased;

      cardRenderer.drawCard(ctx, anim.card, x, y, cardWidth, cardHeight);
    }
  }

  /**
   * Animate a card from one position to another.
   * @returns Promise that resolves when animation completes
   */
  animate(
    card: Card,
    fromX: number, fromY: number,
    toX: number, toY: number,
    duration: number,
    easing: EasingFn = Easing.easeOutCubic,
    delay = 0,
  ): Promise<void> {
    return new Promise((resolve) => {
      const id = `anim-${this.nextId++}`;
      const anim: Animation = {
        id,
        card,
        fromX, fromY,
        toX, toY,
        startTime: this.now + delay,
        duration,
        easing,
        onComplete: resolve,
      };
      this.animations.push(anim);
      this.onDirty?.();
    });
  }

  /** Cancel all animations and call their onComplete */
  cancelAll(): void {
    const anims = [...this.animations];
    this.animations = [];
    for (const anim of anims) {
      anim.onComplete?.();
    }
  }

  /**
   * Create a shake animation (horizontal oscillation at a position).
   */
  shake(card: Card, x: number, y: number, amplitude: number = 5, duration: number = 200): Promise<void> {
    return new Promise((resolve) => {
      const id = `shake-${this.nextId++}`;
      // Abuse the animation system: animate horizontally with custom from/to
      // that creates a shake effect via easing
      const shakeEasing = (t: number): number => {
        return Math.sin(t * Math.PI * 6) * (1 - t); // 3 cycles, decaying
      };
      const anim: Animation = {
        id,
        card,
        fromX: x,
        fromY: y,
        toX: x + amplitude,
        toY: y,
        startTime: this.now,
        duration,
        easing: shakeEasing,
        onComplete: resolve,
      };
      this.animations.push(anim);
      this.onDirty?.();
    });
  }
}
