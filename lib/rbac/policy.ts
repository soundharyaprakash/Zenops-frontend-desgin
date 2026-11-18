/**
 * ZenOps CMDB Role-Based Access Control (RBAC) - Central Policy Engine
 *
 * Implements the canonical evaluation function:
 *   can(user, permission, resource?) -> { allowed, reason, requiresSecondApprover, notFound }
 *
 * Order of evaluation:
 *   1. Tenant Isolation Boundary (mismatch = 404 Not Found, never 403)
 *   2. System Role & Auto-Granted Roles (CI Owner / Service Owner derivation)
 *   3. Temporary Access JIT Exceptions
 *   4. Scope Constraints (CI class, environment, region, owner group)
 *   5. Separation of Duties (SoD) & Four-Eyes Principle
 *   6. Audit Logging (every decision written to immutable audit stream)
 */

import { PermissionKey, PERMISSIONS } from "./permissions";
import { UserContext, ResourceContext, isResourceInScope } from "./scope";
import { getAllRoles, normalizeRoleKey, RoleDefinition } from "./roles";
import { SOD_RULES } from "./rules";
import { TemporaryAccessService } from "./temporary-access";
import { AccessAuditService } from "./audit";
import { GroupMappingService } from "./group-mapping";

export type RbacMode = "audit-only" | "enforce";

const STORAGE_KEY_RBAC_MODE = "zenops_rbac_enforcement_mode";

export class RbacConfig {
  public static getMode(): RbacMode {
    if (typeof window === "undefined") return "enforce";
    try {
      const mode = localStorage.getItem(STORAGE_KEY_RBAC_MODE);
      if (mode === "audit-only" || mode === "enforce") return mode;
    } catch {
      // fallback
    }
    return "enforce";
  }

  public static setMode(mode: RbacMode): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY_RBAC_MODE, mode);
    } catch {
      // ignore
    }
  }
}

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  notFound?: boolean; // True if rejected due to tenant mismatch (404-style isolation)
  requiresSecondApprover?: boolean; // True for production CIs requiring dual-custody
  auditFlag?: string;
  matchedRole?: string;
  isAuditOnlyBypass?: boolean; // If allowed solely because RBAC_MODE === "audit-only"
}

/**
 * Derives effective roles for a user, combining:
 * 1. Primary role string (normalized)
 * 2. Roles mapped from directory groups
 * 3. Auto-granted roles (CI Owner if user owns CIs/groups; Service Owner if user owns services)
 * 4. Active temporary access exceptions
 */
export function resolveEffectiveRoles(user: UserContext, resource?: ResourceContext): RoleDefinition[] {
  const allRoles = getAllRoles();
  const effectiveRoleMap = new Map<string, RoleDefinition>();

  // 1. Primary role
  const primaryKey = normalizeRoleKey(user.role || "");
  if (allRoles[primaryKey]) {
    effectiveRoleMap.set(primaryKey, allRoles[primaryKey]);
  }

  // 2. Roles from directory groups
  if (user.groups && user.groups.length > 0) {
    const groupRoleKeys = GroupMappingService.resolveRolesForGroups(user.groups);
    groupRoleKeys.forEach((key) => {
      if (allRoles[key]) {
        effectiveRoleMap.set(key, allRoles[key]);
      }
    });
  }

  // 3. Auto-granted roles: CI Owner
  // If the user's groups match the resource owner_group or user is assigned owner
  if (resource) {
    const resourceGroup = resource.ownerGroup || resource.owner_group;
    const resourceOwner = resource.owner || resource.assignedTo;
    const userGroups = user.groups || [];

    const isCiOwner =
      (resourceGroup && userGroups.includes(resourceGroup)) ||
      (resourceOwner && (
        resourceOwner.toLowerCase() === user.email.toLowerCase() ||
        resourceOwner.toLowerCase() === user.name.toLowerCase()
      ));

    if (isCiOwner && allRoles["ci_owner"]) {
      effectiveRoleMap.set("ci_owner", allRoles["ci_owner"]);
    }

    // Auto-granted roles: Service Owner
    const userServices = user.services || [];
    const resourceService = resource.service || resource.name;
    const isServiceOwner =
      resourceService && userServices.some((s) => s.toLowerCase() === resourceService.toLowerCase());

    if (isServiceOwner && allRoles["service_owner"]) {
      effectiveRoleMap.set("service_owner", allRoles["service_owner"]);
    }
  } else {
    // If no specific resource passed, check if user has any owner groups in their profile
    const userGroups = user.groups || [];
    const hasOwnerGroup = userGroups.some((g) =>
      g.toLowerCase().includes("owner") || g.toLowerCase().includes("dba") || g.toLowerCase().includes("admin")
    );
    if (hasOwnerGroup && allRoles["ci_owner"]) {
      effectiveRoleMap.set("ci_owner", allRoles["ci_owner"]);
    }
    if (user.services && user.services.length > 0 && allRoles["service_owner"]) {
      effectiveRoleMap.set("service_owner", allRoles["service_owner"]);
    }
  }

  // 4. Temporary Access JIT Exceptions
  if (typeof window !== "undefined") {
    const activeExceptions = TemporaryAccessService.getActiveExceptionsForUser(user.id, user.email);
    activeExceptions.forEach((exc) => {
      const excRoleKey = normalizeRoleKey(exc.elevatedRole);
      if (allRoles[excRoleKey]) {
        effectiveRoleMap.set(excRoleKey, {
          ...allRoles[excRoleKey],
          description: `${allRoles[excRoleKey].description} (Temporary JIT elevation approved by ${exc.approverName})`,
        });
      }
    });
  }

  return Array.from(effectiveRoleMap.values());
}

/**
 * Evaluates whether an action is permitted under the least-privilege policy layer
 */
export function can(
  user: UserContext | null | undefined,
  permission: PermissionKey,
  resource?: ResourceContext
): PolicyDecision {
  // If no user is logged in, deny immediately
  if (!user) {
    return logAndReturn({
      allowed: false,
      reason: "Unauthenticated request: Active user context is missing.",
      user: { id: "anonymous", name: "Anonymous", email: "anonymous@zenops.local", role: "none", tenantId: "" },
      permission,
      resource,
    });
  }

  // STEP 1: Tenant Boundary Check (Hard Constraint: Mismatch is 404 "Not Found", not 403)
  if (resource) {
    if (resource.tenantId && user.tenantId && resource.tenantId !== user.tenantId) {
      return logAndReturn({
        allowed: false,
        notFound: true,
        reason: "Tenant boundary isolation: Target resource does not exist in your tenant.",
        user,
        permission,
        resource,
      });
    }

    if (resource.tenantName && user.tenantName && resource.tenantName !== user.tenantName) {
      return logAndReturn({
        allowed: false,
        notFound: true,
        reason: "Tenant boundary isolation: Target resource does not exist in your tenant.",
        user,
        permission,
        resource,
      });
    }
  }

  // STEP 2: Executive Role Strict Restriction (No individual CI record access)
  const isExecutiveOnly =
    user.role.toLowerCase().includes("executive") ||
    user.role.toLowerCase().includes("report");

  if (isExecutiveOnly && permission !== PERMISSIONS.DASHBOARD_VIEW) {
    return logAndReturn({
      allowed: false,
      reason: "Executive role has visibility into high-level dashboard KPIs only; individual CI records and write actions are restricted.",
      user,
      permission,
      resource,
    });
  }

  // STEP 3: Resolve Effective Roles (combines primary role, directory group maps, auto-granted CI/Service owner, and temporary JIT access)
  const effectiveRoles = resolveEffectiveRoles(user, resource);

  // STEP 4: Check if any effective role includes the requested permission
  const rolesWithPermission = effectiveRoles.filter((r) => r.permissions.includes(permission));

  if (rolesWithPermission.length === 0) {
    const roleNames = effectiveRoles.map((r) => r.name).join(", ") || user.role;
    return logAndReturn({
      allowed: false,
      reason: `Permission '${permission}' is not granted to role(s) [${roleNames}].`,
      user,
      permission,
      resource,
    });
  }

  // STEP 5: Check Resource Scope for roles that possess the permission
  let matchingRole: RoleDefinition | null = null;
  let scopeDenialReason = "";

  for (const role of rolesWithPermission) {
    const scopeCheck = isResourceInScope(user, role.scopeRule, resource);
    if (scopeCheck.inScope) {
      matchingRole = role;
      break;
    } else {
      scopeDenialReason = scopeCheck.reason || "Out of scoped boundary.";
    }
  }

  if (!matchingRole) {
    return logAndReturn({
      allowed: false,
      reason: `Action blocked by role scope constraints: ${scopeDenialReason}`,
      user,
      permission,
      resource,
    });
  }

  // STEP 6: Separation of Duties (SoD) & Policy Rules
  for (const sodRule of SOD_RULES) {
    const sodResult = sodRule.evaluator(user, permission, resource);
    if (sodResult.blocked) {
      return logAndReturn({
        allowed: false,
        reason: sodResult.reason || `Blocked by Separation of Duties policy (${sodRule.name})`,
        auditFlag: sodResult.auditFlag || "SOD_BLOCKED",
        user,
        permission,
        resource,
      });
    }
    if (sodResult.requiresSecondApprover) {
      return logAndReturn({
        allowed: true, // permitted, but flagged for dual-custody
        requiresSecondApprover: true,
        reason: sodResult.reason || "Dual custody required for high-risk production action.",
        auditFlag: sodResult.auditFlag,
        user,
        permission,
        resource,
      });
    }
  }

  // STEP 7: Permission Granted
  return logAndReturn({
    allowed: true,
    reason: `Granted by role '${matchingRole.name}' within scope (${matchingRole.scopeRule.description})`,
    matchedRole: matchingRole.name,
    user,
    permission,
    resource,
  });
}

/**
 * Internal logger and audit-only rollout wrapper
 */
function logAndReturn(params: {
  allowed: boolean;
  reason: string;
  user: UserContext;
  permission: PermissionKey;
  resource?: ResourceContext;
  notFound?: boolean;
  requiresSecondApprover?: boolean;
  auditFlag?: string;
  matchedRole?: string;
}): PolicyDecision {
  const currentMode = RbacConfig.getMode();
  let finalAllowed = params.allowed;
  let isAuditOnlyBypass = false;

  // Audit-only mode handling:
  // In "audit-only", log what WOULD be denied without blocking (except hard tenant mismatch)
  if (!params.allowed && currentMode === "audit-only" && !params.notFound) {
    finalAllowed = true;
    isAuditOnlyBypass = true;
  }

  // Write immutable audit log record
  AccessAuditService.append({
    actorId: params.user.id,
    actorEmail: params.user.email,
    actorName: params.user.name,
    actorRole: params.user.role,
    permission: params.permission,
    resourceId: params.resource?.id,
    resourceName: params.resource?.name,
    tenantId: params.user.tenantId,
    allowed: finalAllowed,
    reason: isAuditOnlyBypass
      ? `[AUDIT-ONLY MODE BYPASS] Would be denied: ${params.reason}`
      : params.reason,
    auditFlag: params.auditFlag,
    requiresSecondApprover: params.requiresSecondApprover,
    metadata: {
      mode: currentMode,
      matchedRole: params.matchedRole,
      resourceContext: params.resource,
    },
  });

  return {
    allowed: finalAllowed,
    reason: params.reason,
    notFound: params.notFound,
    requiresSecondApprover: params.requiresSecondApprover,
    auditFlag: params.auditFlag,
    matchedRole: params.matchedRole,
    isAuditOnlyBypass,
  };
}
