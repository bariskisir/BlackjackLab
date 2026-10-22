import type {
  ActionStats,
  Card,
  CellStats,
  ChartAction,
  ChartRow,
  ChartStats,
  HandValue,
} from "./types";

export const DEALER_UPCARDS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export const CHART_ROWS: ChartRow[] = [
  { id: "hard-17", label: "17+", kind: "hard" },
  { id: "hard-16", label: "16", kind: "hard" },
  { id: "hard-15", label: "15", kind: "hard" },
  { id: "hard-14", label: "14", kind: "hard" },
  { id: "hard-13", label: "13", kind: "hard" },
  { id: "hard-12", label: "12", kind: "hard" },
  { id: "hard-11", label: "11", kind: "hard" },
  { id: "hard-10", label: "10", kind: "hard" },
  { id: "hard-9", label: "9", kind: "hard" },
  { id: "hard-8", label: "8", kind: "hard" },
  { id: "soft-20", label: "A,9", kind: "soft" },
  { id: "soft-19", label: "A,8", kind: "soft" },
  { id: "soft-18", label: "A,7", kind: "soft" },
  { id: "soft-17", label: "A,6", kind: "soft" },
  { id: "soft-16", label: "A,5", kind: "soft" },
  { id: "soft-15", label: "A,4", kind: "soft" },
  { id: "soft-14", label: "A,3", kind: "soft" },
  { id: "soft-13", label: "A,2", kind: "soft" },
  { id: "pair-11", label: "A,A", kind: "pair" },
  { id: "pair-8", label: "8,8", kind: "pair" },
  { id: "pair-7", label: "7,7", kind: "pair" },
  { id: "pair-6", label: "6,6", kind: "pair" },
  { id: "pair-5", label: "5,5", kind: "pair" },
  { id: "pair-4", label: "4,4", kind: "pair" },
  { id: "pair-3", label: "3,3", kind: "pair" },
  { id: "pair-2", label: "2,2", kind: "pair" },
  { id: "pair-10", label: "10,10", kind: "pair" },
];

export const CHART_ROW_MAP = new Map(CHART_ROWS.map((row) => [row.id, row]));
export const CHART_CELL_COUNT = CHART_ROWS.length * DEALER_UPCARDS.length;
export const ACTIONS: ChartAction[] = ["hit", "stand", "double", "split"];
export const BASIC_ACTIONS: ChartAction[] = ["hit", "stand", "double"];

export const ACTION_LABELS: Record<ChartAction, string> = {
  hit: "Hit",
  stand: "Stand",
  double: "Double",
  split: "Split",
};

export const ACTION_SHORT_LABELS: Record<ChartAction, string> = {
  hit: "H",
  stand: "S",
  double: "D",
  split: "SP",
};

export const DEALER_LABELS: Record<number, string> = {
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "A",
};

export function cardKey(rowId: string, dealerUpcard: number): string {
  return `${rowId}:${dealerUpcard}`;
}

export function createActionStats(): ActionStats {
  return { trials: 0, wins: 0, pushes: 0, losses: 0, net: 0, sumSquares: 0 };
}

export function createCellStats(): CellStats {
  return {
    hit: createActionStats(),
    stand: createActionStats(),
    double: createActionStats(),
    split: createActionStats(),
  };
}

export function createEmptyChartStats(): ChartStats {
  const stats: ChartStats = {};
  for (const row of CHART_ROWS) {
    for (const dealer of DEALER_UPCARDS) {
      stats[cardKey(row.id, dealer)] = createCellStats();
    }
  }
  return stats;
}

export function cloneChartStats(stats: ChartStats): ChartStats {
  const clone: ChartStats = {};
  for (const key of Object.keys(stats)) {
    const cell = stats[key];
    clone[key] = {
      hit: { ...cell.hit },
      stand: { ...cell.stand },
      double: { ...cell.double },
      split: { ...cell.split },
    };
  }
  return clone;
}

export function getRowActions(row: ChartRow): ChartAction[] {
  return row.kind === "pair" ? ACTIONS : BASIC_ACTIONS;
}

export function getHandValue(cards: Card[]): HandValue {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.rank === "A") {
      aces += 1;
      total += 1;
    } else {
      total += card.value;
    }
  }
  let softAces = aces;
  while (softAces > 0 && total + 10 <= 21) {
    total += 10;
    softAces -= 1;
  }
  return { total, soft: softAces < aces };
}

export function isPair(cards: Card[]): boolean {
  return cards.length === 2 && cards[0].value === cards[1].value;
}

export function getChartRow(cards: Card[], canSplit: boolean): ChartRow | null {
  if (canSplit && isPair(cards)) {
    const pairValue = cards[0].rank === "A" ? 11 : cards[0].value;
    return CHART_ROW_MAP.get(`pair-${pairValue}`) ?? null;
  }

  const value = getHandValue(cards);
  if (value.total > 21) {
    return null;
  }

  if (value.soft) {
    const softTotal = Math.min(20, Math.max(13, value.total));
    return CHART_ROW_MAP.get(`soft-${softTotal}`) ?? null;
  }

  if (value.total >= 17) {
    return CHART_ROW_MAP.get("hard-17") ?? null;
  }

  if (value.total >= 8) {
    return CHART_ROW_MAP.get(`hard-${value.total}`) ?? null;
  }

  return CHART_ROW_MAP.get("hard-8") ?? null;
}

export function getWinRate(stats: ActionStats): number {
  return stats.trials === 0 ? 0 : stats.wins / stats.trials;
}

export function getPushRate(stats: ActionStats): number {
  return stats.trials === 0 ? 0 : stats.pushes / stats.trials;
}

export function getLossRate(stats: ActionStats): number {
  return stats.trials === 0 ? 0 : stats.losses / stats.trials;
}

export function getMeanNet(stats: ActionStats): number {
  return stats.trials === 0 ? 0 : stats.net / stats.trials;
}

export function getActionValue(stats: ActionStats): number {
  if (stats.trials === 0) return Number.NEGATIVE_INFINITY;
  const mean = stats.net / stats.trials;
  const shrink = 2 / (stats.trials + 2);
  return mean * (1 - shrink);
}

export type ActionOrderMap = Record<string, ChartAction[]>;

export function buildActionOrder(stats: ChartStats): ActionOrderMap {
  const order: ActionOrderMap = {};
  for (const row of CHART_ROWS) {
    const actions = getRowActions(row);
    for (const dealer of DEALER_UPCARDS) {
      const key = cardKey(row.id, dealer);
      const cell = stats[key];
      if (!cell) continue;
      order[key] = actions
        .filter((action) => cell[action].trials > 0)
        .sort((a, b) => getActionValue(cell[b]) - getActionValue(cell[a]));
    }
  }
  return order;
}

export interface CellLeader {
  action: ChartAction;
  stats: ActionStats;
  confidence: number;
}

export function getCellLeader(
  cell: CellStats,
  row: ChartRow,
  minTrials = 4,
): CellLeader | null {
  let leader: ActionStats | null = null;
  let leaderAction: ChartAction | null = null;
  let bestValue = Number.NEGATIVE_INFINITY;

  for (const action of getRowActions(row)) {
    const stats = cell[action];
    if (stats.trials < minTrials) continue;
    const value = getActionValue(stats);
    if (value > bestValue) {
      bestValue = value;
      leader = stats;
      leaderAction = action;
    }
  }

  if (!leader || !leaderAction) return null;
  return {
    action: leaderAction,
    stats: leader,
    confidence: Math.min(1, leader.trials / 80),
  };
}

export function getBestActionByEv(cell: CellStats, row: ChartRow): ChartAction | null {
  let best: ChartAction | null = null;
  let bestValue = Number.NEGATIVE_INFINITY;
  for (const action of getRowActions(row)) {
    const stats = cell[action];
    if (stats.trials === 0) continue;
    const value = getActionValue(stats);
    if (value > bestValue) {
      bestValue = value;
      best = action;
    }
  }
  return best;
}

export function getCellTotals(cell: CellStats): number {
  return ACTIONS.reduce((total, action) => total + cell[action].trials, 0);
}

export function getCoverage(stats: ChartStats): number {
  let count = 0;
  for (const row of CHART_ROWS) {
    for (const dealer of DEALER_UPCARDS) {
      const cell = stats[cardKey(row.id, dealer)];
      if (cell && getCellTotals(cell) > 0) count += 1;
    }
  }
  return count;
}

export function getTotalActions(stats: ChartStats): number {
  let count = 0;
  for (const row of CHART_ROWS) {
    for (const dealer of DEALER_UPCARDS) {
      const cell = stats[cardKey(row.id, dealer)];
      if (cell) count += getCellTotals(cell);
    }
  }
  return count;
}

export function getResolvedCount(stats: ActionStats): number {
  return stats.wins + stats.losses;
}
