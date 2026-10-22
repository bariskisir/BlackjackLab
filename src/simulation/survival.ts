import {
  dealerColumn,
  drawCard,
  isBlackjack,
  playDealer,
  roundOutcome,
  settleBlackjackHand,
} from "./cards";
import {
  buildActionOrder,
  cardKey,
  getChartRow,
  getHandValue,
  isPair,
} from "./chart";
import { PROGRESS_INTERVAL_MS, PROGRESS_ROUND_STEP } from "./progress";
import type { ActionOrderMap } from "./chart";
import type {
  BettingSystem,
  Card,
  ChartAction,
  ChartStats,
  GameRules,
  StrategyEvaluation,
  SurvivalPoint,
  SurvivalRequest,
  SurvivalResult,
} from "./types";

const DEFAULT_BASE_BET = 1;
const MIN_BET = 1;
const MAX_TIMELINE_POINTS = 260;

interface FixedHand {
  cards: Card[];
  bet: number;
  natural: boolean;
  locked: boolean;
  fromSplit: boolean;
}

interface ActionDecision {
  action: ChartAction;
  usedFallback: boolean;
}

interface RoundResult {
  net: number;
  insuranceNet: number;
  chartDecisions: number;
  fallbackDecisions: number;
}

function reservedStake(hands: FixedHand[]): number {
  return hands.reduce((total, hand) => total + hand.bet, 0);
}

function getLegalActions(
  hand: FixedHand,
  hands: FixedHand[],
  bankroll: number,
  rules: GameRules,
): ChartAction[] {
  const actions: ChartAction[] = ["hit", "stand"];
  const reserved = reservedStake(hands);
  const canAddStake = reserved + hand.bet <= bankroll + Number.EPSILON;

  if (hand.cards.length === 2) {
    const { total } = getHandValue(hand.cards);
    const doubleAllowedByTotal =
      rules.doubleRule === "any" ||
      (rules.doubleRule === "9-11" && total >= 9 && total <= 11) ||
      (rules.doubleRule === "10-11" && total >= 10 && total <= 11);
    const doubleAllowedBySplit = !hand.fromSplit || rules.doubleAfterSplit;
    if (canAddStake && doubleAllowedByTotal && doubleAllowedBySplit) {
      actions.push("double");
    }
  }

  if (
    hand.cards.length === 2 &&
    isPair(hand.cards) &&
    hands.length < rules.maxSplitHands &&
    canAddStake
  ) {
    actions.push("split");
  }

  return actions;
}

function fallbackAction(cards: Card[], dealerUpcard: number, legal: ChartAction[]): ChartAction {
  const { total, soft } = getHandValue(cards);
  const canStand = legal.includes("stand");

  if (!canStand) return "hit";

  if (soft && total >= 19) return "stand";
  if (total >= 17) return "stand";
  if (total === 12 && dealerUpcard >= 4 && dealerUpcard <= 6) return "stand";
  if (total >= 13 && total <= 16 && dealerUpcard >= 2 && dealerUpcard <= 6) return "stand";

  return legal.includes("hit") ? "hit" : "stand";
}

function chooseAction(
  cellKey: string,
  actionOrder: ActionOrderMap,
  cards: Card[],
  dealerUpcard: number,
  legal: ChartAction[],
): ActionDecision {
  const preferred = actionOrder[cellKey];
  if (preferred) {
    for (const action of preferred) {
      if (legal.includes(action)) {
        return { action, usedFallback: false };
      }
    }
  }

  return {
    action: fallbackAction(cards, dealerUpcard, legal),
    usedFallback: true,
  };
}

function playFixedStrategyRound(
  actionOrder: ActionOrderMap,
  bankroll: number,
  rules: GameRules,
  baseBet: number = DEFAULT_BASE_BET,
): RoundResult {
  const dealerUp = drawCard();
  const dealerHole = drawCard();
  const dealerUpcard = dealerColumn(dealerUp);
  const playerCards = [drawCard(), drawCard()];
  const dealerCards = [dealerUp, dealerHole];
  const playerNatural = isBlackjack(playerCards);
  const dealerBlackjack = isBlackjack(dealerCards);
  const dealerPeekedBlackjack = rules.dealerPeek && dealerBlackjack;
  const insuranceWager =
    rules.insurance === "always" && dealerUpcard === 11 && bankroll >= baseBet * 1.5
      ? baseBet / 2
      : 0;
  const insuranceNet = insuranceWager > 0
    ? dealerBlackjack
      ? insuranceWager * 2
      : -insuranceWager
    : 0;
  const stakeBudget = bankroll - insuranceWager;
  const hands: FixedHand[] = [
    {
      cards: playerCards,
      bet: baseBet,
      natural: playerNatural,
      locked: false,
      fromSplit: false,
    },
  ];
  let chartDecisions = 0;
  let fallbackDecisions = 0;

  if (!playerNatural && !dealerPeekedBlackjack) {
    for (let handIndex = 0; handIndex < hands.length; handIndex += 1) {
      const hand = hands[handIndex];

      while (!hand.locked) {
        const value = getHandValue(hand.cards);
        if (value.total >= 21) break;

        const canSplit =
          hand.cards.length === 2 &&
          isPair(hand.cards) &&
          hands.length < rules.maxSplitHands;
        const row = getChartRow(hand.cards, canSplit);
        if (!row) break;

        const legal = getLegalActions(hand, hands, stakeBudget, rules);
        const cellKey = cardKey(row.id, dealerUpcard);
        const decision = chooseAction(cellKey, actionOrder, hand.cards, dealerUpcard, legal);

        if (decision.usedFallback) fallbackDecisions += 1;
        else chartDecisions += 1;

        if (decision.action === "stand") break;

        if (decision.action === "hit") {
          hand.cards.push(drawCard());
          continue;
        }

        if (decision.action === "double") {
          hand.bet *= 2;
          hand.cards.push(drawCard());
          break;
        }

        const firstCard = hand.cards[0];
        const secondCard = hand.cards[1];
        const firstDraw = drawCard();
        const secondDraw = drawCard();
        const splitAces = firstCard.rank === "A";
        const splitLocked = splitAces && rules.splitAcesOneCard;

        hand.cards = [firstCard, firstDraw];
        hand.bet = baseBet;
        hand.natural = false;
        hand.locked = splitLocked;
        hand.fromSplit = true;

        hands.push({
          cards: [secondCard, secondDraw],
          bet: baseBet,
          natural: false,
          locked: splitLocked,
          fromSplit: true,
        });
      }
    }
  }

  const dealerValue = playDealer(dealerCards, rules.dealerHitsSoft17);
  const handNet = hands.reduce(
    (total, hand) =>
      total +
      settleBlackjackHand(
        hand.cards,
        hand.bet,
        hand.natural,
        dealerValue,
        dealerBlackjack,
        rules.blackjackPayout,
      ).net,
    0,
  );

  return {
    net: handNet + insuranceNet,
    insuranceNet,
    chartDecisions,
    fallbackDecisions,
  };
}

export function evaluateStrategy(
  stats: ChartStats,
  rules: GameRules,
  rounds: number,
  onProgress?: (completed: number) => void,
): StrategyEvaluation {
  const startedAt = performance.now();
  const actionOrder = buildActionOrder(stats);
  const totalRounds = Math.max(1, Math.floor(rounds));
  const progressStep = onProgress ? PROGRESS_ROUND_STEP : 0;
  let nextProgress = progressStep;
  let lastProgressAt = performance.now();
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let net = 0;
  let chartDecisions = 0;
  let fallbackDecisions = 0;

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    const round = playFixedStrategyRound(actionOrder, Number.POSITIVE_INFINITY, rules);
    net += round.net;
    chartDecisions += round.chartDecisions;
    fallbackDecisions += round.fallbackDecisions;

    const outcome = roundOutcome(round.net);
    if (outcome === "win") wins += 1;
    else if (outcome === "loss") losses += 1;
    else pushes += 1;

    if (onProgress && roundIndex + 1 >= nextProgress) {
      const now = performance.now();
      if (now - lastProgressAt >= PROGRESS_INTERVAL_MS) {
        onProgress(roundIndex + 1);
        lastProgressAt = now;
      }
      nextProgress = roundIndex + 1 + progressStep;
    }
  }

  onProgress?.(totalRounds);

  return {
    rounds: totalRounds,
    wins,
    losses,
    pushes,
    net,
    chartDecisions,
    fallbackDecisions,
    durationMs: performance.now() - startedAt,
  };
}

export function runSurvival(request: SurvivalRequest): SurvivalResult {
  const startedAt = performance.now();
  const bettingSystem: BettingSystem =
    request.bettingSystem === "martingale" ? "martingale" : "normal";
  const baseBet = Math.max(MIN_BET, Math.floor(request.baseBet));
  const startingBankroll = Math.max(baseBet, request.startingBankroll);
  const actionOrder = buildActionOrder(request.stats);
  const timeline: SurvivalPoint[] = [{ round: 0, bankroll: startingBankroll, bet: 0 }];
  let timelineStride = 1;
  let nextTimelineRound = 1;
  let bankroll = startingBankroll;
  let peakBankroll = startingBankroll;
  let peakRound = 0;
  let peakBet = 0;
  let lastBet = 0;
  let roundsSurvived = 0;
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let chartDecisions = 0;
  let fallbackDecisions = 0;
  let insuranceNet = 0;
  let nextBet = baseBet;

  while (true) {
    if (bettingSystem === "martingale") {
      if (bankroll < MIN_BET) break;
    } else if (bankroll < baseBet) {
      break;
    }

    // Martingale doubles the stake after each loss. When the bankroll cannot
    // cover the next stake, push the whole remaining balance in instead.
    const bet =
      bettingSystem === "martingale" ? Math.min(nextBet, bankroll) : baseBet;
    lastBet = bet;

    const round = playFixedStrategyRound(actionOrder, bankroll, request.rules, bet);
    bankroll += round.net;
    roundsSurvived += 1;
    chartDecisions += round.chartDecisions;
    fallbackDecisions += round.fallbackDecisions;
    insuranceNet += round.insuranceNet;

    if (bankroll > peakBankroll) {
      peakBankroll = bankroll;
      peakRound = roundsSurvived;
      peakBet = bet;
    }

    if (roundsSurvived >= nextTimelineRound) {
      timeline.push({ round: roundsSurvived, bankroll, bet });

      if (timeline.length >= MAX_TIMELINE_POINTS) {
        const reduced: SurvivalPoint[] = [];
        for (let index = 0; index < timeline.length; index += 2) {
          reduced.push(timeline[index]);
        }
        const lastPoint = timeline[timeline.length - 1];
        if (reduced[reduced.length - 1]?.round !== lastPoint.round) {
          reduced.push(lastPoint);
        }
        timeline.length = 0;
        timeline.push(...reduced);
        timelineStride *= 2;
      }

      nextTimelineRound = roundsSurvived + timelineStride;
    }

    const outcome = roundOutcome(round.net);
    if (outcome === "win") wins += 1;
    else if (outcome === "loss") losses += 1;
    else pushes += 1;

    if (bettingSystem === "martingale") {
      if (outcome === "loss") nextBet = bet * 2;
      else if (outcome === "win") nextBet = baseBet;
      // A push repeats the same stake, so the progression is not reset.
    } else {
      nextBet = baseBet;
    }
  }

  const busted =
    bettingSystem === "martingale" ? bankroll < MIN_BET : bankroll < baseBet;

  if (timeline[timeline.length - 1]?.round !== roundsSurvived) {
    timeline.push({ round: roundsSurvived, bankroll, bet: lastBet });
  }

  if (peakRound > 0 && !timeline.some((point) => point.round === peakRound)) {
    timeline.push({ round: peakRound, bankroll: peakBankroll, bet: peakBet });
    timeline.sort((a, b) => a.round - b.round);
  }

  return {
    strategyId: request.strategyId,
    startingBankroll,
    finalBankroll: bankroll,
    peakBankroll,
    roundsSurvived,
    wins,
    losses,
    pushes,
    net: bankroll - startingBankroll,
    busted,
    chartDecisions,
    fallbackDecisions,
    insuranceNet,
    timeline,
    durationMs: performance.now() - startedAt,
    completedAt: Date.now(),
  };
}
