"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Edit2,
  AlertOctagon,
  Network,
  ShieldCheck,
  Radio,
  History,
  Boxes,
  Activity,
  Award,
  Layers,
  ArrowRight,
  ExternalLink,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Server,
  Database as DbIcon,
  Cloud,
  FileCheck,
  Copy,
  Check,
  GitMerge,
  FileText,
  Shield,
  Zap,
  DollarSign,
  UserCheck,
  Lock,
  Calendar,
  Tag,
  Paperclip,
} from "lucide-react";
import { CIItem, CIRelationship } from "@/types/cmdb";
import { Button } from "@/components/ui/Button";
import {
  Lozenge,
  OperationalBadge,
  CriticalityBadge,
  TrustScoreBadge,
} from "@/components/ui/Lozenge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Tabs, TabItem } from "@/components/ui/Tabs";
import { Can } from "@/components/rbac/Can";
import { PERMISSIONS } from "@/lib/rbac";
import { Avatar } from "@/components/ui/Avatar";
import { InlineEdit } from "@/components/ui/InlineEdit";
import { TrustScoreRing } from "@/components/ui/TrustScoreRing";
import { CIRetireModal } from "@/components/cmdb/CIRetireModal";
import { useCMDB } from "@/context/cmdb-context";
import { formatDateTime, formatDate, cn } from "@/lib/utils";

interface CIDetailViewProps {
  ci: CIItem;
}

export function CIDetailView({ ci: initialCI }: CIDetailViewProps) {
  const router = useRouter();
  const {
    getCIRelationships,
    getImpactAnalysis,
    auditHistory,
    dataQualityTasks,
    reconciliationRules,
    updateCI,
    userRole,
    activeTenant,
    showToast,
  } = useCMDB();

  const [ci, setCi] = useState<CIItem>(initialCI);
  const [activeTab, setActiveTab] = useState("config");
  const [retireModalOpen, setRetireModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sync when prop updates
  React.useEffect(() => {
    setCi(initialCI);
  }, [initialCI]);

  // Relationships & Impact Analysis
  const { parents, children } = getCIRelationships(ci.id);
  const impact = getImpactAnalysis(ci.id);
  const ciAudits = auditHistory.filter((a) => a.ciId === ci.id);
  const ciDQTasks = dataQualityTasks.filter((t) => t.ciId === ci.id);
  const matchingRules = reconciliationRules.filter((r) => r.ciClass === ci.ciClass);

  const isRetired = ci.lifecycleStatus === "Retired" || ci.lifecycleStatus === "Disposed";

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    showToast("info", "Copied to Clipboard", `${label}: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Inline edit handlers
  const handleInlineSave = async (field: keyof CIItem, newValue: string) => {
    const res = updateCI(ci.id, { [field]: newValue }, "Sarah Jenkins (Platform Eng)");
    if (res.success && res.ci) {
      setCi(res.ci);
      showToast("success", "Field Updated", `Saved ${String(field)} to "${newValue}".`);
    }
  };

  const tabs: TabItem[] = [
    {
      id: "config",
      label: "Technical Specs",
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      id: "topology",
      label: "Dependency Topology",
      icon: <Network className="w-3.5 h-3.5" />,
      badge: parents.length + children.length,
    },
    {
      id: "itsm",
      label: "Related ITSM",
      icon: <FileText className="w-3.5 h-3.5" />,
      badge: 4,
    },
    {
      id: "financial",
      label: "Asset & Financial",
      icon: <DollarSign className="w-3.5 h-3.5" />,
    },
    {
      id: "ire",
      label: "IRE Reconciliation",
      icon: <GitMerge className="w-3.5 h-3.5" />,
      badge: matchingRules.length,
    },
    {
      id: "audit",
      label: "Audit Trail",
      icon: <History className="w-3.5 h-3.5" />,
      badge: ciAudits.length,
    },
  ];

  return (
    <div className="space-y-4 pb-16 text-text-default">
      {/* ----------------------------------------------------------------------- */}
      {/* 360 HEADER CARD */}
      {/* ----------------------------------------------------------------------- */}
      <div className="bg-surface rounded-lg border border-border p-4 sm:p-5 shadow-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-sunken border border-border text-text-muted">
                {ci.id}
              </span>
              <Lozenge appearance="subtle" variant="info">
                {ci.ciClass}
              </Lozenge>
              <Lozenge appearance="subtle" variant="neutral">
                {ci.environment}
              </Lozenge>
              <OperationalBadge status={ci.operationalStatus} />
              <CriticalityBadge tier={ci.businessCriticality} />
              <span className="inline-flex items-center gap-1 text-[11px] text-text-muted bg-sunken px-2 py-0.5 rounded border border-border/60">
                <Lock className="w-3 h-3 text-text-muted" />
                {activeTenant}
              </span>
            </div>

            {/* Inline Editable CI Name */}
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-default">
                <InlineEdit
                  value={ci.name}
                  onSave={(val) => handleInlineSave("name", val)}
                  disabled={userRole === "Viewer"}
                  className="hover:bg-sunken px-1 rounded"
                />
              </h1>
            </div>

            <p className="text-sm text-text-secondary max-w-3xl leading-relaxed">
              {ci.description || "No architectural description provided for this configuration item."}
            </p>
          </div>

          {/* Trust Score Ring Widget & Header Actions */}
          <div className="flex items-center gap-3 self-start lg:self-center flex-shrink-0">
            <TrustScoreRing score={ci.trustScore} size="lg" />

            {userRole !== "Viewer" && (
              <div className="flex items-center gap-2">
                <Can
                  permission={PERMISSIONS.CI_EDIT}
                  resource={{
                    id: ci.id,
                    name: ci.name,
                    environment: ci.environment,
                    ciClass: ci.ciClass,
                    ownerGroup: ci.supportGroup || ci.owner,
                    owner: ci.owner,
                  }}
                  disableOnly
                  tooltipText="Editing this CI is restricted by role or ownership scope."
                >
                  <Link href={`/cis/${ci.id}/edit`}>
                    <Button variant="outline" size="sm" leftIcon={<Edit2 className="w-3.5 h-3.5" />}>
                      Edit CI
                    </Button>
                  </Link>
                </Can>

                {!isRetired && (
                  <Can
                    permission={PERMISSIONS.CI_RETIRE}
                    resource={{
                      id: ci.id,
                      name: ci.name,
                      environment: ci.environment,
                      ciClass: ci.ciClass,
                      ownerGroup: ci.supportGroup || ci.owner,
                    }}
                    disableOnly
                    tooltipText="Retiring CIs requires CMDB Manager / Admin authority."
                  >
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<AlertOctagon className="w-3.5 h-3.5" />}
                      onClick={() => setRetireModalOpen(true)}
                    >
                      Retire CI
                    </Button>
                  </Can>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* JIRA ISSUE 2-COLUMN LAYOUT: WIDE MAIN + RIGHT DETAILS PANEL */}
      {/* ----------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ===================================================================== */}
        {/* LEFT COLUMN: 360 TABS & CONTENT (8 Cols) */}
        {/* ===================================================================== */}
        <div className="lg:col-span-8 space-y-4">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="underline"
          />

          {/* TAB 1: Technical Specs & Configuration */}
          {activeTab === "config" && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <Card className="bg-surface border-border">
                <CardHeader>
                  <div>
                    <CardTitle className="text-sm sm:text-base font-bold">Core Specifications & Runtime Metadata</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Discovered configuration state with attribute source origins
                    </CardDescription>
                  </div>
                  <Lozenge appearance="subtle" variant="neutral" size="sm">
                    Source: {ci.discoverySource}
                  </Lozenge>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
                    <div className="p-3 rounded-md bg-sunken/60 border border-border/80">
                      <span className="text-text-muted text-xs block">Lifecycle Status</span>
                      <p className="font-semibold text-text-default mt-1">{ci.lifecycleStatus}</p>
                    </div>

                    <div className="p-3 rounded-md bg-sunken/60 border border-border/80">
                      <span className="text-text-muted text-xs block">Primary Support Group</span>
                      <p className="font-semibold text-text-default mt-1">{ci.supportGroup}</p>
                    </div>

                    <div className="p-3 rounded-md bg-sunken/60 border border-border/80">
                      <span className="text-text-muted text-xs block">Vendor & Manufacturer</span>
                      <p className="font-semibold text-text-default mt-1">
                        {ci.vendor || "N/A"} &bull; {ci.manufacturer || "N/A"}
                      </p>
                    </div>

                    <div className="p-3 rounded-md bg-sunken/60 border border-border/80">
                      <span className="text-text-muted text-xs block">Model / Form Factor</span>
                      <p className="font-semibold text-text-default mt-1">{ci.model || "N/A"}</p>
                    </div>

                    <div className="p-3 rounded-md bg-sunken/60 border border-border/80">
                      <span className="text-text-muted text-xs block">Asset Tag & Serial</span>
                      <p className="font-mono text-text-default mt-1">
                        {ci.assetTag || "AT-UNTAGGED"} ({ci.serialNumber || "SN-NONE"})
                      </p>
                    </div>

                    <div className="p-2.5 rounded bg-sunken/60 border border-border/80">
                      <span className="text-text-muted text-[11px] block">Cost Center</span>
                      <p className="font-mono text-text-default mt-0.5">{ci.costCenter || "CC-GENERAL"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dynamic Class Attributes */}
              {ci.attributes && Object.keys(ci.attributes).length > 0 && (
                <Card className="bg-surface border-border">
                  <CardHeader>
                    <div>
                      <CardTitle className="text-xs">Class-Specific Attributes ({ci.ciClass})</CardTitle>
                      <CardDescription className="text-xs">
                        Runtime parameters and class-specific metrics
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      {Object.entries(ci.attributes).map(([key, val]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between p-2 rounded bg-sunken/50 border border-border/60"
                        >
                          <span className="text-text-secondary font-mono text-[11px] capitalize">
                            {key.replace(/([A-Z])/g, " $1")}:
                          </span>
                          <span className="font-semibold text-text-default font-mono text-[11px]">
                            {String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* TAB 2: Dependency Map & Blast Radius */}
          {activeTab === "topology" && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {impact && (
                <div className="p-4 rounded-lg bg-surface border border-border shadow-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-warning" />
                      <h4 className="text-xs font-bold text-text-default">
                        Topology Blast Radius Risk: {impact.riskLevel}
                      </h4>
                    </div>
                    <Lozenge
                      appearance="bold"
                      variant={impact.riskLevel === "Severe" ? "danger" : "warning"}
                    >
                      Impact Score {impact.blastRadiusScore}/100
                    </Lozenge>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">{impact.impactSummary}</p>

                  <div className="pt-2 flex justify-end">
                    <Link href={`/relationships?ci=${ci.id}`}>
                      <Button size="xs" variant="primary" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                        Open Full Dependency Graph
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Parents (Depends On) */}
                <Card className="bg-surface border-border">
                  <CardHeader>
                    <CardTitle className="text-xs">Upstream Dependencies ({parents.length})</CardTitle>
                    <CardDescription className="text-xs">CIs that this node relies on (What could be root cause?)</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {parents.length > 0 ? (
                      <div className="divide-y divide-border/60">
                        {parents.map((p) => (
                          <div key={p.id} className="p-3 text-xs flex items-center justify-between">
                            <div>
                              <Link
                                href={`/cis/${p.parentCiId}`}
                                className="font-semibold text-text-default hover:text-primary transition-colors block"
                              >
                                {p.parentCiName}
                              </Link>
                              <span className="text-[10px] text-text-muted font-mono">{p.parentCiId}</span>
                            </div>
                            <Lozenge appearance="subtle" variant="neutral">
                              {p.relationshipType}
                            </Lozenge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="p-4 text-xs text-text-muted text-center">No upstream parents mapped.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Children (Depended Upon By) */}
                <Card className="bg-surface border-border">
                  <CardHeader>
                    <CardTitle className="text-xs">Downstream Dependencies ({children.length})</CardTitle>
                    <CardDescription className="text-xs">Nodes impacted if this CI fails (What will break?)</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {children.length > 0 ? (
                      <div className="divide-y divide-border/60">
                        {children.map((c) => (
                          <div key={c.id} className="p-3 text-xs flex items-center justify-between">
                            <div>
                              <Link
                                href={`/cis/${c.childCiId}`}
                                className="font-semibold text-text-default hover:text-primary transition-colors block"
                              >
                                {c.childCiName}
                              </Link>
                              <span className="text-[10px] text-text-muted font-mono">{c.childCiId}</span>
                            </div>
                            <Lozenge appearance="subtle" variant="info">
                              {c.relationshipType}
                            </Lozenge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="p-4 text-xs text-text-muted text-center">No downstream dependents mapped.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 3: Related ITSM Records */}
          {activeTab === "itsm" && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <Card className="bg-surface border-border">
                <CardHeader>
                  <div>
                    <CardTitle className="text-xs">Active Incidents, Changes & Problems</CardTitle>
                    <CardDescription className="text-xs">Cross-module operational linkage for {ci.id}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/60 text-xs">
                    {/* Record 1 */}
                    <div className="p-3.5 flex items-center justify-between hover:bg-sunken/40 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Lozenge appearance="bold" variant="danger">
                            P1 - CRITICAL
                          </Lozenge>
                          <span className="font-mono font-bold text-text-default">INC-1042</span>
                          <span className="text-text-muted">&bull;</span>
                          <span className="font-medium text-text-default">High CPU saturation on primary node</span>
                        </div>
                        <p className="text-[11px] text-text-muted">Reported 22m ago &bull; Assigned to Platform Eng</p>
                      </div>
                      <Lozenge appearance="subtle" variant="danger">
                        In Triage
                      </Lozenge>
                    </div>

                    {/* Record 2 */}
                    <div className="p-3.5 flex items-center justify-between hover:bg-sunken/40 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Lozenge appearance="subtle" variant="warning">
                            P2 - MAJOR
                          </Lozenge>
                          <span className="font-mono font-bold text-text-default">PRB-0089</span>
                          <span className="text-text-muted">&bull;</span>
                          <span className="font-medium text-text-default">Intermittent TLS handshake timeouts</span>
                        </div>
                        <p className="text-[11px] text-text-muted">Root cause investigation &bull; Assigned to NetOps</p>
                      </div>
                      <Lozenge appearance="subtle" variant="warning">
                        Under Analysis
                      </Lozenge>
                    </div>

                    {/* Record 3 */}
                    <div className="p-3.5 flex items-center justify-between hover:bg-sunken/40 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Lozenge appearance="subtle" variant="info">
                            P3 - NORMAL
                          </Lozenge>
                          <span className="font-mono font-bold text-text-default">CHG-2001</span>
                          <span className="text-text-muted">&bull;</span>
                          <span className="font-medium text-text-default">Kernel upgrade to 6.1.72-generic</span>
                        </div>
                        <p className="text-[11px] text-text-muted">CAB Approved &bull; Scheduled maintenance window Saturday</p>
                      </div>
                      <Lozenge appearance="subtle" variant="success">
                        Approved
                      </Lozenge>
                    </div>

                    {/* Record 4 */}
                    <div className="p-3.5 flex items-center justify-between hover:bg-sunken/40 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Lozenge appearance="subtle" variant="neutral">
                            P4 - LOW
                          </Lozenge>
                          <span className="font-mono font-bold text-text-default">REQ-5512</span>
                          <span className="text-text-muted">&bull;</span>
                          <span className="font-medium text-text-default">Storage expansion (+200GB NVMe)</span>
                        </div>
                        <p className="text-[11px] text-text-muted">Catalog request &bull; Self-service workflow</p>
                      </div>
                      <Lozenge appearance="subtle" variant="neutral">
                        Completed
                      </Lozenge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 4: Asset & Financial Management */}
          {activeTab === "financial" && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <Card className="bg-surface border-border">
                <CardHeader>
                  <CardTitle className="text-xs">Asset Lifecycle & Cost Accounting</CardTitle>
                  <CardDescription className="text-xs">Procurement details, amortization, and warranty</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                    <div className="p-2.5 rounded bg-sunken/60 border border-border/80">
                      <span className="text-text-muted text-[11px] block">Acquisition Cost</span>
                      <p className="font-mono font-bold text-text-default text-sm mt-0.5">
                        {ci.currency || "USD"} ${ci.cost ? ci.cost.toLocaleString() : "1,200"}
                      </p>
                    </div>

                    <div className="p-2.5 rounded bg-sunken/60 border border-border/80">
                      <span className="text-text-muted text-[11px] block">Purchase Order Number</span>
                      <p className="font-mono font-semibold text-text-default mt-0.5">{ci.po_number || "PO-99201"}</p>
                    </div>

                    <div className="p-2.5 rounded bg-sunken/60 border border-border/80">
                      <span className="text-text-muted text-[11px] block">Cost Center Account</span>
                      <p className="font-mono font-semibold text-text-default mt-0.5">{ci.costCenter || "CC-INFRA-01"}</p>
                    </div>

                    <div className="p-2.5 rounded bg-sunken/60 border border-border/80">
                      <span className="text-text-muted text-[11px] block">Installed Date</span>
                      <p className="font-mono text-text-default mt-0.5">{formatDate(ci.installDate || "2024-01-15")}</p>
                    </div>

                    <div className="p-2.5 rounded bg-sunken/60 border border-border/80">
                      <span className="text-text-muted text-[11px] block">Warranty Expiration</span>
                      <p className="font-mono text-text-default mt-0.5">{formatDate(ci.warrantyEnd || "2028-12-31")}</p>
                    </div>

                    <div className="p-2.5 rounded bg-sunken/60 border border-border/80">
                      <span className="text-text-muted text-[11px] block">Vendor Portal</span>
                      <a
                        href="https://aws.amazon.com/console"
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline font-semibold flex items-center gap-1 mt-0.5"
                      >
                        Launch Portal <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 5: IRE & Reconciliation */}
          {activeTab === "ire" && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <Card className="bg-surface border-border">
                <CardHeader>
                  <div>
                    <CardTitle className="text-xs">Identification & Reconciliation Engine (IRE) Rules</CardTitle>
                    <CardDescription className="text-xs">Precedence and source ranking rules applicable to {ci.ciClass}</CardDescription>
                  </div>
                  <Link href="/reconciliation-rules">
                    <Button size="xs" variant="outline">
                      Rule Editor
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="space-y-3">
                  {matchingRules.map((r) => (
                    <div key={r.id} className="p-3 rounded border border-border/70 bg-sunken/40 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-text-default">{r.name}</span>
                        <Lozenge appearance="subtle" variant="success">
                          {r.mergeAction}
                        </Lozenge>
                      </div>
                      <div className="text-[11px] text-text-secondary">
                        <span>Identifiers: </span>
                        <span className="font-mono text-text-default">{r.identifierAttributes.join(", ")}</span>
                      </div>
                      <div className="text-[11px] text-text-secondary">
                        <span>Source Priority: </span>
                        <span className="font-semibold text-primary">{r.sourcePriority.join(" > ")}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 6: Immutable Audit History */}
          {activeTab === "audit" && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <Card className="bg-surface border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs">Immutable Audit Trail</CardTitle>
                    <CardDescription className="text-xs">Historical change logs for {ci.id}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lozenge appearance="subtle" variant="neutral">
                      {ciAudits.length} Events
                    </Lozenge>
                    <Link href={`/audit-history?search=${encodeURIComponent(ci.id)}`}>
                      <Button size="xs" variant="outline" className="h-6 text-[11px]">
                        Open Full Audit Trail &rarr;
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {ciAudits.length > 0 ? (
                    <div className="divide-y divide-border/60 text-xs">
                      {ciAudits.map((a) => (
                        <div key={a.id} className="p-3.5 space-y-1 hover:bg-sunken/30 transition-colors">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-text-default">{a.changeType} Event</span>
                            <span className="text-[10px] text-text-muted font-mono">{formatDateTime(a.timestamp)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-text-secondary text-[11px]">
                            <span className="font-mono text-text-muted">{a.fieldChanged}:</span>
                            <span className="line-through text-danger text-[10px]">{a.beforeValue}</span>
                            <span>&rarr;</span>
                            <span className="font-semibold text-success text-[10px]">{a.afterValue}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-text-muted pt-0.5">
                            <span>Actor: {a.changedBy}</span>
                            {a.changeRecord && (
                              <span className="font-mono font-semibold text-primary">{a.changeRecord}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-text-muted">No modification audit events logged yet.</div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* ===================================================================== */}
        {/* RIGHT COLUMN: JIRA-STYLE "DETAILS" SIDE PANEL (4 Cols) */}
        {/* ===================================================================== */}
        <div className="lg:col-span-4 space-y-4">
          {/* People & Accountability */}
          <Card className="bg-surface border-border shadow-card">
            <CardHeader className="pb-2.5">
              <CardTitle className="text-sm font-bold text-text-default">People & Accountability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-sm">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted block mb-1">
                  Technical Owner
                </span>
                <div className="flex items-center gap-2.5">
                  <Avatar name={ci.owner} size="sm" />
                  <span className="font-semibold text-text-default">{ci.owner}</span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-border/60">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted block mb-0.5">
                  Primary Support Group
                </span>
                <p className="font-semibold text-text-default">{ci.supportGroup}</p>
              </div>

              <div className="pt-2.5 border-t border-border/60">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted block mb-0.5">
                  Managed By Group
                </span>
                <p className="text-text-secondary font-medium">Platform Infrastructure Engineering</p>
              </div>
            </CardContent>
          </Card>

          {/* Source Attribution & Conflict Tags */}
          <Card className="bg-surface border-border shadow-card">
            <CardHeader className="pb-2.5">
              <CardTitle className="text-sm font-bold text-text-default">Source Attribution Tags</CardTitle>
              <CardDescription className="text-xs">Field provenance & discovery confidence</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-2.5 rounded-md bg-sunken/60 border border-border/60">
                <span className="text-text-secondary">AWS CloudTrail</span>
                <span className="font-mono text-xs font-semibold text-primary">Weight 90</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-md bg-sunken/60 border border-border/60">
                <span className="text-text-secondary">SCCM Discovery</span>
                <span className="font-mono text-xs font-semibold text-primary">Weight 80</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-md bg-sunken/60 border border-border/60">
                <span className="text-text-secondary">SolarWinds NPM</span>
                <span className="font-mono text-xs font-semibold text-text-muted">Weight 70</span>
              </div>
            </CardContent>
          </Card>

          {/* Identification Fingerprints (1-Click Copy) */}
          <Card className="bg-surface border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs">Identification Keys</CardTitle>
              <CardDescription className="text-xs">Hardware & network fingerprints</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {/* FQDN */}
              {ci.identificationKeys?.fqdn && (
                <div className="p-2 rounded bg-sunken/60 border border-border/70 flex items-center justify-between group">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block">FQDN</span>
                    <span className="font-mono text-text-default text-[11px] truncate block">
                      {ci.identificationKeys.fqdn}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(ci.identificationKeys.fqdn!, "FQDN")}
                    className="p-1 rounded text-text-muted hover:text-text-default hover:bg-sunken transition-colors flex-shrink-0"
                    title="Copy FQDN"
                  >
                    {copiedKey === "FQDN" ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              {/* IP Address */}
              {(ci.attributes?.ipAddress || ci.ip_address) && (
                <div className="p-2 rounded bg-sunken/60 border border-border/70 flex items-center justify-between group">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block">IP Address</span>
                    <span className="font-mono text-text-default text-[11px] truncate block">
                      {ci.attributes?.ipAddress || ci.ip_address}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy((ci.attributes?.ipAddress || ci.ip_address)!, "IP Address")}
                    className="p-1 rounded text-text-muted hover:text-text-default hover:bg-sunken transition-colors flex-shrink-0"
                    title="Copy IP Address"
                  >
                    {copiedKey === "IP Address" ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              {/* MAC Address */}
              {(ci.identificationKeys?.macAddress || ci.mac_address) && (
                <div className="p-2 rounded bg-sunken/60 border border-border/70 flex items-center justify-between group">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block">MAC Address</span>
                    <span className="font-mono text-text-default text-[11px] truncate block">
                      {ci.identificationKeys?.macAddress || ci.mac_address}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy((ci.identificationKeys?.macAddress || ci.mac_address)!, "MAC Address")}
                    className="p-1 rounded text-text-muted hover:text-text-default hover:bg-sunken transition-colors flex-shrink-0"
                    title="Copy MAC Address"
                  >
                    {copiedKey === "MAC Address" ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              {/* Serial Number */}
              {(ci.serialNumber || ci.identificationKeys?.serialNumber) && (
                <div className="p-2 rounded bg-sunken/60 border border-border/70 flex items-center justify-between group">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block">Serial Number</span>
                    <span className="font-mono text-text-default text-[11px] truncate block">
                      {ci.serialNumber || ci.identificationKeys?.serialNumber}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy((ci.serialNumber || ci.identificationKeys?.serialNumber)!, "Serial")}
                    className="p-1 rounded text-text-muted hover:text-text-default hover:bg-sunken transition-colors flex-shrink-0"
                    title="Copy Serial Number"
                  >
                    {copiedKey === "Serial" ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dates & Timeline */}
          <Card className="bg-surface border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs">Dates & Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-text-muted">First Discovered:</span>
                <span className="font-mono text-text-default">{formatDate(ci.firstDiscovered)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-text-muted">Last Discovered:</span>
                <span className="font-mono text-text-default">{formatDate(ci.lastDiscovered)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-text-muted">Last Attested:</span>
                <span className="font-mono text-text-default">{formatDate(ci.lastVerified)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-text-muted">Data Classification:</span>
                <Lozenge appearance="subtle" variant="neutral">
                  {ci.dataClassification}
                </Lozenge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Retire Modal Dialog (Enforces Change Record ID + Blast Radius check) */}
      <CIRetireModal
        ci={ci}
        isOpen={retireModalOpen}
        onClose={() => setRetireModalOpen(false)}
      />
    </div>
  );
}
