"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type LozengeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "discovery"
  | "neutral"
  | "teal"
  | "blue"
  | "primary"
  | "outline";

export interface LozengeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: LozengeVariant;
  appearance?: "subtle" | "bold";
  size?: "xs" | "sm" | "md";
  dot?: boolean;
}

export function Lozenge({
  className,
  variant = "default",
  appearance = "subtle",
  size = "sm",
  dot = false,
  children,
  ...props
}: LozengeProps) {
  // Map legacy / alternative variants to standard semantic tokens
  const normalizedVariant: "neutral" | "success" | "warning" | "danger" | "info" | "discovery" =
    variant === "success" || variant === "teal"
      ? "success"
      : variant === "warning"
      ? "warning"
      : variant === "danger"
      ? "danger"
      : variant === "info" || variant === "blue" || variant === "primary"
      ? "info"
      : variant === "discovery"
      ? "discovery"
      : "neutral";

  const sizeClasses = {
    xs: "px-2 py-0.5 text-[10.5px] gap-1 font-semibold",
    sm: "px-2.5 py-0.5 text-[11.5px] gap-1.5 font-semibold",
    md: "px-3 py-1 text-xs gap-1.5 font-semibold",
  };

  const subtleVariantClasses = {
    neutral: "bg-neutral-bg text-neutral border border-border/60",
    success: "bg-success-bg text-success border border-success/20",
    warning: "bg-warning-bg text-warning border border-warning/25",
    danger: "bg-danger-bg text-danger border border-danger/20",
    info: "bg-info-bg text-info border border-info/20",
    discovery: "bg-discovery-bg text-discovery border border-discovery/25",
  };

  const boldVariantClasses = {
    neutral: "bg-neutral text-white border-transparent",
    success: "bg-success text-white border-transparent",
    warning: "bg-warning text-black border-transparent",
    danger: "bg-danger text-white border-transparent",
    info: "bg-primary text-white border-transparent",
    discovery: "bg-discovery text-white border-transparent",
  };

  const dotColorClasses = {
    neutral: "bg-neutral",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    info: "bg-info",
    discovery: "bg-discovery",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-bold uppercase tracking-wider rounded-lozenge select-none leading-none whitespace-nowrap",
        sizeClasses[size],
        appearance === "bold"
          ? boldVariantClasses[normalizedVariant]
          : subtleVariantClasses[normalizedVariant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full flex-shrink-0",
            dotColorClasses[normalizedVariant]
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

// Export Badge as alias for Lozenge to maintain full backward compatibility
export const Badge = Lozenge;
export type BadgeProps = LozengeProps;

// Specialized Jira-style Domain Lozenges
export function OperationalBadge({
  status,
  size = "sm",
  dot = true,
  className,
}: {
  status: string;
  size?: "xs" | "sm" | "md";
  dot?: boolean;
  className?: string;
}) {
  const normalized = (status || "").toLowerCase();
  let variant: LozengeVariant = "neutral";
  if (normalized.includes("operation") && !normalized.includes("non")) {
    variant = "success";
  } else if (normalized.includes("degraded")) {
    variant = "warning";
  } else if (normalized.includes("non") || normalized.includes("offline") || normalized.includes("repair")) {
    variant = "danger";
  } else if (normalized.includes("maint")) {
    variant = "info";
  }

  return (
    <Lozenge variant={variant} size={size} dot={dot} className={className}>
      {status}
    </Lozenge>
  );
}

export function CriticalityBadge({
  criticality,
  tier,
  size = "sm",
  className,
}: {
  criticality?: string;
  tier?: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const text = criticality || tier || "Tier 3 - Business Operational";
  const normalized = text.toLowerCase();
  let variant: LozengeVariant = "neutral";
  if (normalized.includes("tier 0") || normalized.includes("tier 1") || normalized.includes("mission") || normalized.includes("1 - high")) {
    variant = "danger";
  } else if (normalized.includes("tier 2") || normalized.includes("business critical") || normalized.includes("2 - medium")) {
    variant = "warning";
  } else if (normalized.includes("tier 3") || normalized.includes("operational") || normalized.includes("3 - low")) {
    variant = "info";
  }

  return (
    <Lozenge variant={variant} size={size} className={className}>
      {text}
    </Lozenge>
  );
}

export function TrustScoreBadge({
  score,
  size = "sm",
  showLabel = true,
  className,
}: {
  score: number;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
  className?: string;
}) {
  const s = Number(score) || 0;
  const variant: LozengeVariant = s >= 80 ? "success" : s >= 60 ? "warning" : "danger";

  return (
    <Lozenge variant={variant} size={size} className={cn("font-mono", className)}>
      {s}%{showLabel ? " TRUST" : ""}
    </Lozenge>
  );
}

