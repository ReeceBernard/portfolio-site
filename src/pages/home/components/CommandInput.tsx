import React, { useEffect, useRef, useState } from "react";
import { COMMAND_LIST } from "../lib/commands";
import { cn } from "../lib/utils";

interface CommandInputProps {
  value: string;
  onChange: (value: string) => void;
  onCommand: (command: string) => void;
  onHistoryNavigation: (direction: "up" | "down") => void;
  disabled?: boolean;
  className?: string;
}

export const CommandInput: React.FC<CommandInputProps> = ({
  value,
  onChange,
  onCommand,
  onHistoryNavigation,
  disabled = false,
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);

  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [disabled]);

  useEffect(() => {
    const updateCursorPosition = () => {
      if (inputRef.current && measureRef.current) {
        const input = inputRef.current;
        const measure = measureRef.current;
        const cursorPos = input.selectionStart || 0;
        const textBeforeCursor = value.substring(0, cursorPos);

        measure.textContent = textBeforeCursor;
        setCursorPosition(measure.offsetWidth);
      }
    };

    const rafUpdate = () => requestAnimationFrame(updateCursorPosition);
    rafUpdate();

    const input = inputRef.current;
    if (input) {
      input.addEventListener("click", rafUpdate);
      input.addEventListener("keyup", rafUpdate);

      return () => {
        input.removeEventListener("click", rafUpdate);
        input.removeEventListener("keyup", rafUpdate);
      };
    }
  }, [value]);

  const getInlineSuggestion = () => {
    if (!value.trim()) return "";

    const commandPart = value.trim().split(/\s+/)[0];
    const match = COMMAND_LIST.find(
      (cmd) =>
        cmd.toLowerCase().startsWith(commandPart.toLowerCase()) &&
        cmd.length > commandPart.length
    );

    if (match) {
      const args = value.trim().split(/\s+/).slice(1);
      const suggestion = match.substring(commandPart.length);
      return args.length > 0 ? suggestion + " " + args.join(" ") : suggestion;
    }

    return "";
  };

  const getMatches = () => {
    if (!value.trim()) return [];
    const commandPart = value.trim().split(/\s+/)[0];
    return COMMAND_LIST.filter((cmd) =>
      cmd.toLowerCase().startsWith(commandPart.toLowerCase())
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    const inlineSuggestion = getInlineSuggestion();
    const matches = getMatches();

    switch (e.key) {
      case "Enter":
        e.preventDefault();
        onCommand(value);
        break;

      case "Tab":
        e.preventDefault();
        if (inlineSuggestion) {
          const match = matches[0];
          const args = value.trim().split(/\s+/).slice(1);
          onChange(args.length > 0 ? `${match} ${args.join(" ")}` : match);
        } else if (matches.length > 1) {
          onCommand(`# Available commands: ${matches.join("  ")}`);
        }
        break;

      case "ArrowRight":
        if (
          inlineSuggestion &&
          inputRef.current?.selectionStart === value.length
        ) {
          e.preventDefault();
          const match = matches[0];
          const args = value.trim().split(/\s+/).slice(1);
          onChange(args.length > 0 ? `${match} ${args.join(" ")}` : match);
        }
        break;

      case "ArrowUp":
        e.preventDefault();
        onHistoryNavigation("up");
        break;

      case "ArrowDown":
        e.preventDefault();
        onHistoryNavigation("down");
        break;

      default:
        if (e.ctrlKey || e.metaKey) {
          switch (e.key.toLowerCase()) {
            case "c":
              e.preventDefault();
              onChange("");
              onCommand("^C");
              break;
            case "l":
              e.preventDefault();
              onCommand("clear");
              break;
            case "u":
              e.preventDefault();
              onChange("");
              break;
          }
        }
        break;
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center">
        <span className="text-green-400 font-mono select-none mr-2">
          reecebernard@dev:~$
        </span>

        <div className="relative flex-1">
          <span
            ref={measureRef}
            className="absolute invisible whitespace-pre font-mono text-green-400"
          />

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            data-terminal-input
            className={cn(
              "bg-transparent border-none outline-none w-full",
              "text-green-400 font-mono caret-transparent",
              "placeholder-gray-500",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            placeholder={disabled ? "Processing..." : "Type a command..."}
            autoComplete="off"
            spellCheck={false}
          />

          {getInlineSuggestion() && (
            <span
              className="absolute top-0 left-0 w-full pointer-events-none font-mono text-gray-500"
              style={{ paddingLeft: `${cursorPosition}px` }}
            >
              {getInlineSuggestion()}
            </span>
          )}

          <span
            className={cn(
              "absolute top-0 w-2 h-5 bg-green-400 pointer-events-none",
              disabled && "opacity-50"
            )}
            style={{
              left: `${cursorPosition}px`,
              animation: disabled ? "none" : "blink 1s infinite",
            }}
          >
            █
          </span>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};
