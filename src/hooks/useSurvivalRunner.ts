import { useCallback, useEffect, useRef, useState } from "react";
import type {
  SavedStrategy,
  SurvivalRequest,
  SurvivalResult,
  SurvivalWorkerResponse,
} from "../simulation/types";

export type SurvivalStatus = "idle" | "running" | "done" | "error";

interface SurvivalRunnerState {
  status: SurvivalStatus;
  result: SurvivalResult | null;
  error: string | null;
}

export function useSurvivalRunner() {
  const [state, setState] = useState<SurvivalRunnerState>({
    status: "idle",
    result: null,
    error: null,
  });
  const workerRef = useRef<Worker | null>(null);

  const stopWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  const run = useCallback(
    (strategy: SavedStrategy, startingBankroll: number, baseBet: number) => {
      stopWorker();
      setState({ status: "running", result: null, error: null });

      const worker = new Worker(
        new URL("../simulation/survival.worker.ts", import.meta.url),
        { type: "module" },
      );
      workerRef.current = worker;

      worker.onmessage = (event: MessageEvent<SurvivalWorkerResponse>) => {
        if (event.data.type === "complete") {
          setState({ status: "done", result: event.data.result, error: null });
        } else {
          setState({ status: "error", result: null, error: event.data.message });
        }
        worker.terminate();
        workerRef.current = null;
      };

      worker.onerror = (event) => {
        setState({
          status: "error",
          result: null,
          error: event.message || "The survival simulation could not run.",
        });
        worker.terminate();
        workerRef.current = null;
      };

      const request: SurvivalRequest = {
        strategyId: strategy.id,
        stats: strategy.stats,
        rules: strategy.rules,
        startingBankroll,
        baseBet,
      };
      worker.postMessage(request);
    },
    [stopWorker],
  );

  const cancel = useCallback(() => {
    stopWorker();
    setState({ status: "idle", result: null, error: null });
  }, [stopWorker]);

  useEffect(() => stopWorker, [stopWorker]);

  return {
    ...state,
    isRunning: state.status === "running",
    run,
    cancel,
  };
}
