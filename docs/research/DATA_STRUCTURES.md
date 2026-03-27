# FreeCell Data Structures Comparison

## Card Representation

| Repository | Encoding | Bits | Details |
|-----------|----------|------|---------|
| macroxue | `suit + (rank << 2)` | 8 bits | suit=bits 0-1, rank=bits 2-7 |
| FreecellJS | `(rank << 2) + suit` | 6 bits | Same as above, JS number |
| GnikDroy | Same as FreecellJS | 6 bits | Shared codebase |

### Our Choice: `(suit << 4) | rank`
- **Encoding**: suit in bits 4-5, rank in bits 0-3
- **Range**: 0-63 (6 bits effective, stored as number)
- **Rationale**: Rank in low bits makes rank comparison a simple mask. Suit in high bits groups cards by suit for foundation operations.
- **Methods**: `color()`, `isRed()`, `isBlack()`, `suit()`, `rank()`, `equals()`, `canStackOn()`

---

## Pile/Cascade Representation

| Repository | Structure | Mutability |
|-----------|-----------|------------|
| macroxue | Tableau class with sorted/unsorted counts + bit stack | Mutable, optimized for solver |
| FreecellJS | Plain JS array `tableaus[col][row]` | Mutable global arrays |
| adrianeyre | React state array | Immutable via React patterns |

### Our Choice: `ReadonlyArray<Card>`
- Simple immutable array per cascade
- No bit-packing (not needed for game UI, only for solver)
- 8 cascades as `ReadonlyArray<ReadonlyArray<Card>>`
- **Rationale**: Simplicity + immutability. Performance is not a concern for UI game logic. Solver can use optimized structures later.

---

## Free Cell Representation

| Repository | Structure |
|-----------|-----------|
| macroxue | `Array<Card, 4>` with size counter |
| FreecellJS | `reserves[]` array + `unpacked_reserves[]` sparse tracker |

### Our Choice: `Readonly<[Card | null, Card | null, Card | null, Card | null]>`
- Fixed 4-element tuple
- `null` represents empty slot
- **Rationale**: Fixed size makes it clear there are exactly 4 slots. Tuple type provides position awareness.

---

## Foundation Representation

| Repository | Structure |
|-----------|-----------|
| macroxue | `Foundation` class with `size_` (0-13) |
| FreecellJS | `foundations[suit][]` — full card arrays |

### Our Choice: `Readonly<Record<Suit, number>>`
- Maps suit → top rank (0 = empty, 1 = Ace, ..., 13 = King)
- Only stores the count/rank since foundations are deterministic (A, 2, 3, ..., K)
- **Rationale**: Foundations are always sequential, so storing just the top rank is sufficient and compact.

---

## GameState

### Our Choice:
```typescript
interface GameState {
  readonly cascades: ReadonlyArray<ReadonlyArray<Card>>  // 8 cascades
  readonly freeCells: Readonly<[Card | null, Card | null, Card | null, Card | null]>
  readonly foundations: Readonly<Record<Suit, number>>    // suit → top rank
  readonly moveCount: number
}
```

- **Immutable**: Every operation returns a new GameState
- **Hashable**: Can derive hash from state for solver dedup
- **Testable**: Pure functions operate on GameState without side effects

---

## Move Representation

### Our Choice:
```typescript
interface Move {
  readonly type: MoveType
  readonly from: PileLocation
  readonly to: PileLocation
  readonly cards: ReadonlyArray<Card>  // For super-moves
}

type MoveType = 'cascade-to-cascade' | 'cascade-to-freecell' | 'cascade-to-foundation'
  | 'freecell-to-cascade' | 'freecell-to-foundation'

type PileLocation =
  | { kind: 'cascade'; index: number }
  | { kind: 'freecell'; index: number }
  | { kind: 'foundation'; suit: Suit }
```

- Discriminated union for type safety
- Includes cards array for super-move support
- Fully serializable for undo/redo and replay
