/**
 * Consolidated Rule Approval RBAC Helper (src/lib/rbac-lite/canApproveRule.ts)
 *
 * Delegates directly to the central can() policy engine in src/lib/rbac/policy.ts.
 * Enforces SoD rule `rule_author_cannot_approve` and requires `rules.approve` permission.
 */

import { can } from "../rbac/policy";
import { PERMISSIONS } from "../rbac/permissions";
import { UserContext, ResourceContext } from "../rbac/scope";

export interface RuleApprovalCheckResult {
  canApprove: boolean;
  reason?: string;
  tooltipText?: string;
}

export interface RuleApprovalResource {
  id?: string;
  name?: string;
  authorId?: string;
  authorEmail?: string;
  author?: string;
  ruleAuthorId?: string;
  environment?: string;
}

export function canApproveRule(
  userOrRole?: string | UserContext,
  rule?: RuleApprovalResource
): RuleApprovalCheckResult {
  let userCtx: UserContext;

  if (typeof userOrRole === "object" && userOrRole !== null) {
    userCtx = userOrRole;
  } else {
    const roleStr = typeof userOrRole === "string" ? userOrRole : "CMDB Manager";
    userCtx = {
      id: "usr-current",
      name: "Current User",
      email: "user@zenops.local",
      role: roleStr,
      tenantId: "CMP_1001_ZENDEV",
    };
  }

  const resourceCtx: ResourceContext | undefined = rule
    ? {
        id: rule.id,
        name: rule.name,
        ruleAuthorId: rule.ruleAuthorId || rule.authorId || rule.authorEmail || rule.author,
        author: rule.author,
        environment: rule.environment,
      }
    : undefined;

  const decision = can(userCtx, PERMISSIONS.RULES_APPROVE, resourceCtx);

  return {
    canApprove: decision.allowed,
    reason: decision.reason,
    tooltipText: decision.allowed
      ? undefined
      : decision.reason || "Permission 'rules.approve' is required and authors cannot approve their own rule drafts.",
  };
}
