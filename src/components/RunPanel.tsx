import { useState } from "react";
import type { FormEvent } from "react";
import type { RunStatus } from "../hooks/useSimulationRunner";
import type { GameRules, SimulationResult } from "../simulation/types";
import { areRulesEqual } from "../simulation/rules";
import { formatNumber } from "../lib/presentation";
import "./RunPanel.scss";

const MIN_ROUNDS = 1;
const MAX_ROUNDS = 10_000_000_000;
const DEFAULT_ROUNDS = "1000000";
const PRESETS = [
  { label: "1M", value: 1_000_000 },
  { label: "10M", value: 10_000_000 },
  { label: "100M", value: 100_000_000 },
  { label: "1B", value: 1_000_000_000 },
  { label: "10B", value: 10_000_000_000 },
];

interface RunPanelProps {
  status: RunStatus;
  result: SimulationResult | null;
  error: string | null;
  progress: number;
  isRunning: boolean;
  rules: GameRules;
  onRun: (rounds: number) => void;
  onCancel: () => void;
}

function sanitizeRounds(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6.4 3.7 16 10l-9.6 6.3V3.7Z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <rect x="5" y="5" width="10" height="10" rx="1.5" />
    </svg>
  );
}

export function RunPanel({
  status,
  result,
  error,
  progress,
  isRunning,
  rules,
  onRun,
  onCancel,
}: RunPanelProps) {
  const [roundInput, setRoundInput] = useState(DEFAULT_ROUNDS);
  const [inputError, setInputError] = useState<string | null>(null);
  const numericRounds = Number.parseInt(roundInput, 10);
  const validRounds =
    Number.isFinite(numericRounds) && numericRounds >= MIN_ROUNDS && numericRounds <= MAX_ROUNDS;
  const hasResult = Boolean(result && result.totals.rounds > 0);
  const canRunAgain =
    result !== null &&
    numericRounds === result.totals.rounds &&
    areRulesEqual(rules, result.rules);
  const isPresetActive = (value: number) => Number(roundInput) === value;
  const stateLabel = isRunning
    ? "Running"
    : status === "done"
      ? "Complete"
      : status === "error"
        ? "Error"
        : "Idle";
  const buttonLabel = isRunning
    ? `Cancel run · ${progress}%`
    : hasResult && canRunAgain
      ? "Run again"
      : "Run simulation";

  const handleRun = () => {
    if (!validRounds) {
      setInputError(`Enter a round count between 1 and ${formatNumber(MAX_ROUNDS)}.`);
      return;
    }

    setInputError(null);
    onRun(numericRounds);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isRunning) return;
    handleRun();
  };

  const handleRoundChange = (value: string) => {
    setRoundInput(sanitizeRounds(value));
    setInputError(null);
  };

  const choosePreset = (value: number) => {
    setRoundInput(String(value));
    setInputError(null);
  };

  return (
    <form className={`run-panel${isRunning ? " is-running" : ""}`} onSubmit={handleSubmit}>
      <div className="run-panel-head">
        <span className="panel-kicker">NEW RUN</span>
        <span className={`run-state run-state--${status}`}>
          <i aria-hidden="true" />
          {stateLabel}
        </span>
      </div>

      <label className="round-label" htmlFor="round-count">
        Rounds to simulate
      </label>
      <div className={`round-field${inputError ? " has-error" : ""}`}>
        <input
          id="round-count"
          inputMode="numeric"
          autoComplete="off"
          value={roundInput}
          onChange={(event) => handleRoundChange(event.target.value)}
          disabled={isRunning}
          placeholder="1000000"
        />
        <span>ROUNDS</span>
      </div>

      <div className="preset-row" aria-label="Quick round presets">
        {PRESETS.map((preset) => (
          <button
            type="button"
            className={isPresetActive(preset.value) ? "is-active" : ""}
            key={preset.value}
            onClick={() => choosePreset(preset.value)}
            disabled={isRunning}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <button
        className="run-button"
        type="button"
        onClick={isRunning ? onCancel : handleRun}
      >
        {isRunning && (
          <progress
            className="run-button-progress"
            max={100}
            value={progress}
            aria-label="Run progress"
          />
        )}
        {isRunning ? <StopIcon /> : <PlayIcon />}
        <span>{buttonLabel}</span>
      </button>

      {(inputError || error) && <p className="run-error">{inputError ?? error}</p>}
    </form>
  );
}
