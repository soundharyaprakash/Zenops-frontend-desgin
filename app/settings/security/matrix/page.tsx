"use client";

import React, { useState } from "react";
import { Grid, Check, X, Shield, Info } from "lucide-react";
import { Lozenge } from "@/components/ui/Lozenge";
import {
  ALL_PERMISSIONS,
  PERMISSION_CATALOG,
  SYSTEM_ROLES,
  getAllRoles,
} from "@/lib/rbac";
import { cn } from "@/lib/utils";

export default function PermissionMatrixPage() {
  const [highlightRole, setHighlightRole] = useState<string | null>(null);
  const roles = Object.values(SYSTEM_ROLES);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-default">Global Role × Permission Matrix</h2>
        <p className="text-xs text-secondary">
          Complete cross-reference of system roles and their assigned permission grants, generated dynamically from the central security policy engine.
        </p>
      </div>

      {/* Matrix Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[750px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-sunken border-b border-border sticky top-0 z-20">
              <tr>
                <th className="px-4 py-3 min-w-[220px] font-bold text-[11px] uppercase tracking-wider text-muted bg-sunken sticky left-0 z-30 shadow-xs border-r border-border">
                  Permission / Role
                </th>
                {roles.map((role) => (
                  <th
                    key={role.key}
                    onMouseEnter={() => setHighlightRole(role.key)}
                    onMouseLeave={() => setHighlightRole(null)}
                    className={cn(
                      "px-3 py-3 min-w-[130px] font-bold text-[11px] text-center border-r border-border transition-colors",
                      highlightRole === role.key ? "bg-selected text-primary" : "text-default"
                    )}
                  >
                    <div className="truncate max-w-[120px] mx-auto" title={role.name}>
                      {role.name}
                    </div>
                    <span className="text-[10px] text-muted block font-normal capitalize">
                      {role.scopeRule.type.replace(/_/g, " ")}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ALL_PERMISSIONS.map((permKey) => {
                const def = PERMISSION_CATALOG[permKey];
                return (
                  <tr key={permKey} className="hover:bg-sunken/40 transition-colors group">
                    {/* Left Sticky Header */}
                    <td className="px-4 py-2.5 font-mono text-[11px] font-semibold text-default bg-surface sticky left-0 z-10 border-r border-border shadow-xs group-hover:bg-sunken">
                      <div>
                        <span className="text-primary font-bold">{permKey}</span>
                        <p className="text-[10px] text-muted font-sans font-normal truncate max-w-[200px]">
                          {def?.label}
                        </p>
                      </div>
                    </td>

                    {/* Role Permission Cells */}
                    {roles.map((role) => {
                      const isGranted = role.permissions.includes(permKey);
                      return (
                        <td
                          key={role.key}
                          className={cn(
                            "px-3 py-2.5 text-center border-r border-border transition-colors",
                            highlightRole === role.key ? "bg-selected/30" : ""
                          )}
                        >
                          {isGranted ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold mx-auto">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-neutral-300 dark:text-neutral-700 mx-auto">
                              &mdash;
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 bg-surface border border-border rounded-xl text-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Check className="w-3 h-3" />
            </span>
            <span className="text-secondary">Explicitly Granted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400 font-bold">&mdash;</span>
            <span className="text-secondary">Strictly Denied (Least Privilege)</span>
          </div>
        </div>
        <p className="text-[11px] text-muted">
          Separation of Duties (SoD) policies override explicit grants (e.g. CMDB Administrator is denied task.approve).
        </p>
      </div>
    </div>
  );
}
