"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  Circle,
  ArrowRight,
  Cloud,
  FileSpreadsheet,
  GitMerge,
  Users,
  Network,
  ShieldCheck,
  Check,
  Lock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lozenge } from "@/components/ui/Lozenge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useCMDB } from "@/context/cmdb-context";
import { cn } from "@/lib/utils";

export function GettingStartedView() {
  const { cis, discoverySources, reconciliationRules, attestationCampaigns, activeTenant } =
    useCMDB();

  const hasDiscovery = discoverySources.some((s) => s.status === "Active");
  const hasCIs = cis.length > 0;
  const hasRules = reconciliationRules.length > 0;
  const hasOwners = cis.filter((c) => c.owner && c.owner !== "Unassigned").length >= 5;
  const hasServices = true;
  const hasAttestation = attestationCampaigns.some((c) => c.certifiedCIs > 0);

  const steps = [
    {
      num: 1,
      title: "Connect First Discovery Source",
      description: "Establish automated ingestion from AWS CloudTrail, Azure Resource Graph, Kubernetes, or agent collectors.",
      href: "/discovery-sources",
      actionLabel: "Configure Connectors",
      icon: Cloud,
      completed: hasDiscovery,
      details: `${discoverySources.filter((s) => s.status === "Active").length} active collectors feeding authoritative telemetry into staging.`,
    },
    {
      num: 2,
      title: "Ingest Initial Configuration Items",
      description: "Run an automated discovery scan or batch import your existing infrastructure inventory using a CSV spreadsheet.",
      href: "/cis",
      actionLabel: "Open Inventory",
      icon: FileSpreadsheet,
      completed: hasCIs,
      details: `${cis.length} Configuration Items indexed in current tenant catalog.`,
    },
    {
      num: 3,
      title: "Review & Establish Reconciliation Rules",
      description: "Verify MAC address, serial number, and FQDN match priorities in the IRE engine to prevent duplicate records.",
      href: "/reconciliation-rules",
      actionLabel: "Review Rules",
      icon: GitMerge,
      completed: hasRules,
      details: `${reconciliationRules.length} reconciliation rules configured across core architecture classes.`,
    },
    {
      num: 4,
      title: "Assign Technical Owners to Live CIs",
      description: "Enforce accountability by assigning primary technical owners and support groups to all In-Use assets.",
      href: "/data-quality",
      actionLabel: "Remediate Ownership",
      icon: Users,
      completed: hasOwners,
      details: "Live CIs without owners drop Trust Score by 30 pts. Remediate in Data Quality.",
    },
    {
      num: 5,
      title: "Map Service Dependency Topology",
      description: "Connect infrastructure nodes into Tier-0 and Tier-1 Business Services to enable blast-radius incident impact analysis.",
      href: "/services",
      actionLabel: "Map Services",
      icon: Network,
      completed: hasServices,
      details: "5 business services modeled with downtime financial exposure calculations.",
    },
    {
      num: 6,
      title: "Run First Attestation Campaign",
      description: "Launch periodic compliance sign-offs where engineering leads verify live operational status and attributes.",
      href: "/attestation-campaigns",
      actionLabel: "Launch Attestation",
      icon: ShieldCheck,
      completed: hasAttestation,
      details: "Quarterly attestation cycle certifying critical infrastructure accuracy.",
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 text-text-default">
      {/* Header */}
      <div className="space-y-2 text-center sm:text-left">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-default">
              Getting Started with ZenOps CMDB
            </h1>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-text-muted bg-sunken px-2.5 py-0.5 rounded border border-border/60">
            <Lock className="w-3.5 h-3.5 text-text-muted" />
            {activeTenant}
          </span>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
          Follow the 6-step guided roadmap to configure multi-source discovery, automated reconciliation,
          ownership governance, and service topology mapping.
        </p>
      </div>

      {/* Setup Progress Card */}
      <Card className="bg-gradient-to-r from-primary/5 via-brand-cyan/5 to-brand-mint/5 border-primary/20 p-5 shadow-card">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-text-default">Overall Setup Progress</span>
            <span className="font-mono font-bold text-primary text-base">{progressPct}%</span>
          </div>
          <ProgressBar value={progressPct} max={100} variant="brand" size="md" />
          <p className="text-xs text-text-secondary">
            {completedCount} of {steps.length} milestones completed. Complete all steps to achieve optimal 80%+ Enterprise Trust SLA.
          </p>
        </div>
      </Card>

      {/* 6 Steps List */}
      <div className="space-y-3.5">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Card
              key={step.num}
              className={cn(
                "bg-surface border-border transition-all shadow-card",
                step.completed ? "border-success/30 bg-surface" : "border-border"
              )}
            >
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
                {/* Left: Icon & Title */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border",
                      step.completed
                        ? "bg-success/10 text-success border-success/30"
                        : "bg-sunken text-text-muted border-border"
                    )}
                  >
                    {step.completed ? (
                      <Check className="w-4.5 h-4.5" />
                    ) : (
                      <span className="font-mono font-bold text-sm">{step.num}</span>
                    )}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className={cn(
                          "font-bold text-sm sm:text-base text-text-default",
                          step.completed && "text-text-default"
                        )}
                      >
                        {step.title}
                      </h3>
                      {step.completed ? (
                        <Lozenge appearance="subtle" variant="success" size="sm">
                          Completed
                        </Lozenge>
                      ) : (
                        <Lozenge appearance="subtle" variant="warning" size="sm">
                          Next Action
                        </Lozenge>
                      )}
                    </div>
                    <p className="text-text-secondary leading-relaxed text-sm">{step.description}</p>
                    <p className="text-xs text-text-muted font-mono">{step.details}</p>
                  </div>
                </div>

                {/* Right: Action */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={step.href}>
                    <Button
                      size="sm"
                      variant={step.completed ? "outline" : "primary"}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      {step.actionLabel}
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
