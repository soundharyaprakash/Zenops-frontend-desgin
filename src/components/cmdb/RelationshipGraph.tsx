"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback, useLayoutEffect } from "react";
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
  AlertCircle,
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
  Crosshair,
  GitFork,
  ArrowDownLeft,
  ArrowUpLeft,
  Copy,
  Archive,
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
import { getNodeRelationships, NodeNeighborRelationship } from "@/lib/relationships/impact-logic";
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
    canEdit,
    showToast,
  } = useCMDB();

  // Initial State: Open with CI-1002 (aurora-pg-payments-cluster) selected in Upstream mode
  const [selectedCiId, setSelectedCiId] = useState<string>("CI-1002");
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
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

  // Focus View State
  const [focusMode, setFocusMode] = useState<boolean>(false);
  const [focusDepth, setFocusDepth] = useState<1 | 2 | "all">(1);

  // Add Edge Form State
  const [parentCiId, setParentCiId] = useState(cis[0]?.id || "");
  const [childCiId, setChildCiId] = useState(cis[1]?.id || "");
  const [relType, setRelType] = useState<RelationshipType>("Depends on");
  const [direction, setDirection] = useState<DirectionType>("Downstream");
  const [critWeight, setCritWeight] = useState<CriticalityWeight>("High");
  const [notes, setNotes] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasInnerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number; width: number; height: number }>>(new Map());

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

  // Keyboard navigation: Escape clears selection / exits focus / closes drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        setSelectedEdgeId(null);
        setFocusMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filtered Relationships
  const filteredRelationships = useMemo(() => {
    if (!filterType) return relationships;
    if (filterType === "manual") return relationships.filter((r) => r.source === "manual" || !r.source);
    if (filterType === "discovered") return relationships.filter((r) => r.source === "discovered");
    if (filterType === "pending-review") return relationships.filter((r) => r.status === "pending-review" || r.status === "pending");
    if (filterType === "stale") return relationships.filter((r) => isEdgeStale(r));
    return relationships.filter((r) => r.relationshipType === filterType);
  }, [relationships, filterType]);

  // Selected CI & Impact Analysis Result (BFS Traversal)
  const selectedCi = useMemo(() => cis.find((c) => c.id === selectedCiId), [cis, selectedCiId]);

  const selectedImpact = useMemo(() => {
    if (!selectedCi) return null;
    return getImpactAnalysis(selectedCi.id, graphMode, 6);
  }, [selectedCi, graphMode, getImpactAnalysis]);

  // Selected Edge
  const selectedEdge = useMemo(
    () => relationships.find((r) => r.id === selectedEdgeId) || null,
    [relationships, selectedEdgeId]
  );

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

  // Hop Depth Map for each impacted node (H1, H2, H3...)
  const nodeHopMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!selectedImpact) return map;
    selectedImpact.dependentCis.forEach((d) => {
      map.set(d.ci.id, d.depth);
    });
    return map;
  }, [selectedImpact]);

  // Focused Node IDs in Focus Mode
  const focusedNodeIds = useMemo(() => {
    if (!focusMode || !selectedCiId) return null;
    const set = new Set<string>();
    set.add(selectedCiId);

    const queue: { id: string; depth: number }[] = [{ id: selectedCiId, depth: 0 }];
    const maxD = focusDepth === "all" ? 99 : focusDepth;

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth < maxD) {
        relationships.forEach((r) => {
          if (r.parentCiId === id && !set.has(r.childCiId)) {
            set.add(r.childCiId);
            queue.push({ id: r.childCiId, depth: depth + 1 });
          } else if (r.childCiId === id && !set.has(r.parentCiId)) {
            set.add(r.parentCiId);
            queue.push({ id: r.parentCiId, depth: depth + 1 });
          }
        });
      }
    }

    return set;
  }, [focusMode, selectedCiId, focusDepth, relationships]);

  // Node Focus Relationships: Depends on (outgoing) and Used by (incoming)
  const nodeRelBreakdown = useMemo(() => {
    if (!selectedCiId) return { dependsOn: [], usedBy: [] };
    return getNodeRelationships(selectedCiId, relationships, cis);
  }, [selectedCiId, relationships, cis]);

  // Filter matching
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
        if (filterTier === "3" && ci.ciClass !== "Database" && ci.id !== "CI-1006") return false;
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

  // Group CIs into 5 Architectural Tiers
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
    () =>
      cis.filter(
        (c) => (c.ciClass === "Database" || c.id === "CI-1006") && matchesFilter(c)
      ),
    [cis, matchesFilter]
  );

  const tier4CIs = useMemo(
    () =>
      cis.filter(
        (c) =>
          (c.ciClass === "Network Device" ||
            (c.ciClass === "Cloud Resource" && c.id !== "CI-1006") ||
            c.ciClass === "Network" ||
            c.ciClass === "Storage") &&
          matchesFilter(c)
      ),
    [cis, matchesFilter]
  );

  const isFilterActive = activeFilterCount > 0;
  const safeTier0 = tier0CIs;
  const safeTier1 = tier1CIs;
  const safeTier2 = tier2CIs;
  const safeTier3 = tier3CIs;
  const safeTier4 = tier4CIs;

  const totalVisibleNodes =
    safeTier0.length + safeTier1.length + safeTier2.length + safeTier3.length + safeTier4.length;

  // Measure card element positions for drawing exact SVG connector lines
  const updateNodePositions = useCallback(() => {
    if (!canvasInnerRef.current) return;
    const canvasRect = canvasInnerRef.current.getBoundingClientRect();
    const newPositions = new Map<string, { x: number; y: number; width: number; height: number }>();

    nodeRefs.current.forEach((el, id) => {
      if (el) {
        const rect = el.getBoundingClientRect();
        newPositions.set(id, {
          x: (rect.left + rect.right) / 2 - canvasRect.left,
          y: (rect.top + rect.bottom) / 2 - canvasRect.top,
          width: rect.width,
          height: rect.height,
        });
      }
    });

    setNodePositions((prev) => {
      if (prev.size !== newPositions.size) return newPositions;
      for (const [id, pos] of newPositions.entries()) {
        const p = prev.get(id);
        if (
          !p ||
          Math.abs(p.x - pos.x) > 0.5 ||
          Math.abs(p.y - pos.y) > 0.5 ||
          Math.abs(p.width - pos.width) > 0.5 ||
          Math.abs(p.height - pos.height) > 0.5
        ) {
          return newPositions;
        }
      }
      return prev;
    });
  }, []);

  const visibleNodesHash = useMemo(() => {
    return [
      safeTier0.map((c) => c.id).join(","),
      safeTier1.map((c) => c.id).join(","),
      safeTier2.map((c) => c.id).join(","),
      safeTier3.map((c) => c.id).join(","),
      safeTier4.map((c) => c.id).join(","),
      Array.from(collapsedTiers).sort().join(","),
      zoomLevel,
      panOffset.x,
      panOffset.y,
      focusMode ? selectedCiId : "",
      focusDepth,
    ].join("|");
  }, [
    safeTier0,
    safeTier1,
    safeTier2,
    safeTier3,
    safeTier4,
    collapsedTiers,
    zoomLevel,
    panOffset.x,
    panOffset.y,
    focusMode,
    selectedCiId,
    focusDepth,
  ]);

  useLayoutEffect(() => {
    updateNodePositions();
    const timer = setTimeout(updateNodePositions, 80);
    return () => clearTimeout(timer);
  }, [visibleNodesHash, updateNodePositions]);

  useEffect(() => {
    window.addEventListener("resize", updateNodePositions);
    return () => window.removeEventListener("resize", updateNodePositions);
  }, [updateNodePositions]);

  // Ranked Business Service Revenue Exposure List
  const rankedImpacts = useMemo<ServiceImpactRank[]>(() => {
    const allServices = cis.filter(
      (c) =>
        c.ciClass === "Business Service" ||
        c.ciClass === "Service Offering" ||
        typeof c.revenuePerHour === "number"
    );

    return allServices
      .map((svc) => {
        const linkedCount = relationships.filter(
          (r) => r.parentCiId === svc.id || r.childCiId === svc.id
        ).length;

        const revNum = typeof svc.revenuePerHour === "number" ? svc.revenuePerHour : null;
        const currency = svc.currency === "USD" ? "$" : svc.currency ? `${svc.currency} ` : "$";
        const revenueDisplay =
          revNum !== null ? `${currency}${revNum.toLocaleString()}/hr` : "Not set";

        let tierLabel = "Tier 0";
        if (svc.businessCriticality?.includes("Tier 1")) tierLabel = "Tier 1";
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

  // Banner text calculation
  const bannerInfo = useMemo(() => {
    if (!selectedCi) {
      return {
        headline:
          "Select any CI to evaluate real-time architectural failure blast radius, impacted business services, and hourly financial exposure.",
        isWarning: false,
      };
    }

    if (graphMode === "upstream") {
      const tier0Services = selectedImpact?.affectedBusinessServices || [];
      const tier0Count = tier0Services.length;
      const revenue = selectedImpact?.revenueAtRisk || 0;
      const serviceNames = tier0Services.map((s) => s.name).join(", ");

      if (tier0Count > 0) {
        return {
          headline: `If ${selectedCi.name} goes down, ${tier0Count} business service${
            tier0Count === 1 ? "" : "s"
          } stop (${serviceNames}) and the company loses $${revenue.toLocaleString()} every hour.`,
          isWarning: true,
        };
      } else {
        const count = selectedImpact?.dependentCis.length || 0;
        return {
          headline: `If ${selectedCi.name} goes down, ${count} component${
            count === 1 ? "" : "s"
          } are affected with no direct Tier 0 business service revenue disruption ($0/hr).`,
          isWarning: false,
        };
      }
    } else {
      const candidates = selectedImpact?.rootCauseCandidates || selectedImpact?.dependentCis || [];
      return {
        headline: `Analyzing root cause dependencies for ${selectedCi.name}: walking down to ${
          candidates.length
        } underlying infrastructure component${candidates.length === 1 ? "" : "s"} across the stack.`,
        isWarning: false,
      };
    }
  }, [selectedCi, graphMode, selectedImpact]);

  // Node selection handler
  const handleNodeClick = (id: string) => {
    setSelectedCiId(id);
    setSelectedEdgeId(null);
    setDrawerOpen(true);
  };

  // Edge selection handler
  const handleEdgeClick = (rel: CIRelationship) => {
    setSelectedEdgeId(rel.id);
    setDrawerOpen(true);
  };

  // Attach to change action
  const handleAttachToChange = () => {
    showToast(
      "success",
      "Attached to Change Record",
      `Attached ${selectedCi?.name} and its ${selectedImpact?.dependentCis.length || 0} dependent CIs to CHG-2024-8812.`
    );
  };

  // Edge approval & rejection
  const handleApproveEdge = (relId: string) => {
    approveRelationship(relId);
    showToast("success", "Edge Approved", "Relationship verified and included in blast radius calculations.");
  };

  const handleRejectEdge = (relId: string) => {
    if (confirm("Are you sure you want to reject this discovered edge?")) {
      rejectRelationship(relId);
      if (selectedEdgeId === relId) setSelectedEdgeId(null);
      showToast("info", "Edge Rejected", "Discovered relationship removed from topology.");
    }
  };

  const handleArchiveEdge = (relId: string) => {
    if (confirm("Archive this stale relationship?")) {
      deleteRelationship(relId);
      if (selectedEdgeId === relId) setSelectedEdgeId(null);
      showToast("info", "Edge Archived", "Stale relationship archived and removed.");
    }
  };

  const handleDeleteEdge = (relId: string) => {
    if (confirm("Remove this relationship from the CMDB estate?")) {
      deleteRelationship(relId);
      if (selectedEdgeId === relId) setSelectedEdgeId(null);
      showToast("info", "Relationship Removed", "Relationship deleted successfully.");
    }
  };

  // Canvas pan & zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== canvasRef.current && (e.target as HTMLElement).closest("[role='button']")) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(1.8, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.5, +(z - 0.15).toFixed(2)));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };
  const handleFitToScreen = () => {
    setZoomLevel(0.9);
    setPanOffset({ x: 0, y: 0 });
  };

  // Tier collapse toggle
  const toggleTierCollapse = (tier: number) => {
    setCollapsedTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  };

  // Copy JSON handler
  const handleCopyJSON = () => {
    const payload = JSON.stringify(
      {
        nodes: cis.map((c) => ({
          id: c.id,
          name: c.name,
          class: c.ciClass,
          tier: getTierNumber(c.ciClass),
          revenuePerHour: c.revenuePerHour || null,
        })),
        edges: relationships.map((r) => ({
          id: r.id,
          source: r.parentCiId,
          target: r.childCiId,
          type: r.relationshipType,
          direction: r.direction,
          criticality: r.criticalityWeight,
          status: r.status || "manual",
        })),
      },
      null,
      2
    );
    navigator.clipboard.writeText(payload);
    showToast("success", "Topology Copied", "Full relationship topology copied to clipboard as JSON.");
  };

  // Add edge submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parentCiId === childCiId) {
      alert("Self-dependency prohibited: Parent CI and Child CI cannot be the same.");
      return;
    }
    const isDup = relationships.some(
      (r) => r.parentCiId === parentCiId && r.childCiId === childCiId && r.relationshipType === relType
    );
    if (isDup) {
      alert(`Duplicate edge: A '${relType}' relationship already exists between these CIs.`);
      return;
    }

    const p = cis.find((c) => c.id === parentCiId);
    const ch = cis.find((c) => c.id === childCiId);
    if (!p || !ch) return;

    addRelationship({
      parentCiId: p.id,
      parentCiName: p.name,
      parentCiClass: p.ciClass,
      childCiId: ch.id,
      childCiName: ch.name,
      childCiClass: ch.ciClass,
      relationshipType: relType,
      direction: relType === "Connects to" ? "Bidirectional" : "Downstream",
      criticalityWeight: critWeight,
      notes: notes || "Manually provisioned architectural edge",
      status: "active",
      source: "manual",
    });

    setIsAddModalOpen(false);
    setNotes("");
    showToast("success", "Relationship Added", `Linked ${p.name} to ${ch.name}`);
  };

  return (
    <div className="space-y-4">
      {/* ----------------------------------------------------------------------- */}
      {/* 1. TOP TOOLBAR & CONTROLS */}
      {/* ----------------------------------------------------------------------- */}
      <div className="p-3.5 rounded-card bg-surface border border-border shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Mode Toggle & Jump Search */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex items-center bg-sunken rounded-button p-0.5 border border-border">
            <button
              type="button"
              onClick={() => setGraphMode("upstream")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-xs text-xs font-semibold transition-all",
                graphMode === "upstream"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-text-muted hover:text-text-default"
              )}
              title="Walk upward to consumers to evaluate blast radius when this CI fails"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Upstream (Change Impact)</span>
            </button>
            <button
              type="button"
              onClick={() => setGraphMode("downstream")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-xs text-xs font-semibold transition-all",
                graphMode === "downstream"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-text-muted hover:text-text-default"
              )}
              title="Walk downward to underlying compute, databases and network to find root cause"
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Downstream (Root Cause)</span>
            </button>
          </div>

          {/* Jump to CI Search Input */}
          <div className="relative min-w-[210px]">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Jump to CI (e.g. Postgres)..."
              className="w-full pl-8 pr-7 py-1 rounded-input text-xs bg-sunken border border-border focus:border-primary focus:outline-none text-text-default placeholder:text-text-muted"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-default"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filters: Class, Tier, Edges */}
          <div className="flex items-center gap-2">
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="py-1 px-2.5 rounded-input text-xs bg-sunken border border-border text-text-default focus:border-primary focus:outline-none cursor-pointer"
            >
              <option value="">All Classes</option>
              <option value="Business Service">Business Service</option>
              <option value="Application">Application</option>
              <option value="Database">Database</option>
              <option value="Server/VM">Server/VM</option>
              <option value="Container/Pod">Container/Pod</option>
              <option value="Network Device">Network Device</option>
              <option value="Cloud Resource">Cloud Resource</option>
            </select>

            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="py-1 px-2.5 rounded-input text-xs bg-sunken border border-border text-text-default focus:border-primary focus:outline-none cursor-pointer"
            >
              <option value="">All Tiers</option>
              <option value="0">Tier 0 (Business Services)</option>
              <option value="1">Tier 1 (Applications)</option>
              <option value="2">Tier 2 (Compute & Pods)</option>
              <option value="3">Tier 3 (Databases & Storage)</option>
              <option value="4">Tier 4 (Network & Security)</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="py-1 px-2.5 rounded-input text-xs bg-sunken border border-border text-text-default focus:border-primary focus:outline-none cursor-pointer"
            >
              <option value="">All Edges ({relationships.length})</option>
              <option value="manual">Manual Edges</option>
              <option value="discovered">Discovered (AI)</option>
              <option value="pending-review">Pending Review</option>
              <option value="stale">Stale (&gt;30d)</option>
            </select>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-danger/10 text-danger hover:bg-danger/20 font-medium transition-colors"
              >
                <X className="w-3 h-3" />
                <span>Clear all ({activeFilterCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Focus Controls, Zoom, Signals, JSON, Add Edge */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Focus Toggle & Depth Controls */}
          <div className="flex items-center bg-sunken rounded-button p-0.5 border border-border">
            <button
              type="button"
              onClick={() => setFocusMode((f) => !f)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-xs text-xs font-semibold transition-all",
                focusMode
                  ? "bg-brand-500 text-white shadow-xs"
                  : "text-text-muted hover:text-text-default"
              )}
              title="Isolate focus to selected CI and its direct neighbors"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Focus {focusMode ? "ON" : "OFF"}</span>
            </button>
            {focusMode && (
              <div className="flex items-center pl-1 pr-1 border-l border-border/60 gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setFocusDepth(1)}
                  className={cn(
                    "px-1.5 py-0.5 rounded font-mono font-bold",
                    focusDepth === 1 ? "bg-primary/20 text-primary" : "text-text-muted hover:text-text-default"
                  )}
                >
                  1h
                </button>
                <button
                  type="button"
                  onClick={() => setFocusDepth(2)}
                  className={cn(
                    "px-1.5 py-0.5 rounded font-mono font-bold",
                    focusDepth === 2 ? "bg-primary/20 text-primary" : "text-text-muted hover:text-text-default"
                  )}
                >
                  2h
                </button>
                <button
                  type="button"
                  onClick={() => setFocusDepth("all")}
                  className={cn(
                    "px-1.5 py-0.5 rounded font-mono font-bold",
                    focusDepth === "all" ? "bg-primary/20 text-primary" : "text-text-muted hover:text-text-default"
                  )}
                >
                  All
                </button>
              </div>
            )}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-sunken rounded-button p-0.5 border border-border">
            <button
              onClick={handleZoomIn}
              className="p-1 rounded-button hover:bg-surface text-text-muted hover:text-text-default transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1 rounded-button hover:bg-surface text-text-muted hover:text-text-default transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-1.5 py-0.5 rounded-button hover:bg-surface text-[10px] font-mono text-text-muted hover:text-text-default"
              title="100% Zoom"
            >
              100%
            </button>
            <button
              onClick={handleFitToScreen}
              className="p-1 rounded-button hover:bg-surface text-text-muted hover:text-text-default transition-colors"
              title="Fit to Screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Live Signals Toggle */}
          <button
            type="button"
            onClick={() => setLiveTraffic((prev) => !prev)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-button text-xs border transition-all cursor-pointer",
              liveTraffic
                ? "bg-brand-500/10 border-brand-500/30 text-brand-500 font-semibold"
                : "bg-surface border-border text-text-muted hover:text-text-default"
            )}
            title="Toggle live telemetry pulse animation across nodes"
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

          {/* Copy JSON */}
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Copy className="w-3.5 h-3.5" />}
            onClick={handleCopyJSON}
            title="Copy graph topology JSON to clipboard"
          >
            Copy JSON
          </Button>

          {/* Add Edge Button (Editors Only) */}
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

      {/* ----------------------------------------------------------------------- */}
      {/* 2. PLAIN-LANGUAGE BANNER ABOVE GRAPH (ALWAYS VISIBLE) */}
      {/* ----------------------------------------------------------------------- */}
      <div
        className={cn(
          "p-3.5 rounded-card border shadow-xs space-y-2 transition-colors",
          bannerInfo.isWarning
            ? "bg-danger/10 border-danger/30 text-text-default"
            : "bg-surface border-border text-text-default"
        )}
      >
        <div className="flex items-start gap-2.5">
          <AlertCircle
            className={cn(
              "w-4 h-4 shrink-0 mt-0.5",
              bannerInfo.isWarning ? "text-danger" : "text-primary"
            )}
          />
          <div className="space-y-1.5 flex-1">
            <p className="text-xs font-semibold leading-relaxed text-text-default">
              {bannerInfo.headline}
            </p>
            {/* One-Line Legend Strip */}
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-text-muted pt-0.5 border-t border-border/40">
              <span className="font-medium text-text-secondary">top = business services</span>
              <span>&bull;</span>
              <span className="font-medium text-text-secondary">bottom = infrastructure</span>
              <span>&bull;</span>
              <span className="inline-flex items-center gap-1 text-danger font-semibold">
                <span className="w-2.5 h-2.5 rounded-xs border border-danger bg-danger/20" />
                red box = affected
              </span>
              <span>&bull;</span>
              <span className="text-danger font-mono font-bold">H1/H2/H3 = hops from failing CI</span>
              <span>&bull;</span>
              <span className="inline-flex items-center gap-1 text-danger font-semibold">
                <span className="w-4 border-b-2 border-dashed border-danger animate-pulse" />
                animated red line = failure path
              </span>
            </div>
          </div>

          {focusMode && (
            <button
              onClick={() => setFocusMode(false)}
              className="text-[11px] px-2 py-0.5 rounded bg-surface border border-border hover:bg-sunken text-primary font-semibold shrink-0"
            >
              Show full graph
            </button>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* 3. CENTER GRAPH CANVAS (8 COLS) + RIGHT PANEL (4 COLS) */}
      {/* ----------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ===================================================================== */}
        {/* GRAPH CANVAS CONTAINER (8 COLS) */}
        {/* ===================================================================== */}
        <div className="lg:col-span-8 space-y-3">
          <Card className="bg-surface border-border overflow-hidden shadow-card relative">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4">
              <div>
                <CardTitle className="text-sm font-bold">5-Tier Architectural Topology</CardTitle>
                <CardDescription className="text-xs">
                  Fixed y horizontal tier bands with directional dependency arrows and animated blast radius
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Lozenge appearance="subtle" variant="info" size="xs">
                  {filteredRelationships.length} Mapped Edges
                </Lozenge>
                <Lozenge appearance="subtle" variant="neutral" size="xs">
                  {totalVisibleNodes} Nodes
                </Lozenge>
              </div>
            </CardHeader>

            {/* Canvas Scrollable Container */}
            <div
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={cn(
                "p-4 bg-sunken/40 overflow-x-auto overflow-y-auto min-h-[620px] relative cursor-grab select-none",
                isDragging && "cursor-grabbing"
              )}
            >
              {/* Canvas Inner Container (Measured for SVG overlay coordinates) */}
              <div
                ref={canvasInnerRef}
                className="transition-transform duration-75 origin-top-left space-y-6 p-4 rounded-card bg-surface border border-border min-w-[760px] relative"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                }}
              >
                {/* ------------------------------------------------------------- */}
                {/* SVG CONNECTOR LINES & ARROWS OVERLAY */}
                {/* ------------------------------------------------------------- */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10">
                  <defs>
                    <marker
                      id="arrow-manual"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#94A3B8" />
                    </marker>
                    <marker
                      id="arrow-discovered"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#14B8A6" />
                    </marker>
                    <marker
                      id="arrow-pending"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#F59E0B" />
                    </marker>
                    <marker
                      id="arrow-stale"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748B" opacity="0.45" />
                    </marker>
                    <marker
                      id="arrow-failure"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="7"
                      markerHeight="7"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#EF4444" />
                    </marker>
                    <marker
                      id="arrow-failure-start"
                      viewBox="0 0 10 10"
                      refX="2"
                      refY="5"
                      markerWidth="7"
                      markerHeight="7"
                      orient="auto"
                    >
                      <path d="M 10 1.5 L 2 5 L 10 8.5 z" fill="#EF4444" />
                    </marker>
                    <marker
                      id="arrow-start-manual"
                      viewBox="0 0 10 10"
                      refX="2"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 10 1.5 L 2 5 L 10 8.5 z" fill="#94A3B8" />
                    </marker>
                  </defs>

                  {/* Draw each mapped relationship edge */}
                  {filteredRelationships.map((rel) => {
                    const pos1 = nodePositions.get(rel.parentCiId);
                    const pos2 = nodePositions.get(rel.childCiId);
                    if (!pos1 || !pos2) return null;

                    const isFailure = impactedEdgeIds.has(rel.id);
                    const isSelectedEdge = selectedEdgeId === rel.id;
                    const isBidirectional = rel.relationshipType === "Connects to";
                    const isStale = isEdgeStale(rel);
                    const isPending = rel.status === "pending-review" || rel.status === "pending";
                    const isDiscovered = rel.source === "discovered" && !isPending && !isStale;

                    // Focus View fading
                    const isFaded =
                      focusedNodeIds !== null &&
                      (!focusedNodeIds.has(rel.parentCiId) || !focusedNodeIds.has(rel.childCiId));

                    // In normalized dependency: parent depends on child (arrow from parent to child)
                    // If "Contains" or "Provides to", child depends on parent (arrow from child to parent)
                    let startX = pos1.x;
                    let startY = pos1.y + pos1.height / 2;
                    let endX = pos2.x;
                    let endY = pos2.y - pos2.height / 2;

                    if (rel.relationshipType === "Contains" || rel.relationshipType === "Provides to") {
                      startX = pos2.x;
                      startY = pos2.y - pos2.height / 2;
                      endX = pos1.x;
                      endY = pos1.y + pos1.height / 2;
                    }

                    // Cubic bezier curve path
                    const dy = endY - startY;
                    const c1y = startY + dy * 0.45;
                    const c2y = startY + dy * 0.55;
                    const pathData = `M ${startX} ${startY} C ${startX} ${c1y}, ${endX} ${c2y}, ${endX} ${endY}`;

                    let strokeColor = "#94A3B8";
                    let strokeDash = undefined;
                    let markerEnd = "url(#arrow-manual)";
                    let markerStart = isBidirectional ? "url(#arrow-start-manual)" : undefined;

                    if (isFailure) {
                      strokeColor = "#EF4444";
                      strokeDash = "6 4";
                      markerEnd = "url(#arrow-failure)";
                      if (isBidirectional) markerStart = "url(#arrow-failure-start)";
                    } else if (isDiscovered) {
                      strokeColor = "#14B8A6";
                      strokeDash = "6 4";
                      markerEnd = "url(#arrow-discovered)";
                    } else if (isPending) {
                      strokeColor = "#F59E0B";
                      strokeDash = "3 3";
                      markerEnd = "url(#arrow-pending)";
                    } else if (isStale) {
                      strokeColor = "#64748B";
                      strokeDash = "2 2";
                      markerEnd = "url(#arrow-stale)";
                    }

                    return (
                      <g
                        key={rel.id}
                        className={cn(
                          "transition-opacity duration-200",
                          isFaded ? "opacity-5" : isSelectedEdge ? "opacity-100" : "opacity-90"
                        )}
                      >
                        {/* Visible Line */}
                        <path
                          d={pathData}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={isFailure || isSelectedEdge ? 3.5 : 2}
                          strokeDasharray={strokeDash}
                          strokeOpacity={isStale ? 0.45 : 1}
                          markerEnd={markerEnd}
                          markerStart={markerStart}
                          className={cn(
                            isFailure && liveTraffic && "animate-pulse"
                          )}
                        />
                        {/* Invisible wider clickable hit-path */}
                        <path
                          d={pathData}
                          fill="none"
                          stroke="transparent"
                          strokeWidth={20}
                          className="pointer-events-auto cursor-pointer"
                          onClick={() => handleEdgeClick(rel)}
                        >
                          <title>{`${rel.parentCiName} -> ${rel.childCiName} (${rel.relationshipType})`}</title>
                        </path>
                      </g>
                    );
                  })}
                </svg>

                {/* ------------------------------------------------------------- */}
                {/* TIER 0: BUSINESS SERVICES */}
                {/* ------------------------------------------------------------- */}
                <div className="space-y-2 relative z-20">
                  <div className="flex items-center justify-between border-b border-primary/20 pb-1">
                    <button
                      type="button"
                      onClick={() => toggleTierCollapse(0)}
                      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary hover:underline"
                    >
                      {collapsedTiers.has(0) ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      <span>Tier 0 &bull; Business Services & APIs</span>
                    </button>
                    <span className="text-[10px] text-text-muted">Top-level user outcomes</span>
                  </div>

                  {!collapsedTiers.has(0) && (
                    <div className="flex flex-wrap gap-3">
                      {safeTier0.map((node) => {
                        const isSelected = node.id === selectedCiId;
                        const isImpacted = impactedNodeIds.has(node.id);
                        const hop = nodeHopMap.get(node.id);
                        const isFaded = focusedNodeIds !== null && !focusedNodeIds.has(node.id);

                        return (
                          <div
                            key={node.id}
                            ref={(el) => {
                              if (el) nodeRefs.current.set(node.id, el);
                              else nodeRefs.current.delete(node.id);
                            }}
                            tabIndex={0}
                            role="button"
                            aria-selected={isSelected}
                            onClick={() => handleNodeClick(node.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") handleNodeClick(node.id);
                            }}
                            className={cn(
                              "p-3 rounded-card text-left transition-all duration-150 min-w-[195px] max-w-xs border border-l-4 cursor-pointer outline-none relative",
                              "border-l-brand-blue",
                              isSelected
                                ? "bg-selected-bg border-primary ring-2 ring-primary/60 shadow-glass-hover"
                                : isImpacted
                                ? "bg-danger/10 border-danger ring-2 ring-danger/40 shadow-xs"
                                : "bg-surface border-border hover:border-border-strong hover:bg-sunken",
                              isFaded && "opacity-25 hover:opacity-100 hover:filter-none transition-all cursor-pointer filter grayscale(75%)"
                            )}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono text-[10px] text-text-muted flex items-center gap-1">
                                {getClassIcon(node.ciClass)}
                                {node.id}
                              </span>
                              <div className="flex items-center gap-1">
                                {isImpacted && hop !== undefined && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-danger text-white">
                                    H{hop}
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-primary text-white">
                                    SOURCE
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    node.operationalStatus === "Operational" ? "bg-success" : "bg-warning",
                                    liveTraffic && "animate-ping"
                                  )}
                                />
                              </div>
                            </div>
                            <p className="font-semibold text-xs text-text-default truncate">{node.name}</p>
                            <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                              <span className="text-warning font-bold">
                                {node.revenuePerHour ? `$${node.revenuePerHour.toLocaleString()}/hr` : "Revenue: Not set"}
                              </span>
                              <TrustScoreBadge score={node.trustScore} showLabel={false} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ------------------------------------------------------------- */}
                {/* TIER 1: APPLICATIONS & MICROSERVICES */}
                {/* ------------------------------------------------------------- */}
                <div className="space-y-2 relative z-20">
                  <div className="flex items-center justify-between border-b border-purple-500/20 pb-1">
                    <button
                      type="button"
                      onClick={() => toggleTierCollapse(1)}
                      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-purple-400 hover:underline"
                    >
                      {collapsedTiers.has(1) ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      <span>Tier 1 &bull; Applications & Microservices</span>
                    </button>
                    <span className="text-[10px] text-text-muted">Application runtime logic</span>
                  </div>

                  {!collapsedTiers.has(1) && (
                    <div className="flex flex-wrap gap-3">
                      {safeTier1.map((node) => {
                        const isSelected = node.id === selectedCiId;
                        const isImpacted = impactedNodeIds.has(node.id);
                        const hop = nodeHopMap.get(node.id);
                        const isFaded = focusedNodeIds !== null && !focusedNodeIds.has(node.id);

                        return (
                          <div
                            key={node.id}
                            ref={(el) => {
                              if (el) nodeRefs.current.set(node.id, el);
                              else nodeRefs.current.delete(node.id);
                            }}
                            tabIndex={0}
                            role="button"
                            aria-selected={isSelected}
                            onClick={() => handleNodeClick(node.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") handleNodeClick(node.id);
                            }}
                            className={cn(
                              "p-3 rounded-card text-left transition-all duration-150 min-w-[195px] max-w-xs border border-l-4 cursor-pointer outline-none relative",
                              "border-l-purple-500",
                              isSelected
                                ? "bg-selected-bg border-primary ring-2 ring-primary/60 shadow-glass-hover"
                                : isImpacted
                                ? "bg-danger/10 border-danger ring-2 ring-danger/40 shadow-xs"
                                : "bg-surface border-border hover:border-border-strong hover:bg-sunken",
                              isFaded && "opacity-25 hover:opacity-100 hover:filter-none transition-all cursor-pointer filter grayscale(75%)"
                            )}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono text-[10px] text-text-muted flex items-center gap-1">
                                {getClassIcon(node.ciClass)}
                                {node.id}
                              </span>
                              <div className="flex items-center gap-1">
                                {isImpacted && hop !== undefined && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-danger text-white">
                                    H{hop}
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-primary text-white">
                                    SOURCE
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    node.operationalStatus === "Operational" ? "bg-success" : "bg-warning",
                                    liveTraffic && "animate-ping"
                                  )}
                                />
                              </div>
                            </div>
                            <p className="font-semibold text-xs text-text-default truncate">{node.name}</p>
                            <div className="flex items-center justify-between mt-1 text-[10px] text-text-muted font-mono">
                              <span>Tier 1 infrastructure</span>
                              <OperationalBadge status={node.operationalStatus} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ------------------------------------------------------------- */}
                {/* TIER 2: COMPUTE & CONTAINERS */}
                {/* ------------------------------------------------------------- */}
                <div className="space-y-2 relative z-20">
                  <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1">
                    <button
                      type="button"
                      onClick={() => toggleTierCollapse(2)}
                      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-400 hover:underline"
                    >
                      {collapsedTiers.has(2) ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      <span>Tier 2 &bull; Compute & Containers</span>
                    </button>
                    <span className="text-[10px] text-text-muted">Workload virtualization</span>
                  </div>

                  {!collapsedTiers.has(2) && (
                    <div className="flex flex-wrap gap-3">
                      {safeTier2.map((node) => {
                        const isSelected = node.id === selectedCiId;
                        const isImpacted = impactedNodeIds.has(node.id);
                        const hop = nodeHopMap.get(node.id);
                        const isFaded = focusedNodeIds !== null && !focusedNodeIds.has(node.id);

                        return (
                          <div
                            key={node.id}
                            ref={(el) => {
                              if (el) nodeRefs.current.set(node.id, el);
                              else nodeRefs.current.delete(node.id);
                            }}
                            tabIndex={0}
                            role="button"
                            aria-selected={isSelected}
                            onClick={() => handleNodeClick(node.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") handleNodeClick(node.id);
                            }}
                            className={cn(
                              "p-3 rounded-card text-left transition-all duration-150 min-w-[195px] max-w-xs border border-l-4 cursor-pointer outline-none relative",
                              "border-l-cyan-500",
                              isSelected
                                ? "bg-selected-bg border-primary ring-2 ring-primary/60 shadow-glass-hover"
                                : isImpacted
                                ? "bg-danger/10 border-danger ring-2 ring-danger/40 shadow-xs"
                                : "bg-surface border-border hover:border-border-strong hover:bg-sunken",
                              isFaded && "opacity-25 hover:opacity-100 hover:filter-none transition-all cursor-pointer filter grayscale(75%)"
                            )}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono text-[10px] text-text-muted flex items-center gap-1">
                                {getClassIcon(node.ciClass)}
                                {node.id}
                              </span>
                              <div className="flex items-center gap-1">
                                {isImpacted && hop !== undefined && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-danger text-white">
                                    H{hop}
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-primary text-white">
                                    SOURCE
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    node.operationalStatus === "Operational" ? "bg-success" : "bg-warning",
                                    liveTraffic && "animate-ping"
                                  )}
                                />
                              </div>
                            </div>
                            <p className="font-semibold text-xs text-text-default truncate">{node.name}</p>
                            <div className="flex items-center justify-between mt-1 text-[10px] text-text-muted font-mono">
                              <span>Tier 2 infrastructure</span>
                              <OperationalBadge status={node.operationalStatus} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ------------------------------------------------------------- */}
                {/* TIER 3: DATABASES & STORAGE */}
                {/* ------------------------------------------------------------- */}
                <div className="space-y-2 relative z-20">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1">
                    <button
                      type="button"
                      onClick={() => toggleTierCollapse(3)}
                      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400 hover:underline"
                    >
                      {collapsedTiers.has(3) ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      <span>Tier 3 &bull; Databases & Storage</span>
                    </button>
                    <span className="text-[10px] text-text-muted">Persistence layer</span>
                  </div>

                  {!collapsedTiers.has(3) && (
                    <div className="flex flex-wrap gap-3">
                      {safeTier3.map((node) => {
                        const isSelected = node.id === selectedCiId;
                        const isImpacted = impactedNodeIds.has(node.id);
                        const hop = nodeHopMap.get(node.id);
                        const isFaded = focusedNodeIds !== null && !focusedNodeIds.has(node.id);

                        return (
                          <div
                            key={node.id}
                            ref={(el) => {
                              if (el) nodeRefs.current.set(node.id, el);
                              else nodeRefs.current.delete(node.id);
                            }}
                            tabIndex={0}
                            role="button"
                            aria-selected={isSelected}
                            onClick={() => handleNodeClick(node.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") handleNodeClick(node.id);
                            }}
                            className={cn(
                              "p-3 rounded-card text-left transition-all duration-150 min-w-[195px] max-w-xs border border-l-4 cursor-pointer outline-none relative",
                              "border-l-emerald-500",
                              isSelected
                                ? "bg-selected-bg border-primary ring-2 ring-primary/60 shadow-glass-hover"
                                : isImpacted
                                ? "bg-danger/10 border-danger ring-2 ring-danger/40 shadow-xs"
                                : "bg-surface border-border hover:border-border-strong hover:bg-sunken",
                              isFaded && "opacity-25 hover:opacity-100 hover:filter-none transition-all cursor-pointer filter grayscale(75%)"
                            )}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono text-[10px] text-text-muted flex items-center gap-1">
                                {getClassIcon(node.ciClass)}
                                {node.id}
                              </span>
                              <div className="flex items-center gap-1">
                                {isImpacted && hop !== undefined && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-danger text-white">
                                    H{hop}
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-primary text-white">
                                    SOURCE
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    node.operationalStatus === "Operational" ? "bg-success" : "bg-warning",
                                    liveTraffic && "animate-ping"
                                  )}
                                />
                              </div>
                            </div>
                            <p className="font-semibold text-xs text-text-default truncate">{node.name}</p>
                            <div className="flex items-center justify-between mt-1 text-[10px] text-text-muted font-mono">
                              <span>Tier 3 infrastructure</span>
                              <OperationalBadge status={node.operationalStatus} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ------------------------------------------------------------- */}
                {/* TIER 4: NETWORK & SECURITY */}
                {/* ------------------------------------------------------------- */}
                <div className="space-y-2 relative z-20">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-1">
                    <button
                      type="button"
                      onClick={() => toggleTierCollapse(4)}
                      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-400 hover:underline"
                    >
                      {collapsedTiers.has(4) ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      <span>Tier 4 &bull; Network & Security</span>
                    </button>
                    <span className="text-[10px] text-text-muted">Edge routing & perimeter</span>
                  </div>

                  {!collapsedTiers.has(4) && (
                    <div className="flex flex-wrap gap-3">
                      {safeTier4.map((node) => {
                        const isSelected = node.id === selectedCiId;
                        const isImpacted = impactedNodeIds.has(node.id);
                        const hop = nodeHopMap.get(node.id);
                        const isFaded = focusedNodeIds !== null && !focusedNodeIds.has(node.id);

                        return (
                          <div
                            key={node.id}
                            ref={(el) => {
                              if (el) nodeRefs.current.set(node.id, el);
                              else nodeRefs.current.delete(node.id);
                            }}
                            tabIndex={0}
                            role="button"
                            aria-selected={isSelected}
                            onClick={() => handleNodeClick(node.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") handleNodeClick(node.id);
                            }}
                            className={cn(
                              "p-3 rounded-card text-left transition-all duration-150 min-w-[195px] max-w-xs border border-l-4 cursor-pointer outline-none relative",
                              "border-l-amber-500",
                              isSelected
                                ? "bg-selected-bg border-primary ring-2 ring-primary/60 shadow-glass-hover"
                                : isImpacted
                                ? "bg-danger/10 border-danger ring-2 ring-danger/40 shadow-xs"
                                : "bg-surface border-border hover:border-border-strong hover:bg-sunken",
                              isFaded && "opacity-25 hover:opacity-100 hover:filter-none transition-all cursor-pointer filter grayscale(75%)"
                            )}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono text-[10px] text-text-muted flex items-center gap-1">
                                {getClassIcon(node.ciClass)}
                                {node.id}
                              </span>
                              <div className="flex items-center gap-1">
                                {isImpacted && hop !== undefined && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-danger text-white">
                                    H{hop}
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-primary text-white">
                                    SOURCE
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    node.operationalStatus === "Operational" ? "bg-success" : "bg-warning",
                                    liveTraffic && "animate-ping"
                                  )}
                                />
                              </div>
                            </div>
                            <p className="font-semibold text-xs text-text-default truncate">{node.name}</p>
                            <div className="flex items-center justify-between mt-1 text-[10px] text-text-muted font-mono">
                              <span>Tier 4 infrastructure</span>
                              <OperationalBadge status={node.operationalStatus} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* ------------------------------------------------------------------- */}
          {/* 4. LEGEND STRIP UNDER CANVAS FOR EDGE STYLES */}
          {/* ------------------------------------------------------------------- */}
          <div className="flex items-center justify-between p-2.5 rounded-card bg-surface border border-border text-[11px] text-text-muted flex-wrap gap-2">
            <span className="font-semibold text-text-secondary">Edge Styles:</span>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-slate-400" /> Manual (solid)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 border-b-2 border-dashed border-teal-500" /> Discovered (AI)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 border-b-2 border-dotted border-amber-500" /> Pending Review
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 border-b-2 border-dotted border-slate-500 opacity-40" /> Stale (&gt;30d)
              </span>
              <span className="flex items-center gap-1.5 text-danger font-semibold">
                <span className="w-4 border-b-2 border-dashed border-danger animate-pulse" /> Failure Path (animated)
              </span>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* RIGHT PANEL: RANKED BUSINESS SERVICES / QUICK INSPECTION (4 COLS) */}
        {/* ===================================================================== */}
        <div className="lg:col-span-4 space-y-4">
          {/* Ranked Business Service Risk Card */}
          <Card className="bg-surface border-border shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">Ranked Business Service Risk</CardTitle>
                <Lozenge appearance="subtle" variant="danger" size="xs">
                  Financial Exposure
                </Lozenge>
              </div>
              <CardDescription className="text-xs">
                Dynamic downtime revenue exposure calculated from business services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {rankedImpacts.map((svc) => (
                <div
                  key={svc.id}
                  onClick={() => handleNodeClick(svc.id)}
                  className={cn(
                    "p-2.5 rounded-card border transition-all cursor-pointer flex flex-col gap-1.5",
                    svc.id === selectedCiId
                      ? "bg-selected-bg border-primary ring-1 ring-primary/40 shadow-xs"
                      : "bg-sunken/40 border-border hover:border-border-strong hover:bg-sunken"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-default truncate">{svc.serviceName}</span>
                    <span className="font-mono font-bold text-warning text-xs">{svc.revenueDisplay}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-text-muted">
                    <span>{svc.ciCount} Linked CIs</span>
                    <Lozenge appearance="subtle" variant={svc.tier === "Tier 0" ? "danger" : "info"} size="xs">
                      {svc.criticality}
                    </Lozenge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Selected Node Quick Info & Trigger for Drawer */}
          {selectedCi && (
            <Card className="bg-surface border-border shadow-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold truncate">Selected: {selectedCi.name}</CardTitle>
                  <span className="font-mono text-xs text-text-muted">{selectedCi.id}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {selectedImpact && graphMode === "upstream" && (
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
                      <span className="font-bold text-xs">Blast Radius: {selectedImpact.riskLevel}</span>
                      <span className="font-mono font-bold text-xs">{selectedImpact.blastRadiusScore}/100</span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-snug">
                      {selectedImpact.riskExplanation}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 gap-2">
                  <Button size="sm" variant="primary" onClick={handleAttachToChange}>
                    Attach to Change
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDrawerOpen(true)}>
                    Inspection Drawer &rarr;
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* 5. SLIDE-OVER INSPECTION DRAWER (CI CLICKED OR EDGE CLICKED) */}
      {/* ----------------------------------------------------------------------- */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedEdgeId(null);
        }}
        title={
          selectedEdge
            ? `Relationship: ${selectedEdge.id}`
            : selectedCi
            ? `${selectedCi.name} (${selectedCi.id})`
            : "Inspection"
        }
        size="xl"
      >
        <div className="space-y-4 text-xs text-text-default">
          {/* =================================================================== */}
          {/* A. EDGE DETAILS DRAWER VIEW (WHEN AN EDGE IS CLICKED) */}
          {/* =================================================================== */}
          {selectedEdge ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <span className="font-mono font-bold text-sm text-text-default">{selectedEdge.id}</span>
                  <p className="text-text-muted text-[11px]">
                    {selectedEdge.parentCiName} &rarr; {selectedEdge.childCiName}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lozenge
                    appearance="subtle"
                    variant={
                      selectedEdge.status === "pending-review" || selectedEdge.status === "pending"
                        ? "warning"
                        : selectedEdge.status === "stale"
                        ? "danger"
                        : "success"
                    }
                  >
                    {selectedEdge.status || "manual"}
                  </Lozenge>
                  <CriticalityBadge criticality={`Tier 1 - ${selectedEdge.criticalityWeight}` as any} />
                </div>
              </div>

              {/* Edge Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-card bg-sunken/60 border border-border">
                <div>
                  <span className="text-[10px] text-text-muted block">Source / Parent CI</span>
                  <span className="font-semibold text-text-default">{selectedEdge.parentCiName}</span>
                  <span className="font-mono text-[10px] text-text-muted block">({selectedEdge.parentCiId})</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block">Target / Child CI</span>
                  <span className="font-semibold text-text-default">{selectedEdge.childCiName}</span>
                  <span className="font-mono text-[10px] text-text-muted block">({selectedEdge.childCiId})</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block">Relationship Type</span>
                  <span className="font-medium text-text-default">{selectedEdge.relationshipType}</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block">Direction</span>
                  <span className="font-medium text-text-default">{selectedEdge.direction}</span>
                </div>
                {selectedEdge.confidence && (
                  <div>
                    <span className="text-[10px] text-text-muted block">Discovery Confidence</span>
                    <span className="font-mono font-bold text-brand-cyan">
                      {Math.round(selectedEdge.confidence * 100)}%
                    </span>
                  </div>
                )}
                {selectedEdge.lastSeen && (
                  <div>
                    <span className="text-[10px] text-text-muted block">Last Observed</span>
                    <span className="font-mono text-[10px] text-text-default">
                      {new Date(selectedEdge.lastSeen).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Plain Language Explanation */}
              <div className="p-3 rounded-card bg-surface border border-border space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Architectural Rationale
                </span>
                <p className="text-text-default text-xs leading-relaxed">
                  {selectedEdge.notes ||
                    `${selectedEdge.parentCiName} is linked to ${selectedEdge.childCiName} via a ${selectedEdge.relationshipType} relationship.`}
                </p>
              </div>

              {/* Actions for Editors */}
              {canEdit && (
                <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                  {(selectedEdge.status === "pending-review" || selectedEdge.status === "pending") ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        leftIcon={<Check className="w-3.5 h-3.5" />}
                        onClick={() => handleApproveEdge(selectedEdge.id)}
                      >
                        Approve Edge
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        leftIcon={<X className="w-3.5 h-3.5" />}
                        onClick={() => handleRejectEdge(selectedEdge.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : isEdgeStale(selectedEdge) ? (
                    <Button
                      size="sm"
                      variant="danger"
                      leftIcon={<Archive className="w-3.5 h-3.5" />}
                      onClick={() => handleArchiveEdge(selectedEdge.id)}
                    >
                      Archive Stale Edge
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="danger"
                      leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                      onClick={() => handleDeleteEdge(selectedEdge.id)}
                    >
                      Remove Relationship
                    </Button>
                  )}

                  <Button size="sm" variant="outline" onClick={() => setSelectedEdgeId(null)}>
                    Back to Node
                  </Button>
                </div>
              )}
            </div>
          ) : selectedCi ? (
            /* =================================================================== */
            /* B. CI INSPECTION DRAWER VIEW (WHEN A NODE IS CLICKED) */
            /* =================================================================== */
            <div className="space-y-4">
              {/* Header info */}
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
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

              {/* Upstream Mode: Blast Radius Score & Revenue Metric Tiles */}
              {graphMode === "upstream" && selectedImpact && (
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
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          selectedImpact.riskLevel === "Severe"
                            ? "bg-danger text-white"
                            : selectedImpact.riskLevel === "High"
                            ? "bg-warning text-black"
                            : "bg-primary text-white"
                        )}
                      >
                        {selectedImpact.riskLevel}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          selectedImpact.riskLevel === "Severe"
                            ? "bg-danger"
                            : selectedImpact.riskLevel === "High"
                            ? "bg-warning"
                            : "bg-primary"
                        )}
                        style={{ width: `${selectedImpact.blastRadiusScore}%` }}
                      />
                    </div>

                    <p className="text-xs text-text-secondary leading-relaxed pt-1">
                      {selectedImpact.riskExplanation}
                    </p>
                  </div>

                  {/* Impact Metric Tiles */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-card bg-sunken/60 border border-border">
                      <span className="text-[10px] text-text-muted uppercase block font-semibold">
                        Impacted CIs
                      </span>
                      <span className="font-mono font-bold text-lg text-text-default">
                        {selectedImpact.dependentCis.length}
                      </span>
                      <span className="text-[10px] text-text-muted block">
                        across {selectedImpact.affectedBusinessServices.length} business services
                      </span>
                    </div>

                    <div className="p-3 rounded-card bg-sunken/60 border border-border">
                      <span className="text-[10px] text-text-muted uppercase block font-semibold">
                        Revenue At Risk
                      </span>
                      <span className="font-mono font-bold text-lg text-warning">
                        ${selectedImpact.revenueAtRisk?.toLocaleString() || 0}/hr
                      </span>
                      <span className="text-[10px] text-text-muted block">instant downtime exposure</span>
                    </div>
                  </div>

                  {/* Propagation Path Sequence */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-xs uppercase tracking-wider text-text-secondary">
                      Propagation Path Sequence ({selectedImpact.dependentCis.length})
                    </h5>

                    {selectedImpact.dependentCis.length === 0 ? (
                      <div className="p-3 rounded-card bg-sunken text-center text-text-muted text-xs">
                        No upstream consumers affected by this CI.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {selectedImpact.dependentCis.map((dep, idx) => (
                          <div
                            key={`${dep.ci.id}-${idx}`}
                            className="p-2.5 rounded-card bg-sunken/50 border border-border space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-text-default flex items-center gap-1.5">
                                {getClassIcon(dep.ci.ciClass)}
                                {dep.ci.name}
                              </span>
                              <span className="px-1.5 py-0.5 rounded font-mono text-[9px] bg-danger/10 text-danger font-bold">
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
                                      "px-1.5 py-0.2 rounded border border-border",
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

              {/* Downstream Mode: Root Cause Candidates */}
              {graphMode === "downstream" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-card bg-primary/10 border border-primary/30 space-y-1">
                    <span className="font-bold text-xs text-text-default">Downstream Root Cause Analysis</span>
                    <p className="text-[11px] text-text-secondary leading-snug">
                      Tracing all infrastructure providers and storage dependencies that {selectedCi.name} relies upon.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-xs uppercase tracking-wider text-text-secondary">
                      Root Cause Candidates ({selectedImpact?.dependentCis.length || 0})
                    </h5>

                    {(!selectedImpact || selectedImpact.dependentCis.length === 0) ? (
                      <div className="p-3 rounded-card bg-sunken text-center text-text-muted text-xs">
                        This CI does not depend on any underlying infrastructure components.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {selectedImpact.dependentCis.map((dep, idx) => (
                          <div
                            key={`${dep.ci.id}-${idx}`}
                            className="p-2.5 rounded-card bg-sunken/50 border border-border space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-text-default flex items-center gap-1.5">
                                {getClassIcon(dep.ci.ciClass)}
                                {dep.ci.name}
                              </span>
                              <span className="font-mono text-[9px] text-text-muted">Hop {dep.depth}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-mono text-text-muted">
                              <span>Path:</span>
                              {dep.path.map((step, sIdx) => (
                                <React.Fragment key={step}>
                                  <span className="px-1 py-0.2 rounded bg-surface border border-border">{step}</span>
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

              {/* Focus View Toggle & Split Relationships */}
              <div className="pt-2 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFocusMode((f) => !f)}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold border transition-all",
                        focusMode ? "bg-brand-500 text-white border-brand-500" : "bg-sunken text-text-muted border-border"
                      )}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>Focus: {focusMode ? "ON" : "OFF"}</span>
                    </button>
                    {focusMode && (
                      <span className="text-[11px] text-text-muted">
                        Depth: {focusDepth === "all" ? "All hops" : `${focusDepth} hop`}
                      </span>
                    )}
                  </div>

                  {focusMode && (
                    <button
                      onClick={() => setFocusMode(false)}
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      Show full graph
                    </button>
                  )}
                </div>

                {/* Split Relationship Lists */}
                <div className="space-y-3 pt-1">
                  {/* Depends on (Outgoing Dependencies) */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1">
                      <ArrowDownLeft className="w-3 h-3 text-cyan-400" />
                      Depends on ({nodeRelBreakdown.dependsOn.length})
                    </span>
                    {nodeRelBreakdown.dependsOn.length === 0 ? (
                      <p className="text-[11px] text-text-muted italic pl-1">No outgoing dependencies</p>
                    ) : (
                      <div className="space-y-1 max-h-[140px] overflow-y-auto">
                        {nodeRelBreakdown.dependsOn.map((item) => (
                          <div
                            key={item.ci.id}
                            onClick={() => handleNodeClick(item.ci.id)}
                            className="p-2 rounded bg-sunken/60 hover:bg-sunken border border-border/80 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              {getClassIcon(item.ci.ciClass)}
                              <span className="font-semibold text-xs text-text-default truncate">{item.ci.name}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] text-text-muted font-mono">{item.relType}</span>
                              <Lozenge appearance="subtle" size="xs" variant={item.criticality === "Critical" ? "danger" : "info"}>
                                {item.criticality}
                              </Lozenge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Used by (Incoming Dependents) */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3 text-primary" />
                      Used by ({nodeRelBreakdown.usedBy.length})
                    </span>
                    {nodeRelBreakdown.usedBy.length === 0 ? (
                      <p className="text-[11px] text-text-muted italic pl-1">No incoming dependents</p>
                    ) : (
                      <div className="space-y-1 max-h-[140px] overflow-y-auto">
                        {nodeRelBreakdown.usedBy.map((item) => (
                          <div
                            key={item.ci.id}
                            onClick={() => handleNodeClick(item.ci.id)}
                            className="p-2 rounded bg-sunken/60 hover:bg-sunken border border-border/80 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              {getClassIcon(item.ci.ciClass)}
                              <span className="font-semibold text-xs text-text-default truncate">{item.ci.name}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] text-text-muted font-mono">{item.relType}</span>
                              <Lozenge appearance="subtle" size="xs" variant={item.criticality === "Critical" ? "danger" : "info"}>
                                {item.criticality}
                              </Lozenge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border flex items-center justify-between gap-2 sticky bottom-0 bg-surface/95 backdrop-blur-xs py-2">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="primary" onClick={handleAttachToChange}>
                    Attach to Change
                  </Button>
                  <Link href={`/cis/${selectedCi.id}`}>
                    <Button size="sm" variant="outline">
                      Full Profile &rarr;
                    </Button>
                  </Link>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setDrawerOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Drawer>

      {/* ----------------------------------------------------------------------- */}
      {/* 6. ADD EDGE MODAL */}
      {/* ----------------------------------------------------------------------- */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add Architectural Relationship"
          maxWidth="md"
        >
          <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-text-default mb-1">Source / Parent CI</label>
              <select
                value={parentCiId}
                onChange={(e) => setParentCiId(e.target.value)}
                className="w-full p-2 rounded-input bg-sunken border border-border text-text-default text-xs"
              >
                {cis.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id} - {c.ciClass})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-text-default mb-1">Target / Child CI</label>
              <select
                value={childCiId}
                onChange={(e) => setChildCiId(e.target.value)}
                className="w-full p-2 rounded-input bg-sunken border border-border text-text-default text-xs"
              >
                {cis.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id} - {c.ciClass})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-text-default mb-1">Relationship Type</label>
                <select
                  value={relType}
                  onChange={(e) => setRelType(e.target.value as RelationshipType)}
                  className="w-full p-2 rounded-input bg-sunken border border-border text-text-default text-xs"
                >
                  <option value="Depends on">Depends on</option>
                  <option value="Runs on">Runs on</option>
                  <option value="Hosted on">Hosted on</option>
                  <option value="Connects to">Connects to</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-text-default mb-1">Criticality</label>
                <select
                  value={critWeight}
                  onChange={(e) => setCritWeight(e.target.value as CriticalityWeight)}
                  className="w-full p-2 rounded-input bg-sunken border border-border text-text-default text-xs"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-text-default mb-1">Architectural Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe dependency context..."
                className="w-full p-2 rounded-input bg-sunken border border-border text-text-default text-xs h-18 resize-none"
              />
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" variant="primary">
                Add Relationship
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
