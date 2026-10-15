"use client";

import React from "react";

interface FormattedMessageProps {
  text: string;
  className?: string;
}

export default function FormattedMessage({ text, className = "" }: FormattedMessageProps) {
  if (!text) return null;

  const renderInline = (str: string) => {
    const regex = /(\*\*[\s\S]+?\*\*|\*[\s\S]+?\*|`[\s\S]+?`)/g;
    const parts = str.split(regex);

    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
        return (
          <strong key={index} className="font-bold text-text">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length >= 2 && !part.startsWith("**")) {
        return (
          <em key={index} className="italic text-text/90">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
        return (
          <code
            key={index}
            className="font-mono text-xs px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-blue-500 font-semibold"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="my-2 space-y-1.5 pl-1">
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      elements.push(<div key={`space-${idx}`} className="h-1.5" />);
      return;
    }

    const bulletMatch = trimmed.match(/^([•\-\*]|\d+[\.\)])\s+(.+)$/);
    if (bulletMatch) {
      const prefix = bulletMatch[1];
      const content = bulletMatch[2];
      const isNumber = /^\d+/.test(prefix);

      currentList.push(
        <li key={`li-${idx}`} className="flex items-start gap-2 text-xs sm:text-[13px] leading-relaxed">
          {isNumber ? (
            <span className="font-bold text-blue-500 text-[11px] shrink-0 mt-0.5">{prefix}</span>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
          )}
          <span className="flex-1 text-text/90">{renderInline(content)}</span>
        </li>
      );
      return;
    }

    flushList();
    elements.push(
      <p key={`p-${idx}`} className="leading-relaxed mb-1 last:mb-0 text-text/90">
        {renderInline(line)}
      </p>
    );
  });

  flushList();

  return <div className={`text-sm leading-relaxed ${className}`}>{elements}</div>;
}
