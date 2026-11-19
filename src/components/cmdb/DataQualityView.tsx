"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Info,
  Shield,
  CheckCircle2,
  Check,
  X,
  ExternalLink,
  Clock,
  UserCheck,
  Copy,
  GitMerge,
  Layers,
  Sparkles,
  RefreshCw,
  Lock,
  ArrowRight,
  Zap,
  ChevronDown,
  Filter,
  Search,
  SlidersHorizontal,
  FileText,
  CheckSquare,
  Square,
  FileCheck,
  Eye,
  HelpCircle,
  TrendingUp,
  FolderArchive,
  RotateCcw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lozenge } from "@/components/ui/Lozenge";
import { Button } from "@/components/ui/Button";
import { useCMDB } from "@/context/cmdb-context";
import { formatDateTime, cn } from "@/lib/utils";
import { canApproveTask } from "@/lib/rbac-lite/canApproveTask";
import {
  DQ_SEVERITY_LEVELS,
  DQ_CATEGORIES,
  CANONICAL_CATEGORY_LIST,
  DQCategoryTab,
  calculateTaskScoreGain,
  getTaskScoreGainDetail,
  calculateCombinedCIEffect,
  evaluateBulkApply,
  DEFAULT_BULK_CONFIDENCE_THRESHOLD,
  DISMISSAL_REASONS,
  DismissalReasonCategory,
  HEALTH_BANDS,
  getHealthBand,
} from "@/lib/governance/dataQuality";
import { DataQualityTask } from "@/types/cmdb";

export function DataQualityView() {
  const {
    dataQualityTasks,
    approveDQTask,
    rejectDQTask,
    dismissDQTask,
    applyDQTask,
    requestOwnerAcceptance,
    acceptOwnerAssignment,
    applyComplianceWithEvidence,
    bulkApplyEligibleTasks,
    showToast,
    activeTenant,
    userRole,
    cis,
  } = useCMDB();

  // Navigation & Category Tab state (Priority 4, Item 17)
  const [activeTab, setActiveTab] = useState<DQCategoryTab>("all");
  const [viewScope, setViewScope] = useState<"open" | "resolved">("open");
  const [isGroupedByCI, setIsGroupedByCI] = useState<boolean>(false);

  // Search, Sort & Multi-Filter state (Follow-up Item 2: Added Owner & Category filters)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("All");
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedOwner, setSelectedOwner] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"severity" | "age" | "confidence" | "name">("severity");

  // Selection state for multi-action
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [showSkippedNotice, setShowSkippedNotice] = useState(false);

  // Modals & Safety Dialogs state
  const [isSweeping, setIsSweeping] = useState(false);
  const [bulkThreshold, setBulkThreshold] = useState<number>(DEFAULT_BULK_CONFIDENCE_THRESHOLD);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [dismissingTask, setDismissingTask] = useState<DataQualityTask | null>(null);
  const [dismissCategory, setDismissCategory] = useState<DismissalReasonCategory>("False Positive Detection");
  const [dismissReasonText, setDismissReasonText] = useState("");
  const [dismissError, setDismissError] = useState("");

  // Compliance Evidence Modal state (Priority 2, Item 5)
  const [complianceTask, setComplianceTask] = useState<DataQualityTask | null>(null);
  const [evidenceDocUrl, setEvidenceDocUrl] = useState("https://vault.zenops.io/compliance/SOC2_Equinix_DC1_Certification_2026.pdf");
  const [humanApproverName, setHumanApproverName] = useState("Amara Okafor");

  // Alternative fix choice state (e.g. DQ-202 sync vs retire - Priority 2, Item 6)
  const [alternativeChoices, setAlternativeChoices] = useState<Record<string, string>>({
    "DQ-202": "sync",
  });

  // Confidence explanation popover/tooltip state (Priority 4, Item 20)
  const [activeConfidenceInfo, setActiveConfidenceInfo] = useState<string | null>(null);
  const [activeScoreGainInfo, setActiveScoreGainInfo] = useState<string | null>(null);

  // Central isolated RBAC check for bulk action (Follow-up Item 5)
  const globalApprovalCheck = useMemo(() => canApproveTask(userRole), [userRole]);

  // Distinct Owners for Owner Filter dropdown (Follow-up Item 2)
  const distinctOwners = useMemo(() => {
    const set = new Set<string>();
    dataQualityTasks.forEach((t) => {
      if (t.proposedOwner?.name) set.add(t.proposedOwner.name);
      if (t.approver) set.add(t.approver);
      const ci = cis.find((c) => c.id === t.ciId);
      if (ci?.owner && ci.owner !== "Unassigned") set.add(ci.owner);
    });
    return Array.from(set).sort();
  }, [dataQualityTasks, cis]);

  // ---------------------------------------------------------------------------
  // 1. ACTION HANDLERS
  // ---------------------------------------------------------------------------

  // Staleness Sweep trigger (Priority 4, Item 19)
  const handleTriggerStalenessSweep = () => {
    setIsSweeping(true);
    setTimeout(() => {
      setIsSweeping(false);
      showToast(
        "success",
        "Staleness Sweep Completed",
        "Verified 42 active heartbeats across tenant. All healthy telemetry sensors updated."
      );
    }, 1200);
  };

  // Single Apply Fix with Safety Logic (Priority 1, Item 1 & Priority 2)
  const handleApplyTask = (task: DataQualityTask) => {
    // Ownership fixes require acceptance first
    if (
      task.issueType === "Missing Required Ownership" ||
      task.issueType === "Unassigned Support Group"
    ) {
      requestOwnerAcceptance(task.id, "Elena Rostova");
      return;
    }

    // Compliance fixes require linked evidence modal
    if (task.issueType === "Compliance Mismatch") {
      setComplianceTask(task);
      setEvidenceDocUrl(task.evidenceRef || "https://vault.zenops.io/compliance/SOC2_Equinix_DC1_Certification_2026.pdf");
      setHumanApproverName(task.approver || "Amara Okafor");
      return;
    }

    // Check if task has alternative choices (e.g. DQ-202 sync vs retire)
    const choice = alternativeChoices[task.id] || "sync";
    applyDQTask(task.id, "Marcus Vance", choice);
  };

  // Submit Compliance Evidence Fix
  const handleSubmitComplianceFix = () => {
    if (!complianceTask) return;
    if (!evidenceDocUrl.trim() || !humanApproverName.trim()) {
      showToast("error", "Missing Information", "Linked evidence reference and human approver name are required.");
      return;
    }
    applyComplianceWithEvidence(complianceTask.id, evidenceDocUrl.trim(), humanApproverName.trim(), "Amara Okafor");
    setComplianceTask(null);
  };

  // Submit Dismiss with Required Rationale (Priority 2, Item 8)
  const handleConfirmDismiss = () => {
    if (!dismissingTask) return;
    if (!dismissReasonText.trim() || dismissReasonText.trim().length < 5) {
      setDismissError("Please enter a mandatory audit rationale (at least 5 characters).");
      return;
    }

    dismissDQTask(dismissingTask.id, dismissCategory, dismissReasonText.trim(), "Elena Rostova");
    setDismissingTask(null);
    setDismissReasonText("");
    setDismissError("");
  };

  // Execute Bulk Apply from Confirmation Modal (Priority 2, Item 3 & Follow-up Item 3)
  const handleExecuteBulkApply = () => {
    bulkApplyEligibleTasks(bulkThreshold, "Bulk Auto-Remediator");
    setShowBulkConfirmModal(false);
  };

  // Toggle selection for multiple tasks
  const handleToggleSelectTask = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleSelectAllVisible = (tasksToSelect: DataQualityTask[]) => {
    const ids = tasksToSelect.map((t) => t.id);
    const allSelected = ids.every((id) => selectedTaskIds.includes(id));
    if (allSelected) {
      setSelectedTaskIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedTaskIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  // ---------------------------------------------------------------------------
  // 2. FILTERING & SORTING LOGIC (Follow-up Item 2: Added Owner & Category)
  // ---------------------------------------------------------------------------

  const filteredTasks = useMemo(() => {
    return dataQualityTasks.filter((task) => {
      // 1. View Scope: Open vs Resolved (Priority 4, Item 13)
      const isResolved =
        task.status === "Applied" ||
        task.status === "Approved" ||
        task.status === "Dismissed" ||
        task.status === "Rejected";

      if (viewScope === "open") {
        if (task.status === "Applied" || task.status === "Dismissed" || task.status === "Rejected") {
          return false;
        }
      } else {
        if (!isResolved) return false;
      }

      // 2. Category Tab Filter (Priority 4, Item 17)
      if (activeTab !== "all") {
        const spec = DQ_CATEGORIES[activeTab];
        if (spec && !spec.issueTypes.includes(task.issueType)) {
          return false;
        }
      }

      // 3. Category Filter Dropdown (Follow-up Item 2)
      if (selectedCategory !== "All") {
        const matchedCategory = CANONICAL_CATEGORY_LIST.find((c) => c.canonicalName === selectedCategory);
        if (matchedCategory && !matchedCategory.issueTypes.includes(task.issueType)) {
          return false;
        }
      }

      // 4. Owner Filter Dropdown (Follow-up Item 2)
      if (selectedOwner !== "All") {
        const ci = cis.find((c) => c.id === task.ciId);
        const hasOwner =
          task.proposedOwner?.name === selectedOwner ||
          task.approver === selectedOwner ||
          ci?.owner === selectedOwner;
        if (!hasOwner) return false;
      }

      // 5. Status filter
      if (selectedStatus !== "All" && task.status !== selectedStatus) {
        return false;
      }

      // 6. Severity filter
      if (selectedSeverity !== "All" && task.severity !== selectedSeverity) {
        return false;
      }

      // 7. Environment filter (via CI)
      if (selectedEnvironment !== "All") {
        const ci = cis.find((c) => c.id === task.ciId);
        if (ci && ci.environment !== selectedEnvironment) {
          return false;
        }
      }

      // 8. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = task.ciName.toLowerCase().includes(q);
        const matchId = task.ciId.toLowerCase().includes(q) || task.id.toLowerCase().includes(q);
        const matchIssue = task.issueType.toLowerCase().includes(q);
        const matchApprover = task.approver.toLowerCase().includes(q);
        const matchFix = task.proposedFix.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchIssue && !matchApprover && !matchFix) {
          return false;
        }
      }

      return true;
    });
  }, [
    dataQualityTasks,
    viewScope,
    activeTab,
    selectedCategory,
    selectedOwner,
    selectedStatus,
    selectedSeverity,
    selectedEnvironment,
    searchQuery,
    cis,
  ]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    const list = [...filteredTasks];
    list.sort((a, b) => {
      if (sortBy === "severity") {
        const rankA = DQ_SEVERITY_LEVELS[a.severity]?.rank ?? 99;
        const rankB = DQ_SEVERITY_LEVELS[b.severity]?.rank ?? 99;
        if (rankA !== rankB) return rankA - rankB;
        // Secondary sort: age (oldest first)
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "age") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "confidence") {
        return b.confidence - a.confidence;
      }
      if (sortBy === "name") {
        return a.ciName.localeCompare(b.ciName);
      }
      return 0;
    });
    return list;
  }, [filteredTasks, sortBy]);

  // Group tasks by CI (Priority 4, Item 14)
  const groupedTasksByCI = useMemo(() => {
    const map = new Map<string, { ciName: string; ciId: string; ciClass: string; tasks: DataQualityTask[] }>();
    sortedTasks.forEach((t) => {
      const existing = map.get(t.ciId);
      if (existing) {
        existing.tasks.push(t);
      } else {
        map.set(t.ciId, {
          ciId: t.ciId,
          ciName: t.ciName,
          ciClass: t.ciClass,
          tasks: [t],
        });
      }
    });
    return Array.from(map.values());
  }, [sortedTasks]);

  // Selected Tasks Safety Breakdown (Follow-up Item 2)
  const selectedTasksBreakdown = useMemo(() => {
    const selectedTasks = dataQualityTasks.filter((t) => selectedTaskIds.includes(t.id));
    const safeToApply: DataQualityTask[] = [];
    const skipped: { task: DataQualityTask; reason: string }[] = [];

    selectedTasks.forEach((t) => {
      const targetCI = cis.find((c) => c.id === t.ciId);
      const env = (targetCI?.environment || "").toLowerCase();
      const isProduction = env === "production" || env === "prod";

      if (t.status !== "Pending") {
        skipped.push({ task: t, reason: `Status is '${t.status}' (only Pending tasks can be applied)` });
      } else if (t.issueType.includes("Ownership")) {
        skipped.push({ task: t, reason: "Requires explicit proposed owner acceptance ('Awaiting owner acceptance')" });
      } else if (t.issueType === "Compliance Mismatch") {
        skipped.push({ task: t, reason: "Requires linked audit evidence document and human approver sign-off" });
      } else if (t.issueType === "Duplicate Suspect" && isProduction) {
        skipped.push({ task: t, reason: "Production duplicate suspect requires dual-custody approval" });
      } else if (t.alternativeFixes?.some((f) => f.actionType === "retire")) {
        skipped.push({ task: t, reason: "Alternative retirement choice requires explicit operator confirmation" });
      } else {
        safeToApply.push(t);
      }
    });

    return { selectedTasks, safeToApply, skipped };
  }, [selectedTaskIds, dataQualityTasks, cis]);

  // ---------------------------------------------------------------------------
  // 3. HEADER METRICS COMPUTATION (Priority 3, Items 10 & 11)
  // ---------------------------------------------------------------------------

  // Open pending tasks
  const pendingTasksList = dataQualityTasks.filter((t) => t.status === "Pending");
  const pendingCount = pendingTasksList.length;

  // Critical open tasks
  const criticalTasks = pendingTasksList.filter((t) => t.severity === "Critical");
  const criticalCount = criticalTasks.length;

  // Approved, not yet applied count (Priority 3, Item 10)
  const approvedNotAppliedCount = dataQualityTasks.filter(
    (t) => t.status === "Approved" || t.status === "Awaiting owner acceptance"
  ).length;

  // Score points recovered from applied tasks (Priority 3, Item 10)
  const appliedTasksList = dataQualityTasks.filter((t) => t.status === "Applied");
  const scorePointsRecovered = appliedTasksList.reduce(
    (sum, t) => sum + (t.scoreGain || calculateTaskScoreGain(t)),
    0
  );

  // Average confidence across pending tasks ONLY (Follow-up Item 8c)
  const avgFixConfidence =
    pendingTasksList.length > 0
      ? (
          pendingTasksList.reduce((sum, t) => sum + t.confidence, 0) / pendingTasksList.length
        ).toFixed(1)
      : "91.8";

  // Additional governance metrics (Priority 4, Item 21)
  const oldestPendingTask = useMemo(() => {
    if (pendingTasksList.length === 0) return null;
    const sorted = [...pendingTasksList].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const oldest = sorted[0];
    const diffDays = Math.max(1, Math.round((Date.now() - new Date(oldest.createdAt).getTime()) / 86400000));
    return { task: oldest, daysAgo: diffDays };
  }, [pendingTasksList]);

  const dismissedTasksCount = dataQualityTasks.filter((t) => t.status === "Dismissed").length;
  const autoResolvedSharePct =
    dataQualityTasks.length > 0
      ? Math.round((appliedTasksList.length / Math.max(1, appliedTasksList.length + dismissedTasksCount)) * 100)
      : 80;

  // Bulk Apply Safety Evaluation (Follow-up Item 3)
  const bulkEvaluation = useMemo(() => {
    return evaluateBulkApply(dataQualityTasks, bulkThreshold, cis);
  }, [dataQualityTasks, bulkThreshold, cis]);

  // Helper for task age string
  const formatAge = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diffMs / (24 * 3600 * 1000));
    if (days <= 0) return "Today";
    if (days === 1) return "1d ago";
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6 pb-16 text-text-default">
      {/* ----------------------------------------------------------------------- */}
      {/* HEADER & MAIN ACTIONS BAR */}
      {/* ----------------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-default">
              Data Quality & Governance Tasks
            </h1>
            <Lozenge appearance="subtle" variant="warning">
              {pendingCount} Pending Anomalies
            </Lozenge>
            <span className="inline-flex items-center gap-1 text-xs text-text-muted bg-sunken px-2.5 py-0.5 rounded border border-border">
              <Lock className="w-3 h-3 text-text-muted" />
              {activeTenant}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Automated anomaly remediation queues, ownership assignments, and reconciliation conflict resolution
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Staleness Sweep Button with Last Run & Next Run (Priority 4, Item 19) */}
          <div className="flex flex-col sm:items-end">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Clock className={cn("w-3.5 h-3.5", isSweeping && "animate-spin text-primary")} />}
              onClick={handleTriggerStalenessSweep}
              isLoading={isSweeping}
              className="border-border hover:border-primary/40 text-xs font-semibold"
            >
              Run staleness sweep now
            </Button>
            <span className="text-[10px] text-text-muted mt-0.5">
              Last run: Today 02:00 UTC &bull; Next: Tomorrow 02:00 UTC
            </span>
          </div>

          {/* Bulk Apply Button with Isolated RBAC Check (Follow-up Item 5) */}
          <div className="relative group inline-block">
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-white" />}
              onClick={() => setShowBulkConfirmModal(true)}
              disabled={!globalApprovalCheck.canApprove || !bulkEvaluation.canBulkApply}
              className={cn(
                "font-semibold text-xs border border-primary/60 shadow-sm",
                (!globalApprovalCheck.canApprove || !bulkEvaluation.canBulkApply) &&
                  "opacity-50 cursor-not-allowed"
              )}
            >
              Apply All &ge;{bulkThreshold}% Confident ({bulkEvaluation.eligibleTasks.length})
            </Button>

            {!globalApprovalCheck.canApprove && (
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-900 text-neutral-100 text-[11px] font-medium rounded shadow-lg pointer-events-none max-w-xs text-center z-50">
                <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{globalApprovalCheck.tooltipText}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* KPI TILES (Priority 3, Items 10 & 11) */}
      {/* ----------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Tile 1: Pending Tasks */}
        <div className="p-4 bg-surface rounded-lg border border-border shadow-card flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Pending Tasks
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-text-default">{pendingCount}</span>
            <span className="text-xs text-amber-600 font-semibold">Action Required</span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">
            Open anomalies awaiting steward or engineer approval
          </p>
        </div>

        {/* Tile 2: Critical Severities with breakdown label */}
        <div className="p-4 bg-surface rounded-lg border border-border shadow-card flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Critical Severities
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-danger">{criticalCount}</span>
            <span className="text-xs text-danger font-semibold">
              {criticalCount === 1 ? "1 critical: missing owner" : `${criticalCount} critical anomalies`}
            </span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">
            Blocks production governance and penalizes Trust Score
          </p>
        </div>

        {/* Tile 3: Approved, Not Yet Applied */}
        <div className="p-4 bg-surface rounded-lg border border-border shadow-card flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Approved, Not Yet Applied
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-primary">{approvedNotAppliedCount}</span>
            <span className="text-xs text-primary font-semibold">Staged for Execution</span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">
            Awaiting owner acceptance or batch sync execution
          </p>
        </div>

        {/* Tile 4: Score Points Recovered */}
        <div className="p-4 bg-surface rounded-lg border border-border shadow-card flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Score Points Recovered
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-success">+{scorePointsRecovered} pts</span>
            <span className="text-xs text-success font-semibold">
              {appliedTasksList.length} remediations applied
            </span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">
            Avg Fix Confidence (Pending): <strong className="text-text-default">{avgFixConfidence}%</strong>
          </p>
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* SECONDARY GOVERNANCE METRICS STRIP (Priority 4, Item 21) */}
      {/* ----------------------------------------------------------------------- */}
      <div className="p-3 bg-sunken/60 rounded-lg border border-border flex flex-wrap items-center justify-between gap-3 text-xs text-text-secondary">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-text-muted" />
          <span>Oldest open anomaly:</span>
          <strong className="text-text-default">
            {oldestPendingTask ? `${oldestPendingTask.daysAgo}d ago (${oldestPendingTask.task.ciName})` : "None"}
          </strong>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-success" />
          <span>Average time to resolve:</span>
          <strong className="text-text-default">1.4 days</strong>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
          <span>Share auto-resolved:</span>
          <strong className="text-text-default">{autoResolvedSharePct}%</strong>
        </div>
        <div className="flex items-center gap-1.5">
          <FileCheck className="w-3.5 h-3.5 text-amber-500" />
          <span>Dismissed with audited reasons:</span>
          <strong className="text-text-default">{dismissedTasksCount}</strong>
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* SCOPE TOGGLE & CATEGORY TABS (Canonical: Missing Owner, Stale Discovery, etc.) */}
      {/* ----------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-2">
        {/* Category Tabs: Exactly 5 canonical categories + All */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
          {[
            { id: "all" as const, label: "All Tasks", count: dataQualityTasks.length },
            ...CANONICAL_CATEGORY_LIST.map((c) => ({
              id: c.id,
              label: c.canonicalName,
              count: dataQualityTasks.filter((t) => c.issueTypes.includes(t.issueType)).length,
            })),
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 border",
                  isActive
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-surface hover:bg-sunken text-text-secondary border-border"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                    isActive ? "bg-white/20 text-white" : "bg-sunken text-text-muted"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* View Scope Toggle: Active vs Resolved (Priority 4, Item 13) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="inline-flex rounded-md border border-border p-0.5 bg-sunken text-xs">
            <button
              onClick={() => setViewScope("open")}
              className={cn(
                "px-2.5 py-1 rounded font-medium transition-all",
                viewScope === "open"
                  ? "bg-surface text-text-default shadow-xs font-semibold"
                  : "text-text-muted hover:text-text-default"
              )}
            >
              Open Tasks ({dataQualityTasks.filter((t) => t.status !== "Applied" && t.status !== "Dismissed" && t.status !== "Rejected").length})
            </button>
            <button
              onClick={() => setViewScope("resolved")}
              className={cn(
                "px-2.5 py-1 rounded font-medium transition-all",
                viewScope === "resolved"
                  ? "bg-surface text-text-default shadow-xs font-semibold"
                  : "text-text-muted hover:text-text-default"
              )}
            >
              Resolved ({dataQualityTasks.filter((t) => t.status === "Applied" || t.status === "Approved" || t.status === "Dismissed" || t.status === "Rejected").length})
            </button>
          </div>

          {/* Group by CI Toggle (Priority 4, Item 14) */}
          <Button
            size="xs"
            variant={isGroupedByCI ? "primary" : "outline"}
            leftIcon={<Layers className="w-3 h-3" />}
            onClick={() => setIsGroupedByCI(!isGroupedByCI)}
            className="text-xs h-7"
            title="Group multiple tasks by Configuration Item"
          >
            {isGroupedByCI ? "Grouped by CI" : "Group by CI"}
          </Button>
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* SEARCH, SORT, AND MULTI-FILTERS BAR (Follow-up Item 2: Added Owner & Category) */}
      {/* ----------------------------------------------------------------------- */}
      <div className="p-3 bg-surface rounded-lg border border-border flex flex-col gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search CI name, ID, issue, approver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-sunken rounded border border-border text-xs text-text-default focus:outline-none focus:border-primary placeholder:text-text-muted"
            />
          </div>

          {/* Category Filter Dropdown (Follow-up Item 2) */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2 py-1.5 bg-sunken rounded border border-border text-xs text-text-default focus:outline-none focus:border-primary"
          >
            <option value="All">All Categories</option>
            {CANONICAL_CATEGORY_LIST.map((c) => (
              <option key={c.id} value={c.canonicalName}>
                {c.canonicalName}
              </option>
            ))}
          </select>

          {/* Owner Filter Dropdown (Follow-up Item 2) */}
          <select
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
            className="px-2 py-1.5 bg-sunken rounded border border-border text-xs text-text-default focus:outline-none focus:border-primary"
          >
            <option value="All">All Owners</option>
            {distinctOwners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-2 py-1.5 bg-sunken rounded border border-border text-xs text-text-default focus:outline-none focus:border-primary"
          >
            <option value="All">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Environment Filter */}
          <select
            value={selectedEnvironment}
            onChange={(e) => setSelectedEnvironment(e.target.value)}
            className="px-2 py-1.5 bg-sunken rounded border border-border text-xs text-text-default focus:outline-none focus:border-primary"
          >
            <option value="All">All Environments</option>
            <option value="Production">Production</option>
            <option value="Staging">Staging</option>
            <option value="Development">Development</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2 py-1.5 bg-sunken rounded border border-border text-xs text-text-default focus:outline-none focus:border-primary"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Awaiting owner acceptance">Awaiting acceptance</option>
            <option value="Approved">Approved</option>
            <option value="Applied">Applied</option>
            <option value="Dismissed">Dismissed</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2 py-1.5 bg-sunken rounded border border-border text-xs text-text-default focus:outline-none focus:border-primary"
          >
            <option value="severity">Sort: Severity (Critical first)</option>
            <option value="age">Sort: Oldest first</option>
            <option value="confidence">Sort: Confidence (Highest first)</option>
            <option value="name">Sort: CI Name</option>
          </select>

          {/* Select All Button */}
          <Button
            size="xs"
            variant="outline"
            onClick={() => handleSelectAllVisible(sortedTasks)}
            leftIcon={
              sortedTasks.length > 0 && sortedTasks.every((t) => selectedTaskIds.includes(t.id)) ? (
                <CheckSquare className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Square className="w-3.5 h-3.5 text-text-muted" />
              )
            }
          >
            Select All ({sortedTasks.length})
          </Button>
        </div>

        {/* Selected Tasks Banner & Safety Actions (Follow-up Item 2) */}
        {selectedTaskIds.length > 0 && (
          <div className="p-2.5 bg-sunken/80 rounded border border-border flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-100">
            <div className="flex items-center gap-2 flex-wrap">
              <Lozenge appearance="bold" variant="info">
                {selectedTaskIds.length} Tasks Selected
              </Lozenge>
              <span className="text-xs text-text-secondary">
                {selectedTasksBreakdown.safeToApply.length} safe for bulk apply &bull;{" "}
                <strong className="text-amber-600">{selectedTasksBreakdown.skipped.length} excluded</strong>
              </span>
              {selectedTasksBreakdown.skipped.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSkippedNotice(!showSkippedNotice)}
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  {showSkippedNotice ? "Hide reasons" : "View skipped reasons"}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="xs"
                variant="primary"
                leftIcon={<Sparkles className="w-3 h-3" />}
                disabled={!globalApprovalCheck.canApprove || selectedTasksBreakdown.safeToApply.length === 0}
                onClick={() => {
                  selectedTasksBreakdown.safeToApply.forEach((t) => applyDQTask(t.id, "Bulk Operator"));
                  setSelectedTaskIds([]);
                  showToast(
                    "success",
                    "Bulk Actions Executed",
                    `Applied ${selectedTasksBreakdown.safeToApply.length} selected safe tasks.`
                  );
                }}
              >
                Apply Selected Safe Tasks ({selectedTasksBreakdown.safeToApply.length})
              </Button>
              <Button size="xs" variant="outline" onClick={() => setSelectedTaskIds([])}>
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Skipped Tasks Explanations Accordion (Follow-up Item 2) */}
        {showSkippedNotice && selectedTasksBreakdown.skipped.length > 0 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-xs space-y-1.5 animate-in fade-in duration-150">
            <p className="font-bold text-amber-700 dark:text-amber-400">
              Selected Tasks Excluded from Bulk Apply ({selectedTasksBreakdown.skipped.length}):
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              {selectedTasksBreakdown.skipped.map(({ task, reason }) => (
                <div key={task.id} className="flex items-start justify-between gap-2 border-b border-amber-500/20 pb-1 last:border-0">
                  <span className="font-semibold text-text-default">
                    {task.id}: {task.ciName} ({task.issueType})
                  </span>
                  <span className="text-amber-700 dark:text-amber-400 font-medium text-right">{reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* TASK LIST (OR GROUPED BY CI VIEW) */}
      {/* ----------------------------------------------------------------------- */}
      {isGroupedByCI ? (
        /* ================= GROUPED BY CI VIEW (Priority 4, Item 14) ================= */
        <div className="space-y-4">
          {groupedTasksByCI.map((group) => {
            const ci = cis.find((c) => c.id === group.ciId);
            const combinedEffect = calculateCombinedCIEffect(group.tasks, ci?.trustScore || 45);

            return (
              <Card key={group.ciId} className="bg-surface border-border shadow-card overflow-hidden">
                {/* CI Group Header */}
                <div className="p-3.5 bg-sunken/60 border-b border-border flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
                      {group.ciId}
                    </span>
                    <Link
                      href={`/cis/${group.ciId}`}
                      className="text-sm font-bold text-text-default hover:text-primary transition-colors flex items-center gap-1"
                    >
                      {group.ciName} <ExternalLink className="w-3 h-3 text-text-muted" />
                    </Link>
                    <Lozenge appearance="subtle" variant="neutral" size="xs">
                      {group.ciClass}
                    </Lozenge>
                    <span className="text-xs text-text-muted">
                      ({group.tasks.length} {group.tasks.length === 1 ? "anomaly" : "anomalies"} affecting this CI)
                    </span>
                  </div>

                  {/* Combined Score Gain Effect with 5-Pillar Breakdown Tooltip (Follow-up Item 7) */}
                  {group.tasks.length > 1 && (
                    <div className="relative group">
                      <div className="flex items-center gap-2 text-xs bg-success/10 border border-success/30 px-2.5 py-1 rounded font-mono cursor-pointer">
                        <Zap className="w-3.5 h-3.5 text-success" />
                        <span className="text-text-secondary">Combined Effect:</span>
                        <strong className="text-success">
                          {ci?.trustScore || 45}% &rarr; {combinedEffect.newScore}% (+{combinedEffect.totalGain} pts Trust)
                        </strong>
                        <Info className="w-3 h-3 text-text-muted ml-0.5" />
                      </div>

                      {/* 5-Pillar Breakdown Tooltip (Follow-up Item 7) */}
                      <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block z-50 p-3 bg-neutral-900 text-neutral-100 text-[11px] rounded shadow-2xl w-72 border border-neutral-700 animate-in fade-in duration-100">
                        <div className="flex items-center justify-between border-b border-neutral-700 pb-1.5 mb-2">
                          <span className="font-bold text-primary-200">5-Pillar Score Breakdown</span>
                          <span className="font-mono text-emerald-400 font-bold">+{combinedEffect.totalGain} pts Total</span>
                        </div>
                        <div className="space-y-1">
                          {combinedEffect.pillarBreakdown.map((p) => (
                            <div key={p.pillar} className="flex items-center justify-between py-0.5">
                              <span className="text-neutral-300">
                                {p.pillar} <span className="text-neutral-500">({p.weight}%)</span>:
                              </span>
                              <span className="font-mono font-bold text-neutral-100">
                                {p.beforePts} &rarr; {p.afterPts} ({p.gain > 0 ? `+${p.gain}` : "0"} pts)
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-neutral-800 text-[10px] text-neutral-400">
                          Sum of pillar gains = +{combinedEffect.totalGain} pts. Fully compliant with max pillar weights.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* List of Tasks for this CI */}
                <div className="p-4 space-y-3 divide-y divide-border/60">
                  {group.tasks.map((task) => (
                    <div key={task.id} className="pt-3 first:pt-0">
                      <TaskCardItem
                        task={task}
                        isSelected={selectedTaskIds.includes(task.id)}
                        onToggleSelect={() => handleToggleSelectTask(task.id)}
                        onApply={() => handleApplyTask(task)}
                        onDismiss={() => {
                          setDismissingTask(task);
                          setDismissCategory("False Positive Detection");
                          setDismissReasonText("");
                          setDismissError("");
                        }}
                        onAcceptOwnership={() => acceptOwnerAssignment(task.id, "David Chen")}
                        alternativeChoice={alternativeChoices[task.id] || "sync"}
                        onSelectAlternativeChoice={(choice) =>
                          setAlternativeChoices((prev) => ({ ...prev, [task.id]: choice }))
                        }
                        formatAge={formatAge}
                        userRole={userRole}
                        activeConfidenceInfo={activeConfidenceInfo}
                        setActiveConfidenceInfo={setActiveConfidenceInfo}
                        activeScoreGainInfo={activeScoreGainInfo}
                        setActiveScoreGainInfo={setActiveScoreGainInfo}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ================= FLAT TASK LIST VIEW ================= */
        <div className="space-y-3.5">
          {sortedTasks.map((task) => (
            <Card
              key={task.id}
              className={cn(
                "bg-surface border-border transition-all shadow-card hover:shadow-card-hover",
                task.status === "Pending" &&
                  task.severity === "Critical" &&
                  "border-red-500/50 ring-1 ring-red-500/20"
              )}
            >
              <div className="p-4 sm:p-5">
                <TaskCardItem
                  task={task}
                  isSelected={selectedTaskIds.includes(task.id)}
                  onToggleSelect={() => handleToggleSelectTask(task.id)}
                  onApply={() => handleApplyTask(task)}
                  onDismiss={() => {
                    setDismissingTask(task);
                    setDismissCategory("False Positive Detection");
                    setDismissReasonText("");
                    setDismissError("");
                  }}
                  onAcceptOwnership={() => acceptOwnerAssignment(task.id, "David Chen")}
                  alternativeChoice={alternativeChoices[task.id] || "sync"}
                  onSelectAlternativeChoice={(choice) =>
                    setAlternativeChoices((prev) => ({ ...prev, [task.id]: choice }))
                  }
                  formatAge={formatAge}
                  userRole={userRole}
                  activeConfidenceInfo={activeConfidenceInfo}
                  setActiveConfidenceInfo={setActiveConfidenceInfo}
                  activeScoreGainInfo={activeScoreGainInfo}
                  setActiveScoreGainInfo={setActiveScoreGainInfo}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {sortedTasks.length === 0 && (
        <Card className="bg-surface border-border p-12 text-center text-xs text-text-secondary">
          <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-3" />
          <p className="text-sm font-semibold text-text-default">
            No governance tasks matching current filters.
          </p>
          <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
            All configuration items in this scope satisfy active telemetry, ownership assignment, and reconciliation rules.
          </p>
          <Button
            size="xs"
            variant="outline"
            className="mt-4"
            onClick={() => {
              setActiveTab("all");
              setSelectedSeverity("All");
              setSelectedEnvironment("All");
              setSelectedStatus("All");
              setSelectedCategory("All");
              setSelectedOwner("All");
              setSearchQuery("");
            }}
          >
            Reset Filters
          </Button>
        </Card>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* BULK APPLY CONFIRMATION DIALOG (Follow-up Item 3) */}
      {/* ----------------------------------------------------------------------- */}
      {showBulkConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg max-w-xl w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base text-text-default">
                  Confirm Bulk Remediation Execution
                </h3>
              </div>
              <button
                onClick={() => setShowBulkConfirmModal(false)}
                className="text-text-muted hover:text-text-default"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Configurable Threshold Select */}
            <div className="p-3 bg-sunken rounded border border-border flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-text-default">Confidence Threshold:</span>
                <p className="text-text-muted text-[11px]">
                  Only low-risk tasks meeting or exceeding this confidence are applied.
                </p>
              </div>
              <select
                value={bulkThreshold}
                onChange={(e) => setBulkThreshold(Number(e.target.value))}
                className="px-2.5 py-1 bg-surface rounded border border-border font-mono font-bold text-primary focus:outline-none"
              >
                <option value={80}>&ge; 80%</option>
                <option value={85}>&ge; 85% (Default)</option>
                <option value={90}>&ge; 90%</option>
                <option value={95}>&ge; 95%</option>
              </select>
            </div>

            {/* List of Tasks to be Applied */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-success flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Eligible for Bulk Remediation ({bulkEvaluation.eligibleTasks.length})
                </span>
                <span className="text-[11px] text-text-muted">Low-risk categories</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 border border-border/60 rounded p-2 bg-sunken/40">
                {bulkEvaluation.eligibleTasks.length > 0 ? (
                  bulkEvaluation.eligibleTasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-xs py-0.5">
                      <span className="font-semibold text-text-default truncate max-w-[340px]">
                        {t.id}: {t.ciName} ({t.issueType})
                      </span>
                      <span className="font-mono text-primary font-bold text-[11px]">{t.confidence}%</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-text-muted text-center py-2">
                    No pending tasks meet the &ge;{bulkThreshold}% threshold in eligible categories.
                  </p>
                )}
              </div>
            </div>

            {/* List of EXCLUDED Tasks and Safety Reasons (Follow-up Item 3) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-600 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Safety Exclusions ({bulkEvaluation.excludedTasks.length})
                </span>
                <span className="text-[11px] text-text-muted">Requires manual review</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 border border-border/60 rounded p-2 bg-sunken/40 text-xs">
                {bulkEvaluation.excludedTasks.map(({ task, reason }) => (
                  <div key={task.id} className="border-b border-border/40 pb-1 last:border-0">
                    <div className="font-semibold text-text-default">
                      {task.id}: {task.ciName} &bull; {task.issueType}
                    </div>
                    <p className="text-[11px] text-amber-600 mt-0.5">{reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button size="sm" variant="outline" onClick={() => setShowBulkConfirmModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={!bulkEvaluation.canBulkApply || !globalApprovalCheck.canApprove}
                onClick={handleExecuteBulkApply}
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Apply {bulkEvaluation.eligibleTasks.length} Safe Remediations
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* DISMISS WITH MANDATORY REASON MODAL (Priority 2, Item 8) */}
      {/* ----------------------------------------------------------------------- */}
      {dismissingTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-text-default">
                  Dismiss Governance Task ({dismissingTask.id})
                </h3>
              </div>
              <button
                onClick={() => setDismissingTask(null)}
                className="text-text-muted hover:text-text-default"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-text-secondary space-y-1">
              <p>
                Target CI: <strong className="text-text-default">{dismissingTask.ciName} ({dismissingTask.ciId})</strong>
              </p>
              <p>
                Defect: <strong className="text-text-default">{dismissingTask.issueType}</strong>
              </p>
              <p className="text-text-muted text-[11px] pt-1">
                Dismissing a task records an immutable audit entry with your user identity and justification reason.
              </p>
            </div>

            {/* Reason Category Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-default">
                Select Dismissal Reason Category:
              </label>
              <select
                value={dismissCategory}
                onChange={(e) => setDismissCategory(e.target.value as DismissalReasonCategory)}
                className="w-full px-3 py-2 bg-sunken rounded border border-border text-xs text-text-default focus:outline-none focus:border-primary"
              >
                {DISMISSAL_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            {/* Free-text Justification (Required) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-default">
                Mandatory Audit Justification (Minimum 5 characters):
              </label>
              <textarea
                rows={3}
                placeholder="Explain why this anomaly is being dismissed or exempted from governance SLA..."
                value={dismissReasonText}
                onChange={(e) => {
                  setDismissReasonText(e.target.value);
                  if (dismissError) setDismissError("");
                }}
                className="w-full px-3 py-2 bg-sunken rounded border border-border text-xs text-text-default focus:outline-none focus:border-primary placeholder:text-text-muted"
              />
              {dismissError && <p className="text-xs text-danger font-medium">{dismissError}</p>}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button size="sm" variant="outline" onClick={() => setDismissingTask(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleConfirmDismiss}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Confirm Dismissal & Log Audit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* COMPLIANCE EVIDENCE & APPROVER MODAL (Priority 2, Item 5) */}
      {/* ----------------------------------------------------------------------- */}
      {complianceTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base text-text-default">
                  Regulatory Compliance Attestation ({complianceTask.id})
                </h3>
              </div>
              <button
                onClick={() => setComplianceTask(null)}
                className="text-text-muted hover:text-text-default"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-text-secondary space-y-1">
              <p>
                Configuration Item: <strong className="text-text-default">{complianceTask.ciName}</strong>
              </p>
              <p>
                Compliance Standard: <strong className="text-text-default">NIST-800-53 (Security & Privacy Controls)</strong>
              </p>
              <p className="text-[11px] text-text-muted">
                Per Policy DQ-05, compliance flags cannot be auto-applied. A linked evidence artifact and named human approver must be certified.
              </p>
            </div>

            {/* Evidence Document Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-default">
                Linked Evidence Document / URL Reference:
              </label>
              <input
                type="text"
                value={evidenceDocUrl}
                onChange={(e) => setEvidenceDocUrl(e.target.value)}
                placeholder="e.g. https://vault.zenops.io/compliance/SOC2_Cert_2026.pdf"
                className="w-full px-3 py-2 bg-sunken rounded border border-border text-xs text-text-default focus:outline-none focus:border-primary font-mono"
              />
            </div>

            {/* Named Human Approver Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-default">
                Designated Sign-off Human Approver:
              </label>
              <input
                type="text"
                value={humanApproverName}
                onChange={(e) => setHumanApproverName(e.target.value)}
                placeholder="e.g. Amara Okafor (Compliance Officer)"
                className="w-full px-3 py-2 bg-sunken rounded border border-border text-xs text-text-default focus:outline-none focus:border-primary"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button size="sm" variant="outline" onClick={() => setComplianceTask(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSubmitComplianceFix}
                leftIcon={<FileCheck className="w-3.5 h-3.5" />}
              >
                Attest & Apply Compliance Flag
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: REUSABLE TASK CARD ITEM
// Isolated RBAC helper call (no Can/PERMISSIONS on screen).
// Tooltip with 5-pillar Trust Score breakdown (Follow-up Item 7).
// ============================================================================
interface TaskCardItemProps {
  task: DataQualityTask;
  isSelected: boolean;
  onToggleSelect: () => void;
  onApply: () => void;
  onDismiss: () => void;
  onAcceptOwnership: () => void;
  alternativeChoice: string;
  onSelectAlternativeChoice: (choice: string) => void;
  formatAge: (date: string) => string;
  userRole: string;
  activeConfidenceInfo: string | null;
  setActiveConfidenceInfo: (taskId: string | null) => void;
  activeScoreGainInfo: string | null;
  setActiveScoreGainInfo: (taskId: string | null) => void;
}

function TaskCardItem({
  task,
  isSelected,
  onToggleSelect,
  onApply,
  onDismiss,
  onAcceptOwnership,
  alternativeChoice,
  onSelectAlternativeChoice,
  formatAge,
  userRole,
  activeConfidenceInfo,
  setActiveConfidenceInfo,
  activeScoreGainInfo,
  setActiveScoreGainInfo,
}: TaskCardItemProps) {
  const isPending = task.status === "Pending";
  const isAwaitingOwner = task.status === "Awaiting owner acceptance";
  const isApplied = task.status === "Applied";
  const isDismissed = task.status === "Dismissed" || task.status === "Rejected";

  const sevConfig = DQ_SEVERITY_LEVELS[task.severity] || DQ_SEVERITY_LEVELS.Low;
  const scoreGainDetail = getTaskScoreGainDetail(task);
  const scoreGain = task.scoreGain || scoreGainDetail.scoreGain;

  // Isolated RBAC Check for this task (Follow-up Item 5)
  const approvalCheck = canApproveTask(userRole, {
    id: task.id,
    ciId: task.ciId,
    ciName: task.ciName,
    ciClass: task.ciClass,
  });

  // Confidence explanation text (Priority 4, Item 20)
  const confidenceExplanation =
    task.confidenceBasis ||
    (task.issueType.includes("Ownership")
      ? "Based on Git commit history and repository CODEOWNERS rules"
      : task.issueType.includes("Stale")
      ? "Based on hypervisor pulse & AWS CloudWatch telemetry inactivity"
      : task.issueType.includes("Conflict")
      ? "Based on authoritative CrowdStrike Falcon sensor precedence"
      : task.issueType.includes("Duplicate")
      ? "Based on IRE exact MAC address & management IP match rules"
      : "Based on Equinix DC1 SOC2 / NIST-800-53 security certification checklist");

  return (
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 text-sm">
      {/* Left Column: Checkbox, Details, Diff Preview */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {/* Checkbox for batch selection */}
        {isPending && (
          <button
            onClick={onToggleSelect}
            className="mt-1 text-text-muted hover:text-primary transition-colors flex-shrink-0"
            title="Select task for bulk actions"
          >
            {isSelected ? (
              <CheckSquare className="w-4 h-4 text-primary" />
            ) : (
              <Square className="w-4 h-4 text-border hover:text-text-muted" />
            )}
          </button>
        )}

        <div className="space-y-2 flex-1 min-w-0">
          {/* Row 1: ID, Severity with icon, Issue Type, Target CI */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold text-text-muted">{task.id}</span>

            {/* Severity with Strong Color & Icon (Priority 1, Item 2) */}
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border",
                sevConfig.bgClass,
                sevConfig.borderClass,
                sevConfig.textClass
              )}
            >
              {task.severity === "Critical" && <AlertOctagon className="w-3.5 h-3.5 text-danger shrink-0" />}
              {task.severity === "High" && <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />}
              {task.severity === "Medium" && <Info className="w-3.5 h-3.5 text-primary shrink-0" />}
              {task.severity === "Low" && <Shield className="w-3.5 h-3.5 text-text-muted shrink-0" />}
              <span>{task.severity}</span>
            </span>

            {/* Category Tag */}
            <Lozenge appearance="subtle" variant="neutral" size="xs">
              {task.issueType}
            </Lozenge>

            {/* Target CI Link */}
            <Link
              href={`/cis/${task.ciId}`}
              className="font-bold text-text-default hover:text-primary transition-colors flex items-center gap-1 text-xs"
            >
              {task.ciName} ({task.ciId}) <ExternalLink className="w-3 h-3 text-text-muted" />
            </Link>
          </div>

          {/* Row 2: Proposed Fix Description */}
          <p className="text-text-secondary text-xs sm:text-sm leading-relaxed">{task.proposedFix}</p>

          {/* Row 3: Split Alternative Fixes (Priority 2, Item 6 - e.g. DQ-202 sync vs retire) */}
          {task.alternativeFixes && task.alternativeFixes.length > 0 && isPending && (
            <div className="p-2.5 bg-sunken rounded border border-border/80 text-xs space-y-1.5">
              <span className="font-semibold text-text-default flex items-center gap-1.5">
                <SlidersHorizontal className="w-3 h-3 text-primary" />
                Select Remediation Strategy:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {task.alternativeFixes.map((opt) => (
                  <label
                    key={opt.id}
                    className={cn(
                      "flex items-start gap-2 p-2 rounded border cursor-pointer transition-all",
                      alternativeChoice === opt.id
                        ? "bg-surface border-primary ring-1 ring-primary/30"
                        : "bg-surface/50 border-border hover:border-border/80"
                    )}
                  >
                    <input
                      type="radio"
                      name={`fix-opt-${task.id}`}
                      checked={alternativeChoice === opt.id}
                      onChange={() => onSelectAlternativeChoice(opt.id)}
                      className="mt-0.5 text-primary focus:ring-primary"
                    />
                    <div>
                      <span className={cn("font-semibold text-xs", opt.isDestructive && "text-amber-600")}>
                        {opt.label}
                      </span>
                      <p className="text-[11px] text-text-muted leading-tight mt-0.5">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Row 4: Before / After Diff Preview Strip (Priority 2, Item 7) */}
          {task.diff && (
            <div className="inline-flex flex-wrap items-center gap-2 p-1.5 px-2.5 rounded bg-sunken/80 border border-border text-xs">
              <span className="font-semibold text-text-muted uppercase text-[10px] tracking-wider">
                {task.diff.field} Diff:
              </span>
              <span className="line-through text-red-600 dark:text-red-400 font-mono text-[11px] bg-red-500/10 px-1.5 py-0.5 rounded">
                {task.diff.before}
              </span>
              <ArrowRight className="w-3 h-3 text-text-muted" />
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-[11px] bg-emerald-500/10 px-1.5 py-0.5 rounded">
                {task.diff.after}
              </span>
            </div>
          )}

          {/* Row 5: Metadata (Confidence explanation, Approver with role, Labelled Dates) */}
          <div className="flex items-center gap-3 text-[11px] text-text-muted pt-1 flex-wrap">
            {/* Confidence with plain explanation popover */}
            <div className="relative inline-flex items-center gap-1">
              <span>Confidence:</span>
              <button
                type="button"
                onClick={() =>
                  setActiveConfidenceInfo(activeConfidenceInfo === task.id ? null : task.id)
                }
                className="font-mono font-bold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                title="Click to see what confidence is based on"
              >
                <span>{task.confidence}%</span>
                <HelpCircle className="w-3 h-3 text-primary/70" />
              </button>

              {activeConfidenceInfo === task.id && (
                <div className="absolute left-0 bottom-full mb-1 z-50 p-2.5 bg-neutral-900 text-neutral-100 text-[11px] rounded shadow-xl w-64 border border-neutral-700 animate-in fade-in duration-100">
                  <p className="font-semibold text-primary-200">Confidence Attribution:</p>
                  <p className="text-neutral-300 mt-1 leading-snug">{confidenceExplanation}</p>
                </div>
              )}
            </div>

            <span>&bull;</span>

            {/* Approver with Role (Follow-up Item 4: Non-Admin, e.g. Data Steward / CMDB Manager / CI Owner) */}
            <span>
              Approver: <strong className="text-text-default">{task.approver}</strong>
              {task.approverRole && <span className="text-text-muted"> ({task.approverRole})</span>}
            </span>

            <span>&bull;</span>

            {/* Labelled Dates & Age (Priority 4, Item 15) */}
            <span>Created: {formatAge(task.createdAt)}</span>

            {task.dueDate && (
              <>
                <span>&bull;</span>
                <span className="text-amber-600 font-medium">Due: {task.dueDate}</span>
              </>
            )}

            {task.decidedAt && (
              <>
                <span>&bull;</span>
                <span className="text-text-muted font-mono">Decided: {formatDateTime(task.decidedAt)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Trust Score Diff Badge with 5-Pillar Breakdown Tooltip & Primary Action Buttons */}
      <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-end md:items-end justify-between gap-2.5 flex-shrink-0 pt-2 md:pt-0">
        {/* Dynamic Trust Score Gain Badge with 5-Pillar Tooltip (Follow-up Item 7) */}
        <div className="relative group">
          <button
            type="button"
            onClick={() => setActiveScoreGainInfo(activeScoreGainInfo === task.id ? null : task.id)}
            className="text-xs font-bold text-success bg-success/10 border border-success/30 px-2.5 py-1 rounded font-mono flex items-center gap-1 shadow-xs cursor-pointer hover:bg-success/15 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-success" />
            <span>Score Diff: +{scoreGain} pts</span>
            <Info className="w-3 h-3 text-success/70 ml-0.5" />
          </button>

          {/* 5-Pillar Breakdown Popover / Tooltip (Follow-up Item 7) */}
          <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block z-50 p-3 bg-neutral-900 text-neutral-100 text-[11px] rounded shadow-2xl w-64 border border-neutral-700 animate-in fade-in duration-100">
            <div className="flex items-center justify-between border-b border-neutral-700 pb-1.5 mb-2">
              <span className="font-bold text-primary-200">Pillar Contribution</span>
              <span className="font-mono text-emerald-400 font-bold">+{scoreGain} pts</span>
            </div>
            <div className="space-y-1">
              {scoreGainDetail.pillarBreakdown.map((p) => (
                <div key={p.pillar} className="flex items-center justify-between py-0.5">
                  <span className="text-neutral-300">
                    {p.pillar} <span className="text-neutral-500">({p.weight}%)</span>:
                  </span>
                  <span
                    className={cn(
                      "font-mono font-bold",
                      p.gain > 0 ? "text-emerald-400" : "text-neutral-500"
                    )}
                  >
                    {p.gain > 0 ? `+${p.gain} pts` : "0"}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 pt-1.5 border-t border-neutral-800 text-[10px] text-neutral-400 leading-tight">
              {scoreGainDetail.explanation}
            </p>
          </div>
        </div>

        {/* Action Button Set */}
        {isPending ? (
          <div className="flex items-center gap-2">
            {/* Primary Action Button with Isolated RBAC Check (Follow-up Item 5) */}
            <div className="relative group inline-block">
              <Button
                size="sm"
                variant={alternativeChoice === "retire" ? "danger" : "primary"}
                leftIcon={<Check className="w-3.5 h-3.5" />}
                onClick={onApply}
                disabled={!approvalCheck.canApprove}
                className={cn(
                  "font-bold text-xs shadow-sm border border-primary/40 px-3",
                  !approvalCheck.canApprove && "opacity-50 cursor-not-allowed",
                  alternativeChoice === "retire" && "bg-rose-600 hover:bg-rose-700 text-white border-rose-700"
                )}
              >
                {alternativeChoice === "retire" ? "Decommission CI" : "Apply Fix"}
              </Button>

              {!approvalCheck.canApprove && (
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-900 text-neutral-100 text-[11px] font-medium rounded shadow-lg pointer-events-none max-w-xs text-center z-50">
                  <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{approvalCheck.tooltipText}</span>
                </div>
              )}
            </div>

            {/* Dismiss Button: Visible text, less prominent than Apply Fix (Priority 1, Item 1 & Priority 2, Item 8) */}
            <Button
              size="sm"
              variant="outline"
              onClick={onDismiss}
              className="text-xs text-text-muted hover:text-danger hover:border-danger/40 h-8 px-2.5"
              title="Dismiss task with required justification"
            >
              <X className="w-3.5 h-3.5 mr-1 text-text-muted" />
              <span>Dismiss</span>
            </Button>
          </div>
        ) : isAwaitingOwner ? (
          /* Ownership Fix: Awaiting Owner Acceptance State (Priority 2, Item 4) */
          <div className="flex flex-col items-end gap-1.5">
            <Lozenge appearance="bold" variant="warning" size="sm">
              <Clock className="w-3 h-3 mr-1 inline" />
              Awaiting owner acceptance
            </Lozenge>
            <Button
              size="xs"
              variant="primary"
              onClick={onAcceptOwnership}
              leftIcon={<UserCheck className="w-3 h-3" />}
              className="text-xs h-7 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              Accept Assignment ({task.proposedOwner?.name?.split(" ")[0] || "David"})
            </Button>
          </div>
        ) : isApplied ? (
          /* Applied State */
          <div className="flex items-center gap-1.5 text-success font-semibold text-xs bg-success/10 px-3 py-1 rounded border border-success/30">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span>Remediation Applied</span>
          </div>
        ) : (
          /* Dismissed / Rejected State */
          <div className="flex flex-col items-end text-xs">
            <div className="flex items-center gap-1 text-text-muted font-semibold bg-sunken px-2.5 py-1 rounded border border-border">
              <FolderArchive className="w-3.5 h-3.5 text-text-muted" />
              <span>{task.status}</span>
            </div>
            {task.dismissCategory && (
              <span className="text-[10px] text-text-muted mt-0.5">
                Reason: {task.dismissCategory}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
