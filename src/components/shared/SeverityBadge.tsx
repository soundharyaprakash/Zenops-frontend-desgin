"use client";

import React from "react";
import { AlertOctagon, AlertTriangle, Info, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SeverityBadgeProps {
  severity: "Critical" | "High" | "Medium" | "Low";
  size?: "xs" | "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

/**
 * Standard Severity Badge (Phase 0, Item 0.9 & Screen 6)
 *
 * Strict hierarchy: Critical strongest (red, bold, AlertOctagon),
 * then High (amber, AlertTriangle), Medium (blue, Info), Low (slate, Shield).
 * Never renders Critical in light grey.
 */
export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  size = "sm",
  showIcon = true,
  className,
}) => {
  const configs = {
    Critical: {
      label: "Critical",
      icon: AlertOctagon,
      classes: "bg-red-600 text-white font-bold border-red-700 shadow-xs ring-1 ring-red-500/40",
      iconClass: "text-white",
    },
    High: {
      label: "High",
      icon: AlertTriangle,
      classes: "bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40 font-semibold",
      iconClass: "text-amber-600 dark:text-amber-400",
    },
    Medium: {
      label: "Medium",
      icon: Info,
      classes: "bg-blue-500/15 text-blue-900 dark:text-blue-200 border-blue-500/30 font-medium",
      iconClass: "text-blue-600 dark:text-blue-400",
    },
    Low: {
      label: "Low",
      icon: Shield,
      classes: "bg-slate-500/15 text-slate-800 dark:text-slate-300 border-slate-500/30",
      iconClass: "text-slate-500",
    },
  };

  const current = configs[severity] || configs["Low"];
  const IconComponent = current.icon;

  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[10px] gap-1",
    sm: "px-2 py-0.5 text-xs gap-1.5",
    md: "px-2.5 py-1 text-xs gap-1.5",
  };

  const iconSizes = {
    xs: "w-2.5 h-2.5",
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border tracking-tight select-none",
        sizeClasses[size],
        current.classes,
        className
      )}
    >
      {showIcon && <IconComponent className={cn(iconSizes[size], current.iconClass, "shrink-0")} />}
      <span>{current.label}</span>
    </span>
  );
};
