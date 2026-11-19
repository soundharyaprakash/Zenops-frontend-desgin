import {
  DataQualityTask,
  DataQualityStatus,
  CIItem,
  CIAuditHistory,
} from "@/types/cmdb";

// ============================================================================
// 1. SEVERITY SCHEME (Priority 1, Item 2)
// One shared severity scheme with strong color + icon per level.
// Critical > High > Medium > Low. Critical is never light grey.
// ============================================================================
export interface SeverityConfig {
  key: "Critical" | "High" | "Medium" | "Low";
  label: string;
  rank: number; // 0 is highest priority
  color: string;
  badgeVariant: "danger" | "warning" | "info" | "neutral";
  borderClass: string;
  bgClass: string;
  textClass: string;
  ringClass: string;
  iconName: "AlertOctagon" | "AlertTriangle" | "Info" | "Shield";
  description: string;
}

export const DQ_SEVERITY_LEVELS: Record<"Critical" | "High" | "Medium" | "Low", SeverityConfig> = {
  Critical: {
    key: "Critical",
    label: "Critical",
    rank: 0,
    color: "#DC2626",
    badgeVariant: "danger",
    borderClass: "border-red-500/50 dark:border-red-500/40",
    bgClass: "bg-red-500/10 dark:bg-red-500/15",
    textClass: "text-red-700 dark:text-red-400 font-bold",
    ringClass: "ring-2 ring-red-500/30",
    iconName: "AlertOctagon",
    description: "High-impact data defect causing severe Trust Score penalty & compliance breach",
  },
  High: {
    key: "High",
    label: "High",
    rank: 1,
    color: "#D97706",
    badgeVariant: "warning",
    borderClass: "border-amber-500/50 dark:border-amber-500/40",
    bgClass: "bg-amber-500/10 dark:bg-amber-500/15",
    textClass: "text-amber-700 dark:text-amber-400 font-semibold",
    ringClass: "ring-1 ring-amber-500/20",
    iconName: "AlertTriangle",
    description: "Elevated risk defect affecting reconciliation or operational freshness",
  },
  Medium: {
    key: "Medium",
    label: "Medium",
    rank: 2,
    color: "#2563EB",
    badgeVariant: "info",
    borderClass: "border-blue-500/50 dark:border-blue-500/40",
    bgClass: "bg-blue-500/10 dark:bg-blue-500/15",
    textClass: "text-blue-700 dark:text-blue-400 font-medium",
    ringClass: "ring-1 ring-blue-500/20",
    iconName: "Info",
    description: "Moderate issue requiring steward review or attribute alignment",
  },
  Low: {
    key: "Low",
    label: "Low",
    rank: 3,
    color: "#64748B",
    badgeVariant: "neutral",
    borderClass: "border-slate-500/40 dark:border-slate-500/30",
    bgClass: "bg-slate-500/10 dark:bg-slate-500/15",
    textClass: "text-slate-700 dark:text-slate-400",
    ringClass: "ring-0",
    iconName: "Shield",
    description: "Minor informational discrepancy or non-critical alias match",
  },
};

// ============================================================================
// 2. CATEGORY DEFINITIONS (Priority 4, Item 17)
// Canonical category names: Missing Owner, Stale Discovery, Attribute Conflict,
// Duplicate Suspect, Compliance Mismatch.
// ============================================================================
export type DQCategoryTab =
  | "all"
  | "missing-owner"
  | "stale"
  | "conflicts"
  | "duplicates"
  | "compliance";

export interface DQCategorySpec {
  id: DQCategoryTab;
  canonicalName: string;
  issueTypes: string[];
  isBulkApplyAllowed: boolean;
  bulkExclusionReason?: string;
  pillarName: "freshness" | "completeness" | "consistency" | "topology" | "ownership" | "compliance";
  formulaWeight: number; // points in Trust Score formula
  description: string;
}

export const DQ_CATEGORIES: Record<string, DQCategorySpec> = {
  "missing-owner": {
    id: "missing-owner",
    canonicalName: "Missing Owner",
    issueTypes: ["Missing Required Ownership", "Unassigned Support Group"],
    isBulkApplyAllowed: false,
    bulkExclusionReason: "Ownership assignment requires explicit owner acceptance ('Awaiting owner acceptance').",
    pillarName: "ownership",
    formulaWeight: 25, // 10 pts ownership + 15 pts completeness
    description: "Operational CIs lacking technical owner or support team assignment",
  },
  "stale": {
    id: "stale",
    canonicalName: "Stale Discovery",
    issueTypes: ["Stale Discovery"],
    isBulkApplyAllowed: true,
    pillarName: "freshness",
    formulaWeight: 30, // 30 pts freshness
    description: "Assets with no discovery heartbeat for >14 days",
  },
  "conflicts": {
    id: "conflicts",
    canonicalName: "Attribute Conflict",
    issueTypes: ["Attribute Conflict"],
    isBulkApplyAllowed: true,
    pillarName: "consistency",
    formulaWeight: 20, // 20 pts consistency
    description: "Conflicting data points between authoritative ingestion sources",
  },
  "duplicates": {
    id: "duplicates",
    canonicalName: "Duplicate Suspect",
    issueTypes: ["Duplicate Suspect"],
    isBulkApplyAllowed: true,
    pillarName: "consistency",
    formulaWeight: 20, // 20 pts consistency
    description: "CIs sharing matching MAC, IP, or serial numbers pending IRE reconciliation",
  },
  "compliance": {
    id: "compliance",
    canonicalName: "Compliance Mismatch",
    issueTypes: ["Compliance Mismatch"],
    isBulkApplyAllowed: false,
    bulkExclusionReason: "Compliance fixes require linked audit evidence document and a named human approver sign-off.",
    pillarName: "compliance",
    formulaWeight: 10, // 10 pts governance flag
    description: "Assets missing mandatory security compliance or regulatory tags (NIST, SOC2, PCI-DSS)",
  },
};

export const CANONICAL_CATEGORY_LIST: DQCategorySpec[] = Object.values(DQ_CATEGORIES);

// ============================================================================
// 3. TRUST SCORE GAIN CALCULATIONS (Priority 3, Item 9)
// Freshness 30, Completeness 25, Consistency 20, Topology 15, Owner 10
// ============================================================================
export function calculateTaskScoreGain(task: Pick<DataQualityTask, "issueType">): number {
  switch (task.issueType) {
    case "Stale Discovery":
      return 30; // Freshness pillar (30%)
    case "Missing Required Ownership":
    case "Unassigned Support Group":
      return 25; // Ownership (10%) + Completeness attribute (15%)
    case "Attribute Conflict":
      return 20; // Consistency pillar (20%)
    case "Duplicate Suspect":
      return 20; // Consistency pillar (20%)
    case "Compliance Mismatch":
      return 10; // Compliance governance weight
    default:
      return 15;
  }
}

export function calculateCombinedCIEffect(
  tasks: DataQualityTask[],
  currentScore = 45
): {
  individualGains: { taskId: string; gain: number; pillar: string }[];
  totalGain: number;
  newScore: number;
} {
  const gains = tasks.map((t) => {
    const gain = calculateTaskScoreGain(t);
    let pillar = "Trust Pillar";
    if (t.issueType === "Stale Discovery") pillar = "Freshness (30%)";
    else if (t.issueType.includes("Ownership")) pillar = "Ownership & Completeness (25%)";
    else if (t.issueType.includes("Conflict") || t.issueType.includes("Duplicate")) pillar = "Consistency (20%)";
    else if (t.issueType.includes("Compliance")) pillar = "Governance (10%)";
    return { taskId: t.id, gain, pillar };
  });

  const sumGain = gains.reduce((acc, g) => acc + g.gain, 0);
  const newScore = Math.min(95, currentScore + sumGain);
  const actualEffectiveGain = newScore - currentScore;

  return {
    individualGains: gains,
    totalGain: actualEffectiveGain,
    newScore,
  };
}

// ============================================================================
// 4. BULK APPLY SAFETY EVALUATION (Priority 2, Item 3)
// Bulk apply >= X% MUST exclude ownership, retirement, and compliance fixes.
// Only low-risk categories (conflicts, duplicates, safe stale sync) allowed.
// ============================================================================
export const DEFAULT_BULK_CONFIDENCE_THRESHOLD = 85;

export interface BulkApplyEvaluation {
  threshold: number;
  eligibleTasks: DataQualityTask[];
  excludedTasks: {
    task: DataQualityTask;
    reason: string;
  }[];
  canBulkApply: boolean;
}

export function evaluateBulkApply(
  tasks: DataQualityTask[],
  threshold: number = DEFAULT_BULK_CONFIDENCE_THRESHOLD
): BulkApplyEvaluation {
  const eligibleTasks: DataQualityTask[] = [];
  const excludedTasks: { task: DataQualityTask; reason: string }[] = [];

  const pendingTasks = tasks.filter((t) => t.status === "Pending");

  for (const task of pendingTasks) {
    // 1. Check confidence threshold
    if (task.confidence < threshold) {
      excludedTasks.push({
        task,
        reason: `Confidence (${task.confidence}%) is below configured threshold (${threshold}%).`,
      });
      continue;
    }

    // 2. Safety exclusion: Ownership assignment
    if (
      task.issueType === "Missing Required Ownership" ||
      task.issueType === "Unassigned Support Group"
    ) {
      excludedTasks.push({
        task,
        reason: "Excluded by Safety Policy: Ownership assignment requires explicit proposed owner acceptance.",
      });
      continue;
    }

    // 3. Safety exclusion: Compliance fixes
    if (task.issueType === "Compliance Mismatch") {
      excludedTasks.push({
        task,
        reason: "Excluded by Safety Policy: Compliance fixes require linked audit evidence document and a named human approver sign-off.",
      });
      continue;
    }

    // 4. Safety exclusion: Retirement actions
    const hasRetirementChoice = task.alternativeFixes?.some((f) => f.actionType === "retire");
    if (hasRetirementChoice) {
      excludedTasks.push({
        task,
        reason: "Excluded by Safety Policy: Alternative retirement choice requires explicit operator confirmation.",
      });
      continue;
    }

    // Allowed low-risk categories
    eligibleTasks.push(task);
  }

  return {
    threshold,
    eligibleTasks,
    excludedTasks,
    canBulkApply: eligibleTasks.length > 0,
  };
}

// ============================================================================
// 5. DISMISS REASONS (Priority 2, Item 8)
// Dismiss requires a selected category + free text justification.
// ============================================================================
export const DISMISSAL_REASONS = [
  "False Positive Detection",
  "Decommissioned / Ghost Asset",
  "Accepted Governance Exception (Policy Waiver)",
  "Duplicate Detection Rule",
  "Temporary Maintenance Mode",
  "Other",
] as const;

export type DismissalReasonCategory = (typeof DISMISSAL_REASONS)[number];

// ============================================================================
// 6. SINGLE AUDIT-LOGGING HELPER (RBAC readiness)
// Single audit logging function for all apply, approve, dismiss and bulk actions.
// ============================================================================
export interface LogDataQualityAuditParams {
  who: string;
  role: string;
  taskId: string;
  ciId: string;
  ciName: string;
  fieldChanged: string;
  beforeValue: string;
  afterValue: string;
  action: "Apply" | "Approve" | "Dismiss" | "BulkApply" | "AcceptOwnership";
  reason?: string;
  evidenceRef?: string;
}

export function createDataQualityAuditRecord(
  params: LogDataQualityAuditParams
): CIAuditHistory {
  return {
    id: `AUD-DQ-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    ciId: params.ciId,
    ciName: params.ciName,
    fieldChanged: params.fieldChanged,
    beforeValue: params.beforeValue,
    afterValue: params.afterValue,
    changedBy: `${params.who} (${params.role})`,
    timestamp: new Date().toISOString(),
    changeRecord: params.reason ? `DQ Task ${params.taskId}: ${params.reason}` : `DQ Task ${params.taskId} resolved via ${params.action}`,
    changeType: params.action === "Dismiss" ? "Reconcile" : "Update",
  };
}

// ============================================================================
// 7. TASK SYNCHRONIZER & ENRICHER (Priority 3, Item 12 & Priority 4)
// Ensures every flagged CI in the active tenant has a task.
// Enriches tasks with diffs, due dates, approvers, and confidence explanations.
// ============================================================================
export function enrichAndReconcileTasks(
  existingTasks: DataQualityTask[],
  cis: CIItem[]
): DataQualityTask[] {
  const now = Date.now();
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

  // Clone existing tasks map by ID
  const taskMap = new Map<string, DataQualityTask>();
  existingTasks.forEach((t) => taskMap.set(t.id, { ...t }));

  // Helper to enrich a task with before/after diffs, dates, and explanations
  const enrich = (task: DataQualityTask): DataQualityTask => {
    const enriched = { ...task };

    // Score gain
    if (!enriched.scoreGain) {
      enriched.scoreGain = calculateTaskScoreGain(enriched);
    }

    // Due date (default to 7 days from creation or specific relative time)
    if (!enriched.dueDate) {
      const createdTime = new Date(enriched.createdAt).getTime();
      const dueTime = isNaN(createdTime) ? now + 3 * 86400000 : createdTime + 7 * 86400000;
      enriched.dueDate = new Date(dueTime).toISOString().split("T")[0];
    }

    // Specific enrichments per task
    if (enriched.id === "DQ-201" || enriched.issueType === "Missing Required Ownership") {
      enriched.confidenceBasis = "Based on Git commit history and repository CODEOWNERS rules";
      enriched.approver = enriched.approver || "Sarah Jenkins";
      enriched.approverRole = "Governance Lead · Enterprise Architecture";
      enriched.proposedOwner = enriched.proposedOwner || {
        name: "David Chen",
        team: "Core Infrastructure & Cloud Ops",
        email: "dchen@zenops.io",
      };
      if (!enriched.diff) {
        enriched.diff = {
          field: "Owner",
          before: "Unassigned",
          after: "David Chen (Enterprise Architect)",
        };
      }
    } else if (enriched.id === "DQ-202" || enriched.issueType === "Stale Discovery") {
      enriched.confidenceBasis = "Based on hypervisor pulse & AWS CloudWatch telemetry inactivity";
      enriched.approver = enriched.approver || "Marcus Vance";
      enriched.approverRole = "Core Infrastructure & Cloud Ops Lead";
      if (!enriched.diff) {
        enriched.diff = {
          field: "Telemetry Sync",
          before: "Stale (>14d quiet)",
          after: "Active Ping Probe & Sensor Sync",
        };
      }
      if (!enriched.alternativeFixes || enriched.alternativeFixes.length === 0) {
        enriched.alternativeFixes = [
          {
            id: "sync",
            label: "Re-enable Sync Sensor (Recommended)",
            description: "Trigger active ping probe and re-enable ServiceNow sync connector",
            actionType: "remediate",
          },
          {
            id: "retire",
            label: "Mark for Retirement",
            description: "Decommission CI, archive golden record, and release IP bindings",
            actionType: "retire",
            isDestructive: true,
          },
        ];
      }
    } else if (enriched.id === "DQ-203" || enriched.issueType === "Attribute Conflict") {
      enriched.confidenceBasis = "Based on authoritative CrowdStrike Falcon sensor precedence";
      enriched.approver = enriched.approver || "David Chen";
      enriched.approverRole = "Enterprise Architect";
      if (!enriched.diff) {
        enriched.diff = {
          field: "Operating System",
          before: "Amazon Linux 2022 (AWS Descriptor)",
          after: "Amazon Linux 2023.4 (CrowdStrike Sensor)",
        };
      }
    } else if (enriched.id === "DQ-204" || enriched.issueType === "Duplicate Suspect") {
      enriched.confidenceBasis = "Based on IRE exact MAC address & management IP match rules";
      enriched.approver = enriched.approver || "Priya Sharma";
      enriched.approverRole = "Lead Database Administrator";
      if (!enriched.diff) {
        enriched.diff = {
          field: "CI Record Status",
          before: "Isolated Duplicate Record",
          after: "Linked Alias of Redis-QA-Shared",
        };
      }
    } else if (enriched.id === "DQ-205" || enriched.issueType === "Compliance Mismatch") {
      enriched.confidenceBasis = "Based on Equinix DC1 SOC2 / NIST-800-53 security certification checklist";
      enriched.approver = enriched.approver || "Amara Okafor";
      enriched.approverRole = "Compliance & Security Officer · GRC";
      enriched.evidenceRef = enriched.evidenceRef || "https://vault.zenops.io/compliance/SOC2_Equinix_DC1_Certification_2026.pdf";
      if (!enriched.diff) {
        enriched.diff = {
          field: "Compliance Flags",
          before: "None (Uncertified)",
          after: "NIST-800-53 (Active Security Standard)",
        };
      }
    }

    return enriched;
  };

  // 1. Enrich existing tasks
  taskMap.forEach((task, id) => {
    taskMap.set(id, enrich(task));
  });

  // 2. Detection completeness: scan CIs to ensure every flagged CI has a task (Priority 3, Item 12)
  cis.forEach((ci) => {
    // Check missing owner
    const isMissingOwner = !ci.owner || ci.owner.trim() === "" || ci.owner.trim().toLowerCase() === "unassigned";
    if (isMissingOwner) {
      const hasOwnerTask = Array.from(taskMap.values()).some(
        (t) => (t.ciId === ci.id || t.ciName === ci.name) && t.issueType === "Missing Required Ownership"
      );
      if (!hasOwnerTask) {
        const taskId = `DQ-OWN-${ci.id}`;
        taskMap.set(
          taskId,
          enrich({
            id: taskId,
            ciId: ci.id,
            ciName: ci.name,
            ciClass: ci.ciClass || "Server/VM",
            issueType: "Missing Required Ownership",
            proposedFix: `Assign primary technical owner to 'David Chen (Enterprise Architect)' based on CODEOWNERS rules.`,
            confidence: 92,
            approver: "Sarah Jenkins",
            approverRole: "Governance Lead · Enterprise Architecture",
            status: "Pending",
            severity: "Critical",
            createdAt: new Date(now - 3 * 86400000).toISOString(),
            proposedOwner: {
              name: "David Chen",
              team: ci.supportGroup || "Core Infrastructure & Cloud Ops",
              email: "dchen@zenops.io",
            },
            diff: {
              field: "Owner",
              before: "Unassigned",
              after: "David Chen (Enterprise Architect)",
            },
          })
        );
      }
    }

    // Check stale discovery
    let isStale = false;
    if (!ci.lastDiscovered) {
      isStale = true;
    } else {
      const time = new Date(ci.lastDiscovered).getTime();
      if (isNaN(time) || now - time > FOURTEEN_DAYS_MS) {
        isStale = true;
      }
    }

    if (isStale) {
      const hasStaleTask = Array.from(taskMap.values()).some(
        (t) => (t.ciId === ci.id || t.ciName === ci.name) && t.issueType === "Stale Discovery"
      );
      if (!hasStaleTask) {
        const taskId = `DQ-STL-${ci.id}`;
        taskMap.set(
          taskId,
          enrich({
            id: taskId,
            ciId: ci.id,
            ciName: ci.name,
            ciClass: ci.ciClass || "Server/VM",
            issueType: "Stale Discovery",
            proposedFix: `Trigger active ping probe and re-enable automated connector telemetry sync.`,
            confidence: 88,
            approver: "Marcus Vance",
            approverRole: "Core Infrastructure & Cloud Ops Lead",
            status: "Pending",
            severity: "High",
            createdAt: new Date(now - 5 * 86400000).toISOString(),
            diff: {
              field: "Telemetry Sync",
              before: "Stale (>14d quiet)",
              after: "Active Ping Probe & Sensor Sync",
            },
            alternativeFixes: [
              {
                id: "sync",
                label: "Re-enable Sync Sensor (Recommended)",
                description: "Trigger active ping probe and re-enable connector telemetry",
                actionType: "remediate",
              },
              {
                id: "retire",
                label: "Mark for Retirement",
                description: "Decommission CI and release IP/VPC bindings",
                actionType: "retire",
                isDestructive: true,
              },
            ],
          })
        );
      }
    }
  });

  return Array.from(taskMap.values());
}
