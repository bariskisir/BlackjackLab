import {
  ACTION_SHORT_LABELS,
  CHART_ROWS,
  DEALER_LABELS,
  DEALER_UPCARDS,
  getCellLeader,
  cardKey,
} from "../src/simulation/chart";
import { BlackjackSimulator } from "../src/simulation/simulator";

const rounds = Number(process.argv[2] ?? 10000);
const simulator = new BlackjackSimulator();
const started = performance.now();

for (let index = 0; index < rounds; index += 1) {
  simulator.playRound();
}

const elapsed = performance.now() - started;
const totals = simulator.getTotals();
const stats = simulator.getStats();

console.log(
  `${totals.rounds.toLocaleString("en-US")} rounds, ${totals.actions.toLocaleString("en-US")} actions, ${elapsed.toFixed(0)} ms, ${(totals.rounds / (elapsed / 1000)).toFixed(0)} rounds/s`,
);
console.log(
  `net ${totals.net.toFixed(0)}, win ${totals.wins}, loss ${totals.losses}, push ${totals.pushes}`,
);
console.log(`      ${DEALER_UPCARDS.map((dealer) => DEALER_LABELS[dealer].padStart(3)).join("")}`);
for (const row of CHART_ROWS) {
  const cells = DEALER_UPCARDS.map((dealer) => {
    const cell = stats[cardKey(row.id, dealer)];
    const leader = getCellLeader(cell, row);
    return (leader ? ACTION_SHORT_LABELS[leader.action] : "?").padStart(3);
  });
  console.log(`${row.label.padStart(5)} ${cells.join("")}`);
}
