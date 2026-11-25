/**
 * Single Task & Review Queue Source (Phase 0, Item 0.7)
 *
 * Unifies the dashboard remediation panel, KPI tiles, Data Quality list,
 * and IRE Review Queue so they read from the exact same dataset.
 *
 * Fixes:
 * - Stale count: 2 (CI-1010, CI-1012)
 * - Missing Owner count: 2 (CI-1010, CI-1015)
 * - Review Queue count: 3 (IRE-CONF-01, IRE-CONF-02, IRE-CONF-03)
 * - Duplicate Suspects count: 1 (DQ-204)
 * - Compliance Mismatch: 1 (DQ-205)
 */

export interface CanonicalRemediationItem {
  id: string;
  ciId: string;
  ciName: string;
  ciClass: string;
  category: "missing-owner" | "stale" | "conflicts" | "duplicates" | "compliance";
  categoryLabel: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  age: string;
  ageDays: number;
  detectedAt: string;
  owner: string;
  assignedTo: string;
  proposedFix: string;
  confidencePct: number;
  scoreGainPts: number;
  status: "Pending" | "Approved" | "Resolved" | "Dismissed";
  actionLabel: string;
  actionHref: string;
  isEligibleForBulkApply: boolean;
  bulkExclusionReason?: string;
  requiresSecondApprover: boolean;
  auditFlag?: string;
  changeRecord?: string;
}

export interface CanonicalIREReviewItem {
  id: string;
  ciId: string;
  ciName: string;
  ciClass: string;
  confidencePct: number;
  detectedAt: string;
  sourceA: { name: string; rank: number };
  sourceB: { name: string; rank: number };
  conflictingAttributesCount: number;
  status: "Pending" | "Merged" | "Split" | "Rejected";
}

export const CANONICAL_REMEDIATION_TASKS: CanonicalRemediationItem[] = [
  {
    id: "DQ-201",
    ciId: "CI-1010",
    ciName: "snowflake-sync-pipeline-worker-03",
    ciClass: "Server/VM",
    category: "missing-owner",
    categoryLabel: "Missing Owner",
    severity: "Critical",
    age: "14d ago",
    ageDays: 14,
    detectedAt: "2026-11-06T10:00:00Z",
    owner: "Unassigned",
    assignedTo: "David Chen (Proposed Owner)",
    proposedFix: "Assign ownership to Digital Experience & Growth team (David Chen)",
    confidencePct: 92,
    scoreGainPts: 10,
    status: "Pending",
    actionLabel: "Assign Owner",
    actionHref: "/data-quality?tab=missing-owner",
    isEligibleForBulkApply: false,
    bulkExclusionReason: "Ownership assignments require proposed owner explicit acceptance",
    requiresSecondApprover: false,
    auditFlag: "DQ_OWNERSHIP_ASSIGNMENT_PENDING",
  },
  {
    id: "DQ-202",
    ciId: "CI-1010",
    ciName: "snowflake-sync-pipeline-worker-03",
    ciClass: "Server/VM",
    category: "stale",
    categoryLabel: "Stale Discovery",
    severity: "Critical",
    age: "18d ago",
    ageDays: 18,
    detectedAt: "2026-11-02T08:30:00Z",
    owner: "Alex Kumar (Data Eng)",
    assignedTo: "Alex Kumar (Data Eng)",
    proposedFix: "Telemetry silent for 18 days (threshold: 14d). Choose action: Re-enable sensor or Mark for retirement.",
    confidencePct: 88,
    scoreGainPts: 12,
    status: "Pending",
    actionLabel: "Resolve Staleness",
    actionHref: "/data-quality?tab=stale",
    isEligibleForBulkApply: false,
    bulkExclusionReason: "Lifecycle retirement decisions cannot be automated via bulk apply",
    requiresSecondApprover: false,
    auditFlag: "DQ_STALENESS_RESOLUTION_PENDING",
  },
  {
    id: "DQ-203",
    ciId: "CI-1004",
    ciName: "aws-ec2-prod-edge-gateway-01",
    ciClass: "Server/VM",
    category: "conflicts",
    categoryLabel: "Attribute Conflict",
    severity: "High",
    age: "4d ago",
    ageDays: 4,
    detectedAt: "2026-11-16T08:30:00Z",
    owner: "Sarah Jenkins (Platform)",
    assignedTo: "Sarah Jenkins (Platform)",
    proposedFix: "Resolve OS version divergence: CrowdStrike sensor vs AWS discovery connector",
    confidencePct: 96,
    scoreGainPts: 8,
    status: "Pending",
    actionLabel: "Reconcile Attributes",
    actionHref: "/reconciliation-rules?tab=review-queue",
    isEligibleForBulkApply: true,
    requiresSecondApprover: false,
    auditFlag: "IRE_ATTRIBUTE_RECONCILED",
  },
  {
    id: "DQ-204",
    ciId: "CI-1013",
    ciName: "warehouse-scanner-edge-switch-01",
    ciClass: "Network",
    category: "duplicates",
    categoryLabel: "Duplicate Suspect",
    severity: "Medium",
    age: "6d ago",
    ageDays: 6,
    detectedAt: "2026-11-14T12:00:00Z",
    owner: "Jordan Lee (NetOps)",
    assignedTo: "Jordan Lee (NetOps)",
    proposedFix: "Coalesce duplicate discovery entries originating from ServiceNow legacy import vs SNMP scanner",
    confidencePct: 89,
    scoreGainPts: 6,
    status: "Pending",
    actionLabel: "Review Duplicate",
    actionHref: "/data-quality?tab=duplicates",
    isEligibleForBulkApply: false,
    bulkExclusionReason: "Production merge decisions require dual-custody approval",
    requiresSecondApprover: true,
    auditFlag: "DQ_DUPLICATE_MERGE_PENDING",
  },
  {
    id: "DQ-205",
    ciId: "CI-1006",
    ciName: "vault-secrets-backend-01",
    ciClass: "Application",
    category: "compliance",
    categoryLabel: "Compliance Mismatch",
    severity: "High",
    age: "9d ago",
    ageDays: 9,
    detectedAt: "2026-11-11T16:00:00Z",
    owner: "Amara Okafor (SRE)",
    assignedTo: "Amara Okafor (SRE)",
    proposedFix: "Attach required NIST-800-53 security control evidence for PCI vault isolation",
    confidencePct: 91,
    scoreGainPts: 7,
    status: "Pending",
    actionLabel: "Verify Compliance",
    actionHref: "/data-quality?tab=compliance",
    isEligibleForBulkApply: false,
    bulkExclusionReason: "Compliance certifications require recorded human auditor evidence",
    requiresSecondApprover: false,
    auditFlag: "AUDIT_COMPLIANCE_EVIDENCE_ATTACHED",
    changeRecord: "CR-SEC-88210",
  },
  {
    id: "DQ-206",
    ciId: "CI-1015",
    ciName: "order-queue-processor-pod-04",
    ciClass: "Container/Pod",
    category: "missing-owner",
    categoryLabel: "Missing Owner",
    severity: "High",
    age: "5d ago",
    ageDays: 5,
    detectedAt: "2026-11-15T09:20:00Z",
    owner: "Unassigned",
    assignedTo: "David Chen (Proposed Owner)",
    proposedFix: "Assign ownership to Digital Experience & Growth team (David Chen)",
    confidencePct: 94,
    scoreGainPts: 9,
    status: "Pending",
    actionLabel: "Assign Owner",
    actionHref: "/data-quality?tab=missing-owner",
    isEligibleForBulkApply: false,
    bulkExclusionReason: "Ownership assignments require proposed owner explicit acceptance",
    requiresSecondApprover: false,
    auditFlag: "DQ_OWNERSHIP_ASSIGNMENT_PENDING",
  },
  {
    id: "DQ-207",
    ciId: "CI-1012",
    ciName: "warehouse-scanner-edge-switch-01",
    ciClass: "Network",
    category: "stale",
    categoryLabel: "Stale Discovery",
    severity: "Critical",
    age: "32d ago",
    ageDays: 32,
    detectedAt: "2026-10-19T11:00:00Z",
    owner: "Jordan Lee (NetOps)",
    assignedTo: "Jordan Lee (NetOps)",
    proposedFix: "Network device telemetry silent for 32 days (threshold: 30d). Alert NOC & trigger probe scan.",
    confidencePct: 95,
    scoreGainPts: 11,
    status: "Pending",
    actionLabel: "Resolve Staleness",
    actionHref: "/data-quality?tab=stale",
    isEligibleForBulkApply: false,
    bulkExclusionReason: "Hardware network device probe requires NOC verification",
    requiresSecondApprover: false,
    auditFlag: "DQ_STALENESS_RESOLUTION_PENDING",
  },
];

export const CANONICAL_IRE_REVIEW_QUEUE: CanonicalIREReviewItem[] = [
  {
    id: "IRE-CONF-01",
    ciId: "CI-1004",
    ciName: "aws-ec2-prod-edge-gateway-01",
    ciClass: "Server/VM",
    confidencePct: 96,
    detectedAt: "2026-11-16T08:30:00Z",
    sourceA: { name: "AWS Discovery Connector", rank: 1 },
    sourceB: { name: "Dynatrace APM Agent", rank: 2 },
    conflictingAttributesCount: 4,
    status: "Pending",
  },
  {
    id: "IRE-CONF-02",
    ciId: "CI-1008",
    ciName: "redis-cache-cluster-01",
    ciClass: "Database",
    confidencePct: 89,
    detectedAt: "2026-11-18T10:15:00Z",
    sourceA: { name: "AWS Discovery Connector", rank: 1 },
    sourceB: { name: "ServiceNow Bridge", rank: 4 },
    conflictingAttributesCount: 2,
    status: "Pending",
  },
  {
    id: "IRE-CONF-03",
    ciId: "CI-1014",
    ciName: "order-queue-processor-pod-04",
    ciClass: "Container/Pod",
    confidencePct: 94,
    detectedAt: "2026-11-19T14:40:00Z",
    sourceA: { name: "Kubernetes Operator", rank: 1 },
    sourceB: { name: "Dynatrace APM Agent", rank: 2 },
    conflictingAttributesCount: 3,
    status: "Pending",
  },
];

export interface TaskQueueMetrics {
  totalTasks: number;
  pendingTasks: number;
  staleCount: number;
  missingOwnerCount: number;
  duplicateCount: number;
  conflictCount: number;
  complianceCount: number;
  ireReviewQueueCount: number;
  bulkApplyEligibleCount: number;
  averageConfidencePct: number;
  remediationTasks: CanonicalRemediationItem[];
  ireReviewQueue: CanonicalIREReviewItem[];
}

/**
 * Returns canonical unified task & queue metrics.
 */
export function getTaskQueueMetrics(): TaskQueueMetrics {
  const pending = CANONICAL_REMEDIATION_TASKS.filter((t) => t.status === "Pending");
  const staleCount = pending.filter((t) => t.category === "stale").length; // 2 (CI-1010, CI-1012)
  const missingOwnerCount = pending.filter((t) => t.category === "missing-owner").length; // 2 (CI-1010, CI-1015)
  const duplicateCount = pending.filter((t) => t.category === "duplicates").length; // 1 (DQ-204)
  const conflictCount = pending.filter((t) => t.category === "conflicts").length; // 1 (DQ-203)
  const complianceCount = pending.filter((t) => t.category === "compliance").length; // 1 (DQ-205)

  const ireReviewQueueCount = CANONICAL_IRE_REVIEW_QUEUE.filter((r) => r.status === "Pending").length; // 3

  const bulkEligible = pending.filter((t) => t.isEligibleForBulkApply && t.confidencePct >= 85);
  const sumConfidence = pending.reduce((acc, t) => acc + t.confidencePct, 0);
  const averageConfidencePct = Number((sumConfidence / Math.max(1, pending.length)).toFixed(1)); // 92.1%

  return {
    totalTasks: CANONICAL_REMEDIATION_TASKS.length,
    pendingTasks: pending.length,
    staleCount,
    missingOwnerCount,
    duplicateCount,
    conflictCount,
    complianceCount,
    ireReviewQueueCount,
    bulkApplyEligibleCount: bulkEligible.length,
    averageConfidencePct,
    remediationTasks: CANONICAL_REMEDIATION_TASKS,
    ireReviewQueue: CANONICAL_IRE_REVIEW_QUEUE,
  };
}
