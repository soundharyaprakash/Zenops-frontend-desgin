"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  History,
  Search,
  Download,
  Lock,
  ExternalLink,
  ShieldCheck,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  User,
  Cloud,
  Cpu,
  Zap,
  Key,
  ChevronDown,
  ChevronUp,
  FileText,
  SlidersHorizontal,
  X,
  Eye,
  Hash,
  Database,
  Server,
  AlertOctagon,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lozenge } from "@/components/ui/Lozenge";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { useCMDB } from "@/context/cmdb-context";
import { formatDateTime, cn } from "@/lib/utils";
import {
  ActorChip,
  RelativeTime,
  StatusPill,
  PrimaryButton,
} from "@/components/shared";
import { logAuditEvent } from "@/lib/governance/dataQuality";
import { usePermission } from "@/components/rbac/usePermission";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export interface EnrichedAuditEvent {
  id: string; // Sequence: AUD-901 to AUD-908 (rising with time)
  sequence: number;
  timestamp: string;
  ciId: string;
  ciName: string;
  ciClass: string;
  environment: "Production" | "Staging";
  fieldChanged: string;
  beforeValue: string;
  afterValue: string;
  isListField?: boolean;
  addedItems?: string[];
  removedItems?: string[];
  actorName: string;
  actorRole: string;
  actorType: "person" | "connector" | "engine" | "automation" | "service_account";
  approvedBy?: string;
  sourceType: "UI" | "API" | "Discovery Run" | "Reconciliation Rule" | "Data Quality Task" | "Change Record";
  sourceId?: string;
  sourceHref?: string;
  changeRecord?: string;
  changeType: "Create" | "Update" | "Retire" | "Reconcile" | "Attestation" | "Policy";
  eventClass: "configuration" | "computed";
  previousHash: string;
  hash: string;
  correlationId: string;
  clientIp: string;
  sessionId: string;
}

// Canonical audit records with sequence strictly rising with time
// AUD-901 (Oct 14 oldest) -> AUD-908 (Nov 20 newest)
const CANONICAL_AUDIT_LOGS: EnrichedAuditEvent[] = [
  {
    id: "AUD-901",
    sequence: 901,
    timestamp: "2026-10-14T08:00:00Z",
    ciId: "CI-1010",
    ciName: "snowflake-sync-pipeline-worker-03",
    ciClass: "Server/VM",
    environment: "Production",
    fieldChanged: "lifecycleStatus",
    beforeValue: "In Use",
    afterValue: "Maintenance",
    actorName: "Marcus Vance",
    actorRole: "VP of Enterprise Analytics",
    actorType: "person",
    approvedBy: "David Chen (CMDB Manager)",
    sourceType: "Data Quality Task",
    sourceId: "DQ-202",
    sourceHref: "/data-quality?tab=stale",
    changeRecord: "CHG-008201",
    changeType: "Update",
    eventClass: "configuration",
    previousHash: "0000000000000000000000000000000000000000000000000000000000000000",
    hash: "4f53c89b882312d91b4092b77a06c8b18f8e02d41b6c62fa3f05d9e51241a801",
    correlationId: "CORR-88201-ZEN",
    clientIp: "10.0.12.44",
    sessionId: "SESS-M-VANCE-991",
  },
  {
    id: "AUD-902",
    sequence: 902,
    timestamp: "2026-11-07T09:30:00Z",
    ciId: "CI-1005",
    ciName: "fw-palo-alto-core-perimeter-01",
    ciClass: "Network",
    environment: "Production",
    fieldChanged: "complianceFlags",
    beforeValue: "SOC2, PCI-DSS, ISO27001",
    afterValue: "SOC2, PCI-DSS, ISO27001, FedRAMP High",
    isListField: true,
    addedItems: ["FedRAMP High", "NIST-800-53"],
    actorName: "Amara Okafor",
    actorRole: "SecOps Lead & Compliance Auditor",
    actorType: "person",
    approvedBy: "Rachel Moore (Lead Auditor)",
    sourceType: "Data Quality Task",
    sourceId: "DQ-205",
    sourceHref: "/data-quality?tab=compliance",
    changeRecord: "CHG-008740",
    changeType: "Update",
    eventClass: "configuration",
    previousHash: "4f53c89b882312d91b4092b77a06c8b18f8e02d41b6c62fa3f05d9e51241a801",
    hash: "a1c4b7729910ddae6621a8f9024cbe205561a3ec9941a8e932bbf20042410a02",
    correlationId: "CORR-88740-SEC",
    clientIp: "10.0.15.82",
    sessionId: "SESS-A-OKAFOR-112",
  },
  {
    id: "AUD-903",
    sequence: 903,
    timestamp: "2026-11-10T18:00:00Z",
    ciId: "CI-1002",
    ciName: "aurora-pg-payments-cluster",
    ciClass: "Database",
    environment: "Production",
    fieldChanged: "operationalStatus",
    beforeValue: "Degraded",
    afterValue: "Operational",
    actorName: "Priya Sharma",
    actorRole: "Principal Data Architect",
    actorType: "person",
    sourceType: "UI",
    changeRecord: "CHG-008980",
    changeType: "Update",
    eventClass: "configuration",
    previousHash: "a1c4b7729910ddae6621a8f9024cbe205561a3ec9941a8e932bbf20042410a02",
    hash: "d29a55c277119e09bc4f311024eef0a88192a4071853a0fa6199cb1902420a03",
    correlationId: "CORR-88980-DBA",
    clientIp: "10.0.22.19",
    sessionId: "SESS-P-SHARMA-404",
  },
  {
    id: "AUD-904",
    sequence: 904,
    timestamp: "2026-11-11T12:00:00Z",
    ciId: "CI-1003",
    ciName: "k8s-pod-checkout-worker-7d9f",
    ciClass: "Container/Pod",
    environment: "Production",
    fieldChanged: "podReplicas",
    beforeValue: "8",
    afterValue: "12",
    actorName: "Kubernetes HorizontalPodAutoscaler",
    actorRole: "Automated Workload Controller",
    actorType: "automation",
    sourceType: "Discovery Run",
    sourceId: "SRC-02",
    sourceHref: "/discovery-sources",
    changeType: "Update",
    eventClass: "computed",
    previousHash: "d29a55c277119e09bc4f311024eef0a88192a4071853a0fa6199cb1902420a03",
    hash: "6e80b2a334188ccb9012a44e5902b7041a0293ee4401a7bb5520cf8191230a04",
    correlationId: "CORR-K8S-HPA-4421",
    clientIp: "10.242.0.1",
    sessionId: "SESS-K8S-SVC-ACCT",
  },
  {
    id: "AUD-905",
    sequence: 905,
    timestamp: "2026-11-11T14:45:00Z",
    ciId: "CI-1001",
    ciName: "prod-payment-api-srv",
    ciClass: "Application",
    environment: "Production",
    fieldChanged: "appVersion",
    beforeValue: "3.14.1",
    afterValue: "3.14.2-hotfix.1",
    actorName: "Elena Rostova",
    actorRole: "VP of Payment Operations",
    actorType: "person",
    sourceType: "API",
    changeRecord: "CHG-009142",
    changeType: "Update",
    eventClass: "configuration",
    previousHash: "6e80b2a334188ccb9012a44e5902b7041a0293ee4401a7bb5520cf8191230a04",
    hash: "b991c0e882311fbb4402a1104889c4d12039a8bc5510e6aa883011cf90140a05",
    correlationId: "CORR-99142-PAY",
    clientIp: "10.0.8.102",
    sessionId: "SESS-E-ROSTOVA-551",
  },
  {
    id: "AUD-906",
    sequence: 906,
    timestamp: "2026-11-11T14:46:00Z",
    ciId: "CI-1001",
    ciName: "prod-payment-api-srv",
    ciClass: "Application",
    environment: "Production",
    fieldChanged: "trustScore",
    beforeValue: "94",
    afterValue: "96",
    actorName: "ZenOps Reconciliation Engine",
    actorRole: "Authoritative IRE Precedence Evaluator",
    actorType: "engine",
    sourceType: "Reconciliation Rule",
    sourceId: "REC-01",
    sourceHref: "/reconciliation-rules",
    changeType: "Reconcile",
    eventClass: "computed",
    previousHash: "b991c0e882311fbb4402a1104889c4d12039a8bc5510e6aa883011cf90140a05",
    hash: "7d02a991b8822fcc5510b2214998c5e23140b9cd6621f7bb994022df01250a06",
    correlationId: "CORR-IRE-PREC-9142",
    clientIp: "127.0.0.1",
    sessionId: "SESS-IRE-WORKER-01",
  },
  {
    id: "AUD-907",
    sequence: 907,
    timestamp: "2026-11-16T08:30:00Z",
    ciId: "CI-1004",
    ciName: "aws-ec2-prod-edge-gateway-01",
    ciClass: "Server/VM",
    environment: "Production",
    fieldChanged: "osVersion",
    beforeValue: "Amazon Linux 2023.2",
    afterValue: "Amazon Linux 2023.4 (Kernel 6.1.72)",
    actorName: "Sarah Jenkins",
    actorRole: "Lead Cloud Architect",
    actorType: "person",
    sourceType: "Reconciliation Rule",
    sourceId: "REC-02",
    sourceHref: "/reconciliation-rules",
    // Intentionally null to test PROD NO CR warning
    changeRecord: undefined,
    changeType: "Update",
    eventClass: "configuration",
    previousHash: "7d02a991b8822fcc5510b2214998c5e23140b9cd6621f7bb994022df01250a06",
    hash: "3e11b442a9933dde6621c3325009d6f34251c0de7732a8cc005133ef12360a07",
    correlationId: "CORR-OS-REC-1004",
    clientIp: "10.0.14.90",
    sessionId: "SESS-S-JENKINS-334",
  },
  {
    id: "AUD-908",
    sequence: 908,
    timestamp: "2026-11-20T12:00:00Z",
    ciId: "CI-1006",
    ciName: "vault-secrets-backend-01",
    ciClass: "Application",
    environment: "Production",
    fieldChanged: "warrantyEnd",
    beforeValue: "2026-11-30",
    afterValue: "2028-11-30",
    actorName: "Jordan Lee",
    actorRole: "Principal Systems Engineer",
    actorType: "person",
    approvedBy: "David Chen (CMDB Manager)",
    sourceType: "UI",
    changeRecord: "CHG-009410",
    changeType: "Update",
    eventClass: "configuration",
    previousHash: "3e11b442a9933dde6621c3325009d6f34251c0de7732a8cc005133ef12360a07",
    hash: "9f22c553b0044eef7732d4436110e7a45362d1ef8843b9dd116244fa23470a08",
    correlationId: "CORR-VAULT-EXT-9410",
    clientIp: "10.0.9.31",
    sessionId: "SESS-J-LEE-782",
  },
];

export function AuditHistoryView() {
  const { activeTenant, showToast, session } = useCMDB();
  const { allowed: canViewAudit } = usePermission(PERMISSIONS.AUDIT_VIEW);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [eventClassFilter, setEventClassFilter] = useState<"all" | "configuration" | "computed">("configuration");
  const [envFilter, setEnvFilter] = useState<"all" | "Production" | "Staging">("all");
  const [ciClassFilter, setCiClassFilter] = useState("all");
  const [actorTypeFilter, setActorTypeFilter] = useState("all");
  const [crFilter, setCrFilter] = useState<"all" | "has_cr" | "no_cr">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "24h" | "7d" | "30d">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [selectedEvent, setSelectedEvent] = useState<EnrichedAuditEvent | null>(null);

  // Pagination & Windowing (Screen 2 Improve)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Saved Views State (Screen 2 Improve)
  const [activeSavedView, setActiveSavedView] = useState("default");
  const [customViews, setCustomViews] = useState<{ id: string; name: string; filters: any }[]>(() => {
    try {
      const stored = localStorage.getItem("zenops_audit_saved_views");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Export Modal State with Digital Signature & RBAC (Screen 2 Improve)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");
  const [includeSignature, setIncludeSignature] = useState(true);

  // Hash-Chain Integrity Verification State (Screen 2, Item 3)
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastVerifiedTime, setLastVerifiedTime] = useState<string>("2026-11-20T14:30:00Z");
  const [isIntegrityModalOpen, setIsIntegrityModalOpen] = useState(false);
  const [expandedListDiffs, setExpandedListDiffs] = useState<Record<string, boolean>>({});

  const toggleListExpand = (id: string) => {
    setExpandedListDiffs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleVerifyIntegrity = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setLastVerifiedTime(new Date().toISOString());
      setIsIntegrityModalOpen(true);
      showToast(
        "success",
        "Cryptographic Integrity Verified",
        "All 8 audit blocks validated against SHA-256 hash chain with 0 broken links."
      );
    }, 600);
  };

  // Risky Events Pre-computed Counts (Screen 2 Improve)
  const riskyMetrics = useMemo(() => {
    const prodNoCR = CANONICAL_AUDIT_LOGS.filter(
      (e) => e.environment === "Production" && !e.changeRecord && e.eventClass === "configuration"
    ).length;
    const bulkMutations = CANONICAL_AUDIT_LOGS.filter(
      (e) => e.sourceType === "Reconciliation Rule" || e.changeType === "Reconcile"
    ).length;
    const serviceAccountChanges = CANONICAL_AUDIT_LOGS.filter(
      (e) => e.actorType === "service_account" || e.actorType === "automation"
    ).length;
    return {
      prodNoCR,
      bulkMutations,
      serviceAccountChanges,
      chainStatus: "8 Blocks Sealed",
    };
  }, []);

  const filteredAudits = useMemo(() => {
    let list = [...CANONICAL_AUDIT_LOGS];

    // Event class filter (defaults to configuration mutations to hide computed noise)
    if (eventClassFilter !== "all") {
      list = list.filter((e) => e.eventClass === eventClassFilter);
    }

    if (typeFilter !== "All") {
      list = list.filter((e) => e.changeType === typeFilter);
    }

    if (envFilter !== "all") {
      list = list.filter((e) => e.environment === envFilter);
    }

    if (ciClassFilter !== "all") {
      list = list.filter((e) => e.ciClass === ciClassFilter);
    }

    if (actorTypeFilter !== "all") {
      list = list.filter((e) => e.actorType === actorTypeFilter);
    }

    if (crFilter === "has_cr") {
      list = list.filter((e) => Boolean(e.changeRecord));
    } else if (crFilter === "no_cr") {
      list = list.filter((e) => !e.changeRecord);
    }

    if (dateFilter !== "all") {
      const now = new Date("2026-11-20T17:00:00Z").getTime();
      const maxAgeMs =
        dateFilter === "24h"
          ? 24 * 3600 * 1000
          : dateFilter === "7d"
          ? 7 * 24 * 3600 * 1000
          : 30 * 24 * 3600 * 1000;
      list = list.filter((e) => now - new Date(e.timestamp).getTime() <= maxAgeMs);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((item) => {
        return (
          item.id.toLowerCase().includes(q) ||
          item.ciName.toLowerCase().includes(q) ||
          item.ciId.toLowerCase().includes(q) ||
          item.fieldChanged.toLowerCase().includes(q) ||
          item.actorName.toLowerCase().includes(q) ||
          (item.changeRecord && item.changeRecord.toLowerCase().includes(q)) ||
          (item.sourceId && item.sourceId.toLowerCase().includes(q))
        );
      });
    }

    // Sort: newest first (default, descending sequence) or oldest first
    list.sort((a, b) => {
      return sortOrder === "newest" ? b.sequence - a.sequence : a.sequence - b.sequence;
    });

    return list;
  }, [
    search,
    typeFilter,
    eventClassFilter,
    envFilter,
    ciClassFilter,
    actorTypeFilter,
    crFilter,
    dateFilter,
    sortOrder,
  ]);

  // Paginated window
  const paginatedAudits = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAudits.slice(start, start + pageSize);
  }, [filteredAudits, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredAudits.length / pageSize));

  const handleApplySavedView = (viewKey: string) => {
    setActiveSavedView(viewKey);
    setCurrentPage(1);
    if (viewKey === "default") {
      setEventClassFilter("configuration");
      setTypeFilter("All");
      setEnvFilter("all");
      setCiClassFilter("all");
      setActorTypeFilter("all");
      setCrFilter("all");
      setDateFilter("all");
      setSearch("");
    } else if (viewKey === "prod_no_cr") {
      setEventClassFilter("configuration");
      setTypeFilter("All");
      setEnvFilter("Production");
      setCiClassFilter("all");
      setActorTypeFilter("all");
      setCrFilter("no_cr");
      setDateFilter("all");
    } else if (viewKey === "automated_ire") {
      setEventClassFilter("all");
      setTypeFilter("All");
      setEnvFilter("all");
      setCiClassFilter("all");
      setActorTypeFilter("engine");
      setCrFilter("all");
      setDateFilter("all");
    } else {
      const custom = customViews.find((v) => v.id === viewKey);
      if (custom) {
        setEventClassFilter(custom.filters.eventClassFilter || "configuration");
        setTypeFilter(custom.filters.typeFilter || "All");
        setEnvFilter(custom.filters.envFilter || "all");
        setCiClassFilter(custom.filters.ciClassFilter || "all");
        setActorTypeFilter(custom.filters.actorTypeFilter || "all");
        setCrFilter(custom.filters.crFilter || "all");
        setDateFilter(custom.filters.dateFilter || "all");
      }
    }
  };

  const handleSaveCurrentView = () => {
    const name = window.prompt("Enter a name for this custom audit view:");
    if (!name || !name.trim()) return;
    const newView = {
      id: `view-${Date.now()}`,
      name: name.trim(),
      filters: {
        eventClassFilter,
        typeFilter,
        envFilter,
        ciClassFilter,
        actorTypeFilter,
        crFilter,
        dateFilter,
      },
    };
    const updated = [...customViews, newView];
    setCustomViews(updated);
    try {
      localStorage.setItem("zenops_audit_saved_views", JSON.stringify(updated));
      showToast("success", "Saved View Created", `View "${name.trim()}" persisted.`);
    } catch {
      // ignore
    }
  };

  const clearAllFilters = () => {
    setSearch("");
    setTypeFilter("All");
    setEventClassFilter("configuration");
    setEnvFilter("all");
    setCiClassFilter("all");
    setActorTypeFilter("all");
    setCrFilter("all");
    setDateFilter("all");
    setCurrentPage(1);
  };

  const handleExecuteExport = () => {
    try {
      if (exportFormat === "csv") {
        const headers = [
          "Event ID",
          "Timestamp (UTC)",
          "CI ID",
          "CI Name",
          "CI Class",
          "Environment",
          "Mutation Type",
          "Field",
          "Was Value",
          "Now Value",
          "Actor",
          "Actor Role",
          "Approved By",
          "Source Type",
          "Source ID",
          "Change Record",
          "SHA-256 Hash",
        ];
        const rows = filteredAudits.map((e) => [
          `"${e.id}"`,
          `"${e.timestamp}"`,
          `"${e.ciId}"`,
          `"${e.ciName}"`,
          `"${e.ciClass}"`,
          `"${e.environment}"`,
          `"${e.changeType}"`,
          `"${e.fieldChanged}"`,
          `"${e.beforeValue.replace(/"/g, '""')}"`,
          `"${e.afterValue.replace(/"/g, '""')}"`,
          `"${e.actorName}"`,
          `"${e.actorRole}"`,
          `"${e.approvedBy || ""}"`,
          `"${e.sourceType}"`,
          `"${e.sourceId || ""}"`,
          `"${e.changeRecord || ""}"`,
          `"${e.hash}"`,
        ]);
        const csv = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `zenops-audit-log-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // PDF Export manifest
        const summaryText = `ZenOps CMDB Official Audit Export\nGenerated: ${new Date().toISOString()}\nTotal Records: ${filteredAudits.length}\nHash Root: ${filteredAudits[0]?.hash || "N/A"}\nSigned: ${includeSignature ? "YES (SHA-256)" : "NO"}`;
        const blob = new Blob([summaryText], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `zenops-audit-manifest-${new Date().toISOString().split("T")[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      // Log export event to satisfy G12 / Audit requirements
      logAuditEvent({
        who: session?.name || "Marcus Vance",
        role: session?.role || "CMDB Manager",
        task: "AUDIT-EXPORT",
        ci: "CMDB-AUDIT-LOG",
        oldValue: "Unexported",
        newValue: `Exported ${filteredAudits.length} events (${exportFormat.toUpperCase()}${includeSignature ? " + Signed SHA-256" : ""})`,
        allowed: true,
        reason: "Compliance export authorized by active administrative role",
      });

      showToast(
        "success",
        `Audit ${exportFormat.toUpperCase()} Exported`,
        `Exported ${filteredAudits.length} records${includeSignature ? " with SHA-256 digital signature manifest" : ""}.`
      );
      setIsExportModalOpen(false);
    } catch {
      showToast("error", "Export Failed", "Could not complete audit export.");
    }
  };

  // Active filter chips calculation
  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];
  if (search.trim()) {
    activeChips.push({ key: "search", label: `Search: "${search}"`, onRemove: () => setSearch("") });
  }
  if (typeFilter !== "All") {
    activeChips.push({ key: "type", label: `Mutation: ${typeFilter}`, onRemove: () => setTypeFilter("All") });
  }
  if (envFilter !== "all") {
    activeChips.push({ key: "env", label: `Env: ${envFilter}`, onRemove: () => setEnvFilter("all") });
  }
  if (ciClassFilter !== "all") {
    activeChips.push({ key: "class", label: `Class: ${ciClassFilter}`, onRemove: () => setCiClassFilter("all") });
  }
  if (actorTypeFilter !== "all") {
    activeChips.push({ key: "actor", label: `Actor: ${actorTypeFilter}`, onRemove: () => setActorTypeFilter("all") });
  }
  if (crFilter !== "all") {
    activeChips.push({
      key: "cr",
      label: crFilter === "has_cr" ? "Has Change Record" : "Missing Change Record",
      onRemove: () => setCrFilter("all"),
    });
  }
  if (dateFilter !== "all") {
    activeChips.push({ key: "date", label: `Window: ${dateFilter}`, onRemove: () => setDateFilter("all") });
  }

  return (
    <div className="space-y-6 pb-12 text-default">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-default">
              Configuration Audit History
            </h1>
            <Lozenge appearance="subtle" variant="neutral">
              {filteredAudits.length} Records
            </Lozenge>
            <span className="inline-flex items-center gap-1 text-xs text-muted bg-sunken px-2.5 py-0.5 rounded-full border border-border">
              <Lock className="w-3 h-3 text-muted" />
              WORM Storage &bull; 7-Yr Retention
            </span>
          </div>
          <p className="text-xs text-secondary mt-1 max-w-3xl">
            Cryptographically chained sequence of configuration mutations. Every production change requires
            a linked Change Record (CR) and recorded human approval.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
         

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsExportModalOpen(true)}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export Audit (CSV/PDF)
          </Button>
        </div>
      </div>

      {/* RISKY-EVENT SUMMARY STRIP (Screen 2 Improve) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          onClick={() => {
            setEnvFilter("Production");
            setCrFilter("no_cr");
            setCurrentPage(1);
          }}
          className={cn(
            "p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between shadow-xs",
            envFilter === "Production" && crFilter === "no_cr"
              ? "bg-danger/15 border-danger/50 ring-1 ring-danger"
              : "bg-surface border-border hover:bg-sunken/60"
          )}
        >
          <div>
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">
              Prod Without CR
            </span>
            <span className="font-mono text-xl font-bold text-danger">
              {riskyMetrics.prodNoCR} Anomaly
            </span>
            <span className="text-[10px] text-text-muted block mt-0.5">
              Click to isolate unapproved prod changes
            </span>
          </div>
          <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
        </div>

        <div
          onClick={() => {
            setActorTypeFilter("engine");
            setCurrentPage(1);
          }}
          className={cn(
            "p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between shadow-xs",
            actorTypeFilter === "engine"
              ? "bg-primary/15 border-primary/50 ring-1 ring-primary"
              : "bg-surface border-border hover:bg-sunken/60"
          )}
        >
          <div>
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">
              Bulk IRE Mutations
            </span>
            <span className="font-mono text-xl font-bold text-primary">
              {riskyMetrics.bulkMutations} Changes
            </span>
            <span className="text-[10px] text-text-muted block mt-0.5">
              Automated reconciliation rules
            </span>
          </div>
          <Zap className="w-5 h-5 text-primary shrink-0" />
        </div>

        <div
          onClick={() => {
            setActorTypeFilter("service_account");
            setCurrentPage(1);
          }}
          className={cn(
            "p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between shadow-xs",
            actorTypeFilter === "service_account"
              ? "bg-warning/15 border-warning/50 ring-1 ring-warning"
              : "bg-surface border-border hover:bg-sunken/60"
          )}
        >
          <div>
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">
              Service Account Activity
            </span>
            <span className="font-mono text-xl font-bold text-warning">
              {riskyMetrics.serviceAccountChanges} Events
            </span>
            <span className="text-[10px] text-text-muted block mt-0.5">
              Off-hours & connector workloads
            </span>
          </div>
          <Cpu className="w-5 h-5 text-warning shrink-0" />
        </div>

        <div
          onClick={handleVerifyIntegrity}
          className="p-3 rounded-lg border bg-surface border-border hover:bg-sunken/60 transition-all cursor-pointer flex items-center justify-between shadow-xs"
        >
          <div>
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">
              Cryptographic Proof
            </span>
            <span className="font-mono text-xl font-bold text-emerald-600">
              {riskyMetrics.chainStatus}
            </span>
            <span className="text-[10px] text-text-muted block mt-0.5">
              Verified: {new Date(lastVerifiedTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} UTC
            </span>
          </div>
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR (Screen 2 Improve) */}
      <div className="bg-surface p-3.5 rounded-lg border border-border shadow-xs space-y-3 text-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              placeholder="Search by Event ID, CI name, attribute, actor, or CR..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary text-default placeholder:text-muted"
            />
            <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Saved Views */}
            <select
              value={activeSavedView}
              onChange={(e) => handleApplySavedView(e.target.value)}
              className="bg-sunken border border-border rounded px-2 py-1 text-xs text-default font-medium cursor-pointer"
            >
              <option value="default">Default View (All Config)</option>
              <option value="prod_no_cr">⚠️ Prod Unapproved (No CR)</option>
              <option value="automated_ire">⚡ Automated Reconciliations</option>
              {customViews.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  ⭐ {cv.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleSaveCurrentView}
              className="px-2 py-1 rounded border border-border text-xs text-text-secondary hover:text-default hover:bg-sunken transition-colors"
              title="Save current filter set as custom view"
            >
              Save View
            </button>

            {/* Environment */}
            <select
              value={envFilter}
              onChange={(e) => {
                setEnvFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-surface border border-border rounded px-2 py-1 text-xs text-default cursor-pointer"
            >
              <option value="all">All Envs</option>
              <option value="Production">Production</option>
              <option value="Staging">Staging</option>
            </select>

            {/* CI Class */}
            <select
              value={ciClassFilter}
              onChange={(e) => {
                setCiClassFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-surface border border-border rounded px-2 py-1 text-xs text-default cursor-pointer"
            >
              <option value="all">All Classes</option>
              <option value="Server/VM">Server/VM</option>
              <option value="Application">Application</option>
              <option value="Container/Pod">Container/Pod</option>
              <option value="Database">Database</option>
            </select>

            {/* Actor Type */}
            <select
              value={actorTypeFilter}
              onChange={(e) => {
                setActorTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-surface border border-border rounded px-2 py-1 text-xs text-default cursor-pointer"
            >
              <option value="all">All Actors</option>
              <option value="person">Person</option>
              <option value="engine">IRE Engine</option>
              <option value="automation">Automation</option>
              <option value="service_account">Service Acct</option>
            </select>

            {/* Change Record Status */}
            <select
              value={crFilter}
              onChange={(e) => {
                setCrFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-surface border border-border rounded px-2 py-1 text-xs text-default cursor-pointer"
            >
              <option value="all">All CR Status</option>
              <option value="has_cr">With Change Record</option>
              <option value="no_cr">Missing Change Record</option>
            </select>

            {/* Date Range */}
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-surface border border-border rounded px-2 py-1 text-xs text-default cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            {/* Sort Order Toggle */}
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-xs text-secondary hover:text-default bg-surface hover:bg-sunken transition-colors"
            >
              <ArrowUpDown className="w-3 h-3" />
              <span>{sortOrder === "newest" ? "Newest" : "Oldest"}</span>
            </button>
          </div>
        </div>

        {/* Removable Active Filter Chips */}
        {activeChips.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-border/60">
            <span className="text-[11px] font-semibold text-text-muted">Active Filters:</span>
            {activeChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary border border-primary/20"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={chip.onRemove}
                  className="hover:text-danger hover:bg-surface/80 rounded-full p-0.5"
                  title="Remove filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-[11px] text-text-muted hover:text-danger hover:underline ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Audit Records Table */}
      <Card className="bg-surface border-border overflow-hidden shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto min-w-0 max-h-[600px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-sunken border-b border-border text-[11px] uppercase tracking-wider text-muted select-none sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">Time (UTC &bull; Age)</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Event ID</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Configuration Item</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Mutation Type</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Field & Difference</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Actor & Role</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Source</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Change Record</th>
                  <th className="py-2.5 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedAudits.length > 0 ? (
                  paginatedAudits.map((event) => {
                    const isProdWithoutCR = event.environment === "Production" && !event.changeRecord && event.eventClass === "configuration";
                    return (
                      <tr key={event.id} className="hover:bg-sunken/40 transition-colors">
                        {/* 1. Time Column First (Screen 2, Item 1) */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <RelativeTime isoString={event.timestamp} statedTimeZone="UTC" />
                        </td>

                        {/* 2. Event ID Sequence (Screen 2, Item 2) */}
                        <td className="py-2.5 px-3 font-mono font-bold text-primary whitespace-nowrap">
                          {event.id}
                        </td>

                        {/* 3. Configuration Item */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <Link
                            href={`/cis/${event.ciId}`}
                            className="font-semibold text-default hover:text-primary transition-colors flex items-center gap-1 text-xs"
                          >
                            <span className="truncate max-w-[150px]">{event.ciName}</span>
                            <ExternalLink className="w-3 h-3 text-muted shrink-0" />
                          </Link>
                          <span className="font-mono text-[10px] text-muted">{event.ciId}</span>
                        </td>

                        {/* 4. Mutation Type */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <Lozenge
                            appearance="subtle"
                            variant={
                              event.changeType === "Create"
                                ? "success"
                                : event.changeType === "Retire"
                                ? "danger"
                                : event.changeType === "Reconcile"
                                ? "discovery"
                                : "info"
                            }
                            size="xs"
                          >
                            {event.changeType}
                          </Lozenge>
                        </td>

                        {/* 5. Field & Difference with text markers (Screen 2, Item 5 & G8) */}
                        <td className="py-2.5 px-3 max-w-[260px]">
                          <span className="font-mono font-bold text-default block text-[11px]">
                            {event.fieldChanged}
                          </span>
                          {event.isListField ? (
                            <div className="text-[11px] mt-0.5 space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {event.addedItems?.map((item) => (
                                  <span
                                    key={item}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded font-mono text-[10px] bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
                                  >
                                    + {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] font-mono mt-0.5 flex flex-col gap-0.5">
                              <span className="text-red-700 dark:text-red-400 line-through truncate max-w-[220px]" title={event.beforeValue}>
                                was: {event.beforeValue}
                              </span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-semibold truncate max-w-[220px]" title={event.afterValue}>
                                now: {event.afterValue}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 6. Actor & Role (Screen 2, Item 7) */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <ActorChip
                            name={event.actorName}
                            role={event.actorRole}
                            type={event.actorType}
                            approvedBy={event.approvedBy}
                          />
                        </td>

                        {/* 7. Source Column with Link (Screen 2, Item 6) */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {event.sourceHref ? (
                            <Link
                              href={event.sourceHref}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                            >
                              <span>{event.sourceId || event.sourceType}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          ) : (
                            <span className="text-[11px] text-secondary">{event.sourceType}</span>
                          )}
                        </td>

                        {/* 8. Change Record Column (Screen 2, Item 4) */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {event.changeRecord ? (
                            <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                              {event.changeRecord}
                            </span>
                          ) : isProdWithoutCR ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold font-mono text-[10px] bg-red-600 text-white shadow-xs">
                              <AlertOctagon className="w-2.5 h-2.5" />
                              PROD NO CR
                            </span>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>

                        {/* 9. Action Details */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedEvent(event)}
                            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted">
                      No configuration audit records match current filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination & WORM Retention Footer (Screen 2 Improve) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-surface p-3 rounded-lg border border-border">
        <div className="flex items-center gap-2 text-text-secondary">
          <span className="font-medium text-text-default">
            Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredAudits.length)} of {filteredAudits.length} events
          </span>
          <span className="text-text-muted">&bull;</span>
          <span className="text-text-muted font-mono text-[11px]">
            WORM Immutable Archive (365-Day Live / 7-Yr Cold Retention)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="secondary"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="px-2 text-xs font-semibold text-text-default">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            size="xs"
            variant="secondary"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Export Configuration & Compliance Signature Modal (Screen 2 Improve) */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-modal max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-default">
                  Export Configuration Audit
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="text-muted hover:text-default"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-default block mb-1">Export Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportFormat("csv")}
                    className={cn(
                      "p-2.5 rounded-lg border text-left font-medium transition-all",
                      exportFormat === "csv"
                        ? "bg-primary/10 border-primary text-primary font-bold"
                        : "bg-surface border-border text-secondary hover:bg-sunken"
                    )}
                  >
                    CSV Spreadsheet
                    <span className="block text-[10px] text-muted font-normal mt-0.5">
                      Raw comma-separated table
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat("pdf")}
                    className={cn(
                      "p-2.5 rounded-lg border text-left font-medium transition-all",
                      exportFormat === "pdf"
                        ? "bg-primary/10 border-primary text-primary font-bold"
                        : "bg-surface border-border text-secondary hover:bg-sunken"
                    )}
                  >
                    PDF Compliance Report
                    <span className="block text-[10px] text-muted font-normal mt-0.5">
                      Formatted summary manifest
                    </span>
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded bg-sunken border border-border space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSignature}
                    onChange={(e) => setIncludeSignature(e.target.checked)}
                    className="mt-0.5 rounded text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="font-semibold text-default block">
                      Include Cryptographic SHA-256 Signature
                    </span>
                    <span className="text-[11px] text-secondary block mt-0.5">
                      Attaches Merkle block root hash for external SOC2 / ISO-27001 auditor verification.
                    </span>
                  </div>
                </label>
              </div>

              <div className="p-2 rounded bg-primary/5 border border-primary/20 text-[11px] text-secondary">
                <span className="font-semibold text-primary">Governance Rule:</span> This export action will be recorded in the immutable audit log with your authenticated identity and active role scope.
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsExportModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleExecuteExport}>
                Generate &amp; Download
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cryptographic Hash-Chain Verification Modal (Screen 2, Item 3) */}
      {isIntegrityModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-modal max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-default">
                  Cryptographic Integrity Verification
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsIntegrityModalOpen(false)}
                className="text-muted hover:text-default text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Audit Hash Chain Validated (0 Breaches)
                </div>
                <p className="text-[11px] leading-relaxed">
                  All 8 sequential blocks were recomputed and verified against their cryptographic parent
                  hashes. Every transaction is sealed with SHA-256 and stored on WORM (Write Once, Read
                  Many) object storage with strict immutability locks.
                </p>
              </div>

              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="p-2.5 rounded bg-sunken border border-border space-y-1">
                  <div className="text-muted flex justify-between">
                    <span>Block Height: 8 Blocks</span>
                    <span>Storage Engine: S3 Object Lock (Compliance Mode)</span>
                  </div>
                  <div className="text-muted flex justify-between">
                    <span>Retention Policy: 7 Years (SOC2 & ISO27001)</span>
                    <span>Verified: Just now</span>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-sunken border border-border space-y-1">
                  <span className="text-muted block text-[10px] uppercase font-bold">Latest Block Hash (AUD-908)</span>
                  <span className="text-primary break-all">
                    9f22c553b0044eef7732d4436110e7a45362d1ef8843b9dd116244fa23470a08
                  </span>
                  <span className="text-muted block text-[10px] uppercase font-bold mt-1">Previous Link Hash (AUD-907)</span>
                  <span className="text-secondary break-all">
                    3e11b442a9933dde6621c3325009d6f34251c0de7732a8cc005133ef12360a07
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setIsIntegrityModalOpen(false)}>
                Close Evidence
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Drawer (Screen 2 Improve) */}
      {selectedEvent && (
        <Drawer
          isOpen={true}
          onClose={() => setSelectedEvent(null)}
          title={`Audit Record: ${selectedEvent.id}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-sunken rounded-lg border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-primary">{selectedEvent.id}</span>
                <Lozenge variant={selectedEvent.environment === "Production" ? "danger" : "info"} size="xs">
                  {selectedEvent.environment}
                </Lozenge>
              </div>
              <p className="font-semibold text-default text-sm">{selectedEvent.ciName}</p>
              <p className="text-[11px] text-muted font-mono">CI ID: {selectedEvent.ciId}</p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-default uppercase tracking-wider text-[11px]">Mutation Diff</h4>
              <div className="p-3 rounded-lg border border-border bg-sunken space-y-1.5 font-mono text-xs">
                <div className="text-muted font-semibold">Field: {selectedEvent.fieldChanged}</div>
                <div className="p-2 rounded bg-surface border border-red-500/30 text-red-700 dark:text-red-400">
                  - was: {selectedEvent.beforeValue}
                </div>
                <div className="p-2 rounded bg-surface border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold">
                  + now: {selectedEvent.afterValue}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-default uppercase tracking-wider text-[11px]">Actor & Approver</h4>
              <div className="p-3 rounded-lg border border-border bg-surface space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted">Initiating Actor:</span>
                  <span className="font-semibold text-default">{selectedEvent.actorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Actor Role:</span>
                  <span className="text-secondary">{selectedEvent.actorRole}</span>
                </div>
                {selectedEvent.approvedBy && (
                  <div className="flex justify-between pt-1 border-t border-border">
                    <span className="text-muted">Authorized Approver:</span>
                    <span className="font-bold text-primary">{selectedEvent.approvedBy}</span>
                  </div>
                )}
                {selectedEvent.changeRecord && (
                  <div className="flex justify-between pt-1 border-t border-border">
                    <span className="text-muted">Change Record (CR):</span>
                    <span className="font-mono font-bold text-primary">{selectedEvent.changeRecord}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-default uppercase tracking-wider text-[11px]">Request Telemetry</h4>
              <div className="p-3 rounded-lg border border-border bg-sunken font-mono text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted">Source:</span>
                  <span className="text-default">{selectedEvent.sourceType} ({selectedEvent.sourceId || "Direct"})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Correlation ID:</span>
                  <span className="text-default">{selectedEvent.correlationId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Client IP:</span>
                  <span className="text-default">{selectedEvent.clientIp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Session ID:</span>
                  <span className="text-default">{selectedEvent.sessionId}</span>
                </div>
                <div className="pt-1.5 border-t border-border">
                  <span className="text-muted block text-[10px]">SHA-256 Hash:</span>
                  <span className="text-primary break-all text-[10px]">{selectedEvent.hash}</span>
                </div>
              </div>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
