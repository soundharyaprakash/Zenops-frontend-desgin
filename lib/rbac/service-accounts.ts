/**
 * ZenOps CMDB Role-Based Access Control (RBAC) - Automated Service Accounts
 *
 * Dedicated non-human credentials strictly bound to individual discovery connectors.
 * Scoped exclusively to staging.write.
 */

export interface ServiceAccount {
  id: string;
  name: string;
  connectorId: string;
  connectorName: string;
  owner: string;
  lastRotated: string; // ISO date
  rotationIntervalDays: number;
  ipAllowList: string[];
  permissions: string[];
  status: "active" | "rotation_due" | "disabled";
  tokenPrefix: string;
  description: string;
}

const STORAGE_KEY_SERVICE_ACCOUNTS = "zenops_rbac_service_accounts";

export const INITIAL_SERVICE_ACCOUNTS: ServiceAccount[] = [
  {
    id: "SA-AWS-01",
    name: "svc-discovery-aws",
    connectorId: "SRC-101",
    connectorName: "AWS Production CloudTrail & EC2 Collector",
    owner: "Cloud Platform Team",
    lastRotated: "2026-10-15T00:00:00Z",
    rotationIntervalDays: 90,
    ipAllowList: ["10.120.0.0/16", "52.94.76.0/24"],
    permissions: ["staging.write", "ci.view"],
    status: "active",
    tokenPrefix: "zen_sec_aws_948a...",
    description: "Automated ingestion worker for AWS EC2, S3, RDS and VPC subnets.",
  },
  {
    id: "SA-K8S-02",
    name: "svc-discovery-k8s",
    connectorId: "SRC-102",
    connectorName: "Kubernetes Cluster Daemon (EKS & GKE)",
    owner: "Container Reliability Engineering",
    lastRotated: "2026-11-01T00:00:00Z",
    rotationIntervalDays: 90,
    ipAllowList: ["10.244.0.0/16", "172.20.0.0/16"],
    permissions: ["staging.write"],
    status: "active",
    tokenPrefix: "zen_sec_k8s_71c2...",
    description: "Pods, services, namespaces, and node topology synchronization connector.",
  },
  {
    id: "SA-AZR-03",
    name: "svc-discovery-azure",
    connectorId: "SRC-103",
    connectorName: "Azure Resource Graph Sync",
    owner: "Enterprise Infrastructure Lead",
    lastRotated: "2026-08-01T00:00:00Z", // > 90 days ago -> rotation due
    rotationIntervalDays: 90,
    ipAllowList: ["20.190.128.0/18"],
    permissions: ["staging.write"],
    status: "rotation_due",
    tokenPrefix: "zen_sec_azr_100b...",
    description: "Telemetry bridge for Azure App Services and Cosmos DB instances.",
  },
  {
    id: "SA-SNOW-04",
    name: "svc-servicenow-bridge",
    connectorId: "SRC-104",
    connectorName: "ServiceNow Legacy CMDB Sync",
    owner: "ITSM Integrations Lead",
    lastRotated: "2026-09-20T00:00:00Z",
    rotationIntervalDays: 90,
    ipAllowList: ["192.168.10.45/32", "192.168.10.46/32"],
    permissions: ["staging.write", "ci.view"],
    status: "active",
    tokenPrefix: "zen_sec_snow_f419...",
    description: "Bi-directional reconciliation sync between ServiceNow and ZenOps.",
  },
];

export class ServiceAccountService {
  public static getAccounts(): ServiceAccount[] {
    if (typeof window === "undefined") return INITIAL_SERVICE_ACCOUNTS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SERVICE_ACCOUNTS);
      if (stored) {
        const parsed = JSON.parse(stored) as ServiceAccount[];
        // Refresh 90-day rotation status
        const now = Date.now();
        parsed.forEach((sa) => {
          const daysSinceRotation = (now - new Date(sa.lastRotated).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceRotation > sa.rotationIntervalDays && sa.status !== "disabled") {
            sa.status = "rotation_due";
          }
        });
        return parsed;
      }
    } catch {
      // fallback
    }
    this.saveAccounts(INITIAL_SERVICE_ACCOUNTS);
    return INITIAL_SERVICE_ACCOUNTS;
  }

  public static saveAccounts(accounts: ServiceAccount[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY_SERVICE_ACCOUNTS, JSON.stringify(accounts));
    } catch {
      // ignore
    }
  }

  public static rotateSecret(id: string): ServiceAccount | null {
    const accounts = this.getAccounts();
    const sa = accounts.find((a) => a.id === id);
    if (sa) {
      sa.lastRotated = new Date().toISOString();
      sa.status = "active";
      sa.tokenPrefix = `zen_sec_${Math.random().toString(36).substring(2, 6)}_${Math.random().toString(36).substring(2, 6)}...`;
      this.saveAccounts(accounts);
      return sa;
    }
    return null;
  }
}
