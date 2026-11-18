"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  variant?: "brand" | "primary" | "success" | "warning" | "danger";
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  variant = "brand",
  size = "sm",
  showLabel = false,
  className,
}: ProgressBarProps) {
  const percentage = Math.max(0, Math.min(100, Math.round((value / max) * 100)));

  const sizeClasses = {
    xs: "h-1",
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-3.5",
  };

  const variantStyles = {
    brand: "bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-mint",
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  };

  return (
    <div className={cn("w-full space-y-1 select-none", className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs text-secondary">
          <span className="font-semibold text-default">Progress</span>
          <span className="font-mono text-muted">{percentage}%</span>
        </div>
      )}
      <div className={cn("w-full bg-sunken rounded-full overflow-hidden border border-border/40", sizeClasses[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-300 ease-out", variantStyles[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
