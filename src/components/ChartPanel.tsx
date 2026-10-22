import { useState } from "react";
import { createEmptyChartStats } from "../simulation/chart";
import type { ChartExportSource, SavedStrategy, SimulationResult } from "../simulation/types";
import { downloadStrategyChartImage } from "../lib/exportChartImage";
import { formatDuration } from "../lib/presentation";
import { StrategyChart } from "./StrategyChart";
import "./ChartPanel.scss";

const emptyStats = createEmptyChartStats();

type ImageState = "idle" | "working" | "done" | "error";

interface ChartPanelProps {
  result: SimulationResult | null;
  preview: SavedStrategy | null;
  isRunning: boolean;
  storageError: string | null;
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 2.8v8.4m0 0 3.2-3.2M10 11.2 6.8 8M4.2 13.6v1.8c0 .7.6 1.3 1.3 1.3h9c.7 0 1.3-.6 1.3-1.3v-1.8" />
    </svg>
  );
}

export function ChartPanel({
  result,
  preview,
  isRunning,
  storageError,
}: ChartPanelProps) {
  const [imageState, setImageState] = useState<ImageState>("idle");
  const source: ChartExportSource | null = preview
    ? {
        totals: preview.totals,
        stats: preview.stats,
        rules: preview.rules,
        completedAt: preview.createdAt,
        durationMs: null,
      }
    : result
      ? {
          totals: result.totals,
          stats: result.stats,
          rules: result.rules,
          completedAt: result.completedAt,
          durationMs: result.durationMs,
        }
      : null;
  const stats = source?.stats ?? emptyStats;
  const hasResult = Boolean(source && source.totals.rounds > 0);
  const completedAt = source?.completedAt ?? "empty-chart";
  const duration = preview ? null : result?.durationMs ?? null;
  const imageLabel =
    imageState === "working"
      ? "Rendering"
      : imageState === "done"
        ? "Saved"
        : imageState === "error"
          ? "Try again"
          : "Save image";

  const handleSaveImage = async () => {
    if (!source || imageState === "working") return;
    setImageState("working");
    try {
      await downloadStrategyChartImage(source);
      setImageState("done");
    } catch {
      setImageState("error");
    }
    window.setTimeout(() => setImageState("idle"), 2400);
  };

  return (
    <section className="chart-card" aria-labelledby="chart-title">
      <header className="panel-heading chart-heading">
        <div>
          <span className="panel-kicker">DECISION MAP</span>
          <h2 id="chart-title">Learned strategy table</h2>
        </div>
        <div className="chart-heading-right">
          {duration !== null && hasResult && (
            <span className="chart-duration">{formatDuration(duration)}</span>
          )}
          <button
            type="button"
            className={`chart-save-image chart-save-image--${imageState}`}
            onClick={handleSaveImage}
            disabled={!hasResult || isRunning || imageState === "working"}
          >
            <DownloadIcon />
            <span>{imageLabel}</span>
          </button>
        </div>
      </header>

      <div className="chart-stage">
        <StrategyChart key={completedAt} stats={stats} hasResult={hasResult} />
        {isRunning && (
          <div className="chart-loading" role="status" aria-live="polite">
            <span className="loader-orbit" aria-hidden="true" />
            <strong>Training and testing</strong>
            <span>
              Random exploration builds the table first, then the learned chart replays the same
              round count.
            </span>
          </div>
        )}
      </div>

      {storageError && <p className="chart-storage-message">{storageError}</p>}
    </section>
  );
}
