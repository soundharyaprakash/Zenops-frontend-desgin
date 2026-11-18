"use client";

import React, { useState, useEffect } from "react";
import { Activity, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Search, Filter } from "lucide-react";
import { Lozenge } from "@/components/ui/Lozenge";
import { AccessAuditService, AccessAuditEntry, AccessAlert } from "@/lib/rbac";

export default function AccessAuditPage() {
  const [logs, setLogs] = useState<AccessAuditEntry[]>([]);
  const [alerts, setAlerts] = useState<AccessAlert[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAllowed, setFilterAllowed] = useState<"all" | "allowed" | "denied">("all");

  useEffect(() => {
    setLogs(AccessAuditService.getLog());
    setAlerts(AccessAuditService.getAlerts());
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.actorEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.permission.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.resourceName && log.resourceName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter =
      filterAllowed === "all" ||
      (filterAllowed === "allowed" && log.allowed) ||
      (filterAllowed === "denied" && !log.allowed);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-default">Access Audit & Security Alerts</h2>
        <p className="text-xs text-secondary">
          Append-only event stream capturing every permission decision, policy evaluation, and anomaly alert across the tenant.
        </p>
      </div>

      {/* Security Alerts Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
            Active Security Alerts ({alerts.filter((a) => a.status === "active").length})
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-4 bg-surface border border-border rounded-xl space-y-2 shadow-xs text-left"
            >
              <div className="flex items-center justify-between">
                <Lozenge
                  variant={
                    alert.severity === "critical"
                      ? "danger"
                      : alert.severity === "high"
                      ? "warning"
                      : "info"
                  }
                  size="xs"
                >
                  {alert.severity.toUpperCase()}
                </Lozenge>
                <span className="text-[10px] text-muted font-mono">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <h4 className="text-xs font-bold text-default">{alert.title}</h4>
              <p className="text-[11px] text-secondary line-clamp-2 leading-relaxed">
                {alert.description}
              </p>
              <p className="text-[10px] text-muted font-mono">Actor: {alert.actor}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Log Table Header & Filters */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
            Live Policy Decisions Stream ({filteredLogs.length})
          </h3>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search audit trail..."
                className="bg-surface border border-border rounded-md pl-8 pr-3 py-1 text-xs text-default placeholder:text-muted focus:outline-none"
              />
            </div>

            <select
              value={filterAllowed}
              onChange={(e) => setFilterAllowed(e.target.value as any)}
              className="bg-surface border border-border rounded-md px-2 py-1 text-xs text-default focus:outline-none"
            >
              <option value="all">All Outcomes</option>
              <option value="allowed">Allowed Only</option>
              <option value="denied">Denied Only</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-sunken border-b border-border text-[11px] uppercase tracking-wider text-muted font-bold sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">Actor & Role</th>
                  <th className="px-4 py-3">Permission</th>
                  <th className="px-4 py-3">Target Resource</th>
                  <th className="px-4 py-3">Policy Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-sunken/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-muted whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Lozenge variant={log.allowed ? "success" : "danger"} size="xs">
                          {log.allowed ? "Allowed" : "Denied"}
                        </Lozenge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="font-semibold text-default text-[11px]">{log.actorName}</p>
                          <p className="text-[10px] text-muted font-mono">{log.actorRole}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-primary text-[11px] whitespace-nowrap">
                        {log.permission}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-secondary max-w-[150px] truncate">
                        {log.resourceName || log.resourceId || "Platform Global"}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-secondary max-w-md truncate">
                        {log.reason}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-xs text-muted">
                      No matching audit records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
