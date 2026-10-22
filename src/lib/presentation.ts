import type { ChartAction, HandKind } from "../simulation/types";

export const ACTION_META: Record<
  ChartAction,
  { label: string; short: string; description: string }
> = {
  hit: { label: "Hit", short: "H", description: "Draw a card" },
  stand: { label: "Stand", short: "S", description: "Keep the hand" },
  double: { label: "Double", short: "D", description: "Double the bet and draw one card" },
  split: { label: "Split", short: "SP", description: "Split the pair into two hands" },
};

export const HAND_KIND_LABELS: Record<HandKind, string> = {
  hard: "Hard hand",
  soft: "Soft hand",
  pair: "Pair",
};

export function actionLabel(action: ChartAction): string {
  return ACTION_META[action].label;
}

export function actionShort(action: ChartAction): string {
  return ACTION_META[action].short;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${(value * 100).toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}%`;
}

export function formatSigned(value: number, fractionDigits = 2): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

export function formatDollars(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${Math.max(1, Math.round(milliseconds)).toLocaleString("en-US")} ms`;
  }
  return `${(milliseconds / 1000).toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })} s`;
}

export function getKindSectionLabel(kind: HandKind): string {
  if (kind === "hard") return "Hard hands";
  if (kind === "soft") return "Soft hands";
  return "Pairs";
}
