/**
 * Consolidated Task Approval RBAC Helper (src/lib/rbac-lite/canApproveTask.ts)
 *
 * Delegates directly to the central can() policy engine in src/lib/rbac/policy.ts.
 * Enforces SoD rule `admin_cannot_approve` and requires `task.approve` permission.
 */

import { can } from "../rbac/policy";
import { PERMISSIONS } from "../rbac/permissions";
import { UserContext, ResourceContext } from "../rbac/scope";

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
  ownerGroup?: string;
  owner?: string;
  proposedOwner?: string;
}

export function canApproveTask(
  userOrRole?: string | UserContext,
  task?: TaskApprovalResource
): TaskApprovalCheckResult {
  let userCtx: UserContext;

  if (typeof userOrRole === "object" && userOrRole !== null) {
    userCtx = userOrRole;
  } else {
    const roleStr = typeof userOrRole === "string" ? userOrRole : "CMDB Administrator";
    userCtx = {
      id: "usr-current",
      name: "Current User",
      email: "user@zenops.local",
      role: roleStr,
      tenantId: "CMP_1001_ZENDEV",
    };
  }

  const resourceCtx: ResourceContext | undefined = task
    ? {
        id: task.id || task.ciId,
        name: task.ciName,
        ciClass: task.ciClass,
        environment: task.environment,
        ownerGroup: task.ownerGroup,
        owner: task.owner,
      }
    : undefined;

  const decision = can(userCtx, PERMISSIONS.TASK_APPROVE, resourceCtx);

  return {
    canApprove: decision.allowed,
    reason: decision.reason,
    tooltipText: decision.allowed
      ? undefined
      : decision.reason || "Administrators cannot approve data fixes (SoD rule: admin_cannot_approve). Approval must be granted by Data Steward or CI Owner.",
  };
}
