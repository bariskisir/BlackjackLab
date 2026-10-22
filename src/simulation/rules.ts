import type { DoubleRule, GameRules, InsurancePolicy } from "./types";

export const DEFAULT_GAME_RULES: GameRules = {
  blackjackPayout: 1.5,
  dealerHitsSoft17: false,
  dealerPeek: true,
  doubleRule: "any",
  doubleAfterSplit: true,
  maxSplitHands: 4,
  splitAcesOneCard: true,
  insurance: "off",
};

export const BLACKJACK_PAYOUT_OPTIONS = [
  { value: 1.2, label: "6:5" },
  { value: 1, label: "1:1" },
  { value: 1.5, label: "3:2" },
  { value: 2, label: "2:1" },
] as const;

export const DOUBLE_RULE_OPTIONS: Array<{ value: DoubleRule; label: string }> = [
  { value: "any", label: "Any two cards" },
  { value: "9-11", label: "9–11 only" },
  { value: "10-11", label: "10–11 only" },
];

export const INSURANCE_OPTIONS: Array<{ value: InsurancePolicy; label: string }> = [
  { value: "off", label: "Off" },
  { value: "always", label: "Always take" },
];

export const SPLIT_LIMIT_OPTIONS = [2, 3, 4] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPayout(value: unknown): value is number {
  return BLACKJACK_PAYOUT_OPTIONS.some((option) => option.value === value);
}

export function normalizeGameRules(value: unknown): GameRules {
  if (!isRecord(value)) return { ...DEFAULT_GAME_RULES };

  const doubleRule = DOUBLE_RULE_OPTIONS.some((option) => option.value === value.doubleRule)
    ? (value.doubleRule as DoubleRule)
    : DEFAULT_GAME_RULES.doubleRule;
  const insurance = INSURANCE_OPTIONS.some((option) => option.value === value.insurance)
    ? (value.insurance as InsurancePolicy)
    : DEFAULT_GAME_RULES.insurance;
  const maxSplitHands =
    typeof value.maxSplitHands === "number" &&
    SPLIT_LIMIT_OPTIONS.includes(value.maxSplitHands as (typeof SPLIT_LIMIT_OPTIONS)[number])
      ? value.maxSplitHands
      : DEFAULT_GAME_RULES.maxSplitHands;

  return {
    blackjackPayout: isPayout(value.blackjackPayout)
      ? value.blackjackPayout
      : DEFAULT_GAME_RULES.blackjackPayout,
    dealerHitsSoft17:
      typeof value.dealerHitsSoft17 === "boolean"
        ? value.dealerHitsSoft17
        : DEFAULT_GAME_RULES.dealerHitsSoft17,
    dealerPeek:
      typeof value.dealerPeek === "boolean" ? value.dealerPeek : DEFAULT_GAME_RULES.dealerPeek,
    doubleRule,
    doubleAfterSplit:
      typeof value.doubleAfterSplit === "boolean"
        ? value.doubleAfterSplit
        : DEFAULT_GAME_RULES.doubleAfterSplit,
    maxSplitHands,
    splitAcesOneCard:
      typeof value.splitAcesOneCard === "boolean"
        ? value.splitAcesOneCard
        : DEFAULT_GAME_RULES.splitAcesOneCard,
    insurance,
  };
}

export function areRulesEqual(left: GameRules, right: GameRules): boolean {
  return (
    left.blackjackPayout === right.blackjackPayout &&
    left.dealerHitsSoft17 === right.dealerHitsSoft17 &&
    left.dealerPeek === right.dealerPeek &&
    left.doubleRule === right.doubleRule &&
    left.doubleAfterSplit === right.doubleAfterSplit &&
    left.maxSplitHands === right.maxSplitHands &&
    left.splitAcesOneCard === right.splitAcesOneCard &&
    left.insurance === right.insurance
  );
}

export function getPayoutLabel(payout: number): string {
  return BLACKJACK_PAYOUT_OPTIONS.find((option) => option.value === payout)?.label ?? `${payout}:1`;
}

export function getRuleChips(rules: GameRules): string[] {
  const chips = [
    rules.dealerHitsSoft17 ? "H17" : "S17",
    getPayoutLabel(rules.blackjackPayout),
    rules.dealerPeek ? "PEEK" : "NO PEEK",
    rules.doubleAfterSplit ? "DAS" : "NO DAS",
  ];
  if (rules.insurance === "always") chips.push("INS");
  return chips;
}

export function getRuleSummary(rules: GameRules): string {
  return [
    rules.dealerHitsSoft17 ? "H17" : "S17",
    getPayoutLabel(rules.blackjackPayout),
    rules.dealerPeek ? "peek" : "no peek",
    rules.doubleAfterSplit ? "DAS" : "no DAS",
    `${rules.maxSplitHands}-hand split`,
    rules.insurance === "always" ? "insurance on" : "no insurance",
  ].join(" · ");
}
