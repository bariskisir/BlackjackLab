export const SUITS = ["spades", "hearts", "diamonds", "clubs"] as const;
export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];

export interface Card {
  rank: Rank;
  suit: Suit;
  value: number;
  red: boolean;
}

export interface HandValue {
  total: number;
  soft: boolean;
}

export type ChartAction = "hit" | "stand" | "double" | "split";
export type HandKind = "hard" | "soft" | "pair";
export type GameOutcome = "win" | "loss" | "push";
export type DealerUpCard = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export type DoubleRule = "any" | "9-11" | "10-11";
export type InsurancePolicy = "off" | "always";
export type BettingSystem = "normal" | "martingale";

export interface GameRules {
  blackjackPayout: number;
  dealerHitsSoft17: boolean;
  dealerPeek: boolean;
  doubleRule: DoubleRule;
  doubleAfterSplit: boolean;
  maxSplitHands: number;
  splitAcesOneCard: boolean;
  insurance: InsurancePolicy;
}

export interface ChartRow {
  id: string;
  label: string;
  kind: HandKind;
}

export interface ActionStats {
  trials: number;
  wins: number;
  pushes: number;
  losses: number;
  net: number;
  sumSquares: number;
}

export type CellStats = Record<ChartAction, ActionStats>;
export type ChartStats = Record<string, CellStats>;

export interface GameHandSummary {
  cards: Card[];
  total: number;
  bet: number;
  outcome: GameOutcome;
  net: number;
  blackjack: boolean;
  busted: boolean;
}

export interface GameRecord {
  id: number;
  playerCards: Card[];
  dealerCards: Card[];
  dealerTotal: number;
  dealerBlackjack: boolean;
  hands: GameHandSummary[];
  actions: ChartAction[];
  net: number;
  insuranceNet: number;
  outcome: GameOutcome;
  initialCell: string | null;
  initialRowId: string | null;
  dealerUpcard: number | null;
}

export interface SimulationTotals {
  rounds: number;
  actions: number;
  wins: number;
  losses: number;
  pushes: number;
  net: number;
}

export interface StrategyEvaluation {
  rounds: number;
  wins: number;
  losses: number;
  pushes: number;
  net: number;
  chartDecisions: number;
  fallbackDecisions: number;
  durationMs: number;
}

export interface SimulationResult {
  totals: SimulationTotals;
  stats: ChartStats;
  rules: GameRules;
  evaluation: StrategyEvaluation;
  durationMs: number;
  completedAt: number;
}

export interface ChartExportSource {
  totals: SimulationTotals;
  stats: ChartStats;
  rules: GameRules;
  completedAt: number;
  durationMs: number | null;
}

export interface TrainingResult {
  totals: SimulationTotals;
  stats: ChartStats;
  durationMs: number;
}

export type SimulationWorkerRequest =
  | { type: "train"; rounds: number; rules: GameRules }
  | { type: "evaluate"; rounds: number; rules: GameRules; stats: ChartStats };

export type SimulationWorkerResponse =
  | { type: "progress"; completed: number }
  | { type: "trained"; result: TrainingResult }
  | { type: "evaluated"; evaluation: StrategyEvaluation }
  | { type: "error"; message: string };

export interface SavedStrategy {
  id: string;
  createdAt: number;
  totals: SimulationTotals;
  stats: ChartStats;
  coverage: number;
  rules: GameRules;
}

export interface SurvivalRequest {
  strategyId: string;
  stats: ChartStats;
  rules: GameRules;
  startingBankroll: number;
  baseBet: number;
  bettingSystem: BettingSystem;
}

export interface SurvivalPoint {
  round: number;
  bankroll: number;
  bet: number;
}

export interface SurvivalResult {
  strategyId: string;
  startingBankroll: number;
  finalBankroll: number;
  peakBankroll: number;
  roundsSurvived: number;
  wins: number;
  losses: number;
  pushes: number;
  net: number;
  busted: boolean;
  chartDecisions: number;
  fallbackDecisions: number;
  insuranceNet: number;
  timeline: SurvivalPoint[];
  durationMs: number;
  completedAt: number;
}

export type SurvivalWorkerResponse =
  | { type: "complete"; result: SurvivalResult }
  | { type: "error"; message: string };
