"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  ArrowRight,
  Database,
  Cloud,
  CheckCircle2,
  RefreshCw,
  Code2,
  Filter,
  Eye,
  Lock,
  GitMerge,
  Server,
  ArrowUpRight,
  AlertTriangle,
  Info,
  ShieldCheck,
  Activity,
  Receipt,
  Network,
  Briefcase,
  Boxes,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lozenge } from "@/components/ui/Lozenge";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { StagingDiscoveryRecord } from "@/types/cmdb";
import { CMDBService } from "@/services/cmdb-service";
import { useCMDB } from "@/context/cmdb-context";
import { formatDateTime, cn } from "@/lib/utils";
import { Can } from "@/components/rbac/Can";
import { PERMISSIONS } from "@/lib/rbac";

export function StagingView() {
  const { activeTenant, showToast } = useCMDB();
  const [stagingRecords, setStagingRecords] = useState<StagingDiscoveryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<StagingDiscoveryRecord | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [consumersModalOpen, setConsumersModalOpen] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    CMDBService.fetchStagingRecords(activeTenant).then((data) => {
      if (isCurrent) {
        setStagingRecords(data);
        setLoading(false);
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [activeTenant]);

  const handleReconcileAll = () => {
    setReconciling(true);
    setTimeout(() => {
      setStagingRecords((prev) =>
        prev.map((r) => ({ ...r, status: "Processed" as const }))
      );
      setReconciling(false);
      showToast(
        "success",
        "Reconciliation Complete",
        `Processed ${stagingRecords.length} staged records through the IRE Engine.`
      );
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-12 text-text-default animate-fade-in-up">
      {/* ----------------------------------------------------------------------- */}
      {/* HEADER */}
      {/* ----------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-default">
              Raw Discovery Staging Pipeline
            </h1>
            <Lozenge appearance="subtle" variant="info" size="sm">
              {stagingRecords.length} Raw Payloads
            </Lozenge>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-muted bg-sunken px-2.5 py-0.5 rounded border border-border/60">
              <Lock className="w-3.5 h-3.5 text-text-muted" />
              {activeTenant}
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Pre-reconciliation ingestion buffer preventing raw discovery noise from polluting production CMDB
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <Link href="/ire-console" className="w-full sm:w-auto">
            <Button size="sm" variant="outline" rightIcon={<GitMerge className="w-3.5 h-3.5" />} className="w-full sm:w-auto justify-center">
              IRE Simulator
            </Button>
          </Link>

          <Can
            permission={PERMISSIONS.CI_MERGE}
            disableOnly
            tooltipText="Reconciling and merging staging records into production CIs requires ci.merge permission."
          >
            <Button
              size="sm"
              variant="primary"
              leftIcon={<RefreshCw className={cn("w-3.5 h-3.5", reconciling && "animate-spin")} />}
              onClick={handleReconcileAll}
              isLoading={reconciling}
              className="w-full sm:w-auto justify-center"
            >
              Reconcile All
            </Button>
          </Can>
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* VISUAL PIPELINE STRIP */}
      {/* ----------------------------------------------------------------------- */}
      <Card className="bg-surface p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5 px-1 border-b border-border/60 dark:border-white/[0.06] pb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              End-to-End Discovery Pipeline
            </span>
            <span className="text-xs text-text-muted hidden md:inline">
              &bull; Click any stage to navigate to its module or view details
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary">
              Stage 2 of 5 Active (/staging)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-sm">
          {/* Stage 1: Connectors */}
          <Link
            href="/discovery-sources"
            className="p-3.5 rounded-lg bg-sunken hover:bg-surface border border-border/80 dark:border-white/[0.08] hover:border-primary/60 dark:hover:border-primary/60 flex flex-col justify-between space-y-2 transition-all duration-150 group cursor-pointer shadow-2xs hover:shadow-card hover:-translate-y-0.5 text-left"
            title="Stage 1: Connector Management – Ingest feeds from AWS, Azure, K8s, Agents (/discovery-sources)"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-md bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <Cloud className="w-4.5 h-4.5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
              </div>
              <p className="font-bold text-text-default text-sm group-hover:text-primary transition-colors">
                1. Connectors
              </p>
              <p className="text-xs text-text-secondary font-medium">Connector Management</p>
              <p className="text-[11px] text-text-muted mt-0.5">AWS, Azure, K8s, Agents</p>
            </div>
            <div className="pt-2 border-t border-border/50 dark:border-white/[0.06] flex items-center justify-between">
              <Lozenge appearance="subtle" variant="success" size="xs">
                Active Feeds
              </Lozenge>
              <span className="text-[11px] font-semibold text-primary group-hover:underline">
                Open &rarr;
              </span>
            </div>
          </Link>

          {/* Stage 2: Raw Staging (Active) */}
          <Link
            href="/staging"
            className="p-3.5 rounded-lg bg-primary/10 border-2 border-primary/60 dark:border-primary/70 flex flex-col justify-between space-y-2 transition-all duration-150 group cursor-pointer shadow-subtle hover:bg-primary/15 hover:-translate-y-0.5 text-left relative overflow-hidden"
            title="Stage 2: Raw Discovery Staging Buffer – Current Page (/staging)"
          >
            <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-bl" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-md bg-primary text-white flex items-center justify-center shadow-xs">
                  <Layers className="w-4.5 h-4.5 animate-pulse" />
                </div>
                <Lozenge appearance="bold" variant="info" size="xs">
                  Current View
                </Lozenge>
              </div>
              <p className="font-bold text-primary text-sm flex items-center gap-1.5">
                2. Raw Staging
              </p>
              <p className="text-xs text-primary/90 font-medium">Existing Staging Page</p>
              <p className="text-[11px] text-text-muted mt-0.5">Raw Ingestion Buffer</p>
            </div>
            <div className="pt-2 border-t border-primary/20 dark:border-primary/30 flex items-center justify-between">
              <span className="text-[11px] font-mono text-primary font-semibold">
                /staging
              </span>
              <span className="text-[11px] font-semibold text-primary group-hover:underline">
                Refresh &orarr;
              </span>
            </div>
          </Link>

          {/* Stage 3: IRE Engine */}
          <Link
            href="/reconciliation-rules"
            className="p-3.5 rounded-lg bg-sunken hover:bg-surface border border-border/80 dark:border-white/[0.08] hover:border-warning/60 dark:hover:border-warning/60 flex flex-col justify-between space-y-2 transition-all duration-150 group cursor-pointer shadow-2xs hover:shadow-card hover:-translate-y-0.5 text-left"
            title="Stage 3: Identification & Reconciliation Engine – Rule priority and match criteria (/reconciliation-rules)"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-md bg-warning/10 dark:bg-warning/20 flex items-center justify-center text-warning group-hover:scale-105 transition-transform">
                  <GitMerge className="w-4.5 h-4.5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-warning transition-colors" />
              </div>
              <p className="font-bold text-text-default text-sm group-hover:text-primary transition-colors">
                3. IRE Engine
              </p>
              <p className="text-xs text-text-secondary font-medium">ID & Reconciliation</p>
              <p className="text-[11px] text-text-muted mt-0.5">Match Rules & Precedence</p>
            </div>
            <div className="pt-2 border-t border-border/50 dark:border-white/[0.06] flex items-center justify-between">
              <Lozenge appearance="subtle" variant="warning" size="xs">
                Active Engine
              </Lozenge>
              <span className="text-[11px] font-semibold text-warning group-hover:underline">
                Open &rarr;
              </span>
            </div>
          </Link>

          {/* Stage 4: CMDB Master */}
          <Link
            href="/cis"
            className="p-3.5 rounded-lg bg-sunken hover:bg-surface border border-border/80 dark:border-white/[0.08] hover:border-success/60 dark:hover:border-success/60 flex flex-col justify-between space-y-2 transition-all duration-150 group cursor-pointer shadow-2xs hover:shadow-card hover:-translate-y-0.5 text-left"
            title="Stage 4: CMDB Master – CI records management and single source of truth (/cis)"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-md bg-success/10 dark:bg-success/20 flex items-center justify-center text-success group-hover:scale-105 transition-transform">
                  <Database className="w-4.5 h-4.5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-success transition-colors" />
              </div>
              <p className="font-bold text-text-default text-sm group-hover:text-primary transition-colors">
                4. CMDB Master
              </p>
              <p className="text-xs text-text-secondary font-medium">CI Records Management</p>
              <p className="text-[11px] text-text-muted mt-0.5">Single Source of Truth</p>
            </div>
            <div className="pt-2 border-t border-border/50 dark:border-white/[0.06] flex items-center justify-between">
              <Lozenge appearance="subtle" variant="success" size="xs">
                CI Inventory
              </Lozenge>
              <span className="text-[11px] font-semibold text-success group-hover:underline">
                Open &rarr;
              </span>
            </div>
          </Link>

          {/* Stage 5: Consumers */}
          <button
            type="button"
            onClick={() => setConsumersModalOpen(true)}
            className="p-3.5 rounded-lg bg-sunken hover:bg-surface border border-border/80 dark:border-white/[0.08] hover:border-border-strong dark:hover:border-white/20 flex flex-col justify-between space-y-2 transition-all duration-150 group cursor-pointer shadow-2xs hover:shadow-card hover:-translate-y-0.5 text-left w-full"
            title="Stage 5: Consumers – Downstream ITSM, Triage, and Billing Integrations (Click to view module status)"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-md bg-neutral-bg flex items-center justify-center text-neutral group-hover:scale-105 transition-transform">
                  <Server className="w-4.5 h-4.5" />
                </div>
                <Info className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
              </div>
              <p className="font-bold text-text-default text-sm group-hover:text-primary transition-colors">
                5. Consumers
              </p>
              <p className="text-xs text-text-secondary font-medium">ITSM, Triage & Billing</p>
              <p className="text-[11px] text-text-muted mt-0.5">Outbound Integrations</p>
            </div>
            <div className="pt-2 border-t border-border/50 dark:border-white/[0.06] flex items-center justify-between">
              <Lozenge appearance="bold" variant="warning" size="xs">
                Not Implemented
              </Lozenge>
              <span className="text-[11px] font-semibold text-primary group-hover:underline">
                Details &rarr;
              </span>
            </div>
          </button>
        </div>

        {/* Animated Live Pipeline Telemetry Conduit */}
        <div className="mt-3.5 pt-3 border-t border-border/60 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs select-none">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span className="font-semibold text-text-default">Live Pipeline Telemetry:</span>
            <span className="text-text-muted font-mono text-[11px]">
              Connectors <span className="text-primary font-bold animate-pulse">&rarr;</span> Staging Buffer <span className="text-primary font-bold animate-pulse">&rarr;</span> IRE Engine <span className="text-primary font-bold animate-pulse">&rarr;</span> Master CMDB
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-muted font-mono">Ingestion Velocity:</span>
            <span className="text-xs font-mono font-bold text-primary flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse" />
              ~14.2 payloads/min
            </span>
          </div>
        </div>
      </Card>

      {/* ----------------------------------------------------------------------- */}
      {/* STAGED PAYLOADS TABLE */}
      {/* ----------------------------------------------------------------------- */}
      <Card className="bg-surface overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold">Staged Discovery Records</CardTitle>
            <CardDescription className="text-sm">
              Raw telemetry payloads pending identification and merge into production CMDB
            </CardDescription>
          </div>
          <Lozenge appearance="subtle" variant="neutral" size="sm">
            Buffer Capacity: 10,000 / sec
          </Lozenge>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-left border-collapse text-sm min-w-[720px]">
              <thead className="bg-sunken dark:bg-[#0A101C] border-b border-border dark:border-white/[0.08] text-xs uppercase tracking-wider text-text-secondary select-none">
                <tr>
                  <th className="py-3 px-3.5">Record ID</th>
                  <th className="py-3 px-3.5">Feed Source</th>
                  <th className="py-3 px-3.5">Class Name</th>
                  <th className="py-3 px-3.5">External ID</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Discovered At</th>
                  <th className="py-3 px-3.5 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 dark:divide-white/[0.05]">
                {stagingRecords.map((r) => {
                  const feed = r.sourceFeed || r.source;
                  const cls = r.className || "cmdb_ci_server";
                  const extId = r.externalId || r.matchedCiId || r.id;
                  const stat = r.status || r.reconcileStatus || "Pending";
                  const discDate = r.discoveredAt || r.receivedAt;
                  const payloadObj = r.payload || r.rawPayload;

                  return (
                    <tr key={r.id} className="hover:bg-sunken/40 dark:hover:bg-white/[0.03] transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-text-default">{r.id}</td>
                      <td className="py-2.5 px-3 font-semibold text-text-default">{feed}</td>
                      <td className="py-2.5 px-3">
                        <Lozenge appearance="subtle" variant="info">
                          {cls}
                        </Lozenge>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-text-muted">{extId}</td>
                      <td className="py-2.5 px-3">
                        <Lozenge
                          appearance="bold"
                          variant={
                            stat === "Pending" || stat === "New"
                              ? "warning"
                              : stat === "Processed" || stat === "Matched"
                              ? "success"
                              : "danger"
                          }
                        >
                          {stat}
                        </Lozenge>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-text-muted">
                        {formatDateTime(discDate)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          size="xs"
                          variant="outline"
                          leftIcon={<Eye className="w-3 h-3" />}
                          onClick={() => setSelectedRecord(r)}
                        >
                          View JSON
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------------- */}
      {/* PAYLOAD INSPECTOR DRAWER */}
      {/* ----------------------------------------------------------------------- */}
      <Drawer
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        title={selectedRecord ? `Raw Payload: ${selectedRecord.id}` : "Payload Inspector"}
        width="lg"
      >
        {selectedRecord && (
          <div className="p-4 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-text-default">
                  {selectedRecord.sourceFeed || selectedRecord.source}
                </span>
                <span className="text-text-muted text-[11px] block">
                  {selectedRecord.externalId || selectedRecord.matchedCiId || selectedRecord.id}
                </span>
              </div>
              <Lozenge appearance="bold" variant="info">
                {selectedRecord.className || "cmdb_ci_server"}
              </Lozenge>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-[10px] uppercase tracking-wider text-text-muted">
                Raw Ingestion JSON
              </span>
              <pre className="p-3 rounded bg-sunken border border-border dark:border-white/[0.08] text-text-default font-mono text-[11px] overflow-x-auto max-h-[480px]">
                {JSON.stringify(selectedRecord.payload || selectedRecord.rawPayload, null, 2)}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <Link href="/ire-console">
                <Button size="xs" variant="primary" rightIcon={<GitMerge className="w-3.5 h-3.5" />}>
                  Test with IRE Simulator &rarr;
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Drawer>
      {/* ----------------------------------------------------------------------- */}
      {/* CONSUMERS / DOWNSTREAM INTEGRATIONS MODAL */}
      {/* ----------------------------------------------------------------------- */}
      <Modal
        isOpen={consumersModalOpen}
        onClose={() => setConsumersModalOpen(false)}
        title="Pipeline Stage 5: Downstream Consumers & Outbound Integrations"
        maxWidth="lg"
      >
        <div className="p-5 space-y-4 text-xs sm:text-sm text-text-default">
          {/* Status banner */}
          <div className="p-3.5 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-text-default">Module Status: Planned / Architecture Roadmap</span>
                <Lozenge appearance="bold" variant="warning" size="xs">
                  Not Implemented
                </Lozenge>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Direct automated push integrations to external third-party systems (ServiceNow ITSM, Jira Service Management, PagerDuty Triage, and Cloud FinOps Billing) are planned for Phase 2.
              </p>
            </div>
          </div>

          {/* Description of pipeline role */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Role in Discovery & Reconciliation Pipeline
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Once raw discovery payloads are normalized in Staging and reconciled by the IRE Engine into the CMDB Master, downstream operational platforms consume authoritative configuration data:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-3 rounded-md bg-sunken border border-border/70 dark:border-white/[0.06] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-text-default text-xs">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>ITSM & Changes</span>
                </div>
                <p className="text-[11px] text-text-muted leading-snug">
                  Binds Incident, Problem, and Change approval records directly to certified CIs.
                </p>
              </div>

              <div className="p-3 rounded-md bg-sunken border border-border/70 dark:border-white/[0.06] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-text-default text-xs">
                  <Activity className="w-4 h-4 text-warning" />
                  <span>Incident Triage</span>
                </div>
                <p className="text-[11px] text-text-muted leading-snug">
                  Provides upstream business impact and downstream blast-radius analysis during P1 outages.
                </p>
              </div>

              <div className="p-3 rounded-md bg-sunken border border-border/70 dark:border-white/[0.06] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-text-default text-xs">
                  <Receipt className="w-4 h-4 text-success" />
                  <span>FinOps Billing</span>
                </div>
                <p className="text-[11px] text-text-muted leading-snug">
                  Allocates compute and cloud infrastructure costs to business units and cost centers.
                </p>
              </div>
            </div>
          </div>

          {/* Existing consumer functionality in ZenOps */}
          <div className="space-y-2 pt-1 border-t border-border dark:border-white/[0.06]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Available Related Capabilities in ZenOps
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              While direct outbound push integrations are on the roadmap, you can immediately utilize the consumer data and triage views already active in ZenOps:
            </p>
            <div className="space-y-2">
              <Link
                href="/relationships"
                onClick={() => setConsumersModalOpen(false)}
                className="p-2.5 rounded-md border border-border/70 hover:border-primary/50 dark:border-white/[0.08] hover:bg-sunken flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Network className="w-4 h-4 text-primary" />
                  <div>
                    <span className="font-semibold text-xs text-text-default group-hover:text-primary transition-colors">
                      Service Topology & Blast Radius Analysis
                    </span>
                    <p className="text-[11px] text-text-muted">
                      Trace upstream service dependency and root-cause failure pathways for live incident triage.
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors flex-shrink-0" />
              </Link>

              <Link
                href="/services"
                onClick={() => setConsumersModalOpen(false)}
                className="p-2.5 rounded-md border border-border/70 hover:border-primary/50 dark:border-white/[0.08] hover:bg-sunken flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 text-brand-blue" />
                  <div>
                    <span className="font-semibold text-xs text-text-default group-hover:text-primary transition-colors">
                      Business Services & SLA Governance
                    </span>
                    <p className="text-[11px] text-text-muted">
                      Review business tier criticalities, RTO/RPO SLAs, and revenue risk exposure.
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors flex-shrink-0" />
              </Link>

              <Link
                href="/cis"
                onClick={() => setConsumersModalOpen(false)}
                className="p-2.5 rounded-md border border-border/70 hover:border-primary/50 dark:border-white/[0.08] hover:bg-sunken flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Boxes className="w-4 h-4 text-success" />
                  <div>
                    <span className="font-semibold text-xs text-text-default group-hover:text-primary transition-colors">
                      CI 360 Profiles (Related ITSM Records)
                    </span>
                    <p className="text-[11px] text-text-muted">
                      Inspect individual CIs to view associated Incident, Change, and Problem history.
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors flex-shrink-0" />
              </Link>
            </div>
          </div>

          <div className="pt-3 border-t border-border dark:border-white/[0.06] flex items-center justify-end">
            <Button size="sm" variant="secondary" onClick={() => setConsumersModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
