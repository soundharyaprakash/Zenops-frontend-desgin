import { formatDateTime } from "@/utils";

// ============================================================================
// DISCOVERY SOURCE RECORD MODEL (Priority 1, Item 1)
// ============================================================================

export type SourceType =
  | "Cloud Provider"
  | "Agent-based"
  | "Kubernetes Operator"
  | "API Integration"
  | "Import";

export type SourceRole = "discovery" | "import";

export type SourceState = "active" | "paused" | "disabled";

export type HealthStatus = "Healthy" | "Late" | "Failed" | "Paused";

export interface ScopeInfo {
  summary: string;
  count: number;
  itemType: string;
  items: string[];
}

export interface CadenceInfo {
  mode: string;
  intervalMinutes: number;
  description: string;
  rawCadenceText: string;
}

export interface CredentialInfo {
  secretRef: string;
  lastRotatedAt: string;
  expiresAt: string;
  daysUntilExpiry: number;
  authFailures: number;
}

export interface RunHistoryItem {
  jobId: string;
  startedAt: string;
  durationSec: number;
  result: "Success" | "Partial" | "Failed";
  created: number;
  updated: number;
  unchanged: number;
  retired: number;
  failed: number;
  errors: number;
  errorMessage?: string;
}

export interface SourceOverlapInfo {
  onlyThisSource: number;
  sharedWithOthers: number;
}

export interface SourceDataQualityInfo {
  conflictsCount: number;
  staleCount: number;
  missingOwnerCount: number;
}

export interface DiscoverySourceRecord {
  id: string;
  name: string;
  type: SourceType;
  role: SourceRole;
  scope: ScopeInfo;
  cadence: CadenceInfo;
  priorityRank: number;
  winsFor: string[];
  lastRun: RunHistoryItem;
  runHistory: RunHistoryItem[];
  nextRunAt: string;
  state: SourceState;
  pauseReason?: string;
  credential: CredentialInfo;
  // Computed & analysis fields
  health: HealthStatus;
  healthReason: string;
  badgeVariant: "success" | "warning" | "danger" | "neutral";
  syncAgeMs: number;
  syncAgeText: string;
  nextRunText: string;
  cisDiscovered: number;
  cisUpdated: number;
  overlap: SourceOverlapInfo;
  dataQuality: SourceDataQualityInfo;
  isPlannedRetirement?: boolean;
  plannedRetirementDate?: string;
}

// ============================================================================
// HELPER: FORMAT DURATION (Minutes / Hours)
// ============================================================================
export function formatDurationMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (remainingMins === 0) return `${hours} hr`;
  return `${hours} hr ${remainingMins} min`;
}

// ============================================================================
// HELPER: PARSE CADENCE STRING TO MINUTES
// ============================================================================
export function parseCadenceMinutes(schedule: string): number {
  const s = schedule.toLowerCase();
  if (s.includes("30 min")) return 30;
  if (s.includes("hourly") || s.includes("1 hour") || s.includes("every hour")) return 60;
  if (s.includes("2 hour")) return 120;
  if (s.includes("6 hour")) return 360;
  if (s.includes("12 hour")) return 720;
  if (s.includes("daily") || s.includes("24 hour")) return 1440;
  if (s.includes("weekly")) return 10080;
  return 120; // Default 2 hours
}

// ============================================================================
// HELPER: FORMAT RELATIVE SYNC AGE (e.g. "2 h ago", "18 min ago")
// ============================================================================
export function formatRelativeSyncTime(diffMs: number): string {
  if (diffMs <= 0) return "Just now";
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}

// ============================================================================
// HELPER: FORMAT NEXT RUN TIME
// ============================================================================
export function formatNextRunTime(nextRunIso: string, nowMs: number = Date.now()): string {
  const nextRunMs = new Date(nextRunIso).getTime();
  if (isNaN(nextRunMs)) return "Scheduled";
  const diffMs = nextRunMs - nowMs;
  if (diffMs <= 0) {
    const overdueMins = Math.round(Math.abs(diffMs) / 60000);
    return overdueMins > 0 ? `Overdue by ${formatDurationMinutes(overdueMins)}` : "Overdue now";
  }
  const mins = Math.round(diffMs / 60000);
  return `Next run in ${formatDurationMinutes(mins)}`;
}

// ============================================================================
// HELPER: FORMAT TIMESTAMP WITH TIMEZONE TOGGLE
// ============================================================================
export function formatSourceTimestamp(isoString: string, mode: "UTC" | "Local" = "UTC"): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "—";

  if (mode === "UTC") {
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = d.getUTCFullYear();
    const month = pad(d.getUTCMonth() + 1);
    const day = pad(d.getUTCDate());
    const hours = pad(d.getUTCHours());
    const minutes = pad(d.getUTCMinutes());
    const seconds = pad(d.getUTCSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
  }

  return formatDateTime(isoString);
}

// ============================================================================
// COMPUTED HEALTH FUNCTION (Priority 1, Item 3)
// - Healthy: last run succeeded and age <= interval
// - Late: last run succeeded but age > interval (up to 2x interval)
// - Failed: last run failed OR age > 2x interval
// - Paused: paused or disabled by an admin
// ============================================================================
export function computeSourceHealth(
  lastRunResult: "Success" | "Partial" | "Failed",
  lastRunStartedAt: string,
  intervalMinutes: number,
  state: SourceState,
  pauseReason?: string,
  errorMessage?: string,
  nowMs: number = Date.now()
): {
  health: HealthStatus;
  healthReason: string;
  badgeVariant: "success" | "warning" | "danger" | "neutral";
  syncAgeMs: number;
  syncAgeText: string;
} {
  if (state === "paused" || state === "disabled") {
    return {
      health: "Paused",
      healthReason: pauseReason || "Connector suspended for scheduled maintenance by Administrator",
      badgeVariant: "neutral",
      syncAgeMs: 0,
      syncAgeText: "Paused",
    };
  }

  const intervalMs = intervalMinutes * 60 * 1000;
  const lastRunMs = new Date(lastRunStartedAt).getTime();
  const syncAgeMs = isNaN(lastRunMs) ? 0 : Math.max(0, nowMs - lastRunMs);
  const syncAgeText = formatRelativeSyncTime(syncAgeMs);

  // Failed: last run failed OR age > 2x interval
  if (lastRunResult === "Failed" || syncAgeMs > 2 * intervalMs) {
    const healthReason =
      lastRunResult === "Failed"
        ? errorMessage || "Last discovery synchronization run failed with unhandled API errors"
        : `Ingestion overdue (>2x interval: ${syncAgeText} vs ${formatDurationMinutes(intervalMinutes)} cadence)`;
    return {
      health: "Failed",
      healthReason,
      badgeVariant: "danger",
      syncAgeMs,
      syncAgeText,
    };
  }

  // Late: last run succeeded but age > interval (up to 2x interval)
  if (syncAgeMs > intervalMs) {
    return {
      health: "Late",
      healthReason: `Ingestion delayed (${syncAgeText} vs ${formatDurationMinutes(intervalMinutes)} cadence)`,
      badgeVariant: "warning",
      syncAgeMs,
      syncAgeText,
    };
  }

  // Healthy: last run succeeded and age <= interval
  return {
    health: "Healthy",
    healthReason: `Sync fresh (${syncAgeText}, within ${formatDurationMinutes(intervalMinutes)} cadence)`,
    badgeVariant: "success",
    syncAgeMs,
    syncAgeText,
  };
}

// ============================================================================
// GENERATE CANONICAL DISCOVERY SOURCES WITH RELATIVE TIMESTAMPS (Priority 1, Item 2)
// Timestamps are calculated relative to nowMs so:
// - 4 Healthy (AWS, Dynatrace, Kubernetes, ServiceNow)
// - 1 Late (Azure Resource Graph)
// - 1 Failed (CrowdStrike Falcon Sensor)
// Total Ingested = 1482 + 489 + 890 + 1204 + 320 + 640 = 5,025
// ============================================================================
export function getCanonicalDiscoverySources(nowMs: number = Date.now()): DiscoverySourceRecord[] {
  const m = (minutes: number) => minutes * 60 * 1000;
  const h = (hours: number) => hours * 3600 * 1000;
  const d = (days: number) => days * 24 * 3600 * 1000;

  // 1. AWS Discovery Connector (Healthy)
  // Interval: 2h (120m). Last run: 45 min ago. Next run in 75 min.
  const awsLastRunTime = new Date(nowMs - m(45)).toISOString();
  const awsNextRunTime = new Date(nowMs + m(75)).toISOString();
  const awsLastRotated = new Date(nowMs - d(42)).toISOString();
  const awsExpires = new Date(nowMs + d(48)).toISOString();

  // 2. Dynatrace APM Agent (Healthy)
  // Cadence: "Streaming events, reconciled hourly" (Item 13). Interval: 1h (60m). Last run: 20m ago. Next run in 40m.
  const dynaLastRunTime = new Date(nowMs - m(20)).toISOString();
  const dynaNextRunTime = new Date(nowMs + m(40)).toISOString();
  const dynaLastRotated = new Date(nowMs - d(18)).toISOString();
  const dynaExpires = new Date(nowMs + d(72)).toISOString();

  // 3. Kubernetes Cluster Operator (Healthy)
  // Interval: 30m. Last run: 12m ago. Next run in 18m.
  const k8sLastRunTime = new Date(nowMs - m(12)).toISOString();
  const k8sNextRunTime = new Date(nowMs + m(18)).toISOString();
  const k8sLastRotated = new Date(nowMs - d(60)).toISOString();
  const k8sExpires = new Date(nowMs + d(30)).toISOString();

  // 4. CrowdStrike Falcon Sensor (Failed - Error message and auth alert)
  // Interval: 6h (360m). Last run: 1.5h ago. Result: Failed. Next run in 4.5h. Auth failures: 3.
  const csLastRunTime = new Date(nowMs - m(90)).toISOString();
  const csNextRunTime = new Date(nowMs + m(270)).toISOString();
  const csLastRotated = new Date(nowMs - d(81)).toISOString();
  const csExpires = new Date(nowMs + d(9)).toISOString(); // <14 days expiry warning!

  // 5. Azure Resource Graph (Late - age > interval up to 2x)
  // Interval: 24h (1440m). Last run: 27h ago. Age 27h > 24h, but < 48h. Result: Success. Next run overdue by 3h.
  const azureLastRunTime = new Date(nowMs - h(27)).toISOString();
  const azureNextRunTime = new Date(nowMs - h(3)).toISOString();
  const azureLastRotated = new Date(nowMs - d(35)).toISOString();
  const azureExpires = new Date(nowMs + d(55)).toISOString();

  // 6. ServiceNow Bridge (Healthy - Import role, lowest priority)
  // Interval: 24h (1440m). Last run: 3.5h ago. Next run in 20.5h.
  const snowLastRunTime = new Date(nowMs - h(3.5)).toISOString();
  const snowNextRunTime = new Date(nowMs + h(20.5)).toISOString();
  const snowLastRotated = new Date(nowMs - d(14)).toISOString();
  const snowExpires = new Date(nowMs + d(76)).toISOString();

  const rawDefinitions = [
    {
      id: "DSC-01",
      name: "AWS Discovery Connector",
      type: "Cloud Provider" as SourceType,
      role: "discovery" as SourceRole,
      scope: {
        summary: "12 AWS Accounts (Production, Staging, Shared Services)",
        count: 12,
        itemType: "Accounts",
        items: [
          "aws-acc-1092-prod-useast1",
          "aws-acc-1093-prod-uswest2",
          "aws-acc-2041-staging-core",
          "aws-acc-3012-shared-services",
          "aws-acc-4011-security-logging",
          "aws-acc-5022-finops-billing",
          "aws-acc-6033-analytics-data",
          "aws-acc-7044-devops-tools",
          "aws-acc-8055-dmz-ingress",
          "aws-acc-9066-disaster-recovery",
          "aws-acc-1107-sandbox-rnd",
          "aws-acc-1208-audit-vault",
        ],
      },
      cadence: {
        mode: "Scheduled Poll",
        intervalMinutes: 120,
        description: "Scheduled API poll every 2 hours",
        rawCadenceText: "Every 2 Hours",
      },
      priorityRank: 1,
      winsFor: ["instanceType", "privateIp", "publicIp", "vpcId", "availabilityZone", "cloudTags"],
      lastRun: {
        jobId: "JOB-AWS-9841",
        startedAt: awsLastRunTime,
        durationSec: 102,
        result: "Success" as const,
        created: 12,
        updated: 341,
        unchanged: 1129,
        retired: 0,
        failed: 0,
        errors: 0,
      },
      runHistory: [
        {
          jobId: "JOB-AWS-9841",
          startedAt: awsLastRunTime,
          durationSec: 102,
          result: "Success" as const,
          created: 12,
          updated: 341,
          unchanged: 1129,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-AWS-9840",
          startedAt: new Date(nowMs - m(45) - h(2)).toISOString(),
          durationSec: 98,
          result: "Success" as const,
          created: 4,
          updated: 182,
          unchanged: 1296,
          retired: 1,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-AWS-9839",
          startedAt: new Date(nowMs - m(45) - h(4)).toISOString(),
          durationSec: 110,
          result: "Success" as const,
          created: 0,
          updated: 94,
          unchanged: 1388,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-AWS-9838",
          startedAt: new Date(nowMs - m(45) - h(6)).toISOString(),
          durationSec: 105,
          result: "Success" as const,
          created: 8,
          updated: 210,
          unchanged: 1264,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-AWS-9837",
          startedAt: new Date(nowMs - m(45) - h(8)).toISOString(),
          durationSec: 94,
          result: "Success" as const,
          created: 1,
          updated: 65,
          unchanged: 1416,
          retired: 2,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-AWS-9836",
          startedAt: new Date(nowMs - m(45) - h(10)).toISOString(),
          durationSec: 108,
          result: "Success" as const,
          created: 3,
          updated: 140,
          unchanged: 1339,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-AWS-9835",
          startedAt: new Date(nowMs - m(45) - h(12)).toISOString(),
          durationSec: 114,
          result: "Success" as const,
          created: 0,
          updated: 88,
          unchanged: 1394,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-AWS-9834",
          startedAt: new Date(nowMs - m(45) - h(14)).toISOString(),
          durationSec: 101,
          result: "Success" as const,
          created: 6,
          updated: 175,
          unchanged: 1301,
          retired: 1,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-AWS-9833",
          startedAt: new Date(nowMs - m(45) - h(16)).toISOString(),
          durationSec: 99,
          result: "Success" as const,
          created: 2,
          updated: 110,
          unchanged: 1370,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-AWS-9832",
          startedAt: new Date(nowMs - m(45) - h(18)).toISOString(),
          durationSec: 104,
          result: "Success" as const,
          created: 5,
          updated: 198,
          unchanged: 1279,
          retired: 0,
          failed: 0,
          errors: 0,
        },
      ],
      nextRunAt: awsNextRunTime,
      state: "active" as SourceState,
      credential: {
        secretRef: "vault://secret/aws/iam/discovery-role-arn",
        lastRotatedAt: awsLastRotated,
        expiresAt: awsExpires,
        daysUntilExpiry: 48,
        authFailures: 0,
      },
      cisDiscovered: 1482,
      cisUpdated: 341,
      overlap: {
        onlyThisSource: 840,
        sharedWithOthers: 642,
      },
      dataQuality: {
        conflictsCount: 0,
        staleCount: 0,
        missingOwnerCount: 1,
      },
    },
    {
      id: "DSC-02",
      name: "Dynatrace APM Agent",
      type: "Agent-based" as SourceType,
      role: "discovery" as SourceRole,
      scope: {
        summary: "Production Host & Container Workloads (Cluster us-east-1)",
        count: 42,
        itemType: "Nodes",
        items: [
          "dynatrace-oneagent-daemonset-prod-01",
          "dynatrace-oneagent-daemonset-prod-02",
          "dynatrace-apm-profiler-pool-east",
          "dynatrace-synthetic-probe-group-global",
          "42 containerized host micro-agents",
        ],
      },
      cadence: {
        mode: "Streaming + Batch",
        intervalMinutes: 60,
        description: "Streaming events, reconciled hourly", // Item 13
        rawCadenceText: "Hourly Digest",
      },
      priorityRank: 4,
      winsFor: ["memoryUtilization", "cpuUsage", "jvmVersion", "apmServiceId", "latencyP99"],
      lastRun: {
        jobId: "JOB-DYNA-6218",
        startedAt: dynaLastRunTime,
        durationSec: 54,
        result: "Success" as const,
        created: 2,
        updated: 112,
        unchanged: 375,
        retired: 0,
        failed: 0,
        errors: 0,
      },
      runHistory: [
        {
          jobId: "JOB-DYNA-6218",
          startedAt: dynaLastRunTime,
          durationSec: 54,
          result: "Success" as const,
          created: 2,
          updated: 112,
          unchanged: 375,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-DYNA-6217",
          startedAt: new Date(nowMs - m(20) - h(1)).toISOString(),
          durationSec: 52,
          result: "Success" as const,
          created: 0,
          updated: 89,
          unchanged: 400,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-DYNA-6216",
          startedAt: new Date(nowMs - m(20) - h(2)).toISOString(),
          durationSec: 58,
          result: "Success" as const,
          created: 1,
          updated: 120,
          unchanged: 368,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-DYNA-6215",
          startedAt: new Date(nowMs - m(20) - h(3)).toISOString(),
          durationSec: 51,
          result: "Success" as const,
          created: 0,
          updated: 74,
          unchanged: 415,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-DYNA-6214",
          startedAt: new Date(nowMs - m(20) - h(4)).toISOString(),
          durationSec: 55,
          result: "Success" as const,
          created: 3,
          updated: 135,
          unchanged: 351,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-DYNA-6213",
          startedAt: new Date(nowMs - m(20) - h(5)).toISOString(),
          durationSec: 49,
          result: "Success" as const,
          created: 0,
          updated: 62,
          unchanged: 427,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-DYNA-6212",
          startedAt: new Date(nowMs - m(20) - h(6)).toISOString(),
          durationSec: 61,
          result: "Success" as const,
          created: 1,
          updated: 98,
          unchanged: 390,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-DYNA-6211",
          startedAt: new Date(nowMs - m(20) - h(7)).toISOString(),
          durationSec: 53,
          result: "Success" as const,
          created: 0,
          updated: 81,
          unchanged: 408,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-DYNA-6210",
          startedAt: new Date(nowMs - m(20) - h(8)).toISOString(),
          durationSec: 57,
          result: "Success" as const,
          created: 2,
          updated: 114,
          unchanged: 373,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-DYNA-6209",
          startedAt: new Date(nowMs - m(20) - h(9)).toISOString(),
          durationSec: 50,
          result: "Success" as const,
          created: 0,
          updated: 70,
          unchanged: 419,
          retired: 0,
          failed: 0,
          errors: 0,
        },
      ],
      nextRunAt: dynaNextRunTime,
      state: "active" as SourceState,
      credential: {
        secretRef: "vault://secret/dynatrace/api-token-ingest",
        lastRotatedAt: dynaLastRotated,
        expiresAt: dynaExpires,
        daysUntilExpiry: 72,
        authFailures: 0,
      },
      cisDiscovered: 489,
      cisUpdated: 112,
      overlap: {
        onlyThisSource: 115,
        sharedWithOthers: 374,
      },
      dataQuality: {
        conflictsCount: 1,
        staleCount: 0,
        missingOwnerCount: 0,
      },
    },
    {
      id: "DSC-03",
      name: "Kubernetes Cluster Operator",
      type: "Kubernetes Operator" as SourceType,
      role: "discovery" as SourceRole,
      scope: {
        summary: "8 EKS Clusters (prod, stage, qa namespaces)",
        count: 8,
        itemType: "Clusters",
        items: [
          "eks-prod-us-east-1 (18 namespaces)",
          "eks-prod-eu-west-1 (12 namespaces)",
          "eks-prod-ap-south-1 (10 namespaces)",
          "eks-stage-us-east-1 (14 namespaces)",
          "eks-stage-eu-west-1 (8 namespaces)",
          "eks-qa-us-east-1 (22 namespaces)",
          "eks-qa-perf-01 (6 namespaces)",
          "eks-mgmt-core-01 (8 namespaces)",
        ],
      },
      cadence: {
        mode: "Scheduled Poll",
        intervalMinutes: 30,
        description: "CRD watch & poll every 30 minutes",
        rawCadenceText: "Every 30 Minutes",
      },
      priorityRank: 2,
      winsFor: ["containerImage", "namespace", "podCount", "clusterUid", "nodeCapacity"],
      lastRun: {
        jobId: "JOB-K8S-7492",
        startedAt: k8sLastRunTime,
        durationSec: 36,
        result: "Success" as const,
        created: 18,
        updated: 410,
        unchanged: 462,
        retired: 3,
        failed: 0,
        errors: 0,
      },
      runHistory: [
        {
          jobId: "JOB-K8S-7492",
          startedAt: k8sLastRunTime,
          durationSec: 36,
          result: "Success" as const,
          created: 18,
          updated: 410,
          unchanged: 462,
          retired: 3,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-K8S-7491",
          startedAt: new Date(nowMs - m(12) - m(30)).toISOString(),
          durationSec: 34,
          result: "Success" as const,
          created: 5,
          updated: 320,
          unchanged: 565,
          retired: 1,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-K8S-7490",
          startedAt: new Date(nowMs - m(12) - m(60)).toISOString(),
          durationSec: 38,
          result: "Success" as const,
          created: 12,
          updated: 395,
          unchanged: 483,
          retired: 2,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-K8S-7489",
          startedAt: new Date(nowMs - m(12) - m(90)).toISOString(),
          durationSec: 32,
          result: "Success" as const,
          created: 2,
          updated: 280,
          unchanged: 608,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-K8S-7488",
          startedAt: new Date(nowMs - m(12) - m(120)).toISOString(),
          durationSec: 35,
          result: "Success" as const,
          created: 8,
          updated: 360,
          unchanged: 522,
          retired: 1,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-K8S-7487",
          startedAt: new Date(nowMs - m(12) - m(150)).toISOString(),
          durationSec: 37,
          result: "Success" as const,
          created: 4,
          updated: 310,
          unchanged: 576,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-K8S-7486",
          startedAt: new Date(nowMs - m(12) - m(180)).toISOString(),
          durationSec: 33,
          result: "Success" as const,
          created: 14,
          updated: 425,
          unchanged: 451,
          retired: 4,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-K8S-7485",
          startedAt: new Date(nowMs - m(12) - m(210)).toISOString(),
          durationSec: 39,
          result: "Success" as const,
          created: 3,
          updated: 290,
          unchanged: 597,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-K8S-7484",
          startedAt: new Date(nowMs - m(12) - m(240)).toISOString(),
          durationSec: 36,
          result: "Success" as const,
          created: 7,
          updated: 345,
          unchanged: 538,
          retired: 2,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-K8S-7483",
          startedAt: new Date(nowMs - m(12) - m(270)).toISOString(),
          durationSec: 34,
          result: "Success" as const,
          created: 1,
          updated: 250,
          unchanged: 639,
          retired: 0,
          failed: 0,
          errors: 0,
        },
      ],
      nextRunAt: k8sNextRunTime,
      state: "active" as SourceState,
      credential: {
        secretRef: "k8s://serviceaccount/zenops-cmdb-agent",
        lastRotatedAt: k8sLastRotated,
        expiresAt: k8sExpires,
        daysUntilExpiry: 30,
        authFailures: 0,
      },
      cisDiscovered: 890,
      cisUpdated: 410,
      overlap: {
        onlyThisSource: 210,
        sharedWithOthers: 680,
      },
      dataQuality: {
        conflictsCount: 0,
        staleCount: 0,
        missingOwnerCount: 0,
      },
    },
    {
      id: "DSC-04",
      name: "CrowdStrike Falcon Sensor",
      type: "Agent-based" as SourceType,
      role: "discovery" as SourceRole,
      scope: {
        summary: "Global Server & Bare Metal Endpoint Fleet",
        count: 1204,
        itemType: "Endpoints",
        items: [
          "Falcon Linux Sensor Fleet (892 instances)",
          "Falcon Windows Server Fleet (312 instances)",
          "Bare-metal Equinix DC1 Rack Hosts (48 nodes)",
          "Multi-cloud Bastion Jumpboxes (24 nodes)",
        ],
      },
      cadence: {
        mode: "Scheduled Poll",
        intervalMinutes: 360,
        description: "Fleet security sensor poll every 6 hours",
        rawCadenceText: "Every 6 Hours",
      },
      priorityRank: 3,
      winsFor: ["osVersion", "kernelVersion", "macAddress", "agentStatus", "lastSeenNetwork"],
      lastRun: {
        jobId: "JOB-CS-5104",
        startedAt: csLastRunTime,
        durationSec: 18,
        result: "Failed" as const, // Item 2 & Item 3: Failed source
        created: 0,
        updated: 0,
        unchanged: 1201,
        retired: 0,
        failed: 3,
        errors: 3,
        errorMessage: "OAuth token validation failed: HTTP 401 Unauthorized - Vault secret lease expiring",
      },
      runHistory: [
        {
          jobId: "JOB-CS-5104",
          startedAt: csLastRunTime,
          durationSec: 18,
          result: "Failed" as const,
          created: 0,
          updated: 0,
          unchanged: 1201,
          retired: 0,
          failed: 3,
          errors: 3,
          errorMessage: "OAuth token validation failed: HTTP 401 Unauthorized - Vault secret lease expiring",
        },
        {
          jobId: "JOB-CS-5103",
          startedAt: new Date(nowMs - m(90) - h(6)).toISOString(),
          durationSec: 88,
          result: "Success" as const,
          created: 4,
          updated: 87,
          unchanged: 1113,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-CS-5102",
          startedAt: new Date(nowMs - m(90) - h(12)).toISOString(),
          durationSec: 92,
          result: "Success" as const,
          created: 2,
          updated: 74,
          unchanged: 1128,
          retired: 1,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-CS-5101",
          startedAt: new Date(nowMs - m(90) - h(18)).toISOString(),
          durationSec: 85,
          result: "Success" as const,
          created: 6,
          updated: 99,
          unchanged: 1099,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-CS-5100",
          startedAt: new Date(nowMs - m(90) - h(24)).toISOString(),
          durationSec: 94,
          result: "Success" as const,
          created: 1,
          updated: 62,
          unchanged: 1141,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-CS-5099",
          startedAt: new Date(nowMs - m(90) - h(30)).toISOString(),
          durationSec: 89,
          result: "Success" as const,
          created: 3,
          updated: 105,
          unchanged: 1096,
          retired: 2,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-CS-5098",
          startedAt: new Date(nowMs - m(90) - h(36)).toISOString(),
          durationSec: 86,
          result: "Success" as const,
          created: 0,
          updated: 55,
          unchanged: 1149,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-CS-5097",
          startedAt: new Date(nowMs - m(90) - h(42)).toISOString(),
          durationSec: 91,
          result: "Success" as const,
          created: 5,
          updated: 91,
          unchanged: 1108,
          retired: 1,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-CS-5096",
          startedAt: new Date(nowMs - m(90) - h(48)).toISOString(),
          durationSec: 87,
          result: "Success" as const,
          created: 2,
          updated: 78,
          unchanged: 1124,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-CS-5095",
          startedAt: new Date(nowMs - m(90) - h(54)).toISOString(),
          durationSec: 95,
          result: "Success" as const,
          created: 4,
          updated: 110,
          unchanged: 1090,
          retired: 0,
          failed: 0,
          errors: 0,
        },
      ],
      nextRunAt: csNextRunTime,
      state: "active" as SourceState,
      credential: {
        secretRef: "vault://secret/crowdstrike/oauth-client",
        lastRotatedAt: csLastRotated,
        expiresAt: csExpires,
        daysUntilExpiry: 9, // Alert: expiring < 14 days!
        authFailures: 3,    // Alert: auth failures > 0!
      },
      cisDiscovered: 1204,
      cisUpdated: 87,
      overlap: {
        onlyThisSource: 380,
        sharedWithOthers: 824,
      },
      dataQuality: {
        conflictsCount: 0,
        staleCount: 1,
        missingOwnerCount: 0,
      },
    },
    {
      id: "DSC-05",
      name: "Azure Resource Graph",
      type: "Cloud Provider" as SourceType,
      role: "discovery" as SourceRole,
      scope: {
        summary: "Subscription: ZenOps-Enterprise-Prod",
        count: 4,
        itemType: "Subscriptions",
        items: [
          "sub-zenops-prod-core (14 Resource Groups)",
          "sub-zenops-prod-data (8 Resource Groups)",
          "sub-zenops-prod-networking (4 Resource Groups)",
          "sub-zenops-prod-identity (6 Resource Groups)",
        ],
      },
      cadence: {
        mode: "Scheduled Batch",
        intervalMinutes: 1440,
        description: "Resource Graph batch query daily at 02:00 UTC",
        rawCadenceText: "Daily at 02:00 UTC",
      },
      priorityRank: 5,
      winsFor: ["azureSubscriptionId", "resourceGroup", "vmSize", "vnetSubnet"],
      lastRun: {
        jobId: "JOB-AZ-3301",
        startedAt: azureLastRunTime, // 27h ago -> Late (>24h, <=48h)
        durationSec: 142,
        result: "Success" as const,
        created: 1,
        updated: 14,
        unchanged: 305,
        retired: 0,
        failed: 0,
        errors: 0,
      },
      runHistory: [
        {
          jobId: "JOB-AZ-3301",
          startedAt: azureLastRunTime,
          durationSec: 142,
          result: "Success" as const,
          created: 1,
          updated: 14,
          unchanged: 305,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-AZ-3300",
          startedAt: new Date(nowMs - h(27) - d(1)).toISOString(),
          durationSec: 138,
          result: "Success" as const,
          created: 3,
          updated: 22,
          unchanged: 295,
          retired: 1,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-AZ-3299",
          startedAt: new Date(nowMs - h(27) - d(2)).toISOString(),
          durationSec: 145,
          result: "Partial" as const,
          created: 0,
          updated: 9,
          unchanged: 310,
          retired: 0,
          failed: 1,
          errors: 1,
        },
        {
          jobId: "JOB-AZ-3298",
          startedAt: new Date(nowMs - h(27) - d(3)).toISOString(),
          durationSec: 140,
          result: "Success" as const,
          created: 2,
          updated: 18,
          unchanged: 300,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-AZ-3297",
          startedAt: new Date(nowMs - h(27) - d(4)).toISOString(),
          durationSec: 136,
          result: "Success" as const,
          created: 0,
          updated: 12,
          unchanged: 308,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-AZ-3296",
          startedAt: new Date(nowMs - h(27) - d(5)).toISOString(),
          durationSec: 144,
          result: "Success" as const,
          created: 4,
          updated: 26,
          unchanged: 290,
          retired: 2,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-AZ-3295",
          startedAt: new Date(nowMs - h(27) - d(6)).toISOString(),
          durationSec: 139,
          result: "Success" as const,
          created: 1,
          updated: 15,
          unchanged: 304,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-AZ-3294",
          startedAt: new Date(nowMs - h(27) - d(7)).toISOString(),
          durationSec: 141,
          result: "Success" as const,
          created: 2,
          updated: 19,
          unchanged: 299,
          retired: 1,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-AZ-3293",
          startedAt: new Date(nowMs - h(27) - d(8)).toISOString(),
          durationSec: 137,
          result: "Success" as const,
          created: 0,
          updated: 11,
          unchanged: 309,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-AZ-3292",
          startedAt: new Date(nowMs - h(27) - d(9)).toISOString(),
          durationSec: 143,
          result: "Success" as const,
          created: 3,
          updated: 21,
          unchanged: 296,
          retired: 0,
          failed: 0,
          errors: 0,
        },
      ],
      nextRunAt: azureNextRunTime,
      state: "active" as SourceState,
      credential: {
        secretRef: "vault://secret/azure/service-principal",
        lastRotatedAt: azureLastRotated,
        expiresAt: azureExpires,
        daysUntilExpiry: 55,
        authFailures: 0,
      },
      cisDiscovered: 320,
      cisUpdated: 14,
      overlap: {
        onlyThisSource: 195,
        sharedWithOthers: 125,
      },
      dataQuality: {
        conflictsCount: 1,
        staleCount: 1,
        missingOwnerCount: 0,
      },
    },
    {
      id: "DSC-06",
      name: "ServiceNow Bridge",
      type: "Import" as SourceType, // Item 19: Label "Import (not discovery)"
      role: "import" as SourceRole,
      scope: {
        summary: "Legacy CMDB Import & Reconciliation",
        count: 640,
        itemType: "Records",
        items: [
          "cmdb_ci_server (420 server records)",
          "cmdb_ci_appl (140 application records)",
          "cmdb_ci_database (80 database records)",
        ],
      },
      cadence: {
        mode: "Scheduled Batch Import",
        intervalMinutes: 1440,
        description: "Legacy CMDB delta import daily at 04:00 UTC",
        rawCadenceText: "Daily at 04:00 UTC",
      },
      priorityRank: 6, // Item 19: Ranked lowest
      winsFor: ["costCenter", "assetTag", "installDate", "legacySysId"],
      lastRun: {
        jobId: "JOB-SNOW-1094",
        startedAt: snowLastRunTime,
        durationSec: 210,
        result: "Success" as const,
        created: 0,
        updated: 95,
        unchanged: 545,
        retired: 0,
        failed: 0,
        errors: 0,
      },
      runHistory: [
        {
          jobId: "JOB-SNOW-1094",
          startedAt: snowLastRunTime,
          durationSec: 210,
          result: "Success" as const,
          created: 0,
          updated: 95,
          unchanged: 545,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-SNOW-1093",
          startedAt: new Date(nowMs - h(3.5) - d(1)).toISOString(),
          durationSec: 205,
          result: "Success" as const,
          created: 0,
          updated: 88,
          unchanged: 552,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-SNOW-1092",
          startedAt: new Date(nowMs - h(3.5) - d(2)).toISOString(),
          durationSec: 218,
          result: "Success" as const,
          created: 0,
          updated: 110,
          unchanged: 530,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-SNOW-1091",
          startedAt: new Date(nowMs - h(3.5) - d(3)).toISOString(),
          durationSec: 200,
          result: "Success" as const,
          created: 0,
          updated: 78,
          unchanged: 562,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-SNOW-1090",
          startedAt: new Date(nowMs - h(3.5) - d(4)).toISOString(),
          durationSec: 212,
          result: "Success" as const,
          created: 0,
          updated: 104,
          unchanged: 536,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-SNOW-1089",
          startedAt: new Date(nowMs - h(3.5) - d(5)).toISOString(),
          durationSec: 208,
          result: "Success" as const,
          created: 0,
          updated: 82,
          unchanged: 558,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-SNOW-1088",
          startedAt: new Date(nowMs - h(3.5) - d(6)).toISOString(),
          durationSec: 215,
          result: "Success" as const,
          created: 0,
          updated: 98,
          unchanged: 542,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-SNOW-1087",
          startedAt: new Date(nowMs - h(3.5) - d(7)).toISOString(),
          durationSec: 203,
          result: "Success" as const,
          created: 0,
          updated: 76,
          unchanged: 564,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-SNOW-1086",
          startedAt: new Date(nowMs - h(3.5) - d(8)).toISOString(),
          durationSec: 220,
          result: "Success" as const,
          created: 0,
          updated: 115,
          unchanged: 525,
          retired: 0,
          failed: 0,
          errors: 0,
        },
        {
          jobId: "JOB-SNOW-1085",
          startedAt: new Date(nowMs - h(3.5) - d(9)).toISOString(),
          durationSec: 206,
          result: "Success" as const,
          created: 0,
          updated: 85,
          unchanged: 555,
          retired: 0,
          failed: 0,
          errors: 0,
        },
      ],
      nextRunAt: snowNextRunTime,
      state: "active" as SourceState,
      credential: {
        secretRef: "vault://secret/snow/oauth-cmdb",
        lastRotatedAt: snowLastRotated,
        expiresAt: snowExpires,
        daysUntilExpiry: 76,
        authFailures: 0,
      },
      cisDiscovered: 640,
      cisUpdated: 95,
      overlap: {
        onlyThisSource: 90,
        sharedWithOthers: 550,
      },
      dataQuality: {
        conflictsCount: 1,
        staleCount: 0,
        missingOwnerCount: 1,
      },
      isPlannedRetirement: true, // Item 19: Planned retirement
      plannedRetirementDate: "Q2 2027",
    },
  ];

  return rawDefinitions.map((def) => {
    const computed = computeSourceHealth(
      def.lastRun.result,
      def.lastRun.startedAt,
      def.cadence.intervalMinutes,
      def.state,
      undefined,
      def.lastRun.errorMessage,
      nowMs
    );

    return {
      ...def,
      health: computed.health,
      healthReason: computed.healthReason,
      badgeVariant: computed.badgeVariant,
      syncAgeMs: computed.syncAgeMs,
      syncAgeText: computed.syncAgeText,
      nextRunText: formatNextRunTime(def.nextRunAt, nowMs),
    };
  });
}

// ============================================================================
// NOT YET COVERED INFRASTRUCTURE DOMAINS (Priority 3, Item 16)
// ============================================================================
export interface UncoveredDomain {
  id: string;
  domain: string;
  description: string;
  recommendedConnectors: string[];
  status: "Not connected";
}

export const UNCOVERED_DOMAINS: UncoveredDomain[] = [
  {
    id: "unc-01",
    domain: "Network devices",
    description: "Cisco Catalyst, Arista EOS, Juniper Junos, Palo Alto firewalls via SNMP v3 / NetFlow",
    recommendedConnectors: ["SNMP v3 Poller", "Network Topology Crawler"],
    status: "Not connected",
  },
  {
    id: "unc-02",
    domain: "Directory and endpoints",
    description: "Microsoft Entra ID, Okta Workforce Identity, and Intune MDM workstation mapping",
    recommendedConnectors: ["Microsoft Graph SCIM Bridge", "Okta Identity Collector"],
    status: "Not connected",
  },
  {
    id: "unc-03",
    domain: "Hypervisors",
    description: "VMware vCenter, Nutanix Prism, and Proxmox on-premise compute clusters",
    recommendedConnectors: ["VMware vSphere PyVmomi Connector", "Nutanix REST API"],
    status: "Not connected",
  },
  {
    id: "unc-04",
    domain: "SaaS & Cloud Apps",
    description: "Salesforce CRM, Workday HCM, and GitHub Enterprise cloud organization licenses",
    recommendedConnectors: ["SaaS Governance API Hook", "GitHub Audit Log Stream"],
    status: "Not connected",
  },
];
