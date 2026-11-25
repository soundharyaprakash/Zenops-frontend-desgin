"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  GitMerge,
  Plus,
  Clock,
  Sparkles,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Split,
  Ban,
  Search,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  LayoutGrid,
  List,
  Play,
  HelpCircle,
  AlertOctagon,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Modal,
  Input,
  Select,
} from "@/components/ui";
import { PrimaryButton, JargonTooltip, StatusPill } from "@/components/shared";
import {
  simulateRuleExecution,
  CANONICAL_IRE_REVIEW_QUEUE,
  getTaskQueueMetrics,
  getInventoryMetrics,
  getDiscoveryModelMetrics,
} from "@/lib/cmdb-metrics";
import { useCMDB } from "@/context/cmdb-context";
import { CI_CLASSES } from "@/lib/constants";
import { CIClass, ReconciliationRule } from "@/types/cmdb";
import { cn } from "@/lib/utils";
import { usePermission } from "@/components/rbac/usePermission";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { canApproveRule } from "@/lib/rbac-lite/canApproveRule";
import { UserContext } from "@/lib/rbac/scope";

interface ConflictRecord {
  id: string;
  ciId: string;
  ciName: string;
  ciClass: CIClass;
  sourceA: { name: string; rank: number };
  sourceB: { name: string; rank: number };
  confidence: number;
  detectedAt: string;
  fields: {
    attribute: string;
    valueA: string;
    valueB: string;
    winner: "A" | "B";
    reason: string;
  }[];
  status: "Pending" | "Merged" | "Split" | "Rejected";
}

const INITIAL_REVIEW_QUEUE: ConflictRecord[] = [
  {
    id: "IRE-CONF-01",
    ciId: "CI-1004",
    ciName: "aws-ec2-prod-edge-gateway-01",
    ciClass: "Server/VM",
    sourceA: { name: "AWS Discovery Connector", rank: 1 },
    sourceB: { name: "Dynatrace APM Agent", rank: 2 },
    confidence: 96,
    detectedAt: "2026-11-16T08:30:00Z",
    fields: [
      {
        attribute: "Operating System",
        valueA: "Amazon Linux 2023.2 (Kernel 6.1)",
        valueB: "Amazon Linux 2023.4 (Kernel 6.1.72-96.166)",
        winner: "B",
        reason: "Dynatrace live runtime sensor has higher fidelity OS patch data",
      },
      {
        attribute: "RAM Allocated",
        valueA: "32 GB",
        valueB: "32 GB (31.4 GB usable)",
        winner: "A",
        reason: "AWS hardware hypervisor is authoritative for hardware specs",
      },
      {
        attribute: "CPU Cores",
        valueA: "8 vCPU",
        valueB: "8 vCPU",
        winner: "A",
        reason: "AWS descriptor matches hypervisor specification",
      },
      {
        attribute: "Active Listening Ports",
        valueA: "443, 80",
        valueB: "443, 80, 8443 (admin-metrics)",
        winner: "B",
        reason: "Agent dynamic socket discovery detected active metrics daemon",
      },
    ],
    status: "Pending",
  },
  {
    id: "IRE-CONF-02",
    ciId: "CI-1002",
    ciName: "aurora-pg-payments-cluster",
    ciClass: "Database",
    sourceA: { name: "AWS Discovery Connector", rank: 1 },
    sourceB: { name: "ServiceNow Bridge", rank: 3 },
    confidence: 91,
    detectedAt: "2026-11-15T19:15:00Z",
    fields: [
      {
        attribute: "Database Version",
        valueA: "PostgreSQL 15.4 (Aurora Serverless v2)",
        valueB: "PostgreSQL 14.8",
        winner: "A",
        reason: "AWS API provides real-time cluster engine version (ServiceNow sync is stale)",
      },
      {
        attribute: "Storage Allocation",
        valueA: "512 GB Auto-scaling",
        valueB: "256 GB Static",
        winner: "A",
        reason: "AWS cloud provider allocation is authoritative",
      },
      {
        attribute: "Business Criticality",
        valueA: "Tier 1 - Mission Critical",
        valueB: "Tier 1 - Mission Critical",
        winner: "A",
        reason: "Values match across both source catalogs",
      },
    ],
    status: "Pending",
  },
  {
    id: "IRE-CONF-03",
    ciId: "CI-1007",
    ciName: "okta-enterprise-identity-tenant",
    ciClass: "SaaS Subscription",
    sourceA: { name: "Manual Provisioning", rank: 2 },
    sourceB: { name: "ServiceNow Bridge", rank: 1 },
    confidence: 88,
    detectedAt: "2026-11-14T11:20:00Z",
    fields: [
      {
        attribute: "Assigned User Seats",
        valueA: "1,240 Active Seats",
        valueB: "1,410 Provisioned Seats",
        winner: "B",
        reason: "ServiceNow directory bridge syncs directly with Okta enterprise user directory",
      },
      {
        attribute: "Contract Renewal Date",
        valueA: "2027-01-15",
        valueB: "2026-12-31",
        winner: "A",
        reason: "Procurement contract team entered signed master subscription amendment",
      },
    ],
    status: "Pending",
  },
];

export function ReconciliationRulesView() {
  const { reconciliationRules, userRole, showToast, session, cis, discoverySources } = useCMDB();
  const [rules, setRules] = useState(reconciliationRules);
  const [reviewQueue, setReviewQueue] = useState<ConflictRecord[]>(INITIAL_REVIEW_QUEUE);
  const [activeTab, setActiveTab] = useState<"rules" | "queue" | "scratchpad">("rules");
  const [selectedClass, setSelectedClass] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Single Source of Truth Metrics (Phase 0 & Screen 3)
  const inventoryMetrics = useMemo(() => getInventoryMetrics(cis || []), [cis]);
  const discoveryMetrics = useMemo(() => getDiscoveryModelMetrics(), []);

  // Scratchpad State (Screen 3 Improve)
  const [scratchRecordA, setScratchRecordA] = useState({
    source: "AWS Discovery Connector",
    hostname: "prod-edge-01.internal",
    ipAddress: "10.0.14.90",
    macAddress: "00:1A:2B:3C:4D:5E",
    serialNumber: "VMw-4210-9901",
    ramGb: "64",
    osVersion: "Amazon Linux 2023.2",
  });
  const [scratchRecordB, setScratchRecordB] = useState({
    source: "Dynatrace APM Agent",
    hostname: "prod-edge-01",
    ipAddress: "10.0.14.90",
    macAddress: "00:1A:2B:3C:4D:5E",
    serialNumber: "VMw-4210-9901",
    ramGb: "64",
    osVersion: "Amazon Linux 2023.4 (Kernel 6.1.72)",
  });
  const [scratchResult, setScratchResult] = useState<any | null>(null);

  const handleEvaluateScratchpad = () => {
    const matchedRule = rules.find((r) => r.ciClass === "Server/VM") || rules[0];
    const matchKey =
      scratchRecordA.macAddress === scratchRecordB.macAddress
        ? `macAddress (${scratchRecordA.macAddress})`
        : scratchRecordA.serialNumber === scratchRecordB.serialNumber
        ? `serialNumber (${scratchRecordA.serialNumber})`
        : "None";

    setScratchResult({
      rule: matchedRule,
      matchKey,
      isMatch: matchKey !== "None",
      attributes: [
        {
          name: "ramGb",
          valA: `${scratchRecordA.ramGb} GB`,
          valB: `${scratchRecordB.ramGb} GB`,
          winner: "AWS Discovery Connector",
          winningVal: `${scratchRecordA.ramGb} GB`,
          reason: "Authoritative connector for physical/virtual hardware capacity",
        },
        {
          name: "osVersion",
          valA: scratchRecordA.osVersion,
          valB: scratchRecordB.osVersion,
          winner: "Dynatrace APM Agent",
          winningVal: scratchRecordB.osVersion,
          reason: "Authoritative APM agent for live running kernel and OS patch level",
        },
        {
          name: "hostname",
          valA: scratchRecordA.hostname,
          valB: scratchRecordB.hostname,
          winner: "AWS Discovery Connector",
          winningVal: scratchRecordA.hostname,
          reason: "Higher source priority rank (AWS Rank 1 > Dynatrace Rank 3)",
        },
        {
          name: "ipAddress",
          valA: scratchRecordA.ipAddress,
          valB: scratchRecordB.ipAddress,
          winner: "Agreement",
          winningVal: scratchRecordA.ipAddress,
          reason: "Both sources report identical IP address",
        },
      ],
    });
    showToast("success", "Scratchpad Evaluated", `Matched rule ${matchedRule.id} via ${matchKey}.`);
  };

  // New rule state
  const [name, setName] = useState("");
  const [ciClass, setCiClass] = useState<CIClass>("Server/VM");
  const [identifiers, setIdentifiers] = useState("serialNumber, macAddress, fqdn");
  const [sources, setSources] = useState("AWS Discovery Connector, CrowdStrike Falcon Sensor, ServiceNow Bridge");
  const [mergeAction, setMergeAction] = useState<ReconciliationRule["mergeAction"]>("Auto Merge");
  const [staleThreshold, setStaleThreshold] = useState("14");

  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [simulatingRule, setSimulatingRule] = useState<ReconciliationRule | null>(null);

  // G9: Persist view mode preference in localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("zenops_ire_view_mode");
      if (saved === "cards" || saved === "table") setViewMode(saved);
    } catch {
      // ignore
    }
  }, []);

  const handleSetViewMode = (mode: "cards" | "table") => {
    setViewMode(mode);
    try {
      localStorage.setItem("zenops_ire_view_mode", mode);
    } catch {
      // ignore
    }
  };

  // Dynamic simulation computation from real estate CIs (Phase 0 & Screen 3)
  const simResult = useMemo(() => {
    if (!simulatingRule) return null;
    return simulateRuleExecution(simulatingRule, cis || []);
  }, [simulatingRule, cis]);

  const { allowed: canEdit } = usePermission(PERMISSIONS.RULES_EDIT);
  const { allowed: canApprove } = usePermission(PERMISSIONS.RULES_APPROVE);

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newRule: ReconciliationRule = {
      id: `REC-0${rules.length + 1}`,
      name,
      ciClass,
      identifierAttributes: identifiers.split(",").map((s) => s.trim()),
      sourcePriority: sources.split(",").map((s) => s.trim()),
      mergeAction,
      staleThreshold: Number(staleThreshold) || 14,
      active: false,
      matchCount: 0,
      author: session?.email || "sarah.jenkins@gmail.com",
      authorId: session?.userId || "USR-1001",
      approvalStatus: "Pending Approval",
    };

    setRules([newRule, ...rules]);
    setIsAddOpen(false);
    showToast(
      "info",
      "Rule Draft Created (Pending Approval)",
      `Rule "${name}" requires independent approval from a CMDB Manager before activation (rule authors cannot self-approve).`
    );
    setName("");
  };

  const handleApproveRule = (ruleId: string) => {
    const target = rules.find((r) => r.id === ruleId);
    if (!target) return;

    const userCtx: UserContext = {
      id: session?.userId || "usr-current",
      name: session?.name || (userRole === "Admin" ? "Sarah Jenkins" : "David Chen"),
      email: session?.email || (userRole === "Admin" ? "sarah.jenkins@gmail.com" : "david.chen@gmail.com"),
      role: userRole || session?.role || "CMDB Administrator",
      tenantId: session?.tenantId || "CMP_1001_ZENDEV",
    };

    const check = canApproveRule(userCtx, {
      id: target.id,
      name: target.name,
      author: target.author,
      authorId: target.authorId,
      ruleAuthorId: target.authorId,
    });

    if (!check.canApprove) {
      showToast(
        "error",
        "Rule Approval Denied",
        check.reason || "Rule authors cannot approve their own rule drafts (SoD: rule_author_cannot_approve)."
      );
      return;
    }

    setRules((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? {
              ...r,
              approvalStatus: "Approved",
              active: true,
              approvedBy: userCtx.name,
            }
          : r
      )
    );
    showToast(
      "success",
      "Rule Approved & Activated",
      `Rule "${target.name}" approved by ${userCtx.name} and activated in IRE engine.`
    );
  };

  const toggleRuleActive = (ruleId: string) => {
    if (!canEdit) return;
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, active: !r.active } : r))
    );
    showToast("info", "Rule Status Updated", "Reconciliation rule activation state modified.");
  };

  // Reorder source precedence for a rule
  const handleMoveSource = (ruleId: string, index: number, direction: "up" | "down") => {
    if (!canEdit) return;
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== ruleId) return r;
        const newPriority = [...r.sourcePriority];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newPriority.length) return r;
        const [moved] = newPriority.splice(index, 1);
        newPriority.splice(targetIndex, 0, moved);
        return { ...r, sourcePriority: newPriority };
      })
    );
    showToast("success", "Precedence Reordered", "Authoritative source ranking precedence adjusted.");
  };

  // Review Queue actions
  const handleResolveConflict = (conflictId: string, action: "Merge" | "Split" | "Reject") => {
    if (!canApprove) return;
    const target = reviewQueue.find((c) => c.id === conflictId);
    if (!target) return;

    setReviewQueue((prev) =>
      prev.map((c) =>
        c.id === conflictId
          ? {
              ...c,
              status: action === "Merge" ? "Merged" : action === "Split" ? "Split" : "Rejected",
            }
          : c
      )
    );

    if (action === "Merge") {
      showToast("success", "Attributes Merged", `Conflict for ${target.ciName} resolved using source precedence winners.`);
    } else if (action === "Split") {
      showToast("info", "Records Isolated", `Incoming payload registered as separate independent CI.`);
    } else {
      showToast("warning", "Payload Rejected", `Discovered incoming payload was discarded.`);
    }
  };

  // Filtered rules
  const filteredRules = rules.filter((r) => {
    if (selectedClass !== "All" && r.ciClass !== selectedClass) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.name.toLowerCase().includes(q);
      const matchId = r.id.toLowerCase().includes(q);
      const matchClass = r.ciClass.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchClass) return false;
    }
    return true;
  });

  // Group rules by CI class
  const groupedRules = filteredRules.reduce<Record<string, ReconciliationRule[]>>((acc, rule) => {
    acc[rule.ciClass] = acc[rule.ciClass] || [];
    acc[rule.ciClass].push(rule);
    return acc;
  }, {});

  const pendingConflictCount = reviewQueue.filter((c) => c.status === "Pending").length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Identification & Reconciliation Engine (IRE)
            </h1>
            <Badge variant="blue" size="sm">v3.2 Enterprise</Badge>
          </div>
          <p className="text-sm text-muted mt-1">
            Deterministic correlation matrices, multi-source precedence rankings, and pending attribute conflict queues
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PrimaryButton
            size="sm"
            disabled={!canEdit}
            disabledReason="Rule authoring requires 'rules.edit' permission. Current user lacks administrative authority."
            onClick={() => setIsAddOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Reconciliation Rule
          </PrimaryButton>
        </div>
      </div>

      {/* Metrics Summary Strip (Screen 3, Item 7 & Single Source of Truth) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface p-3.5 rounded-lg border border-border shadow-xs text-xs">
        <div>
          <span className="text-muted block text-[11px]">Matches Reconciled (last 30 days)</span>
          <span className="font-mono text-base font-bold text-foreground">{inventoryMetrics.totalCIs} CIs</span>
          <span className="text-[10px] text-muted block">across {rules.length} active rules ({discoveryMetrics.recordsIngested} ingested)</span>
        </div>
        <div>
          <span className="text-muted block text-[11px]">Auto-Merged vs Reviewed</span>
          <span className="font-mono text-base font-bold text-emerald-600">
            {inventoryMetrics.totalCIs - pendingConflictCount} / {pendingConflictCount}
          </span>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block">
            {Math.round(((inventoryMetrics.totalCIs - pendingConflictCount) / Math.max(1, inventoryMetrics.totalCIs)) * 1000) / 10}% automated precision
          </span>
        </div>
        <div>
          <span className="text-muted block text-[11px]">Discrepancy Review Queue</span>
          <span className="font-mono text-base font-bold text-amber-600">{pendingConflictCount} Pending</span>
          <span className="text-[10px] text-muted block">{discoveryMetrics.overlapRatePct}% overlap rate</span>
        </div>
        <div>
          <span className="text-muted block text-[11px]">IRE Precision Rate</span>
          <span className="font-mono text-base font-bold text-primary">97.4%</span>
          <span className="text-[10px] text-muted block">0 unhandled collisions</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("rules")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors",
            activeTab === "rules"
              ? "border-primary text-foreground"
              : "border-transparent text-secondary hover:text-foreground"
          )}
        >
          <GitMerge className="w-4 h-4" />
          <span>Rules Catalog</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-elevated text-secondary border border-border">
            {rules.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("queue")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors",
            activeTab === "queue"
              ? "border-primary text-foreground"
              : "border-transparent text-secondary hover:text-foreground"
          )}
        >
          <Layers className="w-4 h-4" />
          <span>IRE Review Queue</span>
          {pendingConflictCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-warning/15 text-warning border border-warning/30 font-bold">
              {pendingConflictCount} pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("scratchpad")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors",
            activeTab === "scratchpad"
              ? "border-primary text-foreground"
              : "border-transparent text-secondary hover:text-foreground"
          )}
        >
          <Play className="w-4 h-4 text-primary" />
          <span>Test-a-Match Scratchpad</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
            Interactive
          </span>
        </button>
      </div>

      {/* TAB 1: RULES CATALOG */}
      {activeTab === "rules" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-surface p-3.5 rounded-lg border border-border">
            <div className="flex flex-1 items-center gap-2.5 w-full sm:max-w-md">
              <Search className="w-4 h-4 text-muted shrink-0" />
              <input
                type="text"
                placeholder="Search rules by name, ID or CI class..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-muted hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-muted uppercase font-bold shrink-0">Class:</span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-md bg-elevated border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="All">All CI Classes</option>
                {CI_CLASSES.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>

              {/* View Mode Toggle: Cards vs Table (G9) */}
              <div className="inline-flex rounded-md border border-border bg-sunken p-0.5 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => handleSetViewMode("cards")}
                  className={cn(
                    "p-1.5 rounded transition-all",
                    viewMode === "cards"
                      ? "bg-surface text-primary shadow-xs font-semibold"
                      : "text-muted hover:text-foreground"
                  )}
                  title="Card grid view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSetViewMode("table")}
                  className={cn(
                    "p-1.5 rounded transition-all",
                    viewMode === "table"
                      ? "bg-surface text-primary shadow-xs font-semibold"
                      : "text-muted hover:text-foreground"
                  )}
                  title="Compact table view"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* G9: Compact Sortable Table View vs Card View */}
          {viewMode === "table" ? (
            <Card className="border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left divide-y divide-border">
                  <thead className="bg-sunken text-muted uppercase text-[10px] font-semibold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-3 py-3">Rule Name & ID</th>
                      <th className="px-3 py-3">Mode</th>
                      <th className="px-3 py-3">Identification Keys</th>
                      <th className="px-3 py-3">Source Hierarchy</th>
                      <th className="px-3 py-3">Stale Threshold</th>
                      <th className="px-3 py-3">Matches Reconciled</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-sunken/60 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                          <Badge variant="blue" size="sm">{rule.ciClass}</Badge>
                        </td>
                        <td className="px-3 py-3">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-foreground truncate max-w-[180px]">{rule.name}</p>
                            <span className="font-mono text-[10px] text-muted">{rule.id}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-medium text-secondary">{rule.mergeAction || "Auto Merge"}</span>
                        </td>
                        <td className="px-3 py-3 font-mono text-[11px] text-secondary max-w-[200px] truncate" title={(rule.identifierAttributes || []).join(", ")}>
                          {(rule.identifierAttributes || []).join(", ")}
                        </td>
                        <td className="px-3 py-3 text-secondary text-[11px] max-w-[220px] truncate" title={(rule.sourcePriority || []).join(" > ")}>
                          {(rule.sourcePriority || []).join(" > ")}
                        </td>
                        <td className="px-3 py-3 text-secondary whitespace-nowrap">
                          {rule.staleThreshold || 14}d
                        </td>
                        <td className="px-3 py-3 font-mono font-bold text-foreground whitespace-nowrap">
                          {rule.matchCount ?? 142}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <Badge variant={rule.active ? "success" : "neutral"} size="sm">
                            {rule.active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() => setSimulatingRule(rule)}
                              className="h-7 text-[11px]"
                            >
                              <Play className="w-3 h-3 mr-1 text-primary" /> Simulate
                            </Button>
                            <Link href={`/audit-history?class=${encodeURIComponent(rule.ciClass)}`}>
                              <Button size="xs" variant="ghost" className="h-7 text-[11px] text-muted hover:text-foreground">
                                Audit Trail
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : Object.keys(groupedRules).length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg bg-surface">
              <GitMerge className="w-8 h-8 mx-auto text-muted mb-2" />
              <p className="text-xs font-semibold text-foreground">No reconciliation rules found</p>
              <p className="text-xs text-muted mt-1">Try resetting your class filter or search query</p>
            </div>
          ) : (
            Object.entries(groupedRules).map(([ciClassName, classRules]) => (
              <div key={ciClassName} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
                  <span>{ciClassName}</span>
                  <span className="text-[11px] font-mono text-secondary">
                    ({classRules.length} {classRules.length === 1 ? "rule" : "rules"})
                  </span>
                  <div className="flex-1 h-px bg-border ml-2" />
                </div>

                <div className="space-y-3">
                  {classRules.map((rule) => (
                    <Card key={rule.id} className="border border-border hover:border-border-strong transition-all">
                      <CardHeader className="bg-surface/50 py-3 px-4 border-b border-border">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono text-xs font-bold shrink-0">
                              <GitMerge className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-secondary">
                                  {rule.id}
                                </span>
                                <Badge variant="blue" size="sm">
                                  {rule.ciClass}
                                </Badge>
                                <Badge
                                  variant={
                                    rule.mergeAction === "Auto Merge"
                                      ? "success"
                                      : rule.mergeAction === "Require Approval"
                                      ? "warning"
                                      : "neutral"
                                  }
                                  size="sm"
                                >
                                  {rule.mergeAction}
                                </Badge>
                                {rule.approvalStatus === "Pending Approval" && (
                                  <Badge variant="warning" size="sm">
                                    Pending Approval
                                  </Badge>
                                )}
                              </div>
                              <CardTitle className="mt-1 text-base font-bold">{rule.name}</CardTitle>
                              {rule.author && (
                                <p className="text-[11px] text-muted">Author: {rule.author} {rule.approvedBy && `(Approved by: ${rule.approvedBy})`}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                            <Button
                              size="sm"
                              variant="secondary"
                              leftIcon={<Play className="w-3 h-3 text-primary" />}
                              onClick={() => setSimulatingRule(rule)}
                              className="text-xs py-1 h-7"
                            >
                              Simulate Match
                            </Button>

                            {rule.approvalStatus === "Pending Approval" && (
                              <Button
                                size="sm"
                                variant="primary"
                                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                onClick={() => handleApproveRule(rule.id)}
                                className="text-xs py-1 h-7"
                              >
                                Approve Rule
                              </Button>
                            )}
                            <span className="text-xs text-muted">
                              Matches (last 30 days):{" "}
                              <strong className="text-foreground font-mono tabular-nums">
                                {(rule.matchCount || 0).toLocaleString()} CIs
                              </strong>
                            </span>
                            <button
                              disabled={!canEdit}
                              onClick={() => toggleRuleActive(rule.id)}
                              className={cn(
                                "px-3 py-1 rounded-full text-xs font-semibold border transition-colors",
                                !canEdit && "opacity-60 cursor-not-allowed",
                                rule.active
                                  ? "bg-success/15 text-success border-success/30"
                                  : "bg-surface text-muted border-border"
                              )}
                            >
                              {rule.active ? "Active" : "Disabled"}
                            </button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {/* Identification Attributes */}
                          <div className="space-y-2 p-3 bg-elevated/50 rounded-lg border border-border">
                            <div className="flex items-center justify-between">
                              <span className="text-muted font-bold uppercase text-xs tracking-wider">
                                Identification Keys (Priority Hierarchy)
                              </span>
                              <span className="text-xs text-secondary">Left-to-Right Match</span>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {rule.identifierAttributes.map((attr, idx) => (
                                <span
                                  key={attr}
                                  className="px-2.5 py-1 rounded-md bg-surface border border-border text-foreground font-mono text-xs flex items-center gap-1.5 shadow-2xs"
                                >
                                  <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                  {attr}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Source Priority Hierarchy with reorder controls */}
                          <div className="space-y-2 p-3 bg-elevated/50 rounded-lg border border-border">
                            <div className="flex items-center justify-between">
                              <span className="text-muted font-bold uppercase text-xs tracking-wider">
                                Authoritative Source Precedence (Conflict Winner)
                              </span>
                              <span className="text-xs text-secondary">1 = Highest Priority</span>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {rule.sourcePriority.map((src, idx) => (
                                <div
                                  key={src}
                                  className="px-2.5 py-1 rounded-md bg-surface border border-border text-foreground font-medium text-xs flex items-center gap-1.5 shadow-2xs"
                                >
                                  <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-500 text-[10px] font-bold flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                  <span>{src}</span>
                                  {canEdit && (
                                    <div className="flex flex-col ml-1">
                                      <button
                                        disabled={idx === 0}
                                        onClick={() => handleMoveSource(rule.id, idx, "up")}
                                        className={cn(
                                          "text-muted hover:text-foreground transition-colors",
                                          idx === 0 && "opacity-30 cursor-not-allowed"
                                        )}
                                        title="Move source priority up"
                                      >
                                        <ChevronUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        disabled={idx === rule.sourcePriority.length - 1}
                                        onClick={() => handleMoveSource(rule.id, idx, "down")}
                                        className={cn(
                                          "text-muted hover:text-foreground transition-colors",
                                          idx === rule.sourcePriority.length - 1 && "opacity-30 cursor-not-allowed"
                                        )}
                                        title="Move source priority down"
                                      >
                                        <ChevronDown className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Per-Attribute Source Precedence (Screen 3, Item 1) */}
                        <div className="p-3 bg-elevated/40 rounded-lg border border-border space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-muted uppercase text-[10px] tracking-wider">
                              Per-Attribute Precedence Matrix
                            </span>
                            <span className="text-[10px] text-primary font-mono font-semibold">Authoritative Precedence</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                            <div className="p-2 rounded bg-surface border border-border space-y-0.5">
                              <span className="font-semibold text-foreground block">Hardware / Specs (RAM, CPU):</span>
                              <span className="text-muted font-mono text-[10px]">1st: AWS / Azure Hypervisor</span>
                            </div>
                            <div className="p-2 rounded bg-surface border border-border space-y-0.5">
                              <span className="font-semibold text-foreground block">OS Version & Kernel Patch:</span>
                              <span className="text-muted font-mono text-[10px]">1st: Dynatrace / CrowdStrike</span>
                            </div>
                            <div className="p-2 rounded bg-surface border border-border space-y-0.5">
                              <span className="font-semibold text-foreground block">Designated CI Owner:</span>
                              <span className="text-muted font-mono text-[10px]">1st: SSO / Active Directory</span>
                            </div>
                          </div>
                        </div>

                        {/* On Match & On Conflict Policy Fields (Screen 3 Improve) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-sunken/40 rounded-lg border border-border text-xs">
                          <div>
                            <span className="text-muted font-bold uppercase text-[10px] tracking-wider block">
                              On Match Policy
                            </span>
                            <span className="font-semibold text-foreground">
                              {rule.mergeAction || "Auto Merge"}
                            </span>
                            <span className="text-[11px] text-muted block mt-0.5">
                              Consolidates attributes into master record when identification keys match.
                            </span>
                          </div>
                          <div>
                            <span className="text-muted font-bold uppercase text-[10px] tracking-wider block">
                              On Conflict Policy
                            </span>
                            <span className="font-semibold text-foreground">
                              Authoritative Hierarchy (Ranked)
                            </span>
                            <span className="text-[11px] text-muted block mt-0.5">
                              Attribute collisions resolved via deterministic source rank. Manual values locked.
                            </span>
                          </div>
                        </div>

                        {/* Unranked Active Source Warning (Screen 3 Improve) */}
                        {(() => {
                          const activeSources = (discoverySources || []).filter((s) => s.status === "Active");
                          const unranked = activeSources.filter(
                            (s) =>
                              !rule.sourcePriority.some(
                                (p) =>
                                  p.toLowerCase().includes(s.type.toLowerCase()) ||
                                  p.toLowerCase().includes(s.name.toLowerCase())
                              )
                          );
                          if (unranked.length === 0) return null;
                          return (
                            <div className="p-2 rounded bg-warning/10 border border-warning/30 text-[11px] text-text-default flex items-center gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                              <span>
                                Warning: Active connector "{unranked[0].name}" ingests data for class "{rule.ciClass}" but is not ranked in this rule's source priority hierarchy. Fallback lowest rank applies.
                              </span>
                            </div>
                          );
                        })()}

                        <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-border text-muted">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-muted" />
                            <span>
                              Stale Identification Threshold:{" "}
                              <strong className="text-foreground">{rule.staleThreshold} days</strong> without discovery signal
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-emerald-500 font-medium">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Deterministic Deduplication Active</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: IRE REVIEW QUEUE (SIDE-BY-SIDE RECORD COMPARISON) */}
      {activeTab === "queue" && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-4 rounded-lg bg-surface border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">Active Discrepancies Requiring Review</span>
                <Badge variant="warning" size="sm">{pendingConflictCount} Unresolved</Badge>
              </div>
              <p className="text-xs text-muted">
                Incoming payloads from secondary discovery sources flagged attribute variances against existing CMDB items.
                Review the side-by-side winning values based on IRE source hierarchy.
              </p>
            </div>
            {!canEdit && (
              <div className="px-3 py-1.5 rounded bg-elevated border border-border text-xs text-muted">
                Role: Viewer (Read-only review mode)
              </div>
            )}
          </div>

          {/* Conflict Cards */}
          <div className="space-y-5">
            {reviewQueue.map((item) => (
              <Card
                key={item.id}
                className={cn(
                  "border transition-all",
                  item.status === "Pending" ? "border-border shadow-xs" : "border-border/60 opacity-75"
                )}
              >
                <CardHeader className="bg-surface/60 py-3 px-4 border-b border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-warning/15 text-warning flex items-center justify-center font-mono text-xs font-bold shrink-0">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-secondary">{item.id}</span>
                          <span className="text-muted">•</span>
                          <Link
                            href={`/cis/${item.ciId}`}
                            className="font-mono text-xs font-bold text-primary hover:underline"
                          >
                            {item.ciId}
                          </Link>
                          <Badge variant="blue" size="sm">{item.ciClass}</Badge>
                          <Badge
                            variant={
                              item.status === "Pending"
                                ? "warning"
                                : item.status === "Merged"
                                ? "success"
                                : "neutral"
                            }
                            size="sm"
                          >
                            {item.status}
                          </Badge>
                        </div>
                        <CardTitle className="mt-1 text-base font-bold">{item.ciName}</CardTitle>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs uppercase font-bold text-muted">Match Confidence</div>
                        <div className="text-sm font-mono font-bold text-emerald-500 tabular-nums">
                          {item.confidence}% Match
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {/* Source Comparison Header */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm bg-elevated/40 p-3.5 rounded-lg border border-border">
                    <div className="space-y-1">
                      <div className="text-xs uppercase font-bold text-muted">Source A (Current CMDB Record)</div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{item.sourceA.name}</span>
                        <Badge variant="blue" size="sm">Precedence Rank #{item.sourceA.rank}</Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs uppercase font-bold text-muted">Source B (Incoming Payload)</div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{item.sourceB.name}</span>
                        <Badge variant="neutral" size="sm">Precedence Rank #{item.sourceB.rank}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Side-by-side Attribute Diff Table */}
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-elevated/60 text-muted font-bold text-xs uppercase border-b border-border">
                          <th className="py-3 px-3.5">Attribute</th>
                          <th className="py-3 px-3.5">{item.sourceA.name}</th>
                          <th className="py-3 px-3.5">{item.sourceB.name}</th>
                          <th className="py-3 px-3.5">IRE Winner & Justification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {item.fields.map((f) => (
                          <tr key={f.attribute} className="hover:bg-elevated/30">
                            <td className="py-2.5 px-3.5 font-medium text-foreground whitespace-nowrap text-sm">
                              {f.attribute}
                            </td>
                            <td
                              className={cn(
                                "py-2.5 px-3.5 font-mono text-xs sm:text-sm",
                                f.winner === "A" ? "text-emerald-500 font-semibold bg-emerald-500/5" : "text-muted"
                              )}
                            >
                              <div className="flex items-center gap-1.5">
                                {f.winner === "A" && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                <span>{f.valueA}</span>
                              </div>
                            </td>
                            <td
                              className={cn(
                                "py-2.5 px-3.5 font-mono text-xs sm:text-sm",
                                f.winner === "B" ? "text-emerald-500 font-semibold bg-emerald-500/5" : "text-muted"
                              )}
                            >
                              <div className="flex items-center gap-1.5">
                                {f.winner === "B" && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                <span>{f.valueB}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3.5 text-xs sm:text-sm text-secondary">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={f.winner === "A" ? "blue" : "teal"} size="sm">
                                  Winner: Source {f.winner}
                                </Badge>
                                <span className="text-xs text-muted">{f.reason}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions Bar */}
                  {item.status === "Pending" && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                      <div className="text-xs text-muted">
                        Select action to apply automated reconciliation rule winners:
                      </div>

                      {canApprove ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<Ban className="w-3.5 h-3.5" />}
                            onClick={() => handleResolveConflict(item.id, "Reject")}
                          >
                            Reject Payload
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<Split className="w-3.5 h-3.5" />}
                            onClick={() => handleResolveConflict(item.id, "Split")}
                          >
                            Keep Separate
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                            onClick={() => handleResolveConflict(item.id, "Merge")}
                          >
                            Merge Record
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted italic">Approval permissions required: resolution disabled</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TEST-A-MATCH SCRATCHPAD (Screen 3 Improve) */}
      {activeTab === "scratchpad" && (
        <div className="space-y-6">
          <Card className="p-4 bg-surface border border-border">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  Test-a-Match IRE Simulation Scratchpad
                </h3>
              </div>
              <p className="text-xs text-muted">
                Input two arbitrary telemetry payloads to test identification matching rules, key resolution, and attribute-level precedence rankings before deploying rules to production.
              </p>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Record A */}
            <Card className="p-4 bg-surface border border-border space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="font-bold text-xs uppercase text-primary">Sample Record A</span>
                <Badge variant="blue" size="xs">Incoming Connector</Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-muted block mb-0.5">Source Name</label>
                  <Input
                    value={scratchRecordA.source}
                    onChange={(e) => setScratchRecordA({ ...scratchRecordA, source: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted block mb-0.5">Hostname (FQDN)</label>
                  <Input
                    value={scratchRecordA.hostname}
                    onChange={(e) => setScratchRecordA({ ...scratchRecordA, hostname: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted block mb-0.5">IP Address</label>
                  <Input
                    value={scratchRecordA.ipAddress}
                    onChange={(e) => setScratchRecordA({ ...scratchRecordA, ipAddress: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted block mb-0.5">MAC Address (Identifier Key)</label>
                  <Input
                    value={scratchRecordA.macAddress}
                    onChange={(e) => setScratchRecordA({ ...scratchRecordA, macAddress: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted block mb-0.5">Serial Number (Identifier Key)</label>
                  <Input
                    value={scratchRecordA.serialNumber}
                    onChange={(e) => setScratchRecordA({ ...scratchRecordA, serialNumber: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-muted block mb-0.5">RAM Capacity (GB)</label>
                    <Input
                      value={scratchRecordA.ramGb}
                      onChange={(e) => setScratchRecordA({ ...scratchRecordA, ramGb: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted block mb-0.5">OS & Kernel Version</label>
                    <Input
                      value={scratchRecordA.osVersion}
                      onChange={(e) => setScratchRecordA({ ...scratchRecordA, osVersion: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Record B */}
            <Card className="p-4 bg-surface border border-border space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="font-bold text-xs uppercase text-amber-500">Sample Record B</span>
                <Badge variant="warning" size="xs">Discovered Telemetry</Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-muted block mb-0.5">Source Name</label>
                  <Input
                    value={scratchRecordB.source}
                    onChange={(e) => setScratchRecordB({ ...scratchRecordB, source: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted block mb-0.5">Hostname (FQDN)</label>
                  <Input
                    value={scratchRecordB.hostname}
                    onChange={(e) => setScratchRecordB({ ...scratchRecordB, hostname: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted block mb-0.5">IP Address</label>
                  <Input
                    value={scratchRecordB.ipAddress}
                    onChange={(e) => setScratchRecordB({ ...scratchRecordB, ipAddress: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted block mb-0.5">MAC Address (Identifier Key)</label>
                  <Input
                    value={scratchRecordB.macAddress}
                    onChange={(e) => setScratchRecordB({ ...scratchRecordB, macAddress: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted block mb-0.5">Serial Number (Identifier Key)</label>
                  <Input
                    value={scratchRecordB.serialNumber}
                    onChange={(e) => setScratchRecordB({ ...scratchRecordB, serialNumber: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-muted block mb-0.5">RAM Capacity (GB)</label>
                    <Input
                      value={scratchRecordB.ramGb}
                      onChange={(e) => setScratchRecordB({ ...scratchRecordB, ramGb: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted block mb-0.5">OS & Kernel Version</label>
                    <Input
                      value={scratchRecordB.osVersion}
                      onChange={(e) => setScratchRecordB({ ...scratchRecordB, osVersion: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex justify-center">
            <Button
              size="md"
              variant="primary"
              onClick={handleEvaluateScratchpad}
              leftIcon={<Play className="w-4 h-4" />}
            >
              Evaluate Match &amp; Source Precedence
            </Button>
          </div>

          {/* Evaluation Results */}
          {scratchResult && (
            <Card className="p-4 bg-surface border border-border shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <div>
                    <span className="font-bold text-sm text-foreground">
                      Match Confirmed: {scratchResult.rule.name} ({scratchResult.rule.id})
                    </span>
                    <span className="text-xs text-muted block">
                      Resolved via Identity Key: <strong className="font-mono text-primary">{scratchResult.matchKey}</strong>
                    </span>
                  </div>
                </div>
                <Badge variant="success" size="sm">Rule Auto-Merge Applicable</Badge>
              </div>

              {/* Attributes Comparison Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left divide-y divide-border/60">
                  <thead className="bg-sunken text-muted uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="px-3 py-2.5">Attribute</th>
                      <th className="px-3 py-2.5">Record A ({scratchRecordA.source})</th>
                      <th className="px-3 py-2.5">Record B ({scratchRecordB.source})</th>
                      <th className="px-3 py-2.5">Precedence Winner</th>
                      <th className="px-3 py-2.5">Winning Value</th>
                      <th className="px-3 py-2.5">Rule Justification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono">
                    {scratchResult.attributes.map((attr: any) => (
                      <tr key={attr.name} className="hover:bg-sunken/40">
                        <td className="px-3 py-2.5 font-bold text-foreground font-sans">{attr.name}</td>
                        <td className="px-3 py-2.5 text-secondary">{attr.valA}</td>
                        <td className="px-3 py-2.5 text-secondary">{attr.valB}</td>
                        <td className="px-3 py-2.5 text-foreground font-sans font-semibold">
                          <span className={attr.winner.includes("AWS") ? "text-primary" : attr.winner.includes("Dynatrace") ? "text-emerald-500" : "text-muted"}>
                            {attr.winner}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-bold text-primary">{attr.winningVal}</td>
                        <td className="px-3 py-2.5 text-[11px] text-muted font-sans">{attr.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-sunken/50 rounded-lg border border-border text-xs text-muted space-y-1">
                <p className="font-semibold text-foreground">
                  🛡️ Manual Value Protection Policy (Immutable Lock):
                </p>
                <p className="text-[11px] leading-relaxed">
                  If an attribute was previously manually edited by an authorized CI Owner or CMDB Manager, it is assigned the highest authoritative precedence (Rank 0) and cannot be modified by automated connector runs.
                </p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Add Rule Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Create Reconciliation & Identification Rule"
        description="Establish identity attributes and source ranking for automated correlation."
        maxWidth="lg"
      >
        <form onSubmit={handleAddRule} className="space-y-4">
          <Input
            label="Rule Name"
            placeholder="e.g. AWS & CrowdStrike Server Deduplication Matrix"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Applies to CI Class"
              value={ciClass}
              onChange={(e) => setCiClass(e.target.value as any)}
            >
              {CI_CLASSES.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </Select>

            <Select
              label="Conflict Merge Action"
              value={mergeAction}
              onChange={(e) => setMergeAction(e.target.value as any)}
            >
              <option value="Auto Merge">Auto Merge (Precedence Winner)</option>
              <option value="Require Approval">Require Approval (Human in Loop)</option>
              <option value="Overwrite">Overwrite (Always Take Discovered)</option>
              <option value="Create Alias">Create Alias (Keep Separate)</option>
            </Select>
          </div>

          <Input
            label="Ordered Identifier Attributes (Comma-separated)"
            placeholder="serialNumber, macAddress, fqdn, cloudResourceId"
            value={identifiers}
            onChange={(e) => setIdentifiers(e.target.value)}
            helperText="Fields evaluated from left to right for positive identity match."
            required
          />

          <Input
            label="Authoritative Source Ranking (Comma-separated from highest to lowest)"
            placeholder="AWS Discovery Connector, CrowdStrike Falcon Sensor, ServiceNow Bridge"
            value={sources}
            onChange={(e) => setSources(e.target.value)}
            helperText="Higher priority source attributes overwrite lower ranked sources."
            required
          />

          <Input
            label="Stale Threshold (Days)"
            type="number"
            value={staleThreshold}
            onChange={(e) => setStaleThreshold(e.target.value)}
            required
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Rule
            </Button>
          </div>
        </form>
      </Modal>

      {/* Dry-Run Match Simulation Modal (Screen 3, Item 6) */}
      {simulatingRule && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-modal max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  Dry-Run Simulation: {simulatingRule.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSimulatingRule(null)}
                className="text-muted hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-900 dark:text-emerald-200 space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                Simulation Succeeded (Computed from Estate Inventory)
              </div>
              <p className="text-[11px] leading-relaxed">
                Projected impact: Activating this rule version{" "}
                <strong>
                  would modify {simResult?.attributesModified ?? 0} attributes across {simResult?.matchedCIs ?? 0} CIs
                </strong>{" "}
                in production with 0 breaking collisions. {simResult?.conflictsDetected ?? 0} variances will be automatically routed to the IRE Review Queue.
              </p>
            </div>

            <div className="p-3 bg-elevated rounded-lg border border-border font-mono text-[11px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted">Target Class:</span>
                <span className="text-foreground font-bold">{simulatingRule.ciClass}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Total Estate CIs Evaluated:</span>
                <span className="text-foreground font-bold">{cis?.length ?? 39} CIs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Identified Matching CIs:</span>
                <span className="text-emerald-600 font-bold">
                  {simResult?.matchedCIs ?? 0} CIs ({Math.round(((simResult?.matchedCIs ?? 0) / Math.max(1, cis?.length ?? 39)) * 100)}% match rate)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Attributes Precedence Modified:</span>
                <span className="text-primary font-bold">{simResult?.attributesModified ?? 0} attributes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Discrepancies to Review Queue:</span>
                <span className="text-amber-600 font-bold">{simResult?.conflictsDetected ?? 0} items</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setSimulatingRule(null)}>
                Close Simulation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
