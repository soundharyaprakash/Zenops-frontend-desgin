/**
 * Single Business Services Model (Phase 0, Item 0.3 & Screen 5)
 *
 * One canonical service record per business service read by:
 * - Dashboard (Services Health card)
 * - Business Services Catalog
 * - Topology & Impact Map
 *
 * Guarantees identical canonical names, dependent CI counts, and Trust Scores.
 */

import { ScoreBand, getScoreBand, getScoreTargetStatus } from "./score-bands";

export interface ServiceOwnerInfo {
  name: string;
  role: string;
  team: string;
  contact: string;
}

export interface CanonicalServiceRecord {
  id: string;
  canonicalName: string;
  aliasName: string;
  tier: 0 | 1 | 2 | 3;
  tierLabel: string;
  environment: "Production" | "Staging";
  score: number;
  band: ScoreBand;
  targetStatus: { label: "Target met" | "Below target"; variant: "success" | "danger" };
  dependentCiCount: number;
  dependentCiIds: string[];
  ciClassBreakdown: Record<string, number>;
  rtoMinutes: number;
  rpoMinutes: number;
  rtoFormatted: string;
  rpoFormatted: string;
  revenueRiskPerHour: number;
  revenueRiskFormatted: string;
  rtoExposureAmount: number;
  rtoExposureFormatted: string;
  businessOwner: ServiceOwnerInfo;
  technicalOwner: ServiceOwnerInfo;
  isOwnerOverloaded: boolean; // Flag if owner manages > 1 service
  topRiskDrivers: string[];
  lowestScoringCIs: { id: string; name: string; score: number; issue: string }[];
  relatedTaskIds: string[];
  lastAttestationDate: string;
  openIncidentsCount: number;
  upcomingChangesCount: number;
}

export const CANONICAL_SERVICES_DATA: CanonicalServiceRecord[] = [
  {
    id: "BS-101",
    canonicalName: "Customer Web Portal",
    aliasName: "Customer Portal",
    tier: 1,
    tierLabel: "Tier 1 - Mission Critical",
    environment: "Production",
    score: 88,
    band: getScoreBand(88),
    targetStatus: getScoreTargetStatus(88),
    dependentCiCount: 10,
    dependentCiIds: ["CI-1001", "CI-1004", "CI-1005", "CI-1007", "CI-1008", "CI-1013", "CI-1014", "CI-1015", "CI-1016", "CI-1017"],
    ciClassBreakdown: { Application: 3, Database: 2, "Server/VM": 3, Network: 2 },
    rtoMinutes: 15,
    rpoMinutes: 1,
    rtoFormatted: "15 min",
    rpoFormatted: "1 min",
    revenueRiskPerHour: 285000,
    revenueRiskFormatted: "$285,000 per hour",
    rtoExposureAmount: 71250,
    rtoExposureFormatted: "$71,250 over RTO",
    businessOwner: {
      name: "David Chen",
      role: "Director of Digital Channels",
      team: "Digital Experience & Growth",
      contact: "d.chen@zenops.local",
    },
    technicalOwner: {
      name: "Sarah Jenkins",
      role: "Lead Cloud Architect",
      team: "Platform Engineering",
      contact: "s.jenkins@zenops.local",
    },
    isOwnerOverloaded: true, // David Chen also owns Order Processing
    topRiskDrivers: ["1 edge gateway cert near renewal", "2 container pods pending attestation"],
    lowestScoringCIs: [
      { id: "CI-1004", name: "aws-ec2-prod-edge-gateway-01", score: 81, issue: "Attribute reconciliation conflict" },
      { id: "CI-1008", name: "redis-cache-cluster-01", score: 86, issue: "Stale telemetry check warning" },
    ],
    relatedTaskIds: ["DQ-201", "DQ-203"],
    lastAttestationDate: "2026-10-15T00:00:00Z",
    openIncidentsCount: 0,
    upcomingChangesCount: 2,
  },
  {
    id: "BS-102",
    canonicalName: "Payment Gateway",
    aliasName: "Payments API",
    tier: 0,
    tierLabel: "Tier 0 - Financial Critical",
    environment: "Production",
    score: 94,
    band: getScoreBand(94),
    targetStatus: getScoreTargetStatus(94),
    dependentCiCount: 8,
    dependentCiIds: ["CI-1001", "CI-1002", "CI-1004", "CI-1018", "CI-1019", "CI-1020", "CI-1021", "CI-1022"],
    ciClassBreakdown: { Application: 1, Database: 1, "Server/VM": 4, "Container/Pod": 2 },
    rtoMinutes: 5,
    rpoMinutes: 0,
    rtoFormatted: "5 min",
    rpoFormatted: "0 min (Zero Data Loss)",
    revenueRiskPerHour: 520000,
    revenueRiskFormatted: "$520,000 per hour",
    rtoExposureAmount: 43333,
    rtoExposureFormatted: "$43,333 over RTO",
    businessOwner: {
      name: "Elena Rostova",
      role: "VP of Payment Operations",
      team: "Global Treasury & Settlement",
      contact: "e.rostova@zenops.local",
    },
    technicalOwner: {
      name: "Priya Sharma",
      role: "Principal Data Architect",
      team: "Database Administration (DBA)",
      contact: "p.sharma@zenops.local",
    },
    isOwnerOverloaded: false,
    topRiskDrivers: ["1 PCI compliance scope item pending verification"],
    lowestScoringCIs: [
      { id: "CI-1006", name: "vault-secrets-backend-01", score: 91, issue: "Key rotation verification in progress" },
    ],
    relatedTaskIds: ["DQ-205"],
    lastAttestationDate: "2026-11-01T00:00:00Z",
    openIncidentsCount: 0,
    upcomingChangesCount: 1,
  },
  {
    id: "BS-103",
    canonicalName: "Enterprise Data Warehouse",
    aliasName: "Data Warehouse",
    tier: 2,
    tierLabel: "Tier 2 - Business Critical",
    environment: "Production",
    score: 74, // Below target (At risk in 60-79 band)
    band: getScoreBand(74),
    targetStatus: getScoreTargetStatus(74),
    dependentCiCount: 12,
    dependentCiIds: ["CI-1006", "CI-1010", "CI-1023", "CI-1024", "CI-1025", "CI-1026", "CI-1027", "CI-1028", "CI-1029", "CI-1030", "CI-1031", "CI-1032"],
    ciClassBreakdown: { Application: 2, Database: 2, "Server/VM": 4, "Container/Pod": 3, Storage: 1 },
    rtoMinutes: 120,
    rpoMinutes: 60,
    rtoFormatted: "120 min",
    rpoFormatted: "60 min",
    revenueRiskPerHour: 95000,
    revenueRiskFormatted: "$95,000 per hour",
    rtoExposureAmount: 190000,
    rtoExposureFormatted: "$190,000 over RTO",
    businessOwner: {
      name: "Marcus Vance",
      role: "VP of Enterprise Analytics",
      team: "Data & Insights Group",
      contact: "m.vance@zenops.local",
    },
    technicalOwner: {
      name: "Alex Kumar",
      role: "Lead Data Engineer",
      team: "Data Engineering & Pipeline",
      contact: "a.kumar@zenops.local",
    },
    isOwnerOverloaded: false,
    topRiskDrivers: ["2 CIs stale (>14d)", "1 CI without assigned technical owner"],
    lowestScoringCIs: [
      { id: "CI-1010", name: "snowflake-sync-pipeline-worker-03", score: 62, issue: "Stale discovery & missing owner" },
      { id: "CI-1011", name: "redshift-dw-cluster-east", score: 71, issue: "Missing secondary contact" },
    ],
    relatedTaskIds: ["DQ-201", "DQ-202"],
    lastAttestationDate: "2026-09-15T00:00:00Z",
    openIncidentsCount: 1,
    upcomingChangesCount: 0,
  },
  {
    id: "BS-104",
    canonicalName: "Inventory & Logistics",
    aliasName: "Inventory System",
    tier: 1,
    tierLabel: "Tier 1 - Mission Critical",
    environment: "Production",
    score: 84,
    band: getScoreBand(84),
    targetStatus: getScoreTargetStatus(84),
    dependentCiCount: 7,
    dependentCiIds: ["CI-1003", "CI-1005", "CI-1011", "CI-1033", "CI-1034", "CI-1035", "CI-1036"],
    ciClassBreakdown: { Application: 1, Database: 2, "Server/VM": 2, "Container/Pod": 2 },
    rtoMinutes: 30,
    rpoMinutes: 5,
    rtoFormatted: "30 min",
    rpoFormatted: "5 min",
    revenueRiskPerHour: 160000,
    revenueRiskFormatted: "$160,000 per hour",
    rtoExposureAmount: 80000,
    rtoExposureFormatted: "$80,000 over RTO",
    businessOwner: {
      name: "Rachel Moore",
      role: "Director of Supply Chain Ops",
      team: "Global Logistics & Fulfillment",
      contact: "r.moore@zenops.local",
    },
    technicalOwner: {
      name: "Jordan Lee",
      role: "Principal Systems Engineer",
      team: "Infrastructure Services",
      contact: "j.lee@zenops.local",
    },
    isOwnerOverloaded: false,
    topRiskDrivers: ["1 edge scanner switch with 7-day telemetry gap"],
    lowestScoringCIs: [
      { id: "CI-1012", name: "warehouse-scanner-edge-switch-01", score: 78, issue: "Stale network device telemetry" },
    ],
    relatedTaskIds: ["DQ-204"],
    lastAttestationDate: "2026-10-30T00:00:00Z",
    openIncidentsCount: 0,
    upcomingChangesCount: 1,
  },
  {
    id: "BS-105",
    canonicalName: "Order Processing System",
    aliasName: "Order Processing",
    tier: 1,
    tierLabel: "Tier 1 - Mission Critical",
    environment: "Production",
    score: 79, // Below target (At risk in 60-79 band)
    band: getScoreBand(79),
    targetStatus: getScoreTargetStatus(79),
    dependentCiCount: 7,
    dependentCiIds: ["CI-1001", "CI-1002", "CI-1003", "CI-1009", "CI-1037", "CI-1038", "CI-1039"],
    ciClassBreakdown: { Application: 2, Database: 2, "Server/VM": 1, "Container/Pod": 2 },
    rtoMinutes: 20,
    rpoMinutes: 2,
    rtoFormatted: "20 min",
    rpoFormatted: "2 min",
    revenueRiskPerHour: 210000,
    revenueRiskFormatted: "$210,000 per hour",
    rtoExposureAmount: 70000,
    rtoExposureFormatted: "$70,000 over RTO",
    businessOwner: {
      name: "David Chen",
      role: "Director of Digital Channels",
      team: "Digital Experience & Growth",
      contact: "d.chen@zenops.local",
    },
    technicalOwner: {
      name: "Amara Okafor",
      role: "Staff Site Reliability Engineer",
      team: "Core SRE & Resiliency",
      contact: "a.okafor@zenops.local",
    },
    isOwnerOverloaded: true, // David Chen also owns Customer Web Portal
    topRiskDrivers: ["1 order messaging queue worker unassigned", "Stale telemetry on worker node"],
    lowestScoringCIs: [
      { id: "CI-1015", name: "order-queue-processor-pod-04", score: 72, issue: "Missing ownership attribution" },
    ],
    relatedTaskIds: ["DQ-201"],
    lastAttestationDate: "2026-10-10T00:00:00Z",
    openIncidentsCount: 0,
    upcomingChangesCount: 0,
  },
];

export const AVERAGE_SERVICE_SCORE_LABEL = "Average service score";

export interface ServicesSummaryMetrics {
  totalServices: number;
  servicesBelowTarget: number;
  servicesHealthy: number;
  totalRevenueRiskPerHour: number;
  totalRevenueRiskFormatted: string;
  totalRtoExposureAmount: number;
  totalRtoExposureFormatted: string;
  averageServiceScore: number;
  averageTrustScore: number; // backward-compatible alias
  averageScoreLabel: string;
  averageTrustBand: ScoreBand;
  overloadedOwners: string[];
}

export function getServicesSummaryMetrics(): ServicesSummaryMetrics {
  const totalServices = CANONICAL_SERVICES_DATA.length;
  const servicesBelowTarget = CANONICAL_SERVICES_DATA.filter((s) => s.score < 80).length; // 2 (EDW @ 74, Order Processing @ 79)
  const servicesHealthy = totalServices - servicesBelowTarget; // 3

  const totalRevenueRiskPerHour = CANONICAL_SERVICES_DATA.reduce((acc, s) => acc + s.revenueRiskPerHour, 0); // 1,270,000
  const totalRtoExposureAmount = CANONICAL_SERVICES_DATA.reduce((acc, s) => acc + s.rtoExposureAmount, 0); // 454,583

  const sumScores = CANONICAL_SERVICES_DATA.reduce((acc, s) => acc + s.score, 0);
  const averageServiceScore = Math.round(sumScores / totalServices); // 84

  // Check overloaded owners (> 1 service)
  const ownerCounts = new Map<string, number>();
  CANONICAL_SERVICES_DATA.forEach((s) => {
    const o = s.businessOwner.name;
    ownerCounts.set(o, (ownerCounts.get(o) || 0) + 1);
  });
  const overloadedOwners = Array.from(ownerCounts.entries())
    .filter(([_, count]) => count > 1)
    .map(([name, _]) => name);

  return {
    totalServices,
    servicesBelowTarget,
    servicesHealthy,
    totalRevenueRiskPerHour,
    totalRevenueRiskFormatted: `$${totalRevenueRiskPerHour.toLocaleString()} per hour`,
    totalRtoExposureAmount,
    totalRtoExposureFormatted: `$${totalRtoExposureAmount.toLocaleString()} over cumulative RTO`,
    averageServiceScore,
    averageTrustScore: averageServiceScore,
    averageScoreLabel: AVERAGE_SERVICE_SCORE_LABEL,
    averageTrustBand: getScoreBand(averageServiceScore),
    overloadedOwners,
  };
}
