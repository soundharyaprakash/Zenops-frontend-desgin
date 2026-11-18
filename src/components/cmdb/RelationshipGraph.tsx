"use client";

import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { CIRelationship, CIItem, RelationshipType, DirectionType, CriticalityWeight } from "@/types/cmdb";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Lozenge, OperationalBadge, CriticalityBadge, TrustScoreBadge } from "@/components/ui/Lozenge";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { useCMDB } from "@/context/cmdb-context";
import { cn } from "@/lib/utils";

type GraphMode = "upstream" | "downstream";

interface ServiceImpactRank {
  serviceName: string;
  ciCount: number;
  revenuePerHour: string;
  tier: string;
  criticality: string;
}

export function RelationshipGraph() {
  const { cis, relationships, addRelationship, deleteRelationship, getImpactAnalysis, userRole, activeTenant, showToast } =
    useCMDB();

  const [selectedCiId, setSelectedCiId] = useState<string>(relationships[0]?.parentCiId || cis[0]?.id || "");
  const [filterType, setFilterType] = useState<string>("");
  const [graphMode, setGraphMode] = useState<GraphMode>("upstream");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [liveTraffic, setLiveTraffic] = useState<boolean>(true);

  // New relationship form state
  const [parentCiId, setParentCiId] = useState(cis[0]?.id || "");
  const [childCiId, setChildCiId] = useState(cis[1]?.id || "");
  const [relType, setRelType] = useState<RelationshipType>("Depends on");
  const [direction, setDirection] = useState<DirectionType>("Downstream");
  const [critWeight, setCritWeight] = useState<CriticalityWeight>("High");
  const [notes, setNotes] = useState("");

  const filteredRelationships = filterType
    ? relationships.filter((r) => r.relationshipType === filterType)
    : relationships;

  const selectedCi = cis.find((c) => c.id === selectedCiId);
  const selectedParents = relationships.filter((r) => r.childCiId === selectedCiId);
  const selectedChildren = relationships.filter((r) => r.parentCiId === selectedCiId);
  const selectedImpact = selectedCi ? getImpactAnalysis(selectedCi.id) : null;

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

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parentCiId === childCiId) {
      alert("Parent CI and Child CI cannot be the same.");
      return;
    }
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
    });

    setIsAddModalOpen(false);
    setNotes("");
    showToast("success", "Relationship Added", `Linked ${parentCi.name} to ${childCi.name}`);
  };

  // ---------------------------------------------------------------------------
  // 5 ARCHITECTURAL TIERS
  // ---------------------------------------------------------------------------
  const tier0CIs = cis.filter(
    (c) => c.ciClass === "Business Service" || c.ciClass === "Service Offering"
  );
  const tier1CIs = cis.filter((c) => c.ciClass === "Application" || c.ciClass === "SaaS Subscription");
  const tier2CIs = cis.filter((c) => c.ciClass === "Container/Pod" || c.ciClass === "Server/VM");
  const tier3CIs = cis.filter((c) => c.ciClass === "Database");
  const tier4CIs = cis.filter(
    (c) => c.ciClass === "Network Device" || c.ciClass === "Cloud Resource"
  );

  // Fallback demo CIs if empty in current tenant
  const safeTier0 = tier0CIs.length > 0 ? tier0CIs : cis.slice(0, 2);
  const safeTier1 = tier1CIs.length > 0 ? tier1CIs : cis.slice(2, 4);
  const safeTier2 = tier2CIs.length > 0 ? tier2CIs : cis.slice(4, 7);
  const safeTier3 = tier3CIs.length > 0 ? tier3CIs : cis.slice(7, 9);
  const safeTier4 = tier4CIs.length > 0 ? tier4CIs : cis.slice(9, 12);

  // Ranked revenue impact list
  const rankedImpacts: ServiceImpactRank[] = [
    { serviceName: "Payments API", ciCount: 18, revenuePerHour: "$85,000/hr", tier: "Tier 0", criticality: "Mission Critical" },
    { serviceName: "Customer Web Portal", ciCount: 24, revenuePerHour: "$42,000/hr", tier: "Tier 1", criticality: "Business Critical" },
    { serviceName: "Order Processing", ciCount: 14, revenuePerHour: "$28,000/hr", tier: "Tier 1", criticality: "Business Critical" },
    { serviceName: "Enterprise Data Warehouse", ciCount: 9, revenuePerHour: "$12,000/hr", tier: "Tier 2", criticality: "Operational" },
    { serviceName: "Legacy HR System", ciCount: 6, revenuePerHour: "$4,500/hr", tier: "Tier 2", criticality: "Internal" },
  ];

  return (
    <div className="space-y-4 text-text-default pb-12">
      {/* ----------------------------------------------------------------------- */}
      {/* TOP CONTROLS & MODE TOGGLE */}
      {/* ----------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3.5 rounded-lg border border-border shadow-card">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switcher: Upstream vs Downstream */}
          <div className="inline-flex rounded border border-border bg-sunken p-0.5 text-xs">
            <button
              onClick={() => setGraphMode("upstream")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded font-semibold transition-all",
                graphMode === "upstream"
                  ? "bg-primary text-white shadow-xs"
                  : "text-text-secondary hover:text-text-default"
              )}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Upstream (Change Impact)
            </button>
            <button
              onClick={() => setGraphMode("downstream")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded font-semibold transition-all",
                graphMode === "downstream"
                  ? "bg-primary text-white shadow-xs"
                  : "text-text-secondary hover:text-text-default"
              )}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              Downstream (Root Cause)
            </button>
          </div>

          {/* Filter by Rel Type */}
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Filter className="w-3.5 h-3.5 text-text-muted" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-surface border border-border rounded px-2 py-1 text-xs text-text-default focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="">All Edges ({relationships.length})</option>
              <option value="Depends on">Depends on</option>
              <option value="Hosted on">Hosted on</option>
              <option value="Runs on">Runs on</option>
              <option value="Connects to">Connects to</option>
            </select>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border-l border-border pl-2.5">
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
              className="p-1 rounded bg-sunken hover:bg-sunken/80 border border-border text-text-muted hover:text-text-default transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))}
              className="p-1 rounded bg-sunken hover:bg-sunken/80 border border-border text-text-muted hover:text-text-default transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 rounded bg-sunken hover:bg-sunken/80 border border-border text-text-muted hover:text-text-default transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-text-muted pl-1">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>

          {/* Live Signals & Traffic Simulation Toggle */}
          <button
            type="button"
            onClick={() => setLiveTraffic((prev) => !prev)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-all duration-150 cursor-pointer",
              liveTraffic
                ? "bg-brand-blue/10 border-brand-blue/40 text-brand-blue font-semibold shadow-2xs"
                : "bg-surface border-border text-text-muted hover:text-text-default"
            )}
            title="Toggle live telemetry traffic pulse animation across tiers"
          >
            <Activity className={cn("w-3.5 h-3.5", liveTraffic && "animate-pulse text-brand-cyan")} />
            <span>Live Signals</span>
            <span className={cn("w-1.5 h-1.5 rounded-full", liveTraffic ? "bg-success animate-ping" : "bg-text-muted")} />
          </button>
        </div>

        {userRole !== "Viewer" && (
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

      {/* Mode Sub-banner */}
      <div className="p-3 rounded-md bg-sunken border border-border flex items-center justify-between text-sm">
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-primary" />
          <span className="font-semibold text-text-default">
            {graphMode === "upstream"
              ? "Change Management Mode: What will break if a CI changes?"
              : "Incident Management Mode: What could be the root cause of an outage?"}
          </span>
        </div>
        <span className="text-xs text-text-muted hidden sm:inline">
          Showing 5 tiers from Business Service to Physical/Cloud
        </span>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* 2-COLUMN LAYOUT: CANVAS (8 COLS) + RANKED IMPACT LIST (4 COLS) */}
      {/* ----------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ===================================================================== */}
        {/* GRAPH CANVAS (8 COLS) */}
        {/* ===================================================================== */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="bg-surface border-border overflow-hidden shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">Directed 5-Tier Topology Canvas</CardTitle>
                <CardDescription className="text-sm">
                  Interactive dependency graph with edge labels and blast radius propagation
                </CardDescription>
              </div>
              <Lozenge appearance="subtle" variant="info" size="sm">
                {filteredRelationships.length} Mapped Edges
              </Lozenge>
            </CardHeader>

            <CardContent className="p-4 bg-sunken/40 overflow-x-auto min-h-[520px]">
              <div
                className="transition-transform duration-200 origin-top-left space-y-6 p-4 rounded-lg bg-surface border border-border min-w-[680px]"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                {/* TIER 0: Business Services */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-border pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Tier 0 &bull; Business Services & APIs
                    </span>
                    <span className="text-[10px] text-text-muted">Top-level user outcomes</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {safeTier0.map((node) => {
                      const isSelected = node.id === selectedCiId;
                      return (
                        <button
                          key={node.id}
                          onClick={() => handleNodeClick(node.id)}
                          className={cn(
                            "p-2 rounded text-left transition-all duration-150 min-w-[170px] max-w-xs border hover:-translate-y-0.5 hover:shadow-subtle active:scale-[0.98]",
                            isSelected
                              ? "bg-selected-bg border-primary ring-2 ring-primary/50 shadow-subtle animate-pulse-glow"
                              : "bg-surface border-border hover:border-primary/50 hover:bg-sunken"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[10px] text-text-muted">{node.id}</span>
                            <TrustScoreBadge score={node.trustScore} showLabel={false} />
                          </div>
                          <p className="font-semibold text-xs text-text-default truncate mt-0.5">{node.name}</p>
                          <span className="text-[10px] text-text-muted truncate block">{node.environment}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Interactive Animated Dependency Flow Conduit */}
                <div className="flex flex-col items-center justify-center my-[-2px] relative z-10 select-none">
                  <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-surface border border-primary/30 shadow-2xs text-[10px] font-mono">
                    <span className={cn("w-1.5 h-1.5 rounded-full bg-primary", liveTraffic && "animate-ping")} />
                    <span className="text-primary font-semibold">Service Mesh</span>
                    <span className="text-text-muted text-[9px] uppercase">&bull; RPC Ingress</span>
                  </div>
                  <svg className="w-28 h-5 overflow-visible" viewBox="0 0 100 20">
                    <line
                      x1="50"
                      y1="0"
                      x2="50"
                      y2="20"
                      stroke="var(--primary)"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      className={cn(liveTraffic && "animate-flow-dash")}
                    />
                    {liveTraffic && <circle cx="50" cy="10" r="3" className="fill-brand-cyan animate-pulse" />}
                  </svg>
                </div>

                {/* TIER 1: Applications & Microservices */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-border pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-blue">
                      Tier 1 &bull; Applications & Microservices
                    </span>
                    <span className="text-[10px] text-text-muted">Application runtime logic</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {safeTier1.map((node) => {
                      const isSelected = node.id === selectedCiId;
                      return (
                        <button
                          key={node.id}
                          onClick={() => handleNodeClick(node.id)}
                          className={cn(
                            "p-2 rounded text-left transition-all duration-150 min-w-[170px] max-w-xs border hover:-translate-y-0.5 hover:shadow-subtle active:scale-[0.98]",
                            isSelected
                              ? "bg-selected-bg border-primary ring-2 ring-primary/50 shadow-subtle animate-pulse-glow"
                              : "bg-surface border-border hover:border-primary/50 hover:bg-sunken"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[10px] text-text-muted">{node.id}</span>
                            <TrustScoreBadge score={node.trustScore} showLabel={false} />
                          </div>
                          <p className="font-semibold text-xs text-text-default truncate mt-0.5">{node.name}</p>
                          <span className="text-[10px] text-text-muted truncate block">{node.ciClass}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Interactive Animated Dependency Flow Conduit */}
                <div className="flex flex-col items-center justify-center my-[-2px] relative z-10 select-none">
                  <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-surface border border-brand-cyan/40 shadow-2xs text-[10px] font-mono">
                    <span className={cn("w-1.5 h-1.5 rounded-full bg-brand-cyan", liveTraffic && "animate-ping")} />
                    <span className="text-brand-cyan font-semibold">Container Ingress</span>
                    <span className="text-text-muted text-[9px] uppercase">&bull; Pod Traffic</span>
                  </div>
                  <svg className="w-28 h-5 overflow-visible" viewBox="0 0 100 20">
                    <line
                      x1="50"
                      y1="0"
                      x2="50"
                      y2="20"
                      stroke="#19C8F0"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      className={cn(liveTraffic && "animate-flow-dash")}
                    />
                    {liveTraffic && <circle cx="50" cy="10" r="3" className="fill-brand-mint animate-pulse" />}
                  </svg>
                </div>

                {/* TIER 2: Compute & Containers */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-border pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-cyan">
                      Tier 2 &bull; Compute Nodes & Containers
                    </span>
                    <span className="text-[10px] text-text-muted">Pods, VMs, and cluster workers</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {safeTier2.map((node) => {
                      const isSelected = node.id === selectedCiId;
                      return (
                        <button
                          key={node.id}
                          onClick={() => handleNodeClick(node.id)}
                          className={cn(
                            "p-2 rounded text-left transition-all duration-150 min-w-[170px] max-w-xs border hover:-translate-y-0.5 hover:shadow-subtle active:scale-[0.98]",
                            isSelected
                              ? "bg-selected-bg border-primary ring-2 ring-primary/50 shadow-subtle animate-pulse-glow"
                              : "bg-surface border-border hover:border-primary/50 hover:bg-sunken"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[10px] text-text-muted">{node.id}</span>
                            <TrustScoreBadge score={node.trustScore} showLabel={false} />
                          </div>
                          <p className="font-semibold text-xs text-text-default truncate mt-0.5">{node.name}</p>
                          <span className="text-[10px] text-text-muted truncate block">{node.owner}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Interactive Animated Dependency Flow Conduit */}
                <div className="flex flex-col items-center justify-center my-[-2px] relative z-10 select-none">
                  <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-surface border border-success/40 shadow-2xs text-[10px] font-mono">
                    <span className={cn("w-1.5 h-1.5 rounded-full bg-success", liveTraffic && "animate-ping")} />
                    <span className="text-success font-semibold">DB Connection Pool</span>
                    <span className="text-text-muted text-[9px] uppercase">&bull; TCP Query</span>
                  </div>
                  <svg className="w-28 h-5 overflow-visible" viewBox="0 0 100 20">
                    <line
                      x1="50"
                      y1="0"
                      x2="50"
                      y2="20"
                      stroke="#1F845A"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      className={cn(liveTraffic && "animate-flow-dash")}
                    />
                    {liveTraffic && <circle cx="50" cy="10" r="3" className="fill-success animate-pulse" />}
                  </svg>
                </div>

                {/* TIER 3: Databases & Storage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-border pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-success">
                      Tier 3 &bull; Databases & Persistent Storage
                    </span>
                    <span className="text-[10px] text-text-muted">PostgreSQL, Redis, MySQL clusters</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {safeTier3.map((node) => {
                      const isSelected = node.id === selectedCiId;
                      return (
                        <button
                          key={node.id}
                          onClick={() => handleNodeClick(node.id)}
                          className={cn(
                            "p-2 rounded text-left transition-all duration-150 min-w-[170px] max-w-xs border hover:-translate-y-0.5 hover:shadow-subtle active:scale-[0.98]",
                            isSelected
                              ? "bg-selected-bg border-primary ring-2 ring-primary/50 shadow-subtle animate-pulse-glow"
                              : "bg-surface border-border hover:border-primary/50 hover:bg-sunken"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[10px] text-text-muted">{node.id}</span>
                            <TrustScoreBadge score={node.trustScore} showLabel={false} />
                          </div>
                          <p className="font-semibold text-xs text-text-default truncate mt-0.5">{node.name}</p>
                          <span className="text-[10px] text-text-muted truncate block">{node.supportGroup}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Interactive Animated Dependency Flow Conduit */}
                <div className="flex flex-col items-center justify-center my-[-2px] relative z-10 select-none">
                  <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-surface border border-warning/40 shadow-2xs text-[10px] font-mono">
                    <span className={cn("w-1.5 h-1.5 rounded-full bg-warning", liveTraffic && "animate-ping")} />
                    <span className="text-warning font-semibold">Cloud VPC Gateway</span>
                    <span className="text-text-muted text-[9px] uppercase">&bull; Route Table</span>
                  </div>
                  <svg className="w-28 h-5 overflow-visible" viewBox="0 0 100 20">
                    <line
                      x1="50"
                      y1="0"
                      x2="50"
                      y2="20"
                      stroke="#B38600"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      className={cn(liveTraffic && "animate-flow-dash")}
                    />
                    {liveTraffic && <circle cx="50" cy="10" r="3" className="fill-warning animate-pulse" />}
                  </svg>
                </div>

                {/* TIER 4: Network & Cloud Infrastructure */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-border pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-warning">
                      Tier 4 &bull; Network & Cloud Infrastructure
                    </span>
                    <span className="text-[10px] text-text-muted">Gateways, firewalls, and VPC routers</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {safeTier4.map((node) => {
                      const isSelected = node.id === selectedCiId;
                      return (
                        <button
                          key={node.id}
                          onClick={() => handleNodeClick(node.id)}
                          className={cn(
                            "p-2 rounded text-left transition-all duration-150 min-w-[170px] max-w-xs border hover:-translate-y-0.5 hover:shadow-subtle active:scale-[0.98]",
                            isSelected
                              ? "bg-selected-bg border-primary ring-2 ring-primary/50 shadow-subtle animate-pulse-glow"
                              : "bg-surface border-border hover:border-primary/50 hover:bg-sunken"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[10px] text-text-muted">{node.id}</span>
                            <TrustScoreBadge score={node.trustScore} showLabel={false} />
                          </div>
                          <p className="font-semibold text-xs text-text-default truncate mt-0.5">{node.name}</p>
                          <span className="text-[10px] text-text-muted truncate block">{node.location}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===================================================================== */}
        {/* RIGHT SIDE: RANKED REVENUE / HOUR IMPACT (4 COLS) */}
        {/* ===================================================================== */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="bg-surface border-border shadow-card">
            <CardHeader className="pb-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Ranked Business Service Risk</CardTitle>
                  <CardDescription className="text-xs">Downtime revenue exposure per hour</CardDescription>
                </div>
                <DollarSign className="w-5 h-5 text-warning" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {rankedImpacts.map((svc) => (
                <div
                  key={svc.serviceName}
                  className="p-3 rounded-md border border-border/70 bg-sunken/40 space-y-1.5 hover:bg-sunken/80 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-default text-sm">{svc.serviceName}</span>
                    <span className="font-mono font-bold text-warning text-sm">{svc.revenuePerHour}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>{svc.ciCount} Dependent CIs</span>
                    <Lozenge
                      appearance="subtle"
                      variant={svc.tier === "Tier 0" ? "danger" : "info"}
                      size="sm"
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
                  <CardTitle className="text-sm font-bold">Selected Node: {selectedCi.name}</CardTitle>
                  <span className="font-mono text-xs text-text-muted">{selectedCi.id}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3.5 text-sm">
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-text-muted block">Class</span>
                    <span className="font-medium text-text-default">{selectedCi.ciClass}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block">Owner</span>
                    <span className="font-medium text-text-default truncate block">{selectedCi.owner}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block">Upstream</span>
                    <span className="font-mono text-text-default">{selectedParents.length} parents</span>
                  </div>
                  <div>
                    <span className="text-text-muted block">Downstream</span>
                    <span className="font-mono text-text-default">{selectedChildren.length} dependents</span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-border flex items-center justify-between gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<Paperclip className="w-3.5 h-3.5" />}
                    onClick={handleAttachToChange}
                  >
                    Attach to Change
                  </Button>

                  <Link href={`/cis/${selectedCi.id}`}>
                    <Button size="sm" variant="outline">
                      CI 360 &rarr;
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* NODE DETAILS DRAWER */}
      {/* ----------------------------------------------------------------------- */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedCi ? `${selectedCi.name} (${selectedCi.id})` : "Node Details"}
        size="md"
      >
        {selectedCi && (
          <div className="p-4 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <Lozenge appearance="subtle" variant="info">
                {selectedCi.ciClass}
              </Lozenge>
              <OperationalBadge status={selectedCi.operationalStatus} />
            </div>

            <div className="space-y-1">
              <span className="text-text-muted block">Description</span>
              <p className="text-text-secondary leading-relaxed">
                {selectedCi.description || "No architectural description provided."}
              </p>
            </div>

            {selectedImpact && (
              <div className="p-3 rounded bg-warning/10 border border-warning/30 space-y-1.5">
                <span className="font-bold text-text-default block">
                  Blast Radius: {selectedImpact.riskLevel} (Score {selectedImpact.blastRadiusScore}/100)
                </span>
                <p className="text-[11px] text-text-secondary">{selectedImpact.impactSummary}</p>
              </div>
            )}

            <div className="pt-2 flex justify-between">
              <Button size="xs" variant="primary" onClick={handleAttachToChange}>
                Attach to Change Record
              </Button>
              <Link href={`/cis/${selectedCi.id}`}>
                <Button size="xs" variant="outline">
                  Open CI Full Profile
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Drawer>

      {/* ----------------------------------------------------------------------- */}
      {/* ADD RELATIONSHIP MODAL */}
      {/* ----------------------------------------------------------------------- */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Topology Relationship Edge"
        description="Establish an architectural dependency or hosting link between two configuration items"
      >
        <form onSubmit={handleAddSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="text-xs font-semibold text-text-default block mb-1">Parent CI (Target)</label>
            <select
              value={parentCiId}
              onChange={(e) => setParentCiId(e.target.value)}
              className="w-full bg-surface border border-border rounded p-2 text-xs text-text-default"
            >
              {cis.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id}) &bull; {c.ciClass}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-default block mb-1">Relationship Type</label>
            <select
              value={relType}
              onChange={(e) => setRelType(e.target.value as RelationshipType)}
              className="w-full bg-surface border border-border rounded p-2 text-xs text-text-default"
            >
              <option value="Depends on">Depends on</option>
              <option value="Hosted on">Hosted on</option>
              <option value="Runs on">Runs on</option>
              <option value="Connects to">Connects to</option>
              <option value="Contains">Contains</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-default block mb-1">Child CI (Dependent Node)</label>
            <select
              value={childCiId}
              onChange={(e) => setChildCiId(e.target.value)}
              className="w-full bg-surface border border-border rounded p-2 text-xs text-text-default"
            >
              {cis.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id}) &bull; {c.ciClass}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button size="xs" variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button size="xs" variant="primary" type="submit">
              Save Relationship
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
