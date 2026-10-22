import { evaluateStrategy } from "./survival";
import { PROGRESS_INTERVAL_MS, PROGRESS_ROUND_STEP } from "./progress";
import { BlackjackSimulator } from "./simulator";
import type {
  SimulationWorkerRequest,
  SimulationWorkerResponse,
  TrainingResult,
} from "./types";

function postProgress(completed: number) {
  const response: SimulationWorkerResponse = { type: "progress", completed };
  globalThis.postMessage(response);
}

function train(request: Extract<SimulationWorkerRequest, { type: "train" }>): TrainingResult {
  const startedAt = performance.now();
  const simulator = new BlackjackSimulator({ rules: request.rules });
  const progressStep = PROGRESS_ROUND_STEP;
  let nextProgress = progressStep;
  let lastProgressAt = performance.now();

  for (let round = 1; round <= request.rounds; round += 1) {
    simulator.playTrainingRound();

    if (round >= nextProgress) {
      const now = performance.now();
      if (now - lastProgressAt >= PROGRESS_INTERVAL_MS) {
        postProgress(round);
        lastProgressAt = now;
      }
      nextProgress = round + progressStep;
    }
  }

  postProgress(request.rounds);

  return {
    totals: simulator.getTotals(),
    stats: simulator.getStats(),
    durationMs: performance.now() - startedAt,
  };
}

globalThis.onmessage = (event: MessageEvent<SimulationWorkerRequest>) => {
  try {
    const request = event.data;
    if (request.type === "train") {
      const response: SimulationWorkerResponse = {
        type: "trained",
        result: train(request),
      };
      globalThis.postMessage(response);
      return;
    }

    const response: SimulationWorkerResponse = {
      type: "evaluated",
      evaluation: evaluateStrategy(request.stats, request.rules, request.rounds, postProgress),
    };
    globalThis.postMessage(response);
  } catch (error) {
    const response: SimulationWorkerResponse = {
      type: "error",
      message: error instanceof Error ? error.message : "The simulation could not run.",
    };
    globalThis.postMessage(response);
  }
};
