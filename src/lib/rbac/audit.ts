/**
 * ZenOps CMDB Role-Based Access Control (RBAC) - Security Audit & Access Alerts
 *
 * Append-only security audit log and real-time behavioral access alerts.
 */

export interface AccessAuditEntry {
  id: string;
  timestamp: string; // ISO 8601
  actorId: string;
  actorEmail: string;
  actorName: string;
  actorRole: string;
  permission: string;
  resourceId?: string;
  resourceName?: string;
  tenantId: string;
  allowed: boolean;
  reason: string;
  auditFlag?: string;
  requiresSecondApprover?: boolean;
  metadata?: Record<string, any>;
}

export interface AccessAlert {
  id: string;
  timestamp: string;
  severity: "low" | "medium" | "high" | "critical";
  type:
    | "break_glass_used"
    | "repeated_denials"
    | "role_modified"
    | "bulk_production_mutation"
    | "service_account_anomaly"
    | "sod_violation_attempt";
  title: string;
  description: string;
  actor: string;
  status: "active" | "investigating" | "resolved";
}

const STORAGE_KEY_AUDIT_LOG = "zenops_rbac_audit_log";
const STORAGE_KEY_ALERTS = "zenops_rbac_alerts";

export const INITIAL_ALERTS: AccessAlert[] = [
  {
    id: "ALT-9001",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    severity: "critical",
    type: "break_glass_used",
    title: "Break-Glass Account Invoked",
    description: "Emergency credential breakglass@zenops.io accessed the platform during active incident INC-10294.",
    actor: "breakglass@zenops.io",
    status: "active",
  },
  {
    id: "ALT-9002",
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    severity: "high",
    type: "sod_violation_attempt",
    title: "Separation of Duties Denial: admin_cannot_approve",
    description: "User Sarah Jenkins (CMDB Administrator) attempted to approve data quality fix for prod-auth-db. Action was blocked.",
    actor: "sarah.jenkins@gmail.com",
    status: "resolved",
  },
  {
    id: "ALT-9003",
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    severity: "medium",
    type: "service_account_anomaly",
    title: "Connector Ingestion Outside Routine Window",
    description: "svc-discovery-aws ingested 450 staging records outside scheduled batch window.",
    actor: "svc-discovery-aws",
    status: "resolved",
  },
];

export class AccessAuditService {
  public static getLog(): AccessAuditEntry[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUDIT_LOG);
      if (stored) return JSON.parse(stored) as AccessAuditEntry[];
    } catch {
      // fallback
    }
    return [];
  }

  public static append(entry: Omit<AccessAuditEntry, "id" | "timestamp">): AccessAuditEntry {
    const list = this.getLog();
    const created: AccessAuditEntry = {
      ...entry,
      id: `SEC-${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: new Date().toISOString(),
    };

    // Keep last 1,000 entries
    list.unshift(created);
    if (list.length > 1000) list.pop();

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_AUDIT_LOG, JSON.stringify(list));
      } catch {
        // ignore
      }
    }

    // Check if an alert needs to be triggered
    this.checkForAlerts(created, list);

    return created;
  }

  public static getAlerts(): AccessAlert[] {
    if (typeof window === "undefined") return INITIAL_ALERTS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ALERTS);
      if (stored) return JSON.parse(stored) as AccessAlert[];
    } catch {
      // fallback
    }
    this.saveAlerts(INITIAL_ALERTS);
    return INITIAL_ALERTS;
  }

  public static saveAlerts(alerts: AccessAlert[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(alerts));
    } catch {
      // ignore
    }
  }

  public static addAlert(alert: Omit<AccessAlert, "id" | "timestamp" | "status">): AccessAlert {
    const alerts = this.getAlerts();
    const created: AccessAlert = {
      ...alert,
      id: `ALT-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      status: "active",
    };
    alerts.unshift(created);
    this.saveAlerts(alerts);
    return created;
  }

  private static checkForAlerts(entry: AccessAuditEntry, recentLogs: AccessAuditEntry[]): void {
    // 1. Break-glass alert
    if (entry.auditFlag === "SECURITY_ALERT_BREAK_GLASS_USED" || entry.actorEmail.includes("breakglass")) {
      this.addAlert({
        severity: "critical",
        type: "break_glass_used",
        title: "Break-Glass Account Action Executed",
        description: `Break-glass credential executed '${entry.permission}' on '${entry.resourceName || entry.resourceId || "platform"}'.`,
        actor: entry.actorEmail,
      });
    }

    // 2. Repeated denials check (3 denials from same user within 5 minutes)
    if (!entry.allowed) {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const recentDenials = recentLogs.filter(
        (l) => !l.allowed && l.actorEmail === entry.actorEmail && new Date(l.timestamp).getTime() > fiveMinutesAgo
      );
      if (recentDenials.length >= 3) {
        this.addAlert({
          severity: "high",
          type: "repeated_denials",
          title: "Repeated Access Denials Detected",
          description: `User '${entry.actorEmail}' experienced ${recentDenials.length} permission denials in the last 5 minutes.`,
          actor: entry.actorEmail,
        });
      }
    }
  }
}
