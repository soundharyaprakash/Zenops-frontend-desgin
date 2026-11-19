/**
 * Isolated Task Approval RBAC Helper (src/lib/rbac-lite/canApproveTask.ts)
 *
 * Enforces the Separation of Duties (SoD) rule `admin_cannot_approve` in a single helper.
 * Administrators configure CMDB rules and connectors but are barred from approving data quality
 * remediation tasks to prevent self-approving configuration changes.
 * Approvals must be granted by Data Steward, CMDB Manager, or CI Owner.
 */

export interface TaskApprovalCheckResult {
  canApprove: boolean;
  reason?: string;
  tooltipText?: string;
}

export interface TaskApprovalResource {
  id?: string;
  ciId?: string;
  ciName?: string;
  ciClass?: string;
  environment?: string;
}

export function canApproveTask(
  userRole?: string,
  task?: TaskApprovalResource
): TaskApprovalCheckResult {
  const role = (userRole || "").toLowerCase().trim();

  // SoD rule: admin_cannot_approve
  // Administrators / CMDB Admins cannot approve data quality tasks
  const isAdmin =
    role === "admin" ||
    role === "administrator" ||
    role.includes("administrator") ||
    role === "cmdb_admin";

  if (isAdmin) {
    return {
      canApprove: false,
      reason: "Administrators cannot approve data fixes (SoD rule: admin_cannot_approve).",
      tooltipText:
        "Administrators cannot approve data fixes (SoD rule: admin_cannot_approve). Approval must be granted by Data Steward, CMDB Manager, or CI Owner.",
    };
  }

  // Non-privileged viewers cannot approve
  if (role === "viewer" || role === "read-only") {
    return {
      canApprove: false,
      reason: "Read-only viewers cannot approve data quality remediations.",
      tooltipText: "Permission 'task.approve' is required to approve governance fixes.",
    };
  }

  // Authorized roles: Data Steward, CMDB Manager, CI Owner, Editor
  return {
    canApprove: true,
  };
}
