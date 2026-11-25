/**
 * Single CI Inventory Model (Phase 0, Item 0.1)
 *
 * One canonical inventory breakdown across classes with an "Uncategorized" bucket,
 * guaranteeing that class counts sum exactly to total CIs and percentages sum to 100%.
 */

import { CIItem } from "../../types/cmdb";

export interface ClassBreakdownItem {
  id: string;
  name: string;
  count: number;
  pct: number;
  color: string;
  strokeColor: string;
}

export interface InventoryMetrics {
  totalCIs: number;
  operationalCIs: number;
  nonOperationalCIs: number;
  byClass: ClassBreakdownItem[];
  classCountMap: Record<string, number>;
}

const CLASS_PALETTE: Record<string, { color: string; stroke: string; label: string }> = {
  Application: { color: "#3B82F6", stroke: "#2563EB", label: "Application" },
  Database: { color: "#10B981", stroke: "#059669", label: "Database" },
  "Server/VM": { color: "#F59E0B", stroke: "#D97706", label: "Server/VM" },
  Server: { color: "#F59E0B", stroke: "#D97706", label: "Server/VM" },
  "Container/Pod": { color: "#8B5CF6", stroke: "#7C3AED", label: "Container/Pod" },
  Container: { color: "#8B5CF6", stroke: "#7C3AED", label: "Container/Pod" },
  Network: { color: "#EC4899", stroke: "#DB2777", label: "Network" },
  Storage: { color: "#06B6D4", stroke: "#0891B2", label: "Storage" },
  Uncategorized: { color: "#64748B", stroke: "#475569", label: "Uncategorized" },
};

/**
 * Computes canonical inventory metrics from any array of CIs.
 */
export function getInventoryMetrics(cis: CIItem[]): InventoryMetrics {
  const totalCIs = cis.length;
  if (totalCIs === 0) {
    return {
      totalCIs: 0,
      operationalCIs: 0,
      nonOperationalCIs: 0,
      byClass: [],
      classCountMap: {},
    };
  }

  let operationalCIs = 0;
  let nonOperationalCIs = 0;
  const rawCounts: Record<string, number> = {
    Application: 0,
    Database: 0,
    "Server/VM": 0,
    "Container/Pod": 0,
    Network: 0,
    Storage: 0,
    Uncategorized: 0,
  };

  for (const ci of cis) {
    if (ci.operationalStatus === "Operational") {
      operationalCIs++;
    } else {
      nonOperationalCIs++;
    }

    const cls = String(ci.ciClass || "");
    if (cls === "Application") rawCounts["Application"]++;
    else if (cls === "Database") rawCounts["Database"]++;
    else if (cls === "Server/VM" || cls === "Server") rawCounts["Server/VM"]++;
    else if (cls === "Container/Pod" || cls === "Container") rawCounts["Container/Pod"]++;
    else if (cls === "Network" || cls === "Network Device" || cls.toLowerCase().includes("network")) rawCounts["Network"]++;
    else if (cls === "Storage" || cls.toLowerCase().includes("storage")) rawCounts["Storage"]++;
    else rawCounts["Uncategorized"]++;
  }

  // Calculate percentages guaranteeing sum == 100%
  const classKeys = Object.keys(rawCounts).filter((k) => rawCounts[k] > 0);
  // If nothing categorized, uncategorized = total
  if (classKeys.length === 0) {
    classKeys.push("Uncategorized");
    rawCounts["Uncategorized"] = totalCIs;
  }

  const items: ClassBreakdownItem[] = [];
  let allocatedPct = 0;

  for (let i = 0; i < classKeys.length; i++) {
    const key = classKeys[i];
    const count = rawCounts[key];
    const pal = CLASS_PALETTE[key] || CLASS_PALETTE["Uncategorized"];

    let pct: number;
    if (i === classKeys.length - 1) {
      // Last item absorbs any rounding difference to ensure sum is exactly 100%
      pct = Math.max(0, 100 - allocatedPct);
    } else {
      pct = Math.round((count / totalCIs) * 100);
      allocatedPct += pct;
    }

    items.push({
      id: key.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: pal.label || key,
      count,
      pct,
      color: pal.color,
      strokeColor: pal.stroke,
    });
  }

  return {
    totalCIs,
    operationalCIs,
    nonOperationalCIs,
    byClass: items,
    classCountMap: rawCounts,
  };
}
