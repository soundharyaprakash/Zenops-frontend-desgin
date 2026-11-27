"use client";

import React, { useState, useMemo } from "react";
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
  Check,
  UserCheck,
  Network,
  Users,
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
import {
  getTaskQueueMetrics,
  CANONICAL_REMEDIATION_TASKS,
} from "@/lib/cmdb-metrics";
import { getDashboardMetrics, HEALTH_BANDS } from "@/lib/dashboard/metrics";

export function DashboardCharts() {
  const {
    cis,
    relationships,
    discoverySources,
    dataQualityTasks,
    attestationCampaigns,
    auditHistory,
    selectedEnvironment,
    activeTenant,
    triggerDiscoveryRun,
    showToast,
  } = useCMDB();

  const [triggeringSource, setTriggeringSource] = useState<string | null>(null);
  const [taskViewMode, setTaskViewMode] = useState<"categories" | "priorityList">("categories");

  // Canonical Task Queue Metrics (A2 requirement: reads directly from getTaskQueueMetrics())
  const taskQueueMetrics = useMemo(() => getTaskQueueMetrics(), []);

  // Single shared selector module for consistency across dashboard (Priority 1, Item 1)
  const dashboardData = useMemo(() => {
    return getDashboardMetrics(
      cis,
      relationships,
      discoverySources,
      dataQualityTasks,
      attestationCampaigns,
      auditHistory,
      selectedEnvironment,
      activeTenant
    );
  }, [
    cis,
    relationships,
    discoverySources,
    dataQualityTasks,
    attestationCampaigns,
    auditHistory,
    selectedEnvironment,
    activeTenant,
  ]);

  // Categories matching KPI tile counts 1:1 (Priority 1, Item 3)
  const dqCategories = [
    {
      label: "Stale Telemetry (>14d)",
      href: "/data-quality?tab=stale",
      count: dashboardData.staleCount,
      severity: dashboardData.staleCount > 0 ? "warning" : "success",
    },
    {
      label: "Missing Owner",
      href: "/data-quality?tab=missing-owner",
      count: dashboardData.missingOwnerCount,
      severity: dashboardData.missingOwnerCount > 0 ? "danger" : "success",
    },
    {
      label: "Duplicate Suspects",
      href: "/reconciliation-rules?tab=queue",
      count: dashboardData.duplicateSuspectsCount,
      severity: dashboardData.duplicateSuspectsCount > 0 ? "danger" : "success",
    },
    {
      label: "Conflicting Data",
      href: "/data-quality?type=Attribute%20Conflict",
      count: dashboardData.taskCategoryCounts.conflicts,
      severity: "info",
    },
    {
      label: "Unassigned Support",
      href: "/data-quality?type=Unassigned%20Support%20Group",
      count: dashboardData.taskCategoryCounts.unassignedSupport,
      severity: "neutral",
    },
  ];

  const handleTriggerRun = (sourceId: string, sourceName: string) => {
    setTriggeringSource(sourceId);
    setTimeout(() => {
      triggerDiscoveryRun(sourceId);
      setTriggeringSource(null);
      showToast(
        "success",
        "Discovery Sync Completed",
        `${sourceName} scanned and updated live estate telemetry.`
      );
    }, 900);
  };

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
              whyItMatters="High Trust Scores prevent blind-spot outages. A balanced class spread verifies discovery is comprehensive across compute, cloud, containers, and applications."
              target="Target: 80%+ Weighted Trust Score; no critical service below 60"
            />
          </div>
          <p className="text-xs text-text-muted hidden sm:block italic">
            Reading order: How good is it — trust distribution across tiers and architectural balance
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          {/* Panel A: Trust Score Analytics (Animated Speedometer Gauge & 5-Dimension Pillars) */}
          <div className="min-w-0 w-full flex">
            <TrustScoreAnalyticsCard />
          </div>

          {/* Panel B: Radial Architecture Breakdown (Animated Donut & 100% Category Sync) */}
          <div className="min-w-0 w-full flex">
            <RadialArchitectureChart />
          </div>
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
              concept="Pinpoints immediate remediation priorities: actionable data quality tasks, real-time discovery connector health, and business services falling below target."
              whyItMatters="Directs engineering attention to the highest-risk anomalies first, ensuring CMDB integrity is continuously maintained with minimal manual toil."
              target="Target: <5% stale CIs, 95%+ owner coverage, 100% discovery connector uptime"
            />
          </div>
          <p className="text-xs text-text-muted hidden sm:block italic">
            Reading order: What should we fix first — open tasks, connector status, and service targets
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Column 1: Open Data Quality Tasks (Tile counts match 1:1, Priority 1, Item 3 & Priority 4, Item 17) */}
          <Card className="bg-surface flex flex-col justify-between shadow-card">
            <div>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold text-text-default">
                      Open DQ Remediation
                    </CardTitle>
                    <Lozenge appearance="bold" variant="danger" size="xs">
                      {taskQueueMetrics.totalTasks} open
                    </Lozenge>
                  </div>
                  <CardDescription className="text-sm text-text-secondary">
                    Included in {taskQueueMetrics.totalTasks} canonical governance tasks
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="inline-flex rounded-md border border-border bg-sunken p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setTaskViewMode("categories")}
                      className={cn(
                        "px-2 py-0.5 rounded font-medium transition-all",
                        taskViewMode === "categories"
                          ? "bg-surface text-primary shadow-xs font-semibold"
                          : "text-text-secondary hover:text-text-default"
                      )}
                    >
                      Categories
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskViewMode("priorityList")}
                      className={cn(
                        "px-2 py-0.5 rounded font-medium transition-all",
                        taskViewMode === "priorityList"
                          ? "bg-surface text-primary shadow-xs font-semibold"
                          : "text-text-secondary hover:text-text-default"
                      )}
                    >
                      Prioritized
                    </button>
                  </div>
                  <Link
                    href="/data-quality"
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5 ml-1"
                  >
                    All <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                {taskViewMode === "categories" ? (
                  <>
                    {dqCategories.map((cat) => (
                      <Link
                        key={cat.label}
                        href={cat.href}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-sunken border border-border/40 transition-colors group"
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

                    {/* Completeness Alert Widget */}
                    {dashboardData.missingOwnerCount > 0 && (
                      <div className="mt-3 p-2.5 rounded bg-warning/10 border border-warning/30 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                        <div className="text-[11px] leading-snug">
                          <p className="font-semibold text-text-default">
                            Hygiene Alert: {dashboardData.missingOwnerCount} Unassigned CIs
                          </p>
                          <p className="text-text-secondary mt-0.5">
                            CIs missing technical owners or support groups.
                          </p>
                          <Link
                            href="/data-quality?tab=missing-owner"
                            className="text-primary font-semibold hover:underline inline-block mt-1"
                          >
                            Resolve unassigned CIs &rarr;
                          </Link>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Priority Task List with Severity, Age, Owner & One-Click Action (Priority 4, Item 17) */
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {(CANONICAL_REMEDIATION_TASKS.length > 0 ? CANONICAL_REMEDIATION_TASKS : dashboardData.remediationTasks).map((task) => (
                      <div
                        key={task.id}
                        className="p-2 rounded-md border border-border/60 hover:bg-sunken transition-all flex flex-col gap-1 text-xs"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Lozenge
                              appearance="bold"
                              variant={
                                task.severity === "Critical"
                                  ? "danger"
                                  : task.severity === "High"
                                  ? "warning"
                                  : "info"
                              }
                              size="xs"
                            >
                              {task.severity}
                            </Lozenge>
                            <span className="font-semibold text-text-default truncate">
                              {task.ciName}
                            </span>
                          </div>
                          <span className="text-[10px] text-text-muted flex-shrink-0 font-mono">
                            {task.age}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-text-secondary mt-0.5">
                          <span className="truncate max-w-[160px]">Owner: {task.owner}</span>
                          <Link href={task.actionHref}>
                            <Button size="xs" variant="primary" className="h-6 text-[11px] px-2">
                              {task.actionLabel}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </div>

            <div className="p-4 pt-0">
              <Link href="/data-quality">
                <Button size="sm" variant="secondary" className="w-full">
                  Open Remediation Workspace
                </Button>
              </Link>
            </div>
          </Card>

          {/* Column 2: Discovery Sources Health (Calculated sync age vs scan interval - Priority 1, Item 4 & Priority 4, Item 18) */}
          <Card className="bg-surface border-border flex flex-col justify-between shadow-card">
            <div>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold text-text-default">
                      Discovery Sources Health
                    </CardTitle>
                    <Lozenge
                      appearance="bold"
                      variant={dashboardData.healthySourcesCount === dashboardData.discoverySources.length ? "success" : "warning"}
                      size="xs"
                    >
                      {dashboardData.healthySourcesCount} of {dashboardData.discoverySources.length} Healthy
                    </Lozenge>
                  </div>
                  <CardDescription className="text-sm text-text-secondary">
                    Connector sync age vs interval cadence
                  </CardDescription>
                </div>
                <Link
                  href="/discovery-sources"
                  className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  Manage <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </CardHeader>

              <CardContent className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {dashboardData.discoverySources.map((source) => {
                  return (
                    <div
                      key={source.id}
                      className="p-2.5 rounded-md border border-border/40 hover:bg-sunken transition-colors flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-xs font-semibold text-text-default truncate">
                            {source.name}
                          </p>
                          {source.role === "import" && (
                            <Lozenge appearance="subtle" variant="neutral" size="xs">
                              Import
                            </Lozenge>
                          )}
                          <Lozenge appearance="bold" variant={source.badgeVariant} size="xs">
                            {source.health}
                          </Lozenge>
                        </div>

                        <Button
                          size="xs"
                          variant="subtle"
                          onClick={() => handleTriggerRun(source.id, source.name)}
                          isLoading={triggeringSource === source.id}
                          title="Trigger Immediate Sync"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-text-muted hover:text-primary" />
                        </Button>
                      </div>

                      {/* Sync age text & Cadence */}
                      <div className="flex items-center justify-between text-[11px] text-text-muted flex-wrap gap-1">
                        <span className="font-medium text-text-secondary">
                          {source.lastSyncedText}
                        </span>
                        <span className="font-mono text-[10px] bg-sunken px-1.5 py-0.2 rounded border border-border/60">
                          {source.nextRunTime}
                        </span>
                      </div>

                      {/* Estate coverage & errors */}
                      <div className="flex items-center justify-between text-[10px] text-text-muted border-t border-border/40 pt-1">
                        <span>{source.estateCoveredPct}% estate coverage</span>
                        <span className={source.errorCount > 0 ? "text-danger font-semibold" : "text-success"}>
                          {source.errorCount > 0 ? `${source.errorCount} sync errors` : "0 errors"}
                        </span>
                      </div>
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

          {/* Column 3: Business Services by Trust Score (Unified health bands & Target met / Below target - Priority 1, Item 6 & Priority 3, Item 12) */}
          <Card className="bg-surface flex flex-col justify-between shadow-card">
            <div>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3">
                <div>
                  <CardTitle className="text-base font-bold text-text-default">
                    Services by Trust Score
                  </CardTitle>
                  <CardDescription className="text-sm text-text-secondary">
                    Aggregated service health & targets
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
                {dashboardData.servicesHealth.map((svc) => {
                  const isBelowTarget = svc.score < 80;

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
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Lozenge
                            appearance="bold"
                            variant={svc.band.lozengeVariant}
                            size="xs"
                          >
                            {svc.band.label}
                          </Lozenge>
                          <Lozenge
                            appearance={isBelowTarget ? "bold" : "subtle"}
                            variant={svc.targetStatus.variant}
                            size="xs"
                          >
                            {svc.targetStatus.label}
                          </Lozenge>
                          <span
                            className={cn(
                              "font-mono font-bold tabular-nums text-sm",
                              svc.band.textColor
                            )}
                          >
                            {svc.score}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-sunken rounded-full h-2 overflow-hidden border border-border/40">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${svc.score}%`,
                            backgroundColor: svc.color,
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
