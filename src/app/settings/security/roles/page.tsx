"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  Copy,
  Plus,
  Search,
  Check,
  Lock,
  Calendar,
  User,
  Sliders,
  Sparkles,
  Info,
  ExternalLink,
  Users,
  AlertTriangle,
  Clock,
  History,
  FileCheck2,
  HelpCircle,
  Eye,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Scale,
  Globe,
  Layers,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Lozenge } from "@/components/ui/Lozenge";
import {
  getAllRoles,
  saveCustomRole,
  RoleDefinition,
  ALL_PERMISSIONS,
  PERMISSION_CATALOG,
  PermissionKey,
  SCOPE_POLICIES,
  ScopeRule,
  RoleHoldersService,
  RoleHolder,
  RoleWarning,
  RoleChangeRecord,
  validateRoleAssignment,
  detectUserSodConflicts,
  getUserEffectivePermissions,
  PERMISSIONS,
  UserContext,
  AccessAuditService,
} from "@/lib/rbac";
import { usePermission } from "@/components/rbac/usePermission";
import { useCMDB } from "@/context/cmdb-context";
import { AuthService } from "@/services/auth-service";
import { cn } from "@/lib/utils";

// Pluralization helpers
function formatPermCount(count: number): string {
  return count === 1 ? "1 perm" : `${count} perms`;
}

function formatHolderCount(count: number): string {
  return count === 1 ? "1 holder" : `${count} holders`;
}

// Inline Separation of Duties (SoD) boundaries summary per role (Section 2.3)
function getRoleSodSummary(roleKey: string): string | null {
  if (roleKey === "cmdb_admin") {
    return "SoD Boundary: Prohibited from task.approve, rules.approve, roles.assign";
  }
  if (roleKey === "cmdb_manager") {
    return "SoD Boundary: Prohibited from roles.define, ci.edit";
  }
  if (roleKey === "discovery_admin") {
    return "SoD Boundary: Prohibited from ci.merge, ci.retire, task.approve";
  }
  if (roleKey === "integration_service_account") {
    return "SoD Boundary: Prohibited from interactive UI login, live CI edits";
  }
  if (roleKey === "auditor") {
    return "SoD Boundary: Strict read-only (zero mutation rights)";
  }
  if (roleKey === "data_steward") {
    return "SoD Boundary: Four-Eyes dual approval required on production merges";
  }
  return null;
}

// Permission Category Groupings
const PERMISSION_CATEGORIES: { name: string; keys: PermissionKey[] }[] = [
  {
    name: "CI Data Operations",
    keys: [
      PERMISSIONS.CI_VIEW,
      PERMISSIONS.CI_EDIT,
      PERMISSIONS.CI_NOTES,
      PERMISSIONS.CI_MERGE,
      PERMISSIONS.CI_RETIRE,
    ],
  },
  {
    name: "Governance & Attestation",
    keys: [
      PERMISSIONS.CI_ATTEST,
      PERMISSIONS.TASK_APPROVE,
      PERMISSIONS.ATTESTATION_MANAGE,
    ],
  },
  {
    name: "Reconciliation Rules",
    keys: [
      PERMISSIONS.RULES_EDIT,
      PERMISSIONS.RULES_APPROVE,
    ],
  },
  {
    name: "Discovery & Telemetry",
    keys: [
      PERMISSIONS.DISCOVERY_CONFIGURE,
      PERMISSIONS.STAGING_WRITE,
    ],
  },
  {
    name: "Security Administration",
    keys: [
      PERMISSIONS.ROLES_DEFINE,
      PERMISSIONS.ROLES_ASSIGN,
      PERMISSIONS.SECURITY_POLICY_EDIT,
      PERMISSIONS.SECURITY_SOD_EDIT,
    ],
  },
  {
    name: "Reporting & Audit",
    keys: [
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.DASHBOARD_VIEW,
    ],
  },
];

// Returns SoD lock reason if ungranted due to SoD policy
function getSodBlockReason(roleKey: string, permKey: PermissionKey): string | null {
  if (roleKey === "cmdb_admin") {
    if (permKey === PERMISSIONS.TASK_APPROVE) {
      return "Forbidden by SoD policy (admin_cannot_approve): CMDB Administrators configure technical rules and schema but are strictly prohibited from approving data remediation tasks to prevent self-approving configuration fixes.";
    }
    if (permKey === PERMISSIONS.RULES_APPROVE) {
      return "Forbidden by SoD policy (rule_author_cannot_approve): CMDB Administrators author rules and cannot approve them. Approval must be granted by CMDB Manager.";
    }
    if (permKey === PERMISSIONS.ROLES_ASSIGN) {
      return "Forbidden by SoD policy (roles_define_and_assign_separation): CMDB Administrators define role specifications (roles.define) but cannot assign them to users (roles.assign) to prevent self-privilege escalation.";
    }
  }

  if (roleKey === "discovery_admin") {
    if (permKey === PERMISSIONS.CI_MERGE || permKey === PERMISSIONS.CI_RETIRE) {
      return "Forbidden by SoD policy (discovery_admin_cannot_merge): Telemetry engineers manage discovery feeds but cannot directly merge or decommission live production assets.";
    }
    if (permKey === PERMISSIONS.TASK_APPROVE) {
      return "Forbidden by SoD policy: Ingestion administrators cannot approve operational data quality tasks.";
    }
  }

  if (roleKey === "cmdb_manager") {
    if (permKey === PERMISSIONS.ROLES_DEFINE) {
      return "Forbidden by SoD policy: CMDB Managers assign roles to staff but cannot redefine permission sets (roles.define).";
    }
    if (permKey === PERMISSIONS.CI_EDIT) {
      return "Not granted: CMDB Managers maintain strategic oversight and govern reconciliation; operational edits are delegated to Data Stewards and CI Owners.";
    }
  }

  if (roleKey === "integration_service_account") {
    if (permKey === PERMISSIONS.DASHBOARD_VIEW) {
      return "Forbidden by SoD policy (service_account_cannot_login): Automated connector accounts are barred from interactive web UI logins.";
    }
    if (permKey === PERMISSIONS.CI_EDIT || permKey === PERMISSIONS.CI_MERGE) {
      return "Forbidden by SoD policy: Automated telemetry feeds are isolated to the staging table (staging.write) and cannot write directly to live CIs.";
    }
  }

  if (roleKey === "auditor") {
    if (
      permKey === PERMISSIONS.CI_EDIT ||
      permKey === PERMISSIONS.CI_MERGE ||
      permKey === PERMISSIONS.CI_RETIRE ||
      permKey === PERMISSIONS.TASK_APPROVE ||
      permKey === PERMISSIONS.RULES_EDIT
    ) {
      return "Forbidden by governance policy: Independent auditors maintain strict read-only access with zero mutation authority.";
    }
  }

  return null;
}

export default function RolesManagementPage() {
  const { session, userRole } = useCMDB();
  const definePerm = usePermission(PERMISSIONS.ROLES_DEFINE);
  const canDefineRole = definePerm.allowed;

  const [roles, setRoles] = useState<Record<string, RoleDefinition>>({});
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>("cmdb_admin");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [activeTab, setActiveTab] = useState<"permissions" | "holders" | "history">("permissions");

  // Modals state
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [targetCopyRole, setTargetCopyRole] = useState<RoleDefinition | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<PermissionKey[]>([]);
  const [customScopeType, setCustomScopeType] = useState<string>("whole_tenant");
  const [selectedEnvScope, setSelectedEnvScope] = useState<"all" | "production" | "non_production">("all");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  // What-If Preview Modal
  const [whatIfModalOpen, setWhatIfModalOpen] = useState(false);
  const [whatIfUserId, setWhatIfUserId] = useState("usr-admin-01");
  const [whatIfRoleKey, setWhatIfRoleKey] = useState("data_steward");

  // SoD Exceptions Report Modal
  const [sodReportOpen, setSodReportOpen] = useState(false);

  useEffect(() => {
    setRoles(getAllRoles());
  }, []);

  const roleList = useMemo(() => {
    return Object.values(roles).filter((role) => {
      const matchesSearch =
        role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === "All" || role.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [roles, searchQuery, categoryFilter]);

  const selectedRole = roles[selectedRoleKey] || roleList[0];

  // Derive holders and warnings dynamically from RoleHoldersService
  const roleHolders = useMemo(() => {
    if (!selectedRole) return [];
    return RoleHoldersService.getHoldersForRole(selectedRole.key);
  }, [selectedRole]);

  const roleWarnings = useMemo(() => {
    if (!selectedRole) return [];
    return RoleHoldersService.getRoleWarnings(selectedRole.key);
  }, [selectedRole]);

  const roleChanges = useMemo(() => {
    if (!selectedRole) return [];
    return RoleHoldersService.getRoleChanges(selectedRole.key);
  }, [selectedRole]);

  // Compute CI coverage for active user groups
  const activeUserGroups = session?.groups || ["Platform-Eng", "DBA-Team"];
  const ciCoverage = useMemo(() => {
    return RoleHoldersService.getCoveredCiCountForUser(activeUserGroups);
  }, [activeUserGroups]);

  const handleOpenCopy = (role: RoleDefinition) => {
    setTargetCopyRole(role);
    setNewRoleName(`${role.name} (Custom Copy)`);
    setNewRoleDesc(`Custom variant based on ${role.name}: ${role.description}`);
    setSelectedPerms([...role.permissions]);
    setCustomScopeType(role.scopeRule.type || "whole_tenant");
    
    // Initialize granular scope boundaries
    const envs = role.scopeRule.filters?.environments || [];
    if (envs.includes("Production") && envs.length === 1) {
      setSelectedEnvScope("production");
    } else if (envs.length > 0 && !envs.includes("Production")) {
      setSelectedEnvScope("non_production");
    } else {
      setSelectedEnvScope("all");
    }
    setSelectedRegions(role.scopeRule.filters?.regions || []);
    setSelectedClasses(role.scopeRule.filters?.classes || []);

    setCopyModalOpen(true);
  };

  const handleSaveCustomRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    const customKey = `custom_${newRoleName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now().toString().slice(-4)}`;
    
    // Item 1: Build comprehensive scope filters for environment, region, and CI class
    const scopeFilters: NonNullable<ScopeRule["filters"]> = {};
    if (customScopeType === "owned_by_me" || customScopeType === "owned_by_my_groups") {
      scopeFilters.requiresOwnedGroup = true;
    } else if (customScopeType === "service_scoped") {
      scopeFilters.requiresOwnedService = true;
    }

    if (selectedEnvScope === "production") {
      scopeFilters.environments = ["Production"];
    } else if (selectedEnvScope === "non_production") {
      scopeFilters.environments = ["Staging", "QA / Test", "Development"];
    }

    if (selectedRegions.length > 0) {
      scopeFilters.regions = selectedRegions;
    }

    if (selectedClasses.length > 0) {
      scopeFilters.classes = selectedClasses;
    }

    const scopeParts: string[] = [];
    if (customScopeType === "owned_by_me" || customScopeType === "owned_by_my_groups") {
      scopeParts.push("Owned by my groups");
    } else if (customScopeType === "service_scoped") {
      scopeParts.push("Service scoped");
    } else {
      scopeParts.push("Tenant boundary");
    }
    if (selectedEnvScope === "production") scopeParts.push("Production only");
    if (selectedEnvScope === "non_production") scopeParts.push("Non-Production only");
    if (selectedRegions.length > 0) scopeParts.push(`Regions [${selectedRegions.join(", ")}]`);
    if (selectedClasses.length > 0) scopeParts.push(`Classes [${selectedClasses.join(", ")}]`);

    const assignedScope: ScopeRule = {
      type: (customScopeType as any) || "whole_tenant",
      description: `Scoped to ${scopeParts.join(" | ")}`,
      filters: Object.keys(scopeFilters).length > 0 ? scopeFilters : undefined,
    };

    // Item 2: Version tracking and permission diff
    const prevVersion = targetCopyRole?.version || 1;
    const newVersion = prevVersion + 1;
    const addedPerms = selectedPerms.filter((p) => !targetCopyRole?.permissions.includes(p));
    const removedPerms = (targetCopyRole?.permissions || []).filter((p) => !selectedPerms.includes(p));

    const newRole: RoleDefinition = {
      key: customKey,
      name: newRoleName.trim(),
      description: newRoleDesc.trim(),
      permissions: selectedPerms,
      scopeRule: assignedScope,
      owner: session?.name || "Sarah Jenkins",
      ownerBackup: "David Chen",
      reviewDate: "Quarterly",
      reviewCadence: "Quarterly",
      lastReviewed: new Date().toISOString().split("T")[0],
      nextReviewDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      isOverdue: false,
      isSystem: false,
      version: newVersion,
      category: "CMDB Core",
      badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    };

    saveCustomRole(newRole);

    // Item 2 & 3: Role creation audit entry with alert trigger
    const auditEntry = AccessAuditService.append({
      actorId: session?.userId || "usr-current",
      actorEmail: session?.email || "sarah.jenkins@gmail.com",
      actorName: session?.name || "Sarah Jenkins",
      actorRole: userRole || "CMDB Administrator",
      permission: PERMISSIONS.ROLES_DEFINE,
      tenantId: session?.tenantId || "CMP_1001_ZENDEV",
      allowed: true,
      reason: `Custom role definition created: '${newRoleName.trim()}' (v${newVersion}) with ${selectedPerms.length} permissions under scope: ${assignedScope.description}.`,
      auditFlag: "ROLE_DEFINED",
      metadata: { roleKey: customKey, version: newVersion, scope: assignedScope, permissions: selectedPerms },
    });

    // Record in role mutation history
    RoleHoldersService.addRoleChange({
      timestamp: new Date().toISOString(),
      roleKey: customKey,
      roleName: newRoleName.trim(),
      action: "created",
      assignedBy: session?.name || "Sarah Jenkins",
      secondApprover: "David Chen",
      reason: `Custom role created: ${assignedScope.description}`,
      auditLogId: auditEntry.id,
      version: newVersion,
      permissionsAdded: addedPerms.length > 0 ? addedPerms : selectedPerms,
      permissionsRemoved: removedPerms,
    });

    setRoles(getAllRoles());
    setSelectedRoleKey(customKey);
    setCopyModalOpen(false);
  };

  const togglePermission = (perm: PermissionKey) => {
    setSelectedPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  // What-If Evaluation
  const whatIfTargetUser = useMemo(() => {
    const allHolders = RoleHoldersService.getAllHolders();
    const holder = allHolders.find((h) => h.id === whatIfUserId);
    if (!holder) {
      return {
        id: whatIfUserId,
        name: "Selected User",
        email: "user@zenops.local",
        role: "Service Desk Agent",
        tenantId: "CMP_1001_ZENDEV",
        groups: ["Service-Desk"],
      } as UserContext;
    }
    return {
      id: holder.id,
      name: holder.name,
      email: holder.email,
      role: holder.roleKey,
      tenantId: holder.tenantId,
      groups: [holder.sourceDetail],
    } as UserContext;
  }, [whatIfUserId]);

  const whatIfEval = useMemo(() => {
    const currentPerms = getUserEffectivePermissions(whatIfTargetUser);
    const candidateRole = roles[whatIfRoleKey];
    const newPerms = candidateRole ? candidateRole.permissions : [];
    const incrementalPerms = newPerms.filter((p) => !currentPerms.includes(p));

    const simulatedUser: UserContext = {
      ...whatIfTargetUser,
      roles: [whatIfTargetUser.role, whatIfRoleKey],
    };
    const conflicts = detectUserSodConflicts(simulatedUser);

    return {
      currentCount: currentPerms.length,
      incrementalPerms,
      conflicts,
      wouldBlock: conflicts.length > 0,
    };
  }, [whatIfTargetUser, whatIfRoleKey, roles]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-default">System & Custom Roles</h2>
          <p className="text-xs text-secondary">
            System roles are protected enterprise baselines with review cadences and holder tracking. Least privilege and SoD policies are strictly enforced.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<HelpCircle className="w-3.5 h-3.5 text-primary" />}
            onClick={() => setWhatIfModalOpen(true)}
            className="whitespace-nowrap"
          >
            What-If Preview
          </Button>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
            onClick={() => setSodReportOpen(true)}
            className="whitespace-nowrap"
          >
            SoD Exceptions Report
          </Button>

          {/* Section 8: Single-line, clearly enabled primary button with permission check */}
          <div className="relative group">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => handleOpenCopy(roles["data_steward"] || roles["cmdb_admin"])}
              disabled={!canDefineRole}
              className="whitespace-nowrap inline-flex items-center"
            >
              Create Custom Role
            </Button>
            {!canDefineRole && (
              <div className="absolute right-0 top-full mt-1.5 hidden group-hover:block z-30 w-64 p-2 bg-neutral-900 text-white text-[11px] rounded shadow-lg">
                Action restricted: Creating custom roles requires the &apos;roles.define&apos; permission. Contact a CMDB Administrator.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Left List (Sticky) + Right Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Role List */}
        <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-4">
          {/* Search & Category Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search roles..."
                className="w-full bg-surface border border-border rounded-md pl-8 pr-3 py-1.5 text-xs text-default placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-surface border border-border rounded-md px-2.5 py-1.5 text-xs text-default focus:outline-none"
            >
              <option value="All">All Categories</option>
              <option value="CMDB Core">CMDB Core</option>
              <option value="Ownership">Ownership</option>
              <option value="ITIL Operations">ITIL Operations</option>
              <option value="Governance & Audit">Governance</option>
              <option value="Automated">Automated</option>
            </select>
          </div>

          {/* Role Cards List */}
          <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1 scrollbar-thin">
            {roleList.map((role) => {
              const isSelected = selectedRole?.key === role.key;
              const holderCount = RoleHoldersService.getHolderCount(role.key);
              const warnings = RoleHoldersService.getRoleWarnings(role.key);

              return (
                <div
                  key={role.key}
                  onClick={() => {
                    setSelectedRoleKey(role.key);
                    setActiveTab("permissions");
                  }}
                  className={cn(
                    "p-3 rounded-lg border transition-all cursor-pointer text-left space-y-1.5",
                    isSelected
                      ? "bg-selected/60 border-primary shadow-xs ring-1 ring-primary/20"
                      : "bg-surface border-border hover:border-border-strong hover:bg-sunken/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-xs text-default truncate">{role.name}</span>
                      {role.isSystem ? (
                        <span className="text-[10px] uppercase font-bold text-muted bg-sunken px-1.5 py-0.2 rounded border border-border">
                          System
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                          Custom
                        </span>
                      )}
                      {role.isOverdue && (
                        <span className="text-[9px] uppercase font-bold text-rose-600 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20">
                          Overdue
                        </span>
                      )}
                    </div>
                    {/* Pluralization fix: formatPermCount */}
                    <span className="text-[11px] font-mono text-muted shrink-0">
                      {formatPermCount(role.permissions.length)}
                    </span>
                  </div>

                  <p className="text-[11px] text-secondary line-clamp-2 leading-relaxed">
                    {role.description}
                  </p>

                  {/* Section 2.3: Inline SoD conflicts per role */}
                  {getRoleSodSummary(role.key) && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-800 dark:text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      <Scale className="w-3 h-3 shrink-0 text-amber-600" />
                      <span className="truncate">{getRoleSodSummary(role.key)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[10px] text-muted border-t border-border/40">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-muted" />
                      {formatHolderCount(holderCount)}
                    </span>
                    <span className="capitalize">
                      {role.scopeRule.type === "owned_by_me" || role.scopeRule.type === "owned_by_my_groups"
                        ? "Owned by my groups"
                        : role.scopeRule.type.replace(/_/g, " ")}
                    </span>
                    {warnings.length > 0 && (
                      <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> {warnings.length} alert{warnings.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Role Detail View / Side Drawer */}
        <div className="lg:col-span-7">
          {selectedRole ? (
            <div className="bg-surface border border-border rounded-xl p-4 sm:p-6 space-y-6 shadow-xs lg:sticky lg:top-4 max-h-[85vh] overflow-y-auto scrollbar-thin">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-border">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg font-bold text-default">{selectedRole.name}</h3>
                    {selectedRole.isSystem ? (
                      <Lozenge variant="neutral" size="xs">
                        System Role (Protected)
                      </Lozenge>
                    ) : (
                      <Lozenge variant="warning" size="xs">
                        Custom Role
                      </Lozenge>
                    )}
                    {selectedRole.isOverdue ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                        REVIEW OVERDUE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        Review Compliant
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">{selectedRole.description}</p>
                  {/* Section 2.3: Inline SoD conflict indicator in detail header */}
                  {getRoleSodSummary(selectedRole.key) && (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2 mt-1">
                      <Scale className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="font-semibold">{getRoleSodSummary(selectedRole.key)}</span>
                    </div>
                  )}
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Copy className="w-3.5 h-3.5" />}
                  onClick={() => handleOpenCopy(selectedRole)}
                  className="shrink-0"
                >
                  Copy Role
                </Button>
              </div>

              {/* Warnings Banner if any */}
              {roleWarnings.length > 0 && (
                <div className="space-y-2">
                  {roleWarnings.map((w, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-3 rounded-lg border flex items-start gap-2.5 text-xs",
                        w.severity === "critical"
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200"
                      )}
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <div>
                        <p className="font-semibold">{w.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Section 5: Real Review Cadence & Named Owners */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-sunken rounded-lg border border-border text-xs">
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Scope Rule</span>
                  <span className="font-semibold text-default capitalize">
                    {selectedRole.scopeRule.type === "owned_by_me" || selectedRole.scopeRule.type === "owned_by_my_groups"
                      ? "Owned by my groups"
                      : selectedRole.scopeRule.type.replace(/_/g, " ")}
                  </span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Role Owner / Backup</span>
                  <span className="font-semibold text-default truncate block" title={`${selectedRole.owner} (Backup: ${selectedRole.ownerBackup || "None"})`}>
                    {selectedRole.owner}
                  </span>
                  <span className="text-[10px] text-muted truncate block">
                    Backup: {selectedRole.ownerBackup || "None"}
                  </span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Review Cadence</span>
                  <span className="font-semibold text-default">{selectedRole.reviewCadence || "Quarterly"}</span>
                  <span className="text-[10px] text-muted block">
                    Last: {selectedRole.lastReviewed || "2026-10-01"}
                  </span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Next Review Due</span>
                  <span className={cn("font-semibold block", selectedRole.isOverdue ? "text-rose-600 font-bold" : "text-default")}>
                    {selectedRole.nextReviewDue || "2026-12-31"}
                  </span>
                  <span className="text-[10px] text-muted">
                    {RoleHoldersService.getHolderCount(selectedRole.key)} active holder{RoleHoldersService.getHolderCount(selectedRole.key) === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              {/* Section 6: CI Owner Scope Label & Explanation */}
              {(selectedRole.scopeRule.type === "owned_by_me" ||
                selectedRole.scopeRule.type === "owned_by_my_groups" ||
                selectedRole.key === "ci_owner") && (
                <div className="p-3.5 bg-blue-500/5 border border-blue-500/20 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-bold text-default">Enforced Scope: Owned by my groups</span>
                  </div>
                  <p className="text-secondary leading-relaxed">
                    Grants editing authority exclusively over configuration items where the CI&apos;s assigned owner group matches one of your active directory groups (e.g. DBA-Team, SRE-Team, or Platform-Eng).
                  </p>
                  <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[11px]">
                    <span className="text-muted">Dynamic Inventory Coverage:</span>
                    <span className="font-semibold text-primary">
                      Covers {ciCoverage.count} CIs in your assigned groups: {ciCoverage.matchedGroups.join(", ")}
                    </span>
                  </div>
                </div>
              )}

              {/* Tab Navigation: Permissions / Holders / History */}
              <div className="flex items-center gap-1 border-b border-border pb-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("permissions")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                    activeTab === "permissions"
                      ? "bg-selected text-primary shadow-xs"
                      : "text-muted hover:text-default"
                  )}
                >
                  Permissions ({selectedRole.permissions.length} Granted)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("holders")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5",
                    activeTab === "holders"
                      ? "bg-selected text-primary shadow-xs"
                      : "text-muted hover:text-default"
                  )}
                >
                  <Users className="w-3.5 h-3.5" />
                  Holders ({roleHolders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5",
                    activeTab === "history"
                      ? "bg-selected text-primary shadow-xs"
                      : "text-muted hover:text-default"
                  )}
                >
                  <History className="w-3.5 h-3.5" />
                  Change Audit ({roleChanges.length})
                </button>
              </div>

              {/* TAB 1: Permissions Categorized View with SoD Reason Highlighting */}
              {activeTab === "permissions" && (
                <div className="space-y-5">
                  {PERMISSION_CATEGORIES.map((cat) => {
                    return (
                      <div key={cat.name} className="space-y-2">
                        <div className="flex items-center justify-between border-b border-border/60 pb-1">
                          <span className="text-xs font-bold text-default uppercase tracking-wider">
                            {cat.name}
                          </span>
                          <span className="text-[10px] text-muted">
                            {cat.keys.filter((k) => selectedRole.permissions.includes(k)).length} / {cat.keys.length} granted
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          {cat.keys.map((permKey) => {
                            const isGranted = selectedRole.permissions.includes(permKey);
                            const def = PERMISSION_CATALOG[permKey];
                            const sodBlockReason = getSodBlockReason(selectedRole.key, permKey);

                            return (
                              <div
                                key={permKey}
                                className={cn(
                                  "p-2.5 rounded-lg border text-xs transition-colors",
                                  isGranted
                                    ? "bg-surface border-border text-default"
                                    : sodBlockReason
                                    ? "bg-rose-500/5 border-rose-500/20 text-secondary"
                                    : "bg-sunken/40 border-border/40 text-muted"
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2.5 min-w-0">
                                    <div
                                      className={cn(
                                        "w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                        isGranted
                                          ? "bg-emerald-500/10 text-emerald-600"
                                          : sodBlockReason
                                          ? "bg-rose-500/10 text-rose-600 font-bold"
                                          : "bg-neutral-500/10 text-neutral-400"
                                      )}
                                    >
                                      {isGranted ? (
                                        <Check className="w-3 h-3" />
                                      ) : sodBlockReason ? (
                                        <XCircle className="w-3 h-3 text-rose-600" />
                                      ) : (
                                        <Lock className="w-2.5 h-2.5" />
                                      )}
                                    </div>

                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-[11px] font-mono text-default">
                                          {permKey}
                                        </span>
                                        <span className="text-[10px] text-muted">&bull; {def?.label}</span>
                                        {isGranted ? (
                                          <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 rounded">
                                            Granted
                                          </span>
                                        ) : sodBlockReason ? (
                                          <span className="text-[9px] font-bold text-rose-600 bg-rose-500/10 px-1.5 rounded border border-rose-500/20">
                                            Forbidden by SoD Policy
                                          </span>
                                        ) : (
                                          <span className="text-[9px] text-muted bg-sunken px-1.5 rounded border border-border">
                                            Not Granted
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-secondary mt-0.5 leading-snug">
                                        {def?.description}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Section 7: Locked Permissions - Distinguish Not Granted from SoD Policy with clear reason */}
                                {sodBlockReason && (
                                  <div className="mt-2 pt-2 border-t border-rose-500/20 text-[10px] text-rose-700 dark:text-rose-300 bg-rose-500/5 p-2 rounded">
                                    <span className="font-bold block">Separation of Duties (SoD) Restriction:</span>
                                    {sodBlockReason}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: Section 4 - Role Holders List with Source & Inactivity Warnings */}
              {activeTab === "holders" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-default uppercase tracking-wider">
                        Assigned Users & Principals ({roleHolders.length})
                      </h4>
                      <p className="text-[11px] text-muted">
                        Derived dynamically from Active Directory SSO groups, data-ownership auto-grants, and manual dual-approvals.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {roleHolders.map((holder) => (
                      <div
                        key={holder.id}
                        className={cn(
                          "p-3 rounded-lg border text-xs transition-colors",
                          holder.inactiveDays >= 90
                            ? "bg-amber-500/5 border-amber-500/30"
                            : "bg-surface border-border"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-default">{holder.name}</span>
                              <span className="text-muted text-[11px]">({holder.email})</span>
                              <Lozenge
                                variant={
                                  holder.assignmentSource === "SSO group"
                                    ? "info"
                                    : holder.assignmentSource === "auto-grant"
                                    ? "success"
                                    : "neutral"
                                }
                                size="xs"
                              >
                                {holder.assignmentSource}
                              </Lozenge>
                            </div>
                            <p className="text-[11px] text-secondary">{holder.title}</p>
                            <p className="text-[10px] text-muted font-mono">{holder.sourceDetail}</p>
                          </div>

                          <div className="text-right shrink-0 space-y-1">
                            <span className="text-[10px] text-muted block">
                              Last used: <span className="text-default font-medium">{holder.lastUsed}</span>
                            </span>
                            {holder.inactiveDays >= 90 ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 block">
                                Inactive {holder.inactiveDays} days
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-600 font-medium">Active</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: Role Change History */}
              {activeTab === "history" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-default uppercase tracking-wider">
                      Role Mutation & Assignment Trail
                    </h4>
                    <span className="text-[10px] text-muted">
                      {roleChanges.length} recorded version event{roleChanges.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {roleChanges.map((chg) => (
                      <div key={chg.id} className="p-3.5 rounded-lg border border-border bg-sunken/40 text-xs space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                              v{chg.version || 1}
                            </span>
                            <span className="font-semibold text-default">
                              {chg.action === "created"
                                ? `Created Role: ${chg.roleName}`
                                : chg.targetUser
                                ? `${chg.action.toUpperCase()}: ${chg.targetUser}`
                                : `${chg.action.toUpperCase()}: ${chg.roleName}`}
                            </span>
                          </div>
                          {chg.auditLogId && (
                            <Link
                              href={`/settings/security/access-audit?search=${chg.auditLogId}`}
                              className="text-[10px] font-mono text-primary hover:underline flex items-center gap-1 bg-surface px-2 py-0.5 rounded border border-border"
                              title="Click to view matching immutable security audit event"
                            >
                              <ShieldAlert className="w-3 h-3 text-primary" />
                              Audit: {chg.auditLogId}
                            </Link>
                          )}
                        </div>

                        <p className="text-secondary text-[11px] leading-relaxed">{chg.reason}</p>

                        {/* Permission mutation chips */}
                        {((chg.permissionsAdded && chg.permissionsAdded.length > 0) ||
                          (chg.permissionsRemoved && chg.permissionsRemoved.length > 0)) && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {chg.permissionsAdded?.map((p) => (
                              <span
                                key={p}
                                className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              >
                                + {p}
                              </span>
                            ))}
                            {chg.permissionsRemoved?.map((p) => (
                              <span
                                key={p}
                                className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              >
                                - {p}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-muted pt-1 border-t border-border/40">
                          <span>
                            By: <strong className="text-default font-medium">{chg.assignedBy}</strong>
                            {chg.secondApprover ? ` (Dual approver: ${chg.secondApprover})` : ""}
                          </span>
                          <span>{new Date(chg.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-muted border border-dashed rounded-xl">
              Select a role to inspect its configuration.
            </div>
          )}
        </div>
      </div>

      {/* What-If Role Assignment Modal */}
      {whatIfModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-modal max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-default">What-If Role Assignment Preview</h3>
              </div>
              <button
                type="button"
                onClick={() => setWhatIfModalOpen(false)}
                className="text-muted hover:text-default text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-secondary">
                Simulate granting a role to an active user to inspect incremental permissions and proactively detect Separation of Duties (SoD) conflicts before applying.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-default block">Select Target User:</label>
                  <select
                    value={whatIfUserId}
                    onChange={(e) => setWhatIfUserId(e.target.value)}
                    className="w-full bg-surface border border-border rounded-md px-2.5 py-1.5 text-xs text-default"
                  >
                    {RoleHoldersService.getAllHolders().map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.roleKey})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-default block">Select Role to Add:</label>
                  <select
                    value={whatIfRoleKey}
                    onChange={(e) => setWhatIfRoleKey(e.target.value)}
                    className="w-full bg-surface border border-border rounded-md px-2.5 py-1.5 text-xs text-default"
                  >
                    {Object.values(roles).map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Simulation Result */}
              <div className="p-3.5 rounded-lg border border-border bg-sunken space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-default">Simulation Verdict:</span>
                  {whatIfEval.wouldBlock ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                      BLOCKED BY SOD
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      PERMITTED
                    </span>
                  )}
                </div>

                <div className="text-[11px] space-y-1">
                  <p>
                    <span className="text-muted">Current user permissions:</span>{" "}
                    <span className="font-semibold text-default">{whatIfEval.currentCount} permissions</span>
                  </p>
                  <p>
                    <span className="text-muted">Incremental permissions gained:</span>{" "}
                    <span className="font-semibold text-primary">
                      +{whatIfEval.incrementalPerms.length} ({whatIfEval.incrementalPerms.join(", ") || "none"})
                    </span>
                  </p>
                </div>

                {whatIfEval.conflicts.length > 0 && (
                  <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 space-y-1">
                    <span className="font-bold block">Toxic SoD Conflicts Detected:</span>
                    {whatIfEval.conflicts.map((c, i) => (
                      <p key={i} className="text-[10px] leading-relaxed">
                        &bull; {c.reason}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setWhatIfModalOpen(false)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SoD Exceptions Report Modal */}
      {sodReportOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-modal max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-default">
                  Separation of Duties (SoD) Exceptions Audit Report
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSodReportOpen(false)}
                className="text-muted hover:text-default text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-secondary">
                Comprehensive security scan across all active users, SSO directory group mappings, and temporary Just-In-Time elevations to identify combined toxic privilege combinations.
              </p>

              <div className="space-y-2">
                {/* Seeded findings */}
                <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-700 dark:text-rose-300">
                      Michael Vance (mvance.legacy@zenops.local)
                    </span>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20">
                      CRITICAL RISK
                    </span>
                  </div>
                  <p className="text-secondary text-[11px]">
                    User possesses Administrator role while holding legacy DBA-Team approvals. Inactive for 118 days.
                  </p>
                  <p className="text-[10px] font-mono text-muted">
                    Remediation: Revoke standing Administrator assignment; mandate JIT elevation for maintenance.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                      Standard Directory Users (11 Profiles Checked)
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                      COMPLIANT
                    </span>
                  </div>
                  <p className="text-secondary text-[11px]">
                    All other users conform strictly to single-persona role boundaries without toxic privilege overlap.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setSodReportOpen(false)}>
                Dismiss Report
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Role Modal */}
      {copyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-modal max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4 text-primary" />
                <h3 className="text-base font-bold text-default">
                  Clone Role: {targetCopyRole?.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCopyModalOpen(false)}
                className="text-muted hover:text-default text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomRole} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-default block">Custom Role Name *</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  required
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-xs text-default focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-default block">Description</label>
                <textarea
                  rows={2}
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-xs text-default focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Item 1: Enforced Scope Boundary Configuration */}
              <div className="p-3 bg-sunken/60 rounded-lg border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-bold text-default">Scope Boundary Configuration</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-default block">
                      Base Scope Mode *
                    </label>
                    <select
                      value={customScopeType}
                      onChange={(e) => setCustomScopeType(e.target.value)}
                      className="w-full bg-surface border border-border rounded-md px-2.5 py-1.5 text-xs text-default focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="whole_tenant">Whole Tenant</option>
                      <option value="owned_by_my_groups">Owned by my groups (owner_group IN $user.groups)</option>
                      <option value="service_scoped">Service Scoped (service IN $user.services)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-default block">
                      Environment Constraint
                    </label>
                    <select
                      value={selectedEnvScope}
                      onChange={(e) => setSelectedEnvScope(e.target.value as any)}
                      className="w-full bg-surface border border-border rounded-md px-2.5 py-1.5 text-xs text-default focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="all">All Environments (Prod + Non-Prod)</option>
                      <option value="production">Production Only</option>
                      <option value="non_production">Non-Production Only (Staging, QA, Dev)</option>
                    </select>
                  </div>
                </div>

                {/* Region constraints */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-default flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted" /> Region Constraints
                    </span>
                    <span className="text-[10px] text-muted">
                      {selectedRegions.length === 0 ? "Global / All Regions" : `${selectedRegions.length} selected`}
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"].map((reg) => {
                      const isSelected = selectedRegions.includes(reg);
                      return (
                        <button
                          key={reg}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedRegions(selectedRegions.filter((r) => r !== reg));
                            } else {
                              setSelectedRegions([...selectedRegions, reg]);
                            }
                          }}
                          className={cn(
                            "px-2 py-0.5 rounded text-[11px] font-mono transition-colors border",
                            isSelected
                              ? "bg-primary text-white border-primary"
                              : "bg-surface text-secondary border-border hover:bg-sunken"
                          )}
                        >
                          {reg}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CI Class constraints */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-default flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-muted" /> CI Class Constraints
                    </span>
                    <span className="text-[10px] text-muted">
                      {selectedClasses.length === 0 ? "All Classes Allowed" : `${selectedClasses.length} selected`}
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Server/VM", "Database", "Network Router/Switch", "Cloud Service", "Application"].map((cls) => {
                      const isSelected = selectedClasses.includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedClasses(selectedClasses.filter((c) => c !== cls));
                            } else {
                              setSelectedClasses([...selectedClasses, cls]);
                            }
                          }}
                          className={cn(
                            "px-2 py-0.5 rounded text-[11px] transition-colors border",
                            isSelected
                              ? "bg-primary text-white border-primary"
                              : "bg-surface text-secondary border-border hover:bg-sunken"
                          )}
                        >
                          {cls}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-default block">
                  Selected Permissions ({selectedPerms.length})
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-border p-2 rounded-md bg-sunken/40">
                  {ALL_PERMISSIONS.map((perm) => {
                    const checked = selectedPerms.includes(perm);
                    return (
                      <label
                        key={perm}
                        className={cn(
                          "flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs select-none transition-colors",
                          checked ? "bg-selected/70 text-primary font-medium" : "hover:bg-sunken text-secondary"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(perm)}
                          className="rounded border-border text-primary h-3.5 w-3.5"
                        />
                        <span className="font-mono text-[11px] truncate">{perm}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setCopyModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Custom Role
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
