import {
  cardKey,
  createEmptyChartStats,
  getChartRow,
  getHandValue,
  isPair,
} from "./chart";
import {
  dealerColumn,
  drawCard,
  isBlackjack,
  playDealer,
  roundOutcome,
  settleBlackjackHand,
} from "./cards";
import { DEFAULT_GAME_RULES } from "./rules";
import type {
  ActionStats,
  Card,
  ChartAction,
  ChartStats,
  GameHandSummary,
  GameOutcome,
  GameRecord,
  GameRules,
  HandValue,
} from "./types";

export interface SimulatorOptions {
  rules?: GameRules;
}

interface HandState {
  id: number;
  cards: Card[];
  bet: number;
  isNatural: boolean;
  locked: boolean;
  splitGroups: number[];
}

interface PendingSample {
  cellKey: string;
  rowId: string;
  dealerUpcard: number;
  action: ChartAction;
  handId?: number;
  groupId?: number;
}

interface SettledHand {
  hand: HandState;
  value: HandValue;
  outcome: GameOutcome;
  net: number;
  busted: boolean;
}

function randomOf<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function createStatsStore(): ChartStats {
  return createEmptyChartStats();
}

export class BlackjackSimulator {
  private stats: ChartStats = createStatsStore();
  private rounds = 0;
  private actions = 0;
  private wins = 0;
  private losses = 0;
  private pushes = 0;
  private net = 0;
  private readonly rules: GameRules;

  constructor(options: SimulatorOptions = {}) {
    this.rules = options.rules ? { ...options.rules } : { ...DEFAULT_GAME_RULES };
  }

  playRound(): GameRecord {
    return this.runRound(true) as GameRecord;
  }

  playTrainingRound(): void {
    this.runRound(false);
  }

  private runRound(recordHistory: boolean): GameRecord | null {
    const dealerUp = drawCard();
    const dealerHole = drawCard();
    const playerCards = [drawCard(), drawCard()];
    const dealerUpcard = dealerColumn(dealerUp);
    const initialRow =
      recordHistory && !isBlackjack(playerCards)
        ? getChartRow(playerCards, isPair(playerCards))
        : null;
    const initialCell = initialRow ? cardKey(initialRow.id, dealerUpcard) : null;
    const dealerCards = [dealerUp, dealerHole];
    const dealerBlackjack = isBlackjack(dealerCards);
    const dealerPeekedBlackjack = this.rules.dealerPeek && dealerBlackjack;
    const insuranceWager =
      this.rules.insurance === "always" && dealerUpcard === 11 ? 0.5 : 0;
    const insuranceNet = insuranceWager > 0
      ? dealerBlackjack
        ? insuranceWager * 2
        : -insuranceWager
      : 0;
    const hands: HandState[] = [
      {
        id: 0,
        cards: playerCards,
        bet: 1,
        isNatural: isBlackjack(playerCards),
        locked: false,
        splitGroups: [],
      },
    ];
    const pendingSamples: PendingSample[] = [];
    const actionTrail: ChartAction[] | null = recordHistory ? [] : null;
    let nextHandId = 1;
    let nextGroupId = 1;

    if (!isBlackjack(playerCards) && !dealerPeekedBlackjack) {
      for (let handIndex = 0; handIndex < hands.length; handIndex += 1) {
        const hand = hands[handIndex];
        while (hand.cards.length > 0) {
          const value = getHandValue(hand.cards);
          if (hand.locked || value.total >= 21) break;

          const pairAllowed =
            hand.cards.length === 2 &&
            isPair(hand.cards) &&
            hands.length < this.rules.maxSplitHands;
          const row = getChartRow(hand.cards, pairAllowed);
          if (!row) break;

          const legalActions = this.getLegalActions(hand, pairAllowed);
          const action = randomOf(legalActions);
          actionTrail?.push(action);

          if (action === "hit") {
            pendingSamples.push({
              cellKey: cardKey(row.id, dealerUpcard),
              rowId: row.id,
              dealerUpcard,
              action,
              handId: hand.id,
            });
            hand.cards.push(drawCard());
            continue;
          }

          if (action === "stand") {
            pendingSamples.push({
              cellKey: cardKey(row.id, dealerUpcard),
              rowId: row.id,
              dealerUpcard,
              action,
              handId: hand.id,
            });
            break;
          }

          if (action === "double") {
            hand.bet *= 2;
            pendingSamples.push({
              cellKey: cardKey(row.id, dealerUpcard),
              rowId: row.id,
              dealerUpcard,
              action,
              handId: hand.id,
            });
            hand.cards.push(drawCard());
            break;
          }

          const groupId = nextGroupId;
          nextGroupId += 1;
          pendingSamples.push({
            cellKey: cardKey(row.id, dealerUpcard),
            rowId: row.id,
            dealerUpcard,
            action,
            groupId,
          });

          const firstCard = hand.cards[0];
          const secondCard = hand.cards[1];
          const firstDraw = drawCard();
          const secondDraw = drawCard();
          const splitAces = firstCard.rank === "A";
          const splitLocked = splitAces && this.rules.splitAcesOneCard;

          hand.cards = [firstCard, firstDraw];
          hand.bet = 1;
          hand.locked = splitLocked;
          hand.splitGroups = [...hand.splitGroups, groupId];

          const splitHand: HandState = {
            id: nextHandId,
            cards: [secondCard, secondDraw],
            bet: 1,
            isNatural: false,
            locked: splitLocked,
            splitGroups: [...hand.splitGroups],
          };
          nextHandId += 1;
          hands.push(splitHand);
        }
      }
    }

    const dealerValue = playDealer(dealerCards, this.rules.dealerHitsSoft17);
    const settledHands = hands.map((hand) =>
      this.settleHand(hand, dealerValue, dealerBlackjack),
    );
    const byHandId = new Map(settledHands.map((settled) => [settled.hand.id, settled]));
    const handNet = settledHands.reduce((sum, settled) => sum + settled.net, 0);
    const totalNet = handNet + insuranceNet;

    for (const sample of pendingSamples) {
      let sampleNet = 0;
      if (sample.groupId !== undefined) {
        for (const settled of settledHands) {
          if (settled.hand.splitGroups.includes(sample.groupId)) {
            sampleNet += settled.net;
          }
        }
      } else {
        sampleNet = byHandId.get(sample.handId ?? -1)?.net ?? 0;
      }
      this.recordAction(sample.cellKey, sample.action, sampleNet);
      this.actions += 1;
    }

    this.rounds += 1;
    this.net += totalNet;
    const outcome = roundOutcome(totalNet);
    if (outcome === "win") this.wins += 1;
    if (outcome === "loss") this.losses += 1;
    if (outcome === "push") this.pushes += 1;

    if (!recordHistory) return null;

    const handSummaries: GameHandSummary[] = settledHands.map((settled) => ({
      cards: settled.hand.cards,
      total: settled.value.total,
      bet: settled.hand.bet,
      outcome: settled.outcome,
      net: settled.net,
      blackjack: settled.hand.isNatural,
      busted: settled.busted,
    }));

    return {
      id: this.rounds,
      playerCards,
      dealerCards,
      dealerTotal: dealerValue.total,
      dealerBlackjack,
      hands: handSummaries,
      actions: actionTrail ?? [],
      net: totalNet,
      insuranceNet,
      outcome,
      initialCell,
      initialRowId: initialRow?.id ?? null,
      dealerUpcard: initialCell ? dealerUpcard : null,
    };
  }

  getStats(): ChartStats {
    return this.stats;
  }

  getTotals() {
    return {
      rounds: this.rounds,
      actions: this.actions,
      wins: this.wins,
      losses: this.losses,
      pushes: this.pushes,
      net: this.net,
    };
  }

  private getLegalActions(hand: HandState, canSplit: boolean): ChartAction[] {
    const actions: ChartAction[] = ["hit", "stand"];
    if (hand.cards.length === 2) {
      const total = getHandValue(hand.cards).total;
      const fromSplit = hand.splitGroups.length > 0;
      const doubleAllowedByTotal =
        this.rules.doubleRule === "any" ||
        (this.rules.doubleRule === "9-11" && total >= 9 && total <= 11) ||
        (this.rules.doubleRule === "10-11" && total >= 10 && total <= 11);
      const doubleAllowedBySplit = !fromSplit || this.rules.doubleAfterSplit;
      if (doubleAllowedByTotal && doubleAllowedBySplit) actions.push("double");
    }
    if (canSplit && hand.cards.length === 2 && isPair(hand.cards)) {
      actions.push("split");
    }
    return actions;
  }

  private settleHand(
    hand: HandState,
    dealerValue: HandValue,
    dealerBlackjack: boolean,
  ): SettledHand {
    const settlement = settleBlackjackHand(
      hand.cards,
      hand.bet,
      hand.isNatural,
      dealerValue,
      dealerBlackjack,
      this.rules.blackjackPayout,
    );
    return { hand, ...settlement };
  }

  private recordAction(cellKey: string, action: ChartAction, net: number): void {
    const stats: ActionStats = this.stats[cellKey][action];
    stats.trials += 1;
    stats.net += net;
    stats.sumSquares += net * net;
    if (net > 0) stats.wins += 1;
    else if (net < 0) stats.losses += 1;
    else stats.pushes += 1;
  }
}
