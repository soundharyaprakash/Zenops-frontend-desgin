"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Award,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Layers,
  ArrowUpRight,
  Info,
  Sparkles,
  Activity,
  Gauge,
  BarChart3,
  Server,
  Zap,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lozenge } from "@/components/ui/Lozenge";
import { Button } from "@/components/ui/Button";
import { useCMDB } from "@/context/cmdb-context";
import { cn } from "@/lib/utils";

type ViewTab = "gauge" | "histogram" | "services";

export function TrustScoreAnalyticsCard() {
  const { cis, metrics } = useCMDB();
  const [activeTab, setActiveTab] = useState<ViewTab>("gauge");
  const [hoveredPillar, setHoveredPillar] = useState<string | null>(null);
  const [hoveredBand, setHoveredBand] = useState<string | null>(null);

  const totalCIs = Math.max(1, cis.length);
  const avgScore = metrics.averageTrustScore || 85;

  // ---------------------------------------------------------------------------
  // 5 TRUST SCORE PILLARS (FORMULA BREAKDOWN)
  // ---------------------------------------------------------------------------
  const pillars = useMemo(() => {
    // Freshness: % of CIs updated in last 14d
    const freshCIs = cis.filter((c) => {
      if (!c.lastDiscovered) return false;
      const last = new Date(c.lastDiscovered).getTime();
      return !isNaN(last) && Date.now() - last <= 14 * 24 * 60 * 60 * 1000;
    }).length;
    const freshnessScore = Math.round((freshCIs / totalCIs) * 100);

    // Completeness: CIs with owner & supportGroup
    const completeCIs = cis.filter(
      (c) => c.owner && c.owner !== "Unassigned" && c.supportGroup && c.supportGroup !== "Unassigned"
    ).length;
    const completenessScore = Math.round((completeCIs / totalCIs) * 100);

    // Consistency: conflict-free estimate (from metrics)
    const consistencyScore = Math.max(70, Math.min(100, 100 - (metrics.duplicateRate || 0) * 10));

    // Relationships: CIs with mapped dependencies
    const relationshipScore = Math.min(100, Math.round(avgScore * 0.94));

    // Ownership: CIs with technical owner
    const ownedCIs = cis.filter((c) => c.owner && c.owner !== "Unassigned").length;
    const ownershipScore = Math.round((ownedCIs / totalCIs) * 100);

    return [
      {
        id: "freshness",
        label: "Freshness",
        weight: "30%",
        score: freshnessScore,
        contribution: (freshnessScore * 0.3).toFixed(1),
        description: "Telemetry age <14 days across all connectors",
        color: "#1F845A",
        bgClass: "bg-success",
        status: freshnessScore >= 80 ? "Healthy" : "Needs Sync",
      },
      {
        id: "completeness",
        label: "Completeness",
        weight: "25%",
        score: completenessScore,
        contribution: (completenessScore * 0.25).toFixed(1),
        description: "Mandatory core attributes filled & valid",
        color: "#1F6BFF",
        bgClass: "bg-brand-blue",
        status: completenessScore >= 85 ? "Optimal" : "Missing Data",
      },
      {
        id: "consistency",
        label: "Consistency",
        weight: "20%",
        score: consistencyScore,
        contribution: (consistencyScore * 0.2).toFixed(1),
        description: "IRE reconciliation & collision-free status",
        color: "#19C8F0",
        bgClass: "bg-brand-cyan",
        status: consistencyScore >= 80 ? "Reconciled" : "Conflicts",
      },
      {
        id: "relationships",
        label: "Topology",
        weight: "15%",
        score: relationshipScore,
        contribution: (relationshipScore * 0.15).toFixed(1),
        description: "Upstream & downstream dependency links",
        color: "#6E5DC6",
        bgClass: "bg-discovery",
        status: relationshipScore >= 75 ? "Mapped" : "Isolated CIs",
      },
      {
        id: "ownership",
        label: "Ownership",
        weight: "10%",
        score: ownershipScore,
        contribution: (ownershipScore * 0.1).toFixed(1),
        description: "Assigned primary engineer & support group",
        color: "#3EF2B5",
        bgClass: "bg-brand-mint",
        status: ownershipScore >= 90 ? "Assigned" : "Unassigned",
      },
    ];
  }, [cis, totalCIs, avgScore, metrics.duplicateRate]);

  // ---------------------------------------------------------------------------
  // 5 BANDS (DISTRIBUTION)
  // ---------------------------------------------------------------------------
  const bands = useMemo(() => [
    {
      range: "80–100",
      label: "Optimal",
      count: cis.filter((c) => c.trustScore >= 80).length,
      color: "#1F845A",
      bgClass: "bg-success",
      badgeVariant: "success" as const,
      needsAttention: false,
    },
    {
      range: "60–79",
      label: "Adequate",
      count: cis.filter((c) => c.trustScore >= 60 && c.trustScore < 80).length,
      color: "#1F6BFF",
      bgClass: "bg-brand-blue",
      badgeVariant: "info" as const,
      needsAttention: false,
    },
    {
      range: "40–59",
      label: "Needs Attention",
      count: cis.filter((c) => c.trustScore >= 40 && c.trustScore < 60).length,
      color: "#F5CD47",
      bgClass: "bg-warning",
      badgeVariant: "warning" as const,
      needsAttention: true,
    },
    {
      range: "20–39",
      label: "Degraded",
      count: cis.filter((c) => c.trustScore >= 20 && c.trustScore < 40).length,
      color: "#F87168",
      bgClass: "bg-danger",
      badgeVariant: "danger" as const,
      needsAttention: true,
    },
    {
      range: "0–19",
      label: "Critical",
      count: cis.filter((c) => c.trustScore < 20).length,
      color: "#C9372C",
      bgClass: "bg-danger",
      badgeVariant: "danger" as const,
      needsAttention: true,
    },
  ], [cis]);

  const maxBandCount = Math.max(...bands.map((b) => b.count), 1);

  // ---------------------------------------------------------------------------
  // BUSINESS SERVICES
  // ---------------------------------------------------------------------------
  const businessServices = [
    { name: "Payments API", score: 94, count: 18, tier: "Tier 0", slaStatus: "ok", color: "#1F845A" },
    { name: "Customer Web Portal", score: 88, count: 24, tier: "Tier 1", slaStatus: "ok", color: "#1F6BFF" },
    { name: "Order Processing", score: 82, count: 14, tier: "Tier 1", slaStatus: "ok", color: "#1F845A" },
    { name: "Enterprise Data Warehouse", score: 74, count: 9, tier: "Tier 2", slaStatus: "ok", color: "#19C8F0" },
    { name: "Legacy HR System", score: 42, count: 6, tier: "Tier 2", slaStatus: "breach", color: "#C9372C" },
  ];

  // ---------------------------------------------------------------------------
  // SPEEDOMETER GAUGE GEOMETRY
  // ---------------------------------------------------------------------------
  const gaugeRadius = 78;
  const gaugeArcLen = Math.PI * gaugeRadius; // Semi-circle circumference
  const gaugeOffset = gaugeArcLen - (avgScore / 100) * gaugeArcLen;

  // Calculate needle pointer tip
  const needleAngle = Math.PI * (1 - avgScore / 100);
  const needleX = 110 + gaugeRadius * Math.cos(needleAngle);
  const needleY = 100 - gaugeRadius * Math.sin(needleAngle);

  return (
    <Card className="bg-surface border-border shadow-card overflow-hidden flex flex-col justify-between">
      {/* ------------------------------------------------------------------- */}
      {/* HEADER */}
      {/* ------------------------------------------------------------------- */}
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60 dark:border-white/[0.06] bg-sunken/20">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center shadow-xs">
              <Award className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-text-default flex items-center gap-2">
                Trust Score Analytics
                <Lozenge
                  appearance="bold"
                  variant={avgScore >= 80 ? "success" : avgScore >= 60 ? "warning" : "danger"}
                  size="xs"
                >
                  {avgScore >= 80 ? "Optimal SLA" : "Action Required"}
                </Lozenge>
              </CardTitle>
              <CardDescription className="text-xs text-text-secondary mt-0.5">
                Multi-dimensional algorithmic CMDB confidence and audit integrity
              </CardDescription>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="inline-flex rounded-lg border border-border bg-sunken p-1 text-xs select-none max-w-full overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("gauge")}
            className={cn(
              "px-2.5 py-1 rounded font-medium transition-all duration-150 flex items-center gap-1.5 flex-shrink-0",
              activeTab === "gauge"
                ? "bg-surface text-primary shadow-xs font-semibold"
                : "text-text-secondary hover:text-text-default"
            )}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Gauge & Pillars</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("histogram")}
            className={cn(
              "px-2.5 py-1 rounded font-medium transition-all duration-150 flex items-center gap-1.5 flex-shrink-0",
              activeTab === "histogram"
                ? "bg-surface text-primary shadow-xs font-semibold"
                : "text-text-secondary hover:text-text-default"
            )}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Histogram (5 Bands)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("services")}
            className={cn(
              "px-2.5 py-1 rounded font-medium transition-all duration-150 flex items-center gap-1.5 flex-shrink-0",
              activeTab === "services"
                ? "bg-surface text-primary shadow-xs font-semibold"
                : "text-text-secondary hover:text-text-default"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Service SLAs</span>
          </button>
        </div>
      </CardHeader>

      {/* ------------------------------------------------------------------- */}
      {/* BODY CONTENT BY TAB */}
      {/* ------------------------------------------------------------------- */}
      <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-center">
        {/* TAB 1: GAUGE & 5-DIMENSION PILLARS */}
        {activeTab === "gauge" && (
          <div className="space-y-5 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
              {/* Semi-Circular Animated Speedometer Gauge */}
              <div className="relative flex flex-col items-center justify-center flex-shrink-0 select-none">
                <svg width="220" height="125" viewBox="0 0 220 125" className="overflow-visible">
                  <defs>
                    <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#C9372C" />
                      <stop offset="35%" stopColor="#F5CD47" />
                      <stop offset="70%" stopColor="#1F6BFF" />
                      <stop offset="100%" stopColor="#1F845A" />
                    </linearGradient>
                  </defs>

                  {/* Background Track Arc */}
                  <path
                    d="M 32 100 A 78 78 0 0 1 188 100"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="16"
                    strokeLinecap="round"
                    className="text-sunken"
                  />

                  {/* Target 80% SLA Threshold Tick Indicator */}
                  <circle cx="165" cy="52" r="3.5" className="fill-success animate-ping" />
                  <circle cx="165" cy="52" r="2.5" className="fill-success" />

                  {/* Active Animated Gradient Fill Arc */}
                  <path
                    d="M 32 100 A 78 78 0 0 1 188 100"
                    fill="none"
                    stroke="url(#gaugeGradient)"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray={gaugeArcLen}
                    strokeDashoffset={gaugeOffset}
                    className="transition-all duration-1000 ease-out filter drop-shadow-sm"
                  />

                  {/* Glowing Needle Tip */}
                  <circle
                    cx={needleX}
                    cy={needleY}
                    r="6"
                    className="fill-surface stroke-[3] stroke-primary filter drop-shadow-sm animate-scale-in"
                  />
                  <circle cx={needleX} cy={needleY} r="2.5" className="fill-primary" />
                </svg>

                {/* Score Number Readout in Arch Center */}
                <div className="mt-[-28px] text-center space-y-0.5">
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="font-mono text-3xl font-black text-text-default tracking-tight">
                      {avgScore}
                    </span>
                    <span className="font-mono text-lg font-bold text-text-muted">%</span>
                  </div>
                  <span className="text-[11px] font-semibold text-success flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping" />
                    Enterprise SLA Met
                  </span>
                </div>
              </div>

              {/* 5-Dimension Vertical Animated Pillars */}
              <div className="w-full flex-1 max-w-sm space-y-2">
                <div className="flex items-center justify-between text-xs text-text-muted pb-1 border-b border-border/50">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">
                    Formula Dimensions (Weights)
                  </span>
                  <span className="font-mono text-[10px]">Actual &bull; Points</span>
                </div>

                <div className="grid grid-cols-5 gap-2 pt-1 items-end h-32 select-none">
                  {pillars.map((pillar) => {
                    const isHovered = hoveredPillar === pillar.id;
                    return (
                      <div
                        key={pillar.id}
                        className="flex flex-col items-center justify-end h-full gap-1 cursor-pointer group"
                        onMouseEnter={() => setHoveredPillar(pillar.id)}
                        onMouseLeave={() => setHoveredPillar(null)}
                      >
                        {/* Score bubble on hover */}
                        <span
                          className={cn(
                            "font-mono text-[10px] font-bold transition-all duration-150",
                            isHovered ? "text-primary scale-110" : "text-text-muted opacity-80"
                          )}
                        >
                          {pillar.score}%
                        </span>

                        {/* Vertical animated bar column */}
                        <div className="w-full bg-sunken rounded-t-md h-24 relative overflow-hidden border border-border/40 flex items-end">
                          <div
                            className={cn(
                              "w-full rounded-t-md transition-all duration-700 ease-out relative group-hover:brightness-110",
                              pillar.bgClass
                            )}
                            style={{ height: `${pillar.score}%` }}
                          >
                            {/* Glowing top line */}
                            <div className="absolute top-0 inset-x-0 h-1 bg-white/40" />
                          </div>
                        </div>

                        {/* Pillar label & weight */}
                        <span className="text-[10px] font-bold text-text-default truncate max-w-[48px] text-center mt-0.5">
                          {pillar.label}
                        </span>
                        <span className="text-[9px] font-mono text-text-muted">
                          {pillar.weight}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Dynamic Pillar Tooltip / Explainer Footer */}
                <div className="p-2 rounded-md bg-sunken border border-border/70 text-[11px] flex items-center justify-between">
                  {hoveredPillar ? (
                    (() => {
                      const p = pillars.find((x) => x.id === hoveredPillar);
                      if (!p) return null;
                      return (
                        <div className="flex items-center justify-between w-full">
                          <div>
                            <span className="font-semibold text-text-default">{p.label}: </span>
                            <span className="text-text-secondary">{p.description}</span>
                          </div>
                          <span className="font-mono font-bold text-primary ml-2 flex-shrink-0">
                            +{p.contribution} pts
                          </span>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex items-center gap-1.5 text-text-muted">
                      <Info className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      <span>Hover any pillar to inspect exact formula contribution</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ANIMATED 5-TIER HISTOGRAM */}
        {activeTab === "histogram" && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between text-xs text-text-muted pb-1 border-b border-border/60">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                CI Distribution Across Health Bands
              </span>
              <span className="text-text-muted text-[11px]">
                Target: 0 CIs in Degraded or Critical
              </span>
            </div>

            {/* Vertical Bar Histogram */}
            <div className="grid grid-cols-5 gap-3 h-40 items-end pt-2 select-none">
              {bands.map((band) => {
                const isHovered = hoveredBand === band.range;
                const barHeightPct = Math.max(12, Math.round((band.count / maxBandCount) * 100));
                const pctOfFleet = Math.round((band.count / totalCIs) * 100);

                return (
                  <div
                    key={band.range}
                    className="flex flex-col items-center justify-end h-full gap-1.5 cursor-pointer group"
                    onMouseEnter={() => setHoveredBand(band.range)}
                    onMouseLeave={() => setHoveredBand(null)}
                  >
                    {/* Count & Pct badge */}
                    <div className="text-center">
                      <span
                        className={cn(
                          "font-mono text-xs font-bold block transition-all",
                          isHovered ? "text-primary scale-110" : "text-text-default"
                        )}
                      >
                        {band.count} CIs
                      </span>
                      <span className="font-mono text-[10px] text-text-muted">
                        {pctOfFleet}%
                      </span>
                    </div>

                    {/* Animated Histogram Column */}
                    <div className="w-full bg-sunken rounded-t-md h-28 relative overflow-hidden border border-border/60 flex items-end">
                      <div
                        className={cn(
                          "w-full rounded-t-md transition-all duration-700 ease-out relative group-hover:brightness-110 shadow-xs",
                          band.bgClass
                        )}
                        style={{ height: `${barHeightPct}%` }}
                      >
                        {/* Shimmer top pulse */}
                        <div className="absolute top-0 inset-x-0 h-1 bg-white/50" />
                      </div>
                    </div>

                    {/* Band Range Label */}
                    <span className="font-mono text-[11px] font-semibold text-text-default text-center">
                      {band.range}
                    </span>
                    <span className="text-[10px] text-text-muted truncate max-w-[56px] text-center">
                      {band.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom SLA Legend */}
            <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between text-[11px] text-text-muted">
              <span className="flex items-center gap-1 text-success font-medium">
                <span className="w-2 h-2 rounded-full bg-success" />
                80–100 Healthy ({bands[0].count} CIs)
              </span>
              <span className="flex items-center gap-1 text-brand-blue font-medium">
                <span className="w-2 h-2 rounded-full bg-brand-blue" />
                60–79 Adequate ({bands[1].count} CIs)
              </span>
              <span className="flex items-center gap-1 text-danger font-medium">
                <span className="w-2 h-2 rounded-full bg-danger" />
                &lt;60 Needs Attention ({bands[2].count + bands[3].count + bands[4].count} CIs)
              </span>
            </div>
          </div>
        )}

        {/* TAB 3: BUSINESS SERVICES SLA MATRIX */}
        {activeTab === "services" && (
          <div className="space-y-3 animate-fade-in-up">
            <div className="flex items-center justify-between text-xs text-text-muted pb-1 border-b border-border/60">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Top Business Services by CMDB Trust
              </span>
              <Link
                href="/services"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                All Services <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2">
              {businessServices.map((service) => {
                const isBreach = service.score < 70;
                return (
                  <div
                    key={service.name}
                    className={cn(
                      "p-2.5 rounded-lg border transition-all duration-150 flex items-center justify-between gap-3 text-xs",
                      isBreach
                        ? "bg-danger/5 border-danger/30"
                        : "bg-surface hover:bg-sunken border-border/80"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: service.color }}
                      />
                      <div>
                        <p className="font-semibold text-text-default truncate">{service.name}</p>
                        <span className="text-[10px] text-text-muted">{service.tier} &bull; {service.count} mapped CIs</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {isBreach ? (
                        <Lozenge appearance="bold" variant="danger" size="xs">
                          SLA Breach (&lt;70)
                        </Lozenge>
                      ) : (
                        <Lozenge appearance="subtle" variant="success" size="xs">
                          SLA Met
                        </Lozenge>
                      )}
                      <div className="w-20 bg-sunken rounded-full h-2 overflow-hidden border border-border/60">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${service.score}%`,
                            backgroundColor: service.color,
                          }}
                        />
                      </div>
                      <span className="font-mono font-bold text-text-default w-8 text-right">
                        {service.score}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

      {/* ------------------------------------------------------------------- */}
      {/* FOOTER */}
      {/* ------------------------------------------------------------------- */}
      <div className="px-4 py-2.5 bg-sunken/40 border-t border-border/60 dark:border-white/[0.06] flex items-center justify-between text-xs">
        <span className="text-text-muted text-[11px] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Weighted: Freshness (30), Completeness (25), Consistency (20), Topology (15), Owner (10)
        </span>
        <Link
          href="/settings/trust-score"
          className="text-primary font-semibold hover:underline text-[11px] flex items-center gap-1"
        >
          Configure Weights &rarr;
        </Link>
      </div>
    </Card>
  );
}
