/**
 * ZenOps CMDB Role-Based Access Control (RBAC) - Permission Catalog
 *
 * All platform capabilities are governed by these fine-grained permission keys.
 * Principle of Least Privilege: Any capability not explicitly granted is strictly denied.
 */

export const PERMISSIONS = {
  // Configuration Item (CI) Operations
  CI_VIEW: "ci.view",
  CI_EDIT: "ci.edit",
  CI_NOTES: "ci.notes",
  CI_MERGE: "ci.merge",
  CI_RETIRE: "ci.retire",
  CI_ATTEST: "ci.attest",

  // Governance & Quality Tasks
  TASK_APPROVE: "task.approve",

  // Identification & Reconciliation Rules
  RULES_APPROVE: "rules.approve",
  RULES_EDIT: "rules.edit",

  // Discovery & Ingestion
  DISCOVERY_CONFIGURE: "discovery.configure",
  STAGING_WRITE: "staging.write",

  // Security Administration (Split per Section 1.3)
  ROLES_DEFINE: "roles.define",
  ROLES_ASSIGN: "roles.assign",
  SECURITY_POLICY_EDIT: "security.policy.edit",
  SECURITY_SOD_EDIT: "security.sod.edit",

  // Observability & Auditing
  AUDIT_VIEW: "audit.view",
  DASHBOARD_VIEW: "dashboard.view",

  // Attestation Management (Campaign creation & lifecycle)
  ATTESTATION_MANAGE: "attestation.manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  category: "Configuration Items" | "Governance & Quality" | "IRE & Rules" | "Discovery & Data" | "Security & Admin" | "Reporting & Audit";
  description: string;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  requiresAudit: boolean;
}

export const PERMISSION_CATALOG: Record<PermissionKey, PermissionDefinition> = {
  [PERMISSIONS.CI_VIEW]: {
    key: PERMISSIONS.CI_VIEW,
    label: "View CIs",
    category: "Configuration Items",
    description: "Read configuration item attributes, topology graphs, and dependency maps within scoped boundary.",
    riskLevel: "Low",
    requiresAudit: false,
  },
  [PERMISSIONS.CI_EDIT]: {
    key: PERMISSIONS.CI_EDIT,
    label: "Edit CIs",
    category: "Configuration Items",
    description: "Modify operational attributes, tags, contacts, and configuration parameters of active CIs in scope.",
    riskLevel: "Medium",
    requiresAudit: true,
  },
  [PERMISSIONS.CI_NOTES]: {
    key: PERMISSIONS.CI_NOTES,
    label: "Add CI Notes & Worklogs",
    category: "Configuration Items",
    description: "Append diagnostic worklogs, incident references, and contextual notes without mutating core CI attributes.",
    riskLevel: "Low",
    requiresAudit: false,
  },
  [PERMISSIONS.CI_MERGE]: {
    key: PERMISSIONS.CI_MERGE,
    label: "Merge CIs",
    category: "Configuration Items",
    description: "Execute reconciliation merge decisions for staging payloads or coalesce duplicate CI records.",
    riskLevel: "High",
    requiresAudit: true,
  },
  [PERMISSIONS.CI_RETIRE]: {
    key: PERMISSIONS.CI_RETIRE,
    label: "Retire CIs",
    category: "Configuration Items",
    description: "Transition CIs to deprovisioned or decommissioned lifecycle status with change authorization.",
    riskLevel: "High",
    requiresAudit: true,
  },
  [PERMISSIONS.CI_ATTEST]: {
    key: PERMISSIONS.CI_ATTEST,
    label: "Attest CI Accuracy",
    category: "Configuration Items",
    description: "Verify, certify, or dispute accuracy of assigned CIs during scheduled governance campaigns.",
    riskLevel: "Medium",
    requiresAudit: true,
  },
  [PERMISSIONS.TASK_APPROVE]: {
    key: PERMISSIONS.TASK_APPROVE,
    label: "Approve Quality Tasks & Fixes",
    category: "Governance & Quality",
    description: "Approve data remediation tasks, duplicate reconciliations, and exception waivers.",
    riskLevel: "High",
    requiresAudit: true,
  },
  [PERMISSIONS.RULES_APPROVE]: {
    key: PERMISSIONS.RULES_APPROVE,
    label: "Approve IRE Rules",
    category: "IRE & Rules",
    description: "Authorize production reconciliation rules and identification precedence policies.",
    riskLevel: "Critical",
    requiresAudit: true,
  },
  [PERMISSIONS.RULES_EDIT]: {
    key: PERMISSIONS.RULES_EDIT,
    label: "Edit IRE Rules",
    category: "IRE & Rules",
    description: "Draft, configure, and modify identification rules, reconciliation precedence, and IRE match keys.",
    riskLevel: "High",
    requiresAudit: true,
  },
  [PERMISSIONS.DISCOVERY_CONFIGURE]: {
    key: PERMISSIONS.DISCOVERY_CONFIGURE,
    label: "Configure Discovery",
    category: "Discovery & Data",
    description: "Manage discovery sources, schedules, IP ranges, connector credentials, and push staging batches.",
    riskLevel: "High",
    requiresAudit: true,
  },
  [PERMISSIONS.STAGING_WRITE]: {
    key: PERMISSIONS.STAGING_WRITE,
    label: "Write Staging Payloads",
    category: "Discovery & Data",
    description: "Ingest automated raw telemetry payloads into staging table via service accounts and connectors.",
    riskLevel: "Medium",
    requiresAudit: true,
  },
  [PERMISSIONS.ROLES_DEFINE]: {
    key: PERMISSIONS.ROLES_DEFINE,
    label: "Define Roles & Schema",
    category: "Security & Admin",
    description: "Create, modify, and clone system and custom role definitions, permissions, and scopes.",
    riskLevel: "Critical",
    requiresAudit: true,
  },
  [PERMISSIONS.ROLES_ASSIGN]: {
    key: PERMISSIONS.ROLES_ASSIGN,
    label: "Assign Roles & Members",
    category: "Security & Admin",
    description: "Assign roles to users, configure directory group mappings, and grant temporary elevations.",
    riskLevel: "Critical",
    requiresAudit: true,
  },
  [PERMISSIONS.SECURITY_POLICY_EDIT]: {
    key: PERMISSIONS.SECURITY_POLICY_EDIT,
    label: "Edit Security Policy",
    category: "Security & Admin",
    description: "Toggle enforcement modes, configure session limits, and modify access boundaries.",
    riskLevel: "Critical",
    requiresAudit: true,
  },
  [PERMISSIONS.SECURITY_SOD_EDIT]: {
    key: PERMISSIONS.SECURITY_SOD_EDIT,
    label: "Edit SoD Rules",
    category: "Security & Admin",
    description: "Author and calibrate toxic combination separation of duties rules and dual custody thresholds.",
    riskLevel: "Critical",
    requiresAudit: true,
  },
  [PERMISSIONS.AUDIT_VIEW]: {
    key: PERMISSIONS.AUDIT_VIEW,
    label: "View Audit Trail",
    category: "Reporting & Audit",
    description: "Inspect immutable change history, compliance audit streams, and security access logs.",
    riskLevel: "Low",
    requiresAudit: false,
  },
  [PERMISSIONS.DASHBOARD_VIEW]: {
    key: PERMISSIONS.DASHBOARD_VIEW,
    label: "View CMDB dashboards",
    category: "Reporting & Audit",
    description: "Access high-level CMDB health metrics, data quality scores, and aggregated KPIs.",
    riskLevel: "Low",
    requiresAudit: false,
  },
  [PERMISSIONS.ATTESTATION_MANAGE]: {
    key: PERMISSIONS.ATTESTATION_MANAGE,
    label: "Manage Attestation Campaigns",
    category: "Governance & Quality",
    description: "Create, configure, schedule, and publish governance attestation campaigns across teams.",
    riskLevel: "High",
    requiresAudit: true,
  },
};

export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);
