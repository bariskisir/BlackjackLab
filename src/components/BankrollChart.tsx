import { useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { SurvivalResult } from "../simulation/types";
import { formatDollars, formatNumber } from "../lib/presentation";
import "./BankrollChart.scss";

const WIDTH = 660;
const HEIGHT = 320;
const PADDING = { top: 12, right: 12, bottom: 12, left: 12 };
const TOOLTIP_WIDTH = 176;
const TOOLTIP_HEIGHT = 78;
const TOOLTIP_GAP = 14;

interface BankrollPoint {
  x: number;
  y: number;
  round: number;
  bankroll: number;
  bet: number;
}

interface HoverPoint {
  x: number;
  y: number;
  plotLeft: number;
  plotRight: number;
  plotTop: number;
  plotBottom: number;
  chartWidth: number;
  chartHeight: number;
  round: number;
  bankroll: number;
  bet: number;
}

interface BankrollChartProps {
  result: SurvivalResult;
}

function bankrollAtRound(points: BankrollPoint[], round: number): number {
  if (points.length === 0) return 0;
  const first = points[0];
  if (round <= first.round) return first.bankroll;
  const last = points[points.length - 1];
  if (round >= last.round) return last.bankroll;

  let low = 0;
  let high = points.length - 1;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle].round <= round) {
      low = middle;
    } else {
      high = middle;
    }
  }

  const left = points[low];
  const right = points[high];
  const span = right.round - left.round;
  const progress = span === 0 ? 0 : (round - left.round) / span;
  return left.bankroll + (right.bankroll - left.bankroll) * progress;
}

function betAtRound(points: BankrollPoint[], round: number): number {
  let bet = 0;
  for (const point of points) {
    if (point.round > round) break;
    bet = point.bet;
  }
  return bet;
}

function tooltipPosition(hover: HoverPoint): { x: number; y: number } {
  const x =
    hover.x + TOOLTIP_GAP + TOOLTIP_WIDTH > hover.chartWidth
      ? hover.x - TOOLTIP_GAP - TOOLTIP_WIDTH
      : hover.x + TOOLTIP_GAP;
  const y =
    hover.y - TOOLTIP_GAP - TOOLTIP_HEIGHT < 0
      ? hover.y + TOOLTIP_GAP
      : hover.y - TOOLTIP_GAP - TOOLTIP_HEIGHT;

  return {
    x: Math.max(0, Math.min(x, Math.max(0, hover.chartWidth - TOOLTIP_WIDTH))),
    y: Math.max(0, Math.min(y, Math.max(0, hover.chartHeight - TOOLTIP_HEIGHT))),
  };
}

export function BankrollChart({ result }: BankrollChartProps) {
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const plotBottom = PADDING.top + plotHeight;
  const maxBankroll = Math.max(result.peakBankroll, result.startingBankroll, 1);
  const totalRounds = Math.max(result.roundsSurvived, 1);
  const xFor = (round: number) => PADDING.left + (round / totalRounds) * plotWidth;
  const yFor = (bankroll: number) => PADDING.top + (1 - bankroll / maxBankroll) * plotHeight;
  const [hover, setHover] = useState<HoverPoint | null>(null);
  const points: BankrollPoint[] = result.timeline.map((point) => ({
    x: xFor(point.round),
    y: yFor(point.bankroll),
    round: point.round,
    bankroll: point.bankroll,
    bet: point.bet,
  }));
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const areaPath = first && last
    ? `${path} L ${last.x.toFixed(2)} ${plotBottom} L ${first.x.toFixed(2)} ${plotBottom} Z`
    : "";
  const peakPoint = points.reduce(
    (best, point) => (point.bankroll > best.bankroll ? point : best),
    points[0],
  );
  const startY = yFor(result.startingBankroll);
  const yTicks = [0, 0.5, 1];
  const tooltip = hover ? tooltipPosition(hover) : null;

  const handleMouseMove = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (points.length === 0) return;
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = rect.width / WIDTH;
    const scaleY = rect.height / HEIGHT;
    const pointer = event.currentTarget.createSVGPoint();
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    const local = pointer.matrixTransform(matrix.inverse());
    const x = Math.min(Math.max(local.x, PADDING.left), WIDTH - PADDING.right);
    const round = ((x - PADDING.left) / plotWidth) * totalRounds;
    const bankroll = bankrollAtRound(points, round);
    const y = yFor(bankroll);

    setHover({
      x: x * scaleX,
      y: y * scaleY,
      plotLeft: PADDING.left * scaleX,
      plotRight: (WIDTH - PADDING.right) * scaleX,
      plotTop: PADDING.top * scaleY,
      plotBottom: plotBottom * scaleY,
      chartWidth: rect.width,
      chartHeight: rect.height,
      round: Math.round(round),
      bankroll,
      bet: betAtRound(points, round),
    });
  };

  return (
    <div className="bankroll-chart">
      <div className="bankroll-chart-stage">
        <svg
          className="bankroll-chart-svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={`Bankroll over ${formatNumber(result.roundsSurvived)} rounds, starting at ${formatDollars(result.startingBankroll)} and ending at ${formatDollars(result.finalBankroll)}.`}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="bankroll-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e9c46a" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#e9c46a" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {yTicks.map((fraction) => {
            const y = yFor(maxBankroll * fraction);
            return (
              <line
                className="bankroll-grid"
                key={fraction}
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={y}
                y2={y}
              />
            );
          })}

          <line
            className="bankroll-start-line"
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={startY}
            y2={startY}
          />

          {areaPath && <path className="bankroll-area" d={areaPath} />}
          {path && <path className="bankroll-line" d={path} />}

          {first && <circle className="bankroll-dot" cx={first.x} cy={first.y} r="3.5" />}
          {peakPoint && (
            <circle className="bankroll-peak-dot" cx={peakPoint.x} cy={peakPoint.y} r="3.2" />
          )}
          {last && <circle className="bankroll-final-dot" cx={last.x} cy={last.y} r="4" />}
        </svg>

        {hover && tooltip && (
          <svg className="bankroll-chart-overlay" aria-hidden="true">
            <line
              className="bankroll-crosshair"
              x1={hover.x}
              x2={hover.x}
              y1={hover.plotTop}
              y2={hover.plotBottom}
            />
            <line
              className="bankroll-crosshair"
              x1={hover.plotLeft}
              x2={hover.plotRight}
              y1={hover.y}
              y2={hover.y}
            />
            <circle className="bankroll-hover-dot" cx={hover.x} cy={hover.y} r="4.5" />
            <g transform={`translate(${tooltip.x} ${tooltip.y})`}>
              <rect
                className="bankroll-tooltip"
                width={TOOLTIP_WIDTH}
                height={TOOLTIP_HEIGHT}
                rx="7"
              />
              <text className="bankroll-tooltip-round" x="12" y="20">
                ROUND {formatNumber(hover.round)}
              </text>
              <text className="bankroll-tooltip-value" x="12" y="43">
                {formatDollars(Math.round(hover.bankroll))}
              </text>
              <text className="bankroll-tooltip-bet" x="12" y="65">
                BET {hover.bet > 0 ? formatDollars(hover.bet) : "—"}
              </text>
            </g>
          </svg>
        )}
      </div>
    </div>
  );
}
