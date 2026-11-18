"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  FileText,
  Trash2,
  Check,
  RefreshCw,
  Info,
  Server,
  Layers,
  Database,
  Radio,
  Cloud,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useCMDB } from "@/context/cmdb-context";
import {
  CIItem,
  CIClass,
  Environment,
  BusinessCriticality,
  OperationalStatus,
  LifecycleStatus,
} from "@/types/cmdb";
import {
  CI_CLASSES,
  ENVIRONMENTS,
  BUSINESS_CRITICALITIES,
  OPERATIONAL_STATUSES,
  LIFECYCLE_STATUSES,
  SUPPORT_GROUPS,
  COMMON_OWNERS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface ParsedCIRow {
  id: string;
  selected: boolean;
  valid: boolean;
  errors: string[];
  warnings: string[];
  data: {
    name: string;
    ciClass: CIClass;
    environment: Environment;
    businessCriticality: BusinessCriticality;
    operationalStatus: OperationalStatus;
    lifecycleStatus: LifecycleStatus;
    owner: string;
    supportGroup: string;
    ipAddress?: string;
    location?: string;
    description: string;
  };
}

interface CIBulkUploadProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const SAMPLE_CSV_CONTENT = `name,ciClass,environment,businessCriticality,operationalStatus,lifecycleStatus,owner,supportGroup,ipAddress,location,description
prod-api-gw-01,Server/VM,Production,Tier 1 - Mission Critical,Operational,In Use,Sarah Jenkins (Platform Eng),Core Infrastructure & Cloud Ops,10.240.0.12,AWS us-east-1,Production primary edge API ingress gateway
payments-postgres-primary,Database,Production,Tier 1 - Mission Critical,Operational,In Use,Priya Sharma (Data Ops),Database Administration (DBA),10.240.4.88,AWS us-east-1,Core transactional ledger PostgreSQL cluster
customer-portal-frontend,Application,Production,Tier 2 - Business Critical,Operational,In Use,David Chen (Enterprise Architect),Platform Reliability Engineering,10.240.2.14,CloudFront Global,Next.js customer account dashboard UI
auth-service-pod-01,Container/Pod,Production,Tier 1 - Mission Critical,Operational,In Use,Sarah Jenkins (Platform Eng),Core Infrastructure & Cloud Ops,10.242.1.9,EKS Cluster US,OAuth2 JWT token validation service
corp-firewall-border-01,Network Device,Production,Tier 1 - Mission Critical,Operational,In Use,Robert Taylor (NetOps),Network & Security Operations,192.168.1.1,Austin HQ DC,Border Palo Alto perimeter firewall
staging-cache-redis,Database,Staging,Tier 3 - Business Operational,Operational,In Use,Elena Rostova (DevOps),Core Infrastructure & Cloud Ops,10.241.10.5,AWS us-east-2,Staging environment shared session cache
qa-analytics-worker,Server/VM,QA / Test,Tier 4 - Non-Critical,Operational,In Use,Marcus Vance (Cloud Director),Platform Reliability Engineering,10.243.5.21,GCP us-central1,QA test event consumer batch worker`;

export function CIBulkUpload({ onSuccess, onCancel }: CIBulkUploadProps) {
  const { bulkAddCIs, showToast } = useCMDB();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedCIRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "zenops_cmdb_ci_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("info", "Template Downloaded", "Sample CSV template with valid schema has been downloaded.");
  };

  // Helper: Match or fallback to valid enum
  const matchCIClass = (raw: string): CIClass => {
    const cleaned = raw.trim().toLowerCase();
    const found = CI_CLASSES.find((c) => c.toLowerCase() === cleaned);
    if (found) return found;
    if (cleaned.includes("server") || cleaned.includes("vm")) return "Server/VM";
    if (cleaned.includes("container") || cleaned.includes("pod") || cleaned.includes("k8s")) return "Container/Pod";
    if (cleaned.includes("db") || cleaned.includes("database") || cleaned.includes("sql")) return "Database";
    if (cleaned.includes("app") || cleaned.includes("service")) return "Application";
    if (cleaned.includes("net") || cleaned.includes("router") || cleaned.includes("switch") || cleaned.includes("firewall")) return "Network Device";
    if (cleaned.includes("cloud") || cleaned.includes("s3") || cleaned.includes("bucket")) return "Cloud Resource";
    if (cleaned.includes("saas")) return "SaaS Subscription";
    return "Server/VM";
  };

  const matchEnvironment = (raw: string): Environment => {
    const cleaned = raw.trim().toLowerCase();
    const found = ENVIRONMENTS.find((e) => e.toLowerCase() === cleaned);
    if (found) return found;
    if (cleaned.includes("prod")) return "Production";
    if (cleaned.includes("stag")) return "Staging";
    if (cleaned.includes("qa") || cleaned.includes("test")) return "QA / Test";
    if (cleaned.includes("dev")) return "Development";
    if (cleaned.includes("dr") || cleaned.includes("disaster")) return "DR / Disaster Recovery";
    return "Production";
  };

  const matchCriticality = (raw: string): BusinessCriticality => {
    const cleaned = raw.trim().toLowerCase();
    const found = BUSINESS_CRITICALITIES.find((b) => b.toLowerCase() === cleaned);
    if (found) return found;
    if (cleaned.includes("1") || cleaned.includes("mission")) return "Tier 1 - Mission Critical";
    if (cleaned.includes("2") || cleaned.includes("business critical")) return "Tier 2 - Business Critical";
    if (cleaned.includes("3") || cleaned.includes("operational")) return "Tier 3 - Business Operational";
    if (cleaned.includes("4") || cleaned.includes("non")) return "Tier 4 - Non-Critical";
    return "Tier 2 - Business Critical";
  };

  const matchOperationalStatus = (raw: string): OperationalStatus => {
    const cleaned = raw.trim().toLowerCase();
    const found = OPERATIONAL_STATUSES.find((s) => s.toLowerCase() === cleaned);
    if (found) return found;
    if (cleaned.includes("degraded")) return "Degraded";
    if (cleaned.includes("maint")) return "Maintenance";
    if (cleaned.includes("offline")) return "Offline";
    if (cleaned.includes("non")) return "Non-operational";
    return "Operational";
  };

  const matchLifecycleStatus = (raw: string): LifecycleStatus => {
    const cleaned = raw.trim().toLowerCase();
    const found = LIFECYCLE_STATUSES.find((s) => s.toLowerCase() === cleaned);
    if (found) return found;
    if (cleaned.includes("retire")) return "Retired";
    if (cleaned.includes("test")) return "In Test";
    if (cleaned.includes("stock")) return "In Stock";
    if (cleaned.includes("order")) return "Ordered";
    if (cleaned.includes("pipe")) return "Pipeline";
    return "In Use";
  };

  // Robust CSV parser function
  const parseCSVText = (csvText: string) => {
    setIsProcessing(true);
    try {
      const lines = csvText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length < 2) {
        showToast("error", "Invalid CSV", "CSV must contain a header row and at least 1 data row.");
        setIsProcessing(false);
        return;
      }

      // Parse CSV line handling quotes
      const parseLine = (line: string): string[] => {
        const result: string[] = [];
        let cur = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            result.push(cur.trim().replace(/^["']|["']$/g, ""));
            cur = "";
          } else {
            cur += char;
          }
        }
        result.push(cur.trim().replace(/^["']|["']$/g, ""));
        return result;
      };

      const rawHeaders = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

      // Identify column indices
      const getIndex = (possibleNames: string[]): number => {
        return rawHeaders.findIndex((h) => possibleNames.some((p) => h.includes(p)));
      };

      const nameIdx = getIndex(["name", "ciname", "hostname"]);
      const classIdx = getIndex(["class", "ciclass", "type"]);
      const envIdx = getIndex(["env", "environment"]);
      const critIdx = getIndex(["crit", "criticality", "tier"]);
      const opStatusIdx = getIndex(["operationalstatus", "opstatus", "status"]);
      const lifeStatusIdx = getIndex(["lifecyclestatus", "lifecycle", "state"]);
      const ownerIdx = getIndex(["owner", "assigned", "lead"]);
      const supportIdx = getIndex(["support", "supportgroup", "group", "team"]);
      const ipIdx = getIndex(["ip", "ipaddress", "address"]);
      const locIdx = getIndex(["loc", "location", "region", "datacenter", "zone"]);
      const descIdx = getIndex(["desc", "description", "summary", "notes"]);

      if (nameIdx === -1) {
        showToast("error", "Missing Required Column", "CSV must contain a 'name' or 'ciName' column.");
        setIsProcessing(false);
        return;
      }

      const rows: ParsedCIRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = parseLine(lines[i]);
        if (parts.length === 0 || (parts.length === 1 && !parts[0])) continue;

        const rawName = parts[nameIdx] || "";
        const rawClass = classIdx !== -1 ? parts[classIdx] || "" : "";
        const rawEnv = envIdx !== -1 ? parts[envIdx] || "" : "";
        const rawCrit = critIdx !== -1 ? parts[critIdx] || "" : "";
        const rawOpStatus = opStatusIdx !== -1 ? parts[opStatusIdx] || "" : "";
        const rawLifeStatus = lifeStatusIdx !== -1 ? parts[lifeStatusIdx] || "" : "";
        const rawOwner = ownerIdx !== -1 ? parts[ownerIdx] || "" : "";
        const rawSupport = supportIdx !== -1 ? parts[supportIdx] || "" : "";
        const rawIp = ipIdx !== -1 ? parts[ipIdx] || "" : "";
        const rawLoc = locIdx !== -1 ? parts[locIdx] || "" : "";
        const rawDesc = descIdx !== -1 ? parts[descIdx] || "" : "";

        const errors: string[] = [];
        const warnings: string[] = [];

        if (!rawName.trim()) {
          errors.push("CI Name is required");
        }

        const owner = rawOwner.trim() || "Unassigned";
        const supportGroup = rawSupport.trim() || SUPPORT_GROUPS[0];

        if (owner === "Unassigned") {
          warnings.push("Missing owner (reduces CMDB trust score)");
        }

        const parsedItem: ParsedCIRow = {
          id: `ROW-${i}-${Date.now().toString().slice(-4)}`,
          selected: errors.length === 0,
          valid: errors.length === 0,
          errors,
          warnings,
          data: {
            name: rawName.trim(),
            ciClass: matchCIClass(rawClass),
            environment: matchEnvironment(rawEnv),
            businessCriticality: matchCriticality(rawCrit),
            operationalStatus: matchOperationalStatus(rawOpStatus),
            lifecycleStatus: matchLifecycleStatus(rawLifeStatus),
            owner,
            supportGroup,
            ipAddress: rawIp.trim() || undefined,
            location: rawLoc.trim() || undefined,
            description: rawDesc.trim() || `Configuration Item imported via bulk CSV (${matchCIClass(rawClass)})`,
          },
        };

        rows.push(parsedItem);
      }

      setParsedRows(rows);
      showToast("info", "CSV Parsed", `Loaded ${rows.length} records. Review and click Import.`);
    } catch (err: any) {
      showToast("error", "Parse Error", err?.message || "Failed to process CSV file.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle File Input Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) parseCSVText(text);
    };
    reader.readAsText(file);
  };

  // Handle Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".txt"))) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) parseCSVText(text);
      };
      reader.readAsText(file);
    } else {
      showToast("error", "Invalid File", "Please upload a valid .csv file.");
    }
  };

  // Handle Paste Parse
  const handlePasteParse = () => {
    if (!pastedText.trim()) {
      showToast("warning", "Empty CSV", "Please paste CSV content before processing.");
      return;
    }
    setFileName("pasted_data.csv");
    parseCSVText(pastedText);
  };

  // Toggle selection
  const toggleRow = (id: string) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const toggleSelectAll = () => {
    const allSelected = parsedRows.filter((r) => r.valid).every((r) => r.selected);
    setParsedRows((prev) =>
      prev.map((r) => (r.valid ? { ...r, selected: !allSelected } : r))
    );
  };

  // Clear rows & reset
  const handleReset = () => {
    setParsedRows([]);
    setFileName(null);
    setPastedText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Commit Import
  const handleImport = () => {
    const selectedRows = parsedRows.filter((r) => r.selected && r.valid);
    if (selectedRows.length === 0) {
      showToast("warning", "No Rows Selected", "Please select at least 1 valid row to import.");
      return;
    }

    setIsImporting(true);
    setTimeout(() => {
      try {
        const payload: Omit<CIItem, "id" | "createdAt" | "updatedAt">[] = selectedRows.map((r) => {
          const { data } = r;
          const isLive = data.operationalStatus === "Operational" || data.lifecycleStatus === "In Use";
          const hasOwner = data.owner && data.owner !== "Unassigned";

          const initialTrust = hasOwner ? 90 : 60;

          return {
            name: data.name,
            ciClass: data.ciClass,
            description: data.description,
            lifecycleStatus: data.lifecycleStatus,
            operationalStatus: data.operationalStatus,
            environment: data.environment,
            businessCriticality: data.businessCriticality,
            owner: data.owner,
            supportGroup: data.supportGroup,
            location: data.location,
            dataClassification: "Internal",
            complianceFlags: ["SOC2", "ISO27001"],
            identificationKeys: {
              ipAddress: data.ipAddress,
              fqdn: data.ipAddress ? `${data.name}.zenops.internal` : undefined,
            },
            discoverySource: "CSV Bulk Import",
            firstDiscovered: new Date().toISOString(),
            lastDiscovered: new Date().toISOString(),
            lastVerified: new Date().toISOString(),
            sourceRanking: 4,
            trustScore: initialTrust,
            scoreComponents: {
              completeness: hasOwner ? 90 : 65,
              freshness: 100,
              accuracy: 90,
              reconciliation: 85,
            },
            scoreReasons: hasOwner
              ? ["Bulk imported with assigned owner (+15 pts)", "Fresh discovery record (+25 pts)"]
              : ["Live CI imported without designated owner (-25 pts)"],
            qualityFlags: hasOwner ? [] : ["Missing Required Owner"],
            attributes: {
              ipAddress: data.ipAddress,
              virtualizationType: data.ciClass === "Server/VM" ? "AWS EC2 Nitro" : undefined,
              dbEngine: data.ciClass === "Database" ? "PostgreSQL / Aurora" : undefined,
            },
          };
        });

        bulkAddCIs(payload, "Enterprise Admin (CSV Bulk Upload)");
        setIsImporting(false);
        if (onSuccess) {
          onSuccess();
        }
      } catch (err: any) {
        showToast("error", "Import Failed", err?.message || "An unexpected error occurred during import.");
        setIsImporting(false);
      }
    }, 600);
  };

  const validCount = parsedRows.filter((r) => r.valid).length;
  const selectedCount = parsedRows.filter((r) => r.selected && r.valid).length;
  const warningCount = parsedRows.filter((r) => r.warnings.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Top Banner: Explanation & Sample Download */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20 text-foreground">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-md bg-primary/10 text-primary flex-shrink-0 mt-0.5">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              Bulk Configuration Item (CI) CSV Ingestion
            </h4>
            <p className="text-xs sm:text-sm text-secondary mt-0.5 leading-relaxed">
              Upload discovery spreadsheets or CMDB exports to bulk onboard multiple Configuration Items at once.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadTemplate}
          leftIcon={<Download className="w-3.5 h-3.5" />}
          className="flex-shrink-0"
        >
          Download CSV Template
        </Button>
      </div>

      {/* Input Mode Selector (when no rows parsed yet) */}
      {parsedRows.length === 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border">
            <button
              onClick={() => setActiveTab("file")}
              className={cn(
                "pb-2.5 px-3.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2",
                activeTab === "file"
                  ? "border-primary text-primary"
                  : "border-transparent text-secondary hover:text-foreground"
              )}
            >
              <Upload className="w-4 h-4" />
              Upload .CSV File
            </button>
            <button
              onClick={() => setActiveTab("paste")}
              className={cn(
                "pb-2.5 px-3.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2",
                activeTab === "paste"
                  ? "border-primary text-primary"
                  : "border-transparent text-secondary hover:text-foreground"
              )}
            >
              <FileText className="w-4 h-4" />
              Paste Raw CSV Text
            </button>
          </div>

          {activeTab === "file" ? (
            /* File Drag & Drop Zone */
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 sm:p-12 text-center transition-all cursor-pointer bg-elevated/30",
                dragActive
                  ? "border-primary bg-primary/5 scale-[1.005]"
                  : "border-border hover:border-border-strong hover:bg-elevated/50"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-14 h-14 mx-auto rounded-lg bg-surface shadow-subtle border border-border flex items-center justify-center text-primary mb-3">
                <Upload className="w-7 h-7" />
              </div>
              <p className="text-base font-bold text-foreground">
                Click to browse or drag & drop your CSV file here
              </p>
              <p className="text-xs sm:text-sm text-secondary mt-1.5 max-w-sm mx-auto">
                Supports standard comma-separated `.csv` exports with columns like <span className="font-mono text-foreground font-semibold">name, ciClass, environment, owner, supportGroup</span>
              </p>
              <div className="mt-3.5 inline-flex items-center gap-2 px-3 py-1 rounded bg-surface border border-border text-xs font-semibold text-secondary shadow-subtle">
                <span>Supports up to 500 CIs per batch</span>
              </div>
            </div>
          ) : (
            /* Direct CSV Textarea Paste */
            <div className="space-y-3">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                Paste CSV Contents (Header + Rows)
              </label>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={SAMPLE_CSV_CONTENT}
                rows={8}
                className="w-full rounded-md border border-border p-3 text-sm font-mono bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-muted">
                  Tip: You can copy and paste directly from Microsoft Excel or Google Sheets.
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handlePasteParse}
                  isLoading={isProcessing}
                >
                  Parse & Preview CIs
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview Table & Confirmation (after CSV is parsed) */}
      {parsedRows.length > 0 && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Summary Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-elevated/40 border border-border rounded-lg">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-sm font-bold text-foreground">
                {fileName || "CSV Import"}
              </span>
              <Badge variant="teal" size="sm">
                {validCount} Valid Records
              </Badge>
              {warningCount > 0 && (
                <Badge variant="warning" size="sm">
                  {warningCount} Warnings
                </Badge>
              )}
              <Badge variant="blue" size="sm">
                {selectedCount} Selected for Import
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Upload Different File
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="border border-border rounded-xl overflow-hidden bg-surface shadow-2xs">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-sunken border-b border-border text-xs font-bold text-muted uppercase tracking-wider z-10">
                  <tr>
                    <th className="py-3 px-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={validCount > 0 && selectedCount === validCount}
                        onChange={toggleSelectAll}
                        className="rounded border-border text-primary focus:ring-primary"
                        aria-label="Select all rows"
                      />
                    </th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5">CI Name</th>
                    <th className="py-3 px-3.5">Class</th>
                    <th className="py-3 px-3.5">Environment</th>
                    <th className="py-3 px-3.5">Criticality</th>
                    <th className="py-3 px-3.5">Owner / Support</th>
                    <th className="py-3 px-3.5">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-sm">
                  {parsedRows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "transition-colors",
                        row.selected ? "bg-selected-bg/30" : "hover:bg-sunken/60",
                        !row.valid && "opacity-60 bg-danger/5"
                      )}
                    >
                      <td className="py-3 px-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          disabled={!row.valid}
                          onChange={() => toggleRow(row.id)}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {row.valid ? (
                          row.warnings.length > 0 ? (
                            <span
                              className="inline-flex items-center gap-1 text-xs font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-md border border-warning/20"
                              title={row.warnings.join(", ")}
                            >
                              <AlertCircle className="w-3.5 h-3.5 text-warning" />
                              Ready*
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-md border border-success/20"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                              Ready
                            </span>
                          )
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-semibold text-danger bg-danger/10 px-2 py-0.5 rounded-md border border-danger/20"
                            title={row.errors.join(", ")}
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-danger" />
                            Error
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 font-semibold text-foreground whitespace-nowrap text-sm">
                        {row.data.name}
                        {row.data.description && (
                          <p className="text-xs text-muted font-normal truncate max-w-xs mt-0.5">
                            {row.data.description}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <Badge variant="blue" size="sm">
                          {row.data.ciClass}
                        </Badge>
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <Badge
                          variant={
                            row.data.environment === "Production"
                              ? "danger"
                              : row.data.environment === "Staging"
                              ? "warning"
                              : "neutral"
                          }
                          size="sm"
                        >
                          {row.data.environment}
                        </Badge>
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap text-secondary text-xs sm:text-sm">
                        {row.data.businessCriticality.split(" - ")[0]}
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <p className="font-medium text-foreground text-xs sm:text-sm truncate max-w-[150px]">
                          {row.data.owner}
                        </p>
                        <p className="text-xs text-muted truncate max-w-[150px]">
                          {row.data.supportGroup}
                        </p>
                      </td>

                      <td className="py-3 px-3.5 font-mono text-xs text-muted whitespace-nowrap">
                        {row.data.ipAddress || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted">
              <Info className="w-4 h-4 text-primary flex-shrink-0" />
              <span>
                Importing will assign unique CMDB IDs (<code className="bg-sunken px-1.5 py-0.5 rounded text-foreground font-mono">CI-10xx</code>) and generate automatic audit history logs.
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {onCancel && (
                <Button variant="secondary" size="sm" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={handleImport}
                isLoading={isImporting}
                disabled={selectedCount === 0}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Import {selectedCount} {selectedCount === 1 ? "Configuration Item" : "Configuration Items"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
