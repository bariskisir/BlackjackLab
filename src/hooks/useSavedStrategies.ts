import { useCallback, useRef, useState } from "react";
import {
  MAX_SAVED_STRATEGIES,
  loadSavedStrategies,
  persistSavedStrategies,
  savedStrategyFromResult,
} from "../lib/savedStrategies";
import type { SavedStrategy, SimulationResult } from "../simulation/types";

interface SavedStrategyState {
  strategies: SavedStrategy[];
  error: string | null;
}

export function useSavedStrategies() {
  const [state, setState] = useState<SavedStrategyState>(() => loadSavedStrategies());
  const strategiesRef = useRef(state.strategies);

  const saveStrategy = useCallback((result: SimulationResult) => {
    const strategy = savedStrategyFromResult(result);
    const current = strategiesRef.current;
    if (current.some((entry) => entry.id === strategy.id)) return;

    const next = [strategy, ...current].slice(0, MAX_SAVED_STRATEGIES);
    strategiesRef.current = next;
    const error = persistSavedStrategies(next);
    setState({ strategies: next, error });
  }, []);

  const removeStrategy = useCallback((id: string) => {
    const current = strategiesRef.current;
    const next = current.filter((strategy) => strategy.id !== id);
    if (next.length === current.length) return;

    strategiesRef.current = next;
    const error = persistSavedStrategies(next);
    setState({ strategies: next, error });
  }, []);

  const clearError = useCallback(() => {
    setState((current) => ({ ...current, error: null }));
  }, []);

  return {
    strategies: state.strategies,
    storageError: state.error,
    saveStrategy,
    removeStrategy,
    clearError,
    maxSaved: MAX_SAVED_STRATEGIES,
  };
}
