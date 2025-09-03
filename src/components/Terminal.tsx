import React, { useEffect, useRef, useState } from "react";
import { useCommandHistory } from "../hooks/use-command-history";
import { useTerminal } from "../hooks/use-terminal";
import { cn } from "../lib/utils";
import { CommandInput } from "./CommandInput";
import { CommandOutput } from "./CommandOutput";
import { TerminalHeader } from "./TerminalHeader";

export const Terminal: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const { output, executeCommand, isProcessing } = useTerminal();

  const { history, addToHistory, navigateHistory, resetHistoryIndex } =
    useCommandHistory();

  const [currentInput, setCurrentInput] = useState("");

  const isMobile = window.innerWidth < 768;

  const handleCommand = (command: string) => {
    if (command.trim()) {
      addToHistory(command);
      executeCommand(command);
      setCurrentInput("");
    }
  };

  const handleInputChange = (value: string) => {
    setCurrentInput(value);
    resetHistoryIndex();
  };

  const handleHistoryNavigation = (direction: "up" | "down") => {
    const newIndex = navigateHistory(direction);
    if (newIndex !== -1 && history[newIndex]) {
      setCurrentInput(history[newIndex]);
    } else if (newIndex === -1) {
      setCurrentInput("");
    }
  };

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  // Focus on terminal click
  const handleTerminalClick = () => {
    const input = document.querySelector(
      "input[data-terminal-input]"
    ) as HTMLInputElement;
    input?.focus();
  };

  return (
    <div className="min-h-screen bg-black p-4 font-mono text-green-400">
      <div className="mx-auto">
        <div
          className={cn(
            "bg-gray-900 border-2 border-gray-700 rounded-lg",
            "shadow-2xl shadow-green-400/20",
            "overflow-hidden"
          )}
        >
          <TerminalHeader />

          <div
            ref={terminalRef}
            className="p-6 h-[70vh] overflow-y-auto scroll-smooth"
            onClick={handleTerminalClick}
          >
            <div className="mb-6">
              <pre className="text-green-400 text-xs leading-none mb-4">
                {isMobile
                  ? `██████╗ ███████╗███████╗ ██████╗███████╗
██╔══██╗██╔════╝██╔════╝██╔════╝██╔════╝
██████╔╝█████╗  █████╗  ██║     █████╗  
██╔══██╗██╔══╝  ██╔══╝  ██║     ██╔══╝  
██║  ██║███████╗███████╗╚██████╗███████╗
╚═╝  ╚═╝╚══════╝╚══════╝ ╚═════╝╚══════╝`
                  : `██████╗ ███████╗███████╗ ██████╗███████╗    ██████╗ ███████╗██████╗ ███╗   ██╗ █████╗ ██████╗ ██████╗ 
██╔══██╗██╔════╝██╔════╝██╔════╝██╔════╝    ██╔══██╗██╔════╝██╔══██╗████╗  ██║██╔══██╗██╔══██╗██╔══██╗
██████╔╝█████╗  █████╗  ██║     █████╗      ██████╔╝█████╗  ██████╔╝██╔██╗ ██║███████║██████╔╝██║  ██║
██╔══██╗██╔══╝  ██╔══╝  ██║     ██╔══╝      ██╔══██╗██╔══╝  ██╔══██╗██║╚██╗██║██╔══██║██╔══██╗██║  ██║
██║  ██║███████╗███████╗╚██████╗███████╗    ██████╔╝███████╗██║  ██║██║ ╚████║██║  ██║██║  ██║██████╔╝
╚═╝  ╚═╝╚══════╝╚══════╝ ╚═════╝╚══════╝    ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝`}
              </pre>
              <p className="text-gray-300">
                Welcome to reecebernard.dev - Interactive Terminal Portfolio
              </p>
              <p className="text-gray-300 mt-2">
                Type <span className="text-yellow-400">'help'</span> to see
                available commands.
              </p>
            </div>

            <CommandOutput output={output} />
            {/* ahh */}
            <CommandInput
              value={currentInput}
              onChange={handleInputChange}
              onCommand={handleCommand}
              onHistoryNavigation={handleHistoryNavigation}
              disabled={isProcessing}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
