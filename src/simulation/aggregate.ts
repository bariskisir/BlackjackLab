import { ACTIONS, createEmptyChartStats } from "./chart";
import type {
  ChartStats,
  SimulationTotals,
  StrategyEvaluation,
  TrainingResult,
} from "./types";

export function splitRoundCounts(total: number, parts: number): number[] {
  const count = Math.max(1, Math.min(Math.floor(parts), Math.floor(total)));
  const base = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function mergeTrainingResults(results: TrainingResult[]): {
  totals: SimulationTotals;
  stats: ChartStats;
} {
  const stats = createEmptyChartStats();
  const totals: SimulationTotals = {
    rounds: 0,
    actions: 0,
    wins: 0,
    losses: 0,
    pushes: 0,
    net: 0,
  };

  for (const result of results) {
    totals.rounds += result.totals.rounds;
    totals.actions += result.totals.actions;
    totals.wins += result.totals.wins;
    totals.losses += result.totals.losses;
    totals.pushes += result.totals.pushes;
    totals.net += result.totals.net;

    for (const key of Object.keys(result.stats)) {
      const source = result.stats[key];
      const target = stats[key];
      if (!target) continue;

      for (const action of ACTIONS) {
        target[action].trials += source[action].trials;
        target[action].wins += source[action].wins;
        target[action].pushes += source[action].pushes;
        target[action].losses += source[action].losses;
        target[action].net += source[action].net;
        target[action].sumSquares += source[action].sumSquares;
      }
    }
  }

  return { totals, stats };
}

export function mergeEvaluations(
  results: StrategyEvaluation[],
  durationMs: number,
): StrategyEvaluation {
  const merged: StrategyEvaluation = {
    rounds: 0,
    wins: 0,
    losses: 0,
    pushes: 0,
    net: 0,
    chartDecisions: 0,
    fallbackDecisions: 0,
    durationMs,
  };

  for (const result of results) {
    merged.rounds += result.rounds;
    merged.wins += result.wins;
    merged.losses += result.losses;
    merged.pushes += result.pushes;
    merged.net += result.net;
    merged.chartDecisions += result.chartDecisions;
    merged.fallbackDecisions += result.fallbackDecisions;
  }

  return merged;
}
