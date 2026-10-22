import { getHandValue } from "./chart";
import type {
  Card,
  DealerUpCard,
  GameOutcome,
  HandValue,
  Rank,
  Suit,
} from "./types";

const CARD_RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const CARD_SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];

const CARD_TEMPLATES: Card[] = CARD_SUITS.flatMap((suit) =>
  CARD_RANKS.map((rank) => ({
    rank,
    suit,
    value: rank === "A" ? 1 : ["J", "Q", "K"].includes(rank) ? 10 : Number(rank),
    red: suit === "hearts" || suit === "diamonds",
  })),
);

export interface HandSettlement {
  value: HandValue;
  outcome: GameOutcome;
  net: number;
  busted: boolean;
}

export function drawCard(): Card {
  return CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
}

export function dealerColumn(card: Card): DealerUpCard {
  return (card.rank === "A" ? 11 : card.value) as DealerUpCard;
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && getHandValue(cards).total === 21;
}

export function roundOutcome(net: number): GameOutcome {
  return net > 0 ? "win" : net < 0 ? "loss" : "push";
}

export function playDealer(cards: Card[], hitsSoft17 = false): HandValue {
  let value = getHandValue(cards);
  while (
    value.total < 17 ||
    (hitsSoft17 && value.total === 17 && value.soft)
  ) {
    cards.push(drawCard());
    value = getHandValue(cards);
  }
  return value;
}

export function settleBlackjackHand(
  cards: Card[],
  bet: number,
  isNatural: boolean,
  dealerValue: HandValue,
  dealerBlackjack: boolean,
  blackjackPayout = 1.5,
): HandSettlement {
  const value = getHandValue(cards);
  const busted = value.total > 21;
  let net = 0;
  let outcome: GameOutcome = "push";

  if (busted) {
    net = -bet;
    outcome = "loss";
  } else if (isNatural) {
    if (dealerBlackjack) {
      net = 0;
      outcome = "push";
    } else {
      net = bet * blackjackPayout;
      outcome = "win";
    }
  } else if (dealerBlackjack) {
    net = -bet;
    outcome = "loss";
  } else if (dealerValue.total > 21 || value.total > dealerValue.total) {
    net = bet;
    outcome = "win";
  } else if (value.total < dealerValue.total) {
    net = -bet;
    outcome = "loss";
  }

  return { value, net, outcome, busted };
}
