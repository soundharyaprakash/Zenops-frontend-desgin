/**
 * Single Stale Threshold Configuration (Phase 0, Item 0.6)
 *
 * Class-specific staleness thresholds:
 * - containers: 3 days (3d)
 * - databases: 7 days (7d)
 * - servers: 14 days (14d)
 * - applications: 21 days (21d)
 * - network devices: 30 days (30d)
 *
 * Dashboard stale tile, IRE rules, and Data Quality tasks must all use this definition,
 * and state the explicit action taken when a threshold is crossed.
 */

export interface StaleThresholdConfig {
  ciClass: string;
  thresholdDays: number;
  thresholdHours: number;
  label: string;
  actionTaken: string;
  actionType: "retire" | "task" | "review" | "alert";
}

export const CLASS_STALE_THRESHOLDS: Record<string, StaleThresholdConfig> = {
  Container: {
    ciClass: "Container/Pod",
    thresholdDays: 3,
    thresholdHours: 72,
    label: "3 days (containers & pods)",
    actionTaken: "Flag stale; queue for automated retirement if inactive > 7 days",
    actionType: "retire",
  },
  "Container/Pod": {
    ciClass: "Container/Pod",
    thresholdDays: 3,
    thresholdHours: 72,
    label: "3 days (containers & pods)",
    actionTaken: "Flag stale; queue for automated retirement if inactive > 7 days",
    actionType: "retire",
  },
  Database: {
    ciClass: "Database",
    thresholdDays: 7,
    thresholdHours: 168,
    label: "7 days (databases & clusters)",
    actionTaken: "Create Data Quality remediation task assigned to Database Administration (DBA)",
    actionType: "task",
  },
  Server: {
    ciClass: "Server/VM",
    thresholdDays: 14,
    thresholdHours: 336,
    label: "14 days (servers & virtual machines)",
    actionTaken: "Create Data Quality remediation task assigned to Systems & Cloud Ops",
    actionType: "task",
  },
  "Server/VM": {
    ciClass: "Server/VM",
    thresholdDays: 14,
    thresholdHours: 336,
    label: "14 days (servers & virtual machines)",
    actionTaken: "Create Data Quality remediation task assigned to Systems & Cloud Ops",
    actionType: "task",
  },
  Application: {
    ciClass: "Application",
    thresholdDays: 21,
    thresholdHours: 504,
    label: "21 days (applications & microservices)",
    actionTaken: "Flag for Data Steward review & trigger owner re-attestation workflow",
    actionType: "review",
  },
  Network: {
    ciClass: "Network",
    thresholdDays: 30,
    thresholdHours: 720,
    label: "30 days (network devices, switches & firewalls)",
    actionTaken: "Alert Network Operations Center (NOC) & raise high-priority connectivity task",
    actionType: "alert",
  },
  "Network Device": {
    ciClass: "Network",
    thresholdDays: 30,
    thresholdHours: 720,
    label: "30 days (network devices, switches & firewalls)",
    actionTaken: "Alert Network Operations Center (NOC) & raise high-priority connectivity task",
    actionType: "alert",
  },
};

export const DEFAULT_STALE_THRESHOLD: StaleThresholdConfig = {
  ciClass: "Default",
  thresholdDays: 14,
  thresholdHours: 336,
  label: "14 days (standard threshold)",
  actionTaken: "Create Data Quality remediation task",
  actionType: "task",
};

/**
 * Canonical estate telemetry reference timestamp (November 20, 2026 17:00:00 UTC).
 * Synchronized with the canonical discovery collector run and audit baseline.
 */
export const CANONICAL_ESTATE_NOW_MS = new Date("2026-11-20T17:00:00Z").getTime();

/**
 * Returns the threshold configuration for a specific CI class.
 */
export function getStaleThresholdForClass(ciClass: string): StaleThresholdConfig {
  const norm = (ciClass || "").trim();
  for (const [key, cfg] of Object.entries(CLASS_STALE_THRESHOLDS)) {
    if (key.toLowerCase() === norm.toLowerCase() || norm.toLowerCase().includes(key.toLowerCase())) {
      return cfg;
    }
  }
  return DEFAULT_STALE_THRESHOLD;
}

/**
 * Checks whether a CI is stale based on its class threshold.
 */
export function isCIStale(
  lastDiscoveredIso: string | undefined,
  ciClass: string,
  nowMs: number = CANONICAL_ESTATE_NOW_MS
): { isStale: boolean; ageDays: number; thresholdDays: number; actionTaken: string } {
  const cfg = getStaleThresholdForClass(ciClass);
  if (!lastDiscoveredIso) {
    return { isStale: true, ageDays: 999, thresholdDays: cfg.thresholdDays, actionTaken: cfg.actionTaken };
  }
  const lastTime = new Date(lastDiscoveredIso).getTime();
  if (isNaN(lastTime)) {
    return { isStale: true, ageDays: 999, thresholdDays: cfg.thresholdDays, actionTaken: cfg.actionTaken };
  }
  const ageDays = Math.floor((nowMs - lastTime) / (1000 * 60 * 60 * 24));
  return {
    isStale: ageDays > cfg.thresholdDays,
    ageDays,
    thresholdDays: cfg.thresholdDays,
    actionTaken: cfg.actionTaken,
  };
}
