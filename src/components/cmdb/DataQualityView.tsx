"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  AlertTriangle,
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
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lozenge } from "@/components/ui/Lozenge";
import { Button } from "@/components/ui/Button";
import { useCMDB } from "@/context/cmdb-context";
import { formatDateTime, cn } from "@/lib/utils";
import { Can } from "@/components/rbac/Can";
import { PERMISSIONS } from "@/lib/rbac";

type DQCategoryTab = "all" | "stale" | "missing-owner" | "duplicates" | "conflicts" | "orphans";

export function DataQualityView() {
  const { dataQualityTasks, approveDQTask, rejectDQTask, applyDQTask, showToast, activeTenant } =
    useCMDB();

  const [activeTab, setActiveTab] = useState<DQCategoryTab>("all");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [isSweeping, setIsSweeping] = useState(false);
  const [bulkApplying, setBulkApplying] = useState(false);

  // Trigger 2 AM staleness check demo button
  const handleTriggerStalenessSweep = () => {
    setIsSweeping(true);
    setTimeout(() => {
      setIsSweeping(false);
      showToast(
        "success",
        "2 AM Staleness Sweep Executed",
        "Scanned all CIs across tenant. Verified 42 active heartbeats, flagged 2 inactive VMs for review."
      );
    }, 1200);
  };

  const handleApplyFixWithDiff = (taskId: string, taskTitle: string) => {
    applyDQTask(taskId, "Governance Lead");
    showToast(
      "success",
      "Remediation Applied (+30 pts Trust)",
      `Successfully resolved "${taskTitle}". Trust Score restored to healthy 92% SLA.`
    );
  };

  const handleBulkApply = () => {
    setBulkApplying(true);
    setTimeout(() => {
      const pendingTasks = dataQualityTasks.filter(
        (t) => t.status === "Pending" && t.confidence >= 85
      );
      pendingTasks.forEach((t) => applyDQTask(t.id, "Bulk Auto-Remediator"));
      setBulkApplying(false);
      showToast(
        "success",
        "Bulk Remediations Applied",
        `Resolved ${pendingTasks.length} high-confidence data quality anomalies across ${activeTenant}.`
      );
    }, 1000);
  };

  // Filter tasks based on active category tab and status
  const filteredTasks = dataQualityTasks.filter((task) => {
    if (statusFilter !== "All" && task.status !== statusFilter) return false;

    if (activeTab === "stale") {
      return task.issueType === "Stale Discovery";
    }
    if (activeTab === "missing-owner") {
      return (
        task.issueType === "Missing Required Ownership" ||
        task.issueType === "Unassigned Support Group"
      );
    }
    if (activeTab === "duplicates") {
      return task.issueType === "Duplicate Suspect";
    }
    if (activeTab === "conflicts") {
      return task.issueType === "Attribute Conflict";
    }
    if (activeTab === "orphans") {
      return task.issueType.toLowerCase().includes("orphan") || task.ciClass === "Network Device";
    }

    return true;
  });

  const pendingCount = dataQualityTasks.filter((t) => t.status === "Pending").length;
  const appliedCount = dataQualityTasks.filter((t) => t.status === "Applied").length;
  const criticalCount = dataQualityTasks.filter(
    (t) => t.severity === "Critical" && t.status === "Pending"
  ).length;

  return (
    <div className="space-y-6 pb-12 text-text-default">
      {/* ----------------------------------------------------------------------- */}
      {/* HEADER & ACTIONS */}
      {/* ----------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-default">
              Data Quality & Governance Tasks
            </h1>
            <Lozenge appearance="subtle" variant="warning">
              {pendingCount} Pending Remediations
            </Lozenge>
            <span className="inline-flex items-center gap-1 text-xs text-text-muted bg-sunken px-2 py-0.5 rounded border border-border/60">
              <Lock className="w-3 h-3 text-text-muted" />
              {activeTenant}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Automated anomaly detection, ownership assignment remediations, and source reconciliation conflict queues
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* 2 AM Staleness Check Demo Trigger */}
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Clock className={cn("w-3.5 h-3.5", isSweeping && "animate-spin text-primary")} />}
            onClick={handleTriggerStalenessSweep}
            isLoading={isSweeping}
          >
            Run 2 AM Staleness Sweep
          </Button>

          {pendingCount > 0 && (
            <Can
              permission={PERMISSIONS.TASK_APPROVE}
              disableOnly
              tooltipText="Administrators cannot approve data fixes (SoD rule: admin_cannot_approve)"
            >
              <Button
                size="sm"
                variant="primary"
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                onClick={handleBulkApply}
                isLoading={bulkApplying}
              >
                Apply All &ge;85% Confident
              </Button>
            </Can>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* KPI TILES */}
      {/* ----------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 bg-surface rounded-lg border border-border dark:border-white/[0.08] shadow-card dark:shadow-none">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Pending Tasks
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-text-default">{pendingCount}</span>
            <span className="text-xs text-warning font-semibold">Action Required</span>
          </div>
        </div>

        <div className="p-3.5 bg-surface rounded-lg border border-border dark:border-white/[0.08] shadow-card dark:shadow-none">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Critical Severities
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-danger">{criticalCount}</span>
            <span className="text-xs text-danger font-semibold">Missing Owners / Stale</span>
          </div>
        </div>

        <div className="p-3.5 bg-surface rounded-lg border border-border dark:border-white/[0.08] shadow-card dark:shadow-none">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Remediations Applied
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-success">{appliedCount}</span>
            <span className="text-xs text-success font-semibold">Trust Restored</span>
          </div>
        </div>

        <div className="p-3.5 bg-surface rounded-lg border border-border dark:border-white/[0.08] shadow-card dark:shadow-none">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Avg Fix Confidence
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-primary">91.8%</span>
            <span className="text-xs text-text-muted">ML Precedence</span>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* 5 CATEGORY TABS (Section 4.A.5 Requirements) */}
      {/* ----------------------------------------------------------------------- */}
      <div className="flex items-center gap-1 border-b border-border dark:border-white/[0.08] overflow-x-auto pb-px">
        {[
          { id: "all" as const, label: "All Tasks", count: dataQualityTasks.length },
          {
            id: "stale" as const,
            label: "Stale Telemetry",
            count: dataQualityTasks.filter((t) => t.issueType === "Stale Discovery").length,
          },
          {
            id: "missing-owner" as const,
            label: "Missing Owner",
            count: dataQualityTasks.filter(
              (t) =>
                t.issueType === "Missing Required Ownership" ||
                t.issueType === "Unassigned Support Group"
            ).length,
          },
          {
            id: "duplicates" as const,
            label: "Duplicate Suspects",
            count: dataQualityTasks.filter((t) => t.issueType === "Duplicate Suspect").length,
          },
          {
            id: "conflicts" as const,
            label: "Conflicting Data",
            count: dataQualityTasks.filter((t) => t.issueType === "Attribute Conflict").length,
          },
          {
            id: "orphans" as const,
            label: "Orphan CIs",
            count: 1,
          },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3.5 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2",
                isActive
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-text-muted hover:text-text-default hover:border-border"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-mono font-medium",
                  isActive ? "bg-primary/10 text-primary" : "bg-sunken text-text-muted"
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* TASKS LIST */}
      {/* ----------------------------------------------------------------------- */}
      <div className="space-y-3.5">
        {filteredTasks.map((task) => {
          const isPending = task.status === "Pending";
          return (
            <Card
              key={task.id}
              className={cn(
                "bg-surface border-border transition-all shadow-card",
                isPending && task.severity === "Critical" && "border-danger/40 ring-1 ring-danger/20"
              )}
            >
              <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm">
                {/* Left: Info */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-text-muted">{task.id}</span>
                    <Lozenge
                      appearance="bold"
                      variant={
                        task.severity === "Critical"
                          ? "danger"
                          : task.severity === "High"
                          ? "warning"
                          : "info"
                      }
                      size="sm"
                    >
                      {task.severity}
                    </Lozenge>
                    <Lozenge appearance="subtle" variant="neutral" size="sm">
                      {task.issueType}
                    </Lozenge>
                    <Link
                      href={`/cis/${task.ciId}`}
                      className="font-semibold text-text-default hover:text-primary transition-colors flex items-center gap-1 text-sm"
                    >
                      {task.ciName} ({task.ciId}) <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <p className="text-text-secondary text-sm leading-relaxed">{task.proposedFix}</p>

                  <div className="flex items-center gap-3 text-xs text-text-muted pt-0.5 flex-wrap">
                    <span>
                      Confidence: <strong className="text-primary font-mono">{task.confidence}%</strong>
                    </span>
                    <span>&bull;</span>
                    <span>Approver: {task.approver}</span>
                    <span>&bull;</span>
                    <span className="font-mono">{formatDateTime(task.createdAt)}</span>
                  </div>
                </div>

                {/* Right: Actions with Trust Score Diff */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isPending ? (
                    <>
                      {/* Trust Score Diff Badge */}
                      <span className="text-xs font-bold text-success bg-success/10 border border-success/30 px-2.5 py-1 rounded font-mono">
                        Score Diff: +30 pts
                      </span>

                      <Can
                        permission={PERMISSIONS.TASK_APPROVE}
                        resource={{
                          id: task.ciId,
                          name: task.ciName,
                          ciClass: task.ciClass,
                        }}
                        disableOnly
                        tooltipText="Administrators cannot approve data fixes (SoD rule: admin_cannot_approve)"
                      >
                        <Button
                          size="sm"
                          variant="primary"
                          leftIcon={<Check className="w-3.5 h-3.5" />}
                          onClick={() => handleApplyFixWithDiff(task.id, task.issueType)}
                        >
                          Apply Fix
                        </Button>
                      </Can>

                      <Button
                        size="sm"
                        variant="subtle"
                        onClick={() => rejectDQTask(task.id, "Governance Lead")}
                        title="Dismiss Task"
                      >
                        <X className="w-4 h-4 text-text-muted hover:text-danger" />
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-success font-semibold text-sm bg-success/10 px-3 py-1 rounded border border-success/20">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{task.status}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        {filteredTasks.length === 0 && (
          <Card className="bg-surface border-border p-8 text-center text-xs text-text-secondary">
            <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="font-semibold text-text-default">No data quality tasks in this category.</p>
            <p className="text-[11px] text-text-muted mt-1">
              All configuration items in this scope satisfy governance and freshness rules.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
