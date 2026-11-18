"use client";

import React, { useState } from "react";
import {
  Radio,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Key,
  Calendar,
  RefreshCw,
  History,
  Shield,
  ExternalLink,
  Lock,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Modal,
  Drawer,
  Input,
  Select,
} from "@/components/ui";
import { useCMDB } from "@/context/cmdb-context";
import { formatDateTime } from "@/utils";
import { DiscoverySource } from "@/types/cmdb";
import { cn } from "@/lib/utils";
import { usePermission } from "@/components/rbac/usePermission";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export function DiscoverySourcesView() {
  const { discoverySources, triggerDiscoveryRun, showToast, userRole } = useCMDB();
  const { allowed: canConfigure } = usePermission(PERMISSIONS.DISCOVERY_CONFIGURE);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [runningSourceId, setRunningSourceId] = useState<string | null>(null);
  const [historyDrawerSource, setHistoryDrawerSource] = useState<DiscoverySource | null>(null);

  // New source form
  const [name, setName] = useState("");
  const [type, setType] = useState<DiscoverySource["type"]>("Cloud Provider");
  const [scope, setScope] = useState("");
  const [schedule, setSchedule] = useState("Every 2 Hours");

  const handleTriggerRun = (sourceId: string) => {
    setRunningSourceId(sourceId);
    triggerDiscoveryRun(sourceId);
    setTimeout(() => {
      setRunningSourceId(null);
    }, 1500);
  };

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    showToast("success", "Discovery Connector Configured", `Added connector "${name}" with Vault credentials reference.`);
    setIsAddOpen(false);
    setName("");
    setScope("");
  };

  const totalDiscovered = discoverySources.reduce((acc, s) => acc + s.cisDiscovered, 0);
  const totalUpdated = discoverySources.reduce((acc, s) => acc + s.cisUpdated, 0);

  // Mock historical execution runs for the history drawer
  const getMockRuns = (source: DiscoverySource) => [
    {
      jobId: `JOB-${source.id}-9841`,
      timestamp: source.lastRun,
      duration: "1m 42s",
      result: "Success",
      created: 4,
      updated: 18,
      errors: 0,
    },
    {
      jobId: `JOB-${source.id}-9840`,
      timestamp: "2026-11-15T18:00:00Z",
      duration: "1m 38s",
      result: "Success",
      created: 1,
      updated: 12,
      errors: 0,
    },
    {
      jobId: `JOB-${source.id}-9839`,
      timestamp: "2026-11-15T12:00:00Z",
      duration: "2m 04s",
      result: "Partial",
      created: 0,
      updated: 8,
      errors: 1,
    },
    {
      jobId: `JOB-${source.id}-9838`,
      timestamp: "2026-11-15T06:00:00Z",
      duration: "1m 40s",
      result: "Success",
      created: 2,
      updated: 15,
      errors: 0,
    },
  ];

  return (
    <div className="space-y-5 pb-12 text-foreground animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Discovery Sources & Connectors
          </h1>
          <p className="text-sm text-secondary mt-1">
            Agentic, Cloud API, and Network Scanners feeding authoritative configuration telemetry
          </p>
        </div>

        {canConfigure && (
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddOpen(true)}
          >
            Add Discovery Source
          </Button>
        )}
      </div>

      {/* Discovery Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="p-4 bg-surface rounded-lg border border-border shadow-card">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">
            Active Connectors
          </p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
              {discoverySources.filter((s) => s.status === "Active").length}
            </span>
            <span className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
              100% Operational
            </span>
          </div>
        </div>

        <div className="p-4 bg-surface rounded-lg border border-border dark:border-white/[0.08] shadow-card dark:shadow-none">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">
            Total CIs Ingested
          </p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
              {totalDiscovered}
            </span>
            <span className="text-xs sm:text-sm text-secondary">Unique catalog nodes</span>
          </div>
        </div>

        <div className="p-4 bg-surface rounded-lg border border-border dark:border-white/[0.08] shadow-card dark:shadow-none">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">
            Incremental Updates
          </p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
              {totalUpdated}
            </span>
            <span className="text-xs sm:text-sm text-secondary">Attributes refreshed</span>
          </div>
        </div>

        <div className="p-4 bg-surface rounded-lg border border-border dark:border-white/[0.08] shadow-card dark:shadow-none">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">
            Credentials Security
          </p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-sm font-semibold text-primary flex items-center gap-1.5">
              <Lock className="w-4 h-4" /> Stored in Vault
            </span>
            <span className="text-xs text-muted">mTLS / KMS</span>
          </div>
        </div>
      </div>

      {/* Connector Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {discoverySources.map((source) => {
          const isRunning = runningSourceId === source.id;
          return (
            <Card key={source.id} className="flex flex-col justify-between">
              <CardHeader>
                <div className="space-y-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-primary flex-shrink-0" />
                    <CardTitle className="text-base font-bold truncate">{source.name}</CardTitle>
                  </div>
                  <CardDescription className="text-sm">{source.type}</CardDescription>
                </div>
                <Badge
                  variant={source.status === "Active" ? "success" : "warning"}
                  size="sm"
                >
                  {source.status}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-3.5 text-sm">
                {/* Metrics row */}
                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-lg bg-elevated/40 border border-border/80 dark:border-white/[0.08]">
                  <div>
                    <span className="text-xs text-muted uppercase tracking-wider">Discovered</span>
                    <p className="font-mono font-bold text-base sm:text-lg text-foreground mt-0.5">{source.cisDiscovered}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted uppercase tracking-wider">Updated</span>
                    <p className="font-mono font-bold text-base sm:text-lg text-foreground mt-0.5">{source.cisUpdated}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-secondary text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Target Scope:</span>
                    <span className="font-medium text-foreground truncate max-w-[170px]">{source.scope}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Cadence:</span>
                    <span className="font-medium text-foreground">{source.schedule}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Last Ingestion:</span>
                    <span className="font-mono text-muted">{formatDateTime(source.lastRun)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-border/50">
                    <span className="text-muted">Vault Secret:</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-elevated px-2 py-0.5 rounded border border-border text-secondary">
                      <Lock className="w-3 h-3 text-emerald-500" /> Stored in Vault
                    </span>
                  </div>
                </div>
              </CardContent>

              {/* Card Footer Actions */}
              <div className="p-3.5 border-t border-border bg-elevated/20 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHistoryDrawerSource(source)}
                  leftIcon={<History className="w-3.5 h-3.5" />}
                >
                  Run History
                </Button>

                {canConfigure && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleTriggerRun(source.id)}
                    isLoading={isRunning}
                    leftIcon={<Play className="w-3.5 h-3.5" />}
                  >
                    Trigger Scan
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Run History Drawer */}
      <Drawer
        isOpen={Boolean(historyDrawerSource)}
        onClose={() => setHistoryDrawerSource(null)}
        title={historyDrawerSource ? `${historyDrawerSource.name} • Execution Log` : "Run History"}
        description="Historical discovery runs, delta counts, and duration"
        width="md"
      >
        {historyDrawerSource && (
          <div className="space-y-4 text-sm">
            <div className="p-3.5 rounded-lg bg-elevated/40 border border-border space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Connector ID:</span>
                <span className="font-mono font-semibold">{historyDrawerSource.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Ingestion Target:</span>
                <span className="font-semibold">{historyDrawerSource.scope}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <h5 className="font-bold uppercase tracking-wider text-xs text-muted">
                Recent Ingestion Runs
              </h5>

              <div className="rounded-lg border border-border divide-y divide-border/60">
                {getMockRuns(historyDrawerSource).map((run) => (
                  <div key={run.jobId} className="p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-foreground text-sm">{run.jobId}</span>
                      <Badge variant={run.result === "Success" ? "success" : "warning"} size="sm">
                        {run.result}
                      </Badge>
                    </div>

                    <div className="flex justify-between text-secondary text-xs sm:text-sm">
                      <span>{formatDateTime(run.timestamp)}</span>
                      <span className="font-mono text-muted">{run.duration}</span>
                    </div>

                    <div className="flex gap-3.5 text-xs font-mono text-muted pt-1">
                      <span>Created: +{run.created}</span>
                      <span>Updated: {run.updated}</span>
                      <span>Errors: {run.errors}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Add Discovery Connector Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Register Discovery Connector"
        description="Configure automated telemetry sync source with secure Vault credential references"
        maxWidth="md"
      >
        <form onSubmit={handleAddSource} className="p-5 space-y-3.5 text-foreground">
          <Input
            label="Connector Name"
            placeholder="e.g. AWS Production US-East-1 VPC"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Select
            label="Connector Architecture Type"
            value={type}
            onChange={(e) => setType(e.target.value as any)}
          >
            <option value="Cloud Provider">Cloud Provider (AWS/Azure/GCP API)</option>
            <option value="Kubernetes Operator">Kubernetes Cluster Operator (CRD Watch)</option>
            <option value="Agent-based">Agent-based (Dynatrace / CrowdStrike Falcon)</option>
            <option value="Network Scanner">Network Scanner (Nmap / SNMP / NetFlow)</option>
            <option value="Directory Service">Directory Service (Microsoft Entra ID / Intune)</option>
            <option value="API Integration">Infrastructure as Code (Terraform / Ansible)</option>
          </Select>

          <Input
            label="Target Scope / Account ID"
            placeholder="e.g. aws-account-99124-prod or k8s-mumbai-cluster-01"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            required
          />

          <Select
            label="Sync Schedule Cadence"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
          >
            <option value="Every 30 Minutes">Every 30 Minutes (Near Real-time)</option>
            <option value="Every 2 Hours">Every 2 Hours</option>
            <option value="Daily at Midnight">Daily at Midnight (Batch)</option>
          </Select>

          <div className="p-3 rounded bg-elevated/40 border border-border text-xs text-muted flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>
              Credentials will be referenced as an encrypted pointer to enterprise HashiCorp Vault. Plaintext secret keys are never stored in the CMDB database.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Register Connector
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
