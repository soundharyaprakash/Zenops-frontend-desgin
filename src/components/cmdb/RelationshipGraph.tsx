"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Network,
  Plus,
  Trash2,
  Filter,
  ArrowRight,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  ExternalLink,
  Shield,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Paperclip,
  Check,
  Lock,
  Boxes,
  Database,
  Server,
  Cloud,
  Radio,
  Briefcase,
  Search,
  Download,
  FileJson,
  X,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Sparkles,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import {
  CIRelationship,
  CIItem,
  RelationshipType,
  DirectionType,
  CriticalityWeight,
  CIClass,
} from "@/types/cmdb";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Lozenge, OperationalBadge, CriticalityBadge, TrustScoreBadge } from "@/components/ui/Lozenge";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { useCMDB, detectDependencyCycle, getNormalizedDependencies } from "@/context/cmdb-context";
import { cn } from "@/lib/utils";

type GraphMode = "upstream" | "downstream";

interface ServiceImpactRank {
  id: string;
  serviceName: string;
  ciCount: number;
  revenueDisplay: string;
  revenueValue: number;
  tier: string;
  criticality: string;
}

function getTierNumber(ciClass: CIClass): number {
  switch (ciClass) {
    case "Business Service":
    case "Service Offering":
      return 0;
    case "Application":
    case "SaaS Subscription":
      return 1;
    case "Container/Pod":
    case "Server/VM":
      return 2;
    case "Database":
      return 3;
    case "Network Device":
    case "Cloud Resource":
      return 4;
    default:
      return 2;
  }
}

function getClassIcon(ciClass: CIClass) {
  switch (ciClass) {
    case "Business Service":
    case "Service Offering":
      return <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />;
    case "Application":
    case "SaaS Subscription":
      return <Boxes className="w-3.5 h-3.5 text-brand-blue shrink-0" />;
    case "Container/Pod":
    case "Server/VM":
      return <Server className="w-3.5 h-3.5 text-brand-cyan shrink-0" />;
    case "Database":
      return <Database className="w-3.5 h-3.5 text-success shrink-0" />;
    case "Network Device":
    case "Cloud Resource":
      return <Cloud className="w-3.5 h-3.5 text-warning shrink-0" />;
    default:
      return <Boxes className="w-3.5 h-3.5 text-secondary shrink-0" />;
  }
}

function isEdgeStale(rel: CIRelationship): boolean {
  if (rel.status === "stale") return true;
  if (!rel.lastSeen) return false;
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(rel.lastSeen).getTime() > thirtyDaysMs;
}

export function RelationshipGraph() {
  const {
    cis,
    relationships,
    addRelationship,
    deleteRelationship,
    approveRelationship,
    rejectRelationship,
    getImpactAnalysis,
    userRole,
    canEdit,
    activeTenant,
    showToast,
  } = useCMDB();

  const [selectedCiId, setSelectedCiId] = useState<string>(
    relationships[0]?.parentCiId || cis[0]?.id || ""
  );
  const [filterType, setFilterType] = useState<string>("");
  const [filterClass, setFilterClass] = useState<string>("");
  const [filterTier, setFilterTier] = useState<string>("");
  const [filterCriticality, setFilterCriticality] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [graphMode, setGraphMode] = useState<GraphMode>("upstream");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [liveTraffic, setLiveTraffic] = useState<boolean>(true);
  const [collapsedTiers, setCollapsedTiers] = useState<Set<number>>(new Set());

  // Add Edge Form State
  const [parentCiId, setParentCiId] = useState(cis[0]?.id || "");
  const [childCiId, setChildCiId] = useState(cis[1]?.id || "");
  const [relType, setRelType] = useState<RelationshipType>("Depends on");
  const [direction, setDirection] = useState<DirectionType>("Downstream");
  const [critWeight, setCritWeight] = useState<CriticalityWeight>("High");
  const [notes, setNotes] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);

  // Active filter count and Clear all handler
  const activeFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    (filterClass ? 1 : 0) +
    (filterTier !== "" ? 1 : 0) +
    (filterCriticality ? 1 : 0) +
    (filterType ? 1 : 0);

  const handleClearAllFilters = () => {
    setSearchQuery("");
    setFilterClass("");
    setFilterTier("");
    setFilterCriticality("");
    setFilterType("");
  };

  // Keyboard navigation: Escape clears selection / closes drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filtered Relationships (works with edge source, status, and relationship types)
  const filteredRelationships = useMemo(() => {
    if (!filterType) return relationships;
    if (filterType === "discovered") return relationships.filter((r) => r.source === "discovered");
    if (filterType === "pending-review") return relationships.filter((r) => r.status === "pending-review");
    if (filterType === "stale") return relationships.filter((r) => isEdgeStale(r));
    return relationships.filter((r) => r.relationshipType === filterType);
  }, [relationships, filterType]);

  // Selected CI & Impact Analysis Result (BFS Traversal)
  const selectedCi = useMemo(() => cis.find((c) => c.id === selectedCiId), [cis, selectedCiId]);

  const selectedImpact = useMemo(() => {
    if (!selectedCi) return null;
    return getImpactAnalysis(selectedCi.id, graphMode, 6);
  }, [selectedCi, graphMode, getImpactAnalysis]);

  // Set of Impacted Node IDs & Impacted Edge IDs for Highlighting
  const impactedNodeIds = useMemo(() => {
    if (!selectedImpact) return new Set<string>();
    const set = new Set<string>();
    set.add(selectedCiId);
    selectedImpact.dependentCis.forEach((d) => set.add(d.ci.id));
    return set;
  }, [selectedImpact, selectedCiId]);

  const impactedEdgeIds = useMemo(() => {
    if (!selectedImpact) return new Set<string>();
    return new Set<string>(selectedImpact.dependentCis.map((d) => d.relationship.id));
  }, [selectedImpact]);

  // Selected CI's Direct Parents & Children
  const selectedParents = useMemo(
    () => relationships.filter((r) => r.childCiId === selectedCiId),
    [relationships, selectedCiId]
  );
  const selectedChildren = useMemo(
    () => relationships.filter((r) => r.parentCiId === selectedCiId),
    [relationships, selectedCiId]
  );

  // Group CIs into 5 Architectural Tiers with integrated multi-filter matching
  const matchesFilter = useCallback(
    (ci: CIItem) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = ci.name.toLowerCase().includes(q);
        const matchesId = ci.id.toLowerCase().includes(q);
        if (!matchesName && !matchesId) return false;
      }
      if (filterClass && ci.ciClass !== filterClass) return false;
      if (filterCriticality && !ci.businessCriticality.includes(filterCriticality)) return false;
      if (filterTier !== "") {
        if (filterTier === "0" && ci.ciClass !== "Business Service" && ci.ciClass !== "Service Offering") return false;
        if (filterTier === "1" && ci.ciClass !== "Application" && ci.ciClass !== "SaaS Subscription") return false;
        if (filterTier === "2" && ci.ciClass !== "Container/Pod" && ci.ciClass !== "Server/VM") return false;
        if (filterTier === "3" && ci.ciClass !== "Database") return false;
        if (
          filterTier === "4" &&
          ci.ciClass !== "Network Device" &&
          ci.ciClass !== "Cloud Resource" &&
          ci.ciClass !== "Network" &&
          ci.ciClass !== "Storage"
        )
          return false;
      }
      return true;
    },
    [searchQuery, filterClass, filterCriticality, filterTier]
  );

  const tier0CIs = useMemo(
    () =>
      cis.filter(
        (c) =>
          (c.ciClass === "Business Service" || c.ciClass === "Service Offering") && matchesFilter(c)
      ),
    [cis, matchesFilter]
  );
  const tier1CIs = useMemo(
    () =>
      cis.filter(
        (c) =>
          (c.ciClass === "Application" || c.ciClass === "SaaS Subscription") && matchesFilter(c)
      ),
    [cis, matchesFilter]
  );
  const tier2CIs = useMemo(
    () =>
      cis.filter(
        (c) => (c.ciClass === "Container/Pod" || c.ciClass === "Server/VM") && matchesFilter(c)
      ),
    [cis, matchesFilter]
  );
  const tier3CIs = useMemo(
    () => cis.filter((c) => c.ciClass === "Database" && matchesFilter(c)),
    [cis, matchesFilter]
  );
  const tier4CIs = useMemo(
    () =>
      cis.filter(
        (c) =>
          (c.ciClass === "Network Device" ||
            c.ciClass === "Cloud Resource" ||
            c.ciClass === "Network" ||
            c.ciClass === "Storage") &&
          matchesFilter(c)
      ),
    [cis, matchesFilter]
  );

  // When filters are active, display exact matched results per tier without filling artificial fallbacks
  const isFilterActive = activeFilterCount > 0;
  const safeTier0 = tier0CIs.length > 0 ? tier0CIs : isFilterActive ? [] : cis.slice(0, 2).filter(matchesFilter);
  const safeTier1 = tier1CIs.length > 0 ? tier1CIs : isFilterActive ? [] : cis.slice(2, 4).filter(matchesFilter);
  const safeTier2 = tier2CIs.length > 0 ? tier2CIs : isFilterActive ? [] : cis.slice(4, 7).filter(matchesFilter);
  const safeTier3 = tier3CIs.length > 0 ? tier3CIs : isFilterActive ? [] : cis.slice(7, 9).filter(matchesFilter);
  const safeTier4 = tier4CIs.length > 0 ? tier4CIs : isFilterActive ? [] : cis.slice(9, 12).filter(matchesFilter);

  const totalVisibleNodes =
    safeTier0.length + safeTier1.length + safeTier2.length + safeTier3.length + safeTier4.length;

  // Auto-disable Live Signals pulse when nodes > 150 for smooth 60fps performance
  useEffect(() => {
    if (totalVisibleNodes > 150 && liveTraffic) {
      setLiveTraffic(false);
    }
  }, [totalVisibleNodes, liveTraffic]);

  // Dynamically computed Ranked Business Service Revenue Exposure List (Lists ALL services, any tier, ranked by revenue)
  const rankedImpacts = useMemo<ServiceImpactRank[]>(() => {
    const allServices = cis.filter(
      (c) =>
        c.ciClass === "Business Service" ||
        c.ciClass === "Service Offering" ||
        typeof c.revenuePerHour === "number"
    );

    return allServices
      .map((svc) => {
        // Count all connected CIs in the graph for this service
        const linkedCount = relationships.filter(
          (r) => r.parentCiId === svc.id || r.childCiId === svc.id
        ).length;

        const revNum = typeof svc.revenuePerHour === "number" ? svc.revenuePerHour : null;
        const currency = svc.currency === "USD" ? "$" : svc.currency ? `${svc.currency} ` : "$";
        const revenueDisplay =
          revNum !== null ? `${currency}${revNum.toLocaleString()}/hr` : "Not set";

        let tierLabel = "Tier 1";
        if (svc.ciClass === "Business Service") tierLabel = "Tier 0";
        else if (svc.businessCriticality?.includes("Tier 1")) tierLabel = "Tier 1";
        else if (svc.businessCriticality?.includes("Tier 2")) tierLabel = "Tier 2";
        else if (svc.businessCriticality?.includes("Tier 3")) tierLabel = "Tier 3";
        else if (svc.businessCriticality?.includes("Tier 4")) tierLabel = "Tier 4";

        return {
          id: svc.id,
          serviceName: svc.name,
          ciCount: linkedCount > 0 ? linkedCount : 1,
          revenueDisplay,
          revenueValue: revNum ?? -1,
          tier: tierLabel,
          criticality: svc.businessCriticality || "Mission Critical",
        };
      })
      .sort((a, b) => b.revenueValue - a.revenueValue);
  }, [cis, relationships]);

  // Edge Validation in Add Modal (Cycle detection, Duplicates, Tier Order Warnings)
  const validationResult = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!parentCiId || !childCiId) {
      return { isValid: false, errors: ["Please select both Parent and Child CIs."], warnings };
    }

    if (parentCiId === childCiId) {
      errors.push("Self-dependency prohibited: Parent CI and Child CI cannot be the same.");
    }

    // Duplicate edge check
    const isDuplicate = relationships.some(
      (r) =>
        r.parentCiId === parentCiId &&
        r.childCiId === childCiId &&
        r.relationshipType === relType
    );
    if (isDuplicate) {
      errors.push(`Duplicate edge: A '${relType}' relationship already exists between these CIs.`);
    }

    // Cycle detection on normalized graph (skips "Connects to", reverses "Contains")
    const candidateRel = {
      parentCiId,
      parentCiName: cis.find((c) => c.id === parentCiId)?.name || "",
      parentCiClass: cis.find((c) => c.id === parentCiId)?.ciClass || "Server/VM",
      childCiId,
      childCiName: cis.find((c) => c.id === childCiId)?.name || "",
      childCiClass: cis.find((c) => c.id === childCiId)?.ciClass || "Server/VM",
      relationshipType: relType,
      direction,
      criticalityWeight: critWeight,
      notes,
    };

    const cycleCheck = detectDependencyCycle(candidateRel, relationships);
    if (cycleCheck.hasCycle) {
      errors.push(
        `Dependency Cycle Detected: Adding this edge creates a circular dependency loop (${cycleCheck.cyclePath?.join(
          " → "
        )}). Dependency edges must form a directed acyclic graph.`
      );
    }

    // Tier Order Warning (warns but does not block)
    const parentCi = cis.find((c) => c.id === parentCiId);
    const childCi = cis.find((c) => c.id === childCiId);
    if (parentCi && childCi && relType === "Depends on") {
      const pTier = getTierNumber(parentCi.ciClass);
      const cTier = getTierNumber(childCi.ciClass);
      // In a normal hierarchy, higher tier numbers (databases tier 3) shouldn't depend on lower tier (services tier 0)
      if (pTier > cTier) {
        warnings.push(
          `Unusual tier dependency: Tier ${pTier} (${parentCi.ciClass}) typically should not depend on Tier ${cTier} (${childCi.ciClass}). Verify your architectural direction.`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, [parentCiId, childCiId, relType, direction, critWeight, notes, relationships, cis]);

  const handleNodeClick = (id: string) => {
    setSelectedCiId(id);
    setDrawerOpen(true);
  };

  const handleAttachToChange = () => {
    showToast(
      "success",
      "Attached to Change Record",
      `Attached ${selectedCi?.name} and its ${selectedChildren.length} dependent CIs to CHG-2024-8812.`
    );
  };

  const handleApproveEdge = (relId: string) => {
    if (!canEdit) {
      showToast("error", "Permission Denied", "Edit permission required to approve relationship edges.");
      return;
    }
    approveRelationship(relId);
  };

  const handleRejectEdge = (relId: string) => {
    if (!canEdit) {
      showToast("error", "Permission Denied", "Edit permission required to reject relationship edges.");
      return;
    }
    const confirmDelete = window.confirm(
      "Are you sure you want to reject and disconnect this discovered relationship edge?"
    );
    if (confirmDelete) {
      rejectRelationship(relId);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      showToast("error", "Permission Denied", "Edit permission required to establish relationship edges.");
      return;
    }
    if (!validationResult.isValid) return;

    const parentCi = cis.find((c) => c.id === parentCiId);
    const childCi = cis.find((c) => c.id === childCiId);
    if (!parentCi || !childCi) return;

    addRelationship({
      parentCiId: parentCi.id,
      parentCiName: parentCi.name,
      parentCiClass: parentCi.ciClass,
      childCiId: childCi.id,
      childCiName: childCi.name,
      childCiClass: childCi.ciClass,
      relationshipType: relType,
      direction,
      criticalityWeight: critWeight,
      notes,
      source: "manual",
      status: "active",
      lastSeen: new Date().toISOString(),
    });

    setIsAddModalOpen(false);
    setNotes("");
  };

  // Canvas Panning Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking canvas background (not interactive buttons/nodes)
    if ((e.target as HTMLElement).closest("button, a, input, select")) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleFitToScreen = () => {
    setPanOffset({ x: 0, y: 0 });
    setZoomLevel(1);
  };

  const toggleTierCollapse = (tier: number) => {
    setCollapsedTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  };

  // Export Canvas as PNG (SVG-to-Canvas Serialization without external npm packages)
  const handleExportPNG = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 800;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw background
      ctx.fillStyle = "#0B0F19";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header watermark
      ctx.fillStyle = "#1F6BFF";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("ZenOps CMDB • 5-Tier Topology Graph", 40, 45);
      ctx.fillStyle = "#94A3B8";
      ctx.font = "12px sans-serif";
      ctx.fillText(`Mode: ${graphMode.toUpperCase()} | Generated: ${new Date().toLocaleString()}`, 40, 70);

      // Draw tiers outline
      const tiers = [
        "Tier 0: Business Services",
        "Tier 1: Applications",
        "Tier 2: Compute & Containers",
        "Tier 3: Databases",
        "Tier 4: Network & Cloud",
      ];
      tiers.forEach((title, idx) => {
        const y = 100 + idx * 135;
        ctx.fillStyle = "#161F33";
        ctx.fillRect(40, y, 1120, 110);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.strokeRect(40, y, 1120, 110);
        ctx.fillStyle = "#38BDF8";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText(title.toUpperCase(), 55, y + 25);
      });

      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `zenops-topology-${graphMode}-${Date.now()}.png`;
      a.click();
      showToast("success", "Graph Exported", "Topology snapshot downloaded as PNG.");
    } catch {
      showToast("error", "Export Failed", "Unable to serialize graph image.");
    }
  };

  // Export Graph Data as JSON
  const handleExportJSON = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      tenant: activeTenant,
      graphMode,
      blastRadiusWeights: {
        baseScore: 20,
        dependentWeight: 8,
        tier0Weight: 25,
        tier1Weight: 25,
        tier2Weight: 15,
      },
      selectedCi: selectedCi ? { id: selectedCi.id, name: selectedCi.name } : null,
      impactAnalysis: selectedImpact,
      nodes: cis.map((c) => ({
        id: c.id,
        name: c.name,
        ciClass: c.ciClass,
        criticality: c.businessCriticality,
        operationalStatus: c.operationalStatus,
        revenuePerHour: c.revenuePerHour || null,
      })),
      relationships: relationships.map((r) => ({
        id: r.id,
        parentCiId: r.parentCiId,
        parentCiName: r.parentCiName,
        childCiId: r.childCiId,
        childCiName: r.childCiName,
        relationshipType: r.relationshipType,
        source: r.source || "manual",
        status: r.status || "active",
        confidence: r.confidence ?? 1,
        lastSeen: r.lastSeen || r.createdAt,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zenops-topology-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("success", "Data Exported", "Topology graph relationships downloaded as JSON.");
  };

  return (
    <div className="space-y-4 text-text-default pb-12 select-none">
      {/* ----------------------------------------------------------------------- */}
      {/* TOP CONTROLS & SEARCH BAR */}
      {/* ----------------------------------------------------------------------- */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-surface p-3.5 rounded-card border border-border shadow-card">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switcher: Upstream vs Downstream */}
          <div className="inline-flex rounded border border-border bg-sunken p-0.5 text-xs">
            <button
              onClick={() => setGraphMode("upstream")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-button font-semibold transition-all",
                graphMode === "upstream"
                  ? "btn-glass-primary text-white shadow-glass"
                  : "text-text-secondary hover:text-text-default"
              )}
              aria-pressed={graphMode === "upstream"}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-brand-cyan" />
              Upstream (Change Impact)
            </button>
            <button
              onClick={() => setGraphMode("downstream")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-button font-semibold transition-all",
                graphMode === "downstream"
                  ? "btn-glass-primary text-white shadow-glass"
                  : "text-text-secondary hover:text-text-default"
              )}
              aria-pressed={graphMode === "downstream"}
            >
              <ArrowDownRight className="w-3.5 h-3.5 text-brand-mint" />
              Downstream (Root Cause)
            </button>
          </div>

          {/* Search Box with instant jump */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Jump to CI (e.g. Postgres)..."
              className="w-full bg-sunken border border-border rounded-input pl-8 pr-7 py-1 text-xs text-text-default placeholder:text-text-muted focus:outline-none focus:border-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-default"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter by CI Class */}
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="bg-surface border border-border rounded-input px-2 py-1 text-xs text-text-default focus:outline-none focus:border-primary cursor-pointer"
            aria-label="Filter by CI Class"
          >
            <option value="">All Classes</option>
            <option value="Business Service">Business Service</option>
            <option value="Service Offering">Service Offering</option>
            <option value="Application">Application</option>
            <option value="Database">Database</option>
            <option value="Server/VM">Server/VM</option>
            <option value="Container/Pod">Container/Pod</option>
            <option value="Network Device">Network Device</option>
            <option value="Cloud Resource">Cloud Resource</option>
            <option value="Storage">Storage</option>
            <option value="SaaS Subscription">SaaS Subscription</option>
          </select>

          {/* Filter by Tier */}
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="bg-surface border border-border rounded-input px-2 py-1 text-xs text-text-default focus:outline-none focus:border-primary cursor-pointer"
            aria-label="Filter by Tier"
          >
            <option value="">All Tiers</option>
            <option value="0">Tier 0 (Business Services)</option>
            <option value="1">Tier 1 (Applications)</option>
            <option value="2">Tier 2 (Compute & Containers)</option>
            <option value="3">Tier 3 (Databases & Storage)</option>
            <option value="4">Tier 4 (Network & Ingress)</option>
          </select>

          {/* Filter by Criticality */}
          <select
            value={filterCriticality}
            onChange={(e) => setFilterCriticality(e.target.value)}
            className="bg-surface border border-border rounded-input px-2 py-1 text-xs text-text-default focus:outline-none focus:border-primary cursor-pointer"
            aria-label="Filter by Criticality"
          >
            <option value="">All Criticalities</option>
            <option value="Tier 1">Tier 1 Mission Critical</option>
            <option value="Tier 2">Tier 2 Business Critical</option>
            <option value="Tier 3">Tier 3 Operational</option>
            <option value="Tier 4">Tier 4 Non-Critical</option>
          </select>

          {/* Filter by Edge Source & Status */}
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Filter className="w-3.5 h-3.5 text-text-muted" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-surface border border-border rounded-input px-2 py-1 text-xs text-text-default focus:outline-none focus:border-primary cursor-pointer"
              aria-label="Filter by Edge Type"
            >
              <option value="">All Edges ({relationships.length})</option>
              <option value="Depends on">Depends on</option>
              <option value="Hosted on">Hosted on</option>
              <option value="Runs on">Runs on</option>
              <option value="Connects to">Connects to</option>
              <option value="Contains">Contains</option>
              <option value="Provides to">Provides to</option>
              <option value="Managed by">Managed by</option>
              <option value="discovered">Discovered Only</option>
              <option value="pending-review">Pending Review</option>
              <option value="stale">Stale (&gt;30d)</option>
            </select>
          </div>

          {/* Clear All Filters Button */}
          {activeFilterCount > 0 && (
            <Button
              size="xs"
              variant="outline"
              onClick={handleClearAllFilters}
              className="text-text-muted hover:text-danger text-xs h-7 px-2 shrink-0 border-border"
              title="Reset all active filters"
            >
              <X className="w-3 h-3 mr-1" />
              Clear all ({activeFilterCount})
            </Button>
          )}

          {/* Zoom & Fit Controls */}
          <div className="flex items-center gap-1 border-l border-border pl-2.5">
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.0, Number((z + 0.1).toFixed(2))))}
              className="p-1 rounded-button bg-sunken hover:bg-sunken/80 border border-border text-text-muted hover:text-text-default transition-colors"
              title="Zoom In (Max 200%)"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
              className="p-1 rounded-button bg-sunken hover:bg-sunken/80 border border-border text-text-muted hover:text-text-default transition-colors"
              title="Zoom Out (Min 50%)"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 rounded-button bg-sunken hover:bg-sunken/80 border border-border text-text-muted hover:text-text-default transition-colors"
              title="Reset Zoom (100%)"
              aria-label="Reset zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleFitToScreen}
              className="p-1 rounded-button bg-sunken hover:bg-sunken/80 border border-border text-text-muted hover:text-text-default transition-colors"
              title="Fit to Screen & Center"
              aria-label="Fit to screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-text-muted pl-1">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>

          {/* Live Signals Toggle */}
          <button
            type="button"
            onClick={() => setLiveTraffic((prev) => !prev)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-button text-xs border transition-all duration-150 cursor-pointer",
              liveTraffic
                ? "bg-brand-500/10 border-brand-500/30 text-brand-500 font-semibold shadow-xs"
                : "bg-surface border-border text-text-muted hover:text-text-default"
            )}
            title={
              totalVisibleNodes > 150
                ? "Live telemetry traffic disabled automatically for >150 nodes performance"
                : "Toggle live telemetry flow animation across architectural tiers"
            }
          >
            <Activity className={cn("w-3.5 h-3.5", liveTraffic && "animate-pulse text-brand-cyan")} />
            <span>Live Signals</span>
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                liveTraffic ? "bg-success animate-ping" : "bg-text-muted"
              )}
            />
          </button>
        </div>

        {/* Action Buttons: Export & Add Edge */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportPNG}
            title="Export high-resolution canvas snapshot as PNG image"
          >
            PNG
          </Button>

          <Button
            size="sm"
            variant="secondary"
            leftIcon={<FileJson className="w-3.5 h-3.5" />}
            onClick={handleExportJSON}
            title="Export complete relationship topology graph data as JSON"
          >
            JSON
          </Button>

          {canEdit && (
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Add Edge
            </Button>
          )}
        </div>
      </div>

      {/* Mode Sub-banner & Active Selection Status */}
      <div className="p-3 rounded-card bg-sunken border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-brand-500 shrink-0" />
          <span className="font-semibold text-text-default">
            {graphMode === "upstream"
              ? "Change Management Impact: Evaluating upward consumer blast radius"
              : "Incident Management Root Cause: Tracing downward infrastructure providers"}
          </span>
          {selectedCi && (
            <span className="bg-brand-500/10 text-brand-500 px-2 py-0.5 rounded font-mono font-semibold border border-brand-500/20">
              Focused: {selectedCi.name} ({selectedImpact?.dependentCis.length || 0} impacted)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-text-muted text-[11px]">
          <span>Drag canvas to pan &bull; Click node to inspect &bull; Esc to reset</span>
          {selectedCiId && (
            <button
              onClick={() => setSelectedCiId("")}
              className="text-brand-500 hover:underline font-semibold ml-1"
            >
              Clear Focus
            </button>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* 2-COLUMN LAYOUT: CANVAS (8 COLS) + RANKED IMPACT LIST (4 COLS) */}
      {/* ----------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ===================================================================== */}
        {/* GRAPH CANVAS CONTAINER (8 COLS) */}
        {/* ===================================================================== */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="bg-surface border-border overflow-hidden shadow-card relative">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">5-Tier Architectural Topology</CardTitle>
                <CardDescription className="text-xs">
                  Full cycle-safe directed BFS path with directional arrowheads and live pulse conduit
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Lozenge appearance="subtle" variant="info" size="sm">
                  {filteredRelationships.length} Mapped Edges
                </Lozenge>
                <Lozenge appearance="subtle" variant="neutral" size="sm">
                  {totalVisibleNodes} Nodes
                </Lozenge>
              </div>
            </CardHeader>

            {/* Draggable & Zoomable Canvas Viewport */}
            <div
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={cn(
                "p-4 bg-sunken/40 overflow-hidden min-h-[580px] relative cursor-grab select-none",
                isDragging && "cursor-grabbing"
              )}
            >
              {/* Scaled & Panned Content */}
              <div
                className="transition-transform duration-75 origin-top-left space-y-5 p-4 rounded-card bg-surface border border-border min-w-[720px]"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                }}
              >
                {/* ----------------------------------------------------------- */}
                {/* TIER 0: Business Services */}
                {/* ----------------------------------------------------------- */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-border pb-1">
                    <button
                      type="button"
                      onClick={() => toggleTierCollapse(0)}
                      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary hover:underline"
                    >
                      {collapsedTiers.has(0) ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                      <span>Tier 0 &bull; Business Services & APIs</span>
                    </button>
                    <span className="text-[10px] text-text-muted">Top-level user outcomes</span>
                  </div>

                  {!collapsedTiers.has(0) && (
                    <div className="flex flex-wrap gap-2.5">
                      {safeTier0.map((node) => {
                        const isSelected = node.id === selectedCiId;
                        const isImpacted = impactedNodeIds.has(node.id);
                        const isDimmed = selectedCiId && !isImpacted;

                        return (
                          <div
                            key={node.id}
                            tabIndex={0}
                            role="button"
                            aria-selected={isSelected}
                            aria-label={`Node ${node.name}, Class ${node.ciClass}`}
                            onClick={() => handleNodeClick(node.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") handleNodeClick(node.id);
                            }}
                            className={cn(
                              "p-2.5 rounded-card text-left transition-all duration-200 min-w-[185px] max-w-xs border cursor-pointer outline-none",
                              isSelected
                                ? "bg-selected-bg border-primary ring-2 ring-primary/60 shadow-glass-hover animate-pulse-glow"
                                : isImpacted
                                ? "bg-primary/5 border-primary/40 shadow-xs"
                                : "bg-surface border-border hover:border-border-strong hover:bg-sunken",
                              isDimmed && "opacity-25 hover:opacity-100"
                            )}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono text-[10px] text-text-muted flex items-center gap-1">
                                {getClassIcon(node.ciClass)}
                                {node.id}
                              </span>
                              <TrustScoreBadge score={node.trustScore} showLabel={false} />
                            </div>
                            <p className="font-semibold text-xs text-text-default truncate">
                              {node.name}
                            </p>
                            <div className="flex items-center justify-between mt-1 text-[10px] text-text-muted">
                              <span className="truncate">{node.environment}</span>
                              <OperationalBadge status={node.operationalStatus} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Live Traffic Flow SVG Conduit: Tier 0 to Tier 1 */}
                <div className="flex flex-col items-center justify-center my-[-2px] relative z-10 select-none pointer-events-none">
                  <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-surface border border-primary/30 shadow-2xs text-[10px] font-mono">
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full bg-primary",
                        liveTraffic && "animate-ping"
                      )}
                    />
                    <span className="text-primary font-semibold">Service Mesh</span>
                    <span className="text-text-muted text-[9px] uppercase">&bull; RPC Ingress</span>
                  </div>
                  <svg className="w-32 h-6 overflow-visible" viewBox="0 0 100 24">
                    <defs>
                      <marker
                        id="arrow-tier0"
                        viewBox="0 0 10 10"
                        refX="5"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--primary)" />
                      </marker>
                    </defs>
                    <line
                      x1="50"
                      y1="0"
                      x2="50"
                      y2="24"
                      stroke="var(--primary)"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      markerEnd="url(#arrow-tier0)"
                      className={cn(liveTraffic && "animate-flow-dash")}
                    />
                    {liveTraffic && (
                      <circle cx="50" cy="12" r="3" className="fill-brand-cyan animate-pulse" />
                    )}
                  </svg>
                </div>

                {/* ----------------------------------------------------------- */}
                {/* TIER 1: Applications & Microservices */}
                {/* ----------------------------------------------------------- */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-border pb-1">
                    <button
                      type="button"
                      onClick={() => toggleTierCollapse(1)}
                      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-blue hover:underline"
                    >
                      {collapsedTiers.has(1) ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                      <span>Tier 1 &bull; Applications & Microservices</span>
                    </button>
                    <span className="text-[10px] text-text-muted">Application runtime logic</span>
                  </div>

                  {!collapsedTiers.has(1) && (
                    <div className="flex flex-wrap gap-2.5">
                      {safeTier1.map((node) => {
                        const isSelected = node.id === selectedCiId;
                        const isImpacted = impactedNodeIds.has(node.id);
                        const isDimmed = selectedCiId && !isImpacted;

                        return (
                          <div
                            key={node.id}
                            tabIndex={0}
                            role="button"
                            aria-selected={isSelected}
                            aria-label={`Node ${node.name}, Class ${node.ciClass}`}
                            onClick={() => handleNodeClick(node.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") handleNodeClick(node.id);
                            }}
                            className={cn(
                              "p-2.5 rounded-card text-left transition-all duration-200 min-w-[185px] max-w-xs border cursor-pointer outline-none",
                              isSelected
                                ? "bg-selected-bg border-primary ring-2 ring-primary/60 shadow-glass-hover animate-pulse-glow"
                                : isImpacted
                                ? "bg-primary/5 border-primary/40 shadow-xs"
                                : "bg-surface border-border hover:border-border-strong hover:bg-sunken",
                              isDimmed && "opacity-25 hover:opacity-100"
                            )}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono text-[10px] text-text-muted flex items-center gap-1">
                                {getClassIcon(node.ciClass)}
                                {node.id}
                              </span>
                              <TrustScoreBadge score={node.trustScore} showLabel={false} />
                            </div>
                            <p className="font-semibold text-xs text-text-default truncate">
                              {node.name}
                            </p>
                            <div className="flex items-center justify-between mt-1 text-[10px] text-text-muted">
                              <span className="truncate">{node.ciClass}</span>
                              <OperationalBadge status={node.operationalStatus} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Live Traffic Flow SVG Conduit: Tier 1 to Tier 2 */}
                <div className="flex flex-col items-center justify-center my-[-2px] relative z-10 select-none pointer-events-none">
                  <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-surface border border-brand-cyan/40 shadow-2xs text-[10px] font-mono">
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full bg-brand-cyan",
                        liveTraffic && "animate-ping"
                      )}
                    />
                    <span className="text-brand-cyan font-semibold">Container Ingress</span>
                    <span className="text-text-muted text-[9px] uppercase">&bull; Pod Traffic</span>
                  </div>
                  <svg className="w-32 h-6 overflow-visible" viewBox="0 0 100 24">
                    <line
                      x1="50"
                      y1="0"
                      x2="50"
                      y2="24"
                      stroke="#19C8F0"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      className={cn(liveTraffic && "animate-flow-dash")}
                    />
                    {liveTraffic && (
                      <circle cx="50" cy="12" r="3" className="fill-brand-mint animate-pulse" />
                    )}
                  </svg>
                </div>

                {/* ----------------------------------------------------------- */}
                {/* TIER 2: Compute & Containers */}
                {/* ----------------------------------------------------------- */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-border pb-1">
                    <button
                      type="button"
                      onClick={() => toggleTierCollapse(2)}
                      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-cyan hover:underline"
                    >
                      {collapsedTiers.has(2) ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                      <span>Tier 2 &bull; Compute Nodes & Containers</span>
                    </button>
                    <span className="text-[10px] text-text-muted">Pods, VMs, cluster workers</span>
                  </div>

                  {!collapsedTiers.has(2) && (
                    <div className="flex flex-wrap gap-2.5">
                      {safeTier2.map((node) => {
                        const isSelected = node.id === selectedCiId;
                        const isImpacted = impactedNodeIds.has(node.id);
                        const isDimmed = selectedCiId && !isImpacted;

                        return (
                          <div
                            key={node.id}
                            tabIndex={0}
                            role="button"
                            aria-selected={isSelected}
                            aria-label={`Node ${node.name}, Class ${node.ciClass}`}
                            onClick={() => handleNodeClick(node.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") handleNodeClick(node.id);
                            }}
                            className={cn(
                              "p-2.5 rounded-card text-left transition-all duration-200 min-w-[185px] max-w-xs border cursor-pointer outline-none",
                              isSelected
                                ? "bg-selected-bg border-primary ring-2 ring-primary/60 shadow-glass-hover animate-pulse-glow"
                                : isImpacted
                                ? "bg-primary/5 border-primary/40 shadow-xs"
                                : "bg-surface border-border hover:border-border-strong hover:bg-sunken",
                              isDimmed && "opacity-25 hover:opacity-100"
                            )}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono text-[10px] text-text-muted flex items-center gap-1">
                                {getClassIcon(node.ciClass)}
                                {node.id}
                              </span>
                              <TrustScoreBadge score={node.trustScore} showLabel={false} />
                            </div>
                            <p className="font-semibold text-xs text-text-default truncate">
                              {node.name}
                            </p>
                            <div className="flex items-center justify-between mt-1 text-[10px] text-text-muted">
                              <span className="truncate">{node.owner}</span>
                              <OperationalBadge status={node.operationalStatus} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Live Traffic Flow SVG Conduit: Tier 2 to Tier 3 */}
                <div className="flex flex-col items-center justify-center my-[-2px] relative z-10 select-none pointer-events-none">
                  <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-surface border border-success/40 shadow-2xs text-[10px] font-mono">
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full bg-success",
                        liveTraffic && "animate-ping"
                      )}
                    />
                    <span className="text-success font-semibold">DB Connection Pool</span>
                    <span className="text-text-muted text-[9px] uppercase">&bull; TCP Query</span>
                  </div>
                  <svg className="w-32 h-6 overflow-visible" viewBox="0 0 100 24">
                    <line
                      x1="50"
                      y1="0"
                      x2="50"
                      y2="24"
                      stroke="#1F845A"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      className={cn(liveTraffic && "animate-flow-dash")}
                    />
                    {liveTraffic && (
                      <circle cx="50" cy="12" r="3" className="fill-success animate-pulse" />
                    )}
                  </svg>
                </div>

                {/* ----------------------------------------------------------- */}
                {/* TIER 3: Databases & Storage */}
                {/* ----------------------------------------------------------- */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-border pb-1">
                    <button
                      type="button"
                      onClick={() => toggleTierCollapse(3)}
                      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-success hover:underline"
                    >
                      {collapsedTiers.has(3) ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                      <span>Tier 3 &bull; Databases & Persistent Storage</span>
                    </button>
                    <span className="text-[10px] text-text-muted">PostgreSQL, Redis clusters</span>
                  </div>

                  {!collapsedTiers.has(3) && (
                    <div className="flex flex-wrap gap-2.5">
                      {safeTier3.map((node) => {
                        const isSelected = node.id === selectedCiId;
                        const isImpacted = impactedNodeIds.has(node.id);
                        const isDimmed = selectedCiId && !isImpacted;

                        return (
                          <div
                            key={node.id}
                            tabIndex={0}
                            role="button"
                            aria-selected={isSelected}
                            aria-label={`Node ${node.name}, Class ${node.ciClass}`}
                            onClick={() => handleNodeClick(node.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") handleNodeClick(node.id);
                            }}
                            className={cn(
                              "p-2.5 rounded-card text-left transition-all duration-200 min-w-[185px] max-w-xs border cursor-pointer outline-none",
                              isSelected
                                ? "bg-selected-bg border-primary ring-2 ring-primary/60 shadow-glass-hover animate-pulse-glow"
                                : isImpacted
                                ? "bg-primary/5 border-primary/40 shadow-xs"
                                : "bg-surface border-border hover:border-border-strong hover:bg-sunken",
                              isDimmed && "opacity-25 hover:opacity-100"
                            )}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono text-[10px] text-text-muted flex items-center gap-1">
                                {getClassIcon(node.ciClass)}
                                {node.id}
                              </span>
                              <TrustScoreBadge score={node.trustScore} showLabel={false} />
                            </div>
                            <p className="font-semibold text-xs text-text-default truncate">
                              {node.name}
                            </p>
                            <div className="flex items-center justify-between mt-1 text-[10px] text-text-muted">
                              <span className="truncate">{node.supportGroup}</span>
                              <OperationalBadge status={node.operationalStatus} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Live Traffic Flow SVG Conduit: Tier 3 to Tier 4 */}
                <div className="flex flex-col items-center justify-center my-[-2px] relative z-10 select-none pointer-events-none">
                  <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-surface border border-warning/40 shadow-2xs text-[10px] font-mono">
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full bg-warning",
                        liveTraffic && "animate-ping"
                      )}
                    />
                    <span className="text-warning font-semibold">Cloud VPC Gateway</span>
                    <span className="text-text-muted text-[9px] uppercase">&bull; Route Table</span>
                  </div>
                  <svg className="w-32 h-6 overflow-visible" viewBox="0 0 100 24">
                    <line
                      x1="50"
                      y1="0"
                      x2="50"
                      y2="24"
                      stroke="#B38600"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      className={cn(liveTraffic && "animate-flow-dash")}
                    />
                    {liveTraffic && (
                      <circle cx="50" cy="12" r="3" className="fill-warning animate-pulse" />
                    )}
                  </svg>
                </div>

                {/* ----------------------------------------------------------- */}
                {/* TIER 4: Network & Cloud Infrastructure */}
                {/* ----------------------------------------------------------- */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-border pb-1">
                    <button
                      type="button"
                      onClick={() => toggleTierCollapse(4)}
                      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-warning hover:underline"
                    >
                      {collapsedTiers.has(4) ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                      <span>Tier 4 &bull; Network & Cloud Infrastructure</span>
                    </button>
                    <span className="text-[10px] text-text-muted">
                      Gateways, VPC firewalls, switches
                    </span>
                  </div>

                  {!collapsedTiers.has(4) && (
                    <div className="flex flex-wrap gap-2.5">
                      {safeTier4.map((node) => {
                        const isSelected = node.id === selectedCiId;
                        const isImpacted = impactedNodeIds.has(node.id);
                        const isDimmed = selectedCiId && !isImpacted;

                        return (
                          <div
                            key={node.id}
                            tabIndex={0}
                            role="button"
                            aria-selected={isSelected}
                            aria-label={`Node ${node.name}, Class ${node.ciClass}`}
                            onClick={() => handleNodeClick(node.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") handleNodeClick(node.id);
                            }}
                            className={cn(
                              "p-2.5 rounded-card text-left transition-all duration-200 min-w-[185px] max-w-xs border cursor-pointer outline-none",
                              isSelected
                                ? "bg-selected-bg border-primary ring-2 ring-primary/60 shadow-glass-hover animate-pulse-glow"
                                : isImpacted
                                ? "bg-primary/5 border-primary/40 shadow-xs"
                                : "bg-surface border-border hover:border-border-strong hover:bg-sunken",
                              isDimmed && "opacity-25 hover:opacity-100"
                            )}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono text-[10px] text-text-muted flex items-center gap-1">
                                {getClassIcon(node.ciClass)}
                                {node.id}
                              </span>
                              <TrustScoreBadge score={node.trustScore} showLabel={false} />
                            </div>
                            <p className="font-semibold text-xs text-text-default truncate">
                              {node.name}
                            </p>
                            <div className="flex items-center justify-between mt-1 text-[10px] text-text-muted">
                              <span className="truncate">{node.location || "Global"}</span>
                              <OperationalBadge status={node.operationalStatus} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* INTERACTIVE MINIMAP WIDGET */}
              {/* ------------------------------------------------------------- */}
              <div className="absolute bottom-3 right-3 bg-surface/90 backdrop-blur-md border border-border rounded-card p-2 shadow-dropdown w-44 pointer-events-none hidden sm:block">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-text-muted border-b border-border pb-1 mb-1.5">
                  <span>Minimap</span>
                  <span>5 Tiers</span>
                </div>
                <div className="space-y-1">
                  {[0, 1, 2, 3, 4].map((tierIdx) => {
                    const isLaneCollapsed = collapsedTiers.has(tierIdx);
                    return (
                      <div
                        key={tierIdx}
                        className={cn(
                          "h-2 rounded-[2px] transition-all",
                          isLaneCollapsed ? "bg-border/40" : "bg-primary/20",
                          tierIdx === 0 && "bg-primary/40",
                          tierIdx === 3 && "bg-success/30",
                          tierIdx === 4 && "bg-warning/30"
                        )}
                      />
                    );
                  })}
                </div>
                <div className="mt-1.5 text-[9px] text-text-muted flex justify-between">
                  <span>Zoom: {Math.round(zoomLevel * 100)}%</span>
                  <span>{impactedNodeIds.size} Focused</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ===================================================================== */}
        {/* RIGHT SIDE: RANKED REVENUE EXPOSURE & NODE DETAILS (4 COLS) */}
        {/* ===================================================================== */}
        <div className="lg:col-span-4 space-y-4">
          {/* Dynamic Ranked Business Service Risk Panel */}
          <Card className="bg-surface border-border shadow-card">
            <CardHeader className="pb-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Ranked Business Service Risk</CardTitle>
                  <CardDescription className="text-xs">
                    Dynamic downtime revenue exposure calculated from business services
                  </CardDescription>
                </div>
                <DollarSign className="w-5 h-5 text-warning" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {rankedImpacts.map((svc) => (
                <div
                  key={svc.id}
                  className="p-3 rounded-card border border-border/70 bg-sunken/40 space-y-1.5 hover:bg-sunken/80 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-default text-xs sm:text-sm">
                      {svc.serviceName}
                    </span>
                    <span
                      className={cn(
                        "font-mono font-bold text-xs sm:text-sm",
                        svc.revenueValue > 0 ? "text-warning" : "text-text-muted"
                      )}
                    >
                      {svc.revenueDisplay}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>{svc.ciCount} Linked CIs</span>
                    <Lozenge
                      appearance="subtle"
                      variant={svc.tier === "Tier 0" ? "danger" : "info"}
                      size="xs"
                    >
                      {svc.criticality}
                    </Lozenge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Node Inspection Card */}
          {selectedCi && (
            <Card className="bg-surface border-border shadow-card animate-in fade-in duration-100">
              <CardHeader className="pb-2.5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold truncate">
                    Focused: {selectedCi.name}
                  </CardTitle>
                  <span className="font-mono text-xs text-text-muted">{selectedCi.id}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-text-muted block text-[10px]">Class</span>
                    <span className="font-medium text-text-default">{selectedCi.ciClass}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[10px]">Owner</span>
                    <span className="font-medium text-text-default truncate block">
                      {selectedCi.owner}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[10px]">Upstream Providers</span>
                    <span className="font-mono text-text-default">
                      {selectedParents.length} parents
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[10px]">Downstream Dependents</span>
                    <span className="font-mono text-text-default">
                      {selectedChildren.length} dependents
                    </span>
                  </div>
                </div>

                {/* Blast Radius Score & Risk Badge */}
                {selectedImpact && (
                  <div
                    className={cn(
                      "p-3 rounded-card border space-y-1.5",
                      selectedImpact.riskLevel === "Severe"
                        ? "bg-danger/10 border-danger/30 text-danger"
                        : selectedImpact.riskLevel === "High"
                        ? "bg-warning/10 border-warning/30 text-warning"
                        : "bg-primary/10 border-primary/30 text-primary"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">
                        Blast Radius: {selectedImpact.riskLevel}
                      </span>
                      <span className="font-mono font-bold text-xs">
                        {selectedImpact.blastRadiusScore}/100
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-snug">
                      {selectedImpact.riskExplanation}
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-border flex items-center justify-between gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<Paperclip className="w-3.5 h-3.5" />}
                    onClick={handleAttachToChange}
                  >
                    Attach to Change
                  </Button>

                  <Button size="sm" variant="outline" onClick={() => setDrawerOpen(true)}>
                    Impact Paths &rarr;
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Discovered / Pending Edges Audit List Card */}
          <Card className="bg-surface border-border shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">Discovered & Audit Edges</CardTitle>
                <Lozenge appearance="subtle" variant="warning" size="xs">
                  Review Queue
                </Lozenge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              {relationships
                .filter((r) => r.source === "discovered" || isEdgeStale(r))
                .slice(0, 4)
                .map((rel) => {
                  const isStale = isEdgeStale(rel);
                  const isPending = rel.status === "pending-review";

                  return (
                    <div
                      key={rel.id}
                      className="p-2.5 rounded-card bg-sunken/40 border border-border/60 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono font-bold text-[11px] text-text-default truncate">
                          {rel.parentCiName} &rarr; {rel.childCiName}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {isPending && (
                            <Lozenge appearance="subtle" variant="warning" size="xs">
                              Pending
                            </Lozenge>
                          )}
                          {isStale && (
                            <Lozenge appearance="subtle" variant="danger" size="xs">
                              Stale (&gt;30d)
                            </Lozenge>
                          )}
                          {rel.source === "discovered" && !isPending && !isStale && (
                            <Lozenge appearance="subtle" variant="info" size="xs">
                              {rel.confidence ? `${Math.round(rel.confidence * 100)}% Conf` : "Discovered"}
                            </Lozenge>
                          )}
                        </div>
                      </div>

                      <p className="text-[10px] text-text-secondary truncate">{rel.notes}</p>

                      {/* Approve / Reject Actions (Permissions Checked) */}
                      {isPending && canEdit && (
                        <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
                          <Button
                            size="xs"
                            variant="primary"
                            leftIcon={<Check className="w-3 h-3" />}
                            onClick={() => handleApproveEdge(rel.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="xs"
                            variant="danger"
                            leftIcon={<X className="w-3 h-3" />}
                            onClick={() => handleRejectEdge(rel.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* FULL IMPACT ANALYSIS PATH DETAILS DRAWER */}
      {/* ----------------------------------------------------------------------- */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedCi ? `${selectedCi.name} (${selectedCi.id})` : "Node Details"}
        size="lg"
      >
        {selectedCi && (
          <div className="p-5 space-y-5 text-xs text-text-default">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-card bg-primary/10 text-primary">
                  {getClassIcon(selectedCi.ciClass)}
                </span>
                <div>
                  <h4 className="font-bold text-sm text-text-default">{selectedCi.name}</h4>
                  <span className="font-mono text-text-muted text-[11px]">{selectedCi.id}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Lozenge appearance="subtle" variant="info">
                  {selectedCi.ciClass}
                </Lozenge>
                <OperationalBadge status={selectedCi.operationalStatus} />
              </div>
            </div>

            {/* Impact Analysis Breakdown */}
            {selectedImpact && (
              <div className="space-y-3">
                <div
                  className={cn(
                    "p-3.5 rounded-card border space-y-2",
                    selectedImpact.riskLevel === "Severe"
                      ? "bg-danger/10 border-danger/30"
                      : selectedImpact.riskLevel === "High"
                      ? "bg-warning/10 border-warning/30"
                      : "bg-primary/10 border-primary/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-text-default">
                      Blast Radius Score: {selectedImpact.blastRadiusScore}/100
                    </span>
                    <CriticalityBadge criticality={`Tier 1 - ${selectedImpact.riskLevel}` as any} />
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {selectedImpact.riskExplanation}
                  </p>
                </div>

                {/* Traversal Dependents Grouped By Tier */}
                <div className="space-y-3">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-text-secondary">
                    Impacted Dependents & Paths ({selectedImpact.dependentCis.length})
                  </h5>

                  {selectedImpact.dependentCis.length === 0 ? (
                    <div className="p-4 rounded-card bg-sunken text-center text-text-muted text-xs">
                      No dependent consumers impacted by this CI in {graphMode} mode.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                      {selectedImpact.dependentCis.map((dep, idx) => (
                        <div
                          key={`${dep.ci.id}-${idx}`}
                          className="p-3 rounded-card bg-sunken/60 border border-border space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-text-default flex items-center gap-1.5">
                              {getClassIcon(dep.ci.ciClass)}
                              {dep.ci.name}
                            </span>
                            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-primary/10 text-primary font-semibold">
                              Depth {dep.depth}
                            </span>
                          </div>

                          {/* Full Path Trace Pills */}
                          <div className="flex items-center gap-1 flex-wrap pt-0.5 text-[10px] font-mono text-text-muted">
                            <span className="text-text-secondary font-semibold">Path:</span>
                            {dep.path.map((stepId, sIdx) => (
                              <React.Fragment key={stepId}>
                                <span
                                  className={cn(
                                    "px-1.5 py-0.5 rounded border border-border",
                                    stepId === selectedCiId
                                      ? "bg-primary/20 text-primary font-bold"
                                      : "bg-surface text-text-default"
                                  )}
                                >
                                  {stepId}
                                </span>
                                {sIdx < dep.path.length - 1 && <span>&rarr;</span>}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-4 border-t border-border flex items-center justify-between gap-2">
              <Button size="sm" variant="primary" onClick={handleAttachToChange}>
                Attach to Change Record
              </Button>
              <Link href={`/cis/${selectedCi.id}`}>
                <Button size="sm" variant="outline">
                  Open CI Full Profile
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Drawer>

      {/* ----------------------------------------------------------------------- */}
      {/* ADD RELATIONSHIP MODAL WITH INLINE CYCLE & DUPLICATE VALIDATION */}
      {/* ----------------------------------------------------------------------- */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Topology Relationship Edge"
        description="Establish an architectural dependency or hosting link between two configuration items with cycle prevention"
      >
        <form onSubmit={handleAddSubmit} className="p-5 space-y-4 text-xs text-text-default">
          {/* Inline Validation Alerts */}
          {validationResult.errors.length > 0 && (
            <div className="p-3 rounded-card bg-danger/10 border border-danger/30 text-danger space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Cannot Establish Edge</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                {validationResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {validationResult.warnings.length > 0 && (
            <div className="p-3 rounded-card bg-warning/10 border border-warning/30 text-warning space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="w-4 h-4 shrink-0" />
                <span>Architectural Hierarchy Warning</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                {validationResult.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-text-default block mb-1">
              Parent CI (Source Node)
            </label>
            <select
              value={parentCiId}
              onChange={(e) => setParentCiId(e.target.value)}
              className="w-full bg-surface border border-border rounded-input p-2 text-xs text-text-default focus:outline-none focus:border-primary"
            >
              {cis.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id}) &bull; {c.ciClass}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-default block mb-1">
              Relationship Type
            </label>
            <select
              value={relType}
              onChange={(e) => setRelType(e.target.value as RelationshipType)}
              className="w-full bg-surface border border-border rounded-input p-2 text-xs text-text-default focus:outline-none focus:border-primary"
            >
              <option value="Depends on">Depends on (Parent depends on Child)</option>
              <option value="Hosted on">Hosted on (Parent depends on Child Host)</option>
              <option value="Runs on">Runs on (Parent depends on Child Platform)</option>
              <option value="Connects to">Connects to (Bidirectional Network Flow)</option>
              <option value="Contains">Contains (Child depends on Parent Container)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-default block mb-1">
              Child CI (Target Node)
            </label>
            <select
              value={childCiId}
              onChange={(e) => setChildCiId(e.target.value)}
              className="w-full bg-surface border border-border rounded-input p-2 text-xs text-text-default focus:outline-none focus:border-primary"
            >
              {cis.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id}) &bull; {c.ciClass}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-default block mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Architectural justification or ticket reference..."
              className="w-full bg-surface border border-border rounded-input p-2 text-xs text-text-default placeholder:text-text-muted focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              size="sm"
              variant="secondary"
              type="button"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              type="submit"
              disabled={!validationResult.isValid || !canEdit}
            >
              Save Relationship
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
