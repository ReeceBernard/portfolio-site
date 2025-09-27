import { useCallback, useState } from "react";
import { TTL, useLocalStorage } from "./use-local-storage";

export const useCommandHistory = () => {
  const [history, setHistory] = useLocalStorage<string[]>(
    "terminal-history",
    [],
    TTL.ONE_MONTH
  );
  const [historyIndex, setHistoryIndex] = useState(-1);

  const addToHistory = useCallback(
    (command: string) => {
      const trimmedCommand = command.trim();
      if (trimmedCommand && history[history.length - 1] !== trimmedCommand) {
        const newHistory = [...history, trimmedCommand].slice(-50); // Keep last 50 commands
        setHistory(newHistory);
        setHistoryIndex(-1);
      }
    },
    [history, setHistory]
  );

  const navigateHistory = useCallback(
    (direction: "up" | "down") => {
      if (direction === "up") {
        const newIndex = Math.max(
          0,
          historyIndex === -1 ? history.length - 1 : historyIndex - 1
        );
        setHistoryIndex(newIndex);
        return newIndex;
      } else {
        const newIndex =
          historyIndex >= history.length - 1 ? -1 : historyIndex + 1;
        setHistoryIndex(newIndex);
        return newIndex;
      }
    },
    [history.length, historyIndex]
  );

  const resetHistoryIndex = useCallback(() => {
    setHistoryIndex(-1);
  }, []);

  return {
    history,
    historyIndex,
    addToHistory,
    navigateHistory,
    resetHistoryIndex,
  };
};
