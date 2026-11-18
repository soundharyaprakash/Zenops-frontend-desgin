/**
 * ZenOps CMDB Role-Based Access Control (RBAC) - Separation of Duties (SoD) Rules
 *
 * Enforces enterprise governance principles to prevent toxic combinations of privileges.
 */

import { PERMISSIONS, PermissionKey } from "./permissions";
import { UserContext, ResourceContext } from "./scope";

export interface SodRule {
  id: string;
  name: string;
  description: string;
  riskCategory: "Toxic Privilege Combination" | "Dual Custody (Four-Eyes)" | "Automated Credential Isolation" | "Emergency Access";
  severity: "High" | "Critical";
  evaluator: (user: UserContext, permission: PermissionKey, resource?: ResourceContext) => {
    blocked: boolean;
    reason?: string;
    requiresSecondApprover?: boolean;
    auditFlag?: string;
  };
}

export const SOD_RULES: SodRule[] = [
  {
    id: "admin_cannot_approve",
    name: "Administrator Approval Restriction",
    description: "CMDB Administrators configure technical rules, connectors, and classes but are strictly prohibited from approving data remediation tasks to prevent self-approving configuration changes.",
    riskCategory: "Toxic Privilege Combination",
    severity: "Critical",
    evaluator: (user, permission) => {
      // If user has CMDB Administrator role and is attempting task.approve
      const roles = user.roles || [user.role];
      const hasAdmin = roles.some(
        (r) => r.toLowerCase().includes("administrator") || r.toLowerCase() === "cmdb_admin"
      );

      if (hasAdmin && permission === PERMISSIONS.TASK_APPROVE) {
        return {
          blocked: true,
          reason: "Administrators cannot approve data fixes (SoD rule: admin_cannot_approve). Approval must be granted by Data Steward or CI Owner.",
          auditFlag: "SOD_VIOLATION_BLOCKED",
        };
      }
      return { blocked: false };
    },
  },

  {
    id: "four_eyes_for_production",
    name: "Dual Custody (Four-Eyes Principle) for Production CIs",
    description: "Reconciling, merging, or retiring production configuration items requires a second independent approver who is not the original requester.",
    riskCategory: "Dual Custody (Four-Eyes)",
    severity: "Critical",
    evaluator: (user, permission, resource) => {
      if (!resource) return { blocked: false };

      const isProduction =
        resource.environment?.toLowerCase() === "production" ||
        resource.environment === "Production";

      const isHighRiskAction =
        permission === PERMISSIONS.CI_MERGE || permission === PERMISSIONS.CI_RETIRE;

      if (isProduction && isHighRiskAction) {
        // If the action is requested by a single user without a verified second approver
        if (!resource.secondApproverId || resource.secondApproverId === user.id) {
          return {
            blocked: false, // Not outright blocked, but triggers dual-custody approval flow
            requiresSecondApprover: true,
            reason: "Dual Custody Required: Merging or retiring production CIs requires a second authorized approver who is not the initiator.",
            auditFlag: "FOUR_EYES_APPROVAL_REQUIRED",
          };
        }
      }

      return { blocked: false };
    },
  },

  {
    id: "discovery_admin_cannot_merge",
    name: "Discovery Isolation from Production Merges",
    description: "Discovery and Integration Admins can orchestrate telemetry schedules, credentials, and staging ingest but cannot directly merge data into production.",
    riskCategory: "Toxic Privilege Combination",
    severity: "High",
    evaluator: (user, permission) => {
      const roles = user.roles || [user.role];
      const isDiscoveryAdmin = roles.some(
        (r) => r.toLowerCase().includes("discovery") || r.toLowerCase() === "discovery_admin"
      );
      const isStewardOrManager = roles.some(
        (r) => r.toLowerCase().includes("steward") || r.toLowerCase().includes("manager")
      );

      if (isDiscoveryAdmin && !isStewardOrManager && (permission === PERMISSIONS.CI_MERGE || permission === PERMISSIONS.CI_RETIRE)) {
        return {
          blocked: true,
          reason: "Discovery Admins can configure discovery sources and staging batches but cannot execute CI merges.",
          auditFlag: "DISCOVERY_MERGE_BLOCKED",
        };
      }
      return { blocked: false };
    },
  },

  {
    id: "service_account_cannot_login",
    name: "Service Account UI Interactive Login Ban",
    description: "Non-human integration service accounts (e.g. svc-discovery-aws) are restricted to API payload ingestion (staging.write) and are forbidden from interactive web logins.",
    riskCategory: "Automated Credential Isolation",
    severity: "Critical",
    evaluator: (user, permission) => {
      if (user.isServiceAccount && permission === PERMISSIONS.DASHBOARD_VIEW) {
        return {
          blocked: true,
          reason: "Integration service accounts are automated non-human credentials and cannot log into the interactive web UI.",
          auditFlag: "SERVICE_ACCOUNT_UI_LOGIN_DENIED",
        };
      }
      return { blocked: false };
    },
  },

  {
    id: "break_glass_alert",
    name: "Break-Glass Account Emergency Surveillance",
    description: "Any usage of the break-glass emergency account triggers an immediate high-priority incident alert dispatched to the SOC and security audit log.",
    riskCategory: "Emergency Access",
    severity: "Critical",
    evaluator: (user) => {
      const roles = user.roles || [user.role];
      const isBreakGlass =
        roles.some((r) => r.toLowerCase().includes("break_glass") || r.toLowerCase().includes("break-glass")) ||
        user.email.toLowerCase().includes("breakglass");

      if (isBreakGlass) {
        return {
          blocked: false,
          auditFlag: "SECURITY_ALERT_BREAK_GLASS_USED",
          reason: "SECURITY ALERT: Break-glass emergency administrator access is active for this session.",
        };
      }
      return { blocked: false };
    },
  },
];
