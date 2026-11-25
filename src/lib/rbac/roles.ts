/**
 * ZenOps CMDB Role-Based Access Control (RBAC) - System Roles Catalog
 *
 * All system roles are baseline templates. They can be copied to create custom roles
 * with custom scopes or permission subsets, but system roles themselves are protected.
 */

import { PERMISSIONS, PermissionKey } from "./permissions";
import { ScopeRule, SCOPE_POLICIES } from "./scope";

export interface RoleDefinition {
  key: string;
  name: string;
  description: string;
  permissions: PermissionKey[];
  scopeRule: ScopeRule;
  owner: string;
  ownerBackup?: string;
  reviewDate: string;
  reviewCadence?: "Quarterly" | "Semi-Annual" | "Annual" | "Continuous";
  lastReviewed?: string;
  nextReviewDue?: string;
  isOverdue?: boolean;
  isSystem: boolean;
  version?: number;
  category: "CMDB Core" | "Ownership" | "ITIL Operations" | "Governance & Audit" | "Automated" | "Security & Admin";
  badgeColor?: string;
  autoGrantRule?: "ci_ownership" | "service_ownership" | null;
}

export const SYSTEM_ROLES: Record<string, RoleDefinition> = {
  cmdb_manager: {
    key: "cmdb_manager",
    name: "CMDB Manager",
    description: "Executive steward of CMDB integrity. Governs reconciliation, retires CIs, approves quality fixes & attestation campaigns.",
    permissions: [
      PERMISSIONS.CI_VIEW,
      PERMISSIONS.CI_MERGE,
      PERMISSIONS.CI_RETIRE,
      PERMISSIONS.TASK_APPROVE,
      PERMISSIONS.RULES_APPROVE,
      PERMISSIONS.ROLES_ASSIGN,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.ATTESTATION_MANAGE,
    ],
    scopeRule: SCOPE_POLICIES.WHOLE_TENANT,
    owner: "Marcus Vance",
    ownerBackup: "David Chen",
    reviewDate: "2026-12-31",
    reviewCadence: "Quarterly",
    lastReviewed: "2026-09-30",
    nextReviewDue: "2026-12-31",
    isOverdue: false,
    isSystem: true,
    category: "CMDB Core",
    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    autoGrantRule: null,
  },

  cmdb_admin: {
    key: "cmdb_admin",
    name: "CMDB Administrator",
    description: "Technical configuration master. Manages classes, connectors, IRE rules & RBAC. Strictly barred from task approval (SoD).",
    permissions: [
      PERMISSIONS.CI_VIEW,
      PERMISSIONS.CI_EDIT,
      PERMISSIONS.CI_MERGE,
      PERMISSIONS.CI_RETIRE,
      PERMISSIONS.DISCOVERY_CONFIGURE,
      PERMISSIONS.RULES_EDIT,
      PERMISSIONS.ROLES_DEFINE,
      PERMISSIONS.SECURITY_POLICY_EDIT,
      PERMISSIONS.SECURITY_SOD_EDIT,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.DASHBOARD_VIEW,
      // CRITICAL: NEVER task.approve to enforce separation of duties!
    ],
    scopeRule: SCOPE_POLICIES.WHOLE_TENANT,
    owner: "Sarah Jenkins",
    ownerBackup: "Alex Rivera",
    reviewDate: "2026-12-31",
    reviewCadence: "Quarterly",
    lastReviewed: "2026-10-15",
    nextReviewDue: "2026-12-31",
    isOverdue: false,
    isSystem: true,
    category: "CMDB Core",
    badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    autoGrantRule: null,
  },

  data_steward: {
    key: "data_steward",
    name: "Data Steward",
    description: "Operational quality champion. Fixes CI attributes, approves remediation tasks. Production merge/retire requires four-eyes second approver.",
    permissions: [
      PERMISSIONS.CI_VIEW,
      PERMISSIONS.CI_EDIT,
      PERMISSIONS.CI_MERGE,
      PERMISSIONS.CI_RETIRE,
      PERMISSIONS.TASK_APPROVE,
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.ATTESTATION_MANAGE,
    ],
    scopeRule: SCOPE_POLICIES.WHOLE_TENANT,
    owner: "Elena Rostova",
    ownerBackup: "Priya Sharma",
    reviewDate: "2026-12-31",
    reviewCadence: "Quarterly",
    lastReviewed: "2026-10-01",
    nextReviewDue: "2026-12-31",
    isOverdue: false,
    isSystem: true,
    category: "CMDB Core",
    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    autoGrantRule: null,
  },

  discovery_admin: {
    key: "discovery_admin",
    name: "Discovery / Integration Admin",
    description: "Automated ingestion engineer. Configures discovery schedules, connectors & credentials. Cannot merge CIs into production.",
    permissions: [
      PERMISSIONS.CI_VIEW,
      PERMISSIONS.DISCOVERY_CONFIGURE,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.DASHBOARD_VIEW,
    ],
    scopeRule: SCOPE_POLICIES.WHOLE_TENANT,
    owner: "Devon Brooks",
    ownerBackup: "Sarah Jenkins",
    reviewDate: "2026-12-31",
    reviewCadence: "Quarterly",
    lastReviewed: "2026-09-15",
    nextReviewDue: "2026-12-31",
    isOverdue: false,
    isSystem: true,
    category: "CMDB Core",
    badgeColor: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    autoGrantRule: null,
  },

  ci_owner: {
    key: "ci_owner",
    name: "CI Owner",
    description: "Subject matter expert for assigned configuration items. Edits and attests own CIs (owner_group IN $user.groups).",
    permissions: [
      PERMISSIONS.CI_VIEW,
      PERMISSIONS.CI_EDIT,
      PERMISSIONS.CI_ATTEST,
      PERMISSIONS.TASK_APPROVE,
    ],
    scopeRule: SCOPE_POLICIES.OWNED_BY_ME,
    owner: "David Chen",
    ownerBackup: "Application SRE Lead",
    reviewDate: "Continuous",
    reviewCadence: "Continuous",
    lastReviewed: "2026-11-01",
    nextReviewDue: "2026-12-31",
    isOverdue: false,
    isSystem: true,
    category: "Ownership",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    autoGrantRule: "ci_ownership",
  },

  service_owner: {
    key: "service_owner",
    name: "Service Owner",
    description: "Accountable owner for business service topologies. Edits service-level metadata, attests downstream nodes & approves service tasks.",
    permissions: [
      PERMISSIONS.CI_VIEW,
      PERMISSIONS.CI_EDIT,
      PERMISSIONS.CI_ATTEST,
      PERMISSIONS.TASK_APPROVE,
    ],
    scopeRule: SCOPE_POLICIES.SERVICE_OWNED,
    owner: "Priya Sharma",
    ownerBackup: "Enterprise Architect Lead",
    reviewDate: "Continuous",
    reviewCadence: "Continuous",
    lastReviewed: "2026-11-01",
    nextReviewDue: "2026-12-31",
    isOverdue: false,
    isSystem: true,
    category: "Ownership",
    badgeColor: "bg-teal-500/10 text-teal-600 border-teal-500/20",
    autoGrantRule: "service_ownership",
  },

  service_desk_agent: {
    key: "service_desk_agent",
    name: "Service Desk Agent",
    description: "Tier 1/2 operational support. Read-only lookup of CIs and relationships during incident triage. No write access.",
    permissions: [
      PERMISSIONS.CI_VIEW,
    ],
    scopeRule: SCOPE_POLICIES.WHOLE_TENANT,
    owner: "Tom Miller",
    ownerBackup: "Service Desk Lead",
    reviewDate: "2026-12-31",
    reviewCadence: "Semi-Annual",
    lastReviewed: "2026-07-01",
    nextReviewDue: "2026-12-31",
    isOverdue: false,
    isSystem: true,
    category: "ITIL Operations",
    badgeColor: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    autoGrantRule: null,
  },

  change_manager: {
    key: "change_manager",
    name: "Change Manager",
    description: "Change advisory board coordinator. Views CIs, blast radius, topology risk & change-related audit records.",
    permissions: [
      PERMISSIONS.CI_VIEW,
      PERMISSIONS.AUDIT_VIEW,
    ],
    scopeRule: SCOPE_POLICIES.WHOLE_TENANT,
    owner: "Victoria Sterling",
    ownerBackup: "Marcus Vance",
    reviewDate: "2026-12-31",
    reviewCadence: "Quarterly",
    lastReviewed: "2026-09-30",
    nextReviewDue: "2026-12-31",
    isOverdue: false,
    isSystem: true,
    category: "ITIL Operations",
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    autoGrantRule: null,
  },

  problem_analyst: {
    key: "problem_analyst",
    name: "Incident / Problem Analyst",
    description: "Root cause investigator. Can view CIs and append diagnostic notes, workarounds & incident links.",
    permissions: [
      PERMISSIONS.CI_VIEW,
      PERMISSIONS.CI_NOTES,
    ],
    scopeRule: SCOPE_POLICIES.WHOLE_TENANT,
    owner: "James Okafor",
    ownerBackup: "Elena Rostova",
    reviewDate: "2026-12-31",
    reviewCadence: "Semi-Annual",
    lastReviewed: "2026-06-30",
    nextReviewDue: "2026-12-31",
    isOverdue: false,
    isSystem: true,
    category: "ITIL Operations",
    badgeColor: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    autoGrantRule: null,
  },

  auditor: {
    key: "auditor",
    name: "Auditor",
    description: "Independent compliance validator. Read-only access to all CIs, historical audit logs & governance dashboards. Zero edit rights.",
    permissions: [
      PERMISSIONS.CI_VIEW,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.DASHBOARD_VIEW,
    ],
    scopeRule: SCOPE_POLICIES.WHOLE_TENANT,
    owner: "Alex Rivera",
    ownerBackup: "Rachel Moore",
    reviewDate: "2026-12-31",
    reviewCadence: "Annual",
    lastReviewed: "2026-01-15",
    nextReviewDue: "2026-12-31",
    isOverdue: false,
    isSystem: true,
    category: "Governance & Audit",
    badgeColor: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    autoGrantRule: null,
  },

  executive: {
    key: "executive",
    name: "Executive / Report Viewer",
    description: "C-level and IT leadership overview. Access to executive dashboard KPIs & data trust score only. No individual CI drill-down.",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
    ],
    scopeRule: SCOPE_POLICIES.WHOLE_TENANT,
    owner: "Robert Langdon",
    ownerBackup: "Victoria Sterling",
    reviewDate: "2026-12-31",
    reviewCadence: "Annual",
    lastReviewed: "2026-01-15",
    nextReviewDue: "2026-12-31",
    isOverdue: false,
    isSystem: true,
    category: "Governance & Audit",
    badgeColor: "bg-blue-600/10 text-blue-700 border-blue-600/20",
    autoGrantRule: null,
  },

  integration_service_account: {
    key: "integration_service_account",
    name: "Integration Service Account",
    description: "Non-human connector credential. Writes discovery payloads to staging only. Banned from UI interactive login.",
    permissions: [
      PERMISSIONS.STAGING_WRITE,
      PERMISSIONS.CI_VIEW, // Read-only for deduplication check
    ],
    scopeRule: SCOPE_POLICIES.CONNECTOR_STAGING,
    owner: "Devon Brooks",
    ownerBackup: "Platform Security Lead",
    reviewDate: "90-day rotation",
    reviewCadence: "Quarterly",
    lastReviewed: "2026-10-01",
    nextReviewDue: "2026-12-31",
    isOverdue: false,
    isSystem: true,
    category: "Automated",
    badgeColor: "bg-neutral-500/10 text-neutral-600 border-neutral-500/20",
    autoGrantRule: null,
  },

  break_glass_admin: {
    key: "break_glass_admin",
    name: "Break-glass Administrator",
    description: "Emergency incident responder account. Unrestricted access with automated critical security alerting on every action.",
    permissions: [
      PERMISSIONS.CI_VIEW,
      PERMISSIONS.CI_EDIT,
      PERMISSIONS.CI_MERGE,
      PERMISSIONS.CI_RETIRE,
      PERMISSIONS.TASK_APPROVE,
      PERMISSIONS.RULES_APPROVE,
      PERMISSIONS.RULES_EDIT,
      PERMISSIONS.DISCOVERY_CONFIGURE,
      PERMISSIONS.ROLES_DEFINE,
      PERMISSIONS.ROLES_ASSIGN,
      PERMISSIONS.SECURITY_POLICY_EDIT,
      PERMISSIONS.SECURITY_SOD_EDIT,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.ATTESTATION_MANAGE,
    ],
    scopeRule: SCOPE_POLICIES.WHOLE_TENANT,
    owner: "Security Operations Center (SOC)",
    ownerBackup: "CISO On-Call",
    reviewDate: "Emergency Only",
    reviewCadence: "Continuous",
    lastReviewed: "2026-11-15",
    nextReviewDue: "2026-11-30",
    isOverdue: false,
    isSystem: true,
    category: "Security & Admin" as any,
    badgeColor: "bg-red-500/15 text-red-600 border-red-500/30",
    autoGrantRule: null,
  },
};

/**
 * Storage key for custom user-created roles
 */
const STORAGE_CUSTOM_ROLES_KEY = "zenops_rbac_custom_roles";

let _inMemoryCustomRoles: Record<string, RoleDefinition> = {};

export function getAllRoles(): Record<string, RoleDefinition> {
  if (typeof window === "undefined") return { ...SYSTEM_ROLES, ..._inMemoryCustomRoles };
  try {
    const stored = localStorage.getItem(STORAGE_CUSTOM_ROLES_KEY);
    if (stored) {
      const customRoles = JSON.parse(stored) as Record<string, RoleDefinition>;
      return { ...SYSTEM_ROLES, ...customRoles };
    }
  } catch {
    // fallback
  }
  return { ...SYSTEM_ROLES };
}

export function saveCustomRole(role: RoleDefinition): void {
  _inMemoryCustomRoles[role.key] = { ...role, isSystem: false };
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(STORAGE_CUSTOM_ROLES_KEY);
    const customRoles = stored ? (JSON.parse(stored) as Record<string, RoleDefinition>) : {};
    customRoles[role.key] = { ...role, isSystem: false };
    localStorage.setItem(STORAGE_CUSTOM_ROLES_KEY, JSON.stringify(customRoles));
  } catch (err) {
    console.error("Failed to save custom role", err);
  }
}

/**
 * Normalizes legacy role names (e.g. "Admin", "CMDB Owner", "Editor", "Viewer") to system role keys
 */
export function normalizeRoleKey(roleString: string): string {
  const clean = roleString.trim().toLowerCase();

  // Direct exact key match (system or custom roles)
  const all = getAllRoles();
  if (all[clean]) return clean;

  if (clean.includes("admin") && !clean.includes("discovery") && !clean.includes("break")) return "cmdb_admin";
  if (clean.includes("manager") && clean.includes("cmdb")) return "cmdb_manager";
  if (clean.includes("owner") && clean.includes("cmdb")) return "cmdb_manager";
  if (clean.includes("steward")) return "data_steward";
  if (clean.includes("discovery")) return "discovery_admin";
  if (clean.includes("ci owner")) return "ci_owner";
  if (clean.includes("service owner")) return "service_owner";
  if (clean.includes("desk")) return "service_desk_agent";
  if (clean.includes("change")) return "change_manager";
  if (clean.includes("problem") || clean.includes("analyst")) return "problem_analyst";
  if (clean.includes("auditor")) return "auditor";
  if (clean.includes("executive") || clean.includes("report")) return "executive";
  if (clean.includes("break")) return "break_glass_admin";
  if (clean.includes("service account") || clean.includes("integration")) return "integration_service_account";
  if (clean.includes("editor")) return "data_steward";
  if (clean.includes("viewer")) return "service_desk_agent";

  return clean;
}
