/**
 * ZenOps CMDB Role-Based Access Control (RBAC) - Directory Group to Role Mapping
 *
 * Implements enterprise SSO integration mapping directory groups (e.g. Okta / Azure AD / Ping)
 * into internal CMDB system roles.
 */

export interface GroupRoleMapping {
  id: string;
  groupName: string;
  groupDescription: string;
  roleKey: string;
  roleName: string;
  mappedAt: string;
  userCount: number;
  syncSource: "Okta SCIM" | "Azure AD SAML" | "Google Workspace OIDC" | "Local LDAP";
}

export const DEFAULT_GROUP_MAPPINGS: GroupRoleMapping[] = [
  {
    id: "GM-101",
    groupName: "CMDB-Managers",
    groupDescription: "Governance leaders authorized to approve reconciliation merges & attestations",
    roleKey: "cmdb_manager",
    roleName: "CMDB Manager",
    mappedAt: "2026-01-15T09:00:00Z",
    userCount: 4,
    syncSource: "Okta SCIM",
  },
  {
    id: "GM-102",
    groupName: "CMDB-Admins",
    groupDescription: "Core platform engineers configuring classes, connectors and rules",
    roleKey: "cmdb_admin",
    roleName: "CMDB Administrator",
    mappedAt: "2026-01-15T09:00:00Z",
    userCount: 2,
    syncSource: "Okta SCIM",
  },
  {
    id: "GM-103",
    groupName: "CMDB-Stewards",
    groupDescription: "Data stewards maintaining attribute freshness and executing remediation",
    roleKey: "data_steward",
    roleName: "Data Steward",
    mappedAt: "2026-02-01T10:00:00Z",
    userCount: 8,
    syncSource: "Azure AD SAML",
  },
  {
    id: "GM-104",
    groupName: "Discovery-Admins",
    groupDescription: "Infrastructure reliability engineers managing automated collectors",
    roleKey: "discovery_admin",
    roleName: "Discovery / Integration Admin",
    mappedAt: "2026-02-10T11:00:00Z",
    userCount: 3,
    syncSource: "Okta SCIM",
  },
  {
    id: "GM-105",
    groupName: "Service-Desk",
    groupDescription: "Customer support & service desk analysts requiring CI lookup during triage",
    roleKey: "service_desk_agent",
    roleName: "Service Desk Agent",
    mappedAt: "2026-03-01T08:00:00Z",
    userCount: 45,
    syncSource: "Google Workspace OIDC",
  },
  {
    id: "GM-106",
    groupName: "Change-Managers",
    groupDescription: "Change advisory board members inspecting risk and blast radius",
    roleKey: "change_manager",
    roleName: "Change Manager",
    mappedAt: "2026-03-15T09:00:00Z",
    userCount: 6,
    syncSource: "Okta SCIM",
  },
  {
    id: "GM-107",
    groupName: "Problem-Analysts",
    groupDescription: "Root cause problem managers appending worklogs and diagnostics",
    roleKey: "problem_analyst",
    roleName: "Incident / Problem Analyst",
    mappedAt: "2026-04-01T09:00:00Z",
    userCount: 12,
    syncSource: "Azure AD SAML",
  },
  {
    id: "GM-108",
    groupName: "Audit-Readers",
    groupDescription: "External and internal IT compliance auditors (read-only trail)",
    roleKey: "auditor",
    roleName: "Auditor",
    mappedAt: "2026-04-12T09:00:00Z",
    userCount: 5,
    syncSource: "Okta SCIM",
  },
  {
    id: "GM-109",
    groupName: "IT-Leadership",
    groupDescription: "Executive leadership and CIO review panel (high-level KPIs only)",
    roleKey: "executive",
    roleName: "Executive / Report Viewer",
    mappedAt: "2026-05-01T09:00:00Z",
    userCount: 7,
    syncSource: "Google Workspace OIDC",
  },
];

const STORAGE_KEY_GROUP_MAPPINGS = "zenops_rbac_group_mappings";

export class GroupMappingService {
  public static getMappings(): GroupRoleMapping[] {
    if (typeof window === "undefined") return DEFAULT_GROUP_MAPPINGS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_GROUP_MAPPINGS);
      if (stored) return JSON.parse(stored) as GroupRoleMapping[];
    } catch {
      // fallback
    }
    this.saveMappings(DEFAULT_GROUP_MAPPINGS);
    return DEFAULT_GROUP_MAPPINGS;
  }

  public static saveMappings(mappings: GroupRoleMapping[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY_GROUP_MAPPINGS, JSON.stringify(mappings));
    } catch {
      // ignore
    }
  }

  /**
   * Resolves list of system role keys for a given set of directory group names
   */
  public static resolveRolesForGroups(groups: string[]): string[] {
    const mappings = this.getMappings();
    const resolvedRoleKeys = new Set<string>();

    groups.forEach((groupName) => {
      const match = mappings.find(
        (m) => m.groupName.toLowerCase() === groupName.trim().toLowerCase()
      );
      if (match) {
        resolvedRoleKeys.add(match.roleKey);
      }
    });

    return Array.from(resolvedRoleKeys);
  }
}
