import {
  CIRelationship,
  CIItem,
  ImpactAnalysisResult,
  ImpactAnalysisDependent,
  BlastRadiusWeights,
} from "../../types/cmdb";

export const DEFAULT_BLAST_RADIUS_WEIGHTS: BlastRadiusWeights = {
  baseScore: 20,
  dependentWeight: 8,
  tier0Weight: 25,
  tier1Weight: 25,
  tier2Weight: 15,
  minScore: 10,
  maxScore: 100,
};

export interface NormalizedDependencyEdge {
  dependentId: string; // The CI that depends on the provider (source)
  providerId: string;  // The CI that provides capability (target)
  relationship: CIRelationship;
  isBidirectional?: boolean;
}

/**
 * Normalizes edge direction based on the universal rule:
 * An edge means "source depends on target".
 * - "Depends on", "Hosted on", "Runs on", "Managed by": parent depends on child
 *   (e.g. A hosted on B => A depends on B; A managed by B => A depends on B)
 * - "Contains", "Provides to": child depends on parent (reverse direction)
 *   (e.g. A contains B => B depends on A; A provides to B => B depends on A)
 * - "Connects to": bidirectional (both directions)
 */
export function getNormalizedDependencies(rel: CIRelationship): NormalizedDependencyEdge[] {
  switch (rel.relationshipType) {
    case "Depends on":
    case "Hosted on":
    case "Runs on":
    case "Managed by":
      return [{ dependentId: rel.parentCiId, providerId: rel.childCiId, relationship: rel, isBidirectional: false }];
    case "Contains":
    case "Provides to":
      return [{ dependentId: rel.childCiId, providerId: rel.parentCiId, relationship: rel, isBidirectional: false }];
    case "Connects to":
      return [
        { dependentId: rel.parentCiId, providerId: rel.childCiId, relationship: rel, isBidirectional: true },
        { dependentId: rel.childCiId, providerId: rel.parentCiId, relationship: rel, isBidirectional: true },
      ];
    default:
      return [{ dependentId: rel.parentCiId, providerId: rel.childCiId, relationship: rel, isBidirectional: false }];
  }
}

/**
 * Cycle detection for dependency-type edges:
 * Runs only on the normalized dependency graph.
 * Does NOT flag "Connects to" (bidirectional) as a cycle.
 * Treats "Contains" using the reversed direction.
 */
export function detectDependencyCycle(
  candidateRel: Omit<CIRelationship, "id" | "createdAt">,
  existingRels: CIRelationship[]
): { hasCycle: boolean; cyclePath?: string[] } {
  // 1. "Connects to" is bidirectional by definition and must NOT be flagged as a cycle
  if (candidateRel.relationshipType === "Connects to") {
    return { hasCycle: false };
  }

  // 2. Identify the normalized dependency direction for candidateRel:
  let candidateDependent = candidateRel.parentCiId;
  let candidateProvider = candidateRel.childCiId;
  if (candidateRel.relationshipType === "Contains") {
    candidateDependent = candidateRel.childCiId;
    candidateProvider = candidateRel.parentCiId;
  }

  if (candidateDependent === candidateProvider) {
    return { hasCycle: true, cyclePath: [candidateDependent, candidateProvider] };
  }

  // Build adjacency list for existing normalized dependency edges (ignoring bidirectional "Connects to"):
  const adj = new Map<string, string[]>();
  for (const rel of existingRels) {
    if (rel.relationshipType === "Connects to") continue;
    const normEdges = getNormalizedDependencies(rel);
    for (const edge of normEdges) {
      if (edge.isBidirectional) continue;
      const list = adj.get(edge.dependentId) || [];
      list.push(edge.providerId);
      adj.set(edge.dependentId, list);
    }
  }

  // BFS from candidateProvider to candidateDependent:
  const queue: { current: string; path: string[] }[] = [{ current: candidateProvider, path: [candidateProvider] }];
  const visited = new Set<string>([candidateProvider]);

  while (queue.length > 0) {
    const { current, path } = queue.shift()!;
    if (current === candidateDependent) {
      return { hasCycle: true, cyclePath: [...path, candidateDependent] };
    }
    const neighbors = adj.get(current) || [];
    for (const nxt of neighbors) {
      if (!visited.has(nxt)) {
        visited.add(nxt);
        queue.push({ current: nxt, path: [...path, nxt] });
      }
    }
  }

  return { hasCycle: false };
}

/**
 * Pure, cycle-safe BFS traversal and blast radius risk calculator.
 * Operates on the normalized dependency graph.
 */
export function computeImpactAnalysis(
  ciId: string,
  cis: CIItem[],
  relationships: CIRelationship[],
  mode: "upstream" | "downstream" = "upstream",
  maxDepth = 6,
  weights: BlastRadiusWeights = DEFAULT_BLAST_RADIUS_WEIGHTS
): ImpactAnalysisResult | null {
  const target = cis.find((c) => c.id === ciId);
  if (!target) return null;

  // Build adjacency list according to normalized dependency direction:
  // Rule: "source depends on target" -> dependentId depends on providerId.
  // In Upstream mode (Change Impact): "If target changes/fails, who depends on it?"
  // Traversal direction: providerId -> dependentId (from target upward to dependent consumers)
  // In Downstream mode (Root Cause): "If target is degraded, what does it depend on?"
  // Traversal direction: dependentId -> providerId (from target downward to underlying infrastructure)
  const adj = new Map<string, { neighborId: string; relationship: CIRelationship }[]>();

  relationships.forEach((rel) => {
    // Only edges with status manual or discovered count.
    // Pending and stale edges are shown on canvas but excluded from blast radius calculations.
    if (rel.status === "pending-review" || rel.status === "pending" || rel.status === "stale") {
      return;
    }
    const normEdges = getNormalizedDependencies(rel);
    for (const norm of normEdges) {
      if (mode === "upstream") {
        const list = adj.get(norm.providerId) || [];
        list.push({ neighborId: norm.dependentId, relationship: rel });
        adj.set(norm.providerId, list);
      } else {
        const list = adj.get(norm.dependentId) || [];
        list.push({ neighborId: norm.providerId, relationship: rel });
        adj.set(norm.dependentId, list);
      }
    }
  });

  const queue: { ciId: string; depth: number; path: string[]; lastRel: CIRelationship }[] = [];
  const visited = new Set<string>();
  visited.add(ciId);

  const directNeighbors = adj.get(ciId) || [];
  for (const edge of directNeighbors) {
    if (!visited.has(edge.neighborId)) {
      visited.add(edge.neighborId);
      queue.push({
        ciId: edge.neighborId,
        depth: 1,
        path: [ciId, edge.neighborId],
        lastRel: edge.relationship,
      });
    }
  }

  const dependents: ImpactAnalysisDependent[] = [];

  while (queue.length > 0) {
    const item = queue.shift()!;
    const relatedCi = cis.find((c) => c.id === item.ciId);

    if (relatedCi) {
      const isTier0 = relatedCi.ciClass === "Business Service" || relatedCi.ciClass === "Service Offering";
      const isTier1 = relatedCi.businessCriticality.includes("Tier 1") || relatedCi.ciClass === "Application";
      const isTier2 =
        relatedCi.businessCriticality.includes("Tier 2") ||
        relatedCi.ciClass === "Container/Pod" ||
        relatedCi.ciClass === "Server/VM";

      let impactSeverity: "Severe" | "High" | "Moderate" | "Low" = "Moderate";
      if (isTier0 || isTier1) impactSeverity = "Severe";
      else if (isTier2) impactSeverity = "High";
      else if (relatedCi.businessCriticality.includes("Tier 3")) impactSeverity = "Moderate";
      else impactSeverity = "Low";

      dependents.push({
        ci: relatedCi,
        relationship: item.lastRel,
        depth: item.depth,
        path: item.path,
        impactSeverity,
      });

      if (item.depth < maxDepth) {
        const nextNeighbors = adj.get(item.ciId) || [];
        for (const nextEdge of nextNeighbors) {
          if (!visited.has(nextEdge.neighborId)) {
            visited.add(nextEdge.neighborId);
            queue.push({
              ciId: nextEdge.neighborId,
              depth: item.depth + 1,
              path: [...item.path, nextEdge.neighborId],
              lastRel: nextEdge.relationship,
            });
          }
        }
      }
    }
  }

  const affectedBusinessServices = dependents
    .map((d) => d.ci)
    .filter((c) => c.ciClass === "Business Service" || c.ciClass === "Service Offering");

  const tier0Count = affectedBusinessServices.length;
  const tier1Count = dependents.filter(
    (d) => d.ci.businessCriticality.includes("Tier 1") || d.ci.ciClass === "Application"
  ).length;
  const tier2Count = dependents.filter(
    (d) =>
      d.ci.businessCriticality.includes("Tier 2") ||
      d.ci.ciClass === "Container/Pod" ||
      d.ci.ciClass === "Server/VM"
  ).length;

  // Blast Radius Score Formula: min(100, 34 * number of Tier 0 services reached)
  const blastRadiusScore = Math.min(100, Math.round(34 * tier0Count));

  // Risk Level: >=75 SEVERE, >=40 HIGH, >0 MODERATE, 0 LOW
  let riskLevel: "Severe" | "High" | "Moderate" | "Low" = "Low";
  if (blastRadiusScore >= 75) riskLevel = "Severe";
  else if (blastRadiusScore >= 40) riskLevel = "High";
  else if (blastRadiusScore > 0) riskLevel = "Moderate";
  else riskLevel = "Low";

  // Revenue at risk: sum of revenue/hr of the Tier 0 services reached
  const revenueAtRisk = affectedBusinessServices.reduce((sum, svc) => {
    return sum + (typeof svc.revenuePerHour === "number" ? svc.revenuePerHour : 0);
  }, 0);
  const revenueAtRiskFormatted = `$${revenueAtRisk.toLocaleString()}/hr`;

  // Actual maximum hop count reached among affected business services (or all dependents)
  const actualHops =
    affectedBusinessServices.length > 0
      ? Math.max(
          ...dependents
            .filter((d) => affectedBusinessServices.some((s) => s.id === d.ci.id))
            .map((d) => d.depth)
        )
      : dependents.length > 0
      ? Math.max(...dependents.map((d) => d.depth))
      : 0;

  let riskExplanation = "";
  if (riskLevel === "Severe") {
    if (tier0Count > 0) {
      riskExplanation = `Severe risk: propagates to ${tier0Count} Tier 0 Business Service(s) ('${affectedBusinessServices
        .map((s) => s.name)
        .join("', '")}') within ${actualHops} hop${actualHops === 1 ? "" : "s"}.`;
    } else {
      riskExplanation = `Severe risk: high-density cascade across ${dependents.length} interconnected CIs.`;
    }
  } else if (riskLevel === "High") {
    riskExplanation = `High risk: propagates to ${tier0Count} Tier 0 Business Service(s) within ${actualHops} hop${actualHops === 1 ? "" : "s"}.`;
  } else if (riskLevel === "Moderate") {
    riskExplanation = `Moderate risk: propagates to ${tier0Count} Tier 0 Business Service(s) within ${actualHops} hop${actualHops === 1 ? "" : "s"}.`;
  } else {
    riskExplanation = `Low risk: minimal propagation to business services.`;
  }

  const impactedPaths = dependents.map((d) => ({
    ci: d.ci,
    depth: d.depth,
    path: d.path,
  }));

  const rootCauseCandidates = mode === "downstream" ? impactedPaths : undefined;

  return {
    targetCi: target,
    dependentCis: dependents,
    affectedBusinessServices,
    blastRadiusScore,
    riskLevel,
    riskExplanation,
    impactSummary: `${dependents.length} interconnected CIs directly/indirectly affected (${tier0Count} Tier 0 services, ${tier1Count} Tier 1 apps).`,
    revenueAtRisk,
    revenueAtRiskFormatted,
    impactedPaths,
    rootCauseCandidates,
  };
}

export interface NodeNeighborRelationship {
  ci: CIItem;
  relationship: CIRelationship;
  relType: string;
  status: string;
  criticality: string;
}

export interface NodeFocusRelationships {
  dependsOn: NodeNeighborRelationship[];
  usedBy: NodeNeighborRelationship[];
}

/**
 * Returns the incoming ("Used by") and outgoing ("Depends on") relationships for a node.
 */
export function getNodeRelationships(
  ciId: string,
  relationships: CIRelationship[],
  cis: CIItem[]
): NodeFocusRelationships {
  const dependsOn: NodeNeighborRelationship[] = [];
  const usedBy: NodeNeighborRelationship[] = [];

  for (const rel of relationships) {
    const normEdges = getNormalizedDependencies(rel);
    for (const norm of normEdges) {
      if (norm.dependentId === ciId) {
        // ciId depends on norm.providerId (outgoing dependency)
        const otherCi = cis.find((c) => c.id === norm.providerId);
        if (otherCi && !dependsOn.some((d) => d.ci.id === otherCi.id && d.relationship.id === rel.id)) {
          dependsOn.push({
            ci: otherCi,
            relationship: rel,
            relType: rel.relationshipType,
            status: rel.status || "manual",
            criticality: rel.criticalityWeight,
          });
        }
      } else if (norm.providerId === ciId) {
        // norm.dependentId depends on ciId (incoming dependent, i.e. used by)
        const otherCi = cis.find((c) => c.id === norm.dependentId);
        if (otherCi && !usedBy.some((u) => u.ci.id === otherCi.id && u.relationship.id === rel.id)) {
          usedBy.push({
            ci: otherCi,
            relationship: rel,
            relType: rel.relationshipType,
            status: rel.status || "manual",
            criticality: rel.criticalityWeight,
          });
        }
      }
    }
  }

  return { dependsOn, usedBy };
}
