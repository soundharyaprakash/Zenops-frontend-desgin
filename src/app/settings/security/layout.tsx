"use client";

import React, { useState, useEffect } from "react";
import { Shield, Sparkles, SlidersHorizontal, Lock, Check } from "lucide-react";
import { SecurityNav } from "@/components/rbac/SecurityNav";
import { usePermission } from "@/components/rbac/usePermission";
import { AccessDenied } from "@/components/rbac/AccessDenied";
import { PERMISSIONS, RbacConfig, RbacMode } from "@/lib/rbac";
import { Lozenge } from "@/components/ui/Lozenge";

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  const { allowed, reason } = usePermission(PERMISSIONS.ROLES_MANAGE);
  const [mode, setMode] = useState<RbacMode>("enforce");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setMode(RbacConfig.getMode());
  }, []);

  const handleToggleMode = () => {
    const nextMode: RbacMode = mode === "enforce" ? "audit-only" : "enforce";
    RbacConfig.setMode(nextMode);
    setMode(nextMode);
  };

  // Guard entire Security & RBAC section with roles.manage
  if (!allowed) {
    return (
      <AccessDenied
        requiredPermission={PERMISSIONS.ROLES_MANAGE}
        title="Security Administration Restricted"
        reason={reason || "Managing system roles, directory group mappings, and access rules requires the 'roles.manage' permission."}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-app">
      {/* Top Header */}
      <div className="border-b border-border bg-surface px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-default">
                Security & Role-Based Access Control (RBAC)
              </h1>
              <Lozenge variant="info" size="xs">
                Zero Trust
              </Lozenge>
            </div>
            <p className="text-xs text-secondary max-w-2xl">
              Centralized policy engine governing least privilege, separation of duties (SoD), directory group synchronization, and temporary just-in-time elevations.
            </p>
          </div>

          {/* Section 12: Audit-Only Rollout Mode Toggle */}
          {mounted && (
            <div className="flex items-center gap-3 bg-sunken p-2 rounded-lg border border-border">
              <div className="text-right">
                <p className="text-[11px] font-semibold text-default flex items-center gap-1 justify-end">
                  <span>Policy Mode:</span>
                  <span
                    className={
                      mode === "enforce"
                        ? "text-emerald-600 dark:text-emerald-400 font-bold"
                        : "text-amber-600 dark:text-amber-400 font-bold"
                    }
                  >
                    {mode === "enforce" ? "Enforce (Blocking)" : "Audit-Only (Permissive)"}
                  </span>
                </p>
                <p className="text-[10px] text-muted">
                  {mode === "enforce"
                    ? "Strictly blocks unauthorized actions."
                    : "Logs would-be denials to audit trail without blocking."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleMode}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  mode === "enforce" ? "bg-emerald-600" : "bg-amber-500"
                }`}
                role="switch"
                aria-checked={mode === "enforce"}
                title="Toggle between Enforce and Audit-Only rollout mode"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    mode === "enforce" ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Navigation */}
      <SecurityNav />

      {/* Main Page Content */}
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</div>
    </div>
  );
}
