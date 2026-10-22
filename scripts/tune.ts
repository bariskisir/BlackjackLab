import { ACTION_SHORT_LABELS, CHART_ROWS, DEALER_LABELS, DEALER_UPCARDS, getCellLeader, cardKey } from "../src/simulation/chart";
import { BlackjackSimulator } from "../src/simulation/simulator";
const N=Number(process.argv[2]??1000000);
const s=new BlackjackSimulator();
const t=performance.now(); for(let i=0;i<N;i++) s.playRound(); const elapsed=performance.now()-t;
const stats=s.getStats(); const totals=s.getTotals();
console.log(N, elapsed.toFixed(0)+"ms", totals.net, (totals.net/N).toFixed(3));
console.log("      "+DEALER_UPCARDS.map(d=>DEALER_LABELS[d].padStart(3)).join(""));
for(const row of CHART_ROWS){console.log(row.label.padStart(5)+" "+DEALER_UPCARDS.map(d=>{const l=getCellLeader(stats[cardKey(row.id,d)],row); return (l?ACTION_SHORT_LABELS[l.action]:"?").padStart(3)}).join(""));}
