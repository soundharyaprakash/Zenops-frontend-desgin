"use client";

import React, { useState } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface JargonTooltipProps {
  term:
    | "IRE"
    | "Payload Volume"
    | "Scan Interval Cadence"
    | "Identification Keys"
    | "Authoritative Precedence"
    | "Overwrite"
    | "ML Precedence"
    | string;
  customExplanation?: string;
  children?: React.ReactNode;
  className?: string;
}

const JARGON_DEFINITIONS: Record<string, string> = {
  IRE: "Identification & Reconciliation Engine: automated rule-set that matches incoming discovery records to existing CIs and resolves attribute conflicts.",
  "Payload Volume": "Total inbound configuration items ingested per discovery cycle before deduplication and reconciliation.",
  "Scan Interval Cadence": "Configured recurring period between automated discovery sweeps for a specific connector.",
  "Identification Keys": "Authoritative unique identifiers (e.g. cloudResourceId, serialNumber, FQDN) used to coalesce multi-source records.",
  "Authoritative Precedence": "Rank-ordered priority defining which discovery source overwrites an attribute during reconciliation.",
  Overwrite: "Automated replacement of existing CMDB attribute values with new telemetry from a higher-ranked source.",
  "ML Precedence": "Machine learning confidence scoring (0-100%) computed from source reliability history, schema fidelity, and attribute consistency.",
};

/**
 * Interactive Jargon Tooltip (Phase 0, Item 0.9 & G7)
 *
 * Provides plain-words explanations for technical CMDB terminology.
 */
export const JargonTooltip: React.FC<JargonTooltipProps> = ({
  term,
  customExplanation,
  children,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const explanation = customExplanation || JARGON_DEFINITIONS[term] || "Technical CMDB operational concept.";

  return (
    <span
      className={cn("relative inline-flex items-center gap-1 group cursor-help", className)}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <span className="border-b border-dotted border-muted/70">{children || term}</span>
      <HelpCircle className="w-3 h-3 text-muted/80 group-hover:text-primary transition-colors inline shrink-0" />

      {isOpen && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 px-3 py-1.5 bg-neutral-900 border border-border text-neutral-100 text-[11px] font-normal rounded-md shadow-xl whitespace-normal w-64 text-left pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <span className="font-bold text-primary block mb-0.5">{term}</span>
          <span className="text-secondary leading-relaxed">{explanation}</span>
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900" />
        </span>
      )}
    </span>
  );
};
