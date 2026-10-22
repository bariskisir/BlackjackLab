import {
  getCellLeader,
  getMeanNet,
  getRowActions,
  getWinRate,
} from "../simulation/chart";
import type { CellStats, ChartRow } from "../simulation/types";
import { ACTION_META, formatPercent, formatSigned, HAND_KIND_LABELS } from "../lib/presentation";
import "./CellDetails.scss";

interface CellDetailsProps {
  row: ChartRow;
  dealer: number;
  cell: CellStats;
  compact?: boolean;
  onClose?: () => void;
}

export function CellDetails({ row, dealer, cell, compact = false, onClose }: CellDetailsProps) {
  const actions = getRowActions(row);
  const leader = getCellLeader(cell, row, 1);
  const totalTrials = actions.reduce((total, action) => total + cell[action].trials, 0);
  const dealerLabel = dealer === 11 ? "A" : String(dealer);

  return (
    <div className={`cell-details${compact ? " is-compact" : ""}`}>
      <div className="cell-details-head">
        <div className="cell-hand">
          <span className="cell-eyebrow">{HAND_KIND_LABELS[row.kind]}</span>
          <div className="cell-hand-line">
            <strong>{row.label}</strong>
            <span className="cell-vs">vs</span>
            <span className="cell-dealer-token">{dealerLabel}</span>
          </div>
        </div>
        <div className="cell-head-side">
          <span>DEALER</span>
          <strong>{dealerLabel}</strong>
        </div>
        {onClose && (
          <button className="cell-close" onClick={onClose} type="button" aria-label="Close details">
            ×
          </button>
        )}
      </div>

      <div className="cell-meta-line">
        <span>{rowDescription(row)}</span>
        <span>{totalTrials > 0 ? `${totalTrials} actions observed` : "No observations yet"}</span>
      </div>

      <div className="action-comparison">
        {actions.map((action) => {
          const stats = cell[action];
          const winRate = getWinRate(stats);
          const meanNet = getMeanNet(stats);
          const isLeader = leader?.action === action && stats.trials > 0;
          const hasSample = stats.trials > 0;

          return (
            <div className={`action-stat${isLeader ? " is-leader" : ""}`} key={action}>
              <div className="action-stat-head">
                <span className={`action-token action-token--${action}`}>
                  {ACTION_META[action].short}
                </span>
                <span className="action-stat-name">{ACTION_META[action].label}</span>
                {isLeader && <span className="best-tag">Best</span>}
                <span className="action-stat-count">
                  {hasSample ? `${stats.trials} times` : "—"}
                </span>
                <strong className="action-stat-rate">
                  {hasSample ? formatPercent(winRate) : "—"}
                </strong>
              </div>
              <div className="action-rate-track" aria-hidden="true">
                <progress
                  className={`action-rate action-rate--${action}`}
                  max={100}
                  value={hasSample ? winRate * 100 : 0}
                />
              </div>
              <div className="action-stat-sub">
                <span>
                  {hasSample
                    ? `${stats.wins}W · ${stats.losses}L · ${stats.pushes}P`
                    : "Not tried in this cell"}
                </span>
                <span className={meanNet < 0 ? "is-negative" : "is-positive"}>
                  {hasSample ? `${formatSigned(meanNet)} net` : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function rowDescription(row: ChartRow): string {
  if (row.kind === "pair") return `${row.label} pair`;
  if (row.kind === "soft") return `Soft hand · ${row.label}`;
  return row.id === "hard-17"
    ? "Hard 17 or higher"
    : row.id === "hard-8"
      ? "Hard 8 or lower"
      : `Hard ${row.label}`;
}
