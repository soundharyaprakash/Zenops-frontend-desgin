"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  History,
  Search,
  Download,
  Lock,
  ExternalLink,
  ShieldCheck,
  Filter,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lozenge } from "@/components/ui/Lozenge";
import { Button } from "@/components/ui/Button";
import { useCMDB } from "@/context/cmdb-context";
import { formatDateTime } from "@/utils";

export function AuditHistoryView() {
  const { auditHistory, showToast, activeTenant } = useCMDB();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const filteredAudits = auditHistory.filter((item) => {
    if (typeFilter !== "All" && item.changeType !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchCi = item.ciName?.toLowerCase().includes(q) || item.ciId?.toLowerCase().includes(q);
      const matchField = item.fieldChanged?.toLowerCase().includes(q);
      const matchActor = item.changedBy?.toLowerCase().includes(q);
      const matchCr = item.changeRecord?.toLowerCase().includes(q);
      if (!matchCi && !matchField && !matchActor && !matchCr) return false;
    }
    return true;
  });

  const handleExport = () => {
    try {
      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(filteredAudits, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute(
        "download",
        `zenops-audit-history-${activeTenant.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast("success", "Audit Trail Exported", `Downloaded ${filteredAudits.length} audit records.`);
    } catch {
      showToast("error", "Export Failed", "Could not trigger file download.");
    }
  };

  return (
    <div className="space-y-6 pb-12 text-text-default">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-default">
              Immutable Audit History
            </h1>
            <Lozenge appearance="subtle" variant="neutral">
              {filteredAudits.length} Events
            </Lozenge>
            <span className="inline-flex items-center gap-1 text-xs text-text-muted bg-sunken px-2 py-0.5 rounded border border-border/60">
              <Lock className="w-3 h-3 text-text-muted" />
              {activeTenant}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Tamper-evident chronological log of all configuration mutations, actors, and Change Record references
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleExport}
          leftIcon={<Download className="w-3.5 h-3.5" />}
        >
          Export JSON
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface p-3.5 rounded-lg border border-border shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-1 items-center gap-2.5">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by CI ID, Name, Field, Actor or CR..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary text-text-default placeholder:text-text-muted"
            />
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="w-44">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-surface border border-border rounded px-2.5 py-1.5 text-xs text-text-default focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="All">All Change Types</option>
              <option value="Update">Update</option>
              <option value="Create">Create</option>
              <option value="Retire">Retire</option>
              <option value="Reconcile">Reconcile</option>
              <option value="Attestation">Attestation</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Records Table */}
      <Card className="bg-surface border-border overflow-hidden shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-sunken border-b border-border text-xs uppercase tracking-wider text-text-secondary select-none">
                <tr>
                  <th className="py-3 px-3.5">Event ID</th>
                  <th className="py-3 px-3.5">Configuration Item</th>
                  <th className="py-3 px-3.5">Mutation Type</th>
                  <th className="py-3 px-3.5">Field & Diff</th>
                  <th className="py-3 px-3.5">Actor</th>
                  <th className="py-3 px-3.5">Change Record</th>
                  <th className="py-3 px-3.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredAudits.map((event) => (
                  <tr key={event.id} className="hover:bg-sunken/40 transition-colors">
                    <td className="py-3 px-3.5 font-mono text-xs text-text-muted">{event.id}</td>
                    <td className="py-3 px-3.5">
                      <Link
                        href={`/cis/${event.ciId}`}
                        className="font-semibold text-text-default hover:text-primary transition-colors flex items-center gap-1.5 text-sm"
                      >
                        {event.ciName} <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
                      </Link>
                      <span className="font-mono text-xs text-text-muted">{event.ciId}</span>
                    </td>
                    <td className="py-3 px-3.5">
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
                        size="sm"
                      >
                        {event.changeType}
                      </Lozenge>
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="font-mono font-medium text-text-default block text-sm">
                        {event.fieldChanged}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-mono mt-0.5">
                        <span className="text-danger line-through truncate max-w-[140px]">
                          {event.beforeValue}
                        </span>
                        <span className="text-text-muted">&rarr;</span>
                        <span className="text-success font-semibold truncate max-w-[140px]">
                          {event.afterValue}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-text-secondary text-sm">{event.changedBy}</td>
                    <td className="py-3 px-3.5">
                      {event.changeRecord ? (
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                          {event.changeRecord}
                        </span>
                      ) : (
                        <span className="text-text-muted text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-xs text-text-muted">
                      {formatDateTime(event.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
