"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Activity,
  AlertOctagon,
  Award,
  Clock,
  Copy,
  CheckCircle,
  Plus,
  ShieldAlert,
  ArrowRight,
  History,
  Check,
  AlertTriangle,
  Server,
  Lock,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Search,
  Sparkles,
  FileSpreadsheet,
  Upload,
  Network,
  Users,
} from "lucide-react";
import { KpiCard } from "@/components/cmdb/KpiCard";
import { DashboardCharts } from "@/components/cmdb/DashboardCharts";
import { GettingStartedBanner } from "@/components/cmdb/GettingStartedBanner";
import { CIBulkUploadModal } from "@/components/cmdb/CIBulkUploadModal";
import {
  Button,
  Lozenge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  InfoHint,
} from "@/components/ui";
import { useCMDB } from "@/context/cmdb-context";
import { formatDateTime } from "@/utils";
import { usePermission } from "@/components/rbac/usePermission";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getDashboardMetrics } from "@/lib/dashboard/metrics";
import { PrimaryButton } from "@/components/shared/PrimaryButton";
import {
  getTaskQueueMetrics,
  ESTATE_TRUST_SCORE_LABEL,
} from "@/lib/cmdb-metrics";

export function CMDBDashboardView() {
  const router = useRouter();
  const taskQueueMetrics = useMemo(() => getTaskQueueMetrics(), []);
  const {
    cis,
    relationships,
    discoverySources,
    dataQualityTasks,
    attestationCampaigns,
    auditHistory,
    userRole,
    activeTenant,
    selectedEnvironment,
    showToast,
  } = useCMDB();

  const [exporting, setExporting] = useState(false);
  const [showSecondaryMetrics, setShowSecondaryMetrics] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const { allowed: canViewCI } = usePermission(PERMISSIONS.CI_VIEW);
  const { allowed: canViewAudit } = usePermission(PERMISSIONS.AUDIT_VIEW);
  const { allowed: canEditCI } = usePermission(PERMISSIONS.CI_EDIT);

  const isExecutive = String(userRole).includes("Executive") || String(userRole).includes("Report");
  const canCreate = canEditCI && userRole !== "Viewer";

  // ONE SHARED SELECTOR MODULE (Priority 1, Item 1)
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

  // Export as formatted CSV spreadsheet compatible with Microsoft Excel
  const handleExportCSV = () => {
    setExporting(true);
    setTimeout(() => {
      try {
        const headers = [
          "CI ID",
          "Configuration Item Name",
          "CI Class",
          "Environment",
          "Lifecycle Status",
          "Operational Status",
          "Business Criticality",
          "Primary Owner",
          "Support Group",
          "Trust Score",
          "IP Address",
          "MAC Address",
          "Serial Number",
          "Asset Tag",
          "Location",
          "Vendor",
          "Model",
          "Cost",
          "Currency",
          "PO Number",
          "First Discovered",
          "Last Discovered",
        ];

        const escapeCSV = (str: string | number | undefined | null) => {
          if (str === undefined || str === null) return '""';
          const val = String(str).replace(/"/g, '""');
          return `"${val}"`;
        };

        const rows = cis.map((c) => [
          escapeCSV(c.id),
          escapeCSV(c.name),
          escapeCSV(c.ciClass),
          escapeCSV(c.environment),
          escapeCSV(c.lifecycleStatus),
          escapeCSV(c.operationalStatus),
          escapeCSV(c.businessCriticality),
          escapeCSV(c.owner),
          escapeCSV(c.supportGroup || ""),
          c.trustScore,
          escapeCSV(c.ip_address || c.identificationKeys?.ipAddress || c.attributes?.ipAddress || ""),
          escapeCSV(c.mac_address || c.identificationKeys?.macAddress || ""),
          escapeCSV(c.serialNumber || c.identificationKeys?.serialNumber || ""),
          escapeCSV(c.assetTag || ""),
          escapeCSV(c.location || ""),
          escapeCSV(c.vendor || ""),
          escapeCSV(c.model || ""),
          c.cost || 0,
          escapeCSV(c.currency || "USD"),
          escapeCSV(c.po_number || ""),
          escapeCSV(c.firstDiscovered || ""),
          escapeCSV(c.lastDiscovered || ""),
        ]);

        const csvContent =
          "\uFEFF" +
          [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const downloadAnchor = document.createElement("a");
        downloadAnchor.href = url;
        downloadAnchor.setAttribute(
          "download",
          `zenops-cmdb-${activeTenant.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`
        );
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);
        URL.revokeObjectURL(url);

        showToast(
          "success",
          "Excel CSV Exported",
          `Exported spreadsheet of ${cis.length} Configuration Items for ${activeTenant}.`
        );
      } catch {
        showToast("error", "Export Failed", "Could not trigger CSV export.");
      } finally {
        setExporting(false);
      }
    }, 400);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in-up">
      {/* ----------------------------------------------------------------------- */}
      {/* GETTING STARTED BANNER (Auto-hides at 100%, Priority 4, Item 14) */}
      {/* ----------------------------------------------------------------------- */}
      <GettingStartedBanner />

      {/* ----------------------------------------------------------------------- */}
      {/* PAGE HEADER */}
      {/* ----------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-text-default tracking-tight">
              CMDB Health Dashboard
            </h1>

            {/* Live Synchronized Badge only when all sources green (Priority 1, Item 4) */}
            {dashboardData.isAllDiscoveryGreen ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success-bg dark:bg-success/15 border border-success/30 text-success text-xs font-semibold shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                </span>
                <span>Live Synchronized</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-warning/15 border border-warning/30 text-warning text-xs font-semibold shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-warning"></span>
                </span>
                <span>Sync delayed</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1 text-xs text-text-muted bg-sunken px-2 py-0.5 rounded border border-border/60">
              <Lock className="w-3 h-3 text-text-muted" />
              Isolated to {activeTenant}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Real-time Configuration Management, Discovery Reconciliation & Service Graph Impact Analysis
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowSecondaryMetrics((prev) => !prev)}
            rightIcon={
              showSecondaryMetrics ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )
            }
            className="flex-1 sm:flex-initial justify-center"
          >
            {showSecondaryMetrics ? "Fewer Metrics" : "More Metrics"}
          </Button>

          {userRole !== "Viewer" && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Upload className="w-3.5 h-3.5 text-primary" />}
              onClick={() => setIsUploadModalOpen(true)}
              className="flex-1 sm:flex-initial justify-center"
            >
              Import CSV
            </Button>
          )}

          {canViewCI && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
              onClick={handleExportCSV}
              isLoading={exporting}
              className="flex-1 sm:flex-initial justify-center"
            >
              Export CSV (Excel)
            </Button>
          )}

          {/* Primary Create CI Button with Tooltip if Disabled (Priority 4, Item 20 & G2) */}
          {canCreate ? (
            <Link href="/cis/new" className="w-full sm:w-auto">
              <PrimaryButton
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                className="w-full sm:w-auto justify-center"
              >
                Create CI
              </PrimaryButton>
            </Link>
          ) : (
            <PrimaryButton
              size="sm"
              disabled
              disabledReason="CI creation requires Editor, CMDB Owner, or Admin role privileges"
              icon={<Plus className="w-3.5 h-3.5" />}
              className="w-full sm:w-auto justify-center"
            >
              Create CI
            </PrimaryButton>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* SECTION 1: INVENTORY VOLUME & TELEMETRY */}
      {/* ----------------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-text-default uppercase tracking-wider">
              Inventory Volume & Telemetry
            </h2>
            <InfoHint
              title="Inventory Volume & Telemetry"
              concept="Measures total managed infrastructure volume, algorithmically scored data trust, staleness velocity, ownership accountability, and duplicate collision rates."
              whyItMatters="Accurate, fresh inventory prevents misconfigured deployments, reduces mean time to resolution (MTTR) during incidents, and ensures compliance."
              target="Target: 80%+ Weighted Trust, <5% Stale, >95% Owner Coverage, 0 Duplicates"
            />
          </div>
          <p className="text-xs text-text-muted hidden sm:block italic">
            Reading order: How much do we have — overall inventory volume, baseline operational state, and active attestation coverage
          </p>
        </div>

        {/* Row 1: 5 Primary KPI Tiles in ONE desktop row without orphan tile (Priority 2, Item 8) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {/* Tile 1: Total CIs (Remove Target: 100%, show Discovery coverage: X% of estate - Priority 3, Item 10) */}
          <KpiCard
            title="Total CIs"
            value={dashboardData.totalCIs}
            subtitle="Indexed assets"
            icon={Boxes}
            targetLabel="Seen by >=1 source (last 14 d): 95%"
            accentColor="primary"
            trend={{ value: "+12 this week", direction: "up", sentiment: "positive" }}
            onClick={() => router.push("/cis")}
            infoHint={{
              concept: "Total number of physical, virtual, cloud, and application configuration items managed in this tenant's CMDB.",
              whyItMatters: "Provides the baseline denominator for IT asset coverage, license forecasting, and security vulnerability scanning.",
              target: "100% of discovered IT infrastructure",
            }}
          />

          {/* Tile 2: Weighted Trust Score (Unified weighted formula - Priority 1, Item 5) */}
          <KpiCard
            title={ESTATE_TRUST_SCORE_LABEL}
            value={`${dashboardData.weightedTrustScore}%`}
            subtitle="Weighted formula"
            icon={Award}
            target="80%+"
            accentColor={dashboardData.trustBand.lozengeVariant}
            trend={{ value: "+2.4% vs last week", direction: "up", sentiment: "positive" }}
            progressPercent={dashboardData.weightedTrustScore}
            onClick={() => router.push("/settings/trust-score")}
            infoHint={{
              concept: "Automated 0-100 score weighted across Freshness (30), Completeness (25), Consistency (20), Topology (15), and Ownership (10).",
              whyItMatters: "High trust scores mean engineers and automation can reliably depend on CMDB data for incident triage and change risk validation.",
              target: "80%+ Enterprise SLA; no critical service below 60",
            }}
          />

          {/* Tile 3: Stale CIs % (Click-through to filtered list, down arrow green - Priority 1, Item 3 & Priority 3, Item 11) */}
          <KpiCard
            title="Stale CIs"
            value={`${Math.round((taskQueueMetrics.staleCount / Math.max(1, cis.length)) * 100)}%`}
            subtitle={`${taskQueueMetrics.staleCount} CIs >14d quiet`}
            icon={Clock}
            target="< 5%"
            accentColor={taskQueueMetrics.staleCount <= 2 ? "success" : "danger"}
            trend={{ value: "-1.1% vs last week", direction: "down", sentiment: "positive" }}
            onClick={() => router.push("/data-quality?tab=stale")}
            infoHint={{
              concept: "Percentage of active configuration items whose telemetry or discovery timestamps have not been refreshed in the past 14 days.",
              whyItMatters: "Stale CIs often represent decommissioned ghost servers still incurring cloud costs or unpatched security vectors.",
              target: "Less than 5% of active inventory",
            }}
          />

          {/* Tile 4: Missing Owner (Click-through to filtered list, down arrow green - Priority 1, Item 3 & Priority 3, Item 11) */}
          <KpiCard
            title="Missing Owner"
            value={`${Math.round((taskQueueMetrics.missingOwnerCount / Math.max(1, cis.length)) * 100)}%`}
            subtitle={`${taskQueueMetrics.missingOwnerCount} unassigned CIs`}
            icon={UserCheck}
            target="< 5%"
            accentColor={taskQueueMetrics.missingOwnerCount <= 2 ? "success" : "danger"}
            trend={{ value: "-4 resolved", direction: "down", sentiment: "positive" }}
            onClick={() => router.push("/data-quality?tab=missing-owner")}
            infoHint={{
              concept: "Percentage and count of Live/In-Use CIs lacking an assigned technical engineer or service ownership group.",
              whyItMatters: "Without explicit owners, critical security alerts and change approval requests stall, creating governance bottlenecks.",
              target: "95%+ ownership coverage (less than 5% unassigned)",
            }}
          />

          {/* Tile 5: Duplicate Suspects (Click-through to IRE Console - Priority 1, Item 3) */}
          <KpiCard
            title="Duplicate Suspects"
            value={taskQueueMetrics.duplicateCount}
            subtitle={`${Math.round((taskQueueMetrics.duplicateCount / Math.max(1, cis.length)) * 100)}% collision rate`}
            icon={Copy}
            target="0"
            accentColor={taskQueueMetrics.duplicateCount === 0 ? "success" : "danger"}
            trend={{
              value: `${taskQueueMetrics.ireReviewQueueCount} pending review`,
              direction: "neutral",
              sentiment: taskQueueMetrics.duplicateCount === 0 ? "positive" : "negative",
            }}
            onClick={() => router.push("/reconciliation-rules?tab=queue")}
            infoHint={{
              concept: "Discovered entities with conflicting or overlapping MAC addresses, serial numbers, or FQDNs flagged by the Reconciliation engine.",
              whyItMatters: "Duplicates fragment telemetry and hide true dependency topologies, corrupting blast-radius incident impact calculation.",
              target: "0 duplicate suspects (100% IRE reconciliation)",
            }}
          />
        </div>

        {/* Collapsible Secondary Row with NEW TILES / METRICS (Requirement 22) */}
        {showSecondaryMetrics && (
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in-50 duration-200">
            {/* New Metric 1: Relationship coverage + orphan CI count */}
            <KpiCard
              title="Relationship Coverage"
              value={`${dashboardData.relationshipCoveragePct}%`}
              subtitle={`${dashboardData.orphanCICount} orphan CIs without links`}
              icon={Network}
              target="90%+"
              accentColor="teal"
              trend={{ value: "+4% mapped", direction: "up", sentiment: "positive" }}
              progressPercent={dashboardData.relationshipCoveragePct}
              onClick={() => router.push("/relationships")}
              infoHint={{
                concept: "Percentage of CIs mapped into topological dependencies plus count of isolated orphan CIs.",
                whyItMatters: "Unmapped orphan CIs create blind spots in outage blast-radius calculation.",
                target: "90%+ mapped dependencies",
              }}
            />

            {/* New Metric 2: Attestation completion */}
            <KpiCard
              title="Attestation Completion"
              value={`${dashboardData.attestationCompletionPct}%`}
              subtitle="Confirmed this quarter"
              icon={CheckCircle}
              target="90%+"
              accentColor="success"
              trend={{ value: "+12% this month", direction: "up", sentiment: "positive" }}
              progressPercent={dashboardData.attestationCompletionPct}
              onClick={() => router.push("/attestation-campaigns")}
              infoHint={{
                concept: "Quarterly certification campaign completion rate by designated infrastructure owners.",
                whyItMatters: "Ensures compliance and keeps ghost infrastructure out of production.",
                target: "90%+ quarterly completion",
              }}
            />

            {/* New Metric 3: Discovery coverage */}
            <KpiCard
              title="Discovery Coverage"
              value={`${dashboardData.discoveryCoveragePct}%`}
              subtitle="Estate actively monitored"
              icon={Boxes}
              target="95%+"
              accentColor="primary"
              trend={{ value: "94% indexed", direction: "neutral", sentiment: "positive" }}
              progressPercent={dashboardData.discoveryCoveragePct}
              onClick={() => router.push("/discovery-sources")}
              infoHint={{
                concept: "Total discovered estate relative to CMDB inventory across connectors.",
                whyItMatters: "Confirms automated sensors cover bare-metal, containers, and cloud VPCs.",
                target: "95%+ discovery coverage",
              }}
            />

            {/* New Metric 4: Owner coverage by team */}
            <KpiCard
              title="Owner Coverage"
              value={`${100 - dashboardData.missingOwnerPercent}%`}
              subtitle={`Across ${dashboardData.teamOwnerCoverage.length} teams`}
              icon={Users}
              target="95%+"
              accentColor="blue"
              trend={{ value: "+3% assigned", direction: "up", sentiment: "positive" }}
              progressPercent={100 - dashboardData.missingOwnerPercent}
              onClick={() => router.push("/data-quality?tab=missing-owner")}
              infoHint={{
                concept: "Proportion of active CIs assigned to recognized support groups and engineers.",
                whyItMatters: "Prevents critical alerts being routed to unmonitored queues.",
                target: "95%+ ownership coverage",
              }}
            />
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* SECTIONS 2 & 3: CHARTS & GOVERNANCE */}
      {/* ----------------------------------------------------------------------- */}
      <DashboardCharts />

      {/* ----------------------------------------------------------------------- */}
      {/* RECENT AUDIT TRAIL STREAM (Fixed overlapping values & shows CI names - Priority 2, Item 7 & Priority 4, Item 19) */}
      {/* ----------------------------------------------------------------------- */}
      {canViewAudit && !isExecutive && (
        <Card className="bg-surface shadow-card">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-text-default">
                  Recent Audit Trail Stream
                </CardTitle>
                <Lozenge appearance="subtle" variant="neutral">
                  Immutable
                </Lozenge>
              </div>
              <CardDescription className="text-sm text-text-secondary">
                Latest field-level configuration updates and governance actions with CI names
              </CardDescription>
            </div>
            <Link
              href="/audit-history"
              className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Full Audit Log <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/60">
              {dashboardData.enrichedAudits.map((item) => (
                <div
                  key={item.id}
                  className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-sm"
                >
                  {/* CI Identifiers & Changed Field */}
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="font-mono text-xs text-text-muted bg-sunken px-2 py-0.5 rounded border border-border/60">
                      {item.ciId}
                    </span>
                    <span className="font-semibold text-text-default truncate max-w-[200px]" title={item.ciName}>
                      {item.ciName}
                    </span>
                    <span className="text-text-muted text-xs">field</span>
                    <span className="font-mono text-primary font-medium text-xs bg-primary/10 px-1.5 py-0.5 rounded">
                      {item.fieldChanged}
                    </span>
                  </div>

                  {/* Non-overlapping Before & After Values with arrow separation */}
                  <div className="flex items-center gap-2.5 text-text-muted flex-shrink-0 text-xs flex-wrap sm:flex-nowrap">
                    <div
                      className="flex items-center gap-1.5 font-mono bg-sunken/80 px-2 py-0.5 rounded border border-border/60 max-w-[260px] truncate"
                      title={`${item.beforeValue} → ${item.afterValue}`}
                    >
                      <span className="text-danger line-through truncate max-w-[110px]">
                        {item.beforeValue}
                      </span>
                      <span className="text-text-muted">&rarr;</span>
                      <span className="text-success font-medium truncate max-w-[110px]">
                        {item.afterValue}
                      </span>
                    </div>

                    <Lozenge appearance="subtle" variant="info">
                      {item.changedBy}
                    </Lozenge>
                    <span className="font-mono text-xs text-text-muted" suppressHydrationWarning>
                      {formatDateTime(item.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk CSV Upload Modal */}
      <CIBulkUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
}
