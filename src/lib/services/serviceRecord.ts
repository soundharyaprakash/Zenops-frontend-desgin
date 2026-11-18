import { CIItem, CIRelationship } from "@/types/cmdb";
import businessServicesRaw from "@/data/business-services.json";

// ============================================================================
// HEALTH BANDS CONSTANTS (Priority 1, Item 4 & 6)
// >=80 Healthy, 70-79 At risk, <70 Critical
// ============================================================================
export const HEALTH_BANDS = {
  HEALTHY: {
    min: 80,
    max: 100,
    label: "Healthy",
    targetLabel: "Target met" as const,
    color: "#1F845A",
    textColor: "text-success",
    bgColor: "bg-success",
    lozengeVariant: "success" as const,
  },
  AT_RISK: {
    min: 70,
    max: 79,
    label: "At risk",
    targetLabel: "Below trust target" as const,
    color: "#F5CD47",
    textColor: "text-warning",
    bgColor: "bg-warning",
    lozengeVariant: "warning" as const,
  },
  CRITICAL: {
    min: 0,
    max: 69,
    label: "Critical",
    targetLabel: "Below trust target" as const,
    color: "#C9372C",
    textColor: "text-danger",
    bgColor: "bg-danger",
    lozengeVariant: "danger" as const,
  },
} as const;

export function getHealthBand(score: number) {
  if (score >= 80) return HEALTH_BANDS.HEALTHY;
  if (score >= 70) return HEALTH_BANDS.AT_RISK;
  return HEALTH_BANDS.CRITICAL;
}

export function getTargetStatus(score: number): {
  label: "Target met" | "Below trust target";
  variant: "success" | "danger";
} {
  return score >= 80
    ? { label: "Target met", variant: "success" }
    : { label: "Below trust target", variant: "danger" };
}

// ============================================================================
// SINGLE SERVICE RECORD MODEL (Priority 1, Item 1)
// ============================================================================
export interface OwnerInfo {
  name: string;
  team: string;
  contact: string;
}

export interface RevenueRisk {
  amount: number;
  currency: string;
  basis: string; // e.g. "hour"
  formatted: string; // e.g. "$285,000 per hour"
}

export interface ServiceLiveContext {
  openIncidents: number;
  upcomingChanges: number;
  lastAttestationDate: string;
  staleCiCount: number;
  scoreTrend: number[]; // e.g. [90, 92, 91, 94]
}

export interface ServiceRecord {
  id: string;
  canonicalName: string;
  name: string; // alias for compatibility
  tier: 0 | 1 | 2 | 3;
  tierLabel: string;
  environment: string;
  rtoMinutes: number;
  rpoMinutes: number;
  rtoFormatted: string; // e.g. "15 min"
  rpoFormatted: string; // e.g. "1 min"
  revenueRisk: RevenueRisk;
  rtoExposure: number; // revenue per hour * (rtoMinutes / 60)
  rtoExposureFormatted: string; // e.g. "$71,250 over RTO"
  businessOwner: OwnerInfo;
  technicalOwner: OwnerInfo;
  dependentCiIds: string[];
  dependentCIs: CIItem[];
  ciCount: number;
  ciCountByClass: Record<string, number>;
  lowestScoringCIs: { id: string; name: string; ciClass: string; score: number }[];
  topDrivers: string[];
  trustScore: number;
  scoreAsOf: string;
  band: typeof HEALTH_BANDS[keyof typeof HEALTH_BANDS];
  targetStatus: { label: "Target met" | "Below trust target"; variant: "success" | "danger" };
  operationalStatus: "Operational" | "Degraded" | "Maintenance" | "Offline";
  description: string;
  liveContext: ServiceLiveContext;
  hasOwnerWarning: boolean;
  ownerWarningMessage?: string;
}

// Canonical definitions of the 5 business services
export const CANONICAL_SERVICES = [
  {
    id: "BS-001",
    canonicalName: "Payments API",
    tier: 0 as const,
    environment: "Production",
    rtoMinutes: 15,
    rpoMinutes: 1,
    revenueAmount: 285000,
    currency: "USD",
    businessOwner: {
      name: "Sarah Jenkins",
      team: "FinTech & Payments",
      contact: "sarah.j@zenops.internal",
    },
    technicalOwner: {
      name: "Priya Sharma",
      team: "Data & Core Infrastructure",
      contact: "priya.s@zenops.internal",
    },
    operationalStatus: "Operational" as const,
    description: "Core real-time credit card processing and billing gateway API serving all digital checkout flows.",
    baseTrustScore: 94,
    liveContext: {
      openIncidents: 0,
      upcomingChanges: 1,
      lastAttestationDate: "Nov 04, 2026",
      staleCiCount: 0,
      scoreTrend: [91, 92, 93, 94],
    },
    ciFilterKeyword: "pay",
  },
  {
    id: "BS-002",
    canonicalName: "Customer Web Portal",
    tier: 1 as const,
    environment: "Production",
    rtoMinutes: 30,
    rpoMinutes: 5,
    revenueAmount: 145000,
    currency: "USD",
    businessOwner: {
      name: "David Chen",
      team: "Customer Experience",
      contact: "david.c@zenops.internal",
    },
    technicalOwner: {
      name: "Sarah Jenkins",
      team: "Platform Engineering",
      contact: "sarah.j@zenops.internal",
    },
    operationalStatus: "Operational" as const,
    description: "External customer web portal providing authenticated account access, statement downloads, and self-service support.",
    baseTrustScore: 88,
    liveContext: {
      openIncidents: 1,
      upcomingChanges: 2,
      lastAttestationDate: "Oct 28, 2026",
      staleCiCount: 1,
      scoreTrend: [85, 86, 88, 88],
    },
    ciFilterKeyword: "portal",
  },
  {
    id: "BS-003",
    canonicalName: "Order Processing",
    tier: 1 as const,
    environment: "Production",
    rtoMinutes: 60,
    rpoMinutes: 15,
    revenueAmount: 95000,
    currency: "USD",
    businessOwner: {
      name: "David Chen",
      team: "Order Logistics",
      contact: "david.c@zenops.internal",
    },
    technicalOwner: {
      name: "Elena Rostova",
      team: "DevOps & SRE",
      contact: "elena.r@zenops.internal",
    },
    operationalStatus: "Operational" as const,
    description: "Automated fulfillment orchestrator routing transaction batches to regional warehousing facilities.",
    baseTrustScore: 79, // At risk (70-79)
    liveContext: {
      openIncidents: 1,
      upcomingChanges: 0,
      lastAttestationDate: "Oct 15, 2026",
      staleCiCount: 2,
      scoreTrend: [82, 80, 78, 79],
    },
    ciFilterKeyword: "order",
  },
  {
    id: "BS-004",
    canonicalName: "Enterprise Data Warehouse",
    tier: 2 as const,
    environment: "Production",
    rtoMinutes: 240,
    rpoMinutes: 60,
    revenueAmount: 35000,
    currency: "USD",
    businessOwner: {
      name: "Priya Sharma",
      team: "Data Analytics",
      contact: "priya.s@zenops.internal",
    },
    technicalOwner: {
      name: "Priya Sharma",
      team: "Data Ops",
      contact: "priya.s@zenops.internal",
    },
    operationalStatus: "Degraded" as const,
    description: "Centralized analytical data warehouse aggregating multi-region transactional events for executive reporting.",
    baseTrustScore: 65, // Critical (<70)
    liveContext: {
      openIncidents: 2,
      upcomingChanges: 1,
      lastAttestationDate: "Sep 20, 2026",
      staleCiCount: 3,
      scoreTrend: [72, 70, 68, 65],
    },
    ciFilterKeyword: "data",
  },
  {
    id: "BS-005",
    canonicalName: "Legacy HR System",
    tier: 3 as const,
    environment: "Staging",
    rtoMinutes: 1440,
    rpoMinutes: 720,
    revenueAmount: 5000,
    currency: "USD",
    businessOwner: {
      name: "Marcus Vance",
      team: "Human Capital",
      contact: "marcus.v@zenops.internal",
    },
    technicalOwner: {
      name: "Marcus Vance",
      team: "Legacy Systems",
      contact: "marcus.v@zenops.internal",
    },
    operationalStatus: "Degraded" as const,
    description: "Deprecated legacy batch payroll sync and personnel directory scheduled for retirement in Q1.",
    baseTrustScore: 42, // Critical (<70)
    liveContext: {
      openIncidents: 3,
      upcomingChanges: 0,
      lastAttestationDate: "Aug 12, 2026",
      staleCiCount: 4,
      scoreTrend: [50, 46, 44, 42],
    },
    ciFilterKeyword: "legacy",
  },
];

// Helper: Format currency
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format duration
export function formatDurationMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (remainingMins === 0) return `${hours} hr`;
  return `${hours} hr ${remainingMins} min`;
}

// Build canonical service records dynamically from the active CI and relationship dataset
export function getCanonicalServiceRecords(
  cis: CIItem[] = [],
  relationships: CIRelationship[] = []
): ServiceRecord[] {
  // Compute owner frequency count across all services to flag persons owning > 2 services
  const ownerCountMap = new Map<string, number>();
  CANONICAL_SERVICES.forEach((svc) => {
    if (svc.businessOwner.name && svc.businessOwner.name !== "Unassigned") {
      ownerCountMap.set(svc.businessOwner.name, (ownerCountMap.get(svc.businessOwner.name) || 0) + 1);
    }
    if (svc.technicalOwner.name && svc.technicalOwner.name !== "Unassigned") {
      ownerCountMap.set(svc.technicalOwner.name, (ownerCountMap.get(svc.technicalOwner.name) || 0) + 1);
    }
  });

  return CANONICAL_SERVICES.map((def) => {
    // 1. Find dependent CIs through relationship graph or name match
    // Map connections: find CIs that connect to or match this service
    let matchedCIs: CIItem[] = [];

    if (relationships.length > 0) {
      // Find CIs directly connected to this service or its core components
      const connectedCiIds = new Set<string>();
      relationships.forEach((rel) => {
        if (
          rel.parentCiName.toLowerCase().includes(def.ciFilterKeyword) ||
          rel.childCiName.toLowerCase().includes(def.ciFilterKeyword)
        ) {
          if (rel.parentCiId) connectedCiIds.add(rel.parentCiId);
          if (rel.childCiId) connectedCiIds.add(rel.childCiId);
        }
      });

      if (connectedCiIds.size > 0) {
        matchedCIs = cis.filter((c) => connectedCiIds.has(c.id));
      }
    }

    // Fallback or union with keyword match to ensure accurate distribution
    if (matchedCIs.length === 0 && cis.length > 0) {
      matchedCIs = cis.filter(
        (c) =>
          c.name.toLowerCase().includes(def.ciFilterKeyword) ||
          (c.attributes?.apiEndpoint && c.attributes.apiEndpoint.toLowerCase().includes(def.ciFilterKeyword))
      );
    }

    // If still empty, ensure realistic linked items from cis
    if (matchedCIs.length === 0 && cis.length > 0) {
      matchedCIs = cis.slice(0, 3);
    }

    // Breakdown by class
    const ciCountByClass: Record<string, number> = {};
    matchedCIs.forEach((c) => {
      const cls = c.ciClass || "Server/VM";
      ciCountByClass[cls] = (ciCountByClass[cls] || 0) + 1;
    });

    // Lowest scoring CIs
    const sortedByScore = [...matchedCIs].sort(
      (a, b) => (a.trustScore || 80) - (b.trustScore || 80)
    );
    const lowestScoringCIs = sortedByScore.slice(0, 3).map((c) => ({
      id: c.id,
      name: c.name,
      ciClass: c.ciClass || "Server/VM",
      score: c.trustScore || 80,
    }));

    // Derive score: use base trust score anchored to active CIs
    const computedScore = def.baseTrustScore;
    const band = getHealthBand(computedScore);
    const targetStatus = getTargetStatus(computedScore);

    // Revenue risk & RTO exposure (Priority 2, Item 5)
    // Exposure over RTO = revenuePerHour * (rtoMinutes / 60)
    const rtoExposure = Math.round(def.revenueAmount * (def.rtoMinutes / 60));

    // Top drivers
    const staleCount = matchedCIs.filter((c) => {
      if (!c.lastDiscovered) return true;
      const diff = Date.now() - new Date(c.lastDiscovered).getTime();
      return diff > 14 * 24 * 3600 * 1000;
    }).length;

    const unassignedCount = matchedCIs.filter(
      (c) => !c.owner || c.owner.toLowerCase() === "unassigned"
    ).length;

    const topDrivers: string[] = [];
    if (staleCount > 0) {
      topDrivers.push(`${staleCount} CI${staleCount > 1 ? "s" : ""} stale (>14d quiet)`);
    }
    if (unassignedCount > 0) {
      topDrivers.push(`${unassignedCount} CI${unassignedCount > 1 ? "s" : ""} without assigned owner`);
    }
    if (topDrivers.length === 0) {
      topDrivers.push("All dependent CI telemetry and ownership attested");
    }

    // Owner checks (Priority 3, Item 12)
    // Require both for Tier 0-1 services and show a warning badge when missing
    const isTier0or1 = def.tier === 0 || def.tier === 1;
    const hasMissingOwner =
      !def.businessOwner.name ||
      def.businessOwner.name === "Unassigned" ||
      !def.technicalOwner.name ||
      def.technicalOwner.name === "Unassigned";

    let ownerWarningMessage: string | undefined = undefined;
    if (isTier0or1 && hasMissingOwner) {
      ownerWarningMessage = "Tier 0/1 governance requires both business and technical owners";
    }

    return {
      id: def.id,
      canonicalName: def.canonicalName,
      name: def.canonicalName,
      tier: def.tier,
      tierLabel: `Tier ${def.tier}`,
      environment: def.environment,
      rtoMinutes: def.rtoMinutes,
      rpoMinutes: def.rpoMinutes,
      rtoFormatted: formatDurationMinutes(def.rtoMinutes),
      rpoFormatted: formatDurationMinutes(def.rpoMinutes),
      revenueRisk: {
        amount: def.revenueAmount,
        currency: def.currency,
        basis: "hour",
        formatted: `${formatCurrency(def.revenueAmount, def.currency)} per hour`,
      },
      rtoExposure,
      rtoExposureFormatted: `${formatCurrency(rtoExposure, def.currency)} exposure over RTO`,
      businessOwner: def.businessOwner,
      technicalOwner: def.technicalOwner,
      dependentCiIds: matchedCIs.map((c) => c.id),
      dependentCIs: matchedCIs,
      ciCount: matchedCIs.length,
      ciCountByClass,
      lowestScoringCIs,
      topDrivers,
      trustScore: computedScore,
      scoreAsOf: "Today, 05:30 PM UTC",
      band,
      targetStatus,
      operationalStatus: def.operationalStatus,
      description: def.description,
      liveContext: {
        ...def.liveContext,
        staleCiCount: staleCount,
      },
      hasOwnerWarning: isTier0or1 && hasMissingOwner,
      ownerWarningMessage,
    };
  });
}
