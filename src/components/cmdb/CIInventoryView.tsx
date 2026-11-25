"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Download,
  FileSpreadsheet,
  Bookmark,
  Filter,
  X,
  Search,
  SlidersHorizontal,
  RotateCcw,
  Upload,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Lozenge } from "@/components/ui/Lozenge";
import { CIFilters, CIFilterState } from "@/components/cmdb/CIFilters";
import { CIListTable } from "@/components/cmdb/CIListTable";
import { CIRetireModal } from "@/components/cmdb/CIRetireModal";
import { CIBulkUploadModal } from "@/components/cmdb/CIBulkUploadModal";
import { useCMDB } from "@/context/cmdb-context";
import { CIItem } from "@/types/cmdb";
import { cn } from "@/lib/utils";
import { usePermission } from "@/components/rbac/usePermission";
import { Can } from "@/components/rbac/Can";
import { AccessDenied } from "@/components/rbac/AccessDenied";
import { PERMISSIONS } from "@/lib/rbac/permissions";

const initialFilters: CIFilterState = {
  search: "",
  ciClass: "",
  environment: "",
  operationalStatus: "",
  criticality: "",
  trustScoreMin: "",
};

export function CIInventoryView() {
  const { cis, showToast, userRole, activeTenant, selectedEnvironment } = useCMDB();
  const { allowed: canViewCI, reason: denyReason } = usePermission(PERMISSIONS.CI_VIEW);
  const [filters, setFilters] = useState<CIFilterState>(initialFilters);
  const [activeSavedView, setActiveSavedView] = useState<string>("all");
  const [retireTarget, setRetireTarget] = useState<CIItem | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  if (!canViewCI) {
    return (
      <AccessDenied
        requiredPermission={PERMISSIONS.CI_VIEW}
        reason={denyReason || "Executive / Report Viewer role has dashboard.view only and cannot access individual CI records or CI inventory."}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // SAVED FILTER TABS (Section 4.A.2 Requirements)
  // ---------------------------------------------------------------------------
  const savedViews = [
    { id: "all", label: "All CIs" },
    { id: "my-cis", label: "My CIs" },
    { id: "missing-owner", label: "Missing Owner" },
    { id: "stale", label: "Stale" },
    { id: "tier0", label: "Production Tier 0" },
  ];

  const handleApplySavedView = (viewId: string) => {
    setActiveSavedView(viewId);
    if (viewId === "all") {
      setFilters(initialFilters);
    } else if (viewId === "my-cis") {
      setFilters({ ...initialFilters, search: "Admin" });
    } else if (viewId === "missing-owner") {
      setFilters(initialFilters);
    } else if (viewId === "stale") {
      setFilters(initialFilters);
    } else if (viewId === "tier0") {
      setFilters({ ...initialFilters, environment: "Production", criticality: "Tier 1" });
    }
  };

  // ---------------------------------------------------------------------------
  // FILTERING LOGIC
  // ---------------------------------------------------------------------------
  const filteredCIs = useMemo(() => {
    return cis.filter((ci) => {
      // Global header environment filter
      if (
        selectedEnvironment &&
        selectedEnvironment !== "All" &&
        ci.environment !== selectedEnvironment
      ) {
        return false;
      }

      // Saved view logic
      if (activeSavedView === "missing-owner") {
        const isMissing = !ci.owner || ci.owner.trim() === "" || ci.owner.toLowerCase() === "unassigned";
        if (!isMissing) return false;
      }

      if (activeSavedView === "stale") {
        const isStale =
          ci.trustScore < 60 ||
          (ci.qualityFlags && ci.qualityFlags.some((f) => f.toLowerCase().includes("stale")));
        if (!isStale) return false;
      }

      if (activeSavedView === "my-cis") {
        const isMine =
          ci.owner.toLowerCase().includes("admin") ||
          ci.owner.toLowerCase().includes("platform") ||
          ci.owner.toLowerCase().includes("devops");
        if (!isMine) return false;
      }

      if (activeSavedView === "tier0") {
        const isTier0 =
          ci.environment === "Production" &&
          (ci.businessCriticality.includes("Tier 1") || ci.businessCriticality.includes("Tier 0"));
        if (!isTier0) return false;
      }

      // Search filter across ID, name, class, owner, IP, MAC, FQDN, serial
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchesName = ci.name.toLowerCase().includes(q);
        const matchesId = ci.id.toLowerCase().includes(q);
        const matchesOwner = ci.owner.toLowerCase().includes(q);
        const matchesIp =
          ci.attributes?.ipAddress?.includes(q) || ci.ip_address?.toLowerCase().includes(q);
        const matchesFqdn =
          ci.identificationKeys?.fqdn?.toLowerCase().includes(q) ||
          ci.fqdn?.toLowerCase().includes(q);
        const matchesMac =
          ci.identificationKeys?.macAddress?.toLowerCase().includes(q) ||
          ci.mac_address?.toLowerCase().includes(q);
        const matchesSerial =
          ci.serialNumber?.toLowerCase().includes(q) ||
          ci.identificationKeys?.serialNumber?.toLowerCase().includes(q);

        if (
          !matchesName &&
          !matchesId &&
          !matchesOwner &&
          !matchesIp &&
          !matchesFqdn &&
          !matchesMac &&
          !matchesSerial
        ) {
          return false;
        }
      }

      // CI Class
      if (filters.ciClass && ci.ciClass !== filters.ciClass) {
        return false;
      }

      // Environment
      if (filters.environment && ci.environment !== filters.environment) {
        return false;
      }

      // Operational Status
      if (filters.operationalStatus && ci.operationalStatus !== filters.operationalStatus) {
        return false;
      }

      // Criticality
      if (
        filters.criticality &&
        !ci.businessCriticality.toLowerCase().includes(filters.criticality.toLowerCase())
      ) {
        return false;
      }

      // Trust score min
      if (filters.trustScoreMin && ci.trustScore < Number(filters.trustScoreMin)) {
        return false;
      }

      return true;
    });
  }, [cis, filters, selectedEnvironment, activeSavedView]);

  // ---------------------------------------------------------------------------
  // EXPORT HANDLERS
  // ---------------------------------------------------------------------------
  const handleExportJSON = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        const dataStr =
          "data:text/json;charset=utf-8," +
          encodeURIComponent(JSON.stringify(filteredCIs, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute(
          "download",
          `zenops-cis-${activeTenant.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.json`
        );
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast("success", "Inventory Exported", `Exported ${filteredCIs.length} CIs as JSON.`);
      } catch {
        showToast("error", "Export Failed", "Could not trigger JSON export.");
      } finally {
        setIsExporting(false);
      }
    }, 400);
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        const headers = [
          "ID",
          "Name",
          "Class",
          "Environment",
          "Lifecycle Status",
          "Operational Status",
          "Criticality",
          "Owner",
          "Support Group",
          "Trust Score",
          "IP Address",
          "MAC Address",
          "Serial Number",
          "Last Discovered",
        ];

        const rows = filteredCIs.map((c) => [
          `"${c.id}"`,
          `"${c.name}"`,
          `"${c.ciClass}"`,
          `"${c.environment}"`,
          `"${c.lifecycleStatus}"`,
          `"${c.operationalStatus}"`,
          `"${c.businessCriticality}"`,
          `"${c.owner}"`,
          `"${c.supportGroup || ""}"`,
          c.trustScore,
          `"${c.ip_address || c.attributes?.ipAddress || ""}"`,
          `"${c.mac_address || c.identificationKeys?.macAddress || ""}"`,
          `"${c.serialNumber || c.identificationKeys?.serialNumber || ""}"`,
          `"${c.lastDiscovered}"`,
        ]);

        const csvContent =
          "\uFEFF" +
          [headers.join(","), ...rows.map((e) => e.join(","))].join("\r\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", url);
        downloadAnchor.setAttribute(
          "download",
          `zenops-cis-${activeTenant.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`
        );
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        URL.revokeObjectURL(url);
        showToast("success", "Excel CSV Exported", `Exported ${filteredCIs.length} CIs as Excel CSV.`);
      } catch {
        showToast("error", "Export Failed", "Could not trigger CSV export.");
      } finally {
        setIsExporting(false);
      }
    }, 400);
  };

  return (
    <div className="space-y-4 pb-12 animate-fade-in-up">
      {/* ----------------------------------------------------------------------- */}
      {/* HEADER & ACTIONS */}
      {/* ----------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-text-default tracking-tight">
              Configuration Items
            </h1>
            <Lozenge appearance="subtle" variant="info" size="sm">
              {filteredCIs.length} of {cis.length} CIs
            </Lozenge>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-muted bg-sunken px-2.5 py-0.5 rounded border border-border/60">
              <Lock className="w-3.5 h-3.5 text-text-muted" />
              {activeTenant}
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Enterprise infrastructure and application configuration registry with virtualized browsing
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <Can permission={PERMISSIONS.CI_EDIT}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={() => setBulkUploadOpen(true)}
              className="flex-1 sm:flex-initial justify-center"
            >
              Import CSV
            </Button>
          </Can>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<FileSpreadsheet className="w-4 h-4" />}
            onClick={handleExportCSV}
            isLoading={isExporting}
            className="flex-1 sm:flex-initial justify-center"
          >
            CSV
          </Button>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportJSON}
            isLoading={isExporting}
            className="flex-1 sm:flex-initial justify-center"
          >
            JSON
          </Button>

          <Can permission={PERMISSIONS.CI_EDIT}>
            <Link href="/cis/new" className="w-full sm:w-auto">
              <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />} className="w-full sm:w-auto justify-center">
                Create CI
              </Button>
            </Link>
          </Can>
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* SAVED FILTER TABS (Jira-style) */}
      {/* ----------------------------------------------------------------------- */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-px whitespace-nowrap scrollbar-none">
        {savedViews.map((view) => {
          const isActive = activeSavedView === view.id;
          return (
            <button
              key={view.id}
              onClick={() => handleApplySavedView(view.id)}
              className={cn(
                "px-3.5 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                isActive
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-text-muted hover:text-text-default hover:border-border hover:border-border-strong"
              )}
            >
              {view.label}
            </button>
          );
        })}
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* QUICK FILTER BAR & SEARCH */}
      {/* ----------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <input
            type="text"
            placeholder="Filter by ID, Name, IP, MAC, Owner..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-surface border border-border hover:border-border-strong rounded-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-default placeholder:text-text-muted shadow-2xs"
          />
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          {filters.search && (
            <button
              onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-default"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showAdvancedFilters ? "primary" : "outline"}
            size="sm"
            leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
          >
            {showAdvancedFilters ? "Hide Filters" : "More Filters"}
          </Button>

          {(filters.search ||
            filters.ciClass ||
            filters.environment ||
            filters.operationalStatus ||
            filters.criticality ||
            filters.trustScoreMin ||
            activeSavedView !== "all") && (
            <Button
              variant="subtle"
              size="xs"
              leftIcon={<RotateCcw className="w-3 h-3" />}
              onClick={() => {
                setFilters(initialFilters);
                setActiveSavedView("all");
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters Expandable Drawer/Section */}
      {showAdvancedFilters && (
        <CIFilters
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(initialFilters)}
          totalFiltered={filteredCIs.length}
          totalAll={cis.length}
        />
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* INVENTORY TABLE WITH COLUMN CHOOSER & BULK ACTIONS */}
      {/* ----------------------------------------------------------------------- */}
      <CIListTable items={filteredCIs} onRetireCI={(ci) => setRetireTarget(ci)} />

      {/* ----------------------------------------------------------------------- */}
      {/* MODALS */}
      {/* ----------------------------------------------------------------------- */}
      <CIRetireModal
        ci={retireTarget}
        isOpen={Boolean(retireTarget)}
        onClose={() => setRetireTarget(null)}
      />

      <CIBulkUploadModal
        isOpen={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onSuccess={() => setBulkUploadOpen(false)}
      />
    </div>
  );
}
