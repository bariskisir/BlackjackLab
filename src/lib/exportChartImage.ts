import {
  ACTIONS,
  ACTION_SHORT_LABELS,
  CHART_ROWS,
  DEALER_LABELS,
  DEALER_UPCARDS,
  cardKey,
  getCellLeader,
  getCellTotals,
  getCoverage,
} from "../simulation/chart";
import { getRuleSummary } from "../simulation/rules";
import type { ChartAction, ChartExportSource, ChartRow, GameRules } from "../simulation/types";
import { ACTION_META, formatDuration, formatNumber } from "./presentation";

const WIDTH = 1600;
const MARGIN = 64;
const LABEL_WIDTH = 186;
const COLUMN_GAP = 12;
const CELL_GAP = 6;
const ROW_HEIGHT = 50;
const CELL_HEIGHT = 44;
const SECTION_HEIGHT = 42;
const AXIS_HEIGHT = 52;
const TABLE_TOP = 252;

const ACTION_COLORS: Record<ChartAction, { fill: string; text: string }> = {
  hit: { fill: "#e3a049", text: "#271a0c" },
  stand: { fill: "#347355", text: "#f8f0df" },
  double: { fill: "#b44a37", text: "#fff4e7" },
  split: { fill: "#3d6e9c", text: "#f7f1e1" },
};

const GROUPS = [
  { kind: "hard", label: "HARD HANDS" },
  { kind: "soft", label: "SOFT HANDS" },
  { kind: "pair", label: "PAIRS" },
] as const;

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function actionColor(action: ChartAction): { fill: string; text: string } {
  return ACTION_COLORS[action];
}

function buildRuleLine(rules: GameRules): string {
  const doubleRule =
    rules.doubleRule === "any"
      ? "double any"
      : rules.doubleRule === "9-11"
        ? "double 9-11"
        : "double 10-11";
  return `${getRuleSummary(rules)} · ${doubleRule}`;
}

function drawHeader(
  context: CanvasRenderingContext2D,
  result: ChartExportSource,
  coverage: number,
) {
  const coveragePercent = Math.round((coverage / (CHART_ROWS.length * DEALER_UPCARDS.length)) * 100);
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(result.completedAt));

  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillStyle = "#6d7363";
  context.font = '500 18px "DM Mono", monospace';
  context.fillText("BLACKJACK LAB / DECISION MAP", MARGIN, 66);

  context.fillStyle = "#1a241c";
  context.font = '800 58px "Manrope", "Segoe UI", sans-serif';
  context.fillText("Learned strategy table", MARGIN, 132);

  context.fillStyle = "#5f6756";
  context.font = '500 20px "DM Mono", monospace';
  const metrics = [
    `${formatNumber(result.totals.rounds)} rounds`,
    result.durationMs !== null ? formatDuration(result.durationMs) : null,
    `${coverage} cells mapped (${coveragePercent}%)`,
    dateLabel,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");
  context.fillText(metrics, MARGIN, 174);

  context.fillStyle = "#777d6b";
  context.font = '400 19px "Manrope", "Segoe UI", sans-serif';
  context.fillText(buildRuleLine(result.rules), MARGIN, 208);

  context.textAlign = "right";
  context.fillStyle = "#202a21";
  context.font = '500 17px "DM Mono", monospace';
  context.fillText("STAKE-WEIGHTED NET RETURN", WIDTH - MARGIN, 132);
  context.fillStyle = "#7b8070";
  context.font = '400 16px "DM Mono", monospace';
  context.fillText("Higher confidence = more trials", WIDTH - MARGIN, 158);
  context.textAlign = "left";

  context.strokeStyle = "rgba(25, 35, 26, 0.18)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(MARGIN, 232);
  context.lineTo(WIDTH - MARGIN, 232);
  context.stroke();
}

function drawDealerHeader(
  context: CanvasRenderingContext2D,
  cellWidth: number,
  cellsLeft: number,
  tableBaseRows: Map<string, number>,
) {
  const top = TABLE_TOP;
  const centerY = top + AXIS_HEIGHT / 2;
  context.fillStyle = "#7a806f";
  context.font = '500 17px "DM Mono", monospace';
  context.textBaseline = "middle";
  context.textAlign = "left";
  context.fillText("HAND", MARGIN, centerY);

  DEALER_UPCARDS.forEach((dealer) => {
    const x = cellsLeft + tableBaseRows.get(String(dealer))! * (cellWidth + CELL_GAP);
    roundedRect(context, x, top + 4, cellWidth, AXIS_HEIGHT - 10, 8);
    context.fillStyle = "rgba(255, 255, 255, 0.34)";
    context.fill();
    context.strokeStyle = "rgba(27, 38, 29, 0.13)";
    context.stroke();
    context.fillStyle = "#3c483a";
    context.font = '500 22px "DM Mono", monospace';
    context.textAlign = "center";
    context.fillText(DEALER_LABELS[dealer], x + cellWidth / 2, centerY);
  });
  context.textAlign = "left";
}

function drawSection(
  context: CanvasRenderingContext2D,
  label: string,
  y: number,
  lineStart: number,
) {
  context.fillStyle = "#8b8f7c";
  context.font = '500 16px "DM Mono", monospace';
  context.textBaseline = "middle";
  context.textAlign = "left";
  context.fillText(label, MARGIN, y + SECTION_HEIGHT / 2);
  const textWidth = context.measureText(label).width;
  context.strokeStyle = "rgba(29, 39, 30, 0.14)";
  context.beginPath();
  context.moveTo(MARGIN + textWidth + 16, y + SECTION_HEIGHT / 2);
  context.lineTo(WIDTH - MARGIN, y + SECTION_HEIGHT / 2);
  context.stroke();
  context.strokeStyle = "rgba(29, 39, 30, 0.08)";
  context.beginPath();
  context.moveTo(lineStart, y + SECTION_HEIGHT / 2);
  context.lineTo(lineStart, y + SECTION_HEIGHT / 2);
  context.stroke();
}

function drawRow(
  context: CanvasRenderingContext2D,
  row: ChartRow,
  stats: ChartExportSource["stats"],
  y: number,
  cellWidth: number,
  cellsLeft: number,
) {
  context.fillStyle = row.kind === "pair" ? "#294836" : "#394538";
  context.font = row.kind === "pair"
    ? '600 21px "DM Mono", monospace'
    : '500 21px "DM Mono", monospace';
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText(row.label, MARGIN + 4, y + ROW_HEIGHT / 2);

  DEALER_UPCARDS.forEach((dealer, columnIndex) => {
    const cell = stats[cardKey(row.id, dealer)];
    const leader = cell ? getCellLeader(cell, row, 1) : null;
    const x = cellsLeft + columnIndex * (cellWidth + CELL_GAP);
    const top = y + (ROW_HEIGHT - CELL_HEIGHT) / 2;
    roundedRect(context, x, top, cellWidth, CELL_HEIGHT, 7);

    if (!leader) {
      context.fillStyle = "rgba(32, 45, 35, 0.055)";
      context.fill();
      context.strokeStyle = "rgba(32, 45, 35, 0.065)";
      context.stroke();
      return;
    }

    const colors = actionColor(leader.action);
    context.fillStyle = colors.fill;
    context.fill();

    context.fillStyle = colors.text;
    context.font = leader.action === "split"
      ? '600 19px "DM Mono", monospace'
      : '600 22px "DM Mono", monospace';
    context.textAlign = "center";
    context.fillText(
      ACTION_SHORT_LABELS[leader.action],
      x + cellWidth / 2,
      top + CELL_HEIGHT / 2 + 1,
    );

    const trials = getCellTotals(cell);
    if (trials > 0) {
      const confidence = Math.min(1, leader.stats.trials / 120);
      context.globalAlpha = 0.34;
      context.fillStyle = colors.text;
      roundedRect(context, x + 8, top + CELL_HEIGHT - 7, (cellWidth - 16) * confidence, 2.5, 2);
      context.fill();
      context.globalAlpha = 1;
    }
  });
}

function drawFooter(context: CanvasRenderingContext2D, footerTop: number, height: number) {
  context.strokeStyle = "rgba(30, 41, 31, 0.13)";
  context.beginPath();
  context.moveTo(MARGIN, footerTop);
  context.lineTo(WIDTH - MARGIN, footerTop);
  context.stroke();

  let x = MARGIN;
  const y = footerTop + 39;
  context.textAlign = "left";
  context.textBaseline = "middle";

  ACTIONS.forEach((action) => {
    const colors = actionColor(action);
    roundedRect(context, x, y - 10, 20, 20, 4);
    context.fillStyle = colors.fill;
    context.fill();
    x += 28;
    context.fillStyle = "#3d473b";
    context.font = '500 18px "DM Mono", monospace';
    context.fillText(ACTION_META[action].short, x, y);
    x += context.measureText(ACTION_META[action].short).width + 8;
    context.fillStyle = "#7b8070";
    context.font = '400 18px "Manrope", "Segoe UI", sans-serif';
    context.fillText(ACTION_META[action].label, x, y);
    x += context.measureText(ACTION_META[action].label).width + 28;
  });

  context.fillStyle = "#8a8d7b";
  context.font = '400 16px "DM Mono", monospace';
  context.textAlign = "right";
  context.fillText("Generated at blackjack-lab-ruddy.vercel.app", WIDTH - MARGIN, y - 6);
  context.fillStyle = "#9a9c8a";
  context.font = '400 14px "DM Mono", monospace';
  context.fillText("No data cells are intentionally blank", WIDTH - MARGIN, y + 16);
  context.textAlign = "left";

  context.fillStyle = "rgba(0, 0, 0, 0.03)";
  context.fillRect(0, height - 10, WIDTH, 10);
}

function renderChart(result: ChartExportSource): HTMLCanvasElement {
  const cellWidth =
    (WIDTH - MARGIN * 2 - LABEL_WIDTH - COLUMN_GAP - CELL_GAP * (DEALER_UPCARDS.length - 1)) /
    DEALER_UPCARDS.length;
  const cellsLeft = MARGIN + LABEL_WIDTH + COLUMN_GAP;
  let rowCursor = TABLE_TOP + AXIS_HEIGHT;
  const rowPositions = new Map<string, number>();
  const dealerPositions = new Map<string, number>();

  CHART_ROWS.forEach((row) => {
    rowPositions.set(row.id, rowCursor);
    rowCursor += ROW_HEIGHT;
  });

  DEALER_UPCARDS.forEach((dealer, index) => {
    dealerPositions.set(String(dealer), index);
  });

  const tableHeight =
    AXIS_HEIGHT + SECTION_HEIGHT * GROUPS.length + ROW_HEIGHT * CHART_ROWS.length;
  const footerTop = TABLE_TOP + tableHeight + 34;
  const height = footerTop + 96;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) throw new Error("Could not prepare the chart image canvas.");

  const background = context.createLinearGradient(0, 0, WIDTH, height);
  background.addColorStop(0, "#f7efde");
  background.addColorStop(1, "#efe4cf");
  context.fillStyle = background;
  context.fillRect(0, 0, WIDTH, height);

  context.save();
  context.translate(WIDTH - 190, 184);
  context.rotate(-0.12);
  context.fillStyle = "rgba(29, 43, 32, 0.035)";
  context.font = '400 300px "Manrope", "Segoe UI", sans-serif';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("♠", 0, 0);
  context.restore();

  context.fillStyle = "#1f2b22";
  context.fillRect(0, 0, WIDTH, 8);

  const coverage = getCoverage(result.stats);
  drawHeader(context, result, coverage);
  drawDealerHeader(context, cellWidth, cellsLeft, dealerPositions);

  let y = TABLE_TOP + AXIS_HEIGHT;
  GROUPS.forEach((group) => {
    drawSection(context, group.label, y, cellsLeft);
    y += SECTION_HEIGHT;
    CHART_ROWS.filter((row) => row.kind === group.kind).forEach((row) => {
      drawRow(context, row, result.stats, y, cellWidth, cellsLeft);
      y += ROW_HEIGHT;
    });
  });

  drawFooter(context, footerTop, height);
  return canvas;
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  if (!blob) throw new Error("The browser could not encode the chart image.");
  return blob;
}

export async function downloadStrategyChartImage(result: ChartExportSource): Promise<void> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  const canvas = renderChart(result);
  const blob = await canvasToBlob(canvas);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date(result.completedAt).toISOString().slice(0, 10);
  link.href = url;
  link.download = `blackjack-strategy-chart-${date}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
