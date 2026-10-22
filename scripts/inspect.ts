import { BlackjackSimulator } from "../src/simulation/simulator";
import { cardKey, getCellLeader, getRowActions, CHART_ROW_MAP, ACTION_SHORT_LABELS } from "../src/simulation/chart";
const s=new BlackjackSimulator();
for(let i=0;i<5000000;i++) s.playRound();
const st=s.getStats();
for (const [rowid,d] of [["pair-4",5],["pair-4",6],["pair-2",5],["pair-6",6]] as const) {
  const c=st[cardKey(rowid,d)]; const row=CHART_ROW_MAP.get(rowid)!;
  console.log(rowid,d,"leader",getCellLeader(c,row)?.action);
  for(const a of getRowActions(row)){const x=c[a]; console.log(a,x.trials,x.net,x.trials?x.net/x.trials:0)}
}
