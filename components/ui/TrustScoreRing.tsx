"use client";

import React, { useState, useRef, useEffect } from "react";
import { HelpCircle, ChevronRight, CheckCircle2, AlertTriangle, XCircle, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TrustScoreBreakdown {
  freshness?: number;     // max 30
  completeness?: number;  // max 25
  consistency?: number;   // max 20
  relationships?: number; // max 15
  ownership?: number;     // max 10
  reasons?: string[];
  remediations?: string[];
}

export interface TrustScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  interactive?: boolean;
  breakdown?: TrustScoreBreakdown;
  className?: string;
}

export function TrustScoreRing({
  score,
  size = "md",
  showLabel = true,
  interactive = true,
  breakdown = {
    freshness: 28,
    completeness: 22,
    consistency: 18,
    relationships: 12,
    ownership: 10,
    reasons: ["Discovered recently via cloud collector", "Owner verified and support group mapped"],
    remediations: ["Verify 2 unconfirmed relationships", "Fill missing asset tag"],
  },
  className,
}: TrustScoreRingProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Dimensions
  const dim = size === "sm" ? 36 : size === "lg" ? 64 : 48;
  const strokeWidth = size === "sm" ? 3.5 : size === "lg" ? 5 : 4;
  const radius = (dim - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const offset = circumference - (clampedScore / 100) * circumference;

  // Tier color mapping
  const getStatus = (val: number) => {
    if (val >= 80) return { text: "text-success", stroke: "var(--success)", bg: "bg-success-bg", label: "High Trust" };
    if (val >= 60) return { text: "text-warning", stroke: "var(--warning)", bg: "bg-warning-bg", label: "Moderate" };
    return { text: "text-danger", stroke: "var(--danger)", bg: "bg-danger-bg", label: "Low Trust" };
  };

  const status = getStatus(clampedScore);

  return (
    <div ref={containerRef} className="relative inline-flex items-center gap-2">
      <div
        onClick={() => interactive && setOpen(!open)}
        className={cn(
          "relative inline-flex items-center justify-center select-none",
          interactive && "cursor-pointer group focus:outline-none",
          className
        )}
        title={interactive ? "Click for Trust Score breakdown" : undefined}
      >
        <svg width={dim} height={dim} className="transform -rotate-90">
          {/* Background Track */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            stroke="var(--border)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Active Value Arc */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            stroke={status.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* Center Score Text */}
        <span
          className={cn(
            "absolute font-mono font-bold tracking-tighter text-default",
            size === "sm" ? "text-[10px]" : size === "lg" ? "text-base" : "text-xs"
          )}
        >
          {clampedScore}
        </span>
      </div>

      {showLabel && (
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Trust Score</span>
          <span className={cn("text-xs font-bold leading-tight", status.text)}>
            {status.label}
          </span>
        </div>
      )}

      {/* Popover Breakdown */}
      {open && (
        <div
          className="absolute z-50 top-full mt-2 left-0 sm:left-auto sm:right-0 w-80 bg-surface border border-border rounded-card shadow-dropdown p-4 text-xs animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h5 className="font-bold text-default text-sm flex items-center gap-1.5">
                Trust Score: <span className={cn("font-mono", status.text)}>{clampedScore}/100</span>
              </h5>
              <p className="text-[11px] text-muted">Formula-driven reliability score</p>
            </div>
            <span
              className={cn(
                "px-2 py-0.5 rounded-lozenge text-[10px] font-bold uppercase tracking-wider border",
                status.bg,
                status.text
              )}
            >
              {status.label}
            </span>
          </div>

          {/* Component Pillars Breakdown */}
          <div className="py-3 space-y-2 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
              5 Pillars Composition
            </p>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-secondary">Freshness (last seen)</span>
                <span className="font-mono font-semibold text-default">
                  {breakdown.freshness ?? 30} / 30
                </span>
              </div>
              <div className="w-full bg-sunken h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${((breakdown.freshness ?? 30) / 30) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-secondary">Completeness (required attributes)</span>
                <span className="font-mono font-semibold text-default">
                  {breakdown.completeness ?? 25} / 25
                </span>
              </div>
              <div className="w-full bg-sunken h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-brand-cyan h-full rounded-full"
                  style={{ width: `${((breakdown.completeness ?? 25) / 25) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-secondary">Consistency (discovery agreement)</span>
                <span className="font-mono font-semibold text-default">
                  {breakdown.consistency ?? 20} / 20
                </span>
              </div>
              <div className="w-full bg-sunken h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-brand-mint h-full rounded-full"
                  style={{ width: `${((breakdown.consistency ?? 20) / 20) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-secondary">Relationships (topology links)</span>
                <span className="font-mono font-semibold text-default">
                  {breakdown.relationships ?? 15} / 15
                </span>
              </div>
              <div className="w-full bg-sunken h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full"
                  style={{ width: `${((breakdown.relationships ?? 15) / 15) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-secondary">Ownership (assigned & verified)</span>
                <span className="font-mono font-semibold text-default">
                  {breakdown.ownership ?? 10} / 10
                </span>
              </div>
              <div className="w-full bg-sunken h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-success h-full rounded-full"
                  style={{ width: `${((breakdown.ownership ?? 10) / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Reasons & How to Improve */}
          {breakdown.remediations && breakdown.remediations.length > 0 && (
            <div className="pt-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">
                How to reach 100%
              </p>
              <ul className="space-y-1">
                {breakdown.remediations.map((rem, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-secondary">
                    <ArrowUpRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{rem}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
