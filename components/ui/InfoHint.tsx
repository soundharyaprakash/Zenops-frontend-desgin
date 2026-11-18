"use client";

import React, { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InfoHintProps {
  title?: string;
  concept?: string;
  whatItMeasures?: string;
  whyItMatters: string;
  target?: string;
  align?: "left" | "right" | "center";
  className?: string;
}

export function InfoHint({
  title = "Metric Concept",
  concept,
  whatItMeasures,
  whyItMatters,
  target,
  align = "right",
  className,
}: InfoHintProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const descriptionText = concept || whatItMeasures || "";

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

  const alignClasses = {
    left: "left-0",
    right: "right-0",
    center: "left-1/2 -translate-x-1/2",
  };

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className={cn(
          "p-0.5 rounded text-muted hover:text-default hover:bg-sunken transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary",
          open && "text-primary bg-sunken",
          className
        )}
        title="What is this metric?"
        aria-label="What is this metric?"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 top-full mt-1.5 w-72 sm:w-80 bg-surface border border-border rounded-card shadow-dropdown p-3.5 text-left text-xs animate-in fade-in zoom-in-95 duration-100",
            alignClasses[align]
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-border">
            <h5 className="font-bold text-default text-sm tracking-tight flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              {title}
            </h5>
            {target && (
              <span className="text-xs font-bold text-success bg-success-bg px-2 py-0.5 rounded-lozenge border border-success/20">
                Target: {target}
              </span>
            )}
          </div>

          {/* Body */}
          <div className="space-y-2.5 text-secondary">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                What it measures
              </p>
              <p className="mt-0.5 text-default text-xs leading-relaxed">
                {descriptionText}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Why it matters
              </p>
              <p className="mt-0.5 text-xs leading-relaxed">
                {whyItMatters}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
