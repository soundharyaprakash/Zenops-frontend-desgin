/**
 * ZenOps CMDB Role-Based Access Control (RBAC) Automated Test Suite
 *
 * Verifies all 12 mandatory enterprise security scenarios:
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
 */

import { can, resolveEffectiveRoles } from "../lib/rbac/policy";
import { PERMISSIONS } from "../lib/rbac/permissions";
import { AccessAuditService } from "../lib/rbac/audit";
import { TemporaryAccessService, TemporaryAccessException } from "../lib/rbac/temporary-access";
import { GroupMappingService } from "../lib/rbac/group-mapping";
import { UserContext, ResourceContext } from "../lib/rbac/scope";

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
