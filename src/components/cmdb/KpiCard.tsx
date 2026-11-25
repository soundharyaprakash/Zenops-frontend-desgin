"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { InfoHint } from "@/components/ui/InfoHint";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  target?: string;
  targetLabel?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    direction?: "up" | "down" | "neutral";
    sentiment?: "positive" | "negative" | "neutral";
    label?: string;
  };
  accentColor?: "primary" | "success" | "warning" | "danger" | "neutral" | "blue" | "teal";
  progressPercent?: number;
  infoHint?: {
    concept: string;
    whyItMatters: string;
    target?: string;
  };
  onClick?: () => void;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  target,
  targetLabel,
  trend,
  accentColor = "primary",
  progressPercent,
  infoHint,
  onClick,
}: KpiCardProps) {
  const iconVariants = {
    primary: "bg-primary/10 text-primary border-primary/20 dark:border-primary/30",
    success: "bg-success/10 text-success border-success/20 dark:border-success/30",
    warning: "bg-warning/10 text-warning border-warning/20 dark:border-warning/30",
    danger: "bg-danger/10 text-danger border-danger/20 dark:border-danger/30",
    neutral: "bg-neutral/10 text-neutral border-neutral/20 dark:border-neutral/30",
    blue: "bg-brand-blue/10 text-brand-blue border-brand-blue/20 dark:border-brand-blue/30",
    teal: "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20 dark:border-brand-cyan/30",
  };

  const progressColors = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    neutral: "bg-neutral",
    blue: "bg-brand-blue",
    teal: "bg-brand-cyan",
  };

  // Derive trend direction and color sentiment (Priority 3, Item 11)
  const direction =
    trend?.direction ||
    (trend?.value?.trim().startsWith("-")
      ? "down"
      : trend?.value?.trim().startsWith("+")
      ? "up"
      : "neutral");

  const sentiment =
    trend?.sentiment || (trend?.isPositive !== undefined ? (trend.isPositive ? "positive" : "negative") : "neutral");

  const displayTarget = targetLabel || (target ? `Target: ${target}` : null);

  return (
    <Card
      hoverEffect
      onClick={onClick}
      className={cn(
        "p-4 sm:p-5 relative flex flex-col justify-between group hover:-translate-y-1 hover:shadow-raised transition-all duration-200 min-w-0 w-full",
        onClick && "cursor-pointer hover:border-primary/50 dark:hover:border-primary/50"
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-2.5">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-xs font-bold uppercase tracking-wider text-text-secondary truncate">
                {title}
              </p>
              {infoHint && (
                <InfoHint
                  title={title}
                  concept={infoHint.concept}
                  whyItMatters={infoHint.whyItMatters}
                  target={infoHint.target || target}
                />
              )}
            </div>
            <div className="flex items-baseline gap-2 pt-0.5 flex-wrap">
              <span className="text-2xl sm:text-3xl font-bold text-text-default tracking-tight tabular-nums font-mono group-hover:text-primary transition-colors">
                {value}
              </span>
              {displayTarget && (
                <span className="text-[11px] text-text-secondary font-semibold bg-sunken px-2 py-0.5 rounded border border-border/80 truncate max-w-full">
                  {displayTarget}
                </span>
              )}
            </div>
          </div>

          <div
            className={cn(
              "w-9 h-9 rounded-md flex items-center justify-center border flex-shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:rotate-3 shadow-2xs",
              iconVariants[accentColor]
            )}
          >
            <Icon className="w-4.5 h-4.5" />
          </div>
        </div>

        {progressPercent !== undefined && (
          <div className="mt-3 space-y-1">
            <div className="w-full bg-sunken rounded-full h-2 overflow-hidden border border-border/30 relative">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden",
                  progressColors[accentColor]
                )}
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs text-text-secondary gap-2 flex-wrap">
        {subtitle && <span className="truncate font-medium min-w-0">{subtitle}</span>}
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium ml-auto flex-shrink-0 tabular-nums text-xs",
              sentiment === "positive"
                ? "text-success"
                : sentiment === "negative"
                ? "text-danger"
                : "text-text-muted"
            )}
          >
            {direction === "down" ? (
              <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" />
            ) : direction === "up" ? (
              <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <Minus className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            <span>{trend.value}</span>
            {trend.label && <span className="text-text-muted ml-0.5">({trend.label})</span>}
          </span>
        )}
      </div>
    </Card>
  );
}
