# FreeCell Algorithms

## 1. Microsoft FreeCell Deal Generation

The Microsoft FreeCell deal algorithm uses a Linear Congruential Generator (LCG).

### LCG Parameters
- **Multiplier (a)**: 214013
- **Increment (c)**: 2531011
- **Modulus (m)**: 2^32 (0x100000000)
- **Seed**: deal number (1-based)

### Algorithm
```
function generateDeal(dealNumber: number): Card[] {
  let seed = dealNumber
  const deck = [0, 1, 2, ..., 51]  // Initialize ordered deck

  for (let i = 0; i < 52; i++) {
    const cardsLeft = 52 - i

    // LCG step
    seed = ((seed * 214013 + 2531011) & 0xFFFFFFFF) >>> 0

    // Extract random value (bits 16-30)
    const rand = (seed >>> 16) & 0x7FFF

    // Select position
    const pos = rand % cardsLeft

    // Fisher-Yates swap
    swap(deck[pos], deck[cardsLeft - 1])
  }

  // Reverse to get dealing order
  deck.reverse()

  // Deal to 8 cascades
  // Cards 0-6 → cascade 0, cards 1-7 → cascade 1, etc.
  // cascades[i % 8].push(deck[i])
  return deck
}
```

### Card Mapping (Microsoft)
- Card index = suit * 13 + rank
- Suits: 0=Clubs, 1=Diamonds, 2=Hearts, 3=Spades
- Ranks: 0=Ace, 1=Two, ..., 12=King

### Known Deals for Validation
- **Deal #1**: First cascade starts with JD, 2S, 9H, JC...
- **Deal #617**: Famous deal (one of the hardest solvable)
- **Deal #11982**: Known unsolvable deal

---

## 2. Move Validation Rules

### Cascade → Cascade
- Source card must be rank-1 of destination top card
- Source card must be opposite color of destination top card
- Empty cascade accepts any card
- Super-move: multiple cards if they form valid descending sequence with alternating colors

### Cascade → Free Cell
- Always valid if there's an empty free cell slot
- Only top card of cascade can be moved

### Cascade → Foundation
- Card must be next rank for its suit (foundation top rank + 1)
- Ace goes on empty foundation of matching suit

### Free Cell → Cascade
- Same rules as cascade → cascade for single card

### Free Cell → Foundation
- Same rules as cascade → foundation

### Free Cell → Free Cell
- Not allowed (no purpose)

---

## 3. Super-Move Calculation

Super-moves allow moving multiple cards at once as a convenience. Internally decomposed into atomic moves.

### Formula
```
maxMovableCards = (1 + emptyFreeCells) * 2^emptyTableauColumns

// If moving TO an empty cascade:
maxMovableCards = (1 + emptyFreeCells) * 2^(emptyTableauColumns - 1)
```

### Decomposition Algorithm
```
function decomposeSupermove(cards[], source, target, freeCells[], emptyCascades[]):
  if cards.length == 1:
    return [Move(source, target)]

  // Use free cells and empty cascades as temporary storage
  // Move cards one by one to temp locations
  // Then move bottom card to target
  // Then move cards back from temp to target
  moves = []
  tempLocations = [...freeCells, ...emptyCascades]

  // Move top N-1 cards to temporary locations
  for i = 0 to cards.length - 2:
    moves.push(Move(source, tempLocations[i]))

  // Move bottom card to target
  moves.push(Move(source, target))

  // Move cards back from temp to target (in reverse)
  for i = cards.length - 2 downto 0:
    moves.push(Move(tempLocations[i], target))

  return moves
```

---

## 4. Auto-Complete Detection

A game is auto-completable when all remaining cards in cascades are in descending order (no card is blocked by a lower-ranked card of the same suit).

```
function isAutoCompletable(state: GameState): boolean {
  // All free cells must be empty OR all cards can go to foundations
  for each cascade:
    for i = 0 to cascade.length - 2:
      if cascade[i].rank < cascade[i+1].rank:
        return false  // Higher card blocked by lower card
  return true
}
```

Simpler check: all cascades have cards in descending rank order (regardless of suit/color).

---

## 5. Safe Auto-Move to Foundations

A card can be safely auto-moved to a foundation when keeping it in play cannot benefit any future move.

### Rule
```
function isSafeAutoMove(card: Card, foundations: Foundations): boolean {
  // Aces and Twos are always safe
  if card.rank <= 2: return true

  // Card is safe if both opposite-color suits have rank-1 on foundation
  const oppositeColor = card.isRed() ? [Clubs, Spades] : [Hearts, Diamonds]

  return oppositeColor.every(suit =>
    foundations[suit] >= card.rank - 1
  )
}
```

### Cascade Execution
After each auto-move, check again for new safe auto-moves (chain reaction).

---

## 6. Win Detection

```
function isWon(state: GameState): boolean {
  return state.foundations.every(f => f === 13)
  // All four foundations have King (rank 13) on top
}
```

---

## 7. Solver Heuristics (Future Reference)

### Beam Search (from macroxue)
- Width-limited search keeping top K states per depth level
- Cost function: `autoPlays + movesEstimated + cardsUnsorted + reserveSize + colorDiff`
- Duplicate detection via hash table
- Move restrictions to prevent cycles

### Cost Components
- **cardsUnsorted**: Cards not in descending order in cascades
- **movesEstimated**: 52 - cardsOnFoundation - 1
- **reserveSize**: Occupied free cells (penalizes reduced flexibility)
- **colorDiff**: |spade - heart - diamond + club| (encourages balanced progress)
