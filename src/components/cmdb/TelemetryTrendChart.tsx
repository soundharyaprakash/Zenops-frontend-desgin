"use client";

import React, { useState, useMemo } from "react";
import { Activity, TrendingUp, Sparkles, Layers, RefreshCw, Calendar, Zap, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lozenge } from "@/components/ui/Lozenge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type MetricMode = "trust" | "volume" | "reconciliation";
type TimeRange = "7d" | "14d" | "30d";

interface DataPoint {
  day: string;
  fullDate: string;
  trustScore: number;
  volume: number;
  reconciled: number;
  conflicts: number;
}

export function TelemetryTrendChart() {
  const [metricMode, setMetricMode] = useState<MetricMode>("trust");
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Generate continuous baseline timeseries data for realistic enterprise CMDB telemetry
  const allData: DataPoint[] = useMemo(() => {
    const raw = [
      { day: "Oct 19", fullDate: "19 Oct 2026", trustScore: 78.4, volume: 142, reconciled: 138, conflicts: 4 },
      { day: "Oct 21", fullDate: "21 Oct 2026", trustScore: 79.1, volume: 168, reconciled: 161, conflicts: 7 },
      { day: "Oct 23", fullDate: "23 Oct 2026", trustScore: 79.8, volume: 155, reconciled: 150, conflicts: 5 },
      { day: "Oct 25", fullDate: "25 Oct 2026", trustScore: 80.5, volume: 210, reconciled: 202, conflicts: 8 },
      { day: "Oct 27", fullDate: "27 Oct 2026", trustScore: 81.2, volume: 194, reconciled: 189, conflicts: 5 },
      { day: "Oct 29", fullDate: "29 Oct 2026", trustScore: 80.9, volume: 180, reconciled: 174, conflicts: 6 },
      { day: "Oct 31", fullDate: "31 Oct 2026", trustScore: 81.8, volume: 245, reconciled: 239, conflicts: 6 },
      { day: "Nov 02", fullDate: "02 Nov 2026", trustScore: 82.4, volume: 220, reconciled: 216, conflicts: 4 },
      { day: "Nov 04", fullDate: "04 Nov 2026", trustScore: 83.1, volume: 198, reconciled: 194, conflicts: 4 },
      { day: "Nov 06", fullDate: "06 Nov 2026", trustScore: 83.7, volume: 260, reconciled: 254, conflicts: 6 },
      { day: "Nov 08", fullDate: "08 Nov 2026", trustScore: 84.2, volume: 235, reconciled: 230, conflicts: 5 },
      { day: "Nov 10", fullDate: "10 Nov 2026", trustScore: 84.8, volume: 215, reconciled: 211, conflicts: 4 },
      { day: "Nov 12", fullDate: "12 Nov 2026", trustScore: 85.5, volume: 290, reconciled: 285, conflicts: 5 },
      { day: "Nov 14", fullDate: "14 Nov 2026", trustScore: 85.9, volume: 275, reconciled: 271, conflicts: 4 },
      { day: "Nov 16", fullDate: "16 Nov 2026", trustScore: 86.4, volume: 312, reconciled: 308, conflicts: 4 },
    ];
    return raw;
  }, []);

  const data = useMemo(() => {
    if (timeRange === "7d") return allData.slice(-5);
    if (timeRange === "14d") return allData.slice(-9);
    return allData;
  }, [allData, timeRange]);

  // Chart coordinate geometry
  const width = 800;
  const height = 240;
  const padLeft = 46;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 34;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Extract min/max based on selected metric
  const { values, unit, minVal, maxVal, label } = useMemo(() => {
    if (metricMode === "trust") {
      const vals = data.map((d) => d.trustScore);
      return {
        values: vals,
        unit: "%",
        minVal: 70,
        maxVal: 95,
        label: "Enterprise Trust Score",
      };
    } else if (metricMode === "volume") {
      const vals = data.map((d) => d.volume);
      return {
        values: vals,
        unit: " CIs",
        minVal: 100,
        maxVal: 350,
        label: "Discovered Telemetry Volume",
      };
    } else {
      const vals = data.map((d) => d.reconciled);
      return {
        values: vals,
        unit: " IRE Matches",
        minVal: 100,
        maxVal: 350,
        label: "Auto-Reconciled Ingestion Rate",
      };
    }
  }, [data, metricMode]);

  // Map data to coordinates
  const points = useMemo(() => {
    return values.map((val, i) => {
      const denom = Math.max(1, values.length - 1);
      const x = padLeft + (i / denom) * chartW;
      const normalizedY = (val - minVal) / Math.max(1, maxVal - minVal);
      const y = padTop + (1 - Math.max(0, Math.min(1, normalizedY))) * chartH;
      return { x, y, val, item: data[i] || data[0] };
    });
  }, [values, minVal, maxVal, chartW, chartH, padLeft, padTop, data]);

  // Smooth SVG Bezier Path
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: "", areaPath: "" };

    let line = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      line += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const baselineY = padTop + chartH;
    const area = `${line} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

    return { linePath: line, areaPath: area };
  }, [points, padTop, chartH]);

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : points[points.length - 1];

  return (
    <Card className="bg-surface border-border shadow-card overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/60 dark:border-white/[0.06] bg-sunken/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-8 h-8 rounded-lg bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue flex items-center justify-center">
                <TrendingUp className="w-4.5 h-4.5" />
              </div>
              <CardTitle className="text-base font-bold text-text-default">
                Telemetry & Data Trust Velocity
              </CardTitle>
              <Lozenge appearance="subtle" variant="success" size="sm">
                Live Stream
              </Lozenge>
            </div>
            <CardDescription className="text-xs text-text-secondary mt-1">
              Real-time progression of automated discovery health, IRE precision, and algorithmic trust
            </CardDescription>
          </div>

          {/* Metric Selector & Range Controls */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Metric Mode Toggle */}
            <div className="inline-flex rounded-lg border border-border bg-sunken p-1 text-xs max-w-full overflow-x-auto whitespace-nowrap scrollbar-none">
              <button
                type="button"
                onClick={() => setMetricMode("trust")}
                className={cn(
                  "px-2.5 py-1 rounded font-medium transition-all duration-150 flex-shrink-0",
                  metricMode === "trust"
                    ? "bg-surface text-primary shadow-xs font-semibold"
                    : "text-text-secondary hover:text-text-default"
                )}
              >
                Trust Score %
              </button>
              <button
                type="button"
                onClick={() => setMetricMode("volume")}
                className={cn(
                  "px-2.5 py-1 rounded font-medium transition-all duration-150 flex-shrink-0",
                  metricMode === "volume"
                    ? "bg-surface text-primary shadow-xs font-semibold"
                    : "text-text-secondary hover:text-text-default"
                )}
              >
                Payload Volume
              </button>
              <button
                type="button"
                onClick={() => setMetricMode("reconciliation")}
                className={cn(
                  "px-2.5 py-1 rounded font-medium transition-all duration-150 flex-shrink-0",
                  metricMode === "reconciliation"
                    ? "bg-surface text-primary shadow-xs font-semibold"
                    : "text-text-secondary hover:text-text-default"
                )}
              >
                IRE Matches
              </button>
            </div>

            {/* Time Range Toggle */}
            <div className="inline-flex rounded-lg border border-border bg-sunken p-1 text-xs flex-shrink-0">
              {(["7d", "14d", "30d"] as TimeRange[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeRange(r)}
                  className={cn(
                    "px-2 py-1 rounded font-medium uppercase transition-all duration-150",
                    timeRange === r
                      ? "bg-surface text-text-default shadow-xs font-bold"
                      : "text-text-secondary hover:text-text-default"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Highlight Stat Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
          <div className="p-2.5 rounded-lg bg-surface border border-border/80">
            <span className="text-[11px] text-text-muted font-medium block">Current Trajectory</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold font-mono text-text-default">
                {activePoint?.val}
                {unit}
              </span>
              <span className="text-xs font-semibold text-success flex items-center">
                &uarr; +3.2%
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-surface border border-border/80">
            <span className="text-[11px] text-text-muted font-medium block">Active Window Peak</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold font-mono text-brand-blue">
                {Math.max(...values)}
                {unit}
              </span>
              <span className="text-[10px] text-text-muted">High water</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-surface border border-border/80">
            <span className="text-[11px] text-text-muted font-medium block">IRE Reconciliation Precision</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold font-mono text-success">98.4%</span>
              <span className="text-[10px] text-text-muted">&lt;1.6% conflicts</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-surface border border-border/80">
            <span className="text-[11px] text-text-muted font-medium block">Scan Interval Cadence</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold font-mono text-brand-cyan">15 min</span>
              <span className="text-[10px] text-text-muted">Automated</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 relative">
        {/* Animated Interactive SVG Chart */}
        <div className="w-full relative">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              {/* Gradient Area Fill */}
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1F6BFF" stopOpacity="0.32" />
                <stop offset="50%" stopColor="#19C8F0" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#3EF2B5" stopOpacity="0.01" />
              </linearGradient>

              {/* Stroke Gradient */}
              <linearGradient id="lineStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#1F6BFF" />
                <stop offset="50%" stopColor="#19C8F0" />
                <stop offset="100%" stopColor="#3EF2B5" />
              </linearGradient>

              {/* Glow filter */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const y = padTop + pct * chartH;
              const val = Math.round(maxVal - pct * (maxVal - minVal));
              return (
                <g key={idx}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="currentColor"
                    className="text-border/60 dark:text-white/[0.06]"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="text-[10px] font-mono fill-current text-text-muted"
                  >
                    {val}
                    {metricMode === "trust" ? "%" : ""}
                  </text>
                </g>
              );
            })}

            {/* Area Path */}
            <path
              d={areaPath}
              fill="url(#trendGradient)"
              className="transition-all duration-500 ease-out"
            />

            {/* Main Animated Glowing Curve */}
            <path
              key={`${metricMode}-${timeRange}`}
              d={linePath}
              fill="none"
              stroke="url(#lineStrokeGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-chart-line filter drop-shadow-sm"
            />

            {/* Data Points and Hit Targets */}
            {points.map((p, i) => {
              const isHovered = hoveredIndex === i;
              const isLast = i === points.length - 1;

              return (
                <g key={i}>
                  {/* Subtle static node dot */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 6 : 3.5}
                    className={cn(
                      "transition-all duration-150 fill-surface stroke-2",
                      isHovered
                        ? "stroke-brand-blue ring-4 ring-brand-blue/30 scale-125"
                        : "stroke-brand-cyan"
                    )}
                  />

                  {/* Pulsing beacon on the latest realtime data point */}
                  {isLast && hoveredIndex === null && (
                    <g>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="8"
                        className="fill-brand-cyan/30 animate-ping"
                      />
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="4"
                        className="fill-brand-cyan animate-pulse"
                      />
                    </g>
                  )}

                  {/* Invisible broad hitbox for effortless mouse hover */}
                  <rect
                    x={p.x - chartW / (points.length * 2)}
                    y={padTop}
                    width={chartW / points.length}
                    height={chartH}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(i)}
                  />
                </g>
              );
            })}

            {/* Active Vertical Guideline when hovering */}
            {hoveredIndex !== null && activePoint && (
              <g>
                <line
                  x1={activePoint.x}
                  y1={padTop}
                  x2={activePoint.x}
                  y2={padTop + chartH}
                  stroke="#19C8F0"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  className="animate-in fade-in"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="7"
                  className="fill-brand-cyan stroke-2 stroke-surface animate-scale-in"
                />
              </g>
            )}

            {/* X-Axis Date Labels */}
            {points.map((p, i) => {
              // Show alternate or spaced labels on small ranges
              if (points.length > 10 && i % 2 !== 0 && i !== points.length - 1) return null;
              return (
                <text
                  key={i}
                  x={p.x}
                  y={height - 8}
                  textAnchor="middle"
                  className={cn(
                    "text-[10px] font-mono fill-current transition-colors",
                    hoveredIndex === i
                      ? "text-primary font-bold"
                      : "text-text-muted"
                  )}
                >
                  {p.item.day}
                </text>
              );
            })}
          </svg>

          {/* Interactive Floating Tooltip Card */}
          {hoveredIndex !== null && activePoint && activePoint.item && (
            <div
              className="absolute z-20 pointer-events-none p-3 rounded-lg bg-surface/95 dark:bg-raised/95 backdrop-blur-md border border-border shadow-raised animate-scale-in transition-all duration-75 text-xs space-y-1.5"
              style={{
                left: `${Math.min(Math.max((activePoint.x / width) * 100, 15), 85)}%`,
                top: `${Math.max(activePoint.y - 88, 10)}px`,
                transform: "translateX(-50%)",
              }}
            >
              <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-1">
                <span className="font-mono font-bold text-text-default">
                  {activePoint.item.fullDate}
                </span>
                <span className="text-[10px] text-text-muted">Day {hoveredIndex + 1}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-text-muted">{label}:</span>
                <span className="font-mono font-bold text-primary">
                  {activePoint.val}
                  {unit}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-text-muted">IRE Precision:</span>
                <span className="font-mono text-success">
                  {activePoint.item && activePoint.item.volume > 0
                    ? Math.round((activePoint.item.reconciled / activePoint.item.volume) * 100)
                    : 98}%
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-text-muted">Active Discovered:</span>
                <span className="font-mono text-text-secondary">
                  {activePoint.item.volume} items
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
