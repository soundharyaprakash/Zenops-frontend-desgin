/**
 * ZenOps CMDB Role-Based Access Control (RBAC) - Role Holders & Assignment Registry
 *
 * Provides dynamic holder tracking, dormancy monitoring, assignment sources (SSO, auto-grant, JIT, manual),
 * and security alerts (e.g. >3 administrators, inactive holders >= 90 days).
 */

import { RoleDefinition, getAllRoles } from "./roles";
import { UserContext } from "./scope";
import { PermissionKey, PERMISSIONS } from "./permissions";

export interface RoleHolder {
  id: string;
  name: string;
  email: string;
  title: string;
  roleKey: string;
  assignmentSource: "SSO group" | "auto-grant" | "JIT" | "manual";
  sourceDetail: string;
  assignedAt: string;
  lastUsed: string;
  inactiveDays: number;
  tenantId: string;
}

export interface RoleWarning {
  type: "admin_count" | "inactive_holder" | "unused_role";
  severity: "critical" | "warning" | "info";
  message: string;
}

export interface RoleChangeRecord {
  id: string;
  timestamp: string;
  targetUser?: string;
  targetEmail?: string;
  roleKey: string;
  roleName: string;
  action: "assigned" | "revoked" | "modified" | "created" | "version_bumped";
  assignedBy: string;
  secondApprover?: string;
  reason: string;
  auditLogId?: string;
  version?: number;
  permissionsAdded?: string[];
  permissionsRemoved?: string[];
}

// Seeded Assignment Database across all system and active roles
const MOCK_ROLE_HOLDERS: RoleHolder[] = [
  // CMDB Administrators (4 active holders -> triggers >3 admin warning; Michael Vance triggers >90 days inactive warning)
  {
    id: "usr-admin-01",
    name: "Sarah Jenkins",
    email: "sarah.jenkins@gmail.com",
    title: "Principal Platform Engineer",
    roleKey: "cmdb_admin",
    assignmentSource: "SSO group",
    sourceDetail: "Active Directory: CMDB-Admins",
    assignedAt: "2026-01-15T09:00:00Z",
    lastUsed: "Today at 08:32 UTC",
    inactiveDays: 0,
    tenantId: "CMP_1001_ZENDEV",
  },
  {
    id: "usr-admin-02",
    name: "Alex Rivera",
    email: "alex.rivera@gmail.com",
    title: "Security & Compliance Architect",
    roleKey: "cmdb_admin",
    assignmentSource: "manual",
    sourceDetail: "Dual-approved administrative grant",
    assignedAt: "2026-03-10T14:20:00Z",
    lastUsed: "3 days ago",
    inactiveDays: 3,
    tenantId: "CMP_1001_ZENDEV",
  },
  {
    id: "usr-admin-03",
    name: "James Chen",
    email: "jchen@zenops.local",
    title: "Lead Infrastructure Architect",
    roleKey: "cmdb_admin",
    assignmentSource: "SSO group",
    sourceDetail: "Active Directory: CMDB-Admins",
    assignedAt: "2026-04-01T11:00:00Z",
    lastUsed: "Yesterday at 17:15 UTC",
    inactiveDays: 1,
    tenantId: "CMP_1001_ZENDEV",
  },
  {
    id: "usr-admin-04",
    name: "Michael Vance",
    email: "mvance.legacy@zenops.local",
    title: "Former Systems Lead",
    roleKey: "cmdb_admin",
    assignmentSource: "manual",
    sourceDetail: "Legacy infrastructure transition",
    assignedAt: "2025-11-01T08:00:00Z",
    lastUsed: "118 days ago (2026-07-25)",
    inactiveDays: 118,
    tenantId: "CMP_1001_ZENDEV",
  },

  // CMDB Managers (2 holders)
  {
    id: "usr-mgr-01",
    name: "Marcus Vance",
    email: "marcus.vance@zenops.local",
    title: "Cloud Infrastructure Director",
    roleKey: "cmdb_manager",
    assignmentSource: "SSO group",
    sourceDetail: "Active Directory: CMDB-Managers",
    assignedAt: "2026-02-10T09:00:00Z",
    lastUsed: "Today at 09:12 UTC",
    inactiveDays: 0,
    tenantId: "CMP_1001_ZENDEV",
  },
  {
    id: "usr-mgr-02",
    name: "David Chen",
    email: "david.chen@gmail.com",
    title: "Enterprise Architecture Lead",
    roleKey: "cmdb_manager",
    assignmentSource: "SSO group",
    sourceDetail: "Active Directory: CMDB-Managers",
    assignedAt: "2026-02-15T10:00:00Z",
    lastUsed: "2 days ago",
    inactiveDays: 2,
    tenantId: "CMP_1001_ZENDEV",
  },

  // Data Stewards (2 holders)
  {
    id: "usr-stew-01",
    name: "Priya Sharma",
    email: "priya.sharma@gmail.com",
    title: "Database Reliability Engineer",
    roleKey: "data_steward",
    assignmentSource: "SSO group",
    sourceDetail: "Active Directory: CMDB-Stewards",
    assignedAt: "2026-03-01T09:00:00Z",
    lastUsed: "Today at 10:04 UTC",
    inactiveDays: 0,
    tenantId: "CMP_1001_ZENDEV",
  },
  {
    id: "usr-stew-02",
    name: "Elena Rostova",
    email: "elena.steward@zenops.local",
    title: "Senior DBA & Governance Lead",
    roleKey: "data_steward",
    assignmentSource: "SSO group",
    sourceDetail: "Active Directory: CMDB-Stewards",
    assignedAt: "2026-03-05T12:00:00Z",
    lastUsed: "4 days ago",
    inactiveDays: 4,
    tenantId: "CMP_1001_ZENDEV",
  },

  // Discovery / Integration Admin (1 holder)
  {
    id: "usr-disc-01",
    name: "Devon Brooks",
    email: "devon.brooks@zenops.local",
    title: "Automated Telemetry Engineer",
    roleKey: "discovery_admin",
    assignmentSource: "SSO group",
    sourceDetail: "Active Directory: Discovery-Admins",
    assignedAt: "2026-04-15T09:00:00Z",
    lastUsed: "Today at 07:45 UTC",
    inactiveDays: 0,
    tenantId: "CMP_1001_ZENDEV",
  },

  // CI Owner (Auto-granted based on CI ownership)
  {
    id: "usr-owner-01",
    name: "Elena Rostova",
    email: "ci.owner@gmail.com",
    title: "Senior Database Administrator",
    roleKey: "ci_owner",
    assignmentSource: "auto-grant",
    sourceDetail: "Owner Group: DBA-Team (8 CIs)",
    assignedAt: "2026-05-01T09:00:00Z",
    lastUsed: "Today at 10:20 UTC",
    inactiveDays: 0,
    tenantId: "CMP_1001_ZENDEV",
  },
  {
    id: "usr-owner-02",
    name: "Sarah Jenkins",
    email: "sarah.jenkins@gmail.com",
    title: "Principal Platform Engineer",
    roleKey: "ci_owner",
    assignmentSource: "auto-grant",
    sourceDetail: "Owner Group: Platform-Eng (6 CIs)",
    assignedAt: "2026-01-15T09:00:00Z",
    lastUsed: "Today at 08:32 UTC",
    inactiveDays: 0,
    tenantId: "CMP_1001_ZENDEV",
  },

  // Service Owner (Auto-granted based on business service catalog)
  {
    id: "usr-so-01",
    name: "Liam Tanaka",
    email: "service.owner@gmail.com",
    title: "Payment Systems Tech Lead",
    roleKey: "service_owner",
    assignmentSource: "auto-grant",
    sourceDetail: "Service: Payment Processing, Identity Gateway",
    assignedAt: "2026-05-10T09:00:00Z",
    lastUsed: "Today at 09:30 UTC",
    inactiveDays: 0,
    tenantId: "CMP_1001_ZENDEV",
  },
  {
    id: "usr-so-02",
    name: "David Chen",
    email: "david.chen@gmail.com",
    title: "Enterprise Architecture Lead",
    roleKey: "service_owner",
    assignmentSource: "auto-grant",
    sourceDetail: "Service: Customer Portal",
    assignedAt: "2026-02-15T10:00:00Z",
    lastUsed: "2 days ago",
    inactiveDays: 2,
    tenantId: "CMP_1001_ZENDEV",
  },

  // Auditor (2 holders)
  {
    id: "usr-aud-01",
    name: "Rachel Moore",
    email: "rachel.audit@zenops.local",
    title: "Lead Compliance Auditor",
    roleKey: "auditor",
    assignmentSource: "SSO group",
    sourceDetail: "Active Directory: Audit-Readers",
    assignedAt: "2026-04-12T09:00:00Z",
    lastUsed: "12 days ago",
    inactiveDays: 12,
    tenantId: "CMP_1001_ZENDEV",
  },
  {
    id: "usr-aud-02",
    name: "Alex Rivera",
    email: "alex.rivera@gmail.com",
    title: "Compliance & Security Auditor",
    roleKey: "auditor",
    assignmentSource: "SSO group",
    sourceDetail: "Active Directory: Compliance",
    assignedAt: "2026-04-20T10:00:00Z",
    lastUsed: "15 days ago",
    inactiveDays: 15,
    tenantId: "CMP_1001_ZENDEV",
  },

  // Service Desk Agent (2 holders)
  {
    id: "usr-sd-01",
    name: "Alex ServiceDesk",
    email: "alex.sd@zenops.local",
    title: "IT Support Tier 2",
    roleKey: "service_desk_agent",
    assignmentSource: "SSO group",
    sourceDetail: "Active Directory: Service-Desk",
    assignedAt: "2026-05-01T09:00:00Z",
    lastUsed: "Today at 08:00 UTC",
    inactiveDays: 0,
    tenantId: "CMP_1001_ZENDEV",
  },
  {
    id: "usr-sd-02",
    name: "Tom Miller",
    email: "tom.miller@zenops.local",
    title: "IT Support Tier 1",
    roleKey: "service_desk_agent",
    assignmentSource: "SSO group",
    sourceDetail: "Active Directory: Service-Desk",
    assignedAt: "2026-05-15T09:00:00Z",
    lastUsed: "Yesterday at 16:40 UTC",
    inactiveDays: 1,
    tenantId: "CMP_1001_ZENDEV",
  },

  // Change Manager (1 holder)
  {
    id: "usr-chg-01",
    name: "Victoria Sterling",
    email: "victoria.sterling@zenops.local",
    title: "CAB Secretariat Lead",
    roleKey: "change_manager",
    assignmentSource: "SSO group",
    sourceDetail: "Active Directory: Change-Management",
    assignedAt: "2026-02-01T09:00:00Z",
    lastUsed: "Today at 09:45 UTC",
    inactiveDays: 0,
    tenantId: "CMP_1001_ZENDEV",
  },

  // Problem Analyst (1 holder)
  {
    id: "usr-prb-01",
    name: "James Okafor",
    email: "james.okafor@zenops.local",
    title: "Principal Problem Manager",
    roleKey: "problem_analyst",
    assignmentSource: "SSO group",
    sourceDetail: "Active Directory: Problem-Management",
    assignedAt: "2026-03-15T09:00:00Z",
    lastUsed: "Yesterday at 14:10 UTC",
    inactiveDays: 1,
    tenantId: "CMP_1001_ZENDEV",
  },

  // Executive / Report Viewer (1 holder)
  {
    id: "usr-exec-01",
    name: "Robert Langdon",
    email: "robert.exec@zenops.local",
    title: "VP of Enterprise Infrastructure",
    roleKey: "executive",
    assignmentSource: "SSO group",
    sourceDetail: "Active Directory: IT-Leadership",
    assignedAt: "2026-01-10T09:00:00Z",
    lastUsed: "3 days ago",
    inactiveDays: 3,
    tenantId: "CMP_1001_ZENDEV",
  },

  // Integration Service Account (2 credentials)
  {
    id: "svc-discovery-aws",
    name: "AWS Discovery Connector",
    email: "svc-aws@system.zenops",
    title: "Cloud Telemetry Service Principal",
    roleKey: "integration_service_account",
    assignmentSource: "manual",
    sourceDetail: "API Token Credential: conn-aws-01",
    assignedAt: "2026-01-01T00:00:00Z",
    lastUsed: "10 mins ago",
    inactiveDays: 0,
    tenantId: "CMP_1001_ZENDEV",
  },
  {
    id: "svc-k8s-agent",
    name: "Kubernetes Cluster Ingest",
    email: "svc-k8s@system.zenops",
    title: "Container Topology Collector",
    roleKey: "integration_service_account",
    assignmentSource: "manual",
    sourceDetail: "DaemonSet Service Account: conn-k8s-prod",
    assignedAt: "2026-02-01T00:00:00Z",
    lastUsed: "2 mins ago",
    inactiveDays: 0,
    tenantId: "CMP_1001_ZENDEV",
  },

  // Break-glass Administrator (1 emergency credential)
  {
    id: "usr-breakglass-01",
    name: "Emergency Break-Glass Principal",
    email: "breakglass.sec@zenops.local",
    title: "Hardware Vaulted Emergency Key",
    roleKey: "break_glass_admin",
    assignmentSource: "manual",
    sourceDetail: "Dual-custody hardware safety deposit",
    assignedAt: "2026-01-01T00:00:00Z",
    lastUsed: "21 days ago (Emergency incident SEV-1-9821)",
    inactiveDays: 21,
    tenantId: "CMP_1001_ZENDEV",
  },
];

// Seeded Role Change History Records
const MOCK_ROLE_CHANGES: RoleChangeRecord[] = [
  {
    id: "chg-role-001",
    timestamp: "2026-11-18T14:30:00Z",
    targetUser: "David Chen",
    targetEmail: "david.chen@gmail.com",
    roleKey: "cmdb_manager",
    roleName: "CMDB Manager",
    action: "assigned",
    assignedBy: "Marcus Vance",
    secondApprover: "Sarah Jenkins",
    reason: "Promoted to Enterprise Architecture Lead with CMDB governance duties",
    auditLogId: "SEC-891042",
    version: 1,
    permissionsAdded: ["roles.assign", "task.approve", "rules.approve", "attestation.manage"],
    permissionsRemoved: [],
  },
  {
    id: "chg-role-002",
    timestamp: "2026-11-15T09:15:00Z",
    targetUser: "Priya Sharma",
    targetEmail: "priya.sharma@gmail.com",
    roleKey: "data_steward",
    roleName: "Data Steward",
    action: "assigned",
    assignedBy: "David Chen",
    secondApprover: "Marcus Vance",
    reason: "Designated Data Steward for Core Banking and Payment datasets",
    auditLogId: "SEC-874219",
    version: 1,
    permissionsAdded: ["ci.edit", "ci.merge", "task.approve"],
    permissionsRemoved: [],
  },
  {
    id: "chg-role-003",
    timestamp: "2026-11-10T16:00:00Z",
    targetUser: "Michael Vance",
    targetEmail: "mvance.legacy@zenops.local",
    roleKey: "cmdb_admin",
    roleName: "CMDB Administrator",
    action: "version_bumped",
    assignedBy: "Sarah Jenkins",
    secondApprover: "David Chen",
    reason: "Flagged for access review due to prolonged dormancy (>90 days); removed rules.approve",
    auditLogId: "SEC-841103",
    version: 2,
    permissionsAdded: [],
    permissionsRemoved: ["rules.approve"],
  },
];

const STORAGE_KEY_ROLE_CHANGES = "zenops_rbac_role_changes";
let _inMemoryRoleChanges: RoleChangeRecord[] = [...MOCK_ROLE_CHANGES];

export class RoleHoldersService {
  public static getHoldersForRole(roleKey: string): RoleHolder[] {
    return MOCK_ROLE_HOLDERS.filter((h) => h.roleKey === roleKey);
  }

  public static getHolderCount(roleKey: string): number {
    return this.getHoldersForRole(roleKey).length;
  }

  public static getRoleWarnings(roleKey: string): RoleWarning[] {
    const warnings: RoleWarning[] = [];
    const holders = this.getHoldersForRole(roleKey);

    // Warning 1: More than 3 administrators
    if (roleKey === "cmdb_admin" && holders.length > 3) {
      warnings.push({
        type: "admin_count",
        severity: "critical",
        message: `Elevated Standing Privilege Risk: ${holders.length} administrators assigned. Enterprise policy recommends a maximum of 3 permanent administrators.`,
      });
    }

    // Warning 2: Holders inactive for 90+ days
    const staleHolders = holders.filter((h) => h.inactiveDays >= 90);
    staleHolders.forEach((holder) => {
      warnings.push({
        type: "inactive_holder",
        severity: "warning",
        message: `Dormant Account Alert: ${holder.name} (${holder.email}) has been inactive for ${holder.inactiveDays} days (exceeds the 90-day inactivity threshold). Review for role revocation.`,
      });
    });

    // Warning 3: Unused role (0 holders or no usage in 90+ days)
    if (holders.length === 0) {
      warnings.push({
        type: "unused_role",
        severity: "info",
        message: "Unused Role: No active users or directory groups are currently assigned to this role definition.",
      });
    } else if (holders.every((h) => h.inactiveDays >= 90)) {
      warnings.push({
        type: "unused_role",
        severity: "warning",
        message: "Dormant Role: All assigned holders have been inactive for more than 90 days.",
      });
    }

    return warnings;
  }

  public static getAllHolders(): RoleHolder[] {
    return [...MOCK_ROLE_HOLDERS];
  }

  public static getRoleChanges(roleKey?: string): RoleChangeRecord[] {
    let list = _inMemoryRoleChanges;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_ROLE_CHANGES);
        if (stored) list = JSON.parse(stored);
      } catch {}
    }
    if (!roleKey) return list;
    return list.filter((c) => c.roleKey === roleKey);
  }

  public static addRoleChange(change: Omit<RoleChangeRecord, "id">): RoleChangeRecord {
    const list = this.getRoleChanges();
    const created: RoleChangeRecord = {
      ...change,
      id: `chg-role-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    list.unshift(created);
    _inMemoryRoleChanges = list;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_ROLE_CHANGES, JSON.stringify(list));
      } catch {}
    }
    return created;
  }

  /**
   * Computes the number of CIs covered by the user's active directory groups.
   * Mock inventory coverage based on real groups (DBA-Team, Platform-Eng, etc.)
   */
  public static getCoveredCiCountForUser(userGroups: string[] = []): { count: number; matchedGroups: string[] } {
    const groupCoverageMap: Record<string, number> = {
      "DBA-Team": 8,
      "Database-Admins": 8,
      "Platform-Eng": 6,
      "SRE-Team": 7,
      "Network-Engineering": 5,
      "Core-Banking": 4,
      "Governance": 3,
      "DevOps": 6,
    };

    let total = 0;
    const matched: string[] = [];

    userGroups.forEach((g) => {
      if (groupCoverageMap[g]) {
        total += groupCoverageMap[g];
        matched.push(g);
      }
    });

    // Default baseline if none matched
    if (total === 0 && userGroups.length > 0) {
      total = Math.max(userGroups.length * 2, 4);
      matched.push(...userGroups);
    }

    return { count: total, matchedGroups: matched };
  }
}
