"use client";

import React from "react";
import { X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterChipProps {
  label: string;
  value?: string;
  isActive?: boolean;
  onClear?: () => void;
  onClick?: () => void;
  className?: string;
}

export function FilterChip({
  label,
  value,
  isActive = false,
  onClear,
  onClick,
  className,
}: FilterChipProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-button border transition-all cursor-pointer select-none",
        isActive
          ? "bg-selected text-primary border-primary/30 font-semibold shadow-2xs"
          : "bg-surface text-secondary border-border hover:bg-sunken hover:text-default",
        className
      )}
    >
      <span className="text-muted font-normal">{label}:</span>
      <span className="font-semibold text-default truncate max-w-[120px]">
        {value || "All"}
      </span>

      {isActive && onClear ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="p-0.5 rounded-full hover:bg-primary/20 text-primary transition-colors ml-0.5"
          title={`Clear ${label} filter`}
        >
          <X className="w-3 h-3" />
        </button>
      ) : (
        <ChevronDown className="w-3 h-3 text-muted ml-0.5" />
      )}
    </div>
  );
}
