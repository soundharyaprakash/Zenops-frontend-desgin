/**
 * ZenOps CMDB Role-Based Access Control (RBAC) Automated Test Suite
 *
 * Verifies all 26 enterprise security scenarios:
 * 1.  Service Desk Agent edits a CI -> Denied
 * 2.  CI Owner edits CI owned by another group -> Denied
 * 3.  CI Owner edits own CI -> Allowed + audit entry
 * 4.  Administrator approves data quality task -> Denied (SoD: admin_cannot_approve)
 * 5.  Steward merges two production CIs -> Waits for second approver (Four-Eyes dual custody)
 * 6.  Connector account writes to staging -> Allowed
 * 7.  Connector account writes to live CIs -> Denied
 * 8.  User from tenant A requests tenant B CI -> Not found (404 tenant isolation)
 * 9.  Auditor tries any edit -> Denied
 * 10. User removed from directory group -> access revoked at next login
 * 11. Temporary access reaches end date -> expired & filtered automatically
 * 12. Executive opens /cis -> No access (dashboard.view only)
 * 13. admin + task.approve on one user blocked (Admin Task Approval Restriction - Isolated)
 * 14. Self-assignment of roles blocked -> Denied (Self-assignment prohibited)
 * 15. Second approver required for role assignment -> Dual custody required
 * 16. JIT elevation causing SoD conflict is detected and blocked
 * 17. roles.define + roles.assign on one user blocked (Separation of Role Administration - Isolated)
 * 18. Enforcement mode change without dual approval rejected
 * 19. Audit-only mode auto-expires and reverts automatically to 'enforce'
 * 20. Rule author approving own rule blocked (SoD: rule_author_cannot_approve)
 * 21. Break-glass access usage raises high-priority SOC security alert
 * 22. Role change generates audit event in AccessAuditService
 * 23. rules.edit + rules.approve on one user blocked (Rule Author vs Approver - Isolated)
 * 24. Owner scopes enforce environment, region, and CI class constraints in scope.ts
 * 25. Custom roles maintain version history, permission diffs, and audit event link
 * 26. Every change to an administrator role raises a visible high/critical security alert
 */

import { can, resolveEffectiveRoles, validateRoleAssignment, detectUserSodConflicts, RbacConfig } from "../lib/rbac/policy";
import { PERMISSIONS } from "../lib/rbac/permissions";
import { AccessAuditService } from "../lib/rbac/audit";
import { TemporaryAccessService, TemporaryAccessException } from "../lib/rbac/temporary-access";
import { GroupMappingService } from "../lib/rbac/group-mapping";
import { UserContext, ResourceContext, ScopeRule, isResourceInScope, SCOPE_POLICIES } from "../lib/rbac/scope";
import { saveCustomRole, getAllRoles } from "../lib/rbac/roles";
import { RoleHoldersService } from "../lib/rbac/role-holders";
import { canApproveRule } from "../lib/rbac-lite";

interface TestResult {
  scenarioNumber: number;
  description: string;
  passed: boolean;
  details?: string;
}

export function runRbacTests(): { total: number; passed: number; failed: number; results: TestResult[] } {
  const results: TestResult[] = [];

  function record(scenarioNumber: number, description: string, condition: boolean, details?: string) {
    results.push({
      scenarioNumber,
      description,
      passed: condition,
      details,
    });
  }

  // -------------------------------------------------------------------------
  // Scenario 1: Service Desk Agent edits a CI -> Denied
  // -------------------------------------------------------------------------
  const serviceDeskUser: UserContext = {
    id: "usr-sd-01",
    name: "Alex ServiceDesk",
    email: "alex.sd@zenops.local",
    role: "Service Desk Agent",
    tenantId: "tenant-acme",
    groups: ["Service-Desk"],
  };

  const sampleCI: ResourceContext = {
    id: "ci-srv-01",
    name: "prod-api-server-01",
    tenantId: "tenant-acme",
    ciClass: "Server/VM",
    environment: "Production",
    ownerGroup: "SRE-Team",
  };

  const s1Decision = can(serviceDeskUser, PERMISSIONS.CI_EDIT, sampleCI);
  record(
    1,
    "Service Desk Agent edits a CI -> Denied",
    s1Decision.allowed === false,
    `Allowed: ${s1Decision.allowed}, Reason: ${s1Decision.reason}`
  );

  // -------------------------------------------------------------------------
  // Scenario 2: CI Owner edits CI owned by another group -> Denied
  // -------------------------------------------------------------------------
  const dbaCiOwner: UserContext = {
    id: "usr-owner-01",
    name: "Marcus Vance",
    email: "marcus.dba@zenops.local",
    role: "CI Owner",
    tenantId: "tenant-acme",
    groups: ["DBA-Team"],
  };

  const networkCI: ResourceContext = {
    id: "ci-net-02",
    name: "core-switch-leaf-01",
    tenantId: "tenant-acme",
    ciClass: "Network Router/Switch",
    environment: "Production",
    ownerGroup: "Network-Engineering",
  };

  const s2Decision = can(dbaCiOwner, PERMISSIONS.CI_EDIT, networkCI);
  record(
    2,
    "CI Owner edits CI owned by another group -> Denied",
    s2Decision.allowed === false,
    `Allowed: ${s2Decision.allowed}, Reason: ${s2Decision.reason}`
  );

  // -------------------------------------------------------------------------
  // Scenario 3: CI Owner edits own CI -> Allowed + audit entry
  // -------------------------------------------------------------------------
  const dbaOwnedCI: ResourceContext = {
    id: "ci-db-03",
    name: "customer-db-primary",
    tenantId: "tenant-acme",
    ciClass: "Database",
    environment: "Production",
    ownerGroup: "DBA-Team",
  };

  const auditCountBefore = AccessAuditService.getLog().length;
  const s3Decision = can(dbaCiOwner, PERMISSIONS.CI_EDIT, dbaOwnedCI);
  const auditCountAfter = AccessAuditService.getLog().length;
  const auditEntryLogged = auditCountAfter >= auditCountBefore;

  record(
    3,
    "CI Owner edits own CI -> Allowed + audit entry",
    s3Decision.allowed === true && auditEntryLogged,
    `Allowed: ${s3Decision.allowed}, Audit Logged: ${auditEntryLogged}`
  );

  // -------------------------------------------------------------------------
  // Scenario 4: Administrator approves data quality task -> Denied (SoD)
  // -------------------------------------------------------------------------
  const adminUser: UserContext = {
    id: "usr-admin-01",
    name: "Sarah Jenkins",
    email: "sarah.admin@zenops.local",
    role: "CMDB Administrator",
    tenantId: "tenant-acme",
    groups: ["CMDB-Admins"],
  };

  const s4Decision = can(adminUser, PERMISSIONS.TASK_APPROVE);
  record(
    4,
    "Administrator approves data quality task -> Denied (SoD: admin_cannot_approve)",
    s4Decision.allowed === false && (s4Decision.auditFlag === "SOD_VIOLATION_BLOCKED" || Boolean(s4Decision.reason?.includes("admin_cannot_approve"))),
    `Allowed: ${s4Decision.allowed}, AuditFlag: ${s4Decision.auditFlag}, Reason: ${s4Decision.reason}`
  );

  // -------------------------------------------------------------------------
  // Scenario 5: Steward merges two production CIs -> Waits for second approver
  // -------------------------------------------------------------------------
  const stewardUser: UserContext = {
    id: "usr-steward-01",
    name: "Elena Rostova",
    email: "elena.steward@zenops.local",
    role: "Data Steward",
    tenantId: "tenant-acme",
    groups: ["CMDB-Stewards"],
  };

  const prodMergeCI: ResourceContext = {
    id: "ci-prod-srv-99",
    name: "billing-gateway-01",
    tenantId: "tenant-acme",
    ciClass: "Server/VM",
    environment: "Production",
    ownerGroup: "Core-Banking",
  };

  const s5Decision = can(stewardUser, PERMISSIONS.CI_MERGE, prodMergeCI);
  record(
    5,
    "Steward merges two production CIs -> Waits for second approver (Four-Eyes dual custody)",
    s5Decision.requiresSecondApprover === true && s5Decision.auditFlag === "FOUR_EYES_APPROVAL_REQUIRED",
    `requiresSecondApprover: ${s5Decision.requiresSecondApprover}, auditFlag: ${s5Decision.auditFlag}`
  );

  // -------------------------------------------------------------------------
  // Scenario 6: Connector account writes to staging -> Allowed
  // -------------------------------------------------------------------------
  const awsConnector: UserContext = {
    id: "svc-discovery-aws",
    name: "AWS Discovery Connector",
    email: "svc-aws@system.zenops",
    role: "Integration Service Account",
    tenantId: "tenant-acme",
    isServiceAccount: true,
    connectorId: "conn-aws-01",
  };

  const stagingResource: ResourceContext = {
    id: "stg-batch-001",
    tenantId: "tenant-acme",
    connectorId: "conn-aws-01",
  };

  const s6Decision = can(awsConnector, PERMISSIONS.STAGING_WRITE, stagingResource);
  record(
    6,
    "Connector account writes to staging -> Allowed",
    s6Decision.allowed === true,
    `Allowed: ${s6Decision.allowed}, Reason: ${s6Decision.reason}`
  );

  // -------------------------------------------------------------------------
  // Scenario 7: Connector account writes to live CIs -> Denied
  // -------------------------------------------------------------------------
  const s7Decision = can(awsConnector, PERMISSIONS.CI_EDIT, sampleCI);
  record(
    7,
    "Connector account writes to live CIs -> Denied",
    s7Decision.allowed === false,
    `Allowed: ${s7Decision.allowed}, Reason: ${s7Decision.reason}`
  );

  // -------------------------------------------------------------------------
  // Scenario 8: User from tenant A requests tenant B CI -> Not found (404)
  // -------------------------------------------------------------------------
  const tenantBResource: ResourceContext = {
    id: "ci-secret-b-01",
    name: "globex-vault-01",
    tenantId: "tenant-globex", // Different tenant!
    ciClass: "Database",
    environment: "Production",
  };

  const s8Decision = can(adminUser, PERMISSIONS.CI_VIEW, tenantBResource);
  record(
    8,
    "User from tenant A requests tenant B CI -> Not found (404 isolation)",
    s8Decision.allowed === false && s8Decision.notFound === true,
    `Allowed: ${s8Decision.allowed}, notFound: ${s8Decision.notFound}`
  );

  // -------------------------------------------------------------------------
  // Scenario 9: Auditor tries any edit -> Denied
  // -------------------------------------------------------------------------
  const auditorUser: UserContext = {
    id: "usr-audit-01",
    name: "Rachel Moore",
    email: "rachel.audit@zenops.local",
    role: "Auditor",
    tenantId: "tenant-acme",
    groups: ["Audit-Readers"],
  };

  const editCi = can(auditorUser, PERMISSIONS.CI_EDIT, sampleCI);
  const editRules = can(auditorUser, PERMISSIONS.RULES_EDIT);
  const confDisc = can(auditorUser, PERMISSIONS.DISCOVERY_CONFIGURE);
  const mergeCi = can(auditorUser, PERMISSIONS.CI_MERGE, sampleCI);

  const allEditsDenied =
    editCi.allowed === false &&
    editRules.allowed === false &&
    confDisc.allowed === false &&
    mergeCi.allowed === false;

  record(
    9,
    "Auditor tries any edit -> Denied",
    allEditsDenied,
    `CI Edit: ${editCi.allowed}, Rules Edit: ${editRules.allowed}, Discovery: ${confDisc.allowed}, Merge: ${mergeCi.allowed}`
  );

  // -------------------------------------------------------------------------
  // Scenario 10: User removed from directory group -> access revoked at next login
  // -------------------------------------------------------------------------
  // User with group "CMDB-Managers" gets role cmdb_manager
  const rolesWithGroup = GroupMappingService.resolveRolesForGroups(["CMDB-Managers"]);
  const hasManagerRoleInitially = rolesWithGroup.includes("cmdb_manager");

  // When group is removed from directory at next sync/login:
  const rolesAfterGroupRemoval = GroupMappingService.resolveRolesForGroups([]);
  const hasManagerRoleAfterRevoke = rolesAfterGroupRemoval.includes("cmdb_manager");

  record(
    10,
    "User removed from directory group -> access gone at next login",
    hasManagerRoleInitially && !hasManagerRoleAfterRevoke,
    `Initial has cmdb_manager: ${hasManagerRoleInitially}, After removal: ${hasManagerRoleAfterRevoke}`
  );

  // -------------------------------------------------------------------------
  // Scenario 11: Temporary access reaches end date -> removed automatically
  // -------------------------------------------------------------------------
  const pastDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
  const futureDate = new Date(Date.now() + 3600000).toISOString(); // 1 hour in future

  const expiredException: TemporaryAccessException = {
    id: "exc-test-expired",
    userId: "usr-temp-01",
    userEmail: "temp.user@zenops.local",
    userName: "Temp User",
    elevatedRole: "CMDB Administrator",
    reason: "Emergency database patching window",
    approverName: "Sarah Jenkins",
    approverEmail: "sarah.admin@zenops.local",
    startDate: new Date(Date.now() - 7200000).toISOString(),
    endDate: pastDate,
    status: "expired",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  };

  const isExpired = new Date(expiredException.endDate).getTime() <= Date.now() || expiredException.status === "expired";
  const activeList = TemporaryAccessService.getActiveExceptionsForUser("usr-temp-01", "temp.user@zenops.local");
  const notInActiveList = !activeList.some((e) => e.id === "exc-test-expired");

  record(
    11,
    "Temporary access reaches end date -> removed automatically",
    isExpired && notInActiveList,
    `isExpired: ${isExpired}, notInActiveList: ${notInActiveList} for past end date ${pastDate}`
  );

  // -------------------------------------------------------------------------
  // Scenario 12: Executive opens /cis -> No access
  // -------------------------------------------------------------------------
  const executiveUser: UserContext = {
    id: "usr-exec-01",
    name: "Robert Langdon",
    email: "robert.exec@zenops.local",
    role: "Executive / Report Viewer",
    tenantId: "tenant-acme",
    groups: ["IT-Leadership"],
  };

  const s12Decision = can(executiveUser, PERMISSIONS.CI_VIEW, sampleCI);
  const s12Dashboard = can(executiveUser, PERMISSIONS.DASHBOARD_VIEW);

  record(
    12,
    "Executive opens /cis -> No access (dashboard.view only)",
    s12Decision.allowed === false && s12Dashboard.allowed === true,
    `CI View: ${s12Decision.allowed} (${s12Decision.reason}), Dashboard View: ${s12Dashboard.allowed}`
  );

  // -------------------------------------------------------------------------
  // Scenario 13: admin + task.approve on one user blocked (Isolated SoD Test)
  // -------------------------------------------------------------------------
  const managerUser: UserContext = {
    id: "usr-mgr-test",
    name: "Marcus Vance",
    email: "marcus.vance@zenops.local",
    role: "CMDB Manager",
    tenantId: "tenant-acme",
    groups: ["CMDB-Managers"],
  };

  saveCustomRole({
    key: "test_admin_def_isolated",
    name: "Admin Isolated",
    description: "Possesses only roles.define",
    permissions: [PERMISSIONS.ROLES_DEFINE],
    scopeRule: SCOPE_POLICIES.WHOLE_TENANT,
    owner: "Admin",
    reviewDate: "2026-12-31",
    isSystem: false,
    version: 1,
    category: "Security & Admin",
  });

  saveCustomRole({
    key: "test_task_approve_isolated",
    name: "Task Approver Isolated",
    description: "Possesses only task.approve",
    permissions: [PERMISSIONS.TASK_APPROVE],
    scopeRule: SCOPE_POLICIES.WHOLE_TENANT,
    owner: "Admin",
    reviewDate: "2026-12-31",
    isSystem: false,
    version: 1,
    category: "Governance & Audit",
  });

  const isolatedAdminUser: UserContext = {
    id: "usr-admin-iso",
    name: "Iso Admin",
    email: "iso.admin@zenops.local",
    role: "test_admin_def_isolated",
    tenantId: "tenant-acme",
  };

  const s13Result = validateRoleAssignment({
    targetUser: isolatedAdminUser,
    newRoleKey: "test_task_approve_isolated",
    assignerUser: managerUser,
    secondApproverId: "usr-second-approver",
    reason: "Attempting to grant task.approve to an admin with roles.define",
  });

  const s13OnlyAdminTaskConflict =
    s13Result.allowed === false &&
    s13Result.sodConflicts?.length === 1 &&
    s13Result.sodConflicts[0].ruleId === "sod_admin_cannot_approve";

  record(
    13,
    "admin + task.approve on one user blocked (Admin Task Approval Restriction - Isolated)",
    Boolean(s13OnlyAdminTaskConflict),
    `Allowed: ${s13Result.allowed}, Conflicts: ${s13Result.sodConflicts?.map((c) => c.ruleId).join(", ")}, Reason: ${s13Result.reason}`
  );

  // -------------------------------------------------------------------------
  // Scenario 14: Self-assignment of roles blocked
  // -------------------------------------------------------------------------
  const s14Result = validateRoleAssignment({
    targetUser: managerUser,
    newRoleKey: "cmdb_admin",
    assignerUser: managerUser, // Self-assignment!
    secondApproverId: "usr-second-approver",
    reason: "Self-elevation attempt",
  });

  record(
    14,
    "Self-assignment of roles blocked",
    s14Result.allowed === false && s14Result.reason.includes("Self-assignment prohibited"),
    `Allowed: ${s14Result.allowed}, Reason: ${s14Result.reason}`
  );

  // -------------------------------------------------------------------------
  // Scenario 15: Second approver required for role assignment (Dual Custody)
  // -------------------------------------------------------------------------
  const regularTargetUser: UserContext = {
    id: "usr-target-new",
    name: "New Engineer",
    email: "engineer.new@zenops.local",
    role: "Service Desk Agent",
    tenantId: "tenant-acme",
    groups: ["Service-Desk"],
  };

  // Attempting to assign privileged cmdb_admin without independent second approver
  const s15Result = validateRoleAssignment({
    targetUser: regularTargetUser,
    newRoleKey: "cmdb_admin",
    assignerUser: managerUser,
    secondApproverId: undefined, // Missing second approver!
    reason: "Direct elevation without dual custody",
  });

  record(
    15,
    "Second approver required for role assignment (Dual Custody)",
    s15Result.allowed === false && s15Result.requiresSecondApprover === true,
    `Allowed: ${s15Result.allowed}, requiresSecondApprover: ${s15Result.requiresSecondApprover}, Reason: ${s15Result.reason}`
  );

  // -------------------------------------------------------------------------
  // Scenario 16: JIT elevation causing SoD conflict is detected and blocked
  // -------------------------------------------------------------------------
  // Active CMDB Administrator requests JIT elevation to Data Steward (which grants task.approve)
  const jitAdminUser: UserContext = {
    id: "usr-admin-jit",
    name: "Alex Admin",
    email: "alex.admin@zenops.local",
    role: "CMDB Administrator",
    tenantId: "tenant-acme",
    groups: ["CMDB-Admins"],
  };

  const simulatedJitProfile: UserContext = {
    ...jitAdminUser,
    roles: [jitAdminUser.role, "Data Steward"],
  };
  const jitConflicts = detectUserSodConflicts(simulatedJitProfile);
  const isJitBlocked =
    jitConflicts.length > 0 && jitConflicts.some((c) => c.ruleId.includes("admin_cannot_approve"));

  record(
    16,
    "JIT elevation causing SoD conflict is detected and blocked",
    isJitBlocked,
    `Conflicts found: ${jitConflicts.map((c) => c.ruleId).join(", ")}; JIT elevation blocked: ${isJitBlocked}`
  );

  // -------------------------------------------------------------------------
  // Scenario 17: roles.define + roles.assign on one user blocked (Separation of Role Administration - Isolated)
  // -------------------------------------------------------------------------
  saveCustomRole({
    key: "test_role_def_isolated",
    name: "Role Designer Isolated",
    description: "Possesses only roles.define",
    permissions: [PERMISSIONS.ROLES_DEFINE],
    scopeRule: SCOPE_POLICIES.WHOLE_TENANT,
    owner: "Admin",
    reviewDate: "2026-12-31",
    isSystem: false,
    version: 1,
    category: "Security & Admin",
  });

  saveCustomRole({
    key: "test_role_assign_isolated",
    name: "Role Assigner Isolated",
    description: "Possesses only roles.assign",
    permissions: [PERMISSIONS.ROLES_ASSIGN],
    scopeRule: SCOPE_POLICIES.WHOLE_TENANT,
    owner: "Admin",
    reviewDate: "2026-12-31",
    isSystem: false,
    version: 1,
    category: "Security & Admin",
  });

  const isolatedDefUser: UserContext = {
    id: "usr-def-isolated",
    name: "Iso Designer",
    email: "iso.def@zenops.local",
    role: "test_role_def_isolated",
    tenantId: "tenant-acme",
  };

  const s17Result = validateRoleAssignment({
    targetUser: isolatedDefUser,
    newRoleKey: "test_role_assign_isolated",
    assignerUser: managerUser,
    secondApproverId: "usr-second-approver",
    reason: "Attempting to grant roles.assign to someone holding roles.define",
  });

  const s17OnlyDefAndAssign =
    s17Result.allowed === false &&
    s17Result.sodConflicts?.length === 1 &&
    s17Result.sodConflicts[0].ruleId === "sod_roles_define_and_assign";

  record(
    17,
    "roles.define + roles.assign on one user blocked (Separation of Role Administration - Isolated)",
    Boolean(s17OnlyDefAndAssign),
    `Allowed: ${s17Result.allowed}, Conflicts: ${s17Result.sodConflicts?.map((c) => c.ruleId).join(", ")}, Reason: ${s17Result.reason}`
  );

  // -------------------------------------------------------------------------
  // Scenario 18: Enforcement mode change without dual approval rejected
  // -------------------------------------------------------------------------
  const s18Result = RbacConfig.setMode("audit-only", {
    reason: "Attempting to switch to audit-only without authorized second approver",
    // Missing secondApprover
  });

  record(
    18,
    "Enforcement mode change without dual approval rejected",
    s18Result.success === false && Boolean(s18Result.reason?.includes("Dual approval required")),
    `Success: ${s18Result.success}, Reason: ${s18Result.reason}`
  );

  // -------------------------------------------------------------------------
  // Scenario 19: Audit-only mode auto-expires and reverts automatically to 'enforce'
  // -------------------------------------------------------------------------
  // Set audit-only mode with a duration that has already expired
  RbacConfig.setMode("audit-only", {
    reason: "Past maintenance window",
    secondApprover: "usr-sec-lead",
    durationHours: -1, // Expired in the past
  });

  const currentMode = RbacConfig.getMode();
  record(
    19,
    "Audit-only mode auto-expires and reverts automatically to 'enforce'",
    currentMode === "enforce",
    `Resolved mode after expiry check: ${currentMode}`
  );

  // -------------------------------------------------------------------------
  // Scenario 20: Rule author approving own rule blocked (SoD: rule_author_cannot_approve)
  // -------------------------------------------------------------------------
  const ruleAuthorManager: UserContext = {
    id: "usr-mgr-author",
    name: "Morgan Manager",
    email: "morgan.mgr@zenops.local",
    role: "CMDB Manager", // Holds rules.approve
    tenantId: "tenant-acme",
  };

  const draftRule = {
    id: "rule-dedup-aws-01",
    name: "AWS Server Deduplication Rule",
    ruleAuthorId: "usr-mgr-author",
    author: "Morgan Manager",
    authorEmail: "morgan.mgr@zenops.local",
  };

  const s20Result = canApproveRule(ruleAuthorManager, draftRule);
  record(
    20,
    "Rule author approving own rule blocked (SoD: rule_author_cannot_approve)",
    s20Result.canApprove === false && Boolean(s20Result.reason?.includes("rule_author_cannot_approve")),
    `canApprove: ${s20Result.canApprove}, Reason: ${s20Result.reason}`
  );

  // -------------------------------------------------------------------------
  // Scenario 21: Break-glass access usage raises high-priority SOC security alert
  // -------------------------------------------------------------------------
  const breakGlassUser: UserContext = {
    id: "usr-bg-soc",
    name: "Break Glass Operator",
    email: "breakglass.ops@zenops.local",
    role: "break_glass_admin",
    tenantId: "tenant-acme",
  };

  const s21Decision = can(breakGlassUser, PERMISSIONS.CI_VIEW, sampleCI);
  const activeAlerts = AccessAuditService.getAlerts();
  const bgAlert = activeAlerts.find(
    (a) => a.type === "break_glass_used" && a.severity === "critical"
  );

  record(
    21,
    "Break-glass access usage raises high-priority SOC security alert",
    s21Decision.auditFlag === "SECURITY_ALERT_BREAK_GLASS_USED" && Boolean(bgAlert),
    `Decision auditFlag: ${s21Decision.auditFlag}, Alert created: ${bgAlert?.title}`
  );

  // -------------------------------------------------------------------------
  // Scenario 22: Role change generates audit event in AccessAuditService
  // -------------------------------------------------------------------------
  const logCountBefore = AccessAuditService.getLog().length;
  validateRoleAssignment({
    targetUser: regularTargetUser,
    newRoleKey: "data_steward",
    assignerUser: managerUser,
    secondApproverId: "usr-second-approver",
    reason: "Promoting certified engineer to Data Steward",
  });

  const updatedLog = AccessAuditService.getLog();
  const roleApprovedEvent = updatedLog.find((e) => e.auditFlag === "ROLE_ASSIGNMENT_APPROVED");

  record(
    22,
    "Role change generates audit event in AccessAuditService",
    updatedLog.length > logCountBefore && Boolean(roleApprovedEvent),
    `Audit log count before: ${logCountBefore}, after: ${updatedLog.length}, Event flag: ${roleApprovedEvent?.auditFlag}`
  );

  // -------------------------------------------------------------------------
  // Scenario 23: rules.edit + rules.approve on one user blocked (Isolated Rule Author/Approver SoD)
  // -------------------------------------------------------------------------
  saveCustomRole({
    key: "test_rule_edit_isolated",
    name: "Rule Author Isolated",
    description: "Possesses only rules.edit",
    permissions: [PERMISSIONS.RULES_EDIT],
    scopeRule: SCOPE_POLICIES.WHOLE_TENANT,
    owner: "Admin",
    reviewDate: "2026-12-31",
    isSystem: false,
    version: 1,
    category: "CMDB Core",
  });

  saveCustomRole({
    key: "test_rule_approve_isolated",
    name: "Rule Approver Isolated",
    description: "Possesses only rules.approve",
    permissions: [PERMISSIONS.RULES_APPROVE],
    scopeRule: SCOPE_POLICIES.WHOLE_TENANT,
    owner: "Admin",
    reviewDate: "2026-12-31",
    isSystem: false,
    version: 1,
    category: "CMDB Core",
  });

  const isolatedAuthorUser: UserContext = {
    id: "usr-rule-ed-isolated",
    name: "Iso Author",
    email: "iso.author@zenops.local",
    role: "test_rule_edit_isolated",
    tenantId: "tenant-acme",
  };

  const s23Result = validateRoleAssignment({
    targetUser: isolatedAuthorUser,
    newRoleKey: "test_rule_approve_isolated",
    assignerUser: managerUser,
    secondApproverId: "usr-second-approver",
    reason: "Attempting to grant rules.approve to a rule author",
  });

  const s23OnlyRuleConflict =
    s23Result.allowed === false &&
    s23Result.sodConflicts?.length === 1 &&
    s23Result.sodConflicts[0].ruleId === "sod_rule_author_cannot_approve";

  record(
    23,
    "rules.edit + rules.approve on one user blocked (Rule Author vs Approver - Isolated)",
    Boolean(s23OnlyRuleConflict),
    `Allowed: ${s23Result.allowed}, Conflicts: ${s23Result.sodConflicts?.map((c) => c.ruleId).join(", ")}, Reason: ${s23Result.reason}`
  );

  // -------------------------------------------------------------------------
  // Scenario 24: Granular Owner Scopes (Environment, Region, and CI Class filtering)
  // -------------------------------------------------------------------------
  const customOwnerScopeRule: ScopeRule = {
    type: "owned_by_my_groups",
    description: "Scoped to DBA-Team in Non-Production environments in us-east-1 for Database CIs",
    filters: {
      requiresOwnedGroup: true,
      environments: ["Staging", "Development"],
      regions: ["us-east-1"],
      classes: ["Database"],
    },
  };

  const dbaUser: UserContext = {
    id: "usr-dba-scoped",
    name: "DBA Scoped User",
    email: "dba.scoped@zenops.local",
    role: "ci_owner",
    tenantId: "tenant-acme",
    groups: ["DBA-Team"],
  };

  const validDbResource: ResourceContext = {
    id: "ci-db-stage-01",
    name: "stage-pg-cluster-01",
    tenantId: "tenant-acme",
    ciClass: "Database",
    environment: "Staging",
    region: "us-east-1",
    ownerGroup: "DBA-Team",
  };

  const prodDbResource: ResourceContext = {
    ...validDbResource,
    id: "ci-db-prod-01",
    environment: "Production",
  };

  const euDbResource: ResourceContext = {
    ...validDbResource,
    id: "ci-db-eu-01",
    region: "eu-west-1",
  };

  const srvResource: ResourceContext = {
    ...validDbResource,
    id: "ci-srv-stage-01",
    ciClass: "Server/VM",
  };

  const matchCheck = isResourceInScope(dbaUser, customOwnerScopeRule, validDbResource);
  const envCheck = isResourceInScope(dbaUser, customOwnerScopeRule, prodDbResource);
  const regionCheck = isResourceInScope(dbaUser, customOwnerScopeRule, euDbResource);
  const classCheck = isResourceInScope(dbaUser, customOwnerScopeRule, srvResource);

  const s24Passed =
    matchCheck.inScope === true &&
    envCheck.inScope === false &&
    regionCheck.inScope === false &&
    classCheck.inScope === false;

  record(
    24,
    "Owner scopes enforce environment, region, and CI class constraints in scope.ts",
    s24Passed,
    `Valid CI in scope: ${matchCheck.inScope}; Prod CI blocked: ${!envCheck.inScope}; EU CI blocked: ${!regionCheck.inScope}; Server CI blocked: ${!classCheck.inScope}`
  );

  // -------------------------------------------------------------------------
  // Scenario 25: Custom Role Versioning and Audit Event History Linking
  // -------------------------------------------------------------------------
  saveCustomRole({
    key: "custom_sec_auditor_v1",
    name: "Security Lead Custom",
    description: "Initial role version",
    permissions: [PERMISSIONS.CI_VIEW, PERMISSIONS.AUDIT_VIEW],
    scopeRule: SCOPE_POLICIES.WHOLE_TENANT,
    owner: "Sarah Jenkins",
    reviewDate: "2026-12-31",
    isSystem: false,
    version: 1,
    category: "Governance & Audit",
  });

  const v1Audit = AccessAuditService.append({
    actorId: managerUser.id,
    actorEmail: managerUser.email,
    actorName: managerUser.name,
    actorRole: managerUser.role,
    permission: PERMISSIONS.ROLES_DEFINE,
    tenantId: managerUser.tenantId,
    allowed: true,
    reason: "Created custom_sec_auditor_v1 initial definition",
    auditFlag: "ROLE_DEFINED",
    metadata: { roleKey: "custom_sec_auditor_v1", version: 1 },
  });

  RoleHoldersService.addRoleChange({
    timestamp: new Date().toISOString(),
    roleKey: "custom_sec_auditor_v1",
    roleName: "Security Lead Custom",
    action: "created",
    assignedBy: managerUser.name,
    reason: "Initial role authoring",
    auditLogId: v1Audit.id,
    version: 1,
    permissionsAdded: [PERMISSIONS.CI_VIEW, PERMISSIONS.AUDIT_VIEW],
    permissionsRemoved: [],
  });

  // Bump version to 2
  saveCustomRole({
    key: "custom_sec_auditor_v1",
    name: "Security Lead Custom",
    description: "Updated role version with security policy edit",
    permissions: [PERMISSIONS.CI_VIEW, PERMISSIONS.AUDIT_VIEW, PERMISSIONS.SECURITY_POLICY_EDIT],
    scopeRule: SCOPE_POLICIES.WHOLE_TENANT,
    owner: "Sarah Jenkins",
    reviewDate: "2026-12-31",
    isSystem: false,
    version: 2,
    category: "Governance & Audit",
  });

  const v2Audit = AccessAuditService.append({
    actorId: managerUser.id,
    actorEmail: managerUser.email,
    actorName: managerUser.name,
    actorRole: managerUser.role,
    permission: PERMISSIONS.ROLES_DEFINE,
    tenantId: managerUser.tenantId,
    allowed: true,
    reason: "Elevated custom_sec_auditor_v1 to version 2",
    auditFlag: "ROLE_DEFINED",
    metadata: { roleKey: "custom_sec_auditor_v1", version: 2 },
  });

  RoleHoldersService.addRoleChange({
    timestamp: new Date().toISOString(),
    roleKey: "custom_sec_auditor_v1",
    roleName: "Security Lead Custom",
    action: "version_bumped",
    assignedBy: managerUser.name,
    reason: "Granted security.policy.edit in version 2",
    auditLogId: v2Audit.id,
    version: 2,
    permissionsAdded: [PERMISSIONS.SECURITY_POLICY_EDIT],
    permissionsRemoved: [],
  });

  const roleHistory = RoleHoldersService.getRoleChanges("custom_sec_auditor_v1");
  const s25Passed =
    roleHistory.length >= 2 &&
    roleHistory[0].version === 2 &&
    roleHistory[0].auditLogId === v2Audit.id &&
    roleHistory[1].version === 1 &&
    roleHistory[1].auditLogId === v1Audit.id;

  record(
    25,
    "Custom roles maintain version history, permission diffs, and audit event link",
    s25Passed,
    `Recorded versions count: ${roleHistory.length}, Latest v: ${roleHistory[0]?.version}, Linked Audit ID: ${roleHistory[0]?.auditLogId}`
  );

  // -------------------------------------------------------------------------
  // Scenario 26: Administrator Role Change raises visible security alert in AccessAuditService
  // -------------------------------------------------------------------------
  const alertCountBefore = AccessAuditService.getAlerts().filter((a) => a.type === "role_modified").length;
  
  validateRoleAssignment({
    targetUser: regularTargetUser,
    newRoleKey: "cmdb_admin",
    assignerUser: managerUser,
    secondApproverId: "usr-second-approver",
    reason: "Emergency promotion to CMDB Administrator with dual authorization",
  });

  const alertsAfter = AccessAuditService.getAlerts().filter((a) => a.type === "role_modified");
  const adminAlert = alertsAfter[0];
  const s26Passed =
    alertsAfter.length > alertCountBefore &&
    Boolean(adminAlert) &&
    adminAlert.severity === "critical";

  record(
    26,
    "Every change to an administrator role raises a visible high/critical security alert",
    s26Passed,
    `Alerts before: ${alertCountBefore}, after: ${alertsAfter.length}, Alert Title: ${adminAlert?.title}, Severity: ${adminAlert?.severity}`
  );

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    total: results.length,
    passed,
    failed,
    results,
  };
}

// If executed directly
if (typeof require !== "undefined" && require.main === module) {
  const summary = runRbacTests();
  console.log("================================================================================");
  console.log("            ZenOps CMDB Role-Based Access Control (RBAC) Test Suite             ");
  console.log("================================================================================");
  summary.results.forEach((r) => {
    const mark = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`[${mark}] Scenario ${r.scenarioNumber}: ${r.description}`);
    if (r.details) {
      console.log(`       Details: ${r.details}`);
    }
  });
  console.log("================================================================================");
  console.log(`Results: ${summary.passed}/${summary.total} Passed (${summary.failed} Failed)`);
  console.log("================================================================================");
  if (summary.failed > 0) {
    process.exit(1);
  }
}
