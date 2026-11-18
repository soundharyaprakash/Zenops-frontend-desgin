"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Boxes, PieChart, Layers, Server, Cloud, Database, Cpu, Globe, Shield, ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lozenge } from "@/components/ui/Lozenge";
import { useCMDB } from "@/context/cmdb-context";
import { cn } from "@/lib/utils";
import { CIClass } from "@/types/cmdb";

interface CategorySegment {
  name: string;
  count: number;
  pct: number;
  color: string;
  strokeColor: string;
  icon: React.ElementType;
}

export function RadialArchitectureChart() {
  const { cis } = useCMDB();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const totalCIs = Math.max(1, cis.length);

  // Group classes into major architectural domains
  const categories: CategorySegment[] = useMemo(() => {
    const rawCategories: { name: string; ciClasses: string[]; color: string; strokeColor: string; icon: React.ElementType }[] = [
      {
        name: "Compute & Virtualization",
        ciClasses: ["Server/VM", "cmdb_ci_server", "cmdb_ci_vm_instance"],
        color: "bg-brand-blue",
        strokeColor: "#1F6BFF",
        icon: Server,
      },
      {
        name: "Kubernetes & Containers",
        ciClasses: ["Container/Pod", "cmdb_ci_kubernetes_cluster", "cmdb_ci_docker_container"],
        color: "bg-brand-cyan",
        strokeColor: "#19C8F0",
        icon: Cpu,
      },
      {
        name: "Cloud & VPC Infrastructure",
        ciClasses: ["Cloud Resource", "cmdb_ci_cloud_resource", "cmdb_ci_aws_resource"],
        color: "bg-brand-mint",
        strokeColor: "#3EF2B5",
        icon: Cloud,
      },
      {
        name: "Databases & Storage",
        ciClasses: ["Database", "cmdb_ci_database"],
        color: "bg-warning",
        strokeColor: "#F5CD47",
        icon: Database,
      },
      {
        name: "Applications & Microservices",
        ciClasses: ["Application", "cmdb_ci_appl"],
        color: "bg-primary",
        strokeColor: "#0C66E4",
        icon: Layers,
      },
      {
        name: "Network & Perimeters",
        ciClasses: ["Network Device", "cmdb_ci_network_switch", "cmdb_ci_firewall", "SaaS Subscription"],
        color: "bg-discovery",
        strokeColor: "#9F8FEF",
        icon: Globe,
      },
    ];

    let accumulated = 0;
    return rawCategories.map((cat) => {
      const count = cis.filter((c) => c && c.ciClass && cat.ciClasses.includes(c.ciClass)).length;
      const pct = Math.max(1, Math.round((count / totalCIs) * 100));
      accumulated += count;
      return {
        name: cat.name,
        count,
        pct,
        color: cat.color,
        strokeColor: cat.strokeColor,
        icon: cat.icon,
      };
    });
  }, [cis, totalCIs]);

  // Donut Geometry
  const size = 200;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate cumulative offsets for SVG stroke-dashoffset
  const segmentsWithAngles = useMemo(() => {
    let currentPct = 0;
    return categories.map((cat, idx) => {
      const strokeDasharray = `${(cat.pct / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -((currentPct / 100) * circumference);
      currentPct += cat.pct;
      return {
        ...cat,
        idx,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [categories, circumference]);

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
              Radial Breakdown
            </Lozenge>
          </div>
          <CardDescription className="text-xs text-text-secondary">
            Multi-tier breakdown across compute, container, database, and cloud estates
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
                    100% Tracked
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
