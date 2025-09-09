import { Minimize2, Square, X } from "lucide-react";
import React from "react";
import { cn } from "../lib/utils";

interface TerminalHeaderProps {
  className?: string;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export const TerminalHeader: React.FC<TerminalHeaderProps> = ({
  className,
  onClose,
  onMinimize,
  onMaximize,
}) => {
  const isMobile = window.innerWidth < 768;
  return (
    <div
      className={cn(
        "flex items-center justify-between bg-gray-800 border-b border-gray-700 px-4 py-3",
        className
      )}
    >
      {!isMobile && (
        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className={cn(
              "w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-opacity-50"
            )}
            aria-label="Close terminal"
            disabled={!onClose}
          />
          <button
            onClick={onMinimize}
            className={cn(
              "w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-opacity-50"
            )}
            aria-label="Minimize terminal"
            disabled={!onMinimize}
          />
          <button
            onClick={onMaximize}
            className={cn(
              "w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-opacity-50"
            )}
            aria-label="Maximize terminal"
            disabled={!onMaximize}
          />
        </div>
      )}

      <div className="flex-1 text-center">
        <span className="text-sm text-gray-300 font-mono">
          reecebernard@dev:~
        </span>
      </div>

      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className={cn(
            "p-1 text-gray-400 hover:text-gray-200 transition-colors rounded",
            "focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
          )}
          aria-label="Minimize"
          disabled={!onMinimize}
        >
          <Minimize2 className="w-4 h-4" />
        </button>
        <button
          className={cn(
            "p-1 text-gray-400 hover:text-gray-200 transition-colors rounded",
            "focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
          )}
          aria-label="Maximize"
          disabled={!onMaximize}
        >
          <Square className="w-4 h-4" />
        </button>
        <button
          className={cn(
            "p-1 text-gray-400 hover:text-red-400 transition-colors rounded",
            "focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50"
          )}
          aria-label="Close"
          disabled={!onClose}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
