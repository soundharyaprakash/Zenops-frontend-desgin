"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Boxes,
  Award,
  Clock,
  Shield,
  DollarSign,
  ArrowRight,
  ExternalLink,
  Layers,
  Network,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Search,
  Filter,
  Download,
  LayoutGrid,
  List,
  Info,
  TrendingDown,
  TrendingUp,
  AlertOctagon,
  Users,
  Calendar,
  CheckCircle,
  Sparkles,
  Server,
  Database,
  Cpu,
  Cloud,
  X,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lozenge } from "@/components/ui/Lozenge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TrustScoreRing } from "@/components/ui/TrustScoreRing";
import { InfoHint } from "@/components/ui/InfoHint";
import { Modal } from "@/components/ui/Modal";
import { useCMDB } from "@/context/cmdb-context";
import { cn } from "@/lib/utils";
import { usePermission } from "@/components/rbac/usePermission";
import { AccessDenied } from "@/components/rbac/AccessDenied";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import {
  ServiceRecord,
  getCanonicalServiceRecords,
  formatCurrency,
} from "@/lib/services/serviceRecord";
import { HEALTH_BANDS } from "@/lib/dashboard/metrics";

export function BusinessServicesView() {
  const { cis, relationships, activeTenant, showToast } = useCMDB();
  const { allowed: canViewCI, reason: denyReason } = usePermission(PERMISSIONS.CI_VIEW);

  // Single source of truth: canonical service records
  const allServices = useMemo(() => {
    return getCanonicalServiceRecords(cis, relationships);
  }, [cis, relationships]);

  // Ownership frequency across all services to identify people owning >= 2 services (Item 4)
  const ownerCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allServices.forEach((s) => {
      const distinctOwnersForService = new Set<string>();
      if (s.businessOwner?.name && s.businessOwner.name !== "Unassigned") {
        distinctOwnersForService.add(s.businessOwner.name);
      }
      if (s.technicalOwner?.name && s.technicalOwner.name !== "Unassigned") {
        distinctOwnersForService.add(s.technicalOwner.name);
      }
      distinctOwnersForService.forEach((owner) => {
        counts.set(owner, (counts.get(owner) || 0) + 1);
      });
    });
    return counts;
  }, [allServices]);

  // View & Filter States
  const [viewMode, setViewMode] = useState<"cards" | "table">(
    allServices.length > 6 ? "table" : "cards"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("All");
  const [bandFilter, setBandFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [ownerFilter, setOwnerFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"risk" | "score" | "revenue" | "tier" | "name">(
    "risk"
  );

  // Modal State for Dependent CIs breakdown (Priority 4, Item 18)
  const [selectedServiceForModal, setSelectedServiceForModal] = useState<ServiceRecord | null>(null);

  // Unique owners list for filter dropdown
  const uniqueOwners = useMemo(() => {
    const set = new Set<string>();
    allServices.forEach((s) => {
      if (s.businessOwner?.name) set.add(s.businessOwner.name);
      if (s.technicalOwner?.name) set.add(s.technicalOwner.name);
    });
    return Array.from(set).sort();
  }, [allServices]);

  // Top Summary Strip Metrics (Item 1 & Item 3)
  const summaryStrip = useMemo(() => {
    const totalCount = allServices.length;
    const belowTargetCount = allServices.filter((s) => s.trustScore < 80).length;
    const criticalCount = allServices.filter((s) => s.trustScore < 70).length;
    const totalRevRisk = allServices.reduce((sum, s) => sum + s.revenueRisk.amount, 0);
    const belowTargetRevRisk = allServices
      .filter((s) => s.trustScore < 80)
      .reduce((sum, s) => sum + s.revenueRisk.amount, 0);

    // Stored basis from service record (Item 3)
    const timeBasis = allServices[0]?.revenueRisk.basis || "per hour";
    const timeUnit = allServices[0]?.revenueRisk.timeUnit || "hr";

    // Dynamic catalog average Trust Score (Item 2 - recomputed from kept scores, never hardcoded)
    const avgScore = totalCount
      ? Number((allServices.reduce((sum, s) => sum + s.trustScore, 0) / totalCount).toFixed(1))
      : 0;

    return {
      totalCount,
      belowTargetCount,
      criticalCount,
      totalRevRisk,
      belowTargetRevRisk,
      totalRevRiskFormatted: `${formatCurrency(totalRevRisk)} / ${timeUnit}`,
      belowTargetRevRiskFormatted: `${formatCurrency(belowTargetRevRisk)} / ${timeUnit}`,
      timeBasis,
      timeUnit,
      avgScore,
    };
  }, [allServices]);

  // Filtered and Sorted Services (Priority 3, Item 11 & Item 6)
  const filteredServices = useMemo(() => {
    return allServices
      .filter((s) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = s.canonicalName.toLowerCase().includes(q);
          const matchId = s.id.toLowerCase().includes(q);
          const matchDesc = s.description.toLowerCase().includes(q);
          const matchBizOwner = s.businessOwner?.name.toLowerCase().includes(q);
          const matchTechOwner = s.technicalOwner?.name.toLowerCase().includes(q);
          if (!matchName && !matchId && !matchDesc && !matchBizOwner && !matchTechOwner) {
            return false;
          }
        }

        // Tier filter
        if (tierFilter !== "All" && String(s.tier) !== tierFilter) {
          return false;
        }

        // Health band filter
        if (bandFilter !== "All" && s.band.label !== bandFilter) {
          return false;
        }

        // Status filter
        if (statusFilter !== "All" && s.operationalStatus !== statusFilter) {
          return false;
        }

        // Owner filter
        if (ownerFilter !== "All") {
          const isBiz = s.businessOwner?.name === ownerFilter;
          const isTech = s.technicalOwner?.name === ownerFilter;
          if (!isBiz && !isTech) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Item 6: Explicit sort dropdown (Risk (default), Trust Score, Revenue exposure, Tier, Name)
        if (sortBy === "risk") {
          if (a.trustScore !== b.trustScore) {
            return a.trustScore - b.trustScore;
          }
          const riskImpactA = a.revenueRisk.amount * (80 - a.trustScore);
          const riskImpactB = b.revenueRisk.amount * (80 - b.trustScore);
          return riskImpactB - riskImpactA;
        }
        if (sortBy === "score") {
          return a.trustScore - b.trustScore;
        }
        if (sortBy === "revenue") {
          return b.revenueRisk.amount - a.revenueRisk.amount;
        }
        if (sortBy === "tier") {
          return a.tier - b.tier;
        }
        if (sortBy === "name") {
          return a.canonicalName.localeCompare(b.canonicalName);
        }
        return 0;
      });
  }, [allServices, searchQuery, tierFilter, bandFilter, statusFilter, ownerFilter, sortBy]);

  // Export CSV (Priority 3, Item 11) - Exports only rows currently visible
  const handleExportCSV = () => {
    try {
      const headers = [
        "Service ID",
        "Canonical Name",
        "Tier",
        "Environment",
        "Trust Score (%)",
        "Health Band",
        "Target Status",
        "Dependent CIs",
        "Revenue Risk ($/hr)",
        "RTO",
        "RPO",
        "RTO Exposure ($)",
        "Business Owner",
        "Business Owner Team",
        "Business Owner Contact",
        "Technical Owner",
        "Technical Owner Team",
        "Technical Owner Contact",
        "Operational Status",
      ];

      const rows = filteredServices.map((s) => [
        `"${s.id}"`,
        `"${s.canonicalName}"`,
        `"${s.tierLabel}"`,
        `"${s.environment}"`,
        s.trustScore,
        `"${s.band.label}"`,
        `"${s.targetStatus.label}"`,
        s.ciCount,
        s.revenueRisk.amount,
        `"${s.rtoFormatted}"`,
        `"${s.rpoFormatted}"`,
        s.rtoExposure,
        `"${s.businessOwner.name}"`,
        `"${s.businessOwner.team}"`,
        `"${s.businessOwner.contact}"`,
        `"${s.technicalOwner.name}"`,
        `"${s.technicalOwner.team}"`,
        `"${s.technicalOwner.contact}"`,
        `"${s.operationalStatus}"`,
      ]);

      const csvContent =
        "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.setAttribute(
        "download",
        `zenops-services-${activeTenant.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      showToast(
        "success",
        "Services Catalog Exported",
        `Exported spreadsheet of ${filteredServices.length} visible business services.`
      );
    } catch {
      showToast("error", "Export Failed", "Could not trigger CSV export.");
    }
  };

  if (!canViewCI) {
    return (
      <AccessDenied
        requiredPermission={PERMISSIONS.CI_VIEW}
        reason={
          denyReason ||
          "Executive / Report Viewer role has dashboard.view only and cannot access business service details."
        }
      />
    );
  }

  return (
    <div className="space-y-6 pb-12 text-text-default animate-fade-in-up">
      {/* ------------------------------------------------------------------- */}
      {/* PAGE HEADER */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-default">
              Business Services Catalog
            </h1>
            <Lozenge appearance="subtle" variant="info" size="sm">
              {allServices.length} Canonical Services
            </Lozenge>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-muted bg-sunken px-2.5 py-0.5 rounded border border-border/60">
              <Lock className="w-3.5 h-3.5 text-text-muted" />
              {activeTenant}
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Canonical business services, rolled-up dependency Trust Scores, and downtime financial impact
          </p>
        </div>

        {/* Action Group (RBAC Readiness: grouped for permission wrapping) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-3.5 h-3.5" />}
            className="border border-border/80 shadow-xs"
          >
            Export CSV
          </Button>

          {/* Open Impact Map Button (Priority 2, Item 9: visible border & tooltip) */}
          <Link
            href="/relationships"
            title="Open the interactive CMDB dependency graph and blast-radius impact analysis map"
          >
            <Button
              variant="secondary"
              size="sm"
              className="border border-border shadow-xs hover:border-primary/60 font-semibold"
              rightIcon={<Network className="w-4 h-4 text-primary" />}
            >
              Open impact map
            </Button>
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* SUMMARY STRIP AT TOP (Priority 3, Item 10 & Item 1, 3) */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Metric 1: Below-Target Status (Item 1) */}
        <Card className="p-4 sm:p-5 bg-surface border-border flex items-center justify-between shadow-card">
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Services Trust Target Status
            </span>
            <div className="space-y-1 pt-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-base sm:text-lg font-bold font-mono text-warning">
                  Below target (&lt;80): {summaryStrip.belowTargetCount} of {summaryStrip.totalCount}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold font-mono text-danger">
                  Critical (&lt;70): {summaryStrip.criticalCount} of {summaryStrip.totalCount}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-text-secondary mt-0.5">
              Enterprise trust target threshold: &ge;80% Healthy
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-warning/10 border border-warning/20 text-warning flex items-center justify-center flex-shrink-0">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </Card>

        {/* Metric 2: Revenue Exposure (Item 3) */}
        <Card className="p-4 sm:p-5 bg-surface border-border flex items-center justify-between shadow-card">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Revenue Exposure
              </span>
              <InfoHint
                title="Revenue Exposure Breakdown"
                concept={`Financial exposure (${summaryStrip.timeBasis}) across all business services versus services operating below target trust scores.`}
                whyItMatters="Aligns technical CMDB governance priorities directly with organizational business risk."
              />
            </div>
            <div className="space-y-1 pt-0.5">
              <div>
                <span className="text-[11px] text-text-muted block">
                  Total exposure (${summaryStrip.timeUnit}):
                </span>
                <span className="text-base sm:text-lg font-bold font-mono text-warning tracking-tight">
                  {summaryStrip.totalRevRiskFormatted}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-text-muted block">
                  Exposure in below-target services (${summaryStrip.timeUnit}):
                </span>
                <span className="text-sm font-semibold font-mono text-danger">
                  {summaryStrip.belowTargetRevRiskFormatted}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-text-secondary mt-0.5">
              Stored time basis: {summaryStrip.timeBasis}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-warning/10 border border-warning/20 text-warning flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </Card>

        {/* Metric 3: Average Trust Score (Item 2) */}
        <Card className="p-4 sm:p-5 bg-surface border-border flex items-center justify-between shadow-card">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Catalog Avg Trust Score
            </span>
            <div className="flex items-baseline gap-2 pt-0.5">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-text-default">
                {summaryStrip.avgScore}%
              </span>
              <Lozenge
                appearance="bold"
                variant={
                  summaryStrip.avgScore >= 80
                    ? "success"
                    : summaryStrip.avgScore >= 70
                    ? "warning"
                    : "danger"
                }
                size="xs"
              >
                {summaryStrip.avgScore >= 80
                  ? "Healthy"
                  : summaryStrip.avgScore >= 70
                  ? "At risk"
                  : "Critical"}
              </Lozenge>
            </div>
            <p className="text-[11px] text-text-secondary mt-0.5">
              Dynamically derived across all {summaryStrip.totalCount} canonical services
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* FILTER & SORT BAR (Priority 3, Item 11 & Priority 4, Item 13) */}
      {/* ------------------------------------------------------------------- */}
      <Card className="p-3 sm:p-4 bg-surface border-border shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search services by name, ID, owner, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-sunken rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary text-text-default"
            />
          </div>

          {/* Filters & Toggles */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Tier Filter */}
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="bg-sunken border border-border rounded-md px-2.5 py-1.5 text-xs text-text-default focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="All">All Tiers</option>
              <option value="0">Tier 0 (Mission Critical)</option>
              <option value="1">Tier 1 (High)</option>
              <option value="2">Tier 2 (Medium)</option>
              <option value="3">Tier 3 (Low)</option>
            </select>

            {/* Health Band Filter */}
            <select
              value={bandFilter}
              onChange={(e) => setBandFilter(e.target.value)}
              className="bg-sunken border border-border rounded-md px-2.5 py-1.5 text-xs text-text-default focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="All">All Health Bands</option>
              <option value="Healthy">Healthy (≥80)</option>
              <option value="At risk">At risk (70–79)</option>
              <option value="Critical">Critical (&lt;70)</option>
            </select>

            {/* Owner Filter */}
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="bg-sunken border border-border rounded-md px-2.5 py-1.5 text-xs text-text-default focus:outline-none focus:ring-1 focus:ring-primary max-w-[150px] truncate"
            >
              <option value="All">All Owners</option>
              {uniqueOwners.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>

            {/* Sort Dropdown (Item 6) */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-sunken border border-border rounded-md px-2.5 py-1.5 text-xs font-semibold text-text-default focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="risk">Sort: Risk (default)</option>
              <option value="score">Sort: Trust Score</option>
              <option value="revenue">Sort: Revenue exposure</option>
              <option value="tier">Sort: Tier</option>
              <option value="name">Sort: Name</option>
            </select>

            {/* View Mode Toggle: Cards vs Table (Priority 4, Item 13) */}
            <div className="inline-flex rounded-md border border-border bg-sunken p-0.5 select-none ml-auto">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "p-1.5 rounded flex items-center gap-1 font-medium transition-all",
                  viewMode === "cards"
                    ? "bg-surface text-primary shadow-xs font-semibold"
                    : "text-text-muted hover:text-text-default"
                )}
                title="Cards view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "p-1.5 rounded flex items-center gap-1 font-medium transition-all",
                  viewMode === "table"
                    ? "bg-surface text-primary shadow-xs font-semibold"
                    : "text-text-muted hover:text-text-default"
                )}
                title="Compact table view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------------------- */}
      {/* SERVICES CONTENT: CARDS VIEW */}
      {/* ------------------------------------------------------------------- */}
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredServices.map((svc) => {
            const isBelowTarget = svc.trustScore < 80;
            const bizCount = ownerCounts.get(svc.businessOwner.name) || 0;
            const techCount = ownerCounts.get(svc.technicalOwner.name) || 0;

            return (
              <Card
                key={svc.id}
                className={cn(
                  "bg-surface border-border transition-all flex flex-col justify-between shadow-card hover:shadow-raised duration-200",
                  isBelowTarget && "border-warning/50 dark:border-warning/40"
                )}
              >
                <div className="space-y-3.5">
                  {/* Top Card Header */}
                  <CardHeader className="pb-3 border-b border-border/50 bg-sunken/20">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-text-muted">{svc.id}</span>
                          <Lozenge
                            appearance="bold"
                            variant={
                              svc.tier === 0
                                ? "danger"
                                : svc.tier === 1
                                ? "warning"
                                : "info"
                            }
                            size="sm"
                          >
                            {svc.tierLabel}
                          </Lozenge>
                          <span className="text-[10px] font-semibold text-text-muted bg-sunken px-1.5 py-0.5 rounded border border-border/60">
                            {svc.environment}
                          </span>
                          <Lozenge
                            appearance="subtle"
                            variant={svc.operationalStatus === "Operational" ? "success" : "warning"}
                            size="xs"
                          >
                            {svc.operationalStatus}
                          </Lozenge>
                        </div>

                        {/* Canonical Service Name (Priority 1, Item 2) */}
                        <CardTitle className="text-base font-bold text-text-default truncate pt-0.5">
                          {svc.canonicalName}
                        </CardTitle>
                        <CardDescription className="text-xs line-clamp-2">
                          {svc.description}
                        </CardDescription>
                      </div>

                      {/* Larger Score Ring with Health Band text label beside it (Priority 4, Item 17) */}
                      <div className="flex flex-col items-center flex-shrink-0 select-none">
                        <TrustScoreRing score={svc.trustScore} size="lg" showLabel={false} />
                        <div className="text-center mt-1 space-y-0.5">
                          <span className="font-mono text-xs font-bold text-text-default block">
                            {svc.trustScore}%
                          </span>
                          {/* Band name shown on every service (Priority 1, Item 4) */}
                          <Lozenge
                            appearance="bold"
                            variant={svc.band.lozengeVariant}
                            size="xs"
                          >
                            {svc.band.label}
                          </Lozenge>
                        </div>
                      </div>
                    </div>

                    {/* Score as of timestamp & Health Band + Target Status (Item 1 & Item 7) */}
                    <div className="pt-1.5 flex items-center justify-between text-[10px] text-text-muted border-t border-border/40 mt-2">
                      <span>As of: {svc.scoreAsOf}</span>
                      <div className="flex items-center gap-1.5">
                        <Lozenge
                          appearance={isBelowTarget ? "bold" : "subtle"}
                          variant={svc.targetStatus.variant}
                          size="xs"
                        >
                          {svc.targetStatus.label}
                        </Lozenge>
                        <Lozenge
                          appearance="subtle"
                          variant={svc.band.lozengeVariant}
                          size="xs"
                        >
                          {svc.band.label}
                        </Lozenge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3.5 text-xs px-4 sm:px-5">
                    {/* Owner Warning for Tier 0-1 services if missing (Priority 3, Item 12) */}
                    {svc.hasOwnerWarning && (
                      <div className="p-2 rounded bg-warning/10 border border-warning/30 flex items-center gap-2 text-warning font-semibold text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{svc.ownerWarningMessage}</span>
                      </div>
                    )}

                    {/* Operational & Risk Matrix */}
                    <div className="grid grid-cols-2 gap-2.5 p-3 rounded-md bg-sunken border border-border/60 text-xs">
                      {/* RTO & RPO with consistent units (Priority 4, Item 14) */}
                      <div>
                        <span className="text-text-muted text-[11px] block">RTO / RPO</span>
                        <span className="font-semibold text-text-default">
                          {svc.rtoFormatted} / {svc.rpoFormatted}
                        </span>
                      </div>

                      {/* Revenue Risk & Exposure with Tooltip (Priority 2, Item 5) */}
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-text-muted text-[11px]">Revenue Risk</span>
                          <InfoHint
                            title="Revenue Risk Calculation"
                            concept="Estimated revenue lost per hour of outage based on transaction rates."
                            whyItMatters="High revenue risk requires aggressive RTO failover automation."
                          />
                        </div>
                        <span className="font-bold text-warning block">
                          {svc.revenueRisk.formatted}
                        </span>
                        <span className="text-[10px] text-text-muted block">
                          {svc.rtoExposureFormatted}
                        </span>
                      </div>

                      {/* Business Owner (Priority 3, Item 12 & Item 4: triggers at >=2 services) */}
                      <div>
                        <span className="text-text-muted text-[11px] block">Business Owner</span>
                        <div className="font-medium text-text-default truncate">
                          <span>{svc.businessOwner.name}</span>
                          {bizCount >= 2 && (
                            <span className="text-[10px] text-primary font-bold ml-1">
                              (owns {bizCount} services)
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-text-muted truncate block">
                          {svc.businessOwner.team}
                        </span>
                      </div>

                      {/* Technical Owner (Priority 3, Item 12 & Item 4: triggers at >=2 services) */}
                      <div>
                        <span className="text-text-muted text-[11px] block">Technical Owner</span>
                        <div className="font-medium text-text-default truncate">
                          <span>{svc.technicalOwner.name}</span>
                          {techCount >= 2 && (
                            <span className="text-[10px] text-primary font-bold ml-1">
                              (owns {techCount} services)
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-text-muted truncate block">
                          {svc.technicalOwner.team}
                        </span>
                      </div>
                    </div>

                    {/* Dependent CIs (Clickable -> Opens class breakdown modal - Priority 4, Item 18) */}
                    <div className="p-2.5 rounded-md bg-surface border border-border flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-text-muted block">Dependent CIs</span>
                        <span className="font-mono font-bold text-sm text-text-default">
                          {svc.ciCount} Mapped Nodes
                        </span>
                      </div>
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => setSelectedServiceForModal(svc)}
                        rightIcon={<ArrowRight className="w-3 h-3" />}
                        className="text-[11px]"
                      >
                        Breakdown
                      </Button>
                    </div>

                    {/* Score Explanation & Top Drivers (Priority 2, Item 7) */}
                    <div className="p-2.5 rounded-md bg-sunken/60 border border-border/50 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-text-muted">
                        <span className="font-semibold uppercase tracking-wider text-[10px]">
                          Score Drivers
                        </span>
                        <Link
                          href="/data-quality"
                          className="text-primary font-semibold hover:underline"
                        >
                          Data Quality tasks &rarr;
                        </Link>
                      </div>
                      <ul className="space-y-0.5 text-text-secondary">
                        {svc.topDrivers.map((driver, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                            <span className="truncate">{driver}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Mapped infrastructure nodes by class (Priority 2, Item 8: Hides when empty, no empty pill) */}
                    {Object.keys(svc.ciCountByClass).length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                          Infrastructure Classes
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(svc.ciCountByClass).map(([className, count]) => (
                            <span
                              key={className}
                              className="text-[10px] px-2 py-0.5 rounded bg-sunken border border-border font-medium text-text-secondary"
                            >
                              {className} ({count})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Live Context Strip: Incidents, Changes, Attestation, Sparkline (Priority 4, Item 16) */}
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-text-muted flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span>Incidents: <strong className="text-text-default font-mono">{svc.liveContext.openIncidents}</strong></span>
                        <span>&bull;</span>
                        <span>Changes: <strong className="text-text-default font-mono">{svc.liveContext.upcomingChanges}</strong></span>
                        <span>&bull;</span>
                        <span>Attested: <strong className="text-text-default font-mono">{svc.liveContext.lastAttestationDate}</strong></span>
                      </div>

                      {/* Small Score Trendline SVG Sparkline */}
                      <div className="flex items-center gap-1">
                        <span className="text-[9px]">Trend:</span>
                        <svg width="40" height="14" className="overflow-visible">
                          <polyline
                            fill="none"
                            stroke={svc.band.color}
                            strokeWidth="1.5"
                            points={svc.liveContext.scoreTrend
                              .map((val, i) => `${i * 12},${14 - ((val - 40) / 60) * 12}`)
                              .join(" ")}
                          />
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Card Footer Actions (RBAC Readiness: Grouped actions) */}
                <div className="p-4 pt-3 border-t border-border bg-sunken/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  {/* Open Impact Map Button (Priority 2, Item 9) */}
                  <Link
                    href={`/relationships?ci=${svc.id}`}
                    title={`Open dependency impact graph for ${svc.canonicalName}`}
                    className="flex-1 sm:flex-initial"
                  >
                    <Button
                      variant="secondary"
                      size="xs"
                      rightIcon={<Network className="w-3.5 h-3.5 text-primary" />}
                      className="border border-border/80 hover:border-primary/60 font-semibold w-full sm:w-auto"
                    >
                      Open impact map
                    </Button>
                  </Link>

                  {/* Remediation Actions for Below-Target Services (Priority 4, Item 19) */}
                  {isBelowTarget && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link href="/data-quality">
                        <Button size="xs" variant="subtle" className="text-[11px] h-7 px-2">
                          Fix DQ tasks
                        </Button>
                      </Link>
                      <Link href="/attestation-campaigns">
                        <Button size="xs" variant="primary" className="text-[11px] h-7 px-2">
                          Request attestation
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ------------------------------------------------------------------- */
        /* COMPACT TABLE VIEW (Priority 4, Item 13) */
        /* ------------------------------------------------------------------- */
        <Card className="bg-surface border-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left divide-y divide-border/60">
              <thead className="bg-sunken text-text-muted uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Service Name & ID</th>
                  <th className="px-3 py-3">Tier</th>
                  <th className="px-3 py-3">Environment</th>
                  <th className="px-3 py-3">Trust Score</th>
                  <th className="px-3 py-3">Target Status</th>
                  <th className="px-3 py-3">Dependent CIs</th>
                  <th className="px-3 py-3">Revenue Risk</th>
                  <th className="px-3 py-3">RTO / RPO</th>
                  <th className="px-3 py-3">Owners (Biz / Tech)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredServices.map((svc) => {
                  const isBelowTarget = svc.trustScore < 80;
                  const bizCount = ownerCounts.get(svc.businessOwner.name) || 0;
                  const techCount = ownerCounts.get(svc.technicalOwner.name) || 0;

                  return (
                    <tr
                      key={svc.id}
                      className={cn(
                        "hover:bg-sunken/60 transition-colors",
                        isBelowTarget && "bg-warning/[0.02]"
                      )}
                    >
                      {/* Name & ID */}
                      <td className="px-4 py-3 font-medium text-text-default">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-text-default truncate max-w-[200px]">
                            {svc.canonicalName}
                          </p>
                          <span className="font-mono text-[10px] text-text-muted">{svc.id}</span>
                        </div>
                      </td>

                      {/* Tier (Item 5) */}
                      <td className="px-3 py-3">
                        <Lozenge
                          appearance="bold"
                          variant={svc.tier === 0 ? "danger" : svc.tier === 1 ? "warning" : "info"}
                          size="xs"
                        >
                          {svc.tierLabel}
                        </Lozenge>
                      </td>

                      {/* Environment (Item 5) */}
                      <td className="px-3 py-3">
                        <span className="text-[11px] font-medium text-text-secondary bg-sunken px-2 py-0.5 rounded border border-border/60">
                          {svc.environment}
                        </span>
                      </td>

                      {/* Trust Score & Health Band (Priority 1, Item 4) */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <TrustScoreRing score={svc.trustScore} size="sm" showLabel={false} />
                          <div>
                            <span className="font-mono font-bold text-text-default block">
                              {svc.trustScore}%
                            </span>
                            <Lozenge
                              appearance="bold"
                              variant={svc.band.lozengeVariant}
                              size="xs"
                            >
                              {svc.band.label}
                            </Lozenge>
                          </div>
                        </div>
                      </td>

                      {/* Target Status (Item 1) */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Lozenge
                            appearance={isBelowTarget ? "bold" : "subtle"}
                            variant={svc.targetStatus.variant}
                            size="xs"
                          >
                            {svc.targetStatus.label}
                          </Lozenge>
                          <Lozenge
                            appearance="subtle"
                            variant={svc.band.lozengeVariant}
                            size="xs"
                          >
                            {svc.band.label}
                          </Lozenge>
                        </div>
                      </td>

                      {/* Dependent CIs Clickable (Priority 4, Item 18) */}
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedServiceForModal(svc)}
                          className="font-mono font-semibold text-primary hover:underline"
                        >
                          {svc.ciCount} CIs
                        </button>
                      </td>

                      {/* Revenue Risk */}
                      <td className="px-3 py-3">
                        <span className="font-mono font-semibold text-warning block">
                          {svc.revenueRisk.formatted}
                        </span>
                        <span className="text-[10px] text-text-muted block">
                          {svc.rtoExposureFormatted}
                        </span>
                      </td>

                      {/* RTO / RPO */}
                      <td className="px-3 py-3 font-mono">
                        {svc.rtoFormatted} / {svc.rpoFormatted}
                      </td>

                      {/* Owners (Item 4: triggers at >=2 services) */}
                      <td className="px-3 py-3">
                        <div className="space-y-0.5 max-w-[180px] text-[11px]">
                          <div className="truncate">
                            <span className="text-text-muted">Biz: </span>
                            <span className="font-medium text-text-default">
                              {svc.businessOwner.name}
                            </span>
                            {bizCount >= 2 && (
                              <span className="text-[10px] text-primary font-bold ml-1">
                                (owns {bizCount})
                              </span>
                            )}
                          </div>
                          <div className="truncate">
                            <span className="text-text-muted">Tech: </span>
                            <span className="font-medium text-text-default">
                              {svc.technicalOwner.name}
                            </span>
                            {techCount >= 2 && (
                              <span className="text-[10px] text-primary font-bold ml-1">
                                (owns {techCount})
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/relationships?ci=${svc.id}`} title="Open impact map">
                            <Button size="xs" variant="secondary" className="border border-border">
                              Map
                            </Button>
                          </Link>
                          {isBelowTarget && (
                            <Link href="/data-quality" title="Review data quality tasks">
                              <Button size="xs" variant="primary">
                                Remediate
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* DEPENDENT CIS BREAKDOWN MODAL (Priority 4, Item 18) */}
      {/* ------------------------------------------------------------------- */}
      {selectedServiceForModal && (
        <Modal
          isOpen={Boolean(selectedServiceForModal)}
          onClose={() => setSelectedServiceForModal(null)}
          title={`Mapped Infrastructure: ${selectedServiceForModal.canonicalName}`}
          description={`${selectedServiceForModal.ciCount} configuration items connected through the CMDB dependency graph.`}
          maxWidth="2xl"
        >
          <div className="space-y-4 pt-2">
            {/* Breakdown summary by class */}
            <div className="p-3 rounded-lg bg-sunken border border-border/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-2">
                Class Distribution Summary
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {Object.entries(selectedServiceForModal.ciCountByClass).map(([cls, count]) => (
                  <div key={cls} className="p-2 rounded bg-surface border border-border">
                    <span className="text-text-muted text-[11px] block truncate">{cls}</span>
                    <span className="font-mono font-bold text-text-default text-sm">
                      {count} node{count > 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* List of Connected CIs */}
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                Connected CI Nodes
              </span>
              {selectedServiceForModal.dependentCIs.map((ci) => (
                <div
                  key={ci.id}
                  className="p-2.5 rounded-md border border-border/60 bg-surface hover:bg-sunken flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-text-default">
                        {ci.id}
                      </span>
                      <span className="text-text-secondary truncate">{ci.name}</span>
                      <Lozenge appearance="subtle" variant="neutral" size="xs">
                        {ci.ciClass}
                      </Lozenge>
                    </div>
                    <p className="text-[11px] text-text-muted truncate">
                      Owner: {ci.owner || "Unassigned"} &bull; {ci.supportGroup || "No group"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono font-bold text-text-default">
                      {ci.trustScore || 80}%
                    </span>
                    <Link href={`/cis/${ci.id}`}>
                      <Button size="xs" variant="secondary" className="h-6 text-[10px] px-2">
                        Inspect
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <Link
                href={`/relationships?ci=${selectedServiceForModal.id}`}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                View Full Topology Graph <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Button size="sm" variant="secondary" onClick={() => setSelectedServiceForModal(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
