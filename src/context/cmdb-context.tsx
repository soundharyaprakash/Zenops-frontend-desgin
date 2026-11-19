"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import {
  CIItem,
  CIRelationship,
  DiscoverySource,
  ReconciliationRule,
  DataQualityTask,
  AttestationCampaign,
  CIAuditHistory,
  DashboardMetrics,
} from "@/types/cmdb";
import {
  INITIAL_CIS,
  INITIAL_RELATIONSHIPS,
  INITIAL_DISCOVERY_SOURCES,
  INITIAL_RECONCILIATION_RULES,
  INITIAL_DATA_QUALITY_TASKS,
  INITIAL_ATTESTATION_CAMPAIGNS,
  INITIAL_AUDIT_HISTORY,
} from "@/services/mock-data";
import { CMDBService } from "@/services/cmdb-service";
import {
  enrichAndReconcileTasks,
  createDataQualityAuditRecord,
  evaluateBulkApply,
} from "@/lib/governance/dataQuality";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
}

export interface ImpactAnalysisResult {
  targetCi: CIItem;
  dependentCis: {
    ci: CIItem;
    relationship: CIRelationship;
    depth: number;
    impactSeverity: "Severe" | "High" | "Moderate" | "Low";
  }[];
  blastRadiusScore: number; // 0-100
  riskLevel: "Severe" | "High" | "Moderate" | "Low";
  impactSummary: string;
}

export { type UserRole, type TenantInfo } from "@/types/cmdb";
import { UserRole, TenantInfo } from "@/types/cmdb";
import { AVAILABLE_TENANTS } from "@/lib/constants";
export { AVAILABLE_TENANTS } from "@/lib/constants";
import { AuthService } from "@/services/auth-service";
import { AuthSession } from "@/types/auth";

export type { AuthSession };

interface CMDBContextType {
  cis: CIItem[];
  relationships: CIRelationship[];
  discoverySources: DiscoverySource[];
  reconciliationRules: ReconciliationRule[];
  dataQualityTasks: DataQualityTask[];
  attestationCampaigns: AttestationCampaign[];
  auditHistory: CIAuditHistory[];
  metrics: DashboardMetrics;
  toasts: ToastMessage[];

  // Actions
  addCI: (ci: Omit<CIItem, "id" | "createdAt" | "updatedAt">, actor?: string) => { success: boolean; ci?: CIItem; error?: string };
  bulkAddCIs: (newCIs: Omit<CIItem, "id" | "createdAt" | "updatedAt">[], actor?: string) => { success: boolean; count: number; items: CIItem[] };
  updateCI: (id: string, updates: Partial<CIItem>, actor?: string, changeRecord?: string) => { success: boolean; ci?: CIItem; error?: string };
  retireCI: (id: string, changeRecord?: string, reason?: string, actor?: string) => { success: boolean; error?: string };
  deleteCI: (id: string, actor?: string) => void;
  getCIById: (id: string) => CIItem | undefined;

  // Relationships
  addRelationship: (rel: Omit<CIRelationship, "id" | "createdAt">) => void;
  deleteRelationship: (id: string) => void;
  getCIRelationships: (ciId: string) => { parents: CIRelationship[]; children: CIRelationship[] };
  getImpactAnalysis: (ciId: string) => ImpactAnalysisResult | null;

  // Data Quality
  approveDQTask: (taskId: string, actor?: string) => void;
  rejectDQTask: (taskId: string, actor?: string, reason?: string) => void;
  dismissDQTask: (taskId: string, category: string, reason: string, actor?: string) => void;
  applyDQTask: (taskId: string, actor?: string, fixOptionId?: string) => void;
  requestOwnerAcceptance: (taskId: string, actor?: string) => void;
  acceptOwnerAssignment: (taskId: string, actor?: string) => void;
  applyComplianceWithEvidence: (taskId: string, evidenceDoc: string, humanApprover: string, actor?: string) => void;
  bulkApplyEligibleTasks: (threshold?: number, actor?: string) => { count: number; appliedIds: string[] };

  // Discovery Sources
  triggerDiscoveryRun: (sourceId: string) => void;

  // Attestations
  certifyCampaignCI: (campaignId: string, ciId: string, status: "Certified" | "Rejected") => void;

  // Toasts
  showToast: (type: ToastMessage["type"], title: string, message?: string) => void;
  removeToast: (id: string) => void;

  // Workspace & Role Awareness
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  activeTenant: string;
  setActiveTenant: (tenant: string) => void;
  selectedEnvironment: string;
  setSelectedEnvironment: (env: string) => void;
  availableTenants: TenantInfo[];
  session: AuthSession | null;
  currentUser: AuthSession | null;
  logout: () => void;
  canEdit: boolean;
  canMerge: boolean;
  canRetire: boolean;
  canAdmin: boolean;
}

const CMDBContext = createContext<CMDBContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = "zenops_cmdb_";

export function CMDBProvider({ children }: { children: React.ReactNode }) {
  const [cis, setCis] = useState<CIItem[]>(INITIAL_CIS);
  const [relationships, setRelationships] = useState<CIRelationship[]>(INITIAL_RELATIONSHIPS);
  const [discoverySources, setDiscoverySources] = useState<DiscoverySource[]>(INITIAL_DISCOVERY_SOURCES);
  const [reconciliationRules, setReconciliationRules] = useState<ReconciliationRule[]>(INITIAL_RECONCILIATION_RULES);
  const [dataQualityTasks, setDataQualityTasks] = useState<DataQualityTask[]>(() =>
    enrichAndReconcileTasks(INITIAL_DATA_QUALITY_TASKS, INITIAL_CIS)
  );
  const [attestationCampaigns, setAttestationCampaigns] = useState<AttestationCampaign[]>(INITIAL_ATTESTATION_CAMPAIGNS);
  const [auditHistory, setAuditHistory] = useState<CIAuditHistory[]>(INITIAL_AUDIT_HISTORY);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Authenticated Session State
  const [session, setSession] = useState<AuthSession | null>(null);

  // Enterprise Workspace & Role State
  const [userRole, setUserRole] = useState<UserRole>("Admin");
  const [activeTenant, setActiveTenant] = useState<string>("ZenDev Software Technologies");
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("All");

  // Synchronize authenticated session on mount
  useEffect(() => {
    const active = AuthService.getSession();
    if (active) {
      setSession(active);
      setUserRole(active.role);
      setActiveTenant(active.tenantName);
    }
  }, []);

  // Filter accessible tenants to only those belonging to the authenticated user's session
  const availableTenants = useMemo(() => {
    if (session && session.availableTenants && session.availableTenants.length > 0) {
      return session.availableTenants;
    }
    return AVAILABLE_TENANTS;
  }, [session]);

  const logout = () => {
    AuthService.clearSession();
    setSession(null);
    window.location.href = "/login?banner=signed-out";
  };

  const canEdit = userRole === "Editor" || userRole === "CMDB Owner" || userRole === "Admin";
  const canMerge = userRole === "CMDB Owner" || userRole === "Admin";
  const canRetire = userRole === "Admin" || userRole === "CMDB Owner";
  const canAdmin = userRole === "Admin";

  // Load from localStorage or CMDBService on tenant change
  useEffect(() => {
    let isCurrent = true;
    const tenantKey = `${STORAGE_KEY_PREFIX}cis_${activeTenant.replace(/\s+/g, "_")}`;
    try {
      const stored = localStorage.getItem(tenantKey);
      if (stored) {
        setCis(JSON.parse(stored));
        setIsLoaded(true);
        return;
      }
    } catch {
      // fallback
    }

    CMDBService.fetchCIs(activeTenant).then((tenantCIs) => {
      if (isCurrent && tenantCIs) {
        setCis(tenantCIs);
        setIsLoaded(true);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [activeTenant]);

  // Load supporting governance data from localStorage if present
  useEffect(() => {
    try {
      const storedRels = localStorage.getItem(`${STORAGE_KEY_PREFIX}rels`);
      if (storedRels) setRelationships(JSON.parse(storedRels));

      const storedDQ = localStorage.getItem(`${STORAGE_KEY_PREFIX}dq`);
      if (storedDQ) {
        const parsed = JSON.parse(storedDQ);
        setDataQualityTasks(enrichAndReconcileTasks(parsed, INITIAL_CIS));
      }

      const storedAud = localStorage.getItem(`${STORAGE_KEY_PREFIX}aud`);
      if (storedAud) setAuditHistory(JSON.parse(storedAud));

      const storedAtt = localStorage.getItem(`${STORAGE_KEY_PREFIX}att`);
      if (storedAtt) setAttestationCampaigns(JSON.parse(storedAtt));
    } catch {
      // Fallback to initial
    }
  }, []);

  // Save changes to localStorage per tenant
  useEffect(() => {
    if (!isLoaded || cis.length === 0) return;
    try {
      const tenantKey = `${STORAGE_KEY_PREFIX}cis_${activeTenant.replace(/\s+/g, "_")}`;
      localStorage.setItem(tenantKey, JSON.stringify(cis));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}rels`, JSON.stringify(relationships));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}dq`, JSON.stringify(dataQualityTasks));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}aud`, JSON.stringify(auditHistory));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}att`, JSON.stringify(attestationCampaigns));
    } catch {
      // Handle storage quota or private mode
    }
  }, [cis, activeTenant, relationships, dataQualityTasks, auditHistory, attestationCampaigns, isLoaded]);

  // Reconcile Data Quality tasks whenever CIs change
  useEffect(() => {
    if (cis.length > 0) {
      setDataQualityTasks((prev) => enrichAndReconcileTasks(prev, cis));
    }
  }, [cis]);

  const showToast = (type: ToastMessage["type"], title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Dashboard Metrics Computed Dynamically
  const metrics = useMemo<DashboardMetrics>(() => {
    const total = cis.length;
    if (total === 0) {
      return {
        totalCIs: 0,
        operationalCIs: 0,
        nonOperationalCIs: 0,
        averageTrustScore: 0,
        staleCIPercentage: 0,
        staleCount: 0,
        duplicateRate: 0,
        duplicateSuspects: 0,
        missingOwnerCount: 0,
        missingOwnerPercent: 0,
        attestationCompletion: 0,
        completenessScore: 0,
        discoveryCoverage: 92,
        impactAccuracy: 9,
      };
    }

    const operational = cis.filter((c) => c.operationalStatus === "Operational").length;
    const nonOperational = cis.filter((c) => c.operationalStatus !== "Operational").length;
    const totalTrust = cis.reduce((acc, c) => acc + (c.trustScore || 0), 0);
    const avgTrust = Math.round(totalTrust / total);

    // Stale if lastDiscovered was > 14 days ago or trust freshness < 50
    const now = new Date().getTime();
    const staleCount = cis.filter((c) => {
      if (!c.lastDiscovered) return true;
      const days = (now - new Date(c.lastDiscovered).getTime()) / (1000 * 3600 * 24);
      return days > 14;
    }).length;
    const stalePercent = Math.round((staleCount / total) * 100);

    // Missing Owner
    const missingOwnerCount = cis.filter(
      (c) => !c.owner || c.owner.trim() === "" || c.owner.toLowerCase() === "unassigned"
    ).length;
    const missingOwnerPercent = Math.round((missingOwnerCount / total) * 100);

    // Duplicate suspects
    const duplicateTasks = dataQualityTasks.filter(
      (t) => t.issueType === "Duplicate Suspect" && t.status !== "Applied"
    ).length;
    const dupRate = Number(((duplicateTasks / total) * 100).toFixed(1));

    // Completeness (has owner, support group, environment, and businessCriticality)
    const completeCount = cis.filter(
      (c) =>
        c.owner &&
        c.owner !== "Unassigned" &&
        c.supportGroup &&
        c.supportGroup !== "Unassigned" &&
        c.environment &&
        c.businessCriticality
    ).length;
    const completenessScore = Math.round((completeCount / total) * 100);

    const totalCampaigns = attestationCampaigns.length;
    const avgAttestation = totalCampaigns
      ? Math.round(
          attestationCampaigns.reduce((acc, c) => acc + c.completionPercentage, 0) /
            totalCampaigns
        )
      : 80;

    return {
      totalCIs: total,
      operationalCIs: operational,
      nonOperationalCIs: nonOperational,
      averageTrustScore: avgTrust,
      staleCIPercentage: stalePercent,
      staleCount,
      duplicateRate: dupRate,
      duplicateSuspects: duplicateTasks,
      missingOwnerCount,
      missingOwnerPercent,
      attestationCompletion: avgAttestation,
      completenessScore,
      discoveryCoverage: 92,
      impactAccuracy: 9,
    };
  }, [cis, dataQualityTasks, attestationCampaigns]);

  const getCIById = (id: string) => cis.find((c) => c.id === id);

  // Helper to add audit record
  const logAudit = (
    ciId: string,
    ciName: string,
    fieldChanged: string,
    beforeValue: string,
    afterValue: string,
    changedBy: string,
    changeType: CIAuditHistory["changeType"] = "Update",
    changeRecord?: string
  ) => {
    const newRecord: CIAuditHistory = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ciId,
      ciName,
      fieldChanged,
      beforeValue: String(beforeValue || "—"),
      afterValue: String(afterValue || "—"),
      changedBy: changedBy || "Enterprise Admin",
      timestamp: new Date().toISOString(),
      changeType,
      changeRecord,
    };
    setAuditHistory((prev) => [newRecord, ...prev]);
  };

  // Add CI
  const addCI = (
    newCI: Omit<CIItem, "id" | "createdAt" | "updatedAt">,
    actor = "Enterprise Admin"
  ) => {
    const isLive =
      newCI.operationalStatus === "Operational" || newCI.lifecycleStatus === "In Use";

    // Rule: Live CIs require Owner and Support Group
    const hasOwner = newCI.owner && newCI.owner.trim() !== "" && newCI.owner !== "Unassigned";
    const hasSupport =
      newCI.supportGroup &&
      newCI.supportGroup.trim() !== "" &&
      newCI.supportGroup !== "Unassigned";

    let calculatedTrustScore = newCI.trustScore || 85;
    const qualityFlags = [...(newCI.qualityFlags || [])];
    const scoreReasons = [...(newCI.scoreReasons || [])];

    if (isLive && (!hasOwner || !hasSupport)) {
      calculatedTrustScore = Math.max(30, calculatedTrustScore - 30);
      if (!hasOwner) {
        qualityFlags.push("Missing Required Owner");
        scoreReasons.push("Live CI lacks designated owner (-20 pts)");
      }
      if (!hasSupport) {
        qualityFlags.push("Missing Support Group");
        scoreReasons.push("Live CI lacks assigned support group (-10 pts)");
      }
    }

    const nextIdNum = 1000 + cis.length + 1;
    const id = `CI-${nextIdNum}`;
    const now = new Date().toISOString();

    const compId = activeTenant.includes("Choose")
      ? "CMP_1009_CHOOSECY"
      : activeTenant.includes("Space")
      ? "CMP_1015_SPACEZEN"
      : "CMP_1001_ZENDEV";
    const compDomain = activeTenant.includes("Choose")
      ? "choosecy.zenops.io"
      : activeTenant.includes("Space")
      ? "spacezen.zenops.io"
      : "zendev.zenops.io";

    const createdItem: CIItem = {
      ...newCI,
      id,
      company: newCI.company || activeTenant,
      company_id: newCI.company_id || compId,
      sys_domain: newCI.sys_domain || compDomain,
      trustScore: calculatedTrustScore,
      qualityFlags,
      scoreReasons,
      createdAt: now,
      updatedAt: now,
    };

    setCis((prev) => [createdItem, ...prev]);

    // Audit log
    logAudit(id, createdItem.name, "lifecycleStatus", "None", createdItem.lifecycleStatus, actor, "Create");

    // Rule: Missing ownership creates a Data Quality Task
    if (isLive && (!hasOwner || !hasSupport)) {
      const dqTask: DataQualityTask = {
        id: `DQ-${Date.now().toString().slice(-4)}`,
        ciId: id,
        ciName: createdItem.name,
        ciClass: createdItem.ciClass,
        issueType: !hasOwner ? "Missing Required Ownership" : "Unassigned Support Group",
        proposedFix: `Assign primary owner and support group based on ${createdItem.environment} department ownership.`,
        confidence: 88,
        approver: "Platform Governance Team",
        status: "Pending",
        severity: "Critical",
        createdAt: now,
      };
      setDataQualityTasks((prev) => [dqTask, ...prev]);
      showToast(
        "warning",
        "CI Created with Ownership Flags",
        `Created ${id}. Because this is a Live CI without full ownership, trust score is reduced to ${calculatedTrustScore}% and a Data Quality Task was opened.`
      );
    } else {
      showToast("success", "Configuration Item Created", `${createdItem.name} (${id}) has been added to the CMDB.`);
    }

    return { success: true, ci: createdItem };
  };

  // Bulk Add CIs (from CSV or external ingestion)
  const bulkAddCIs = (
    newCIsList: Omit<CIItem, "id" | "createdAt" | "updatedAt">[],
    actor = "Enterprise Admin (CSV Import)"
  ) => {
    if (!newCIsList || newCIsList.length === 0) {
      showToast("error", "No Items Provided", "No valid configuration items to import.");
      return { success: false, count: 0, items: [] };
    }

    const now = new Date().toISOString();
    let currentIdNum = 1000 + cis.length;
    const createdItems: CIItem[] = [];
    const newDQTasks: DataQualityTask[] = [];

    newCIsList.forEach((newCI) => {
      currentIdNum += 1;
      const id = `CI-${currentIdNum}`;

      const isLive =
        newCI.operationalStatus === "Operational" || newCI.lifecycleStatus === "In Use";
      const hasOwner = newCI.owner && newCI.owner.trim() !== "" && newCI.owner !== "Unassigned";
      const hasSupport =
        newCI.supportGroup &&
        newCI.supportGroup.trim() !== "" &&
        newCI.supportGroup !== "Unassigned";

      let calculatedTrustScore = newCI.trustScore || 85;
      const qualityFlags = [...(newCI.qualityFlags || [])];
      const scoreReasons = [...(newCI.scoreReasons || [])];

      if (isLive && (!hasOwner || !hasSupport)) {
        calculatedTrustScore = Math.max(30, calculatedTrustScore - 30);
        if (!hasOwner) {
          qualityFlags.push("Missing Required Owner");
          scoreReasons.push("Live CI lacks designated owner (-20 pts)");
        }
        if (!hasSupport) {
          qualityFlags.push("Missing Support Group");
          scoreReasons.push("Live CI lacks assigned support group (-10 pts)");
        }
      }

      const compId = activeTenant.includes("Choose")
        ? "CMP_1009_CHOOSECY"
        : activeTenant.includes("Space")
        ? "CMP_1015_SPACEZEN"
        : "CMP_1001_ZENDEV";
      const compDomain = activeTenant.includes("Choose")
        ? "choosecy.zenops.io"
        : activeTenant.includes("Space")
        ? "spacezen.zenops.io"
        : "zendev.zenops.io";

      const createdItem: CIItem = {
        ...newCI,
        id,
        company: newCI.company || activeTenant,
        company_id: newCI.company_id || compId,
        sys_domain: newCI.sys_domain || compDomain,
        trustScore: calculatedTrustScore,
        qualityFlags,
        scoreReasons,
        createdAt: now,
        updatedAt: now,
      };

      createdItems.push(createdItem);

      logAudit(
        id,
        createdItem.name,
        "lifecycleStatus",
        "None",
        createdItem.lifecycleStatus,
        actor,
        "Create"
      );

      if (isLive && (!hasOwner || !hasSupport)) {
        newDQTasks.push({
          id: `DQ-${Date.now().toString().slice(-4)}-${currentIdNum}`,
          ciId: id,
          ciName: createdItem.name,
          ciClass: createdItem.ciClass,
          issueType: !hasOwner ? "Missing Required Ownership" : "Unassigned Support Group",
          proposedFix: `Assign primary owner and support group based on ${createdItem.environment} department ownership.`,
          confidence: 88,
          approver: "Platform Governance Team",
          status: "Pending",
          severity: "Critical",
          createdAt: now,
        });
      }
    });

    setCis((prev) => [...createdItems, ...prev]);

    if (newDQTasks.length > 0) {
      setDataQualityTasks((prev) => [...newDQTasks, ...prev]);
    }

    showToast(
      "success",
      "Bulk Import Successful",
      `Successfully imported ${createdItems.length} Configuration Items into the CMDB.`
    );

    return { success: true, count: createdItems.length, items: createdItems };
  };

  // Update CI
  const updateCI = (
    id: string,
    updates: Partial<CIItem>,
    actor = "Enterprise Admin",
    changeRecord?: string
  ) => {
    const existing = cis.find((c) => c.id === id);
    if (!existing) {
      showToast("error", "Error", `CI ${id} not found.`);
      return { success: false, error: "CI not found" };
    }

    const now = new Date().toISOString();

    // Track changed fields for Audit History
    const auditEntries: Array<{ field: string; before: string; after: string }> = [];
    const fieldsToTrack: (keyof CIItem)[] = [
      "name",
      "lifecycleStatus",
      "operationalStatus",
      "environment",
      "businessCriticality",
      "owner",
      "supportGroup",
      "dataClassification",
      "trustScore",
      "discoverySource",
    ];

    fieldsToTrack.forEach((field) => {
      if (updates[field] !== undefined && updates[field] !== existing[field]) {
        auditEntries.push({
          field,
          before: String(existing[field] ?? "—"),
          after: String(updates[field] ?? "—"),
        });
      }
    });

    const isLive =
      (updates.operationalStatus ?? existing.operationalStatus) === "Operational" ||
      (updates.lifecycleStatus ?? existing.lifecycleStatus) === "In Use";
    const currentOwner = updates.owner ?? existing.owner;
    const currentSupport = updates.supportGroup ?? existing.supportGroup;

    let newTrustScore = updates.trustScore ?? existing.trustScore;

    // Rule: Missing ownership affects Trust Score
    if (isLive && (!currentOwner || currentOwner === "Unassigned" || !currentSupport || currentSupport === "Unassigned")) {
      newTrustScore = Math.min(newTrustScore, 50);
    } else if (existing.trustScore < 60 && currentOwner && currentOwner !== "Unassigned" && currentSupport && currentSupport !== "Unassigned") {
      newTrustScore = 88; // Restored
    }

    const updatedItem: CIItem = {
      ...existing,
      ...updates,
      trustScore: newTrustScore,
      updatedAt: now,
    };

    setCis((prev) => prev.map((c) => (c.id === id ? updatedItem : c)));

    // Record audits
    auditEntries.forEach((entry) => {
      logAudit(id, updatedItem.name, entry.field, entry.before, entry.after, actor, "Update", changeRecord);
    });

    showToast("success", "CI Updated", `${updatedItem.name} has been updated successfully.`);
    return { success: true, ci: updatedItem };
  };

  // Retire CI
  const retireCI = (
    id: string,
    changeRecord?: string,
    reason?: string,
    actor = "Enterprise Admin"
  ) => {
    const existing = cis.find((c) => c.id === id);
    if (!existing) {
      showToast("error", "Error", "CI not found.");
      return { success: false, error: "CI not found" };
    }

    // Rule: Production CI retirement requires a Change Record
    if (existing.environment === "Production" && (!changeRecord || changeRecord.trim() === "")) {
      showToast(
        "error",
        "Change Record Required",
        "Retirement of Production CIs requires an approved Change Record (e.g. CHG-XXXX)."
      );
      return { success: false, error: "Production retirement requires a Change Record" };
    }

    const now = new Date().toISOString();
    const updated: CIItem = {
      ...existing,
      lifecycleStatus: "Retired",
      operationalStatus: "Non-operational",
      changeRecord: changeRecord || existing.changeRecord,
      updatedAt: now,
    };

    setCis((prev) => prev.map((c) => (c.id === id ? updated : c)));

    logAudit(
      id,
      existing.name,
      "lifecycleStatus",
      existing.lifecycleStatus,
      "Retired",
      actor,
      "Retire",
      changeRecord
    );

    logAudit(
      id,
      existing.name,
      "operationalStatus",
      existing.operationalStatus,
      "Non-operational",
      actor,
      "Retire",
      changeRecord
    );

    showToast(
      "success",
      "CI Retired Successfully",
      `${existing.name} (${id}) is now set to Retired under Change Record ${changeRecord || "N/A"}.`
    );
    return { success: true };
  };

  const deleteCI = (id: string, actor = "Enterprise Admin") => {
    const existing = cis.find((c) => c.id === id);
    if (!existing) return;
    setCis((prev) => prev.filter((c) => c.id !== id));
    setRelationships((prev) =>
      prev.filter((r) => r.parentCiId !== id && r.childCiId !== id)
    );
    logAudit(id, existing.name, "status", existing.lifecycleStatus, "Deleted", actor, "Retire");
    showToast("info", "CI Removed", `${existing.name} has been deleted from the CMDB.`);
  };

  // Relationships
  const addRelationship = (rel: Omit<CIRelationship, "id" | "createdAt">) => {
    const id = `REL-${Date.now().toString().slice(-4)}`;
    const newRel: CIRelationship = {
      ...rel,
      id,
      createdAt: new Date().toISOString(),
    };
    setRelationships((prev) => [...prev, newRel]);
    showToast(
      "success",
      "Relationship Linked",
      `${rel.parentCiName} → ${rel.childCiName} (${rel.relationshipType})`
    );
  };

  const deleteRelationship = (id: string) => {
    setRelationships((prev) => prev.filter((r) => r.id !== id));
    showToast("info", "Relationship Removed", "Dependency link disconnected.");
  };

  const getCIRelationships = (ciId: string) => {
    const parents = relationships.filter((r) => r.childCiId === ciId);
    const children = relationships.filter((r) => r.parentCiId === ciId);
    return { parents, children };
  };

  // Impact Analysis (considers relationships and criticality)
  const getImpactAnalysis = (ciId: string): ImpactAnalysisResult | null => {
    const target = cis.find((c) => c.id === ciId);
    if (!target) return null;

    const visited = new Set<string>();
    visited.add(ciId);

    const dependents: ImpactAnalysisResult["dependentCis"] = [];

    // Find all directly connected relationships (upstream callers and downstream providers)
    relationships.forEach((rel) => {
      let otherCiId: string | null = null;
      if (rel.parentCiId === ciId) {
        otherCiId = rel.childCiId;
      } else if (rel.childCiId === ciId) {
        otherCiId = rel.parentCiId;
      }

      if (otherCiId && !visited.has(otherCiId)) {
        visited.add(otherCiId);
        const relatedCi = cis.find((c) => c.id === otherCiId);
        if (relatedCi) {
          let impactSeverity: "Severe" | "High" | "Moderate" | "Low" = "Moderate";
          if (relatedCi.businessCriticality.includes("Tier 1")) {
            impactSeverity = "Severe";
          } else if (relatedCi.businessCriticality.includes("Tier 2")) {
            impactSeverity = "High";
          } else if (relatedCi.businessCriticality.includes("Tier 3")) {
            impactSeverity = "Moderate";
          } else {
            impactSeverity = "Low";
          }

          dependents.push({
            ci: relatedCi,
            relationship: rel,
            depth: 1,
            impactSeverity,
          });
        }
      }
    });

    // 2nd degree search
    const firstWaveIds = dependents.map((d) => d.ci.id);
    relationships.forEach((rel) => {
      firstWaveIds.forEach((wId) => {
        let secondId: string | null = null;
        if (rel.parentCiId === wId && !visited.has(rel.childCiId)) {
          secondId = rel.childCiId;
        } else if (rel.childCiId === wId && !visited.has(rel.parentCiId)) {
          secondId = rel.parentCiId;
        }

        if (secondId && !visited.has(secondId)) {
          visited.add(secondId);
          const secondCi = cis.find((c) => c.id === secondId);
          if (secondCi) {
            dependents.push({
              ci: secondCi,
              relationship: rel,
              depth: 2,
              impactSeverity: secondCi.businessCriticality.includes("Tier 1") ? "High" : "Moderate",
            });
          }
        }
      });
    });

    // Calculate blast radius
    const tier1Count = dependents.filter((d) => d.ci.businessCriticality.includes("Tier 1")).length;
    const tier2Count = dependents.filter((d) => d.ci.businessCriticality.includes("Tier 2")).length;

    let blastRadiusScore = 20 + dependents.length * 8 + tier1Count * 25 + tier2Count * 15;
    blastRadiusScore = Math.min(100, Math.max(10, blastRadiusScore));

    let riskLevel: "Severe" | "High" | "Moderate" | "Low" = "Moderate";
    if (blastRadiusScore >= 80 || tier1Count > 0) riskLevel = "Severe";
    else if (blastRadiusScore >= 60 || tier2Count > 0) riskLevel = "High";
    else if (blastRadiusScore >= 35) riskLevel = "Moderate";
    else riskLevel = "Low";

    return {
      targetCi: target,
      dependentCis: dependents,
      blastRadiusScore,
      riskLevel,
      impactSummary: `${dependents.length} interconnected CIs directly/indirectly affected (${tier1Count} Mission-Critical Tier 1 services).`,
    };
  };

  // Data Quality Tasks Actions
  const approveDQTask = (taskId: string, actor = "Platform Governance") => {
    const task = dataQualityTasks.find((t) => t.id === taskId);
    if (!task) return;

    setDataQualityTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: "Approved", decidedAt: new Date().toISOString() } : t))
    );

    const auditEntry = createDataQualityAuditRecord({
      who: actor,
      role: userRole,
      taskId,
      ciId: task.ciId,
      ciName: task.ciName,
      fieldChanged: "Governance Task Approval",
      beforeValue: task.status,
      afterValue: "Approved",
      action: "Approve",
    });
    setAuditHistory((prev) => [auditEntry, ...prev]);

    showToast("success", "Task Approved", `Data Quality Task ${taskId} for ${task.ciName} has been approved.`);
  };

  const rejectDQTask = (taskId: string, actor = "Platform Governance", reason = "Rejected by governance lead") => {
    const task = dataQualityTasks.find((t) => t.id === taskId);
    if (!task) return;

    setDataQualityTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: "Rejected", decidedAt: new Date().toISOString() } : t))
    );

    const auditEntry = createDataQualityAuditRecord({
      who: actor,
      role: userRole,
      taskId,
      ciId: task.ciId,
      ciName: task.ciName,
      fieldChanged: "Governance Task Decision",
      beforeValue: task.status,
      afterValue: "Rejected",
      action: "Dismiss",
      reason,
    });
    setAuditHistory((prev) => [auditEntry, ...prev]);

    showToast("info", "Task Rejected", `Data Quality Task ${taskId} was marked as rejected.`);
  };

  const dismissDQTask = (
    taskId: string,
    category: string,
    reason: string,
    actor = "Platform Governance"
  ) => {
    const task = dataQualityTasks.find((t) => t.id === taskId);
    if (!task) return;

    setDataQualityTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: "Dismissed",
              dismissCategory: category,
              dismissReason: reason,
              decidedAt: new Date().toISOString(),
            }
          : t
      )
    );

    const auditEntry = createDataQualityAuditRecord({
      who: actor,
      role: userRole,
      taskId,
      ciId: task.ciId,
      ciName: task.ciName,
      fieldChanged: "Data Quality Exception",
      beforeValue: task.status,
      afterValue: `Dismissed (${category})`,
      action: "Dismiss",
      reason,
    });
    setAuditHistory((prev) => [auditEntry, ...prev]);

    showToast("info", "Task Dismissed", `Task ${taskId} dismissed (${category}). Reason recorded in audit trail.`);
  };

  const requestOwnerAcceptance = (taskId: string, actor = "Platform Governance") => {
    const task = dataQualityTasks.find((t) => t.id === taskId);
    if (!task) return;

    const proposedOwnerName = task.proposedOwner?.name || "David Chen (Enterprise Architect)";

    setDataQualityTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: "Awaiting owner acceptance" }
          : t
      )
    );

    const auditEntry = createDataQualityAuditRecord({
      who: actor,
      role: userRole,
      taskId,
      ciId: task.ciId,
      ciName: task.ciName,
      fieldChanged: "Proposed Ownership Assignment",
      beforeValue: "Unassigned",
      afterValue: `Awaiting acceptance by ${proposedOwnerName}`,
      action: "Approve",
      reason: "Sent proposed ownership assignment to designated owner",
    });
    setAuditHistory((prev) => [auditEntry, ...prev]);

    showToast(
      "info",
      "Owner Acceptance Requested",
      `Assignment dispatched to ${proposedOwnerName}. Awaiting owner confirmation.`
    );
  };

  const acceptOwnerAssignment = (taskId: string, actor = "David Chen") => {
    const task = dataQualityTasks.find((t) => t.id === taskId);
    if (!task) return;

    const target = cis.find((c) => c.id === task.ciId);
    const ownerName = task.proposedOwner?.name || "David Chen (Enterprise Architect)";
    const teamName = task.proposedOwner?.team || "Core Infrastructure & Cloud Ops";

    if (target) {
      updateCI(
        target.id,
        {
          owner: ownerName,
          supportGroup: teamName,
          trustScore: Math.min(95, (target.trustScore || 45) + 25),
        },
        actor
      );
    }

    setDataQualityTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: "Applied", decidedAt: new Date().toISOString() }
          : t
      )
    );

    const auditEntry = createDataQualityAuditRecord({
      who: actor,
      role: "CI Owner",
      taskId,
      ciId: task.ciId,
      ciName: task.ciName,
      fieldChanged: "Technical Ownership & Support Group",
      beforeValue: "Unassigned",
      afterValue: `${ownerName} (${teamName})`,
      action: "AcceptOwnership",
      reason: "Owner accepted technical stewardship and support group assignment",
    });
    setAuditHistory((prev) => [auditEntry, ...prev]);

    showToast(
      "success",
      "Ownership Accepted & Applied",
      `Ownership confirmed by ${ownerName}. Trust score restored (+25 pts).`
    );
  };

  const applyComplianceWithEvidence = (
    taskId: string,
    evidenceDoc: string,
    humanApprover: string,
    actor = "Amara Okafor"
  ) => {
    const task = dataQualityTasks.find((t) => t.id === taskId);
    if (!task) return;

    const target = cis.find((c) => c.id === task.ciId);
    if (target) {
      updateCI(
        target.id,
        {
          complianceFlags: Array.from(new Set([...(target.complianceFlags || []), "NIST-800-53"])),
          trustScore: Math.min(100, (target.trustScore || 80) + 10),
        },
        humanApprover
      );
    }

    setDataQualityTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: "Applied",
              evidenceRef: evidenceDoc,
              approver: humanApprover,
              decidedAt: new Date().toISOString(),
            }
          : t
      )
    );

    const auditEntry = createDataQualityAuditRecord({
      who: humanApprover,
      role: "Compliance Officer",
      taskId,
      ciId: task.ciId,
      ciName: task.ciName,
      fieldChanged: "Compliance Certification",
      beforeValue: "None (Uncertified)",
      afterValue: "NIST-800-53",
      action: "Apply",
      reason: `Attested by ${humanApprover} with linked audit evidence`,
      evidenceRef: evidenceDoc,
    });
    setAuditHistory((prev) => [auditEntry, ...prev]);

    showToast(
      "success",
      "Compliance Flag Applied",
      `NIST-800-53 certification applied for ${task.ciName}. Linked evidence: ${evidenceDoc}`
    );
  };

  const applyDQTask = (taskId: string, actor = "Platform Governance", fixOptionId?: string) => {
    const task = dataQualityTasks.find((t) => t.id === taskId);
    if (!task) return;

    const target = cis.find((c) => c.id === task.ciId);

    // If an alternative fix option was selected: "retire"
    if (fixOptionId === "retire") {
      if (target) {
        retireCI(
          target.id,
          "DQ-DECOM-CHOSEN",
          "Decommissioned via Data Quality Staleness alternative choice",
          actor
        );
      }

      setDataQualityTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: "Applied", decidedAt: new Date().toISOString() } : t
        )
      );

      const auditEntry = createDataQualityAuditRecord({
        who: actor,
        role: userRole,
        taskId,
        ciId: task.ciId,
        ciName: task.ciName,
        fieldChanged: "Lifecycle Status",
        beforeValue: target?.operationalStatus || "Operational",
        afterValue: "Retired (End of Life)",
        action: "Apply",
        reason: "Asset retired per Data Quality staleness review",
      });
      setAuditHistory((prev) => [auditEntry, ...prev]);

      showToast("warning", "CI Retired", `${task.ciName} has been decommissioned and marked as Retired.`);
      return;
    }

    // Default remediation
    if (target) {
      if (task.issueType === "Missing Required Ownership" || task.issueType === "Unassigned Support Group") {
        // Ownership requires acceptance first
        requestOwnerAcceptance(taskId, actor);
        return;
      } else if (task.issueType === "Compliance Mismatch") {
        // Compliance requires evidence
        applyComplianceWithEvidence(
          taskId,
          task.evidenceRef || "https://vault.zenops.io/compliance/SOC2_Equinix_DC1_Certification_2026.pdf",
          task.approver || "Amara Okafor",
          actor
        );
        return;
      } else if (task.issueType === "Stale Discovery") {
        updateCI(
          target.id,
          {
            lastDiscovered: new Date().toISOString(),
            trustScore: Math.min(100, (target.trustScore || 50) + 30),
          },
          actor
        );
      } else if (task.issueType === "Attribute Conflict") {
        updateCI(
          target.id,
          {
            trustScore: Math.min(100, (target.trustScore || 70) + 20),
          },
          actor
        );
      } else if (task.issueType === "Duplicate Suspect") {
        updateCI(
          target.id,
          {
            lifecycleStatus: "In Use",
            trustScore: Math.min(100, (target.trustScore || 70) + 20),
          },
          actor
        );
      }
    }

    setDataQualityTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: "Applied", decidedAt: new Date().toISOString() } : t))
    );

    const auditEntry = createDataQualityAuditRecord({
      who: actor,
      role: userRole,
      taskId,
      ciId: task.ciId,
      ciName: task.ciName,
      fieldChanged: task.diff?.field || "Configuration Item Remediation",
      beforeValue: task.diff?.before || "Degraded",
      afterValue: task.diff?.after || "Restored",
      action: "Apply",
      reason: task.proposedFix,
    });
    setAuditHistory((prev) => [auditEntry, ...prev]);

    showToast("success", "Remediation Applied", `Proposed fix for ${task.ciName} applied. CI trust score restored.`);
  };

  const bulkApplyEligibleTasks = (threshold = 85, actor = "Bulk Auto-Remediator") => {
    const evaluation = evaluateBulkApply(dataQualityTasks, threshold);
    const eligible = evaluation.eligibleTasks;

    eligible.forEach((task) => {
      const target = cis.find((c) => c.id === task.ciId);
      if (target) {
        if (task.issueType === "Stale Discovery") {
          updateCI(
            target.id,
            {
              lastDiscovered: new Date().toISOString(),
              trustScore: Math.min(100, (target.trustScore || 50) + 30),
            },
            actor
          );
        } else if (task.issueType === "Attribute Conflict" || task.issueType === "Duplicate Suspect") {
          updateCI(
            target.id,
            {
              trustScore: Math.min(100, (target.trustScore || 70) + 20),
            },
            actor
          );
        }
      }

      const auditEntry = createDataQualityAuditRecord({
        who: actor,
        role: "Automation",
        taskId: task.id,
        ciId: task.ciId,
        ciName: task.ciName,
        fieldChanged: task.diff?.field || "Bulk Remediation",
        beforeValue: task.diff?.before || "Degraded",
        afterValue: task.diff?.after || "Restored",
        action: "BulkApply",
        reason: `Auto-applied high-confidence (${task.confidence}%) low-risk remediation`,
      });
      setAuditHistory((prev) => [auditEntry, ...prev]);
    });

    const appliedIds = eligible.map((t) => t.id);
    const appliedIdSet = new Set(appliedIds);

    setDataQualityTasks((prev) =>
      prev.map((t) =>
        appliedIdSet.has(t.id) ? { ...t, status: "Applied", decidedAt: new Date().toISOString() } : t
      )
    );

    showToast(
      "success",
      "Bulk Remediations Applied",
      `Successfully applied ${eligible.length} safe high-confidence remediations across ${activeTenant}.`
    );

    return { count: eligible.length, appliedIds };
  };

  // Discovery Run
  const triggerDiscoveryRun = (sourceId: string) => {
    setDiscoverySources((prev) =>
      prev.map((s) =>
        s.id === sourceId ? { ...s, result: "In Progress" } : s
      )
    );
    showToast("info", "Discovery Triggered", "Starting automated discovery pipeline job...");

    setTimeout(() => {
      setDiscoverySources((prev) =>
        prev.map((s) => {
          if (s.id === sourceId) {
            const added = Math.floor(Math.random() * 20) + 5;
            return {
              ...s,
              lastRun: new Date().toISOString(),
              result: "Success",
              cisDiscovered: s.cisDiscovered + added,
              cisUpdated: s.cisUpdated + Math.floor(added / 2),
            };
          }
          return s;
        })
      );
      showToast("success", "Discovery Completed", "CMDB synchronization finished successfully.");
    }, 1800);
  };

  // Attestations
  const certifyCampaignCI = (
    campaignId: string,
    ciId: string,
    status: "Certified" | "Rejected"
  ) => {
    setAttestationCampaigns((prev) =>
      prev.map((c) => {
        if (c.id === campaignId) {
          const newCertified = status === "Certified" ? c.certifiedCIs + 1 : c.certifiedCIs;
          const newRejected = status === "Rejected" ? c.rejectedCIs + 1 : c.rejectedCIs;
          const completed = newCertified + newRejected;
          const completionPercentage = Math.min(
            100,
            Math.round((completed / Math.max(1, c.totalCIs)) * 100)
          );
          return {
            ...c,
            certifiedCIs: newCertified,
            rejectedCIs: newRejected,
            completionPercentage,
            outcome: completionPercentage === 100 ? "Completed" : "In Progress",
          };
        }
        return c;
      })
    );
    logAudit(ciId, ciId, "attestationStatus", "Pending", status, "Campaign Auditor", "Attestation");
    showToast("success", "Attestation Recorded", `CI ${ciId} marked as ${status}.`);
  };

  return (
    <CMDBContext.Provider
      value={{
        cis,
        relationships,
        discoverySources,
        reconciliationRules,
        dataQualityTasks,
        attestationCampaigns,
        auditHistory,
        metrics,
        toasts,
        addCI,
        bulkAddCIs,
        updateCI,
        retireCI,
        deleteCI,
        getCIById,
        addRelationship,
        deleteRelationship,
        getCIRelationships,
        getImpactAnalysis,
        approveDQTask,
        rejectDQTask,
        dismissDQTask,
        applyDQTask,
        requestOwnerAcceptance,
        acceptOwnerAssignment,
        applyComplianceWithEvidence,
        bulkApplyEligibleTasks,
        triggerDiscoveryRun,
        certifyCampaignCI,
        showToast,
        removeToast,
        userRole,
        setUserRole,
        activeTenant,
        setActiveTenant,
        selectedEnvironment,
        setSelectedEnvironment,
        availableTenants,
        session,
        currentUser: session,
        logout,
        canEdit,
        canMerge,
        canRetire,
        canAdmin,
      }}
    >
      {children}
    </CMDBContext.Provider>
  );
}

export function useCMDB() {
  const context = useContext(CMDBContext);
  if (!context) {
    throw new Error("useCMDB must be used within a CMDBProvider");
  }
  return context;
}
