import React from "react";
import { cn } from "../lib/utils";
import type { CommandOutput as CommandOutputType } from "../../../types";

interface CommandOutputProps {
  output: CommandOutputType[];
  className?: string;
}

export const CommandOutput: React.FC<CommandOutputProps> = ({
  output,
  className,
}) => {
  const formatContent = (content: string) => {
    if (content.includes("<")) {
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    }

    return content
      .split("\n")
      .map((line, index) => <div key={index}>{line || "\u00A0"}</div>);
  };

  const getOutputStyle = (type: CommandOutputType["type"]) => {
    switch (type) {
      case "command":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "success":
        return "text-green-300";
      case "output":
      default:
        return "text-gray-300";
    }
  };

  const getOutputIcon = (type: CommandOutputType["type"]) => {
    switch (type) {
      case "error":
        return "❌ ";
      case "success":
        return "✅ ";
      case "command":
        return "";
      case "output":
      default:
        return "";
    }
  };

  if (output.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2 mb-4", className)}>
      {output.map((item, index) => (
        <div
          key={`${item.timestamp}-${index}`}
          className={cn(
            "font-mono text-sm leading-relaxed whitespace-pre-wrap break-words",
            getOutputStyle(item.type),
            item.type === "command" && "border-l-2 border-green-400 pl-2 ml-2"
          )}
        >
          {getOutputIcon(item.type)}
          {formatContent(item.content)}
        </div>
      ))}
    </div>
  );
};
