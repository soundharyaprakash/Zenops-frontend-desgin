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
  Gauge,
  BarChart3,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lozenge } from "@/components/ui/Lozenge";
import { useCMDB } from "@/context/cmdb-context";
import { cn } from "@/lib/utils";
import { getDashboardMetrics, HEALTH_BANDS } from "@/lib/dashboard/metrics";

type ViewTab = "histogram" | "gauge" | "services";

export function TrustScoreAnalyticsCard() {
  const {
    cis,
    relationships,
    discoverySources,
    dataQualityTasks,
    attestationCampaigns,
    auditHistory,
    selectedEnvironment,
    activeTenant,
  } = useCMDB();

  // Priority 4, Item 15: Score distribution histogram as default view
  const [activeTab, setActiveTab] = useState<ViewTab>("histogram");
  const [hoveredPillar, setHoveredPillar] = useState<string | null>(null);
  const [hoveredBand, setHoveredBand] = useState<string | null>(null);

  // Single shared selector module for consistency
  const dashboardData = useMemo(() => {
    return getDashboardMetrics(
      cis,
      relationships,
      discoverySources,
      dataQualityTasks,
      attestationCampaigns,
      auditHistory,
      selectedEnvironment,
      activeTenant
    );
  }, [
    cis,
    relationships,
    discoverySources,
    dataQualityTasks,
    attestationCampaigns,
    auditHistory,
    selectedEnvironment,
    activeTenant,
  ]);

  const totalCIs = Math.max(1, dashboardData.totalCIs);
  const avgScore = dashboardData.weightedTrustScore;
  const pillars = dashboardData.trustPillars;
  const bands = dashboardData.scoreHistogramBands;
  const maxBandCount = Math.max(...bands.map((b) => b.count), 1);
  const businessServices = dashboardData.servicesHealth;

  // ---------------------------------------------------------------------------
  // SPEEDOMETER GAUGE GEOMETRY (Single hue with threshold bands)
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
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60 bg-sunken/20">
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
                  variant={dashboardData.trustBand.lozengeVariant}
                  size="xs"
                >
                  {dashboardData.trustBand.targetLabel}
                </Lozenge>
              </CardTitle>
              <CardDescription className="text-xs text-text-secondary mt-0.5">
                Weighted algorithmic score: Freshness (30), Completeness (25), Consistency (20), Topology (15), Owner (10)
              </CardDescription>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs - Flex wrap to prevent cut-off */}
        <div className="inline-flex rounded-lg border border-border bg-sunken p-1 text-xs select-none max-w-full flex-wrap sm:flex-nowrap gap-0.5">
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
            <span>Histogram</span>
          </button>

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
            onClick={() => setActiveTab("services")}
            className={cn(
              "px-2.5 py-1 rounded font-medium transition-all duration-150 flex items-center gap-1.5 flex-shrink-0",
              activeTab === "services"
                ? "bg-surface text-primary shadow-xs font-semibold"
                : "text-text-secondary hover:text-text-default"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Services</span>
          </button>
        </div>
      </CardHeader>

      {/* ------------------------------------------------------------------- */}
      {/* BODY CONTENT BY TAB */}
      {/* ------------------------------------------------------------------- */}
      <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-center">
        {/* TAB 1: ANIMATED 5-TIER HISTOGRAM (DEFAULT) */}
        {activeTab === "histogram" && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between text-xs text-text-muted pb-1 border-b border-border/60">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                CI Distribution Across Health Bands
              </span>
              <span className="text-text-muted text-[11px]">
                Threshold: &ge;80 Healthy &bull; 70–79 At risk &bull; &lt;70 Critical
              </span>
            </div>

            {/* Vertical Bar Histogram (Single hue with threshold bands) */}
            <div className="grid grid-cols-5 gap-3 h-40 items-end pt-2 select-none">
              {bands.map((band) => {
                const isHovered = hoveredBand === band.range;
                const barHeightPct = Math.max(14, Math.round((band.count / maxBandCount) * 100));

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
                        {band.pct}%
                      </span>
                    </div>

                    {/* Animated Histogram Column (Single hue base with health band accents) */}
                    <div className="w-full bg-sunken rounded-t-md h-28 relative overflow-hidden border border-border/60 flex items-end">
                      <div
                        className={cn(
                          "w-full rounded-t-md transition-all duration-700 ease-out relative group-hover:brightness-110 shadow-xs"
                        )}
                        style={{
                          height: `${barHeightPct}%`,
                          backgroundColor: band.healthBand.color,
                        }}
                      >
                        {/* Shimmer top pulse */}
                        <div className="absolute top-0 inset-x-0 h-1 bg-white/50" />
                      </div>
                    </div>

                    {/* Band Range Label */}
                    <span className="font-mono text-[11px] font-semibold text-text-default text-center">
                      {band.range}
                    </span>
                    <span className="text-[10px] text-text-muted text-center leading-tight">
                      {band.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom Health Bands Legend */}
            <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between text-[11px] text-text-muted gap-2">
              <span className="flex items-center gap-1.5 text-success font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-success" />
                &ge;80 Healthy ({bands[0].count} CIs)
              </span>
              <span className="flex items-center gap-1.5 text-warning font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-warning" />
                60–79 At risk ({bands[1].count} CIs)
              </span>
              <span className="flex items-center gap-1.5 text-danger font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-danger" />
                &lt;60 Critical ({bands[2].count + bands[3].count + bands[4].count} CIs)
              </span>
            </div>
          </div>
        )}

        {/* TAB 2: GAUGE & 5-DIMENSION PILLARS (SECONDARY) */}
        {activeTab === "gauge" && (
          <div className="space-y-5 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
              {/* Semi-Circular Speedometer Gauge with Single Hue and 80% Threshold Band */}
              <div className="relative flex flex-col items-center justify-center flex-shrink-0 select-none">
                <svg width="220" height="125" viewBox="0 0 220 125" className="overflow-visible">
                  <defs>
                    {/* Single Hue Cyan-to-Blue Linear Gradient */}
                    <linearGradient id="singleHueGauge" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#0C66E4" />
                      <stop offset="50%" stopColor="#19C8F0" />
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

                  {/* Target 80% Threshold Tick Indicator */}
                  <circle cx="165" cy="52" r="4" className="fill-success animate-ping" />
                  <circle cx="165" cy="52" r="3" className="fill-success" />

                  {/* Active Animated Arc */}
                  <path
                    d="M 32 100 A 78 78 0 0 1 188 100"
                    fill="none"
                    stroke="url(#singleHueGauge)"
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

                {/* Weighted Score Readout */}
                <div className="mt-[-28px] text-center space-y-0.5">
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="font-mono text-3xl font-black text-text-default tracking-tight">
                      {avgScore}
                    </span>
                    <span className="font-mono text-lg font-bold text-text-muted">%</span>
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-semibold flex items-center justify-center gap-1",
                      avgScore >= 80 ? "text-success" : avgScore >= 60 ? "text-warning" : "text-danger"
                    )}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full animate-ping",
                        avgScore >= 80 ? "bg-success" : avgScore >= 60 ? "bg-warning" : "bg-danger"
                      )}
                    />
                    Weighted score: {dashboardData.trustBand.targetLabel}
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

                        {/* Vertical animated bar column - explicit background color ensures NO empty bars */}
                        <div className="w-full bg-sunken rounded-t-md h-24 relative overflow-hidden border border-border/40 flex items-end">
                          <div
                            className="w-full rounded-t-md transition-all duration-700 ease-out relative group-hover:brightness-110 shadow-xs"
                            style={{
                              height: `${pillar.score}%`,
                              backgroundColor: pillar.color,
                            }}
                          >
                            {/* Glowing top line */}
                            <div className="absolute top-0 inset-x-0 h-1 bg-white/40" />
                          </div>
                        </div>

                        {/* Pillar label & weight - NO TRUNCATION */}
                        <span className="text-[10px] font-bold text-text-default text-center mt-0.5 leading-tight break-words">
                          {pillar.label}
                        </span>
                        <span className="text-[9px] font-mono text-text-muted">
                          {pillar.weightLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Dynamic Pillar Explainer */}
                <div className="p-2 rounded-md bg-sunken border border-border/70 text-[11px] flex items-center justify-between min-h-[34px]">
                  {hoveredPillar ? (
                    (() => {
                      const p = pillars.find((x) => x.id === hoveredPillar);
                      if (!p) return null;
                      return (
                        <div className="flex items-center justify-between w-full">
                          <div className="truncate mr-2">
                            <span className="font-semibold text-text-default">{p.label}: </span>
                            <span className="text-text-secondary">{p.description}</span>
                          </div>
                          <span className="font-mono font-bold text-primary flex-shrink-0">
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

        {/* TAB 3: BUSINESS SERVICES SLA MATRIX */}
        {activeTab === "services" && (
          <div className="space-y-3 animate-fade-in-up">
            <div className="flex items-center justify-between text-xs text-text-muted pb-1 border-b border-border/60">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Business Services by Weighted CMDB Trust
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
                const isBelowTarget = service.score < 80;
                return (
                  <div
                    key={service.name}
                    className={cn(
                      "p-2.5 rounded-lg border transition-all duration-150 flex items-center justify-between gap-3 text-xs",
                      isBelowTarget
                        ? "bg-warning/5 border-warning/30"
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
                        <span className="text-[10px] text-text-muted">
                          {service.tier} &bull; {service.count} mapped CIs
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Lozenge
                        appearance="bold"
                        variant={service.band.lozengeVariant}
                        size="xs"
                      >
                        {service.band.label}
                      </Lozenge>
                      <Lozenge
                        appearance={isBelowTarget ? "bold" : "subtle"}
                        variant={service.targetStatus.variant}
                        size="xs"
                      >
                        {service.targetStatus.label}
                      </Lozenge>
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
      <div className="px-4 py-2.5 bg-sunken/40 border-t border-border/60 flex items-center justify-between text-xs">
        <span className="text-text-muted text-[11px] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Weighted score: Freshness (30), Completeness (25), Consistency (20), Topology (15), Owner (10)
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
