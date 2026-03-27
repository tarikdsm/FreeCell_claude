import type { Card } from '../core/entities/Card';
import { ALL_SUITS, isRedSuit, Suit } from '../core/entities/Suit';
import { ALL_RANKS, Rank, rankSymbol } from '../core/entities/Rank';
import { cardOf } from '../core/entities/Card';


/** Unicode suit symbols */
const SUIT_SYMBOLS: Record<number, string> = {
  [Suit.Clubs]: '\u2663',
  [Suit.Diamonds]: '\u2666',
  [Suit.Hearts]: '\u2665',
  [Suit.Spades]: '\u2660',
};

const CARD_RED = '#CC0000';
const CARD_BLACK = '#1A1A1A';
const CARD_BG = '#FFFFFF';
const CARD_BACK_BG = '#1B3A5C';

/**
 * CardRenderer generates and caches all 52 card face images plus one card back
 * as offscreen canvases for high-performance rendering.
 */
export class CardRenderer {
  private cache = new Map<number, HTMLCanvasElement>();
  private backCache: HTMLCanvasElement | null = null;
  private _cardWidth = 0;
  private _cardHeight = 0;
  private _cornerRadius = 0;

  get cardWidth(): number { return this._cardWidth; }
  get cardHeight(): number { return this._cardHeight; }

  /**
   * Generates cached images for all 52 cards at the given dimensions.
   * Call this once at startup and again if card size changes.
   */
  generateCache(cardWidth: number, cardHeight: number, cornerRadius: number): void {
    this._cardWidth = cardWidth;
    this._cardHeight = cardHeight;
    this._cornerRadius = cornerRadius;
    this.cache.clear();

    for (const suit of ALL_SUITS) {
      for (const rank of ALL_RANKS) {
        const card = cardOf(suit, rank);
        const canvas = this.renderCardToCanvas(card);
        this.cache.set(card.id, canvas);
      }
    }

    this.backCache = this.renderCardBack();
  }

  /** Draws a cached card face at the given position */
  drawCard(ctx: CanvasRenderingContext2D, card: Card, x: number, y: number, w: number, h: number): void {
    const cached = this.cache.get(card.id);
    if (cached) {
      ctx.drawImage(cached, x, y, w, h);
    }
  }

  /** Draws the card back at the given position */
  drawCardBack(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    if (this.backCache) {
      ctx.drawImage(this.backCache, x, y, w, h);
    }
  }

  /** Draws a highlighted card (selected glow) */
  drawCardHighlight(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.save();
    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2.5;
    this.roundRect(ctx, x, y, w, h, this._cornerRadius);
    ctx.stroke();
    ctx.restore();
  }

  /** Draws a valid drop target indicator */
  drawDropTarget(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.save();
    ctx.shadowColor = 'rgba(76, 175, 80, 0.7)';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 3]);
    this.roundRect(ctx, x, y, w, h, this._cornerRadius);
    ctx.stroke();
    ctx.restore();
  }

  private renderCardToCanvas(card: Card): HTMLCanvasElement {
    const w = this._cardWidth;
    const h = this._cardHeight;
    // Render at 2x for sharpness
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);

    const r = this._cornerRadius;
    const color = isRedSuit(card.suit) ? CARD_RED : CARD_BLACK;
    const suitSym = SUIT_SYMBOLS[card.suit] ?? '';
    const rankSym = rankSymbol(card.rank);

    // Card background
    ctx.fillStyle = CARD_BG;
    this.roundRect(ctx, 0, 0, w, h, r);
    ctx.fill();

    // Subtle border
    ctx.strokeStyle = '#C0C0C0';
    ctx.lineWidth = 0.5;
    this.roundRect(ctx, 0, 0, w, h, r);
    ctx.stroke();

    ctx.fillStyle = color;
    const fontSize = Math.floor(w * 0.22);
    const smallFont = Math.floor(w * 0.16);
    const margin = Math.floor(w * 0.08);

    // Top-left index
    ctx.font = `bold ${fontSize}px Georgia, "Times New Roman", serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(rankSym, margin, margin);

    ctx.font = `${smallFont}px Georgia, "Times New Roman", serif`;
    ctx.fillText(suitSym, margin, margin + fontSize);

    // Bottom-right index (rotated 180°)
    ctx.save();
    ctx.translate(w, h);
    ctx.rotate(Math.PI);
    ctx.font = `bold ${fontSize}px Georgia, "Times New Roman", serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(rankSym, margin, margin);
    ctx.font = `${smallFont}px Georgia, "Times New Roman", serif`;
    ctx.fillText(suitSym, margin, margin + fontSize);
    ctx.restore();

    // Center pips or face letter
    this.drawCenterContent(ctx, card, w, h, color, suitSym);

    return canvas;
  }

  private drawCenterContent(
    ctx: CanvasRenderingContext2D,
    card: Card,
    w: number,
    h: number,
    color: string,
    suitSym: string,
  ): void {
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cx = w / 2;
    const cy = h / 2;

    if (card.rank >= Rank.Jack) {
      // Face cards: large letter
      const faceSize = Math.floor(w * 0.45);
      ctx.font = `bold ${faceSize}px Georgia, "Times New Roman", serif`;
      ctx.fillText(rankSymbol(card.rank), cx, cy);
      // Small suit below
      const smallSuit = Math.floor(w * 0.18);
      ctx.font = `${smallSuit}px Georgia, "Times New Roman", serif`;
      ctx.fillText(suitSym, cx, cy + faceSize * 0.4);
    } else if (card.rank === Rank.Ace) {
      // Ace: large suit symbol
      const aceSize = Math.floor(w * 0.5);
      ctx.font = `${aceSize}px Georgia, "Times New Roman", serif`;
      ctx.fillText(suitSym, cx, cy);
    } else {
      // Number cards: pip layout
      this.drawPips(ctx, card.rank, w, h, suitSym);
    }
  }

  private drawPips(
    ctx: CanvasRenderingContext2D,
    rank: Rank,
    w: number,
    h: number,
    suitSym: string,
  ): void {
    const pipSize = Math.floor(w * 0.2);
    ctx.font = `${pipSize}px Georgia, "Times New Roman", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cx = w / 2;
    const lx = w * 0.3;
    const rx = w * 0.7;

    // Vertical positions (relative to card height)
    const t1 = h * 0.22;
    const t2 = h * 0.35;
    const m = h * 0.5;
    const b2 = h * 0.65;
    const b1 = h * 0.78;

    const positions = this.getPipPositions(rank, lx, cx, rx, t1, t2, m, b2, b1);
    for (const pos of positions) {
      ctx.fillText(suitSym, pos[0], pos[1]);
    }
  }

  private getPipPositions(
    rank: Rank,
    lx: number, cx: number, rx: number,
    t1: number, t2: number, m: number, b2: number, b1: number,
  ): Array<[number, number]> {
    switch (rank) {
      case Rank.Two: return [[cx, t1], [cx, b1]];
      case Rank.Three: return [[cx, t1], [cx, m], [cx, b1]];
      case Rank.Four: return [[lx, t1], [rx, t1], [lx, b1], [rx, b1]];
      case Rank.Five: return [[lx, t1], [rx, t1], [cx, m], [lx, b1], [rx, b1]];
      case Rank.Six: return [[lx, t1], [rx, t1], [lx, m], [rx, m], [lx, b1], [rx, b1]];
      case Rank.Seven: return [[lx, t1], [rx, t1], [cx, t2], [lx, m], [rx, m], [lx, b1], [rx, b1]];
      case Rank.Eight: return [[lx, t1], [rx, t1], [cx, t2], [lx, m], [rx, m], [cx, b2], [lx, b1], [rx, b1]];
      case Rank.Nine: return [[lx, t1], [rx, t1], [lx, t2], [rx, t2], [cx, m], [lx, b2], [rx, b2], [lx, b1], [rx, b1]];
      case Rank.Ten: return [[lx, t1], [rx, t1], [cx, t1 + (t2 - t1) * 0.5], [lx, t2], [rx, t2], [lx, b2], [rx, b2], [cx, b1 - (b1 - b2) * 0.5], [lx, b1], [rx, b1]];
      default: return [[cx, m]];
    }
  }

  private renderCardBack(): HTMLCanvasElement {
    const w = this._cardWidth;
    const h = this._cardHeight;
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);

    const r = this._cornerRadius;

    // Background
    ctx.fillStyle = CARD_BACK_BG;
    this.roundRect(ctx, 0, 0, w, h, r);
    ctx.fill();

    // Inner border
    const inset = Math.floor(w * 0.06);
    ctx.strokeStyle = '#8B7D3C';
    ctx.lineWidth = 1;
    this.roundRect(ctx, inset, inset, w - inset * 2, h - inset * 2, r * 0.7);
    ctx.stroke();

    // Subtle pattern (diamond grid)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 0.5;
    const step = Math.floor(w * 0.15);
    for (let i = -h; i < w + h; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i + h, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }

    // Outer border
    ctx.strokeStyle = '#0F2A45';
    ctx.lineWidth = 1;
    this.roundRect(ctx, 0, 0, w, h, r);
    ctx.stroke();

    return canvas;
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
