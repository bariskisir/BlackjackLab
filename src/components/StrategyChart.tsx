import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ACTIONS,
  ACTION_SHORT_LABELS,
  CHART_ROWS,
  DEALER_LABELS,
  DEALER_UPCARDS,
  cardKey,
  getCellLeader,
  getCellTotals,
} from "../simulation/chart";
import type { ChartRow, ChartStats, HandKind } from "../simulation/types";
import { ACTION_META, getKindSectionLabel } from "../lib/presentation";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { CellDetails } from "./CellDetails";
import "./StrategyChart.scss";

interface StrategyChartProps {
  stats: ChartStats;
  hasResult: boolean;
}

interface HoverState {
  rowId: string;
  dealer: number;
  above: boolean;
  align: "left" | "center" | "right";
}

interface SheetState {
  rowId: string;
  dealer: number;
}

interface CellSummary {
  leader: ReturnType<typeof getCellLeader>;
  total: number;
  confidence: number;
}

const GROUPS: HandKind[] = ["hard", "soft", "pair"];

export function StrategyChart({ stats, hasResult }: StrategyChartProps) {
  const usesSheet = useMediaQuery("(max-width: 900px), (hover: none)");
  const [hovered, setHovered] = useState<HoverState | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const summaries = useMemo(() => {
    const next = new Map<string, CellSummary>();
    for (const row of CHART_ROWS) {
      for (const dealer of DEALER_UPCARDS) {
        const cell = stats[cardKey(row.id, dealer)];
        if (!cell) continue;
        const leader = getCellLeader(cell, row, 1);
        const total = getCellTotals(cell);
        next.set(cardKey(row.id, dealer), {
          leader,
          total,
          confidence: leader ? Math.min(1, leader.stats.trials / 120) : 0,
        });
      }
    }
    return next;
  }, [stats]);

  useEffect(() => {
    if (!hovered) return;
    const hide = () => setHovered(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [hovered]);

  useEffect(() => {
    if (!sheet) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheet(null);
    };
    document.body.classList.add("has-cell-sheet");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("has-cell-sheet");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [sheet]);

  useEffect(() => {
    if (usesSheet) setHovered(null);
  }, [usesSheet]);

  useLayoutEffect(() => {
    const node = tooltipRef.current;
    if (!hovered || !node) return;
    const anchor = node.parentElement?.querySelector<HTMLElement>(".chart-cell.is-hovered");
    if (!anchor) return;

    const anchorRect = anchor.getBoundingClientRect();
    const width = node.offsetWidth;
    const height = node.offsetHeight;
    const margin = 12;
    const spaceAbove = anchorRect.top - margin;
    const spaceBelow = window.innerHeight - anchorRect.bottom - margin;
    const above = spaceBelow < height && spaceAbove > spaceBelow;
    const center = anchorRect.left + anchorRect.width / 2;
    const left = center - width / 2;
    const align =
      left < margin
        ? "left"
        : left + width > window.innerWidth - margin
          ? "right"
          : "center";

    if (above !== hovered.above || align !== hovered.align) {
      setHovered((current) =>
        current && current.rowId === hovered.rowId && current.dealer === hovered.dealer
          ? { ...current, above, align }
          : current,
      );
    }
  }, [hovered]);

  const hoveredRow = hovered
    ? CHART_ROWS.find((row) => row.id === hovered.rowId) ?? null
    : null;
  const hoveredCell =
    hovered && hoveredRow ? stats[cardKey(hoveredRow.id, hovered.dealer)] : null;

  const sheetRow = sheet ? CHART_ROWS.find((row) => row.id === sheet.rowId) ?? null : null;
  const sheetCell = sheet && sheetRow ? stats[cardKey(sheetRow.id, sheet.dealer)] : null;

  const showTooltip = (row: ChartRow, dealer: number) => {
    if (usesSheet) return;
    setHovered({ rowId: row.id, dealer, above: false, align: "center" });
  };

  const clearTooltip = () => {
    if (!usesSheet) setHovered(null);
  };

  const handleActivate = (row: ChartRow, dealer: number) => {
    if (usesSheet) setSheet({ rowId: row.id, dealer });
  };

  const isSelected = (row: ChartRow, dealer: number) =>
    sheet?.rowId === row.id && sheet.dealer === dealer;

  const isHovered = (row: ChartRow, dealer: number) =>
    hovered?.rowId === row.id && hovered.dealer === dealer;

  return (
    <div className={`strategy-chart${hasResult ? " has-result" : ""}`}>
      <div className="chart-axis">
        <span>Dealer&apos;s up card</span>
        <span className="chart-axis-arrow" aria-hidden="true">
          →
        </span>
        <span className="chart-axis-hand">Your hand</span>
      </div>

      <div className="chart-table-wrap">
        <table className="strategy-table">
          <caption className="visually-hidden">
            Blackjack strategy table by dealer up card
          </caption>
          <thead>
            <tr>
              <th scope="col" className="corner-cell">
                <span>HAND</span>
                <span aria-hidden="true">↓</span>
              </th>
              {DEALER_UPCARDS.map((dealer) => (
                <th scope="col" key={dealer}>
                  <span className="dealer-head">{DEALER_LABELS[dealer]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((group) => {
              const rows = CHART_ROWS.filter((row) => row.kind === group);
              return (
                <Fragment key={group}>
                  <tr className="section-row">
                    <th scope="rowgroup" colSpan={DEALER_UPCARDS.length + 1}>
                      <span className="section-label">
                        {getKindSectionLabel(group)}
                        <i aria-hidden="true" />
                      </span>
                    </th>
                  </tr>
                  {rows.map((row) => (
                    <tr className={`chart-row chart-row--${row.kind}`} key={row.id}>
                      <th scope="row" className="row-label">
                        <span>{row.label}</span>
                      </th>
                      {DEALER_UPCARDS.map((dealer) => {
                        const summary = summaries.get(cardKey(row.id, dealer));
                        const leader = summary?.leader ?? null;
                        const action = leader?.action;
                        const confidenceLevel = action
                          ? Math.max(1, Math.min(5, Math.ceil((summary?.confidence ?? 0) * 5)))
                          : 0;
                        const aria = `${row.label}, dealer ${DEALER_LABELS[dealer]}, ${
                          action
                            ? `best action ${ACTION_META[action].label}, ${leader?.stats.trials ?? 0} observations`
                            : "no data yet"
                        }`;

                        return (
                          <td key={dealer}>
                            <button
                              type="button"
                              className={`chart-cell${
                                action ? ` chart-cell--${action}` : " chart-cell--empty"
                              }${isHovered(row, dealer) ? " is-hovered" : ""}${
                                isSelected(row, dealer) ? " is-selected" : ""
                              }`}
                              aria-label={aria}
                              onMouseEnter={() => showTooltip(row, dealer)}
                              onMouseLeave={clearTooltip}
                              onFocus={() => showTooltip(row, dealer)}
                              onBlur={clearTooltip}
                              onClick={() => handleActivate(row, dealer)}
                            >
                              <span className="cell-letter">
                                {action ? ACTION_SHORT_LABELS[action] : "·"}
                              </span>
                              <span
                                className={`cell-confidence cell-confidence--${confidenceLevel}`}
                                aria-hidden="true"
                              />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="chart-footer">
        <div className="chart-legend" aria-label="Action colors">
          {ACTIONS.map((action) => (
            <span className="legend-item" key={action}>
              <i className={`legend-swatch legend-swatch--${action}`} aria-hidden="true" />
              <strong>{ACTION_META[action].short}</strong>
              <span>{ACTION_META[action].label}</span>
            </span>
          ))}
          <span className="legend-item legend-item--empty">
            <i className="legend-swatch legend-swatch--empty" aria-hidden="true" />
            <span>No data</span>
          </span>
        </div>
      </div>

      {hovered && hoveredRow && hoveredCell && !usesSheet && (
        <div
          ref={tooltipRef}
          className={`cell-tooltip${hovered.above ? " is-above" : " is-below"} is-${
            hovered.align
          }`}
          role="tooltip"
        >
          <CellDetails row={hoveredRow} dealer={hovered.dealer} cell={hoveredCell} />
        </div>
      )}

      {sheet &&
        sheetRow &&
        sheetCell &&
        usesSheet &&
        createPortal(
          <div className="cell-sheet-layer">
            <button
              className="cell-sheet-backdrop"
              type="button"
              aria-label="Close cell details"
              onClick={() => setSheet(null)}
            />
            <div
              className="cell-sheet"
              role="dialog"
              aria-modal="true"
              aria-label={`${sheetRow.label} cell details`}
            >
              <div className="cell-sheet-grabber" aria-hidden="true" />
              <CellDetails
                row={sheetRow}
                dealer={sheet.dealer}
                cell={sheetCell}
                compact
                onClose={() => setSheet(null)}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
