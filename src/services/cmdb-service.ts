/**
 * CMDB Enterprise Service Abstraction Layer (services/cmdb-service.ts)
 *
 * The ONLY data and API abstraction layer for the ZenOps CMDB platform.
 * Enforces strict multi-tenant isolation (ZenDev Software Technologies, Choose My Career, SpaceZen LLC).
 * Components interact exclusively through this service.
 */

import {
  CIItem,
  CIRelationship,
  DiscoverySource,
  ReconciliationRule,
  DataQualityTask,
  AttestationCampaign,
  CIAuditHistory,
  BusinessServiceItem,
  StagingDiscoveryRecord,
  IREPayload,
  IRESimulationResult,
} from "@/types/cmdb";

import zendevData from "@/data/tenants/CMP_1001_ZENDEV.json";
import chooseCyData from "@/data/tenants/CMP_1009_CHOOSECY.json";
import spaceZenData from "@/data/tenants/CMP_1015_SPACEZEN.json";
import businessServicesData from "@/data/business-services.json";
import stagingRecordsData from "@/data/staging-records.json";
import {
  INITIAL_CIS,
  INITIAL_RELATIONSHIPS,
  INITIAL_DISCOVERY_SOURCES,
  INITIAL_RECONCILIATION_RULES,
  INITIAL_DATA_QUALITY_TASKS,
  INITIAL_ATTESTATION_CAMPAIGNS,
  INITIAL_AUDIT_HISTORY,
} from "./mock-data";

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CIPaginationParams {
  tenant?: string;
  environment?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  ciClass?: string;
  operationalStatus?: string;
  lifecycleStatus?: string;
  criticality?: string;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}

export class CMDBService {
  private static baseUrl = process.env.NEXT_PUBLIC_CMDB_API_URL || "";

  // ---------------------------------------------------------------------------
  // TENANT ISOLATION HELPERS
  // ---------------------------------------------------------------------------
  private static getTenantDataset(tenantName = "ZenDev Software Technologies"): CIItem[] {
    const t = (tenantName || "").toLowerCase();
    if (t.includes("choose") || t.includes("career")) {
      return chooseCyData as unknown as CIItem[];
    }
    if (t.includes("space")) {
      return spaceZenData as unknown as CIItem[];
    }
    // Default to ZenDev Software Technologies: combine seeded 58-column data with baseline demo CIs
    const combined = [...(zendevData as unknown as CIItem[])];
    INITIAL_CIS.forEach((ci) => {
      if (!combined.some((item) => item.id === ci.id)) {
        combined.push({
          ...ci,
          company: "ZenDev Software Technologies",
          company_id: "CMP_1001_ZENDEV",
          sys_domain: "zendev.zenops.io",
        });
      }
    });
    return combined;
  }

  // ---------------------------------------------------------------------------
  // CI RETRIEVAL & FILTERING
  // ---------------------------------------------------------------------------
  static async fetchCIs(tenant = "ZenDev Software Technologies", env = "All"): Promise<CIItem[]> {
    let list = this.getTenantDataset(tenant);
    if (env && env !== "All") {
      list = list.filter((ci) => ci.environment === env || ci.environment.toLowerCase().includes(env.toLowerCase()));
    }
    return list;
  }

  static async fetchPaginatedCIs(params: CIPaginationParams): Promise<PaginatedResult<CIItem>> {
    const {
      tenant = "ZenDev Software Technologies",
      environment = "All",
      page = 1,
      pageSize = 15,
      search = "",
      ciClass = "",
      operationalStatus = "",
      criticality = "",
      sortField = "id",
      sortOrder = "asc",
    } = params;

    let dataset = await this.fetchCIs(tenant, environment);

    // Apply multi-filters
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      dataset = dataset.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.ciClass.toLowerCase().includes(q) ||
          c.owner.toLowerCase().includes(q) ||
          c.supportGroup?.toLowerCase().includes(q) ||
          c.attributes?.ipAddress?.includes(q) ||
          c.ip_address?.includes(q) ||
          c.mac_address?.toLowerCase().includes(q) ||
          c.fqdn?.toLowerCase().includes(q) ||
          c.serialNumber?.toLowerCase().includes(q) ||
          c.assetTag?.toLowerCase().includes(q)
      );
    }

    if (ciClass) {
      dataset = dataset.filter((c) => c.ciClass === ciClass);
    }

    if (operationalStatus) {
      dataset = dataset.filter((c) => c.operationalStatus === operationalStatus);
    }

    if (criticality) {
      dataset = dataset.filter((c) => c.businessCriticality.includes(criticality));
    }

    // Sort
    dataset.sort((a: any, b: any) => {
      const valA = a[sortField] ?? "";
      const valB = b[sortField] ?? "";
      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
      return sortOrder === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    const total = dataset.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.max(1, Math.min(totalPages, page));
    const start = (safePage - 1) * pageSize;
    const items = dataset.slice(start, start + pageSize);

    return {
      items,
      total,
      page: safePage,
      pageSize,
      totalPages,
    };
  }

  static async fetchCIById(id: string, tenant = "ZenDev Software Technologies"): Promise<CIItem | null> {
    const list = this.getTenantDataset(tenant);
    return list.find((c) => c.id === id) || null;
  }

  // ---------------------------------------------------------------------------
  // BUSINESS SERVICES
  // ---------------------------------------------------------------------------
  static async fetchBusinessServices(tenant = "ZenDev Software Technologies"): Promise<BusinessServiceItem[]> {
    return businessServicesData as unknown as BusinessServiceItem[];
  }

  // ---------------------------------------------------------------------------
  // RAW DISCOVERY STAGING
  // ---------------------------------------------------------------------------
  static async fetchStagingRecords(tenant = "ZenDev Software Technologies"): Promise<StagingDiscoveryRecord[]> {
    return stagingRecordsData as unknown as StagingDiscoveryRecord[];
  }

  // ---------------------------------------------------------------------------
  // IRE SIMULATION ENGINE
  // ---------------------------------------------------------------------------
  static async simulateIRE(payload: IREPayload): Promise<IRESimulationResult[]> {
    const results: IRESimulationResult[] = [];

    payload.items.forEach((item) => {
      const { className, values } = item;
      const mac = values.mac_address || values.mac;
      const serial = values.serial_number || values.serialNumber;
      const name = values.name;

      let matchedRule = "Rule 4: Fallback (No Match -> Create New CI)";
      let action: "Create" | "Update" | "Review Required" = "Create";
      let confidenceScore = 100;
      let matchedCI: CIItem | undefined;

      // Rule 1: MAC address identification rule
      if (mac) {
        matchedCI = INITIAL_CIS.find(
          (c) =>
            c.identificationKeys?.macAddress?.toLowerCase() === mac.toLowerCase() ||
            c.mac_address?.toLowerCase() === mac.toLowerCase()
        );
        if (matchedCI) {
          matchedRule = "Rule 1: MAC Address Exact Match (mac_address)";
          action = "Update";
          confidenceScore = 98;
        }
      }

      // Rule 2: Serial number identification rule
      if (!matchedCI && serial) {
        matchedCI = INITIAL_CIS.find(
          (c) =>
            c.serialNumber?.toLowerCase() === serial.toLowerCase() ||
            c.identificationKeys?.serialNumber?.toLowerCase() === serial.toLowerCase()
        );
        if (matchedCI) {
          matchedRule = "Rule 2: Serial Number Hardware Match (serial_number)";
          action = "Update";
          confidenceScore = 94;
        }
      }

      // Rule 3: Name + sys_class_name identification rule
      if (!matchedCI && name) {
        matchedCI = INITIAL_CIS.find((c) => c.name.toLowerCase() === name.toLowerCase());
        if (matchedCI) {
          matchedRule = "Rule 3: Composite Name + Class Match (name + sys_class_name)";
          action = "Update";
          confidenceScore = 88;
        }
      }

      // Calculate attribute winners based on source weight
      const winningAttributes = Object.entries(values).map(([field, val]) => {
        let weight = 80;
        if (field.includes("cpu") || field.includes("ram") || field.includes("disk")) {
          weight = payload.source.toLowerCase().includes("sccm") ? 100 : 70;
        } else if (field.includes("ip") || field.includes("mac")) {
          weight = payload.source.toLowerCase().includes("solarwinds") ? 100 : 85;
        }
        return {
          field,
          winnerSource: payload.source,
          weight,
          value: val,
        };
      });

      const resultingCI: Partial<CIItem> = {
        name: values.name || (matchedCI ? matchedCI.name : "NEW-CI"),
        ciClass: "Server/VM",
        operationalStatus: values.operational_status === 1 ? "Operational" : "Degraded",
        identificationKeys: {
          macAddress: mac,
          ipAddress: values.ip_address,
        },
      };

      const auditEntry = {
        action: action === "Create" ? "IRE Ingestion: Create" : "IRE Ingestion: Update",
        actor: `Discovery Connector (${payload.source})`,
        timestamp: new Date().toISOString(),
        ruleApplied: matchedRule,
      };

      results.push({
        matchedRule,
        action,
        confidenceScore,
        winningAttributes,
        resultingCI,
        matchedCI,
        auditEntry,
      });
    });

    return results;
  }

  // ---------------------------------------------------------------------------
  // GOVERNANCE, AUDIT & METRICS
  // ---------------------------------------------------------------------------
  static async fetchRelationships(): Promise<CIRelationship[]> {
    return INITIAL_RELATIONSHIPS;
  }

  static async fetchDiscoverySources(): Promise<DiscoverySource[]> {
    return INITIAL_DISCOVERY_SOURCES;
  }

  static async fetchReconciliationRules(): Promise<ReconciliationRule[]> {
    return INITIAL_RECONCILIATION_RULES;
  }

  static async fetchDataQualityTasks(tenant?: string): Promise<DataQualityTask[]> {
    return INITIAL_DATA_QUALITY_TASKS;
  }

  static async fetchAttestationCampaigns(tenant?: string): Promise<AttestationCampaign[]> {
    return INITIAL_ATTESTATION_CAMPAIGNS;
  }

  static async fetchAuditHistory(tenant?: string): Promise<CIAuditHistory[]> {
    return INITIAL_AUDIT_HISTORY;
  }

  static async saveCI(ci: Partial<CIItem>): Promise<CIItem | null> {
    if (!this.baseUrl) return null;
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/cis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ci),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
}
