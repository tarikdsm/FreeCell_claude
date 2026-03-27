/**
 * Tracks game statistics across sessions.
 */
export interface GameStats {
  readonly gamesPlayed: number;
  readonly gamesWon: number;
  readonly currentStreak: number;
  readonly bestStreak: number;
  readonly totalMoves: number;
  readonly bestMoves: number; // Fewest moves to win
  readonly bestTime: number; // Fastest win in seconds
}

const STORAGE_KEY = 'freecell-stats';

const DEFAULT_STATS: GameStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  bestStreak: 0,
  totalMoves: 0,
  bestMoves: Infinity,
  bestTime: Infinity,
};

/**
 * Loads statistics from localStorage.
 */
export function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATS;
    return JSON.parse(raw) as GameStats;
  } catch {
    return DEFAULT_STATS;
  }
}

/**
 * Saves statistics to localStorage.
 */
export function saveStats(stats: GameStats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Storage may be unavailable
  }
}

/**
 * Records a game win in the statistics.
 */
export function recordWin(stats: GameStats, moves: number, timeSeconds: number): GameStats {
  const newStreak = stats.currentStreak + 1;
  return {
    gamesPlayed: stats.gamesPlayed + 1,
    gamesWon: stats.gamesWon + 1,
    currentStreak: newStreak,
    bestStreak: Math.max(stats.bestStreak, newStreak),
    totalMoves: stats.totalMoves + moves,
    bestMoves: Math.min(stats.bestMoves, moves),
    bestTime: Math.min(stats.bestTime, timeSeconds),
  };
}

/**
 * Records a game loss in the statistics.
 */
export function recordLoss(stats: GameStats, moves: number): GameStats {
  return {
    ...stats,
    gamesPlayed: stats.gamesPlayed + 1,
    currentStreak: 0,
    totalMoves: stats.totalMoves + moves,
  };
}

/**
 * Returns the win percentage.
 */
export function winPercentage(stats: GameStats): number {
  if (stats.gamesPlayed === 0) return 0;
  return Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
}
