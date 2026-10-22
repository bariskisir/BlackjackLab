import { useEffect, useRef, useState } from "react";
import { useSurvivalRunner } from "../hooks/useSurvivalRunner";
import { getRuleChips } from "../simulation/rules";
import type { BettingSystem, SavedStrategy, SurvivalResult } from "../simulation/types";
import { formatDollars, formatNumber, formatPercent } from "../lib/presentation";
import { formatStrategyLabel } from "../lib/savedStrategies";
import { BankrollChart } from "./BankrollChart";
import "./SurvivalMode.scss";

const DEFAULT_STARTING_BANKROLL = "100";
const DEFAULT_BASE_BET = "1";
const MAX_STARTING_BANKROLL = 1_000_000_000;

interface SurvivalModeProps {
  strategies: SavedStrategy[];
  selectedId: string;
  storageError: string | null;
  onSelectStrategy: (id: string) => void;
  onDeleteStrategy: (id: string) => void;
}

function sanitizeAmount(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

function DollarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.5v11M14.8 9.2c-.5-.8-1.5-1.2-2.8-1.2-1.7 0-2.8.8-2.8 2 0 1.4 1.2 1.8 2.8 2.1 1.7.3 2.9.7 2.9 2.1 0 1.2-1.2 2-2.9 2-1.4 0-2.5-.5-3-1.4" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3.8 5.4h12.4M8 3.6h4M5.6 5.4l.7 10.9h7.4l.7-10.9M8.3 8.4v5.5M11.7 8.4v5.5" />
    </svg>
  );
}

function SurvivalResultView({ result }: { result: SurvivalResult }) {
  const winRate = result.roundsSurvived > 0 ? result.wins / result.roundsSurvived : 0;

  return (
    <div className="survival-result">
      <header className="survival-result-head">
        <div>
          <span className="survival-result-kicker is-busted">BANKROLL EXHAUSTED</span>
          <div className="survival-big">
            <strong>{formatNumber(result.roundsSurvived)}</strong>
            <span>rounds survived</span>
          </div>
        </div>
        <div className="survival-outcome is-busted">
          <i aria-hidden="true" />
          Busted
        </div>
      </header>

      <div className="survival-number-grid">
        <div className="survival-number-grid-primary">
          <span>RUSH WIN RATE</span>
          <strong>{formatPercent(winRate, 1)}</strong>
        </div>
        <div>
          <span>PEAK BANKROLL</span>
          <strong>{formatDollars(result.peakBankroll)}</strong>
        </div>
        <div>
          <span>ROUNDS WON</span>
          <strong>{formatNumber(result.wins)}</strong>
        </div>
        <div>
          <span>ROUNDS LOST</span>
          <strong>{formatNumber(result.losses)}</strong>
        </div>
        <div>
          <span>ROUNDS DRAW</span>
          <strong>{formatNumber(result.pushes)}</strong>
        </div>
      </div>

      <BankrollChart key={result.completedAt} result={result} />
    </div>
  );
}

export function SurvivalMode({
  strategies,
  selectedId,
  storageError,
  onSelectStrategy,
  onDeleteStrategy,
}: SurvivalModeProps) {
  const { result, error, isRunning, run, cancel } = useSurvivalRunner();
  const [bankrollInput, setBankrollInput] = useState(DEFAULT_STARTING_BANKROLL);
  const [baseBetInput, setBaseBetInput] = useState(DEFAULT_BASE_BET);
  const [bettingSystem, setBettingSystem] = useState<BettingSystem>("normal");
  const [inputError, setInputError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selected = strategies.find((strategy) => strategy.id === selectedId) ?? null;

  useEffect(() => {
    if (isRunning) setMenuOpen(false);
  }, [isRunning]);

  useEffect(() => {
    if (strategies.length === 0) setMenuOpen(false);
  }, [strategies.length]);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const handleRunClick = () => {
    if (isRunning) {
      cancel();
      return;
    }

    if (!selected) {
      setInputError("Complete a training run first so a chart can be saved.");
      return;
    }

    const startingBankroll = Number.parseInt(bankrollInput, 10);
    if (!Number.isFinite(startingBankroll) || startingBankroll < 1) {
      setInputError("Enter at least $1 to start.");
      return;
    }

    if (startingBankroll > MAX_STARTING_BANKROLL) {
      setInputError(`Starting bankroll cannot exceed $${formatNumber(MAX_STARTING_BANKROLL)}.`);
      return;
    }

    const baseBet = Number.parseInt(baseBetInput, 10);
    if (!Number.isFinite(baseBet) || baseBet < 1) {
      setInputError("Enter a base bet of at least $1.");
      return;
    }

    if (baseBet > startingBankroll) {
      setInputError("Base bet cannot exceed the starting bankroll.");
      return;
    }

    setInputError(null);
    run(selected, startingBankroll, baseBet, bettingSystem);
  };

  const handleBankrollChange = (value: string) => {
    setBankrollInput(sanitizeAmount(value));
    setInputError(null);
  };

  const handleBaseBetChange = (value: string) => {
    setBaseBetInput(sanitizeAmount(value));
    setInputError(null);
  };

  const handleBettingSystemChange = (value: string) => {
    setBettingSystem(value === "martingale" ? "martingale" : "normal");
    setInputError(null);
  };

  const buttonLabel = isRunning ? "Cancel run" : result ? "Run again" : "Run survival";

  return (
    <section className="survival" aria-label="Rush">
      <div className="survival-glow" aria-hidden="true" />
      <header className="survival-head">
        <span className="panel-kicker">RUSH</span>
      </header>

      <div className="survival-layout">
        <div className="survival-controls">
          <div className="survival-label-row">
            <label htmlFor="survival-strategy">Saved strategy chart</label>
            <span>{strategies.length} saved</span>
          </div>
          <div className="survival-dropdown" ref={dropdownRef}>
            <button
              id="survival-strategy"
              className={`survival-dropdown-trigger${menuOpen ? " is-open" : ""}`}
              type="button"
              aria-expanded={menuOpen}
              aria-controls="survival-strategy-menu"
              onClick={() => setMenuOpen((open) => !open)}
              disabled={isRunning || strategies.length === 0}
              title={selected ? formatStrategyLabel(selected) : undefined}
            >
              <span className="survival-dropdown-value">
                {selected ? formatStrategyLabel(selected) : "No saved charts yet"}
              </span>
              <span className="survival-dropdown-arrow" aria-hidden="true">
                ▾
              </span>
            </button>

            {menuOpen && strategies.length > 0 && (
              <div
                className="survival-dropdown-menu"
                id="survival-strategy-menu"
                role="group"
                aria-label="Saved strategy charts"
              >
                {strategies.map((strategy) => {
                  const isSelected = strategy.id === selectedId;
                  return (
                    <div
                      className={`survival-dropdown-row${isSelected ? " is-selected" : ""}`}
                      key={strategy.id}
                    >
                      <button
                        className="survival-dropdown-option"
                        type="button"
                        aria-current={isSelected ? "true" : undefined}
                        onClick={() => {
                          onSelectStrategy(strategy.id);
                          setInputError(null);
                          setMenuOpen(false);
                        }}
                      >
                        <span>{formatStrategyLabel(strategy)}</span>
                        {isSelected && (
                          <span className="survival-option-check" aria-hidden="true">
                            ✓
                          </span>
                        )}
                      </button>
                      <button
                        className="survival-delete-button"
                        type="button"
                        aria-label={`Delete ${formatStrategyLabel(strategy)}`}
                        title="Delete saved chart"
                        disabled={isRunning}
                        onClick={() => onDeleteStrategy(strategy.id)}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selected && (
            <div className="survival-rule-chips" aria-label="Saved chart table rules">
              {getRuleChips(selected.rules).map((chip) => (
                <span key={chip}>{chip}</span>
              ))}
              <span>{selected.rules.maxSplitHands}-hand split</span>
            </div>
          )}

          {storageError && <p className="survival-storage-error">{storageError}</p>}

          <label className="survival-money-label" htmlFor="starting-bankroll">
            Starting bankroll
          </label>
          <div className="survival-money-field">
            <DollarIcon />
            <input
              id="starting-bankroll"
              inputMode="numeric"
              autoComplete="off"
              value={bankrollInput}
              onChange={(event) => handleBankrollChange(event.target.value)}
              disabled={isRunning}
              placeholder="100"
            />
            <span>USD</span>
          </div>

          <label className="survival-money-label" htmlFor="base-bet">
            Base bet
          </label>
          <div className="survival-money-field">
            <DollarIcon />
            <input
              id="base-bet"
              inputMode="numeric"
              autoComplete="off"
              value={baseBetInput}
              onChange={(event) => handleBaseBetChange(event.target.value)}
              disabled={isRunning}
              placeholder="1"
            />
            <span>USD</span>
          </div>

          <label className="survival-money-label" htmlFor="betting-system">
            Betting system
          </label>
          <div className="survival-select">
            <select
              id="betting-system"
              value={bettingSystem}
              onChange={(event) => handleBettingSystemChange(event.target.value)}
              disabled={isRunning}
            >
              <option value="normal">Normal</option>
              <option value="martingale">Martingale</option>
            </select>
            <span className="survival-select-arrow" aria-hidden="true">
              ▾
            </span>
          </div>
          {bettingSystem === "martingale" && (
            <p className="survival-hint">
              Martingale: the bet doubles after each loss (1× → 2× → 4× → 8×…) and
              resets on a win; a push repeats the bet. If the bankroll cannot cover
              the next stake, the whole balance is wagered.
            </p>
          )}

          <button
            className={`survival-run-button${isRunning ? " is-running" : ""}`}
            type="button"
            onClick={handleRunClick}
            disabled={!isRunning && !selected}
          >
            {isRunning ? <StopIcon /> : <DollarIcon />}
            <span>{buttonLabel}</span>
          </button>

          {(inputError || error) && <p className="survival-error">{inputError ?? error}</p>}
        </div>

        <div className="survival-output" aria-live="polite">
          {isRunning ? (
            <div className="survival-empty" role="status">
              <span className="survival-loader" aria-hidden="true" />
              <strong>Playing the table</strong>
              <p>Testing the selected chart until the bankroll can no longer cover the next bet.</p>
            </div>
          ) : result ? (
            <SurvivalResultView result={result} />
          ) : (
            <div className="survival-empty">
              <div className="survival-coin-stack" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <strong>{strategies.length === 0 ? "No chart in the vault yet" : "Ready for a run"}</strong>
              {strategies.length === 0 && (
                <p>Complete a training run above. Every finished chart is saved here automatically.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
