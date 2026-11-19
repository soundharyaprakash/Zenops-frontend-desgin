"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Radio,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Key,
  Calendar,
  RefreshCw,
  History,
  Shield,
  ExternalLink,
  Lock,
  Pause,
  PlayCircle,
  PauseCircle,
  XCircle,
  Eye,
  Info,
  Server,
  Cloud,
  Cpu,
  Database,
  ArrowRight,
  Search,
  Filter,
  Check,
  Globe,
  SlidersHorizontal,
  ChevronRight,
  List,
  LayoutGrid,
  AlertOctagon,
  HelpCircle,
  Ban,
  RotateCw,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Lozenge } from "@/components/ui/Lozenge";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { InfoHint } from "@/components/ui/InfoHint";
import { useCMDB } from "@/context/cmdb-context";
import { cn } from "@/lib/utils";
import { usePermission } from "@/components/rbac/usePermission";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import {
  DiscoverySourceRecord,
  RunHistoryItem,
  getCanonicalDiscoverySources,
  computeSourceHealth,
  formatDurationMinutes,
  formatRelativeSyncTime,
  formatNextRunTime,
  formatSourceTimestamp,
  UNCOVERED_DOMAINS,
  UncoveredDomain,
} from "@/lib/discovery/sourceRecord";
import { logAuditEvent } from "@/lib/governance/dataQuality";

export function DiscoverySourcesView() {
  const {
    cis,
    activeTenant,
    userRole,
    currentUser,
    showToast,
    triggerDiscoveryRun,
  } = useCMDB();
  const { allowed: canConfigure } = usePermission(PERMISSIONS.DISCOVERY_CONFIGURE);

  // Timezone toggle: UTC (default) vs Local (Priority 3, Item 14)
  const [tzMode, setTzMode] = useState<"UTC" | "Local">("UTC");

  // View mode: Cards vs Table (Priority 4, Item 22)
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Master source list initialized from the single canonical model (Priority 1, Item 1 & 2)
  const [sources, setSources] = useState<DiscoverySourceRecord[]>(() => {
    return getCanonicalDiscoverySources(Date.now());
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [healthFilter, setHealthFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"rank" | "name" | "lastRun" | "errors" | "discovered">("rank");

  // Interaction States
  const [activeScanSourceId, setActiveScanSourceId] = useState<string | null>(null);
  const [scanState, setScanState] = useState<"idle" | "queued" | "running">("idle");
  const [confirmScanSource, setConfirmScanSource] = useState<DiscoverySourceRecord | null>(null);
  const [historyDrawerSource, setHistoryDrawerSource] = useState<DiscoverySourceRecord | null>(null);
  const [selectedScopeSource, setSelectedScopeSource] = useState<DiscoverySourceRecord | null>(null);

  // Pause / Disable modal state (Priority 2, Item 10)
  const [pauseModalSource, setPauseModalSource] = useState<DiscoverySourceRecord | null>(null);
  const [pauseActionType, setPauseActionType] = useState<"pause" | "disable">("pause");
  const [pauseReasonSelect, setPauseReasonSelect] = useState("Scheduled Infrastructure Maintenance");
  const [pauseReasonText, setPauseReasonText] = useState("");

  // Add Source Wizard Modal State (Priority 2, Item 11)
  const [isAddWizardOpen, setIsAddWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [wizardData, setWizardData] = useState({
    name: "",
    type: "Cloud Provider" as DiscoverySourceRecord["type"],
    scopeSummary: "",
    scopeItems: "",
    secretRef: "vault://secret/",
    schedule: "Every 2 Hours",
    testPassed: false,
    isTesting: false,
  });

  // Re-evaluate health relative to current time
  const evaluatedSources = useMemo(() => {
    const nowMs = Date.now();
    return sources.map((s) => {
      const computed = computeSourceHealth(
        s.lastRun.result,
        s.lastRun.startedAt,
        s.cadence.intervalMinutes,
        s.state,
        s.pauseReason,
        s.lastRun.errorMessage,
        nowMs
      );
      return {
        ...s,
        health: computed.health,
        healthReason: computed.healthReason,
        badgeVariant: computed.badgeVariant,
        syncAgeMs: computed.syncAgeMs,
        syncAgeText: computed.syncAgeText,
        nextRunText: formatNextRunTime(s.nextRunAt, nowMs),
      };
    });
  }, [sources]);

  // Aggregate Metrics (Priority 1, Item 3, 5, 6)
  const summaryKPIs = useMemo(() => {
    const totalCount = evaluatedSources.length;
    const healthyCount = evaluatedSources.filter((s) => s.health === "Healthy").length;
    const lateCount = evaluatedSources.filter((s) => s.health === "Late").length;
    const failedCount = evaluatedSources.filter((s) => s.health === "Failed").length;
    const pausedCount = evaluatedSources.filter((s) => s.health === "Paused").length;

    // Total ingested = sum of per-source counts (Item 6)
    const totalIngested = evaluatedSources.reduce((acc, s) => acc + s.cisDiscovered, 0);

    // Total unique CIs from active inventory (Item 6: N unique CIs from same selector as dashboard)
    const uniqueCIs = Math.max(1, cis.length);

    // Overlap rate = (ingested - unique) / ingested as %
    const overlapCount = Math.max(0, totalIngested - uniqueCIs);
    const overlapRate = totalIngested > 0 ? Math.round((overlapCount / totalIngested) * 100) : 0;

    // Total attributes refreshed in last 24h (Item 5: explicit unit)
    const totalChanges24h = evaluatedSources.reduce((acc, s) => acc + s.cisUpdated, 0);

    // Total errors in last 24h
    const totalErrors24h = evaluatedSources.reduce((acc, s) => acc + s.lastRun.errors, 0);

    // Expiring secrets (<14 days threshold - Item 15)
    const expiringSecrets = evaluatedSources.filter(
      (s) => s.credential.daysUntilExpiry < 14 || s.credential.authFailures > 0
    );

    // Next scheduled source
    const activeRunningSources = evaluatedSources
      .filter((s) => s.state === "active")
      .sort((a, b) => new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime());
    const nextScheduled = activeRunningSources[0] || null;

    return {
      totalCount,
      healthyCount,
      lateCount,
      failedCount,
      pausedCount,
      totalIngested,
      uniqueCIs,
      overlapRate,
      totalChanges24h,
      totalErrors24h,
      expiringSecrets,
      nextScheduled,
    };
  }, [evaluatedSources, cis.length]);

  // Filtered & Sorted sources
  const filteredSources = useMemo(() => {
    return evaluatedSources
      .filter((s) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = s.name.toLowerCase().includes(q);
          const matchId = s.id.toLowerCase().includes(q);
          const matchScope = s.scope.summary.toLowerCase().includes(q);
          const matchType = s.type.toLowerCase().includes(q);
          if (!matchName && !matchId && !matchScope && !matchType) return false;
        }
        if (healthFilter !== "All" && s.health !== healthFilter) return false;
        if (typeFilter !== "All" && s.type !== typeFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "rank") return a.priorityRank - b.priorityRank;
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "lastRun") {
          return new Date(b.lastRun.startedAt).getTime() - new Date(a.lastRun.startedAt).getTime();
        }
        if (sortBy === "errors") return b.lastRun.errors - a.lastRun.errors;
        if (sortBy === "discovered") return b.cisDiscovered - a.cisDiscovered;
        return 0;
      });
  }, [evaluatedSources, searchQuery, healthFilter, typeFilter, sortBy]);

  // Handler: Confirm and Trigger Discovery Scan (Priority 2, Item 9)
  const handleConfirmScan = () => {
    if (!confirmScanSource) return;
    const source = confirmScanSource;
    setConfirmScanSource(null);
    setActiveScanSourceId(source.id);
    setScanState("queued");

    // Audit log event for trigger (Priority 2, Item 9)
    logAuditEvent({
      who: currentUser?.name || "Discovery Admin",
      role: userRole || "Discovery / Integration Admin",
      task: `DSC-SCAN-${source.id}`,
      ci: { id: source.id, name: source.name },
      oldValue: "idle",
      newValue: "scan_triggered",
      allowed: true,
      reason: `Out-of-band immediate discovery sync triggered for ${source.name}`,
    });
    triggerDiscoveryRun(source.id);

    showToast("info", "Discovery Sync Queued", `Pipeline job queued for ${source.name}...`);

    // Flip to running after 500ms
    setTimeout(() => {
      setScanState("running");
    }, 600);

    // Finish run after 1800ms
    setTimeout(() => {
      const nowIso = new Date().toISOString();
      const newRunItem: RunHistoryItem = {
        jobId: `JOB-${source.id.replace("DSC-", "")}-${Math.floor(1000 + Math.random() * 9000)}`,
        startedAt: nowIso,
        durationSec: Math.floor(45 + Math.random() * 60),
        result: "Success",
        created: Math.floor(2 + Math.random() * 10),
        updated: Math.floor(15 + Math.random() * 30),
        unchanged: source.cisDiscovered - 15,
        retired: 0,
        failed: 0,
        errors: 0,
      };

      setSources((prev) =>
        prev.map((item) => {
          if (item.id === source.id) {
            const nextRunMs = Date.now() + item.cadence.intervalMinutes * 60 * 1000;
            return {
              ...item,
              lastRun: newRunItem,
              runHistory: [newRunItem, ...item.runHistory.slice(0, 9)],
              nextRunAt: new Date(nextRunMs).toISOString(),
              cisDiscovered: item.cisDiscovered + newRunItem.created,
              cisUpdated: item.cisUpdated + newRunItem.updated,
            };
          }
          return item;
        })
      );

      setActiveScanSourceId(null);
      setScanState("idle");
      showToast(
        "success",
        "Discovery Synchronization Completed",
        `Synchronized ${source.name}: +${newRunItem.created} created, ${newRunItem.updated} updated, 0 errors.`
      );
    }, 2200);
  };

  // Handler: Pause / Disable Source (Priority 2, Item 10)
  const handleConfirmPauseAction = () => {
    if (!pauseModalSource) return;
    const source = pauseModalSource;
    const isDisable = pauseActionType === "disable";
    const newState = isDisable ? "disabled" : "paused";
    const fullReason = pauseReasonText.trim()
      ? `${pauseReasonSelect}: ${pauseReasonText.trim()}`
      : pauseReasonSelect;

    setSources((prev) =>
      prev.map((s) => (s.id === source.id ? { ...s, state: newState, pauseReason: fullReason } : s))
    );

    // Log to audit trail (Priority 2, Item 10)
    logAuditEvent({
      who: currentUser?.name || "Discovery Admin",
      role: userRole || "Discovery / Integration Admin",
      task: `DSC-STATE-${source.id}`,
      ci: { id: source.id, name: source.name },
      oldValue: source.state,
      newValue: newState,
      allowed: true,
      reason: `Connector ${newState} by admin. Reason: ${fullReason}`,
    });

    showToast(
      "warning",
      `Connector ${isDisable ? "Disabled" : "Paused"}`,
      `${source.name} is now ${newState}. Excluded from SLA latency alerts.`
    );
    setPauseModalSource(null);
    setPauseReasonText("");
  };

  // Handler: Resume Source
  const handleResumeSource = (source: DiscoverySourceRecord) => {
    setSources((prev) =>
      prev.map((s) => (s.id === source.id ? { ...s, state: "active", pauseReason: undefined } : s))
    );

    logAuditEvent({
      who: currentUser?.name || "Discovery Admin",
      role: userRole || "Discovery / Integration Admin",
      task: `DSC-RESUME-${source.id}`,
      ci: { id: source.id, name: source.name },
      oldValue: source.state,
      newValue: "active",
      allowed: true,
      reason: "Connector resumed from maintenance state",
    });

    showToast("success", "Connector Resumed", `${source.name} has resumed active discovery ingestion.`);
  };

  // Handler: Complete Add Source Wizard (Priority 2, Item 11)
  const handleCompleteAddWizard = () => {
    const newId = `DSC-0${sources.length + 1}`;
    const intervalMins =
      wizardData.schedule.includes("30")
        ? 30
        : wizardData.schedule.includes("6")
        ? 360
        : wizardData.schedule.includes("Daily")
        ? 1440
        : 120;

    const items = wizardData.scopeItems
      ? wizardData.scopeItems.split(",").map((i) => i.trim()).filter(Boolean)
      : ["Default VPC", "Core Subnet"];

    const nowIso = new Date().toISOString();
    const newRecord: DiscoverySourceRecord = {
      id: newId,
      name: wizardData.name.trim(),
      type: wizardData.type,
      role: wizardData.type === "Import" ? "import" : "discovery",
      scope: {
        summary: wizardData.scopeSummary.trim() || "Configured telemetry boundary",
        count: items.length,
        itemType: "Items",
        items,
      },
      cadence: {
        mode: "Scheduled Ingestion",
        intervalMinutes: intervalMins,
        description: `${wizardData.schedule}`,
        rawCadenceText: wizardData.schedule,
      },
      priorityRank: sources.length + 1,
      winsFor: ["cloudTags", "status", "endpointUrl"],
      lastRun: {
        jobId: `JOB-${newId}-INIT`,
        startedAt: nowIso,
        durationSec: 42,
        result: "Success",
        created: 14,
        updated: 8,
        unchanged: 0,
        retired: 0,
        failed: 0,
        errors: 0,
      },
      runHistory: [
        {
          jobId: `JOB-${newId}-INIT`,
          startedAt: nowIso,
          durationSec: 42,
          result: "Success",
          created: 14,
          updated: 8,
          unchanged: 0,
          retired: 0,
          failed: 0,
          errors: 0,
        },
      ],
      nextRunAt: new Date(Date.now() + intervalMins * 60000).toISOString(),
      state: "active",
      credential: {
        secretRef: wizardData.secretRef.trim(),
        lastRotatedAt: nowIso,
        expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(),
        daysUntilExpiry: 90,
        authFailures: 0,
      },
      cisDiscovered: 14,
      cisUpdated: 8,
      overlap: {
        onlyThisSource: 10,
        sharedWithOthers: 4,
      },
      dataQuality: {
        conflictsCount: 0,
        staleCount: 0,
        missingOwnerCount: 0,
      },
      health: "Healthy",
      healthReason: "Newly registered discovery source",
      badgeVariant: "success",
      syncAgeMs: 0,
      syncAgeText: "Just now",
      nextRunText: `Next run in ${formatDurationMinutes(intervalMins)}`,
    };

    setSources((prev) => [newRecord, ...prev]);

    logAuditEvent({
      who: currentUser?.name || "Discovery Admin",
      role: userRole || "Discovery / Integration Admin",
      task: `DSC-ADD-${newId}`,
      ci: { id: newId, name: newRecord.name },
      oldValue: "none",
      newValue: "created",
      allowed: true,
      reason: `New ${newRecord.type} connector registered via Vault pointer reference: ${newRecord.credential.secretRef}`,
    });

    showToast("success", "Discovery Source Registered", `Added connector "${newRecord.name}" successfully.`);
    setIsAddWizardOpen(false);
    setWizardStep(1);
    setWizardData({
      name: "",
      type: "Cloud Provider",
      scopeSummary: "",
      scopeItems: "",
      secretRef: "vault://secret/",
      schedule: "Every 2 Hours",
      testPassed: false,
      isTesting: false,
    });
  };

  return (
    <div className="space-y-6 pb-12 text-text-default animate-fade-in-up">
      {/* ------------------------------------------------------------------- */}
      {/* PAGE HEADER (Priority 3, Item 16: Cleaned wording & no fake network) */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-default">
              Discovery Sources & Connectors
            </h1>
            <Lozenge appearance="bold" variant="info" size="sm">
              {sources.length} Configured Sources
            </Lozenge>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-muted bg-sunken px-2.5 py-0.5 rounded border border-border/60">
              <Lock className="w-3.5 h-3.5 text-text-muted" />
              {activeTenant}
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Authoritative telemetry sync pipelines, cloud integrations, and import connectors feeding the CMDB
          </p>
        </div>

        {/* Primary Action Button (Priority 2, Item 8: Contrast, Border, Tooltip when disabled) */}
        <div className="flex items-center gap-2">
          {canConfigure ? (
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setIsAddWizardOpen(true);
                setWizardStep(1);
              }}
              className="border border-primary font-semibold shadow-xs"
            >
              Add Discovery Source
            </Button>
          ) : (
            <div
              title="Requires permission 'discovery.configure' (held by Discovery / Integration Admin and CMDB Administrator)"
              className="cursor-not-allowed"
            >
              <Button
                size="sm"
                variant="primary"
                disabled
                leftIcon={<Plus className="w-4 h-4 opacity-50" />}
                className="opacity-50 cursor-not-allowed border border-border"
              >
                Add Discovery Source
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* TOP SUMMARY STRIP KPIS (Priority 1, Item 3, 5, 6 & Priority 3, Item 15) */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* KPI 1: Computed Connectors Health (Item 3) */}
        <Card className="p-4 bg-surface border-border flex items-center justify-between shadow-card">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Connectors Health
            </span>
            <div className="flex items-baseline gap-2 pt-0.5">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-text-default">
                {summaryKPIs.healthyCount} of {summaryKPIs.totalCount}
              </span>
              <Lozenge
                appearance="bold"
                variant={summaryKPIs.healthyCount === summaryKPIs.totalCount ? "success" : "warning"}
                size="xs"
              >
                {summaryKPIs.healthyCount === summaryKPIs.totalCount ? "All Healthy" : "Action Needed"}
              </Lozenge>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">
              {summaryKPIs.lateCount} late &bull; {summaryKPIs.failedCount} failed &bull; {summaryKPIs.pausedCount} paused
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center flex-shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
        </Card>

        {/* KPI 2: Total Records Ingested (Item 6: Sum of per-source counts, no fake 'unique') */}
        <Card className="p-4 bg-surface border-border flex items-center justify-between shadow-card">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Records Ingested
              </span>
              <InfoHint
                title="Ingested Records vs Unique CIs"
                concept="Total raw telemetry configuration items ingested across all 6 connector feeds before IRE reconciliation."
                whyItMatters="Multiple discovery feeds observe the same host from different angles (cloud API, host agent, container runtime)."
              />
            </div>
            <div className="flex items-baseline gap-2 pt-0.5">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-text-default">
                {summaryKPIs.totalIngested.toLocaleString()}
              </span>
              <span className="text-xs text-text-muted">records ingested</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-0.5">
              Sum of per-source counts across all 6 connectors
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-info/10 border border-info/20 text-info flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </Card>

        {/* KPI 3: Reconciled Unique CIs & Overlap (Item 6) */}
        <Card className="p-4 bg-surface border-border flex items-center justify-between shadow-card">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Reconciled Estate
            </span>
            <div className="flex items-baseline gap-2 pt-0.5">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-primary">
                {summaryKPIs.uniqueCIs}
              </span>
              <span className="text-xs text-text-muted">unique CIs after IRE</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-0.5 font-medium">
              <strong className="text-text-default">{summaryKPIs.overlapRate}% overlap rate</strong> across sources
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        {/* KPI 4: Changes in last 24h & Credentials Security (Item 5 & Item 15) */}
        <Card className="p-4 bg-surface border-border flex items-center justify-between shadow-card">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Changes in Last 24 Hours
            </span>
            <div className="flex items-baseline gap-2 pt-0.5">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-text-default">
                {summaryKPIs.totalChanges24h.toLocaleString()}
              </span>
              <span className="text-xs text-text-muted">attributes refreshed</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-0.5 flex items-center gap-1.5">
              {summaryKPIs.expiringSecrets.length > 0 ? (
                <span className="text-danger font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {summaryKPIs.expiringSecrets.length} secret expiring &lt;14d
                </span>
              ) : (
                <span className="text-success flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> All Vault secrets valid
                </span>
              )}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-warning/10 border border-warning/20 text-warning flex items-center justify-center flex-shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* SUMMARY STRIP WITH EXCEPTIONS BANNER (Priority 4, Item 23) */}
      {/* ------------------------------------------------------------------- */}
      {(summaryKPIs.lateCount > 0 ||
        summaryKPIs.failedCount > 0 ||
        summaryKPIs.expiringSecrets.length > 0 ||
        summaryKPIs.nextScheduled) && (
        <Card className="p-3.5 sm:p-4 bg-sunken/60 border-border/80 text-xs shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5 flex-wrap">
              <span className="font-bold uppercase tracking-wider text-[11px] text-text-secondary flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-warning" />
                Active Exceptions:
              </span>

              {summaryKPIs.failedCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-danger/10 border border-danger/30 text-danger font-semibold">
                  <XCircle className="w-3.5 h-3.5" />
                  1 Failed: CrowdStrike Falcon Sensor (OAuth lease)
                </span>
              )}

              {summaryKPIs.lateCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-warning/10 border border-warning/30 text-warning font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  1 Late: Azure Resource Graph (overdue by 3h)
                </span>
              )}

              {summaryKPIs.expiringSecrets.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-danger/10 border border-danger/30 text-danger font-semibold">
                  <Key className="w-3.5 h-3.5" />
                  1 Secret Expiring: CrowdStrike Vault secret in 9 days
                </span>
              )}

              {summaryKPIs.totalErrors24h > 0 && (
                <span className="text-text-muted">
                  &bull; Total errors in last 24h: <strong className="text-text-default font-mono">{summaryKPIs.totalErrors24h}</strong>
                </span>
              )}
            </div>

            {summaryKPIs.nextScheduled && (
              <div className="flex items-center gap-1.5 text-text-muted flex-shrink-0 border-t lg:border-t-0 pt-2 lg:pt-0 border-border/40">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Next scheduled run:</span>
                <strong className="text-text-default font-semibold">
                  {summaryKPIs.nextScheduled.name}
                </strong>
                <span className="font-mono text-text-secondary">({summaryKPIs.nextScheduled.nextRunText})</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* FILTER & SORT BAR (Priority 3, Item 14 & Priority 4, Item 22) */}
      {/* ------------------------------------------------------------------- */}
      <Card className="p-3 sm:p-4 bg-surface border-border shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search sources by name, ID, scope, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-sunken rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary text-text-default"
            />
          </div>

          {/* Filters & Toggles */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Health Filter */}
            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="bg-sunken border border-border rounded-md px-2.5 py-1.5 text-xs text-text-default focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="All">All Health States</option>
              <option value="Healthy">Healthy Only</option>
              <option value="Late">Late Only</option>
              <option value="Failed">Failed Only</option>
              <option value="Paused">Paused Only</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-sunken border border-border rounded-md px-2.5 py-1.5 text-xs text-text-default focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="All">All Architecture Types</option>
              <option value="Cloud Provider">Cloud Provider</option>
              <option value="Agent-based">Agent-based</option>
              <option value="Kubernetes Operator">Kubernetes Operator</option>
              <option value="Import">Import Connectors</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-sunken border border-border rounded-md px-2.5 py-1.5 text-xs font-semibold text-text-default focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="rank">Sort: Priority Rank (1 - 6)</option>
              <option value="name">Sort: Source Name (A - Z)</option>
              <option value="lastRun">Sort: Most Recently Synced</option>
              <option value="errors">Sort: Most Errors</option>
              <option value="discovered">Sort: Most CIs Ingested</option>
            </select>

            {/* Timezone Toggle (Priority 3, Item 14) */}
            <button
              type="button"
              onClick={() => setTzMode(tzMode === "UTC" ? "Local" : "UTC")}
              className="px-2.5 py-1.5 rounded-md border border-border bg-sunken hover:bg-surface text-text-default font-mono font-medium flex items-center gap-1.5 transition-colors"
              title="Toggle timestamp display between UTC and browser local time"
            >
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>TZ: {tzMode}</span>
            </button>

            {/* View Mode Toggle: Cards vs Table (Priority 4, Item 22) */}
            <div className="inline-flex rounded-md border border-border bg-sunken p-0.5 select-none ml-auto">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "p-1.5 rounded flex items-center gap-1 font-medium transition-all",
                  viewMode === "cards"
                    ? "bg-surface text-primary shadow-xs font-semibold"
                    : "text-text-muted hover:text-text-default"
                )}
                title="Cards view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "p-1.5 rounded flex items-center gap-1 font-medium transition-all",
                  viewMode === "table"
                    ? "bg-surface text-primary shadow-xs font-semibold"
                    : "text-text-muted hover:text-text-default"
                )}
                title="Compact table view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------------------- */}
      {/* CONNECTORS CONTENT: CARDS VIEW */}
      {/* ------------------------------------------------------------------- */}
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredSources.map((source) => {
            const isScanning = activeScanSourceId === source.id;
            const isPausedOrDisabled = source.state === "paused" || source.state === "disabled";
            const isExpiringSoon =
              source.credential.daysUntilExpiry < 14 || source.credential.authFailures > 0;

            return (
              <Card
                key={source.id}
                className={cn(
                  "bg-surface border-border flex flex-col justify-between shadow-card hover:shadow-raised transition-all duration-200",
                  source.health === "Failed" && "border-danger/60",
                  source.health === "Late" && "border-warning/60",
                  isPausedOrDisabled && "opacity-85 border-border/80"
                )}
              >
                <div className="space-y-3.5">
                  {/* Card Header */}
                  <CardHeader className="pb-3 border-b border-border/50 bg-sunken/20">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-text-muted">{source.id}</span>
                          <Lozenge appearance="subtle" variant="info" size="xs">
                            {source.type}
                          </Lozenge>

                          {/* Role tag: Import (Item 19) */}
                          {source.role === "import" && (
                            <Lozenge appearance="bold" variant="neutral" size="xs">
                              Import (not discovery)
                            </Lozenge>
                          )}

                          {/* Source Priority Rank (Item 17) */}
                          <span className="text-[10px] font-mono font-semibold text-text-muted bg-sunken px-1.5 py-0.5 rounded border border-border/60">
                            Rank {source.priorityRank}
                          </span>
                        </div>

                        {/* Source Name */}
                        <CardTitle className="text-base font-bold text-text-default truncate pt-0.5 flex items-center gap-1.5">
                          {source.name}
                        </CardTitle>

                        {/* Cadence description (Item 13) */}
                        <CardDescription className="text-xs line-clamp-1 text-text-secondary">
                          {source.cadence.description}
                        </CardDescription>
                      </div>

                      {/* Health Badge backed by label + icon (Item 3) */}
                      <div className="flex flex-col items-end flex-shrink-0 space-y-1">
                        <Lozenge appearance="bold" variant={source.badgeVariant} size="sm">
                          {source.health === "Healthy" && <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                          {source.health === "Late" && <Clock className="w-3 h-3 mr-1 inline" />}
                          {source.health === "Failed" && <AlertTriangle className="w-3 h-3 mr-1 inline" />}
                          {source.health === "Paused" && <PauseCircle className="w-3 h-3 mr-1 inline" />}
                          {source.health}
                        </Lozenge>

                        {isScanning && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary animate-pulse">
                            <RotateCw className="w-3 h-3 animate-spin" />
                            {scanState === "queued" ? "Queued..." : "Running Scan..."}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Planned Retirement Note for ServiceNow Bridge (Item 19) */}
                    {source.isPlannedRetirement && (
                      <div className="mt-2 p-1.5 rounded bg-warning/10 border border-warning/30 flex items-center justify-between text-[11px] text-warning font-medium">
                        <span>Planned retirement: {source.plannedRetirementDate}</span>
                        <span className="font-mono text-[10px]">Legacy &rarr; ZenOps</span>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-3.5 text-xs px-4 sm:px-5">
                    {/* Error Banner if Failed */}
                    {source.health === "Failed" && source.lastRun.errorMessage && (
                      <div className="p-2.5 rounded-md bg-danger/10 border border-danger/30 text-danger text-[11px] space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Last Synchronization Failed</span>
                        </div>
                        <p className="font-mono text-[10px] leading-relaxed break-words">
                          {source.lastRun.errorMessage}
                        </p>
                      </div>
                    )}

                    {/* Operational Metrics: Ingested & Refreshed */}
                    <div className="grid grid-cols-2 gap-2.5 p-3 rounded-md bg-sunken border border-border/60 text-xs">
                      <div>
                        <span className="text-text-muted text-[11px] uppercase tracking-wider block font-semibold">
                          Ingested Records
                        </span>
                        <span className="text-base sm:text-lg font-bold font-mono text-text-default">
                          {source.cisDiscovered.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-text-muted block">raw telemetry items</span>
                      </div>
                      <div>
                        <span className="text-text-muted text-[11px] uppercase tracking-wider block font-semibold">
                          Refreshed (24h)
                        </span>
                        <span className="text-base sm:text-lg font-bold font-mono text-text-default">
                          {source.cisUpdated.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-text-muted block">attributes updated</span>
                      </div>
                    </div>

                    {/* Target Scope & Modal Trigger (Priority 3, Item 12) */}
                    <div className="p-2.5 rounded-md bg-surface border border-border/70 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">
                          Target Scope ({source.scope.count} {source.scope.itemType})
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedScopeSource(source)}
                          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
                        >
                          View full scope &rarr;
                        </button>
                      </div>
                      <p className="text-xs text-text-default truncate font-medium">
                        {source.scope.summary}
                      </p>
                    </div>

                    {/* Last Run & Next Run Timestamps (Priority 1, Item 4 & Priority 3, Item 14) */}
                    <div className="space-y-1.5 text-xs text-text-secondary border-t border-border/50 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Last Ingestion:</span>
                        <span className="font-medium text-text-default">
                          {source.syncAgeText} ({formatSourceTimestamp(source.lastRun.startedAt, tzMode)})
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Next Scheduled:</span>
                        <span className="font-mono font-medium text-text-default">
                          {source.nextRunText}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-text-muted">Last Run Delta:</span>
                        <span className="font-mono text-text-secondary">
                          +{source.lastRun.created} created, {source.lastRun.updated} updated, {source.lastRun.errors} errors
                        </span>
                      </div>
                    </div>

                    {/* Source Precedence: Wins For (Priority 4, Item 17) */}
                    <div className="p-2 rounded bg-sunken/60 border border-border/50 text-[11px] space-y-1">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                        Authoritative Precedence (IRE Wins For)
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {source.winsFor.map((attr) => (
                          <span
                            key={attr}
                            className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface border border-border text-text-default"
                          >
                            {attr}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Overlap & Data Quality Contribution (Priority 4, Item 18 & 20) */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-border/40">
                      <div>
                        <span className="text-text-muted block text-[10px]">Overlap Breakdown:</span>
                        <span className="text-text-default font-medium">
                          Only: <strong>{source.overlap.onlyThisSource}</strong> &bull; Shared:{" "}
                          <strong>{source.overlap.sharedWithOthers}</strong>
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px]">DQ Contribution:</span>
                        <Link
                          href="/data-quality"
                          className="text-primary hover:underline font-medium inline-block"
                        >
                          {source.dataQuality.staleCount} stale &bull; {source.dataQuality.conflictsCount} conflict &rarr;
                        </Link>
                      </div>
                    </div>

                    {/* Vault Credential Details (Priority 3, Item 15) */}
                    <div className="p-2 rounded bg-sunken border border-border/70 text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                          Vault Credential
                        </span>
                        {isExpiringSoon ? (
                          <Lozenge appearance="bold" variant="danger" size="xs">
                            Expires in {source.credential.daysUntilExpiry}d
                          </Lozenge>
                        ) : (
                          <span className="text-[10px] text-text-muted">
                            Expires in {source.credential.daysUntilExpiry}d
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-text-muted truncate">
                        {source.credential.secretRef}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-text-secondary pt-0.5">
                        <span>Rotated {formatRelativeSyncTime(Date.now() - new Date(source.credential.lastRotatedAt).getTime())}</span>
                        {source.credential.authFailures > 0 && (
                          <span className="text-danger font-bold">
                            {source.credential.authFailures} auth failures
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Recent 10 Ingestion Runs Strip (Priority 4, Item 21) */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[10px] text-text-muted">
                        <span className="font-bold uppercase tracking-wider">Recent Ingestion Strip</span>
                        <span>Last 10 runs</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-sunken p-1.5 rounded border border-border/60">
                        {source.runHistory.map((run, idx) => (
                          <div
                            key={run.jobId || idx}
                            title={`${run.jobId} (${run.result}): ${run.durationSec}s • +${run.created} created, ${run.updated} updated, ${run.errors} errors`}
                            className={cn(
                              "flex-1 h-3 rounded-xs transition-transform hover:scale-110 cursor-help",
                              run.result === "Success" && "bg-emerald-500",
                              run.result === "Partial" && "bg-amber-500",
                              run.result === "Failed" && "bg-rose-500"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Card Footer Actions (RBAC readiness: Grouped together) */}
                <div className="p-3.5 border-t border-border bg-sunken/20 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {/* Run History Button */}
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => setHistoryDrawerSource(source)}
                      leftIcon={<History className="w-3.5 h-3.5" />}
                      className="border border-border font-medium"
                    >
                      Run History
                    </Button>

                    {/* Pause / Resume Button (Priority 2, Item 10) */}
                    {isPausedOrDisabled ? (
                      <Button
                        variant="subtle"
                        size="xs"
                        onClick={() => handleResumeSource(source)}
                        leftIcon={<PlayCircle className="w-3.5 h-3.5 text-success" />}
                        className="text-[11px] font-semibold"
                      >
                        Resume
                      </Button>
                    ) : (
                      <Button
                        variant="subtle"
                        size="xs"
                        onClick={() => {
                          setPauseModalSource(source);
                          setPauseActionType("pause");
                        }}
                        leftIcon={<Pause className="w-3 h-3 text-text-muted" />}
                        className="text-[11px]"
                      >
                        Pause
                      </Button>
                    )}
                  </div>

                  {/* Trigger Scan Button (Priority 2, Item 8 & 9: Real primary button) */}
                  {canConfigure ? (
                    <Button
                      variant="primary"
                      size="xs"
                      onClick={() => setConfirmScanSource(source)}
                      isLoading={isScanning}
                      leftIcon={<Play className="w-3 h-3" />}
                      className="border border-primary font-semibold shadow-xs"
                    >
                      Trigger Scan
                    </Button>
                  ) : (
                    <div
                      title="Requires permission 'discovery.configure' (Discovery / Integration Admin)"
                      className="cursor-not-allowed"
                    >
                      <Button
                        variant="primary"
                        size="xs"
                        disabled
                        leftIcon={<Play className="w-3 h-3 opacity-50" />}
                        className="opacity-50 cursor-not-allowed border border-border"
                      >
                        Trigger Scan
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ------------------------------------------------------------------- */
        /* COMPACT TABLE VIEW (Priority 4, Item 22) */
        /* ------------------------------------------------------------------- */
        <Card className="bg-surface border-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left divide-y divide-border/60">
              <thead className="bg-sunken text-text-muted uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Source Name & ID</th>
                  <th className="px-3 py-3">Health Status</th>
                  <th className="px-3 py-3">Type & Role</th>
                  <th className="px-3 py-3">Priority Rank</th>
                  <th className="px-3 py-3">Ingested Records</th>
                  <th className="px-3 py-3">Last Run</th>
                  <th className="px-3 py-3">Next Scheduled</th>
                  <th className="px-3 py-3">Errors</th>
                  <th className="px-3 py-3">Vault Credential</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredSources.map((source) => {
                  const isScanning = activeScanSourceId === source.id;
                  const isPausedOrDisabled = source.state === "paused" || source.state === "disabled";

                  return (
                    <tr
                      key={source.id}
                      className={cn(
                        "hover:bg-sunken/60 transition-colors",
                        source.health === "Failed" && "bg-danger/[0.03]",
                        source.health === "Late" && "bg-warning/[0.03]"
                      )}
                    >
                      {/* Name & ID */}
                      <td className="px-4 py-3 font-medium text-text-default">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-text-default truncate max-w-[220px]">
                            {source.name}
                          </p>
                          <span className="font-mono text-[10px] text-text-muted">{source.id}</span>
                        </div>
                      </td>

                      {/* Health Status */}
                      <td className="px-3 py-3">
                        <Lozenge appearance="bold" variant={source.badgeVariant} size="xs">
                          {source.health}
                        </Lozenge>
                      </td>

                      {/* Type & Role */}
                      <td className="px-3 py-3">
                        <div className="space-y-0.5">
                          <span className="font-medium text-text-default">{source.type}</span>
                          {source.role === "import" && (
                            <Lozenge appearance="subtle" variant="neutral" size="xs">
                              Import
                            </Lozenge>
                          )}
                        </div>
                      </td>

                      {/* Priority Rank */}
                      <td className="px-3 py-3 font-mono font-semibold">
                        Rank {source.priorityRank}
                      </td>

                      {/* Ingested Records */}
                      <td className="px-3 py-3 font-mono font-bold">
                        {source.cisDiscovered.toLocaleString()}
                      </td>

                      {/* Last Run */}
                      <td className="px-3 py-3">
                        <div className="space-y-0.5">
                          <span className="text-text-default font-medium">
                            {source.syncAgeText}
                          </span>
                          <span className="text-[10px] text-text-muted block">
                            {source.lastRun.result} ({source.lastRun.durationSec}s)
                          </span>
                        </div>
                      </td>

                      {/* Next Scheduled */}
                      <td className="px-3 py-3 font-mono text-[11px] text-text-secondary">
                        {source.nextRunText}
                      </td>

                      {/* Errors */}
                      <td className="px-3 py-3 font-mono">
                        <span className={source.lastRun.errors > 0 ? "text-danger font-bold" : "text-success"}>
                          {source.lastRun.errors}
                        </span>
                      </td>

                      {/* Vault Credential */}
                      <td className="px-3 py-3 text-[11px]">
                        <span className="font-mono text-text-muted block truncate max-w-[120px]">
                          {source.credential.secretRef}
                        </span>
                        <span className={source.credential.daysUntilExpiry < 14 ? "text-danger font-semibold" : "text-text-muted"}>
                          Expires in {source.credential.daysUntilExpiry}d
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => setHistoryDrawerSource(source)}
                            className="border border-border"
                          >
                            History
                          </Button>
                          {canConfigure && (
                            <Button
                              size="xs"
                              variant="primary"
                              onClick={() => setConfirmScanSource(source)}
                              isLoading={isScanning}
                              leftIcon={<Play className="w-3 h-3" />}
                            >
                              Scan
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* NOT YET COVERED INFRASTRUCTURE PANEL (Priority 3, Item 16) */}
      {/* ------------------------------------------------------------------- */}
      <Card className="bg-surface border-border shadow-card p-4 sm:p-5">
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
            <div>
              <h3 className="text-base font-bold text-text-default flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Infrastructure Telemetry Coverage Gaps
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Key enterprise asset classes not yet connected to automated discovery pipelines
              </p>
            </div>
            <Lozenge appearance="bold" variant="neutral" size="sm">
              {UNCOVERED_DOMAINS.length} Unconnected Domains
            </Lozenge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {UNCOVERED_DOMAINS.map((domain) => (
              <div
                key={domain.id}
                className="p-3 rounded-lg bg-sunken/60 border border-border/80 space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-text-default">{domain.domain}</span>
                    <Lozenge appearance="subtle" variant="danger" size="xs">
                      {domain.status}
                    </Lozenge>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    {domain.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/40 text-[10px] text-text-secondary">
                  <span className="font-semibold block text-text-muted uppercase tracking-wider text-[9px]">
                    Recommended Connectors:
                  </span>
                  <span>{domain.recommendedConnectors.join(" • ")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------------------- */}
      {/* TRIGGER SCAN CONFIRMATION MODAL (Priority 2, Item 9) */}
      {/* ------------------------------------------------------------------- */}
      {confirmScanSource && (
        <Modal
          isOpen={Boolean(confirmScanSource)}
          onClose={() => setConfirmScanSource(null)}
          title="Trigger Immediate Discovery Sync"
          description={`Initiate automated out-of-band scan pipeline for ${confirmScanSource.name}`}
          maxWidth="md"
        >
          <div className="space-y-3.5 pt-2 text-xs">
            <div className="p-3 rounded-lg bg-sunken border border-border space-y-1.5">
              <div className="flex justify-between">
                <span className="text-text-muted">Connector ID:</span>
                <span className="font-mono font-semibold text-text-default">{confirmScanSource.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Target Scope:</span>
                <span className="font-medium text-text-default">{confirmScanSource.scope.summary}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Vault Secret Reference:</span>
                <span className="font-mono text-text-muted">{confirmScanSource.credential.secretRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Precedence Rank:</span>
                <span className="font-mono font-bold text-primary">Rank {confirmScanSource.priorityRank}</span>
              </div>
            </div>

            <p className="text-text-secondary leading-relaxed">
              This action will query authoritative APIs, reconcile new or updated configuration items against the IRE identity matrix, and write an immutable audit log entry.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button size="sm" variant="secondary" onClick={() => setConfirmScanSource(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleConfirmScan} leftIcon={<Play className="w-3.5 h-3.5" />}>
                Confirm & Run Discovery
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* PAUSE / DISABLE SOURCE MODAL (Priority 2, Item 10) */}
      {/* ------------------------------------------------------------------- */}
      {pauseModalSource && (
        <Modal
          isOpen={Boolean(pauseModalSource)}
          onClose={() => setPauseModalSource(null)}
          title={pauseActionType === "disable" ? `Disable ${pauseModalSource.name}` : `Pause ${pauseModalSource.name}`}
          description={`Temporarily suspend discovery ingestion for maintenance or troubleshooting`}
          maxWidth="md"
        >
          <div className="space-y-3.5 pt-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-text-default block">Select Action</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPauseActionType("pause")}
                  className={cn(
                    "flex-1 p-2 rounded-md border text-center font-medium transition-all",
                    pauseActionType === "pause"
                      ? "bg-primary/10 border-primary text-primary font-bold"
                      : "bg-sunken border-border text-text-muted"
                  )}
                >
                  Pause Ingestion
                </button>
                <button
                  type="button"
                  onClick={() => setPauseActionType("disable")}
                  className={cn(
                    "flex-1 p-2 rounded-md border text-center font-medium transition-all",
                    pauseActionType === "disable"
                      ? "bg-danger/10 border-danger text-danger font-bold"
                      : "bg-sunken border-border text-text-muted"
                  )}
                >
                  Disable Connector
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-text-default block">Reason Category *</label>
              <select
                value={pauseReasonSelect}
                onChange={(e) => setPauseReasonSelect(e.target.value)}
                className="w-full bg-sunken border border-border rounded-md px-3 py-1.5 text-xs text-text-default focus:ring-1 focus:ring-primary"
              >
                <option value="Scheduled Infrastructure Maintenance">Scheduled Infrastructure Maintenance</option>
                <option value="API Rate Limiting Mitigation">API Rate Limiting Mitigation</option>
                <option value="Credentials & Secret Lease Rotation">Credentials & Secret Lease Rotation</option>
                <option value="Upstream Cloud Provider Outage">Upstream Cloud Provider Outage</option>
                <option value="Reconciliation Rule Tuning">Reconciliation Rule Tuning</option>
                <option value="Other Operational Reason">Other Operational Reason</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-text-default block">Additional Notes / Ticket Reference</label>
              <input
                type="text"
                placeholder="e.g. CHG-9941 scheduled AWS VPC maintenance window"
                value={pauseReasonText}
                onChange={(e) => setPauseReasonText(e.target.value)}
                className="w-full bg-sunken border border-border rounded-md px-3 py-1.5 text-xs text-text-default focus:ring-1 focus:ring-primary"
              />
            </div>

            <p className="text-[11px] text-text-muted">
              Note: Pausing will exclude this source from SLA Late/Failed alerts until resumed. An audit event will be recorded.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button size="sm" variant="secondary" onClick={() => setPauseModalSource(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant={pauseActionType === "disable" ? "danger" : "primary"}
                onClick={handleConfirmPauseAction}
              >
                Confirm {pauseActionType === "disable" ? "Disable" : "Pause"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TARGET SCOPE BREAKDOWN MODAL (Priority 3, Item 12) */}
      {/* ------------------------------------------------------------------- */}
      {selectedScopeSource && (
        <Modal
          isOpen={Boolean(selectedScopeSource)}
          onClose={() => setSelectedScopeSource(null)}
          title={`Target Scope Breakdown: ${selectedScopeSource.name}`}
          description={`${selectedScopeSource.scope.count} ${selectedScopeSource.scope.itemType} currently included in discovery telemetry bounds.`}
          maxWidth="lg"
        >
          <div className="space-y-3.5 pt-2 text-xs">
            <div className="p-3 rounded-lg bg-sunken border border-border/70 space-y-1">
              <span className="font-semibold text-text-muted text-[10px] uppercase tracking-wider block">
                Scope Summary
              </span>
              <p className="font-semibold text-text-default text-sm">
                {selectedScopeSource.scope.summary}
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="font-semibold text-text-muted text-[10px] uppercase tracking-wider block">
                Target Accounts, Clusters, & Fleet Nodes
              </span>
              <div className="max-h-[280px] overflow-y-auto space-y-1.5 pr-1">
                {selectedScopeSource.scope.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-surface border border-border flex items-center justify-between text-xs"
                  >
                    <span className="font-mono text-text-default">{item}</span>
                    <Lozenge appearance="subtle" variant="success" size="xs">
                      Active Target
                    </Lozenge>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-border">
              <Button size="sm" variant="secondary" onClick={() => setSelectedScopeSource(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* RUN HISTORY DRAWER (Priority 4, Item 21) */}
      {/* ------------------------------------------------------------------- */}
      <Drawer
        isOpen={Boolean(historyDrawerSource)}
        onClose={() => setHistoryDrawerSource(null)}
        title={historyDrawerSource ? `${historyDrawerSource.name} • Execution Log` : "Run History"}
        description="Historical discovery runs, delta counts, and duration"
        width="md"
      >
        {historyDrawerSource && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-sunken border border-border space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-text-muted">Connector ID:</span>
                <span className="font-mono font-semibold text-text-default">{historyDrawerSource.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Ingestion Cadence:</span>
                <span className="font-semibold text-text-default">{historyDrawerSource.cadence.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Vault Secret Reference:</span>
                <span className="font-mono text-text-muted truncate max-w-[200px]">{historyDrawerSource.credential.secretRef}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="font-bold uppercase tracking-wider text-[10px] text-text-muted">
                Last 10 Synchronization Runs
              </h5>

              <div className="rounded-lg border border-border divide-y divide-border/60">
                {historyDrawerSource.runHistory.map((run) => (
                  <div key={run.jobId} className="p-3 space-y-1.5 bg-surface hover:bg-sunken/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-text-default text-xs">{run.jobId}</span>
                      <Lozenge
                        appearance="bold"
                        variant={run.result === "Success" ? "success" : run.result === "Partial" ? "warning" : "danger"}
                        size="xs"
                      >
                        {run.result}
                      </Lozenge>
                    </div>

                    <div className="flex justify-between text-text-secondary text-[11px]">
                      <span>{formatSourceTimestamp(run.startedAt, tzMode)}</span>
                      <span className="font-mono text-text-muted">{run.durationSec}s duration</span>
                    </div>

                    <div className="flex gap-3 text-[11px] font-mono text-text-muted pt-1 border-t border-border/30">
                      <span className="text-emerald-500 font-semibold">+{run.created} created</span>
                      <span className="text-primary font-semibold">+{run.updated} updated</span>
                      <span>{run.unchanged} unchanged</span>
                      <span className={run.errors > 0 ? "text-danger font-bold" : "text-text-muted"}>
                        {run.errors} errors
                      </span>
                    </div>

                    {run.errorMessage && (
                      <p className="font-mono text-[10px] text-danger bg-danger/10 p-1.5 rounded border border-danger/20 mt-1">
                        {run.errorMessage}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* ------------------------------------------------------------------- */}
      {/* 7-STEP ADD SOURCE WIZARD MODAL (Priority 2, Item 11) */}
      {/* ------------------------------------------------------------------- */}
      {isAddWizardOpen && (
        <Modal
          isOpen={isAddWizardOpen}
          onClose={() => setIsAddWizardOpen(false)}
          title="Register Discovery Connector Wizard"
          description={`Step ${wizardStep} of 7: Configure enterprise discovery pipeline`}
          maxWidth="lg"
        >
          <div className="space-y-4 pt-1 text-xs">
            {/* Step Progress Bar */}
            <div className="flex items-center justify-between gap-1 pb-2 border-b border-border">
              {[
                "1. Type",
                "2. Scope",
                "3. Vault",
                "4. Schedule",
                "5. Test",
                "6. Dry-run",
                "7. Confirm",
              ].map((stepName, idx) => {
                const stepNum = idx + 1;
                const isActive = wizardStep === stepNum;
                const isPassed = wizardStep > stepNum;
                return (
                  <div
                    key={stepName}
                    className={cn(
                      "flex-1 text-center py-1 rounded text-[10px] font-semibold transition-all",
                      isActive && "bg-primary text-white font-bold",
                      isPassed && "bg-emerald-500/20 text-emerald-500",
                      !isActive && !isPassed && "bg-sunken text-text-muted"
                    )}
                  >
                    {stepName}
                  </div>
                );
              })}
            </div>

            {/* Step 1: Connector Architecture Type */}
            {wizardStep === 1 && (
              <div className="space-y-3">
                <label className="font-semibold text-text-default block text-xs">
                  Choose Connector Architecture Type *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { type: "Cloud Provider", desc: "AWS, Azure, GCP API ingestion" },
                    { type: "Agent-based", desc: "Dynatrace OneAgent, CrowdStrike Falcon" },
                    { type: "Kubernetes Operator", desc: "In-cluster CRD and pod watch operator" },
                    { type: "API Integration", desc: "Terraform Cloud, Ansible Automation Platform" },
                    { type: "Import", desc: "Scheduled legacy CMDB bridge (ServiceNow, CSV)" },
                  ].map((t) => (
                    <div
                      key={t.type}
                      onClick={() => setWizardData({ ...wizardData, type: t.type as any })}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all",
                        wizardData.type === t.type
                          ? "border-primary bg-primary/10 shadow-xs"
                          : "border-border bg-sunken hover:bg-surface"
                      )}
                    >
                      <span className="font-bold text-xs text-text-default block">{t.type}</span>
                      <span className="text-[11px] text-text-secondary mt-0.5 block">{t.desc}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="font-semibold text-text-default block">Connector Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. AWS Production US-East-1 VPC"
                    value={wizardData.name}
                    onChange={(e) => setWizardData({ ...wizardData, name: e.target.value })}
                    className="w-full bg-sunken border border-border rounded-md px-3 py-1.5 text-xs text-text-default focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Target Scope */}
            {wizardStep === 2 && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-text-default block">Target Scope Summary *</label>
                  <input
                    type="text"
                    placeholder="e.g. 14 AWS Accounts (Production & Disaster Recovery)"
                    value={wizardData.scopeSummary}
                    onChange={(e) => setWizardData({ ...wizardData, scopeSummary: e.target.value })}
                    className="w-full bg-sunken border border-border rounded-md px-3 py-1.5 text-xs text-text-default focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-text-default block">
                    Target Items / Accounts (comma-separated)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="aws-acc-1011-prod, aws-acc-1012-stage, aws-acc-1013-shared"
                    value={wizardData.scopeItems}
                    onChange={(e) => setWizardData({ ...wizardData, scopeItems: e.target.value })}
                    className="w-full bg-sunken border border-border rounded-md px-3 py-1.5 text-xs text-text-default focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Vault Credentials Reference Only (Never Raw Secrets) */}
            {wizardStep === 3 && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-start gap-2 text-xs">
                  <Lock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-text-default block">Secret Reference Pointer Only</span>
                    <span className="text-text-secondary">
                      ZenOps strictly accepts Vault encrypted URIs (`vault://` or `k8s://`). Plaintext tokens or raw credentials are never allowed.
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-text-default block">Vault Secret URI *</label>
                  <input
                    type="text"
                    value={wizardData.secretRef}
                    onChange={(e) => setWizardData({ ...wizardData, secretRef: e.target.value })}
                    className="w-full bg-sunken border border-border rounded-md px-3 py-1.5 text-xs font-mono text-text-default focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Schedule Cadence */}
            {wizardStep === 4 && (
              <div className="space-y-3">
                <label className="font-semibold text-text-default block">Ingestion Schedule Cadence *</label>
                <div className="space-y-2">
                  {[
                    "Every 30 Minutes",
                    "Every 2 Hours",
                    "Every 6 Hours",
                    "Daily at 02:00 UTC",
                    "Streaming events, reconciled hourly",
                  ].map((cad) => (
                    <label
                      key={cad}
                      className={cn(
                        "p-2.5 rounded border flex items-center justify-between cursor-pointer",
                        wizardData.schedule === cad
                          ? "border-primary bg-primary/10"
                          : "border-border bg-sunken"
                      )}
                    >
                      <span className="text-xs font-medium text-text-default">{cad}</span>
                      <input
                        type="radio"
                        name="schedule"
                        checked={wizardData.schedule === cad}
                        onChange={() => setWizardData({ ...wizardData, schedule: cad })}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Connection Test (Simulated) */}
            {wizardStep === 5 && (
              <div className="space-y-3 text-center py-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center mx-auto">
                  <Key className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-text-default">Test Remote Ingestion Endpoint</h4>
                <p className="text-xs text-text-secondary max-w-sm mx-auto">
                  Verify mTLS handshake and Vault lease permission against target endpoint.
                </p>

                {wizardData.isTesting ? (
                  <div className="flex items-center justify-center gap-2 text-primary font-semibold py-2">
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Executing automated handshake check...</span>
                  </div>
                ) : wizardData.testPassed ? (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-semibold max-w-md mx-auto">
                    <CheckCircle2 className="w-5 h-5 mx-auto mb-1" />
                    <span>Connection Verified! Latency: 38ms • OAuth Token Valid</span>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setWizardData({ ...wizardData, isTesting: true });
                      setTimeout(() => {
                        setWizardData({ ...wizardData, isTesting: false, testPassed: true });
                      }, 1000);
                    }}
                  >
                    Run Connection Test
                  </Button>
                )}
              </div>
            )}

            {/* Step 6: Dry-Run Preview (Simulated) */}
            {wizardStep === 6 && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-sunken border border-border space-y-2">
                  <span className="font-bold text-xs text-text-default block">Dry-Run Preview Result</span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded bg-surface border border-border">
                      <span className="font-mono font-bold text-sm text-text-default">142</span>
                      <span className="text-[10px] text-text-muted block">Candidate CIs</span>
                    </div>
                    <div className="p-2 rounded bg-surface border border-border">
                      <span className="font-mono font-bold text-sm text-emerald-500">100%</span>
                      <span className="text-[10px] text-text-muted block">Schema Valid</span>
                    </div>
                    <div className="p-2 rounded bg-surface border border-border">
                      <span className="font-mono font-bold text-sm text-text-default">0</span>
                      <span className="text-[10px] text-text-muted block">Identity Conflicts</span>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-text-secondary">
                  Dry-run parsed candidate compute instances, network interfaces, and tags without persisting to live CMDB inventory.
                </p>
              </div>
            )}

            {/* Step 7: Confirmation & Registration */}
            {wizardStep === 7 && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-sunken border border-border space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Connector Name:</span>
                    <span className="font-bold text-text-default">{wizardData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Type:</span>
                    <span className="font-medium text-text-default">{wizardData.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Scope:</span>
                    <span className="font-medium text-text-default">{wizardData.scopeSummary}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Schedule:</span>
                    <span className="font-medium text-text-default">{wizardData.schedule}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Vault Pointer:</span>
                    <span className="font-mono text-text-muted truncate max-w-[200px]">{wizardData.secretRef}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              {wizardStep > 1 ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setWizardStep((prev) => (prev - 1) as any)}
                >
                  Back
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setIsAddWizardOpen(false)}>
                  Cancel
                </Button>
              )}

              {wizardStep < 7 ? (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={
                    (wizardStep === 1 && !wizardData.name.trim()) ||
                    (wizardStep === 2 && !wizardData.scopeSummary.trim()) ||
                    (wizardStep === 3 && !wizardData.secretRef.trim()) ||
                    (wizardStep === 5 && !wizardData.testPassed)
                  }
                  onClick={() => setWizardStep((prev) => (prev + 1) as any)}
                >
                  Next Step &rarr;
                </Button>
              ) : (
                <Button size="sm" variant="primary" onClick={handleCompleteAddWizard}>
                  Register Connector
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
