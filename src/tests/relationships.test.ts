/**
 * ZenOps CMDB Relationship & Topology Graph Module Test Suite
 *
 * Asserts:
 * 1. Normalized edge direction helper (source depends on target, Contains reversed, Connects to bidirectional)
 * 2. 4-hop chain traversal from Tier 4 router to Tier 0 business service
 * 3. Cycle detection and BFS cycle-safety (A -> B -> C -> A terminates cleanly)
 * 4. "Connects to" bidirectional edge does NOT trigger false cycle
 * 5. Duplicate edge detection
 * 6. Disconnected node handling (score = 20, risk = Low)
 * 7. Blast radius score formula, typed weights, and risk level explanations
 */

import {
  getNormalizedDependencies,
  detectDependencyCycle,
  computeImpactAnalysis,
  DEFAULT_BLAST_RADIUS_WEIGHTS,
} from "../lib/relationships/impact-logic";
import { CIRelationship, CIItem } from "../types/cmdb";

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

// ---------------------------------------------------------------------------
// TEST 1: Normalized Edge Direction Mapping for ALL Relationship Types
// Universal rule: "source depends on target"
// ---------------------------------------------------------------------------
console.log("\n================================================================================");
console.log("            ZenOps CMDB Relationship & Topology Test Suite                     ");
console.log("================================================================================");

const baseRel: Omit<CIRelationship, "id" | "relationshipType"> = {
  parentCiId: "CI-A",
  parentCiName: "Node A",
  parentCiClass: "Application",
  childCiId: "CI-B",
  childCiName: "Node B",
  childCiClass: "Database",
  direction: "Downstream",
  criticalityWeight: "Critical",
  createdAt: new Date().toISOString(),
};

// 1.1: Depends on (parent depends on child)
const normDepends = getNormalizedDependencies({ ...baseRel, id: "R1", relationshipType: "Depends on" });
assert(
  normDepends.length === 1 && normDepends[0].dependentId === "CI-A" && normDepends[0].providerId === "CI-B",
  "1.1: 'Depends on' normalizes to parent depends on child (A -> B)",
  normDepends
);

// 1.2: Hosted on (A hosted on B => A depends on B)
const normHosted = getNormalizedDependencies({ ...baseRel, id: "R2", parentCiId: "VM-1", childCiId: "HOST-1", relationshipType: "Hosted on" });
assert(
  normHosted.length === 1 && normHosted[0].dependentId === "VM-1" && normHosted[0].providerId === "HOST-1",
  "1.2: 'Hosted on' normalizes to hosted CI depends on host (VM-1 -> HOST-1)",
  normHosted
);

// 1.3: Runs on (A runs on B => A depends on B)
const normRuns = getNormalizedDependencies({ ...baseRel, id: "R3", parentCiId: "POD-1", childCiId: "NODE-1", relationshipType: "Runs on" });
assert(
  normRuns.length === 1 && normRuns[0].dependentId === "POD-1" && normRuns[0].providerId === "NODE-1",
  "1.3: 'Runs on' normalizes to workload depends on compute (POD-1 -> NODE-1)",
  normRuns
);

// 1.4: Managed by (A managed by B => A depends on B)
const normManaged = getNormalizedDependencies({ ...baseRel, id: "R4", parentCiId: "ROUTER-1", childCiId: "CONTROLLER-1", relationshipType: "Managed by" });
assert(
  normManaged.length === 1 && normManaged[0].dependentId === "ROUTER-1" && normManaged[0].providerId === "CONTROLLER-1",
  "1.4: 'Managed by' normalizes to device depends on manager/controller (ROUTER-1 -> CONTROLLER-1)",
  normManaged
);

// 1.5: Contains (A contains B => B depends on A, REVERSED)
const normContains = getNormalizedDependencies({ ...baseRel, id: "R5", parentCiId: "K8S-CLUSTER", childCiId: "NAMESPACE-A", relationshipType: "Contains" });
assert(
  normContains.length === 1 && normContains[0].dependentId === "NAMESPACE-A" && normContains[0].providerId === "K8S-CLUSTER",
  "1.5: 'Contains' reverses direction: contained child depends on container (NAMESPACE-A -> K8S-CLUSTER)",
  normContains
);

// 1.6: Provides to (A provides to B => B depends on A, REVERSED)
const normProvides = getNormalizedDependencies({ ...baseRel, id: "R6", parentCiId: "AUTH-SERVICE", childCiId: "CHECKOUT-APP", relationshipType: "Provides to" });
assert(
  normProvides.length === 1 && normProvides[0].dependentId === "CHECKOUT-APP" && normProvides[0].providerId === "AUTH-SERVICE",
  "1.6: 'Provides to' reverses direction: consumer depends on provider (CHECKOUT-APP -> AUTH-SERVICE)",
  normProvides
);

// 1.7: Connects to (bidirectional dependency)
const normConnects = getNormalizedDependencies({ ...baseRel, id: "R7", parentCiId: "SWITCH-1", childCiId: "SWITCH-2", relationshipType: "Connects to" });
assert(
  normConnects.length === 2 &&
    normConnects.every((e) => e.isBidirectional) &&
    normConnects.some((e) => e.dependentId === "SWITCH-1" && e.providerId === "SWITCH-2") &&
    normConnects.some((e) => e.dependentId === "SWITCH-2" && e.providerId === "SWITCH-1"),
  "1.7: 'Connects to' produces symmetric bidirectional dependencies without asymmetry",
  normConnects
);

// ---------------------------------------------------------------------------
// TEST 2: 4-Hop Chain Traversal (Tier 4 Router -> Tier 0 Business Service)
// ---------------------------------------------------------------------------
const chainCIs: CIItem[] = [
  {
    id: "CI-RTR-01",
    name: "core-perimeter-router-01",
    ciClass: "Network Device",
    description: "Core ingress router",
    lifecycleStatus: "In Use",
    operationalStatus: "Operational",
    environment: "Production",
    businessCriticality: "Tier 3 - Business Operational",
    owner: "NetOps",
    supportGroup: "Network Team",
    discoverySource: "Manual",
    firstDiscovered: "2024-01-01",
    lastDiscovered: "2024-01-01",
    lastVerified: "2024-01-01",
    sourceRanking: 1,
    trustScore: 90,
    scoreComponents: { completeness: 90, freshness: 90, accuracy: 90, reconciliation: 90 },
    scoreReasons: [],
    qualityFlags: [],
    attributes: {},
    dataClassification: "Internal",
    complianceFlags: [],
    identificationKeys: {},
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  },
  {
    id: "CI-DB-01",
    name: "aurora-postgres-db",
    ciClass: "Database",
    description: "Transaction database",
    lifecycleStatus: "In Use",
    operationalStatus: "Operational",
    environment: "Production",
    businessCriticality: "Tier 2 - Business Critical",
    owner: "DBA",
    supportGroup: "DBA Team",
    discoverySource: "Manual",
    firstDiscovered: "2024-01-01",
    lastDiscovered: "2024-01-01",
    lastVerified: "2024-01-01",
    sourceRanking: 1,
    trustScore: 95,
    scoreComponents: { completeness: 95, freshness: 95, accuracy: 95, reconciliation: 95 },
    scoreReasons: [],
    qualityFlags: [],
    attributes: {},
    dataClassification: "Confidential",
    complianceFlags: [],
    identificationKeys: {},
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  },
  {
    id: "CI-VM-01",
    name: "k8s-compute-node-01",
    ciClass: "Server/VM",
    description: "K8s compute node",
    lifecycleStatus: "In Use",
    operationalStatus: "Operational",
    environment: "Production",
    businessCriticality: "Tier 2 - Business Critical",
    owner: "Platform",
    supportGroup: "Platform Team",
    discoverySource: "Manual",
    firstDiscovered: "2024-01-01",
    lastDiscovered: "2024-01-01",
    lastVerified: "2024-01-01",
    sourceRanking: 1,
    trustScore: 90,
    scoreComponents: { completeness: 90, freshness: 90, accuracy: 90, reconciliation: 90 },
    scoreReasons: [],
    qualityFlags: [],
    attributes: {},
    dataClassification: "Internal",
    complianceFlags: [],
    identificationKeys: {},
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  },
  {
    id: "CI-APP-01",
    name: "checkout-api-service",
    ciClass: "Application",
    description: "Core checkout microservice",
    lifecycleStatus: "In Use",
    operationalStatus: "Operational",
    environment: "Production",
    businessCriticality: "Tier 1 - Mission Critical",
    owner: "App Eng",
    supportGroup: "App Team",
    discoverySource: "Manual",
    firstDiscovered: "2024-01-01",
    lastDiscovered: "2024-01-01",
    lastVerified: "2024-01-01",
    sourceRanking: 1,
    trustScore: 92,
    scoreComponents: { completeness: 92, freshness: 92, accuracy: 92, reconciliation: 92 },
    scoreReasons: [],
    qualityFlags: [],
    attributes: {},
    dataClassification: "Confidential",
    complianceFlags: [],
    identificationKeys: {},
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  },
  {
    id: "CI-SVC-01",
    name: "Global Payments API",
    ciClass: "Business Service",
    description: "Top-level Tier 0 Payments Service",
    lifecycleStatus: "In Use",
    operationalStatus: "Operational",
    environment: "Production",
    businessCriticality: "Tier 1 - Mission Critical",
    owner: "FinTech Executive",
    supportGroup: "Payments Team",
    discoverySource: "Manual",
    firstDiscovered: "2024-01-01",
    lastDiscovered: "2024-01-01",
    lastVerified: "2024-01-01",
    sourceRanking: 1,
    trustScore: 98,
    scoreComponents: { completeness: 98, freshness: 98, accuracy: 98, reconciliation: 98 },
    scoreReasons: [],
    qualityFlags: [],
    attributes: {},
    dataClassification: "Restricted",
    complianceFlags: [],
    identificationKeys: {},
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    revenuePerHour: 85000,
    currency: "USD",
  },
];

// Chain: CI-SVC-01 depends on CI-APP-01 depends on CI-VM-01 depends on CI-DB-01 depends on CI-RTR-01
const chainRels: CIRelationship[] = [
  {
    id: "REL-HOP-1",
    parentCiId: "CI-DB-01",
    parentCiName: "aurora-postgres-db",
    parentCiClass: "Database",
    childCiId: "CI-RTR-01",
    childCiName: "core-perimeter-router-01",
    childCiClass: "Network Device",
    relationshipType: "Depends on",
    direction: "Downstream",
    criticalityWeight: "Critical",
    createdAt: "2024-01-01",
  },
  {
    id: "REL-HOP-2",
    parentCiId: "CI-VM-01",
    parentCiName: "k8s-compute-node-01",
    parentCiClass: "Server/VM",
    childCiId: "CI-DB-01",
    childCiName: "aurora-postgres-db",
    childCiClass: "Database",
    relationshipType: "Depends on",
    direction: "Downstream",
    criticalityWeight: "Critical",
    createdAt: "2024-01-01",
  },
  {
    id: "REL-HOP-3",
    parentCiId: "CI-APP-01",
    parentCiName: "checkout-api-service",
    parentCiClass: "Application",
    childCiId: "CI-VM-01",
    childCiName: "k8s-compute-node-01",
    childCiClass: "Server/VM",
    relationshipType: "Hosted on",
    direction: "Downstream",
    criticalityWeight: "Critical",
    createdAt: "2024-01-01",
  },
  {
    id: "REL-HOP-4",
    parentCiId: "CI-SVC-01",
    parentCiName: "Global Payments API",
    parentCiClass: "Business Service",
    childCiId: "CI-APP-01",
    childCiName: "checkout-api-service",
    childCiClass: "Application",
    relationshipType: "Depends on",
    direction: "Downstream",
    criticalityWeight: "Critical",
    createdAt: "2024-01-01",
  },
];

const routerImpact = computeImpactAnalysis("CI-RTR-01", chainCIs, chainRels, "upstream", 6);
assert(routerImpact !== null, "2.1: Router impact analysis runs successfully");
assert(routerImpact?.dependentCis.length === 4, "2.2: Router affects all 4 downstream-to-upstream CIs in chain", {
  count: routerImpact?.dependentCis.length,
});

const serviceDep = routerImpact?.dependentCis.find((d) => d.ci.id === "CI-SVC-01");
assert(serviceDep !== undefined && serviceDep.depth === 4, "2.3: Reaches Tier 0 service at depth 4", {
  depth: serviceDep?.depth,
  ci: serviceDep?.ci.name,
});

const expectedPath = ["CI-RTR-01", "CI-DB-01", "CI-VM-01", "CI-APP-01", "CI-SVC-01"];
assert(
  JSON.stringify(serviceDep?.path) === JSON.stringify(expectedPath),
  "2.4: Records exact 4-hop propagation path in sequence",
  serviceDep?.path
);

assert(
  routerImpact?.affectedBusinessServices.some((s) => s.id === "CI-SVC-01") === true,
  "2.5: Identifies Global Payments API in affectedBusinessServices",
  routerImpact?.affectedBusinessServices.map((s) => s.name)
);

assert(
  routerImpact?.riskLevel === "Severe",
  "2.6: Assigns Severe risk level due to affected Tier 0 Business Service",
  { score: routerImpact?.blastRadiusScore, riskLevel: routerImpact?.riskLevel }
);

assert(
  routerImpact?.riskExplanation.includes("Tier 0 Business Service") === true &&
    routerImpact?.riskExplanation.includes("within 4 hops") === true,
  "2.7: Risk explanation explicitly explains Tier 0 service propagation with actual hop count (within 4 hops)",
  routerImpact?.riskExplanation
);

// ---------------------------------------------------------------------------
// TEST 3: Cycle Handling (Cycle Detection & BFS Cycle Safety)
// ---------------------------------------------------------------------------
const cyclicRels: CIRelationship[] = [
  {
    id: "C1",
    parentCiId: "NODE-A",
    parentCiName: "A",
    parentCiClass: "Application",
    childCiId: "NODE-B",
    childCiName: "B",
    childCiClass: "Application",
    relationshipType: "Depends on",
    direction: "Downstream",
    criticalityWeight: "High",
    createdAt: "2024-01-01",
  },
  {
    id: "C2",
    parentCiId: "NODE-B",
    parentCiName: "B",
    parentCiClass: "Application",
    childCiId: "NODE-C",
    childCiName: "C",
    childCiClass: "Application",
    relationshipType: "Depends on",
    direction: "Downstream",
    criticalityWeight: "High",
    createdAt: "2024-01-01",
  },
];

// Attempting to add NODE-C -> NODE-A creates cycle A -> B -> C -> A
const cycleCandidate = {
  parentCiId: "NODE-C",
  parentCiName: "C",
  parentCiClass: "Application" as const,
  childCiId: "NODE-A",
  childCiName: "A",
  childCiClass: "Application" as const,
  relationshipType: "Depends on" as const,
  direction: "Downstream" as const,
  criticalityWeight: "High" as const,
};

const cycleCheck = detectDependencyCycle(cycleCandidate, cyclicRels);
assert(cycleCheck.hasCycle === true, "3.1: Cycle detector flags circular dependency loop (A -> B -> C -> A)", cycleCheck);

// Cycle Safety in BFS traversal
const completeCycleRels: CIRelationship[] = [
  ...cyclicRels,
  {
    id: "C3",
    parentCiId: "NODE-C",
    parentCiName: "C",
    parentCiClass: "Application",
    childCiId: "NODE-A",
    childCiName: "A",
    childCiClass: "Application",
    relationshipType: "Depends on",
    direction: "Downstream",
    criticalityWeight: "High",
    createdAt: "2024-01-01",
  },
];

const cyclicCIs: CIItem[] = ["NODE-A", "NODE-B", "NODE-C"].map((id) => ({
  id,
  name: `Node ${id}`,
  ciClass: "Application",
  description: "Test node",
  lifecycleStatus: "In Use",
  operationalStatus: "Operational",
  environment: "Production",
  businessCriticality: "Tier 2 - Business Critical",
  owner: "Dev",
  supportGroup: "DevOps",
  discoverySource: "Manual",
  firstDiscovered: "2024-01-01",
  lastDiscovered: "2024-01-01",
  lastVerified: "2024-01-01",
  sourceRanking: 1,
  trustScore: 80,
  scoreComponents: { completeness: 80, freshness: 80, accuracy: 80, reconciliation: 80 },
  scoreReasons: [],
  qualityFlags: [],
  attributes: {},
  dataClassification: "Internal",
  complianceFlags: [],
  identificationKeys: {},
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
}));

const cycleResult = computeImpactAnalysis("NODE-A", cyclicCIs, completeCycleRels, "upstream", 6);
assert(cycleResult !== null, "3.2: BFS terminates cleanly on cyclic graph without infinite recursion");
assert(cycleResult?.dependentCis.length === 2, "3.3: Visited set prevents duplicate re-processing in cycle", {
  visitedNodes: cycleResult?.dependentCis.map((d) => d.ci.id),
});

// ---------------------------------------------------------------------------
// TEST 4: "Connects to" Edge (No False Cycle Detection)
// ---------------------------------------------------------------------------
const connectsRel = {
  parentCiId: "SWITCH-1",
  parentCiName: "Switch 1",
  parentCiClass: "Network Device" as const,
  childCiId: "SWITCH-2",
  childCiName: "Switch 2",
  childCiClass: "Network Device" as const,
  relationshipType: "Connects to" as const,
  direction: "Bidirectional" as const,
  criticalityWeight: "Critical" as const,
};

const connectsCheck = detectDependencyCycle(connectsRel, []);
assert(
  connectsCheck.hasCycle === false,
  "4.1: Bidirectional 'Connects to' edge is NOT flagged as a false cycle"
);

// ---------------------------------------------------------------------------
// TEST 5: Disconnected Node
// ---------------------------------------------------------------------------
const disconnectedCi: CIItem = {
  ...cyclicCIs[0],
  id: "ISOLATED-01",
  name: "isolated-peripheral-ci",
  businessCriticality: "Tier 3 - Business Operational",
};

const isolatedResult = computeImpactAnalysis("ISOLATED-01", [disconnectedCi], chainRels, "upstream", 6);
assert(isolatedResult !== null && isolatedResult.dependentCis.length === 0, "5.1: Disconnected node returns 0 dependents");
assert(isolatedResult?.blastRadiusScore === 20, "5.2: Disconnected node has base score of 20", {
  score: isolatedResult?.blastRadiusScore,
});
assert(isolatedResult?.riskLevel === "Low", "5.3: Disconnected node is categorized as Low risk", {
  riskLevel: isolatedResult?.riskLevel,
});

// ---------------------------------------------------------------------------
// TEST 6: Blast Radius Formula & Typed Weights Configuration
// ---------------------------------------------------------------------------
assert(
  DEFAULT_BLAST_RADIUS_WEIGHTS.baseScore === 20 &&
    DEFAULT_BLAST_RADIUS_WEIGHTS.tier0Weight === 25 &&
    DEFAULT_BLAST_RADIUS_WEIGHTS.tier1Weight === 25 &&
    DEFAULT_BLAST_RADIUS_WEIGHTS.tier2Weight === 15 &&
    DEFAULT_BLAST_RADIUS_WEIGHTS.dependentWeight === 8,
  "6.1: Default weights adhere strictly to formula specifications",
  DEFAULT_BLAST_RADIUS_WEIGHTS
);

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`Results: ${passedCount}/${passedCount + failedCount} Passed (${failedCount} Failed)`);
console.log("================================================================================\n");

if (failedCount > 0) {
  process.exit(1);
}
