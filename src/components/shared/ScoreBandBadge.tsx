"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ScoreBand, getScoreBand } from "@/lib/cmdb-metrics/score-bands";

export interface ScoreBandBadgeProps {
  score?: number;
  band?: ScoreBand;
  showScore?: boolean;
  size?: "xs" | "sm" | "md";
  className?: string;
}

/**
 * ScoreBand Badge (Phase 0, Item 0.9 & 0.5)
 *
 * Renders consistent score band pill (Healthy >=80, At risk 60-79, Critical <60).
 */
export const ScoreBandBadge: React.FC<ScoreBandBadgeProps> = ({
  score,
  band,
  showScore = true,
  size = "sm",
  className,
}) => {
  const resolvedBand = band || (typeof score === "number" ? getScoreBand(score) : undefined);
  if (!resolvedBand) return null;

  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[10px] gap-1",
    sm: "px-2 py-0.5 text-xs gap-1.5 font-semibold",
    md: "px-2.5 py-1 text-xs gap-1.5 font-bold",
  };

  const dotClasses = {
    HEALTHY: "bg-emerald-500",
    AT_RISK: "bg-amber-500",
    CRITICAL: "bg-red-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border select-none",
        sizeClasses[size],
        resolvedBand.bgColor,
        resolvedBand.textColor,
        resolvedBand.borderClass,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotClasses[resolvedBand.key])} />
      <span>{resolvedBand.label}</span>
      {showScore && typeof score === "number" && (
        <span className="font-mono text-[10px] opacity-90">({score})</span>
      )}
    </span>
  );
};
