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
const STORAGE_KEY_RBAC_EXPIRY = "zenops_rbac_mode_expiry";
const STORAGE_KEY_RBAC_DETAILS = "zenops_rbac_mode_details";

export interface RbacModeDetails {
  mode: RbacMode;
  reason?: string;
  secondApprover?: string;
  setAt?: string;
  expiresAt?: string;
}

let _inMemoryRbacMode: RbacMode = "enforce";
let _inMemoryRbacExpiry: string | null = null;
let _inMemoryRbacDetails: RbacModeDetails = { mode: "enforce" };

export class RbacConfig {
  public static getMode(): RbacMode {
    const now = Date.now();

    // Browser localStorage resolution
    if (typeof window !== "undefined") {
      try {
        const mode = localStorage.getItem(STORAGE_KEY_RBAC_MODE);
        if (mode === "audit-only") {
          const expiry = localStorage.getItem(STORAGE_KEY_RBAC_EXPIRY);
          if (expiry && new Date(expiry).getTime() <= now) {
            // Time-limit expired: automatically revert to enforce
            localStorage.setItem(STORAGE_KEY_RBAC_MODE, "enforce");
            return "enforce";
          }
          return "audit-only";
        }
      } catch {
        // fallback to memory
      }
    } else {
      // Node / Test memory resolution
      if (_inMemoryRbacMode === "audit-only") {
        if (_inMemoryRbacExpiry && new Date(_inMemoryRbacExpiry).getTime() <= now) {
          _inMemoryRbacMode = "enforce";
          _inMemoryRbacExpiry = null;
          return "enforce";
        }
        return "audit-only";
      }
    }

    return "enforce";
  }

  public static getDetails(): RbacModeDetails {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_RBAC_DETAILS);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return _inMemoryRbacDetails;
  }

  public static setMode(
    mode: RbacMode,
    options?: {
      reason?: string;
      secondApprover?: string;
      durationHours?: number;
      actor?: { id: string; name: string; email: string; role: string; tenantId: string };
    }
  ): { success: boolean; reason?: string } {
    // Dual-approval & justification enforcement (Section 1.2 & Section 4)
    if (mode === "audit-only") {
      if (!options?.reason || !options.reason.trim()) {
        return {
          success: false,
          reason: "Business justification is mandatory when requesting Audit-only mode.",
        };
      }
      if (!options?.secondApprover || !options.secondApprover.trim()) {
        return {
          success: false,
          reason: "Dual approval required: Switching to Audit-only mode requires an authorized second approver.",
        };
      }
    }

    const expiresAt =
      mode === "audit-only"
        ? new Date(Date.now() + (options?.durationHours || 4) * 3600000).toISOString()
        : undefined;

    // Update in-memory state
    _inMemoryRbacMode = mode;
    _inMemoryRbacExpiry = expiresAt || null;
    _inMemoryRbacDetails = {
      mode,
      reason: options?.reason,
      secondApprover: options?.secondApprover,
      setAt: new Date().toISOString(),
      expiresAt,
    };

    // Update browser localStorage
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_RBAC_MODE, mode);
        if (expiresAt) {
          localStorage.setItem(STORAGE_KEY_RBAC_EXPIRY, expiresAt);
        } else {
          localStorage.removeItem(STORAGE_KEY_RBAC_EXPIRY);
        }
        localStorage.setItem(STORAGE_KEY_RBAC_DETAILS, JSON.stringify(_inMemoryRbacDetails));
      } catch {
        // ignore
      }
    }

    // Audit log the policy mode change
    AccessAuditService.append({
      actorId: options?.actor?.id || "USR-CURRENT",
      actorEmail: options?.actor?.email || "admin@zenops.local",
      actorName: options?.actor?.name || "CMDB Administrator",
      actorRole: options?.actor?.role || "CMDB Administrator",
      permission: PERMISSIONS.SECURITY_POLICY_EDIT,
      tenantId: options?.actor?.tenantId || "CMP_1001_ZENDEV",
      allowed: true,
      reason: `Enforcement policy mode switched to ${mode === "enforce" ? "Enforce (Blocking)" : "Audit-only (Permissive)"}. Reason: ${options?.reason || "Operational configuration"}. Second Approver: ${options?.secondApprover || "N/A"}. Time-limit Expiry: ${expiresAt || "Permanent"}`,
      auditFlag: "RBAC_MODE_CHANGED",
      metadata: _inMemoryRbacDetails,
    });

    return { success: true };
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

  // 1. Primary role and multi-role assignments
  const roleKeysToResolve = new Set<string>();
  if (user.role) {
    roleKeysToResolve.add(normalizeRoleKey(user.role));
  }
  if (user.roles && Array.isArray(user.roles)) {
    user.roles.forEach((r) => roleKeysToResolve.add(normalizeRoleKey(r)));
  }

  roleKeysToResolve.forEach((key) => {
    if (allRoles[key]) {
      effectiveRoleMap.set(key, allRoles[key]);
    }
  });

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

  // 4. Temporary Access JIT Exceptions (evaluated in browser and Node runtime)
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
  let activeAuditFlag: string | undefined = undefined;
  for (const sodRule of SOD_RULES) {
    const sodResult = sodRule.evaluator(user, permission, resource);
    if (sodResult.auditFlag) {
      activeAuditFlag = sodResult.auditFlag;
    }
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
    auditFlag: activeAuditFlag,
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

export interface SodConflict {
  ruleId: string;
  ruleName: string;
  toxicPermissions: [PermissionKey, PermissionKey];
  reason: string;
  severity: "Critical" | "High";
}

/**
 * Computes a user's effective permissions across all roles, directory groups,
 * auto-granted owner roles, and active temporary JIT exceptions.
 */
export function getUserEffectivePermissions(
  user: UserContext,
  resource?: ResourceContext
): PermissionKey[] {
  const roles = resolveEffectiveRoles(user, resource);
  const permSet = new Set<PermissionKey>();
  roles.forEach((role) => {
    role.permissions.forEach((perm) => permSet.add(perm));
  });
  return Array.from(permSet);
}

/**
 * Evaluates a user's combined privilege profile across all active roles and groups,
 * detecting toxic Separation of Duties (SoD) privilege combinations.
 */
export function detectUserSodConflicts(user: UserContext): SodConflict[] {
  // Break-glass accounts operate under emergency protocol with dedicated security monitoring
  const roles = user.roles || [user.role];
  const isBreakGlass =
    roles.some(
      (r) => r.toLowerCase().includes("break_glass") || r.toLowerCase().includes("break-glass")
    ) || user.email?.toLowerCase().includes("breakglass");

  if (isBreakGlass) {
    return [];
  }

  const userPerms = getUserEffectivePermissions(user);
  const conflicts: SodConflict[] = [];

  // Toxic Pair 1: task.approve + roles.define
  // Administrators who define roles/classes/rules cannot approve data remediation tasks
  const hasTaskApprove = userPerms.includes(PERMISSIONS.TASK_APPROVE);
  const hasRolesDefine = userPerms.includes(PERMISSIONS.ROLES_DEFINE);
  if (hasTaskApprove && hasRolesDefine) {
    conflicts.push({
      ruleId: "sod_admin_cannot_approve",
      ruleName: "Administrator Data Remediation Approval Prohibition",
      toxicPermissions: [PERMISSIONS.TASK_APPROVE, PERMISSIONS.ROLES_DEFINE],
      reason:
        "Separation of Duties conflict: User holds both Role Definition ('roles.define') and Data Remediation Approval ('task.approve'). Administrators cannot approve data quality tasks to prevent self-approval.",
      severity: "Critical",
    });
  }

  // Toxic Pair 2: rules.edit + rules.approve
  // A rule author cannot also hold rule approval rights
  const hasRulesEdit = userPerms.includes(PERMISSIONS.RULES_EDIT);
  const hasRulesApprove = userPerms.includes(PERMISSIONS.RULES_APPROVE);
  if (hasRulesEdit && hasRulesApprove) {
    conflicts.push({
      ruleId: "sod_rule_author_cannot_approve",
      ruleName: "Rule Author Self-Approval Prohibition",
      toxicPermissions: [PERMISSIONS.RULES_EDIT, PERMISSIONS.RULES_APPROVE],
      reason:
        "Separation of Duties conflict: User cannot hold both Reconciliation Rule Authoring ('rules.edit') and Rule Approval ('rules.approve'). Rule drafting and approval must be separated.",
      severity: "Critical",
    });
  }

  // Toxic Pair 3: roles.define + roles.assign
  // Prevents single-person privilege escalation
  const hasRolesAssign = userPerms.includes(PERMISSIONS.ROLES_ASSIGN);
  if (userPerms.includes(PERMISSIONS.ROLES_DEFINE) && hasRolesAssign) {
    conflicts.push({
      ruleId: "sod_roles_define_and_assign",
      ruleName: "Separation of Role Definition and User Assignment",
      toxicPermissions: [PERMISSIONS.ROLES_DEFINE, PERMISSIONS.ROLES_ASSIGN],
      reason:
        "Separation of Duties conflict: User cannot hold both Role Definition ('roles.define') and Role Assignment ('roles.assign'). Defining role scopes and granting roles must be held by separate individuals.",
      severity: "Critical",
    });
  }

  // Toxic Pair 4: staging.write + (ci.merge or ci.retire)
  // Discovery accounts cannot execute production merges
  const hasStagingWrite = userPerms.includes(PERMISSIONS.STAGING_WRITE);
  const hasMergeOrRetire =
    userPerms.includes(PERMISSIONS.CI_MERGE) || userPerms.includes(PERMISSIONS.CI_RETIRE);
  if (hasStagingWrite && hasMergeOrRetire) {
    conflicts.push({
      ruleId: "sod_discovery_merge_isolation",
      ruleName: "Automated Ingestion Production Merge Isolation",
      toxicPermissions: [PERMISSIONS.STAGING_WRITE, PERMISSIONS.CI_MERGE],
      reason:
        "Separation of Duties conflict: Telemetry ingestion credentials ('staging.write') are prohibited from holding live CI merge or retirement authority ('ci.merge').",
      severity: "High",
    });
  }

  return conflicts;
}

export interface RoleAssignmentValidationResult {
  allowed: boolean;
  reason: string;
  requiresSecondApprover?: boolean;
  sodConflicts?: SodConflict[];
}

/**
 * Validates a prospective role assignment against:
 * 1. Self-assignment prohibition (strictly forbidden)
 * 2. Assigner permission authority (must possess roles.assign)
 * 3. Dual custody requirement for privileged roles (independent second approver required)
 * 4. Toxic Separation of Duties (SoD) conflicts on the target user's combined profile
 * 5. Full audit trail logging for all attempts
 */
export function validateRoleAssignment(params: {
  targetUser: UserContext;
  newRoleKey: string;
  assignerUser: UserContext;
  secondApproverId?: string;
  reason?: string;
}): RoleAssignmentValidationResult {
  const { targetUser, newRoleKey, assignerUser, secondApproverId, reason } = params;

  // 1. Self-assignment prohibition
  const isSelfAssignment =
    assignerUser.id === targetUser.id ||
    (Boolean(assignerUser.email) &&
      Boolean(targetUser.email) &&
      assignerUser.email.toLowerCase() === targetUser.email.toLowerCase());

  if (isSelfAssignment) {
    const errorMsg =
      "Self-assignment prohibited: Users cannot assign, elevate, or modify roles on their own account.";
    AccessAuditService.append({
      actorId: assignerUser.id,
      actorEmail: assignerUser.email,
      actorName: assignerUser.name,
      actorRole: assignerUser.role,
      permission: PERMISSIONS.ROLES_ASSIGN,
      tenantId: assignerUser.tenantId,
      allowed: false,
      reason: errorMsg,
      auditFlag: "SOD_SELF_ASSIGNMENT_DENIED",
      metadata: { targetUserId: targetUser.id, targetEmail: targetUser.email, newRoleKey },
    });
    return {
      allowed: false,
      reason: errorMsg,
    };
  }

  // 2. Assigner permission check
  const assignerPerms = getUserEffectivePermissions(assignerUser);
  const canAssign = assignerPerms.includes(PERMISSIONS.ROLES_ASSIGN);

  if (!canAssign) {
    const errorMsg =
      "Permission denied: Current user lacks 'roles.assign' authority to grant or modify roles.";
    AccessAuditService.append({
      actorId: assignerUser.id,
      actorEmail: assignerUser.email,
      actorName: assignerUser.name,
      actorRole: assignerUser.role,
      permission: PERMISSIONS.ROLES_ASSIGN,
      tenantId: assignerUser.tenantId,
      allowed: false,
      reason: errorMsg,
      auditFlag: "ASSIGN_PERMISSION_DENIED",
      metadata: { targetUserId: targetUser.id, newRoleKey },
    });
    return {
      allowed: false,
      reason: errorMsg,
    };
  }

  // 3. Dual custody requirement for privileged roles
  const PRIVILEGED_ROLES = ["cmdb_admin", "cmdb_manager", "break_glass_admin"];
  const isPrivilegedRole =
    PRIVILEGED_ROLES.includes(newRoleKey) ||
    newRoleKey.includes("admin") ||
    newRoleKey.includes("manager");

  if (isPrivilegedRole) {
    if (!secondApproverId || secondApproverId === assignerUser.id) {
      const errorMsg =
        "Dual custody required: Assigning privileged administrative roles requires an independent second approver who is not the assigner.";
      AccessAuditService.append({
        actorId: assignerUser.id,
        actorEmail: assignerUser.email,
        actorName: assignerUser.name,
        actorRole: assignerUser.role,
        permission: PERMISSIONS.ROLES_ASSIGN,
        tenantId: assignerUser.tenantId,
        allowed: false,
        requiresSecondApprover: true,
        reason: errorMsg,
        auditFlag: "ROLE_ASSIGNMENT_DUAL_CUSTODY_REQUIRED",
        metadata: { targetUserId: targetUser.id, newRoleKey, secondApproverId },
      });
      return {
        allowed: false,
        requiresSecondApprover: true,
        reason: errorMsg,
      };
    }
  }

  // 4. Toxic SoD conflict evaluation on hypothetical combined profile
  const existingRoles = targetUser.roles || [targetUser.role];
  const hypotheticalUser: UserContext = {
    ...targetUser,
    roles: Array.from(new Set([...existingRoles, newRoleKey])),
    role: newRoleKey,
  };

  const conflicts = detectUserSodConflicts(hypotheticalUser);
  if (conflicts.length > 0) {
    const conflictDescriptions = conflicts.map((c) => c.reason).join("; ");
    const errorMsg = `Role assignment blocked by Separation of Duties policy: ${conflictDescriptions}`;
    AccessAuditService.append({
      actorId: assignerUser.id,
      actorEmail: assignerUser.email,
      actorName: assignerUser.name,
      actorRole: assignerUser.role,
      permission: PERMISSIONS.ROLES_ASSIGN,
      tenantId: assignerUser.tenantId,
      allowed: false,
      reason: errorMsg,
      auditFlag: "SOD_ASSIGNMENT_BLOCKED",
      metadata: { targetUserId: targetUser.id, newRoleKey, conflicts },
    });
    return {
      allowed: false,
      reason: errorMsg,
      sodConflicts: conflicts,
    };
  }

  // 5. Approved assignment
  const successReason = `Role '${newRoleKey}' successfully assigned to user '${targetUser.name}' (${targetUser.email}). Second Approver: ${secondApproverId || "N/A"}. Reason: ${reason || "Standard administrative assignment"}`;
  AccessAuditService.append({
    actorId: assignerUser.id,
    actorEmail: assignerUser.email,
    actorName: assignerUser.name,
    actorRole: assignerUser.role,
    permission: PERMISSIONS.ROLES_ASSIGN,
    tenantId: assignerUser.tenantId,
    allowed: true,
    reason: successReason,
    auditFlag: "ROLE_ASSIGNMENT_APPROVED",
    metadata: { targetUserId: targetUser.id, newRoleKey, secondApproverId, reason },
  });

  return {
    allowed: true,
    reason: successReason,
  };
}
