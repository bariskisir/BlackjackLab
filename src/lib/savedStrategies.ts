import { ACTIONS, getCoverage } from "../simulation/chart";
import { normalizeGameRules } from "../simulation/rules";
import type {
  ActionStats,
  CellStats,
  ChartStats,
  SavedStrategy,
  SimulationResult,
  SimulationTotals,
} from "../simulation/types";
import { formatNumber } from "./presentation";

export const SAVED_STRATEGIES_KEY = "blackjack-lab-saved-strategies-v1";
export const MAX_SAVED_STRATEGIES = 8;

export interface SavedStrategyLoad {
  strategies: SavedStrategy[];
  error: string | null;
}

const padDatePart = (value: number) => String(value).padStart(2, "0");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isActionStats(value: unknown): value is ActionStats {
  if (!isRecord(value)) return false;
  return (
    isNumber(value.trials) &&
    isNumber(value.wins) &&
    isNumber(value.pushes) &&
    isNumber(value.losses) &&
    isNumber(value.net) &&
    isNumber(value.sumSquares)
  );
}

function isCellStats(value: unknown): value is CellStats {
  if (!isRecord(value)) return false;
  return ACTIONS.every((action) => isActionStats(value[action]));
}

function isChartStats(value: unknown): value is ChartStats {
  if (!isRecord(value)) return false;
  return Object.values(value).every(isCellStats);
}

function isTotals(value: unknown): value is SimulationTotals {
  if (!isRecord(value)) return false;
  return (
    isNumber(value.rounds) &&
    isNumber(value.actions) &&
    isNumber(value.wins) &&
    isNumber(value.losses) &&
    isNumber(value.pushes) &&
    isNumber(value.net)
  );
}

interface SavedStrategySeed {
  id: string;
  createdAt: number;
  totals: SimulationTotals;
  stats: ChartStats;
  coverage: number;
}

function isSavedStrategySeed(value: unknown): value is SavedStrategySeed {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    isNumber(value.createdAt) &&
    isTotals(value.totals) &&
    isChartStats(value.stats) &&
    isNumber(value.coverage)
  );
}

function hydrateSavedStrategy(value: unknown): SavedStrategy | null {
  if (!isSavedStrategySeed(value)) return null;
  return {
    ...value,
    rules: normalizeGameRules(isRecord(value) ? value.rules : null),
  };
}

export function strategyIdFor(completedAt: number): string {
  return `strategy-${completedAt}`;
}

export function savedStrategyFromResult(result: SimulationResult): SavedStrategy {
  return {
    id: strategyIdFor(result.completedAt),
    createdAt: result.completedAt,
    totals: { ...result.totals },
    stats: result.stats,
    coverage: getCoverage(result.stats),
    rules: { ...result.rules },
  };
}

export function loadSavedStrategies(): SavedStrategyLoad {
  try {
    const raw = window.localStorage.getItem(SAVED_STRATEGIES_KEY);
    if (!raw) return { strategies: [], error: null };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { strategies: [], error: "Saved charts could not be read from this browser." };
    }
    const strategies = parsed
      .map(hydrateSavedStrategy)
      .filter((strategy): strategy is SavedStrategy => strategy !== null)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_SAVED_STRATEGIES);
    return { strategies, error: null };
  } catch {
    return {
      strategies: [],
      error: "Browser storage is unavailable. Charts can still be saved for this session.",
    };
  }
}

export function persistSavedStrategies(strategies: SavedStrategy[]): string | null {
  try {
    window.localStorage.setItem(SAVED_STRATEGIES_KEY, JSON.stringify(strategies));
    return null;
  } catch {
    return "Charts could not be written to browser storage. They remain available for this session.";
  }
}

export function formatStrategyDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${padDatePart(date.getDate())}.${padDatePart(date.getMonth() + 1)}.${date.getFullYear()} ${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

export function formatStrategyLabel(strategy: SavedStrategy): string {
  return `${formatNumber(strategy.totals.rounds)} rounds · ${formatStrategyDate(strategy.createdAt)}`;
}
