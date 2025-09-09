import { useCallback, useState } from "react";
import { commands } from "../pages/home/lib/commands";
import type { CommandOutput } from "../types";

export const useTerminal = () => {
  const [output, setOutput] = useState<CommandOutput[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addOutput = useCallback((content: CommandOutput) => {
    setOutput((prev) => [...prev, content]);
  }, []);

  const executeCommand = useCallback(
    async (input: string) => {
      const parts = input.trim().split(/\s+/); // Split on whitespace
      const command = parts[0]?.toLowerCase() || ""; // Just the first part
      const args = parts.slice(1); // Everything after the first part

      addOutput({
        type: "command",
        content: `reecebernard@dev:~$ ${input}`,
        timestamp: Date.now(),
      });

      setIsProcessing(true);

      try {
        if (command === "") {
          return;
        }

        if (command === "clear") {
          setOutput([]);
          return;
        }

        const commandFunction = commands[command];

        if (commandFunction) {
          const result = await commandFunction(args);
          if (result) {
            addOutput({
              type: "output",
              content: result,
              timestamp: Date.now(),
            });
          }
        } else {
          addOutput({
            type: "error",
            content: `Command not found: ${command}\nType 'help' to see available commands.`,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        addOutput({
          type: "error",
          content: `Error executing command: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          timestamp: Date.now(),
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [addOutput]
  );

  const clearTerminal = useCallback(() => {
    setOutput([]);
  }, []);

  return {
    output,
    executeCommand,
    clearTerminal,
    isProcessing,
  };
};
