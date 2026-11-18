"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ShieldAlert,
  Award,
  Radio,
  Clock,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Layers,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Sliders,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lozenge } from "@/components/ui/Lozenge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InfoHint } from "@/components/ui/InfoHint";
import { useCMDB } from "@/context/cmdb-context";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/utils";
import { TelemetryTrendChart } from "@/components/cmdb/TelemetryTrendChart";
import { RadialArchitectureChart } from "@/components/cmdb/RadialArchitectureChart";
import { TrustScoreAnalyticsCard } from "@/components/cmdb/TrustScoreAnalyticsCard";

export function DashboardCharts() {
  const { cis, discoverySources, dataQualityTasks, triggerDiscoveryRun, showToast } = useCMDB();
  const [triggeringSource, setTriggeringSource] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // ROW 3: OPEN DATA QUALITY TASKS BREAKDOWN
  // ---------------------------------------------------------------------------
  const dqCategories = [
    {
      label: "Stale Telemetry (>14d)",
      filter: "Stale Discovery",
      count: dataQualityTasks.filter(
        (t) => t.issueType === "Stale Discovery" && t.status !== "Applied"
      ).length,
      severity: "warning",
    },
    {
      label: "Missing Owner",
      filter: "Missing Required Ownership",
      count: dataQualityTasks.filter(
        (t) => t.issueType === "Missing Required Ownership" && t.status !== "Applied"
      ).length,
      severity: "danger",
    },
    {
      label: "Duplicate Suspects",
      filter: "Duplicate Suspect",
      count: dataQualityTasks.filter(
        (t) => t.issueType === "Duplicate Suspect" && t.status !== "Applied"
      ).length,
      severity: "danger",
    },
    {
      label: "Conflicting Data",
      filter: "Attribute Conflict",
      count: dataQualityTasks.filter(
        (t) => t.issueType === "Attribute Conflict" && t.status !== "Applied"
      ).length,
      severity: "info",
    },
    {
      label: "Unassigned Support",
      filter: "Unassigned Support Group",
      count: dataQualityTasks.filter(
        (t) => t.issueType === "Unassigned Support Group" && t.status !== "Applied"
      ).length,
      severity: "neutral",
    },
  ];

  // Missing required support_group or owner (Completeness metric)
  const incompleteCIs = cis.filter(
    (c) =>
      !c.owner ||
      c.owner === "Unassigned" ||
      !c.supportGroup ||
      c.supportGroup === "Unassigned"
  ).length;

  // ---------------------------------------------------------------------------
  // ROW 3: DISCOVERY SOURCES HEALTH
  // ---------------------------------------------------------------------------
  const handleTriggerRun = (sourceId: string, sourceName: string) => {
    setTriggeringSource(sourceId);
    setTimeout(() => {
      triggerDiscoveryRun(sourceId);
      setTriggeringSource(null);
      showToast("success", "Discovery Sync Completed", `${sourceName} scanned and reconciled 42 items.`);
    }, 1000);
  };

  // ---------------------------------------------------------------------------
  // ROW 3: BUSINESS SERVICES BY TRUST SCORE
  // ---------------------------------------------------------------------------
  const businessServicesList = [
    { name: "Payments API", score: 94, count: 18, tier: "Tier 0", slaStatus: "ok" },
    { name: "Customer Web Portal", score: 88, count: 24, tier: "Tier 1", slaStatus: "ok" },
    { name: "Order Processing", score: 82, count: 14, tier: "Tier 1", slaStatus: "ok" },
    { name: "Enterprise Data Warehouse", score: 74, count: 9, tier: "Tier 2", slaStatus: "ok" },
    { name: "Legacy HR System", score: 42, count: 6, tier: "Tier 2", slaStatus: "breach" },
  ];

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------------------------- */}
      {/* SECTION 1.5: TELEMETRY & TRUST VELOCITY TREND (LIVE ANIMATED SVG GRAPH) */}
      {/* ----------------------------------------------------------------------- */}
      <TelemetryTrendChart />
      {/* ----------------------------------------------------------------------- */}
      {/* SECTION 2: HOW GOOD IS IT */}
      {/* ----------------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-text-default uppercase tracking-wider">
              Quality & Architectural Spread
            </h2>
            <InfoHint
              title="Quality & Architectural Spread"
              concept="Breaks down overall CMDB health across 5 Trust Score tiers and displays catalog distribution across standard infrastructure classes."
              whyItMatters="High Trust Scores prevent blind-spot outages. A balanced class spread verifies discovery is comprehensive across cloud, containers, and applications."
              target="Target: 80%+ Enterprise Trust SLA; no critical service below 70"
            />
          </div>
          <p className="text-xs text-text-muted hidden sm:block italic">
            Reading order: How good is it — trust distribution across tiers and architectural balance
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Panel A: Trust Score Analytics (Animated Speedometer Gauge & 5-Dimension Pillars) */}
          <TrustScoreAnalyticsCard />

          {/* Panel B: Radial Architecture Breakdown (Animated Donut & Category Sync) */}
          <RadialArchitectureChart />
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* SECTION 3: WHAT SHOULD WE FIX FIRST */}
      {/* ----------------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-text-default uppercase tracking-wider">
              Governance & Remediation Priority
            </h2>
            <InfoHint
              title="Governance & Remediation Priority"
              concept="Pinpoints immediate remediation priorities: actionable data quality tasks, real-time discovery connector health, and business services falling below SLA."
              whyItMatters="Directs engineering attention to the highest-risk anomalies first, ensuring CMDB integrity is continuously maintained with minimal manual toil."
              target="Target: <5% stale CIs, 95%+ owner coverage, 100% discovery connector uptime"
            />
          </div>
          <p className="text-xs text-text-muted hidden sm:block italic">
            Reading order: What should we fix first — open tasks, connector status, and service SLAs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Column 1: Open Data Quality Tasks */}
          <Card className="bg-surface flex flex-col justify-between">
            <div>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-bold text-text-default">
                    Open DQ Remediation
                  </CardTitle>
                  <CardDescription className="text-sm text-text-secondary">
                    Prioritized governance tasks
                  </CardDescription>
                </div>
                <Link
                  href="/data-quality"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  Review All <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-2">
                {dqCategories.map((cat) => (
                  <Link
                    key={cat.label}
                    href={`/data-quality?type=${encodeURIComponent(cat.filter)}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-sunken border border-border/40 dark:border-white/[0.06] transition-colors group"
                  >
                    <span className="text-xs font-medium text-text-default group-hover:text-primary">
                      {cat.label}
                    </span>
                    <Lozenge
                      appearance={cat.count > 0 ? "bold" : "subtle"}
                      variant={
                        cat.count === 0
                          ? "success"
                          : cat.severity === "danger"
                          ? "danger"
                          : cat.severity === "warning"
                          ? "warning"
                          : "info"
                      }
                    >
                      {cat.count}
                    </Lozenge>
                  </Link>
                ))}

                {/* Completeness Widget Alert */}
                {incompleteCIs > 0 && (
                  <div className="mt-3 p-2.5 rounded bg-warning/10 border border-warning/30 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-snug">
                      <p className="font-semibold text-text-default">
                        Completeness Alert: {incompleteCIs} CIs
                      </p>
                      <p className="text-text-secondary mt-0.5">
                        Lacking owner or support group assignments.
                      </p>
                      <Link
                        href="/data-quality"
                        className="text-primary font-semibold hover:underline inline-block mt-1"
                      >
                        Auto-resolve in Data Quality &rarr;
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>

          {/* Column 2: Discovery Sources Health */}
          <Card className="bg-surface border-border flex flex-col justify-between shadow-card">
            <div>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-bold text-text-default">
                    Discovery Sources Health
                  </CardTitle>
                  <CardDescription className="text-sm text-text-secondary">
                    Connector status & last sync
                  </CardDescription>
                </div>
                <Link
                  href="/discovery-sources"
                  className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  Manage <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {discoverySources.slice(0, 5).map((source) => {
                  const isLate = source.id.includes("network") || source.lastRun.includes("16h");
                  const isFailed = source.status === "Error";
                  const statusVariant = isFailed ? "danger" : isLate ? "warning" : "success";
                  const statusLabel = isFailed ? "FAILED" : isLate ? "LATE" : "OK";

                  return (
                    <div
                      key={source.id}
                      className="p-2.5 rounded-md border border-border/40 dark:border-white/[0.06] hover:bg-sunken transition-colors flex items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-text-default truncate">
                            {source.name}
                          </p>
                          <Lozenge appearance="bold" variant={statusVariant} size="sm">
                            {statusLabel}
                          </Lozenge>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5 truncate" suppressHydrationWarning>
                          Synced {formatDateTime(source.lastRun)} &bull; {source.cisDiscovered} CIs
                        </p>
                      </div>

                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={() => handleTriggerRun(source.id, source.name)}
                        isLoading={triggeringSource === source.id}
                        title="Trigger Scan"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-text-muted hover:text-primary" />
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </div>

            <div className="p-4 pt-0">
              <Link href="/discovery-sources">
                <Button size="sm" variant="secondary" className="w-full">
                  Configure Discovery Connectors
                </Button>
              </Link>
            </div>
          </Card>

          {/* Column 3: Business Services by Trust Score */}
          <Card className="bg-surface flex flex-col justify-between">
            <div>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-bold text-text-default">
                    Services by Trust Score
                  </CardTitle>
                  <CardDescription className="text-sm text-text-secondary">
                    Aggregated service health & SLA
                  </CardDescription>
                </div>
                <Link
                  href="/services"
                  className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  Catalog <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-3.5">
                {businessServicesList.map((svc) => {
                  const isBreach = svc.score < 70;
                  return (
                    <div key={svc.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-text-default truncate">
                            {svc.name}
                          </span>
                          <span className="text-xs text-text-muted font-mono">
                            ({svc.count} CIs)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isBreach ? (
                            <Lozenge appearance="bold" variant="danger" size="sm">
                              &lt;70 SLA Breach
                            </Lozenge>
                          ) : (
                            <Lozenge appearance="subtle" variant="success" size="sm">
                              Healthy
                            </Lozenge>
                          )}
                          <span
                            className={cn(
                              "font-mono font-bold tabular-nums text-sm",
                              isBreach ? "text-danger" : "text-success"
                            )}
                          >
                            {svc.score}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-sunken rounded-full h-2 overflow-hidden border border-border/40 dark:border-white/[0.06]">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${svc.score}%`,
                            backgroundColor: isBreach ? "var(--danger)" : "var(--success)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </div>

            <div className="p-4 pt-0">
              <Link href="/relationships">
                <Button size="sm" variant="secondary" className="w-full">
                  Explore Dependency Topology
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
