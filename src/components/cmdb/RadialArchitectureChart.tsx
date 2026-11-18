"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Boxes, Layers, Server, Cloud, Database, Cpu, ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lozenge } from "@/components/ui/Lozenge";
import { useCMDB } from "@/context/cmdb-context";
import { cn } from "@/lib/utils";
import { getDashboardMetrics } from "@/lib/dashboard/metrics";

export function RadialArchitectureChart() {
  const { cis, relationships, discoverySources, dataQualityTasks, attestationCampaigns, auditHistory, selectedEnvironment, activeTenant } = useCMDB();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Compute metrics from single shared selector
  const metrics = useMemo(() => {
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
  }, [cis, relationships, discoverySources, dataQualityTasks, attestationCampaigns, auditHistory, selectedEnvironment, activeTenant]);

  const totalCIs = metrics.totalCIs;

  const iconMap: Record<string, React.ElementType> = {
    compute: Server,
    k8s: Cpu,
    cloud: Cloud,
    databases: Database,
    microservices: Layers,
    uncategorized: Boxes,
  };

  // Donut Geometry
  const size = 200;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate cumulative offsets for SVG stroke-dashoffset
  const segmentsWithAngles = useMemo(() => {
    let currentPct = 0;
    return metrics.architectureSegments.map((cat, idx) => {
      const strokeDasharray = `${(cat.pct / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -((currentPct / 100) * circumference);
      currentPct += cat.pct;
      const Icon = iconMap[cat.id] || Boxes;
      return {
        ...cat,
        idx,
        icon: Icon,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [metrics.architectureSegments, circumference]);

  const activeSegment = hoveredIdx !== null ? segmentsWithAngles[hoveredIdx] : null;

  return (
    <Card className="bg-surface border-border shadow-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold text-text-default">
              Architecture & Fleet Composition
            </CardTitle>
            <Lozenge appearance="subtle" variant="info" size="xs">
              100% Breakdown
            </Lozenge>
          </div>
          <CardDescription className="text-xs text-text-secondary">
            Multi-tier breakdown across compute, container, database, cloud, and uncategorized
          </CardDescription>
        </div>
        <Link
          href="/cis"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          View Catalog <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row items-center justify-around gap-6">
          {/* Animated Donut SVG Graphic */}
          <div className="relative flex items-center justify-center flex-shrink-0">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="transform -rotate-90 select-none overflow-visible"
            >
              {/* Background circular track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-sunken border border-border"
              />

              {/* Animated Arc Segments */}
              {segmentsWithAngles.map((seg) => {
                const isHovered = hoveredIdx === seg.idx;
                return (
                  <circle
                    key={seg.name}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={seg.strokeColor}
                    strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    strokeLinecap="butt"
                    className="transition-all duration-300 ease-out cursor-pointer filter drop-shadow-xs"
                    onMouseEnter={() => setHoveredIdx(seg.idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                );
              })}
            </svg>

            {/* Central Animated Informational Hub */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4 animate-scale-in">
              {activeSegment ? (
                <div className="space-y-0.5">
                  <span className="font-mono text-2xl font-black text-text-default tracking-tight">
                    {activeSegment.count}
                  </span>
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider truncate max-w-[120px]">
                    {activeSegment.name}
                  </p>
                  <span className="inline-block font-mono text-xs font-bold text-primary">
                    {activeSegment.pct}% of fleet
                  </span>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <span className="font-mono text-3xl font-black text-text-default tracking-tight">
                    {totalCIs}
                  </span>
                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                    Total CIs
                  </span>
                  <span className="text-[10px] text-success font-semibold flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping" />
                    100% Accounted
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Side Interactive Breakdown List */}
          <div className="w-full space-y-2 flex-1 max-w-full lg:max-w-sm">
            {segmentsWithAngles.map((seg) => {
              const isHovered = hoveredIdx === seg.idx;
              const Icon = seg.icon;
              return (
                <div
                  key={seg.name}
                  onMouseEnter={() => setHoveredIdx(seg.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={cn(
                    "p-2 rounded-lg border transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 text-xs",
                    isHovered
                      ? "bg-selected-bg border-primary shadow-subtle -translate-x-1"
                      : "bg-surface hover:bg-sunken border-border/80"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 shadow-xs"
                      style={{ backgroundColor: seg.strokeColor }}
                    />
                    <Icon className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
                    <span className="font-semibold text-text-default truncate">
                      {seg.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 font-mono">
                    <span className="font-bold text-text-default">{seg.count}</span>
                    <span className="text-text-secondary text-[11px] font-medium">({seg.pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
