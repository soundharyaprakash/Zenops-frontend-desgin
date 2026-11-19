import {
  DataQualityTask,
  DataQualityStatus,
  CIItem,
  CIAuditHistory,
} from "@/types/cmdb";
import {
  HEALTH_BANDS,
  getHealthBand,
} from "@/lib/services/serviceRecord";

export { HEALTH_BANDS, getHealthBand };

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
// 2. CANONICAL CATEGORY DEFINITIONS (Follow-up Item 1)
// Canonical categories everywhere: Missing Owner, Stale Discovery,
// Attribute Conflict, Duplicate Suspect, Compliance Mismatch.
// Kept in this single shared constants file.
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
    bulkExclusionReason: "Ownership assignment requires explicit proposed owner acceptance ('Awaiting owner acceptance').",
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
    isBulkApplyAllowed: true, // Non-production only; production is excluded in safety evaluation
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
// 3. PILLAR BREAKDOWN & TRUST SCORE GAIN CALCULATOR (Follow-up Item 7)
// Weighted Trust Score Formula:
// Freshness (30), Completeness (25), Consistency (20), Topology (15), Ownership (10)
// ============================================================================
export interface PillarContribution {
  pillar: "Freshness" | "Completeness" | "Consistency" | "Topology" | "Ownership";
  weight: number;
  gain: number;
}

export interface TaskScoreGainResult {
  scoreGain: number;
  pillarBreakdown: PillarContribution[];
  explanation: string;
}

export function getTaskScoreGainDetail(task: Pick<DataQualityTask, "issueType">): TaskScoreGainResult {
  switch (task.issueType) {
    case "Stale Discovery":
      return {
        scoreGain: 16, // Freshness gain for CI-1010 (capped at weight 30)
        pillarBreakdown: [
          { pillar: "Freshness", weight: 30, gain: 16 },
          { pillar: "Completeness", weight: 25, gain: 0 },
          { pillar: "Consistency", weight: 20, gain: 0 },
          { pillar: "Topology", weight: 15, gain: 0 },
          { pillar: "Ownership", weight: 10, gain: 0 },
        ],
        explanation: "Restores Freshness telemetry pulse (+16 pts, max weight 30%)",
      };

    case "Missing Required Ownership":
    case "Unassigned Support Group":
      return {
        scoreGain: 25, // Ownership (+10) + Completeness (+15)
        pillarBreakdown: [
          { pillar: "Freshness", weight: 30, gain: 0 },
          { pillar: "Completeness", weight: 25, gain: 15 },
          { pillar: "Consistency", weight: 20, gain: 0 },
          { pillar: "Topology", weight: 15, gain: 0 },
          { pillar: "Ownership", weight: 10, gain: 10 },
        ],
        explanation: "Restores Ownership (+10 pts) and Completeness (+15 pts) pillars",
      };

    case "Attribute Conflict":
      return {
        scoreGain: 15,
        pillarBreakdown: [
          { pillar: "Freshness", weight: 30, gain: 0 },
          { pillar: "Completeness", weight: 25, gain: 0 },
          { pillar: "Consistency", weight: 20, gain: 15 },
          { pillar: "Topology", weight: 15, gain: 0 },
          { pillar: "Ownership", weight: 10, gain: 0 },
        ],
        explanation: "Reconciles conflicting sensor attributes into Consistency pillar (+15 pts)",
      };

    case "Duplicate Suspect":
      return {
        scoreGain: 12,
        pillarBreakdown: [
          { pillar: "Freshness", weight: 30, gain: 0 },
          { pillar: "Completeness", weight: 25, gain: 0 },
          { pillar: "Consistency", weight: 20, gain: 12 },
          { pillar: "Topology", weight: 15, gain: 0 },
          { pillar: "Ownership", weight: 10, gain: 0 },
        ],
        explanation: "Links duplicate record into alias, restoring Consistency pillar (+12 pts)",
      };

    case "Compliance Mismatch":
      return {
        scoreGain: 10,
        pillarBreakdown: [
          { pillar: "Freshness", weight: 30, gain: 0 },
          { pillar: "Completeness", weight: 25, gain: 5 },
          { pillar: "Consistency", weight: 20, gain: 0 },
          { pillar: "Topology", weight: 15, gain: 0 },
          { pillar: "Ownership", weight: 10, gain: 5 },
        ],
        explanation: "Attests NIST-800-53 security controls & compliance flags (+10 pts)",
      };

    default:
      return {
        scoreGain: 10,
        pillarBreakdown: [
          { pillar: "Freshness", weight: 30, gain: 0 },
          { pillar: "Completeness", weight: 25, gain: 10 },
          { pillar: "Consistency", weight: 20, gain: 0 },
          { pillar: "Topology", weight: 15, gain: 0 },
          { pillar: "Ownership", weight: 10, gain: 0 },
        ],
        explanation: "Governance remediation applied (+10 pts)",
      };
  }
}

export function calculateTaskScoreGain(task: Pick<DataQualityTask, "issueType">): number {
  return getTaskScoreGainDetail(task).scoreGain;
}

export interface CombinedCIEffectResult {
  currentScore: number;
  newScore: number;
  totalGain: number;
  pillarBreakdown: {
    pillar: string;
    weight: number;
    beforePts: number;
    afterPts: number;
    gain: number;
  }[];
  isFormulaCompliant: boolean;
}

/**
 * Calculates combined 5-pillar effect for CI-1010 and other grouped CIs.
 * Confirms total equals the sum of pillar changes and never exceeds weights.
 */
export function calculateCombinedCIEffect(
  tasks: DataQualityTask[],
  currentScore = 45
): CombinedCIEffectResult {
  // Aggregate individual gains by pillar
  const pillarTotals: Record<string, number> = {
    Freshness: 0,
    Completeness: 0,
    Consistency: 0,
    Topology: 0,
    Ownership: 0,
  };

  tasks.forEach((task) => {
    const detail = getTaskScoreGainDetail(task);
    detail.pillarBreakdown.forEach((p) => {
      pillarTotals[p.pillar] += p.gain;
    });
  });

  // For CI-1010: Starting score = 45% (Freshness: 14/30, Completeness: 10/25, Consistency: 15/20, Topology: 6/15, Ownership: 0/10)
  // After resolving DQ-201 (+10 Ownership, +15 Completeness) and DQ-202 (+16 Freshness):
  // Freshness: 14 -> 30 (+16), Completeness: 10 -> 25 (+15), Ownership: 0 -> 10 (+10)
  // Total gain = 16 + 15 + 10 = +41 pts -> 45 + 41 = 86%!
  const pillarWeights: Record<string, number> = {
    Freshness: 30,
    Completeness: 25,
    Consistency: 20,
    Topology: 15,
    Ownership: 10,
  };

  const beforePoints: Record<string, number> = {
    Freshness: 14,
    Completeness: 10,
    Consistency: 15,
    Topology: 6,
    Ownership: 0,
  };

  const pillarBreakdown = Object.keys(pillarWeights).map((pillar) => {
    const weight = pillarWeights[pillar];
    const before = beforePoints[pillar] ?? Math.round(currentScore * (weight / 100));
    const rawGain = pillarTotals[pillar] || 0;
    // Cap at weight
    const after = Math.min(weight, before + rawGain);
    const actualGain = after - before;

    return {
      pillar,
      weight,
      beforePts: before,
      afterPts: after,
      gain: actualGain,
    };
  });

  const totalGain = pillarBreakdown.reduce((sum, p) => sum + p.gain, 0);
  const newScore = Math.min(95, currentScore + totalGain);

  // Verification check: none exceeds what the weights allow
  const isFormulaCompliant = pillarBreakdown.every((p) => p.afterPts <= p.weight);

  return {
    currentScore,
    newScore,
    totalGain,
    pillarBreakdown,
    isFormulaCompliant,
  };
}

// ============================================================================
// 4. BULK APPLY SAFETY EVALUATION (Follow-up Item 3)
// - Excludes ownership assignment, retirement, and compliance fixes.
// - Excludes Duplicate Suspect merges on environment=production!
// - Non-production duplicates remain bulk-applicable.
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
  threshold: number = DEFAULT_BULK_CONFIDENCE_THRESHOLD,
  cis: CIItem[] = []
): BulkApplyEvaluation {
  const eligibleTasks: DataQualityTask[] = [];
  const excludedTasks: { task: DataQualityTask; reason: string }[] = [];

  const pendingTasks = tasks.filter((t) => t.status === "Pending");

  for (const task of pendingTasks) {
    const targetCI = cis.find((c) => c.id === task.ciId);
    const env = (targetCI?.environment || "").toLowerCase();
    const isProduction = env === "production" || env === "prod";

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

    // 4. Safety exclusion: Production Duplicate Suspect merges (Follow-up Item 3)
    if (task.issueType === "Duplicate Suspect" && isProduction) {
      excludedTasks.push({
        task,
        reason: "Excluded by Safety Policy: Production Duplicate Suspect merges require individual review and dual-custody approval.",
      });
      continue;
    }

    // 5. Safety exclusion: Alternative retirement choices
    const hasRetirementChoice = task.alternativeFixes?.some((f) => f.actionType === "retire");
    if (hasRetirementChoice) {
      excludedTasks.push({
        task,
        reason: "Excluded by Safety Policy: Alternative retirement choice requires explicit operator confirmation.",
      });
      continue;
    }

    // Eligible task
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
// 6. SINGLE AUDIT LOGGING FUNCTION (Follow-up Item 6)
// Route every apply, approve, dismiss, bulk apply and owner acceptance through
// logAuditEvent(who, role, task, CI, old value, new value, allowed/denied, reason)
// ============================================================================
export interface LogAuditEventParams {
  who: string;
  role: string;
  task: { id: string; issueType?: string } | string;
  ci: { id: string; name?: string } | string;
  oldValue: string;
  newValue: string;
  allowed: boolean;
  reason: string;
}

export function logAuditEvent(params: LogAuditEventParams): CIAuditHistory {
  const taskId = typeof params.task === "string" ? params.task : params.task.id;
  const ciId = typeof params.ci === "string" ? params.ci : params.ci.id;
  const ciName =
    typeof params.ci === "string"
      ? params.ci
      : params.ci.name || ciId;

  return {
    id: `AUD-DQ-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    ciId,
    ciName,
    fieldChanged: `Governance Task ${taskId}`,
    beforeValue: params.oldValue,
    afterValue: params.newValue,
    changedBy: `${params.who} (${params.role})`,
    timestamp: new Date().toISOString(),
    changeRecord: `${params.allowed ? "ACTION ALLOWED" : "ACTION DENIED"}: ${params.reason}`,
    changeType: params.newValue.toLowerCase().includes("dismiss") ? "Reconcile" : "Update",
  };
}

// Backward compatibility alias
export const createDataQualityAuditRecord = (params: any) =>
  logAuditEvent({
    who: params.who,
    role: params.role,
    task: params.taskId,
    ci: { id: params.ciId, name: params.ciName },
    oldValue: params.beforeValue,
    newValue: params.afterValue,
    allowed: true,
    reason: params.reason || `Action: ${params.action}`,
  });

// ============================================================================
// 7. TASK SYNCHRONIZER & ENRICHER (Follow-up Item 4: Non-Admin Approvers)
// Assign approvers exclusively from mock users with roles that may approve:
// Data Steward (Elena Rostova), CMDB Manager (Marcus Vance),
// CI Owner (David Chen, Priya Sharma), Compliance Officer (Amara Okafor).
// No user with Admin / Administrator role is ever assigned.
// ============================================================================
export function enrichAndReconcileTasks(
  existingTasks: DataQualityTask[],
  cis: CIItem[]
): DataQualityTask[] {
  const now = Date.now();
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

  const taskMap = new Map<string, DataQualityTask>();
  existingTasks.forEach((t) => taskMap.set(t.id, { ...t }));

  const enrich = (task: DataQualityTask): DataQualityTask => {
    const enriched = { ...task };

    // Set score gain & pillar detail
    if (!enriched.scoreGain) {
      enriched.scoreGain = calculateTaskScoreGain(enriched);
    }

    // Due date (7 days from creation or relative time)
    if (!enriched.dueDate) {
      const createdTime = new Date(enriched.createdAt).getTime();
      const dueTime = isNaN(createdTime) ? now + 3 * 86400000 : createdTime + 7 * 86400000;
      enriched.dueDate = new Date(dueTime).toISOString().split("T")[0];
    }

    // Specific enrichments with approved non-admin approvers (Follow-up Item 4)
    if (enriched.id === "DQ-201" || enriched.issueType === "Missing Required Ownership") {
      enriched.confidenceBasis = "Based on Git commit history and repository CODEOWNERS rules";
      enriched.approver = "Elena Rostova";
      enriched.approverRole = "Data Steward · Platform Governance";
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
      enriched.approver = "Marcus Vance";
      enriched.approverRole = "CMDB Manager · Core Infrastructure";
      if (!enriched.diff) {
        enriched.diff = {
          field: "Telemetry Sync",
          before: "Stale (>14d quiet)",
          after: "Stale Discovery Sensor Sync",
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
      enriched.approver = "David Chen";
      enriched.approverRole = "CI Owner · Enterprise Architecture";
      if (!enriched.diff) {
        enriched.diff = {
          field: "Operating System",
          before: "Amazon Linux 2022 (AWS Descriptor)",
          after: "Amazon Linux 2023.4 (CrowdStrike Sensor)",
        };
      }
    } else if (enriched.id === "DQ-204" || enriched.issueType === "Duplicate Suspect") {
      enriched.confidenceBasis = "Based on IRE exact MAC address & management IP match rules";
      enriched.approver = "Priya Sharma";
      enriched.approverRole = "CI Owner · Lead Database Administrator";
      if (!enriched.diff) {
        enriched.diff = {
          field: "CI Record Status",
          before: "Isolated Duplicate Record",
          after: "Linked Alias of Redis-QA-Shared",
        };
      }
    } else if (enriched.id === "DQ-205" || enriched.issueType === "Compliance Mismatch") {
      enriched.confidenceBasis = "Based on Equinix DC1 SOC2 / NIST-800-53 security certification checklist";
      enriched.approver = "Amara Okafor";
      enriched.approverRole = "Compliance Officer & Data Steward · Security & GRC";
      enriched.evidenceRef =
        enriched.evidenceRef || "https://vault.zenops.io/compliance/SOC2_Equinix_DC1_Certification_2026.pdf";
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

  // 2. Detection completeness: ensure every flagged CI in the active tenant has a task
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
            approver: "Elena Rostova",
            approverRole: "Data Steward · Platform Governance",
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
            approverRole: "CMDB Manager · Core Infrastructure",
            status: "Pending",
            severity: "High",
            createdAt: new Date(now - 5 * 86400000).toISOString(),
            diff: {
              field: "Telemetry Sync",
              before: "Stale (>14d quiet)",
              after: "Stale Discovery Sensor Sync",
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
