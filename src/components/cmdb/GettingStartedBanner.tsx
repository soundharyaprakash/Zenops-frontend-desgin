"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  X,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Lozenge } from "@/components/ui/Lozenge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useCMDB } from "@/context/cmdb-context";

interface ChecklistStep {
  id: string;
  title: string;
  description: string;
  href: string;
  completed: boolean;
}

export function GettingStartedBanner() {
  const { cis, discoverySources, reconciliationRules, attestationCampaigns, activeTenant } =
    useCMDB();
  const [dismissed, setDismissed] = useState(false);

  // Check localStorage if dismissed
  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem("zenops_dismiss_getting_started");
      if (isDismissed === "true") {
        setDismissed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("zenops_dismiss_getting_started", "true");
    } catch {
      // ignore
    }
  };

  // Derive dynamic completion state
  const hasDiscovery = discoverySources.some((s) => s.status === "Active");
  const hasCIs = cis.length > 0;
  const hasRules = reconciliationRules.length > 0;
  const hasOwners = cis.filter((c) => c.owner && c.owner !== "Unassigned").length >= 5;
  const hasServices = true; // Seeded business services
  const hasAttestation = attestationCampaigns.some((c) => c.certifiedCIs > 0);

  const steps: ChecklistStep[] = [
    {
      id: "step-1",
      title: "1. Connect Discovery Source",
      description: "Link AWS, Azure, K8s, or Agent",
      href: "/discovery-sources",
      completed: hasDiscovery,
    },
    {
      id: "step-2",
      title: "2. Ingest CI Inventory",
      description: "Run automated scan or import CSV",
      href: "/cis",
      completed: hasCIs,
    },
    {
      id: "step-3",
      title: "3. Review IRE Rules",
      description: "Reconcile duplicate identifiers",
      href: "/reconciliation-rules",
      completed: hasRules,
    },
    {
      id: "step-4",
      title: "4. Assign CI Owners",
      description: "Fix live CIs lacking designated owners",
      href: "/data-quality",
      completed: hasOwners,
    },
    {
      id: "step-5",
      title: "5. Map Service Topology",
      description: "Roll up CIs into business services",
      href: "/services",
      completed: hasServices,
    },
    {
      id: "step-6",
      title: "6. Run Attestation",
      description: "Certify Tier-0 infrastructure",
      href: "/attestation-campaigns",
      completed: hasAttestation,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  if (dismissed && progressPct === 100) return null;

  return (
    <div className="relative rounded-lg border border-primary/20 dark:border-white/[0.08] bg-gradient-to-r from-primary/5 via-brand-cyan/5 to-brand-mint/5 dark:from-primary/[0.07] dark:via-surface dark:to-surface p-4 sm:p-5 shadow-xs dark:shadow-none transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Summary */}
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:rotate-12 duration-300">
              <Sparkles className="h-3 w-3 animate-pulse" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Getting Started Checklist
            </span>
            <Lozenge appearance="subtle" variant={progressPct === 100 ? "success" : "info"}>
              {completedCount} of {steps.length} Complete
            </Lozenge>
          </div>
          <h3 className="text-sm font-semibold text-text-default">
            Set up the ZenOps CMDB for {activeTenant}
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            Follow the guided 6-step roadmap to establish trusted identification, automated
            telemetry synchronization, and business service impact analysis.
          </p>
        </div>

        {/* Right: Progress and Action */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="w-36 hidden sm:block">
            <div className="flex justify-between text-[11px] font-semibold text-text-secondary mb-1">
              <span>Setup Progress</span>
              <span className="font-mono">{progressPct}%</span>
            </div>
            <ProgressBar value={progressPct} max={100} variant="brand" size="sm" />
          </div>

          <div className="flex items-center gap-2">
            <Link href="/getting-started">
              <Button size="sm" variant="primary" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Setup Guide
              </Button>
            </Link>
            <button
              onClick={handleDismiss}
              className="text-text-muted hover:text-text-default p-1 rounded-md transition-colors"
              title="Dismiss banner"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Steps Pill Row */}
      <div className="mt-4 pt-3 border-t border-border/40 dark:border-white/[0.06] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {steps.map((step) => (
          <Link
            key={step.id}
            href={step.href}
            className="flex items-start gap-1.5 p-1.5 rounded hover:bg-surface/80 dark:hover:bg-white/[0.04] transition-all duration-150 hover:-translate-y-0.5 group"
          >
            {step.completed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0 transition-transform group-hover:scale-110 duration-150" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-text-muted mt-0.5 flex-shrink-0 group-hover:text-primary transition-colors" />
            )}
            <div className="min-w-0">
              <p
                className={`text-[11px] font-medium truncate ${
                  step.completed ? "text-text-muted line-through" : "text-text-default group-hover:text-primary"
                }`}
              >
                {step.title}
              </p>
              <p className="text-[10px] text-text-muted truncate">{step.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
