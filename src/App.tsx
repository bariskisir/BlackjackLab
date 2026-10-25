import { useEffect, useRef, useState } from "react";
import { ChartPanel } from "./components/ChartPanel";
import { Hero } from "./components/Hero";
import { RulesPanel } from "./components/RulesPanel";
import { RunPanel } from "./components/RunPanel";
import { SurvivalMode } from "./components/SurvivalMode";
import { TopBar } from "./components/TopBar";
import { useGameRules } from "./hooks/useGameRules";
import { useSavedStrategies } from "./hooks/useSavedStrategies";
import { useSimulationRunner } from "./hooks/useSimulationRunner";
import { strategyIdFor } from "./lib/savedStrategies";
import { trackAppStartup } from "./telemetry";
import "./App.scss";

export default function App() {
  const { rules, updateRules, resetRules } = useGameRules();
  const { strategies, storageError, saveStrategy, removeStrategy } = useSavedStrategies();
  const { status, result, error, progress, isRunning, run, cancel } = useSimulationRunner();
  const [selectedStrategyId, setSelectedStrategyId] = useState(() => strategies[0]?.id ?? "");
  const latestStrategyId = strategies[0]?.id ?? "";
  const previousLatestIdRef = useRef(latestStrategyId);
  const displayedResult = strategies.length > 0 ? result : null;
  const currentStrategyId = displayedResult ? strategyIdFor(displayedResult.completedAt) : null;
  const selectedStrategy =
    strategies.find((strategy) => strategy.id === selectedStrategyId) ?? null;
  const previewStrategy =
    selectedStrategy && selectedStrategy.id !== currentStrategyId ? selectedStrategy : null;

  useEffect(() => {
    void trackAppStartup();
  }, []);

  useEffect(() => {
    if (!result || result.totals.rounds === 0) return;
    saveStrategy(result);
  }, [result, saveStrategy]);

  useEffect(() => {
    const latestChanged = latestStrategyId !== previousLatestIdRef.current;
    previousLatestIdRef.current = latestStrategyId;

    setSelectedStrategyId((current) => {
      if (!latestStrategyId) return "";
      if (latestChanged) return latestStrategyId;
      if (strategies.some((strategy) => strategy.id === current)) return current;
      return latestStrategyId;
    });
  }, [latestStrategyId, strategies]);

  return (
    <div className="app-shell">
      <div className="ambient-grid" aria-hidden="true" />
      <div className="ambient-glow" aria-hidden="true" />

      <TopBar />

      <main id="top" className="page">
        <Hero>
          <RulesPanel
            rules={rules}
            disabled={isRunning}
            onChange={updateRules}
            onReset={resetRules}
          />
          <RunPanel
            status={status}
            result={result}
            error={error}
            progress={progress}
            isRunning={isRunning}
            rules={rules}
            onRun={(rounds) => run(rounds, rules)}
            onCancel={cancel}
          />
        </Hero>

        <section className="workspace">
          <ChartPanel
            result={displayedResult}
            preview={previewStrategy}
            isRunning={isRunning}
            storageError={storageError}
          />

          <aside className="side-rail">
            <SurvivalMode
              strategies={strategies}
              selectedId={selectedStrategyId}
              storageError={storageError}
              onSelectStrategy={setSelectedStrategyId}
              onDeleteStrategy={removeStrategy}
            />
          </aside>
        </section>
      </main>
    </div>
  );
}
