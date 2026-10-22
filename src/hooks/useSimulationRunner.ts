import { useCallback, useEffect, useRef, useState } from "react";
import { mergeEvaluations, mergeTrainingResults, splitRoundCounts } from "../simulation/aggregate";
import { PROGRESS_COALESCE_MS, PROGRESS_INTERVAL_MS } from "../simulation/progress";
import type {
  GameRules,
  SimulationResult,
  SimulationWorkerRequest,
  SimulationWorkerResponse,
} from "../simulation/types";

export type RunStatus = "idle" | "running" | "done" | "error";

interface RunnerState {
  status: RunStatus;
  result: SimulationResult | null;
  error: string | null;
}

const MAX_SIMULATION_WORKERS = 8;
const FALLBACK_CORE_COUNT = 4;

function getWorkerCount(rounds: number): number {
  const cores = navigator.hardwareConcurrency || FALLBACK_CORE_COUNT;
  return Math.max(1, Math.min(MAX_SIMULATION_WORKERS, Math.floor(cores), Math.floor(rounds)));
}

function requestWorker(
  worker: Worker,
  request: SimulationWorkerRequest,
  onProgress?: (completed: number) => void,
): Promise<SimulationWorkerResponse> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      worker.onmessage = null;
      worker.onerror = null;
    };

    worker.onmessage = (event: MessageEvent<SimulationWorkerResponse>) => {
      const response = event.data;
      if (response.type === "progress") {
        onProgress?.(response.completed);
        return;
      }
      cleanup();
      resolve(response);
    };

    worker.onerror = (event) => {
      cleanup();
      reject(new Error(event.message || "The simulation worker stopped unexpectedly."));
    };

    worker.postMessage(request);
  });
}

export function useSimulationRunner() {
  const [state, setState] = useState<RunnerState>({
    status: "idle",
    result: null,
    error: null,
  });
  const [progress, setProgress] = useState(0);
  const workersRef = useRef<Worker[]>([]);
  const runIdRef = useRef(0);
  const runningRef = useRef(false);
  const lastProgressRef = useRef(0);
  const lastProgressAtRef = useRef(0);
  const progressUpdateTimerRef = useRef<number | null>(null);

  const stopProgressUpdate = useCallback(() => {
    if (progressUpdateTimerRef.current === null) return;
    window.clearTimeout(progressUpdateTimerRef.current);
    progressUpdateTimerRef.current = null;
  }, []);

  const terminateWorkers = useCallback(() => {
    for (const worker of workersRef.current) {
      worker.terminate();
    }
    workersRef.current = [];
  }, []);

  const ensureWorkers = useCallback((count: number) => {
    const workers = workersRef.current;
    while (workers.length < count) {
      workers.push(
        new Worker(new URL("../simulation/simulation.worker.ts", import.meta.url), {
          type: "module",
        }),
      );
    }
    return workers.slice(0, count);
  }, []);

  const run = useCallback(
    (rounds: number, rules: GameRules) => {
      runIdRef.current += 1;
      const runId = runIdRef.current;
      if (runningRef.current) terminateWorkers();
      stopProgressUpdate();
      runningRef.current = true;
      lastProgressRef.current = 0;
      lastProgressAtRef.current = 0;
      setProgress(0);
      setState((current) => ({
        status: "running",
        result: current.result,
        error: null,
      }));

      const startedAt = performance.now();

      void (async () => {
        try {
          const workerCount = getWorkerCount(rounds);
          const workers = ensureWorkers(workerCount);
          const counts = splitRoundCounts(rounds, workerCount);
          const trainingProgress = new Array<number>(workerCount).fill(0);
          const evaluationProgress = new Array<number>(workerCount).fill(0);
          const totalWork = Math.max(1, rounds * 2);
          const updateProgress = (force = false) => {
            if (runIdRef.current !== runId) return;
            const now = performance.now();
            if (!force && now - lastProgressAtRef.current < PROGRESS_INTERVAL_MS) return;
            lastProgressAtRef.current = now;
            let completed = 0;
            for (const value of trainingProgress) completed += value;
            for (const value of evaluationProgress) completed += value;
            const percent = Math.min(100, Math.round((completed / totalWork) * 100));
            if (percent === lastProgressRef.current) return;
            lastProgressRef.current = percent;
            setProgress(percent);
          };

          const scheduleProgress = () => {
            if (progressUpdateTimerRef.current !== null) {
              window.clearTimeout(progressUpdateTimerRef.current);
            }
            progressUpdateTimerRef.current = window.setTimeout(() => {
              progressUpdateTimerRef.current = null;
              updateProgress();
            }, PROGRESS_COALESCE_MS);
          };

          const trainingResponses = await Promise.all(
            workers.map((worker, index) =>
              requestWorker(
                worker,
                { type: "train", rounds: counts[index], rules },
                (completed) => {
                  if (runIdRef.current !== runId) return;
                  trainingProgress[index] = Math.min(counts[index], completed);
                  scheduleProgress();
                },
              ),
            ),
          );

          if (runIdRef.current !== runId) return;

          for (let index = 0; index < workerCount; index += 1) {
            trainingProgress[index] = counts[index];
          }
          stopProgressUpdate();
          updateProgress(true);

          const trainingResults = trainingResponses.map((response) => {
            if (response.type === "error") throw new Error(response.message);
            if (response.type !== "trained") {
              throw new Error("The simulation worker returned an unexpected response.");
            }
            return response.result;
          });

          const { totals, stats } = mergeTrainingResults(trainingResults);
          const evaluationStartedAt = performance.now();
          const evaluationResponses = await Promise.all(
            workers.map((worker, index) =>
              requestWorker(
                worker,
                {
                  type: "evaluate",
                  rounds: counts[index],
                  rules,
                  stats,
                },
                (completed) => {
                  if (runIdRef.current !== runId) return;
                  evaluationProgress[index] = Math.min(counts[index], completed);
                  scheduleProgress();
                },
              ),
            ),
          );

          if (runIdRef.current !== runId) return;

          const evaluations = evaluationResponses.map((response) => {
            if (response.type === "error") throw new Error(response.message);
            if (response.type !== "evaluated") {
              throw new Error("The evaluation worker returned an unexpected response.");
            }
            return response.evaluation;
          });

          const result: SimulationResult = {
            totals,
            stats,
            rules: { ...rules },
            evaluation: mergeEvaluations(evaluations, performance.now() - evaluationStartedAt),
            durationMs: performance.now() - startedAt,
            completedAt: Date.now(),
          };

          runningRef.current = false;
          stopProgressUpdate();
          lastProgressRef.current = 100;
          setProgress(100);
          setState({ status: "done", result, error: null });
        } catch (error) {
          if (runIdRef.current !== runId) return;
          runningRef.current = false;
          stopProgressUpdate();
          terminateWorkers();
          lastProgressRef.current = 0;
          setProgress(0);
          setState((current) => ({
            status: "error",
            result: current.result,
            error: error instanceof Error ? error.message : "The simulation could not run.",
          }));
        }
      })();
    },
    [ensureWorkers, stopProgressUpdate, terminateWorkers],
  );

  const cancel = useCallback(() => {
    runIdRef.current += 1;
    runningRef.current = false;
    stopProgressUpdate();
    terminateWorkers();
    lastProgressRef.current = 0;
    setProgress(0);
    setState((current) => ({
      status: current.result ? "done" : "idle",
      result: current.result,
      error: null,
    }));
  }, [stopProgressUpdate, terminateWorkers]);

  useEffect(
    () => () => {
      stopProgressUpdate();
      terminateWorkers();
    },
    [stopProgressUpdate, terminateWorkers],
  );

  return {
    ...state,
    progress,
    isRunning: state.status === "running",
    run,
    cancel,
  };
}
