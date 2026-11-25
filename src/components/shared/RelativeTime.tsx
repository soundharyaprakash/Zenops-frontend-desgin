"use client";

import React, { useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RelativeTimeProps {
  isoString: string;
  statedTimeZone?: string;
  nextRunIso?: string;
  showIcon?: boolean;
  className?: string;
}

/**
 * Standard Time Display (Phase 0, Item 0.9, G4, G5)
 *
 * Shows times with a stated time zone (e.g. "2026-11-20 14:30 UTC")
 * plus relative age ("2 h ago"), and "next run in X" where scheduled.
 */
export const RelativeTime: React.FC<RelativeTimeProps> = ({
  isoString,
  statedTimeZone = "UTC",
  nextRunIso,
  showIcon = true,
  className,
}) => {
  const [showAbsolute, setShowAbsolute] = useState(false);

  const date = new Date(isoString);
  const isValid = !isNaN(date.getTime());

  if (!isValid) {
    return <span className="text-muted text-xs">—</span>;
  }

  const nowMs = Date.now();
  const diffMs = nowMs - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  let relativeAge = "just now";
  if (diffMins >= 1440) {
    const days = Math.floor(diffMins / 1440);
    relativeAge = `${days}d ago`;
  } else if (diffMins >= 60) {
    const hours = Math.floor(diffMins / 60);
    relativeAge = `${hours}h ago`;
  } else if (diffMins > 0) {
    relativeAge = `${diffMins}m ago`;
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const absoluteFormatted =
    statedTimeZone === "UTC"
      ? `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(
          date.getUTCHours()
        )}:${pad(date.getUTCMinutes())} UTC`
      : date.toLocaleString();

  // Next run calculation
  let nextRunText = "";
  if (nextRunIso) {
    const nextDate = new Date(nextRunIso);
    if (!isNaN(nextDate.getTime())) {
      const nextDiffMins = Math.round((nextDate.getTime() - nowMs) / 60000);
      if (nextDiffMins <= 0) {
        nextRunText = "due now";
      } else if (nextDiffMins >= 1440) {
        nextRunText = `next run in ${Math.floor(nextDiffMins / 1440)}d`;
      } else if (nextDiffMins >= 60) {
        nextRunText = `next run in ${Math.floor(nextDiffMins / 60)}h`;
      } else {
        nextRunText = `next run in ${nextDiffMins}m`;
      }
    }
  }

  return (
    <div
      className={cn("inline-flex flex-col text-xs font-mono cursor-pointer select-none", className)}
      onClick={() => setShowAbsolute(!showAbsolute)}
      title="Click to toggle between relative age and absolute UTC timestamp"
    >
      <div className="flex items-center gap-1 text-default">
        {showIcon && <Clock className="w-3 h-3 text-muted shrink-0" />}
        <span>{showAbsolute ? absoluteFormatted : relativeAge}</span>
      </div>
      {!showAbsolute && (
        <span className="text-[10px] text-muted">{absoluteFormatted}</span>
      )}
      {nextRunText && (
        <span className="text-[10px] text-primary/80 font-semibold">{nextRunText}</span>
      )}
    </div>
  );
};
