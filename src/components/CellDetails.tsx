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
  const sampledActions = actions.filter((action) => cell[action].trials > 0);

  return (
    <div className={`cell-details${compact ? " is-compact" : ""}`}>
      <div className="cell-details-head">
        <span className="cell-kind">
          <span>{HAND_KIND_LABELS[row.kind]}</span>
          {totalTrials > 0 && (
            <>
              <span className="cell-kind-sep" aria-hidden="true">
                ·
              </span>
              <span>{totalTrials === 1 ? "1 action" : `${totalTrials} actions`}</span>
            </>
          )}
        </span>
        {onClose && (
          <button className="cell-close" onClick={onClose} type="button" aria-label="Close details">
            ×
          </button>
        )}
      </div>

      <div className="cell-hand-line">
        <strong>{row.label}</strong>
        <span className="cell-vs">vs</span>
        <span className="cell-dealer-token">{dealerLabel}</span>
      </div>

      {sampledActions.length > 0 ? (
        <div className="action-comparison">
          {sampledActions.map((action) => {
            const stats = cell[action];
            const winRate = getWinRate(stats);
            const meanNet = getMeanNet(stats);
            const isLeader = leader?.action === action;

            return (
              <div
                className={`action-stat${isLeader ? " is-leader" : ""}`}
                key={action}
                title={isLeader ? "Best action" : undefined}
              >
                <span className={`action-token action-token--${action}`}>
                  {ACTION_META[action].short}
                </span>
                <span className="action-stat-name">{ACTION_META[action].label}</span>
                <span className="action-stat-count" title="Actions observed">
                  {stats.trials}
                </span>
                <strong className="action-stat-rate" title="Win rate">
                  {formatPercent(winRate)}
                </strong>
                <span
                  className={`action-stat-net ${meanNet < 0 ? "is-negative" : "is-positive"}`}
                  title="Average net"
                >
                  {formatSigned(meanNet)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="cell-empty">No observations yet</p>
      )}
    </div>
  );
}
