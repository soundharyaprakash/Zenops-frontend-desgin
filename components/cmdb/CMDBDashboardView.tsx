"use client";

import React, { useState } from "react";
import Link from "next/link";
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
import { Can } from "@/components/rbac/Can";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export function CMDBDashboardView() {
  const {
    cis,
    metrics,
    dataQualityTasks,
    auditHistory,
    applyDQTask,
    userRole,
    activeTenant,
    showToast,
  } = useCMDB();

  const [exporting, setExporting] = useState(false);
  const [showSecondaryMetrics, setShowSecondaryMetrics] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const { allowed: canViewCI } = usePermission(PERMISSIONS.CI_VIEW);
  const { allowed: canViewAudit } = usePermission(PERMISSIONS.AUDIT_VIEW);
  const isExecutive = String(userRole).includes("Executive") || String(userRole).includes("Report");

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

        // UTF-8 BOM (\uFEFF) ensures Microsoft Excel automatically opens with correct UTF-8 encoding
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

  const recentAudits = auditHistory.slice(0, 5);

  return (
    <div className="space-y-6 pb-12 animate-fade-in-up">
      {/* ----------------------------------------------------------------------- */}
      {/* GETTING STARTED BANNER */}
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
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success-bg dark:bg-success/15 border border-success/30 text-success text-xs font-semibold shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <span>Live Synchronized</span>
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-text-muted bg-sunken px-2 py-0.5 rounded border border-border/60 dark:border-white/[0.08]">
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

          <Can permission={PERMISSIONS.CI_EDIT}>
            <Link href="/cis/new" className="w-full sm:w-auto">
              <Button size="sm" variant="primary" leftIcon={<Plus className="w-3.5 h-3.5" />} className="w-full sm:w-auto justify-center">
                Create CI
              </Button>
            </Link>
          </Can>
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* SECTION 1: HOW MUCH DO WE HAVE & BASELINE HEALTH */}
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
              target="Target: 80%+ Avg Trust, <5% Stale, >95% Owner Coverage, 0 Duplicates"
            />
          </div>
          <p className="text-xs text-text-muted hidden sm:block italic">
            Reading order: How much do we have — overall inventory volume, baseline operational state, and active attestation coverage
          </p>
        </div>

        {/* Row 1: 5 Primary KPI Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
          {/* Tile 1: Total CIs */}
          <KpiCard
            title="Total CIs"
            value={metrics.totalCIs}
            subtitle="Indexed assets"
            icon={Boxes}
            target="100%"
            accentColor="primary"
            trend={{ value: "+12 this week", isPositive: true }}
            infoHint={{
              concept: "Total number of physical, virtual, cloud, and application configuration items managed in this tenant's CMDB.",
              whyItMatters: "Provides the baseline denominator for IT asset coverage, license forecasting, and security vulnerability scanning.",
              target: "100% of discovered IT infrastructure",
            }}
          />

          {/* Tile 2: Average Trust Score */}
          <KpiCard
            title="Avg Trust Score"
            value={`${metrics.averageTrustScore}%`}
            subtitle="Composite health"
            icon={Award}
            target="80%+"
            accentColor={
              metrics.averageTrustScore >= 80
                ? "success"
                : metrics.averageTrustScore >= 60
                ? "warning"
                : "danger"
            }
            trend={{ value: "+2.4% vs last week", isPositive: true }}
            progressPercent={metrics.averageTrustScore}
            infoHint={{
              concept: "Automated 0-100 score weighted across Freshness (30), Completeness (25), Consistency (20), Relationships (15), and Ownership (10).",
              whyItMatters: "High trust scores mean engineers and automation can reliably depend on CMDB data for incident triage and change risk validation.",
              target: "80%+ Enterprise SLA; no critical service below 70",
            }}
          />

          {/* Tile 3: Stale CIs % */}
          <KpiCard
            title="Stale CIs"
            value={`${metrics.staleCIPercentage}%`}
            subtitle={`${metrics.staleCount || 0} CIs >14d quiet`}
            icon={Clock}
            target="< 5%"
            accentColor={metrics.staleCIPercentage <= 5 ? "success" : "danger"}
            trend={{ value: "-1.1% vs last week", isPositive: true }}
            infoHint={{
              concept: "Percentage of active configuration items whose telemetry or discovery timestamps have not been refreshed in the past 14 days.",
              whyItMatters: "Stale CIs often represent decommissioned ghost servers still incurring cloud costs or unpatched security vectors.",
              target: "Less than 5% of active inventory",
            }}
          />

          {/* Tile 4: Missing Owner */}
          <KpiCard
            title="Missing Owner"
            value={`${metrics.missingOwnerPercent || 0}%`}
            subtitle={`${metrics.missingOwnerCount || 0} unassigned CIs`}
            icon={UserCheck}
            target="< 5%"
            accentColor={(metrics.missingOwnerPercent || 0) <= 5 ? "success" : "danger"}
            trend={{ value: "-4 resolved", isPositive: true }}
            infoHint={{
              concept: "Percentage and count of Live/In-Use CIs lacking an assigned technical engineer or service ownership group.",
              whyItMatters: "Without explicit owners, critical security alerts and change approval requests stall, creating governance bottlenecks.",
              target: "95%+ ownership coverage (less than 5% unassigned)",
            }}
          />

          {/* Tile 5: Duplicate Suspects */}
          <KpiCard
            title="Duplicate Suspects"
            value={metrics.duplicateSuspects || 0}
            subtitle={`${metrics.duplicateRate}% collision rate`}
            icon={Copy}
            target="0"
            accentColor={(metrics.duplicateSuspects || 0) === 0 ? "success" : "danger"}
            trend={{ value: "1 pending review", isPositive: false }}
            infoHint={{
              concept: "Discovered entities with conflicting or overlapping MAC addresses, serial numbers, or FQDNs flagged by the IRE Engine.",
              whyItMatters: "Duplicates fragment telemetry and hide true dependency topologies, corrupting blast-radius incident impact calculation.",
              target: "0 duplicate suspects (100% IRE reconciliation)",
            }}
          />
        </div>

        {/* Collapsible Secondary Row (Existing 7 KPIs + Completeness) */}
        {showSecondaryMetrics && (
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in-50 duration-200">
            <KpiCard
              title="Operational CIs"
              value={metrics.operationalCIs}
              subtitle="Healthy active nodes"
              icon={Activity}
              target="90%+"
              accentColor="success"
              trend={{ value: "92% availability", isPositive: true }}
            />
            <KpiCard
              title="Non-Operational CIs"
              value={metrics.nonOperationalCIs}
              subtitle="Retired / Maintenance"
              icon={AlertOctagon}
              target="< 15%"
              accentColor="neutral"
              trend={{ value: "3 in maintenance", isPositive: true }}
            />
            <KpiCard
              title="Attestation Completion"
              value={`${metrics.attestationCompletion}%`}
              subtitle="Quarterly sign-off"
              icon={CheckCircle}
              target="90%+"
              accentColor="teal"
              trend={{ value: "+12% this month", isPositive: true }}
              progressPercent={metrics.attestationCompletion}
            />
            <KpiCard
              title="Completeness Score"
              value={`${metrics.completenessScore || 90}%`}
              subtitle="Required fields filled"
              icon={Server}
              target="95%+"
              accentColor="blue"
              trend={{ value: "+3% improved", isPositive: true }}
              progressPercent={metrics.completenessScore || 90}
            />
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* SECTIONS 2 & 3: CHARTS & GOVERNANCE */}
      {/* ----------------------------------------------------------------------- */}
      <DashboardCharts />

      {/* ----------------------------------------------------------------------- */}
      {/* RECENT AUDIT TRAIL STREAM (Hidden for Executive / Report Viewer) */}
      {/* ----------------------------------------------------------------------- */}
      {canViewAudit && !isExecutive && (
        <Card className="bg-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
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
                Latest field-level configuration updates and governance actions
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
            <div className="divide-y divide-border/60 dark:divide-white/[0.05]">
              {recentAudits.map((item) => (
                <div
                  key={item.id}
                  className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-sm"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-wrap sm:flex-nowrap">
                    <span className="font-mono text-xs text-text-muted bg-sunken px-2 py-0.5 rounded border border-border/60 dark:border-white/[0.08]">
                      {item.ciId}
                    </span>
                    <span className="font-semibold text-text-default truncate">
                      {item.ciName}
                    </span>
                    <span className="text-text-muted">changed</span>
                    <span className="font-mono text-primary font-medium">{item.fieldChanged}</span>
                  </div>

                  <div className="flex items-center gap-3 text-text-muted flex-shrink-0 text-xs flex-wrap sm:flex-nowrap">
                    <span className="font-mono bg-sunken/80 px-1.5 py-0.5 rounded truncate max-w-[160px]">
                      <span className="text-danger line-through mr-1">{item.beforeValue}</span>
                      <span className="text-success">{item.afterValue}</span>
                    </span>
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
