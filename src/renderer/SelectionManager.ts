import type { Card } from '../core/entities/Card';
import type { PileLocation } from '../core/entities/Pile';

/**
 * Manages the visual selection state for click-to-move interactions.
 */
export class SelectionManager {
  private _selectedCards: readonly Card[] = [];
  private _selectedFrom: PileLocation | null = null;
  private _dropTargets: PileLocation[] = [];

  /** Currently selected cards */
  get selectedCards(): readonly Card[] { return this._selectedCards; }

  /** Where the selected cards are from */
  get selectedFrom(): PileLocation | null { return this._selectedFrom; }

  /** Valid drop targets for current selection */
  get dropTargets(): readonly PileLocation[] { return this._dropTargets; }

  /** Whether anything is selected */
  get hasSelection(): boolean { return this._selectedCards.length > 0; }

  /** Select cards from a pile */
  select(cards: readonly Card[], from: PileLocation, validTargets: PileLocation[]): void {
    this._selectedCards = cards;
    this._selectedFrom = from;
    this._dropTargets = validTargets;
  }

  /** Clear current selection */
  clear(): void {
    this._selectedCards = [];
    this._selectedFrom = null;
    this._dropTargets = [];
  }

  /** Check if a card is in the current selection */
  isSelected(cardId: number): boolean {
    return this._selectedCards.some((c) => c.id === cardId);
  }

  /** Check if a location is a valid drop target */
  isDropTarget(loc: PileLocation): boolean {
    return this._dropTargets.some((t) => {
      if (t.kind !== loc.kind) return false;
      if (t.kind === 'cascade' && loc.kind === 'cascade') return t.index === loc.index;
      if (t.kind === 'freecell' && loc.kind === 'freecell') return t.index === loc.index;
      if (t.kind === 'foundation' && loc.kind === 'foundation') return t.suit === loc.suit;
      return false;
    });
  }
}
