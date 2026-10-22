import { useCallback, useEffect, useState } from "react";
import { DEFAULT_GAME_RULES, normalizeGameRules } from "../simulation/rules";
import type { GameRules } from "../simulation/types";

const RULES_STORAGE_KEY = "blackjack-lab-game-rules-v1";

function loadRules(): GameRules {
  try {
    const raw = window.localStorage.getItem(RULES_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GAME_RULES };
    return normalizeGameRules(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_GAME_RULES };
  }
}

export function useGameRules() {
  const [rules, setRules] = useState<GameRules>(() => loadRules());

  useEffect(() => {
    try {
      window.localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
    } catch {
      return;
    }
  }, [rules]);

  const updateRules = useCallback((patch: Partial<GameRules>) => {
    setRules((current) => normalizeGameRules({ ...current, ...patch }));
  }, []);

  const resetRules = useCallback(() => {
    setRules({ ...DEFAULT_GAME_RULES });
  }, []);

  return { rules, updateRules, resetRules };
}
