import React from "react";

export const highlightSearchTerm = (text: string, searchQuery: string): React.ReactNode => {
  if (!searchQuery.trim()) {
    return text;
  }

  const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.toLowerCase() === searchQuery.toLowerCase()) {
      return (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900/50 px-0.5 rounded">
          {part}
        </mark>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};

