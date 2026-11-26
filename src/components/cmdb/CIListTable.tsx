"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Server,
  Database,
  Layers,
  Radio,
  Cloud,
  Download,
  CheckCircle,
  SlidersHorizontal,
  X,
  AlertTriangle,
  UserCheck,
  FileCheck,
  FileSpreadsheet,
  Check,
} from "lucide-react";
import { CIItem } from "@/types/cmdb";
import { Lozenge, OperationalBadge, CriticalityBadge, TrustScoreBadge } from "@/components/ui/Lozenge";
import { Button } from "@/components/ui/Button";
import { formatDate, formatDateTime } from "@/utils";
import { useCMDB } from "@/context/cmdb-context";
import { cn } from "@/lib/utils";

interface CIListTableProps {
  items: CIItem[];
  onRetireCI: (ci: CIItem) => void;
}

type SortField =
  | "id"
  | "name"
  | "ciClass"
  | "lifecycleStatus"
  | "operationalStatus"
  | "environment"
  | "businessCriticality"
  | "owner"
  | "supportGroup"
  | "trustScore"
  | "lastDiscovered";

export function CIListTable({ items, onRetireCI }: CIListTableProps) {
  const { userRole, showToast, updateCI, activeTenant } = useCMDB();

  const [sortField, setSortField] = useState<SortField>("trustScore");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [columnChooserOpen, setColumnChooserOpen] = useState(false);
  const [assignOwnerModalOpen, setAssignOwnerModalOpen] = useState(false);
  const [newOwnerValue, setNewOwnerValue] = useState("Platform Reliability Engineering");

  // Column visibility state (all 11 columns)
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    name: true,
    ciClass: true,
    environment: true,
    lifecycleStatus: true,
    operationalStatus: true,
    businessCriticality: true,
    owner: true,
    supportGroup: true,
    trustScore: true,
    lastDiscovered: true,
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [items, sortField, sortAsc]);

  const totalPages = Math.ceil(sortedItems.length / pageSize) || 1;
  const safePage = Math.max(1, Math.min(totalPages, currentPage));
  const paginatedItems = sortedItems.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.length === paginatedItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedItems.map((c) => c.id));
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Bulk actions
  const handleBulkExportJSON = () => {
    const selectedCIs = items.filter((c) => selectedIds.includes(c.id));
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(selectedCIs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `zenops-bulk-cis-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("success", "Bulk Export Complete", `Exported ${selectedCIs.length} selected CIs as JSON.`);
  };

  const handleBulkExportCSV = () => {
    const selectedCIs = items.filter((c) => selectedIds.includes(c.id));
    const headers = ["ID", "Name", "Class", "Environment", "Status", "Criticality", "Owner", "Support Group", "Trust Score"];
    const rows = selectedCIs.map((c) => [
      `"${c.id}"`,
      `"${c.name}"`,
      `"${c.ciClass}"`,
      `"${c.environment}"`,
      `"${c.operationalStatus}"`,
      `"${c.businessCriticality}"`,
      `"${c.owner}"`,
      `"${c.supportGroup || ""}"`,
      c.trustScore,
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `zenops-bulk-cis-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
    showToast("success", "Bulk CSV Exported", `Exported ${selectedCIs.length} selected CIs as Excel CSV.`);
  };

  const handleBulkAssignOwner = () => {
    selectedIds.forEach((id) => {
      updateCI(id, { owner: newOwnerValue }, "Bulk Action Runner");
    });
    showToast(
      "success",
      "Bulk Ownership Assigned",
      `Assigned ${selectedIds.length} CIs to ${newOwnerValue}.`
    );
    setAssignOwnerModalOpen(false);
    setSelectedIds([]);
  };

  const handleBulkSendToReview = () => {
    showToast(
      "info",
      "Sent to Governance Review",
      `Flagged ${selectedIds.length} CIs for Attestation & Quality review.`
    );
    setSelectedIds([]);
  };

  const handleBulkRetire = () => {
    const selectedCIs = items.filter((c) => selectedIds.includes(c.id));
    const prodCI = selectedCIs.find((c) => c.environment === "Production");
    if (prodCI) {
      onRetireCI(prodCI);
    } else if (selectedCIs.length > 0) {
      onRetireCI(selectedCIs[0]);
    }
  };

  const getClassIcon = (ciClass: string) => {
    switch (ciClass) {
      case "Server/VM":
        return <Server className="w-3.5 h-3.5 text-primary" />;
      case "Database":
        return <Database className="w-3.5 h-3.5 text-success" />;
      case "Container/Pod":
        return <Layers className="w-3.5 h-3.5 text-brand-cyan" />;
      case "Network Device":
        return <Radio className="w-3.5 h-3.5 text-warning" />;
      case "Cloud Resource":
        return <Cloud className="w-3.5 h-3.5 text-brand-blue" />;
      default:
        return <Server className="w-3.5 h-3.5 text-text-muted" />;
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-text-muted ml-1 inline-block" />;
    }
    return sortAsc ? (
      <ArrowUp className="w-3 h-3 text-primary ml-1 inline-block" />
    ) : (
      <ArrowDown className="w-3 h-3 text-primary ml-1 inline-block" />
    );
  };

  return (
    <div className="space-y-2.5">
      {/* ----------------------------------------------------------------------- */}
      {/* ACTION BAR: BULK ACTIONS & COLUMN CHOOSER */}
      {/* ----------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1">
        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.length > 0 ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-selected-bg dark:bg-primary/20 border border-primary/30 dark:border-primary/40 rounded text-xs text-primary animate-in fade-in slide-in-from-top-1 duration-200 shadow-xs">
              <span className="font-semibold">{selectedIds.length} CIs selected</span>

              <div className="h-4 w-px bg-primary/20 mx-1" />

              <button
                onClick={() => setAssignOwnerModalOpen(true)}
                className="hover:underline flex items-center gap-1 font-medium text-text-default hover:text-primary transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5 text-primary" /> Assign Owner
              </button>

              <button
                onClick={handleBulkSendToReview}
                className="hover:underline flex items-center gap-1 font-medium text-text-default hover:text-primary transition-colors ml-2"
              >
                <FileCheck className="w-3.5 h-3.5 text-brand-blue" /> Send to Review
              </button>

              <button
                onClick={handleBulkRetire}
                className="hover:underline flex items-center gap-1 font-medium text-danger hover:text-danger/80 transition-colors ml-2"
              >
                <Trash2 className="w-3.5 h-3.5" /> Retire
              </button>

              <button
                onClick={handleBulkExportCSV}
                className="hover:underline flex items-center gap-1 font-medium text-text-secondary hover:text-primary ml-2"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
              </button>

              <button
                onClick={handleBulkExportJSON}
                className="hover:underline flex items-center gap-1 font-medium text-text-secondary hover:text-primary ml-1"
              >
                <Download className="w-3.5 h-3.5" /> JSON
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="text-text-muted hover:text-text-default ml-2 p-0.5"
                title="Deselect all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span className="text-sm text-text-secondary font-medium">
              Showing {paginatedItems.length} of {items.length} records
            </span>
          )}
        </div>

        {/* Column Chooser Popover */}
        <div className="relative self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setColumnChooserOpen(!columnChooserOpen)}
            leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
          >
            Columns
          </Button>

          {columnChooserOpen && (
            <div className="absolute right-0 mt-1.5 w-56 bg-surface rounded-lg border border-border shadow-dropdown z-30 p-2.5 text-sm space-y-1 animate-in fade-in duration-100">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider px-1 pb-1 border-b border-border">
                Toggle Columns (11 Total)
              </p>
              <div className="max-h-60 overflow-y-auto space-y-0.5 pt-1">
                {Object.keys(visibleColumns).map((key) => {
                  const colKey = key as keyof typeof visibleColumns;
                  return (
                    <label
                      key={colKey}
                      className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-sunken cursor-pointer select-none text-text-default text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns[colKey]}
                        onChange={() =>
                          setVisibleColumns((prev) => ({
                            ...prev,
                            [colKey]: !prev[colKey],
                          }))
                        }
                        className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                      />
                      <span className="capitalize">{colKey.replace(/([A-Z])/g, " $1")}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* MAIN TABLE */}
      {/* ----------------------------------------------------------------------- */}
      <div className="bg-surface rounded-lg border border-border shadow-card dark:shadow-none overflow-hidden">
        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-left border-collapse text-sm min-w-[880px]">
            <thead className="bg-sunken dark:bg-elevated/70 border-b border-border select-none sticky top-0 z-10">
              <tr className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                <th className="py-2.5 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={paginatedItems.length > 0 && selectedIds.length === paginatedItems.length}
                    onChange={handleSelectAll}
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                    aria-label="Select all current rows"
                  />
                </th>

                {visibleColumns.id && (
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-text-default transition-colors whitespace-nowrap"
                    onClick={() => handleSort("id")}
                  >
                    CI ID {renderSortIcon("id")}
                  </th>
                )}

                {visibleColumns.name && (
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-text-default transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    CI Name & Anomalies {renderSortIcon("name")}
                  </th>
                )}

                {visibleColumns.ciClass && (
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-text-default transition-colors whitespace-nowrap"
                    onClick={() => handleSort("ciClass")}
                  >
                    Class {renderSortIcon("ciClass")}
                  </th>
                )}

                {visibleColumns.environment && (
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-text-default transition-colors whitespace-nowrap"
                    onClick={() => handleSort("environment")}
                  >
                    Env {renderSortIcon("environment")}
                  </th>
                )}

                {visibleColumns.lifecycleStatus && (
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-text-default transition-colors whitespace-nowrap"
                    onClick={() => handleSort("lifecycleStatus")}
                  >
                    Lifecycle {renderSortIcon("lifecycleStatus")}
                  </th>
                )}

                {visibleColumns.operationalStatus && (
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-text-default transition-colors whitespace-nowrap"
                    onClick={() => handleSort("operationalStatus")}
                  >
                    Status {renderSortIcon("operationalStatus")}
                  </th>
                )}

                {visibleColumns.businessCriticality && (
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-text-default transition-colors whitespace-nowrap"
                    onClick={() => handleSort("businessCriticality")}
                  >
                    Criticality {renderSortIcon("businessCriticality")}
                  </th>
                )}

                {visibleColumns.owner && (
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-text-default transition-colors whitespace-nowrap"
                    onClick={() => handleSort("owner")}
                  >
                    Owner {renderSortIcon("owner")}
                  </th>
                )}

                {visibleColumns.supportGroup && (
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-text-default transition-colors whitespace-nowrap"
                    onClick={() => handleSort("supportGroup")}
                  >
                    Support Group {renderSortIcon("supportGroup")}
                  </th>
                )}

                {visibleColumns.trustScore && (
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-text-default transition-colors text-right whitespace-nowrap"
                    onClick={() => handleSort("trustScore")}
                  >
                    Trust Score {renderSortIcon("trustScore")}
                  </th>
                )}

                {visibleColumns.lastDiscovered && (
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-text-default transition-colors whitespace-nowrap"
                    onClick={() => handleSort("lastDiscovered")}
                  >
                    Discovered {renderSortIcon("lastDiscovered")}
                  </th>
                )}

                <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border/60 dark:divide-white/[0.05]">
              {paginatedItems.length > 0 ? (
                paginatedItems.map((ci) => {
                  const isSelected = selectedIds.includes(ci.id);
                  return (
                    <tr
                      key={ci.id}
                      className={cn(
                        "hover:bg-sunken/60 dark:hover:bg-white/[0.03] transition-colors group",
                        isSelected && "bg-selected-bg/40 dark:bg-primary/10"
                      )}
                    >
                      <td className="py-2 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(ci.id)}
                          className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                        />
                      </td>

                      {/* 1. CI ID */}
                      {visibleColumns.id && (
                        <td className="py-2.5 px-3.5 font-mono text-xs text-text-muted whitespace-nowrap">
                          <Link href={`/cis/${ci.id}`} className="hover:text-primary hover:underline">
                            {ci.id}
                          </Link>
                        </td>
                      )}

                      {/* 2. Name + Flags */}
                      {visibleColumns.name && (
                        <td className="py-2.5 px-3.5">
                          <div className="flex flex-col">
                            <Link
                              href={`/cis/${ci.id}`}
                              className="font-semibold text-text-default hover:text-primary transition-colors truncate max-w-xs text-sm"
                            >
                              {ci.name}
                            </Link>
                            {/* Quality Flags Chips */}
                            {ci.qualityFlags && ci.qualityFlags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {ci.qualityFlags.map((flag, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded bg-warning/15 text-warning border border-warning/30 font-medium leading-none"
                                  >
                                    {flag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      )}

                      {/* 3. Class */}
                      {visibleColumns.ciClass && (
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-text-secondary text-sm">
                            {getClassIcon(ci.ciClass)}
                            <span>{ci.ciClass}</span>
                          </div>
                        </td>
                      )}

                      {/* 4. Environment */}
                      {visibleColumns.environment && (
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <Lozenge appearance="subtle" variant="neutral" size="sm">
                            {ci.environment}
                          </Lozenge>
                        </td>
                      )}

                      {/* 5. Lifecycle */}
                      {visibleColumns.lifecycleStatus && (
                        <td className="py-2.5 px-3.5 whitespace-nowrap text-text-secondary text-sm">
                          {ci.lifecycleStatus}
                        </td>
                      )}

                      {/* 6. Operational Status */}
                      {visibleColumns.operationalStatus && (
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <OperationalBadge status={ci.operationalStatus} size="sm" />
                        </td>
                      )}

                      {/* 7. Criticality */}
                      {visibleColumns.businessCriticality && (
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <CriticalityBadge tier={ci.businessCriticality} size="sm" />
                        </td>
                      )}

                      {/* 8. Owner */}
                      {visibleColumns.owner && (
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-sunken border border-border flex items-center justify-center text-xs font-bold text-text-muted flex-shrink-0">
                              {ci.owner.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-text-secondary text-sm truncate max-w-[130px]">
                              {ci.owner}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* 9. Support Group */}
                      {visibleColumns.supportGroup && (
                        <td className="py-2.5 px-3.5 whitespace-nowrap text-text-muted text-sm truncate max-w-[140px]">
                          {ci.supportGroup || "—"}
                        </td>
                      )}

                      {/* 10. Trust Score */}
                      {visibleColumns.trustScore && (
                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                          <TrustScoreBadge score={ci.trustScore} showLabel={false} size="sm" />
                        </td>
                      )}

                      {/* 11. Last Discovered */}
                      {visibleColumns.lastDiscovered && (
                        <td className="py-2.5 px-3.5 whitespace-nowrap font-mono text-xs text-text-muted">
                          {formatDate(ci.lastDiscovered)}
                        </td>
                      )}

                      {/* Row Hover Quick Actions */}
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <Link href={`/cis/${ci.id}`}>
                            <button
                              className="p-1 rounded text-text-muted hover:text-text-default hover:bg-sunken hover:scale-110 active:scale-95 transition-all duration-150"
                              title="View CI 360"
                              aria-label="View CI 360"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </Link>

                          {userRole !== "Viewer" && (
                            <>
                              <Link href={`/cis/${ci.id}/edit`}>
                                <button
                                  className="p-1 rounded text-text-muted hover:text-primary hover:bg-sunken hover:scale-110 active:scale-95 transition-all duration-150"
                                  title="Edit CI Attributes"
                                  aria-label="Edit CI"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </Link>

                              <button
                                onClick={() => onRetireCI(ci)}
                                className="p-1 rounded text-text-muted hover:text-danger hover:bg-sunken hover:scale-110 active:scale-95 transition-all duration-150"
                                title="Retire CI with Impact Blast Radius Check"
                                aria-label="Retire CI"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-text-secondary">
                    <p className="text-xs font-semibold">No Configuration Items match current filters.</p>
                    <p className="text-[11px] text-text-muted mt-1">
                      Try relaxing search terms or changing selected class/environment.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-border bg-sunken/40 dark:bg-elevated/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-text-secondary">
          <div className="flex items-center gap-2.5">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-surface border border-border text-text-default rounded px-2.5 py-1 text-sm focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value={15}>15 rows</option>
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
            </select>
            <span className="text-text-muted">
              Page {safePage} of {totalPages}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* BULK ASSIGN OWNER MODAL */}
      {/* ----------------------------------------------------------------------- */}
      {assignOwnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-border rounded-lg shadow-dropdown max-w-md w-full p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-text-default">
                Assign Owner to {selectedIds.length} CIs
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                Select an engineering team or individual technical owner for the selected configuration items.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-default">Select Owner</label>
              <select
                value={newOwnerValue}
                onChange={(e) => setNewOwnerValue(e.target.value)}
                className="w-full bg-surface border border-border rounded px-3 py-1.5 text-xs text-text-default focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Platform Reliability Engineering">Platform Reliability Engineering</option>
                <option value="Core Infrastructure & Cloud Ops">Core Infrastructure & Cloud Ops</option>
                <option value="Database Administration (DBA)">Database Administration (DBA)</option>
                <option value="Network & Security Operations">Network & Security Operations</option>
                <option value="Enterprise Architecture Team">Enterprise Architecture Team</option>
                <option value="DevOps & CI/CD Guild">DevOps & CI/CD Guild</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button size="xs" variant="outline" onClick={() => setAssignOwnerModalOpen(false)}>
                Cancel
              </Button>
              <Button size="xs" variant="primary" onClick={handleBulkAssignOwner}>
                Save Assignment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
