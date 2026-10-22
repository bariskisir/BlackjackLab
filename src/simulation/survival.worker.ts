import { runSurvival } from "./survival";
import type {
  SurvivalRequest,
  SurvivalWorkerResponse,
} from "./types";

globalThis.onmessage = (event: MessageEvent<SurvivalRequest>) => {
  try {
    const response: SurvivalWorkerResponse = {
      type: "complete",
      result: runSurvival(event.data),
    };
    globalThis.postMessage(response);
  } catch (error) {
    const response: SurvivalWorkerResponse = {
      type: "error",
      message: error instanceof Error ? error.message : "The survival simulation could not run.",
    };
    globalThis.postMessage(response);
  }
};
