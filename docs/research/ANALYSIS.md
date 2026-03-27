# FreeCell Research Analysis

## Repositories Analyzed

### 1. macroxue/freecell (C Solver) — PRIORITY: MAX
- **Type**: High-performance FreeCell solver using beam search
- **Key strengths**: Compact bit-packed card representation, efficient super-move calculation, Microsoft-compatible deal generation
- **Architecture**: Node-based state with Foundation/Tableau/Reserve + beam search solver with heuristic cost function
- **Deal generation**: Exact Microsoft LCG (214013/2531011), validated against Windows FreeCell

### 2. gitbrent/FreecellJS (JavaScript Web) — PRIORITY: HIGH
- **Type**: Full web-playable FreeCell with HTML5 drag-and-drop
- **Key strengths**: Complete UI with undo/redo via state snapshots, three auto-play modes (none/safe/max), CSS-based animations
- **Architecture**: Global state with snapshot-based undo, DOM-based card rendering with absolute positioning
- **Deal generation**: Microsoft-compatible LCG implementation in JavaScript

### 3. einaregilsson/cards.js (Card Library) — PRIORITY: MEDIUM
- **Type**: Generic card game rendering library
- **Key strengths**: Card sprite/visual management, pile layout systems
- **Note**: Could not be fully analyzed (path conflict), but patterns extracted from FreecellJS cover similar ground

### 4. adrianeyre/free-cell (TypeScript/React) — REFERENCE
- **Type**: React-based FreeCell with TypeScript types
- **Key strengths**: TypeScript patterns for Card/Pile/GameState typing

### 5. GnikDroy/freecell (Web) — PRIORITY: MEDIUM
- **Type**: Another web FreeCell implementation
- **Key strengths**: Auto-move algorithms, safe-move detection patterns

---

## Key Algorithms Extracted (Pseudocode)

### Microsoft Deal Generation (LCG)
```
seed = deal_number
for i = 0 to 51:
  seed = (seed * 214013 + 2531011) & 0xFFFFFFFF
  rand = (seed >> 16) & 0x7FFF
  pos = rand % (52 - i)
  swap(deck[pos], deck[51 - i])
reverse(deck)
deal to 8 cascades: card[i] → cascade[i % 8]
```

### Super-Move Formula
```
maxCards = (1 + freeCells) * 2^emptyCascades
// If target is empty cascade, emptyCascades decreases by 1
```

### Safe Auto-Move
```
canAutoMove(card):
  if rank <= 2: return true  // Aces and 2s always safe
  both opposite-color suits must have (rank-1) on foundation
```

---

## Design Decisions

### ADOPTED:
1. **Card encoding**: `(suit << 4) | rank` — compact, fast comparisons (from macroxue)
2. **Microsoft LCG deal generation**: Exact compatibility required (from macroxue + FreecellJS)
3. **Immutable GameState**: New state on every move (inspired by macroxue's Node)
4. **Super-move decomposition**: Calculate max, decompose into atomic moves (from macroxue)
5. **Three auto-play modes**: none/safe/max (from FreecellJS)
6. **Snapshot-based undo**: Full state snapshots for reliable undo/redo (from FreecellJS)
7. **Canvas rendering**: For smooth animations (improvement over FreecellJS DOM approach)

### REJECTED:
1. **Global mutable state** (FreecellJS) — Using immutable state instead for testability
2. **DOM-based card rendering** (FreecellJS) — Canvas for better animation performance
3. **Approximate hash equality** (macroxue solver) — Not needed for game UI, only for solver
4. **Bit-packed tableau** (macroxue) — Too complex for UI needs, only beneficial for solver

### Decision Mapping:
| Feature | Source | Rationale |
|---------|--------|-----------|
| Card byte encoding | macroxue | Compact, fast bit ops |
| LCG deal gen | macroxue + FreecellJS | Microsoft compatibility |
| Immutable state | macroxue (Node pattern) | Testability, undo support |
| Super-move formula | macroxue | Proven correct |
| Safe auto-move | FreecellJS | Best UX balance |
| Canvas rendering | Our decision | Performance over DOM |
| TypeScript strict | adrianeyre | Type safety |
