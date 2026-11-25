"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface StatusPillProps {
  label: string;
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
  size?: "xs" | "sm";
  showDot?: boolean;
  className?: string;
}

/**
 * Standard Status Pill (Phase 0, Item 0.9 & G8)
 *
 * Does not rely on color alone: renders explicit text label + indicator dot.
 */
export const StatusPill: React.FC<StatusPillProps> = ({
  label,
  variant = "neutral",
  size = "sm",
  showDot = true,
  className,
}) => {
  const variantStyles = {
    success: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
    danger: "bg-red-500/15 text-red-800 dark:text-red-300 border-red-500/30",
    info: "bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30",
    neutral: "bg-neutral-500/15 text-neutral-800 dark:text-neutral-300 border-neutral-500/30",
  };

  const dotColors = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    info: "bg-blue-500",
    neutral: "bg-neutral-400",
  };

  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[10px] gap-1",
    sm: "px-2 py-0.5 text-xs gap-1.5 font-medium",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border tracking-tight select-none",
        sizeClasses[size],
        variantStyles[variant],
        className
      )}
    >
      {showDot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColors[variant])} />}
      <span>{label}</span>
    </span>
  );
};
