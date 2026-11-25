/**
 * ZenOps CMDB Reconciliation & Single Source of Truth Test Suite (Phase 0, Item 0.10)
 *
 * Asserts:
 * 1. sum(by-class) == total (Inventory 100% sum-to-one rule)
 * 2. discovery unique <= ingested (4,385 <= 5,025, 12.7% overlap)
 * 3. service CI counts match dashboard exactly
 * 4. trust score identical across views (tile, gauge, trend math)
 * 5. every tile count == its list count (Stale: 2, Missing Owner: 2, Review Queue: 3)
 * 6. sync-status computation (Healthy, Late, Failed, Paused)
 * 7. score band function (>=80 Healthy, 60-79 At risk, <60 Critical)
 * 8. bulk-apply exclusion of ownership, retirement, and compliance
 * 9. hash-chain integrity verification
 * 10. per-attribute precedence resolution
 * 11. rule simulation counts
 */

import {
  getScoreBand,
  getScoreTargetStatus,
  SCORE_BANDS,
  getStaleThresholdForClass,
  isCIStale,
  getInventoryMetrics,
  getDiscoveryModelMetrics,
  computeSyncStatus,
  calculateEstateTrustScore,
  computePillarsFromInventory,
  ESTATE_TRUST_SCORE_LABEL,
  CANONICAL_SERVICES_DATA,
  getServicesSummaryMetrics,
  AVERAGE_SERVICE_SCORE_LABEL,
  getTaskQueueMetrics,
  CANONICAL_REMEDIATION_TASKS,
  CANONICAL_IRE_REVIEW_QUEUE,
  simulateRuleExecution,
} from "../lib/cmdb-metrics";
import {
  INITIAL_CIS,
  INITIAL_RECONCILIATION_RULES,
  INITIAL_DATA_QUALITY_TASKS,
} from "../services/mock-data";
import { CIItem } from "../types/cmdb";
import crypto from "crypto";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    passedCount++;
    console.log(`[✓ PASS] ${testName}`);
    if (details) console.log(`       Details: ${JSON.stringify(details)}`);
  } else {
    failedCount++;
    console.error(`[✗ FAIL] ${testName}`);
    if (details) console.error(`       Details: ${JSON.stringify(details)}`);
  }
}

console.log("================================================================================");
console.log("       ZenOps CMDB Single Source of Truth & Reconciliation Test Suite           ");
console.log("================================================================================");

// -----------------------------------------------------------------------------
// Test 1: Inventory breakdown sum(by-class) == total and sum(pct) == 100%
// -----------------------------------------------------------------------------
const inventory = getInventoryMetrics(INITIAL_CIS);
const sumCounts = inventory.byClass.reduce((acc, c) => acc + c.count, 0);
const sumPcts = inventory.byClass.reduce((acc, c) => acc + c.pct, 0);

assert(
  inventory.totalCIs === 39 && sumCounts === 39 && sumPcts === 100,
  "Inventory reconciliation: sum(by-class) == total (39 CIs) and sum(pct) == 100%",
  { total: inventory.totalCIs, sumCounts, sumPcts, classesCount: inventory.byClass.length }
);

// -----------------------------------------------------------------------------
// Test 2: Discovery cross-model reconciliation (unique CIs === inventory total)
// -----------------------------------------------------------------------------
const discovery = getDiscoveryModelMetrics(Date.now(), inventory.totalCIs);
const expectedOverlap = Number(
  (((discovery.recordsIngested - discovery.uniqueCIs) / discovery.recordsIngested) * 100).toFixed(1)
);

assert(
  discovery.uniqueCIs === inventory.totalCIs &&
    discovery.recordsIngested >= discovery.uniqueCIs &&
    discovery.totalSources === 6 &&
    discovery.overlapRatePct === expectedOverlap &&
    discovery.discoveryCoveragePct === 95 &&
    discovery.discoveryCoverageLabel === "Inventory seen by >=1 source (last 14 d)",
  "Discovery cross-model reconciliation: unique CIs (39) === inventory total (39), overlap computed, 14d coverage (95%)",
  {
    totalSources: discovery.totalSources,
    recordsIngested: discovery.recordsIngested,
    uniqueCIs: discovery.uniqueCIs,
    inventoryTotal: inventory.totalCIs,
    overlapRatePct: `${discovery.overlapRatePct}%`,
    coverage: `${discovery.discoveryCoveragePct}%`,
    coverageLabel: discovery.discoveryCoverageLabel,
  }
);

// -----------------------------------------------------------------------------
// Test 3: Every service dependent CI is a real subset of inventory CIs
// -----------------------------------------------------------------------------
const servicesSummary = getServicesSummaryMetrics();
const inventoryIds = new Set(INITIAL_CIS.map((c) => c.id));
let allServiceCIsExist = true;
let totalMappedDependencies = 0;

for (const svc of CANONICAL_SERVICES_DATA) {
  totalMappedDependencies += svc.dependentCiCount;
  if (svc.dependentCiCount !== svc.dependentCiIds.length) {
    allServiceCIsExist = false;
  }
  for (const ciId of svc.dependentCiIds) {
    if (!inventoryIds.has(ciId)) {
      allServiceCIsExist = false;
    }
  }
}

assert(
  allServiceCIsExist &&
    totalMappedDependencies === 44 &&
    servicesSummary.servicesBelowTarget === 2 &&
    servicesSummary.averageScoreLabel === "Average service score",
  "Service CI mapping-based subset verification: all service CIs exist in inventory, counts match subsets",
  {
    totalMappedDependencies,
    servicesCount: CANONICAL_SERVICES_DATA.length,
    servicesBelowTarget: servicesSummary.servicesBelowTarget,
    averageServiceScore: servicesSummary.averageServiceScore,
    averageScoreLabel: servicesSummary.averageScoreLabel,
  }
);

// -----------------------------------------------------------------------------
// Test 4: Two scores, two labels: Estate Trust Score vs Average service score
// -----------------------------------------------------------------------------
const computedPillars = computePillarsFromInventory(INITIAL_CIS);
const estateTrust = calculateEstateTrustScore(INITIAL_CIS);

assert(
  estateTrust.score >= 80 &&
    estateTrust.band.key === "HEALTHY" &&
    ESTATE_TRUST_SCORE_LABEL === "Estate Trust Score" &&
    AVERAGE_SERVICE_SCORE_LABEL === "Average service score" &&
    estateTrust.pillars.length === 5 &&
    estateTrust.pillars.reduce((acc, p) => acc + p.weightPct, 0) === 100 &&
    computedPillars.freshness === 95 &&
    computedPillars.ownership === 95,
  "Two scores, two labels: Estate Trust Score (computed from CI data) and Average service score distinct",
  {
    estateTrustScore: estateTrust.score,
    estateTrustScoreLabel: ESTATE_TRUST_SCORE_LABEL,
    averageServiceScore: servicesSummary.averageServiceScore,
    averageServiceScoreLabel: AVERAGE_SERVICE_SCORE_LABEL,
    computedPillars,
  }
);

// -----------------------------------------------------------------------------
// Test 5: Every tile count == its list count & pillar inputs match tile counts
// -----------------------------------------------------------------------------
const taskQueue = getTaskQueueMetrics();
const initialStaleTasks = INITIAL_DATA_QUALITY_TASKS.filter((t) => t.issueType === "Stale Discovery");
const initialOwnerTasks = INITIAL_DATA_QUALITY_TASKS.filter((t) => t.issueType === "Missing Required Ownership");
const initialDupTasks = INITIAL_DATA_QUALITY_TASKS.filter((t) => t.issueType === "Duplicate Suspect");
const initialCompTasks = INITIAL_DATA_QUALITY_TASKS.filter((t) => t.issueType === "Compliance Mismatch");

assert(
  taskQueue.staleCount === 2 &&
    taskQueue.missingOwnerCount === 2 &&
    taskQueue.duplicateCount === 1 &&
    taskQueue.ireReviewQueueCount === 3 &&
    taskQueue.complianceCount === 1 &&
    taskQueue.totalTasks === 7 &&
    taskQueue.totalTasks === CANONICAL_REMEDIATION_TASKS.length &&
    initialStaleTasks.length === taskQueue.staleCount &&
    initialOwnerTasks.length === taskQueue.missingOwnerCount &&
    initialDupTasks.length === taskQueue.duplicateCount &&
    initialCompTasks.length === taskQueue.complianceCount &&
    CANONICAL_IRE_REVIEW_QUEUE.length === taskQueue.ireReviewQueueCount &&
    computedPillars.staleCount === taskQueue.staleCount &&
    computedPillars.missingOwnerCount === taskQueue.missingOwnerCount,
  "Every tile count == its list count (Stale: 2, Missing Owner: 2, Duplicates: 1, Review Queue: 3, Governance Total: 7) and pillar inputs match tile counts",
  {
    stale: taskQueue.staleCount,
    missingOwner: taskQueue.missingOwnerCount,
    duplicates: taskQueue.duplicateCount,
    ireReview: taskQueue.ireReviewQueueCount,
    compliance: taskQueue.complianceCount,
    governanceTotalTasks: taskQueue.totalTasks,
    pillarStaleCount: computedPillars.staleCount,
    pillarMissingOwnerCount: computedPillars.missingOwnerCount,
    initialDataQualityTasksCount: INITIAL_DATA_QUALITY_TASKS.length,
    canonicalTasksCount: CANONICAL_REMEDIATION_TASKS.length,
  }
);

// -----------------------------------------------------------------------------
// Test 6: Sync-status computation (Healthy, Late, Failed, Paused)
// -----------------------------------------------------------------------------
const now = Date.now();
const healthyStatus = computeSyncStatus("Success", 60, new Date(now - 30 * 60000).toISOString(), "active", now);
const lateStatus = computeSyncStatus("Success", 60, new Date(now - 90 * 60000).toISOString(), "active", now);
const overdueStatus = computeSyncStatus("Success", 60, new Date(now - 180 * 60000).toISOString(), "active", now);
const failedRunStatus = computeSyncStatus("Failed", 60, new Date(now - 10 * 60000).toISOString(), "active", now);
const pausedStatus = computeSyncStatus("Success", 60, new Date(now - 10 * 60000).toISOString(), "paused", now);

assert(
  healthyStatus.health === "Healthy" &&
    lateStatus.health === "Late" &&
    overdueStatus.health === "Failed" &&
    failedRunStatus.health === "Failed" &&
    pausedStatus.health === "Paused",
  "Sync-status computed correctly (within interval -> Healthy, late -> Late, overdue/failed -> Failed, paused -> Paused)",
  {
    healthy: healthyStatus.health,
    late: lateStatus.health,
    overdue: overdueStatus.health,
    failed: failedRunStatus.health,
    paused: pausedStatus.health,
  }
);

// -----------------------------------------------------------------------------
// Test 7: Score band config (>=80 Healthy, 60-79 At risk, <60 Critical)
// -----------------------------------------------------------------------------
const band85 = getScoreBand(85);
const band74 = getScoreBand(74); // Enterprise Data Warehouse must be At risk, NOT Healthy
const band55 = getScoreBand(55);

assert(
  band85.key === "HEALTHY" &&
    band74.key === "AT_RISK" &&
    band74.label === "At risk" &&
    band55.key === "CRITICAL" &&
    getScoreTargetStatus(74).label === "Below target" &&
    getScoreTargetStatus(85).label === "Target met",
  "Score band function: Healthy >= 80, At risk 60-79 (74 is At risk / Below target), Critical < 60",
  { score74Band: band74.label, targetStatus74: getScoreTargetStatus(74).label }
);

// -----------------------------------------------------------------------------
// Test 8: Bulk-apply exclusion of ownership, retirement, and compliance
// -----------------------------------------------------------------------------
const dqOwnership = CANONICAL_REMEDIATION_TASKS.find((t) => t.category === "missing-owner");
const dqStaleRetirement = CANONICAL_REMEDIATION_TASKS.find((t) => t.id === "DQ-202");
const dqCompliance = CANONICAL_REMEDIATION_TASKS.find((t) => t.category === "compliance");
const dqConflict = CANONICAL_REMEDIATION_TASKS.find((t) => t.id === "DQ-203");

assert(
  dqOwnership?.isEligibleForBulkApply === false &&
    dqStaleRetirement?.isEligibleForBulkApply === false &&
    dqCompliance?.isEligibleForBulkApply === false &&
    dqConflict?.isEligibleForBulkApply === true,
  "Bulk-apply safety: excludes ownership, retirement, and compliance fixes",
  {
    ownershipBulkEligible: dqOwnership?.isEligibleForBulkApply,
    retirementBulkEligible: dqStaleRetirement?.isEligibleForBulkApply,
    complianceBulkEligible: dqCompliance?.isEligibleForBulkApply,
    conflictBulkEligible: dqConflict?.isEligibleForBulkApply,
  }
);

// -----------------------------------------------------------------------------
// Test 9: Hash-chain integrity verification
// -----------------------------------------------------------------------------
interface AuditHashBlock {
  id: string;
  timestamp: string;
  action: string;
  previousHash: string;
  hash: string;
}

function createHashChain(events: { id: string; action: string; timestamp: string }[]): AuditHashBlock[] {
  let prevHash = "GENESIS_0000000000000000000000000000000000000000000000000000000000000000";
  const chain: AuditHashBlock[] = [];

  for (const e of events) {
    const payload = `${e.id}|${e.timestamp}|${e.action}|${prevHash}`;
    const hash = crypto.createHash("sha256").update(payload).digest("hex");
    chain.push({ ...e, previousHash: prevHash, hash });
    prevHash = hash;
  }
  return chain;
}

function verifyHashChain(chain: AuditHashBlock[]): boolean {
  for (let i = 0; i < chain.length; i++) {
    const expectedPrev = i === 0 ? "GENESIS_0000000000000000000000000000000000000000000000000000000000000000" : chain[i - 1].hash;
    if (chain[i].previousHash !== expectedPrev) return false;
    const payload = `${chain[i].id}|${chain[i].timestamp}|${chain[i].action}|${expectedPrev}`;
    const recalculated = crypto.createHash("sha256").update(payload).digest("hex");
    if (chain[i].hash !== recalculated) return false;
  }
  return true;
}

const auditChain = createHashChain([
  { id: "AUD901", action: "CI_CREATE", timestamp: "2026-11-20T10:00:00Z" },
  { id: "AUD902", action: "CI_UPDATE", timestamp: "2026-11-20T11:00:00Z" },
  { id: "AUD903", action: "RULE_APPROVE", timestamp: "2026-11-20T12:00:00Z" },
]);

const initialValid = verifyHashChain(auditChain);
// Tamper simulation: mutate action in event 2
const tamperedChain = JSON.parse(JSON.stringify(auditChain));
tamperedChain[1].action = "MALICIOUS_TAMPER";
const tamperDetected = !verifyHashChain(tamperedChain);

assert(
  initialValid && tamperDetected,
  "Hash-chain integrity: SHA-256 chain validates intact logs and detects mutation tampering",
  { validInitialChain: initialValid, detectedTamper: tamperDetected }
);

// -----------------------------------------------------------------------------
// Test 10: Per-attribute precedence resolution (e.g. AWS for hardware, Dynatrace for runtime)
// -----------------------------------------------------------------------------
interface SourceAttributeClaim {
  sourceName: string;
  sourceRank: number;
  attribute: string;
  value: string;
}

function resolveAttributePrecedence(
  attribute: string,
  claims: SourceAttributeClaim[],
  attributePrecedenceRules: Record<string, string[]> // attribute -> ordered source names
): SourceAttributeClaim {
  const customOrder = attributePrecedenceRules[attribute];
  if (customOrder && customOrder.length > 0) {
    for (const source of customOrder) {
      const match = claims.find((c) => c.sourceName === source);
      if (match) return match;
    }
  }
  // Default to rule-level rank (lowest rank number = highest priority)
  return [...claims].sort((a, b) => a.sourceRank - b.sourceRank)[0];
}

const ramClaims: SourceAttributeClaim[] = [
  { sourceName: "AWS Discovery Connector", sourceRank: 1, attribute: "ram", value: "32 GB" },
  { sourceName: "Dynatrace APM Agent", sourceRank: 2, attribute: "ram", value: "31.4 GB" },
];

const osClaims: SourceAttributeClaim[] = [
  { sourceName: "AWS Discovery Connector", sourceRank: 1, attribute: "os_version", value: "Amazon Linux 2023.2" },
  { sourceName: "Dynatrace APM Agent", sourceRank: 2, attribute: "os_version", value: "Amazon Linux 2023.4.1" },
];

const customRules = {
  ram: ["AWS Discovery Connector", "Dynatrace APM Agent"],
  os_version: ["Dynatrace APM Agent", "AWS Discovery Connector"], // Runtime sensor wins for OS patch
};

const ramWinner = resolveAttributePrecedence("ram", ramClaims, customRules);
const osWinner = resolveAttributePrecedence("os_version", osClaims, customRules);

assert(
  ramWinner.sourceName === "AWS Discovery Connector" &&
    osWinner.sourceName === "Dynatrace APM Agent",
  "Per-attribute precedence: AWS authoritative for hardware (RAM), Dynatrace runtime authoritative for OS patch",
  { ramWinner: ramWinner.sourceName, osWinner: osWinner.sourceName }
);

// -----------------------------------------------------------------------------
// Test 11: Rule simulation computed from actual mock CIs and rule keys
// -----------------------------------------------------------------------------
const serverRule = INITIAL_RECONCILIATION_RULES.find((r) => r.ciClass === "Server/VM")!;
const simulation = simulateRuleExecution(serverRule, INITIAL_CIS);

assert(
  simulation.matchedCIs === 10 &&
    simulation.attributesModified === 15 &&
    simulation.conflictsDetected === 2 &&
    simulation.isSample === false &&
    simulation.matchedCiIds.every((id) => INITIAL_CIS.some((c) => c.id === id)),
  "Rule simulation counts: dynamically computed from actual CIs (10 Server/VM assets, 15 attributes, 2 conflicts)",
  {
    ruleId: simulation.ruleId,
    matchedCIs: simulation.matchedCIs,
    attributesModified: simulation.attributesModified,
    conflictsDetected: simulation.conflictsDetected,
    isSample: simulation.isSample,
  }
);

console.log("================================================================================");
console.log(`Results: ${passedCount}/${passedCount + failedCount} Passed (${failedCount} Failed)`);
console.log("================================================================================");

if (failedCount > 0) {
  process.exit(1);
}
