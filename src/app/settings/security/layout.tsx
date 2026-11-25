"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, Sparkles, SlidersHorizontal, Lock, Check, AlertTriangle, Clock, UserCheck, X, ShieldAlert } from "lucide-react";
import { SecurityNav } from "@/components/rbac/SecurityNav";
import { usePermission } from "@/components/rbac/usePermission";
import { AccessDenied } from "@/components/rbac/AccessDenied";
import { PERMISSIONS, RbacConfig, RbacMode, RbacModeDetails, AccessAuditService, AccessAlert } from "@/lib/rbac";
import { Lozenge } from "@/components/ui/Lozenge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  const permDefine = usePermission(PERMISSIONS.ROLES_DEFINE);
  const permAssign = usePermission(PERMISSIONS.ROLES_ASSIGN);
  const permPolicy = usePermission(PERMISSIONS.SECURITY_POLICY_EDIT);
  const permSod = usePermission(PERMISSIONS.SECURITY_SOD_EDIT);

  const allowed =
    permDefine.allowed || permAssign.allowed || permPolicy.allowed || permSod.allowed;
  const canEditPolicy = permPolicy.allowed;

  const [mode, setMode] = useState<RbacMode>("enforce");
  const [modeDetails, setModeDetails] = useState<RbacModeDetails>({ mode: "enforce" });
  const [mounted, setMounted] = useState(false);
  const [adminAlerts, setAdminAlerts] = useState<AccessAlert[]>([]);

  // Mode change modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetMode, setTargetMode] = useState<RbacMode>("audit-only");
  const [changeReason, setChangeReason] = useState("");
  const [secondApprover, setSecondApprover] = useState("David Chen (CMDB Manager)");
  const [durationHours, setDurationHours] = useState(4);
  const [showZeroTrustModal, setShowZeroTrustModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    refreshMode();
    refreshAlerts();
  }, []);

  const refreshMode = () => {
    const current = RbacConfig.getMode();
    const details = RbacConfig.getDetails();
    setMode(current);
    setModeDetails(details);
  };

  const refreshAlerts = () => {
    const alerts = AccessAuditService.getAlerts().filter(
      (a) => a.status === "active" && (a.type === "role_modified" || a.type === "break_glass_used")
    );
    setAdminAlerts(alerts);
  };

  const handleDismissAlert = (alertId: string) => {
    const allAlerts = AccessAuditService.getAlerts().map((a) =>
      a.id === alertId ? { ...a, status: "resolved" as const } : a
    );
    AccessAuditService.saveAlerts(allAlerts);
    refreshAlerts();
  };

  const handleOpenSwitchModal = (newMode: RbacMode) => {
    if (newMode === mode) return;
    setTargetMode(newMode);
    setChangeReason(
      newMode === "audit-only"
        ? "Temporary diagnostic window to assess newly configured reconciliation rules without production blocking."
        : "Re-activating strict blocking enforcement following diagnostic verification."
    );
    setIsModalOpen(true);
  };

  const handleConfirmModeChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeReason.trim()) return;

    RbacConfig.setMode(targetMode, {
      reason: changeReason.trim(),
      secondApprover,
      durationHours: targetMode === "audit-only" ? durationHours : undefined,
      actor: {
        id: "USR-CURRENT",
        name: "Current Administrator",
        email: "admin@zenops.local",
        role: "CMDB Administrator",
        tenantId: "CMP_1001_ZENDEV",
      },
    });

    refreshMode();
    setIsModalOpen(false);
  };

  const handleQuickRevert = () => {
    RbacConfig.setMode("enforce", {
      reason: "Emergency one-click revert to strict enforcement mode.",
      secondApprover: "System Policy Guard",
      actor: {
        id: "USR-CURRENT",
        name: "Current Administrator",
        email: "admin@zenops.local",
        role: "CMDB Administrator",
        tenantId: "CMP_1001_ZENDEV",
      },
    });
    refreshMode();
  };

  // Guard entire Security & RBAC section
  if (!allowed) {
    return (
      <AccessDenied
        requiredPermission={PERMISSIONS.ROLES_DEFINE}
        title="Security Administration Restricted"
        reason="Access to Security & RBAC configuration requires administrative privileges (roles.define, roles.assign, security.policy.edit, or security.sod.edit)."
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-app">
      {/* Administrator Role Change & Critical Security Alert Banner */}
      {mounted && adminAlerts.length > 0 && (
        <div className="bg-red-500/15 border-b border-red-500/30 px-6 py-2.5 text-xs text-red-900 dark:text-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            <div>
              <span className="font-bold">CRITICAL SECURITY ALERT: {adminAlerts[0].title}</span>{" "}
              <span className="text-secondary">
                {adminAlerts[0].description}{" "}
                <Link
                  href={`/settings/security/access-audit?search=${encodeURIComponent(adminAlerts[0].actor || adminAlerts[0].title)}`}
                  className="inline-flex items-center gap-1 font-semibold text-red-700 dark:text-red-300 underline hover:opacity-80 ml-1"
                >
                  Investigate in Access Audit &rarr;
                </Link>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {adminAlerts.length > 1 && (
              <span className="text-[10px] bg-red-500/20 px-2 py-0.5 rounded font-bold">
                +{adminAlerts.length - 1} more
              </span>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleDismissAlert(adminAlerts[0].id)}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-900 dark:text-red-100 border-red-500/40 text-xs py-1 h-7"
            >
              Acknowledge
            </Button>
          </div>
        </div>
      )}

      {/* Audit-Only Visible Warning Banner */}
      {mounted && mode === "audit-only" && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2.5 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">WARNING: RBAC is running in Audit-only (Permissive) mode.</span>{" "}
              <span className="text-secondary">
                Unauthorized actions are logged to the compliance trail but NOT blocked.{" "}
                {modeDetails.expiresAt && (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                    <Clock className="w-3 h-3" />
                    Expires: {new Date(modeDetails.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Dual-approved by {modeDetails.secondApprover || "CMDB Manager"})
                  </span>
                )}
              </span>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleQuickRevert}
            className="shrink-0 bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-100 border-amber-500/40 text-xs py-1 h-7"
          >
            Revert to Enforcing (Blocking)
          </Button>
        </div>
      )}

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
              <button
                type="button"
                onClick={() => setShowZeroTrustModal(true)}
                className="hover:opacity-80 transition-opacity focus:outline-none"
                title="Click to view Zero Trust control posture"
              >
                <Lozenge variant="info" size="xs">
                  Zero Trust Architecture
                </Lozenge>
              </button>
            </div>
            <p className="text-xs text-secondary max-w-2xl">
              Centralized policy engine governing least privilege, separation of duties (SoD), directory group synchronization, and temporary just-in-time elevations.
            </p>
          </div>

          {/* Section 2: Explicit Textual State Enforcement Switch */}
          {mounted && (
            <div className="flex flex-col items-end gap-1.5">
              <div className="relative group flex items-center p-1 bg-sunken rounded-lg border border-border">
                <button
                  type="button"
                  disabled={!canEditPolicy}
                  onClick={() => handleOpenSwitchModal("enforce")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5",
                    mode === "enforce"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : canEditPolicy
                      ? "text-muted hover:text-default"
                      : "text-muted/50 cursor-not-allowed"
                  )}
                >
                  <Check className={cn("w-3.5 h-3.5", mode === "enforce" ? "opacity-100" : "opacity-0")} />
                  <span>Enforcing (Blocking)</span>
                </button>
                <button
                  type="button"
                  disabled={!canEditPolicy}
                  onClick={() => handleOpenSwitchModal("audit-only")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5",
                    mode === "audit-only"
                      ? "bg-amber-600 text-white shadow-xs"
                      : canEditPolicy
                      ? "text-muted hover:text-default"
                      : "text-muted/50 cursor-not-allowed"
                  )}
                >
                  <AlertTriangle className={cn("w-3.5 h-3.5", mode === "audit-only" ? "opacity-100" : "opacity-0")} />
                  <span>Audit-only (Permissive)</span>
                </button>

                {!canEditPolicy && (
                  <div className="absolute right-0 top-full mt-1.5 hidden group-hover:block z-30 w-72 p-2 bg-neutral-900 text-white text-[11px] rounded shadow-lg">
                    Mode modification restricted: Requires &apos;security.policy.edit&apos; permission. Current user lacks this administrative authority.
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted">
                {mode === "enforce"
                  ? "Strict zero-trust enforcement: unauthorized actions blocked"
                  : "Permissive testing mode: violations logged, not blocked"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Navigation */}
      <SecurityNav />

      {/* Main Page Content */}
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</div>

      {/* Enforcement Mode Switch Modal with Dual-Custody Approval */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-modal max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                <h3 className="text-base font-bold text-default">
                  Change Enforcement Policy Mode
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted hover:text-default text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmModeChange} className="space-y-4">
              <div className="p-3 bg-sunken rounded-lg border border-border text-xs space-y-1">
                <p className="font-semibold text-default">
                  Switching to:{" "}
                  <span
                    className={
                      targetMode === "enforce"
                        ? "text-emerald-600 font-bold"
                        : "text-amber-600 font-bold"
                    }
                  >
                    {targetMode === "enforce" ? "Enforcing (Blocking)" : "Audit-only (Permissive)"}
                  </span>
                </p>
                <p className="text-secondary">
                  {targetMode === "audit-only"
                    ? "In Audit-only mode, policies will evaluate and log violations to the audit stream, but requests will proceed without blocking. Audit-only mode is strictly time-limited."
                    : "Strict least-privilege mode. All policy violations, SoD conflicts, and tenant mismatches are blocked."}
                </p>
              </div>

              {targetMode === "audit-only" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-default block">
                    Time-Limit Duration (Auto-Reverts to Enforcing)
                  </label>
                  <select
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    className="w-full bg-surface border border-border rounded-md px-3 py-2 text-xs text-default focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value={1}>1 Hour (Quick diagnosis)</option>
                    <option value={4}>4 Hours (Standard diagnostic window)</option>
                    <option value={8}>8 Hours (Full shift testing)</option>
                    <option value={24}>24 Hours (Maintenance cycle)</option>
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-default block">
                  Business Justification (Mandatory Audit Requirement) *
                </label>
                <textarea
                  rows={2}
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  required
                  placeholder="Detail why the enforcement mode is being adjusted..."
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-xs text-default focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-default block flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-primary" />
                  Dual-Custody Second Approver (Simulated Independent Manager) *
                </label>
                <select
                  value={secondApprover}
                  onChange={(e) => setSecondApprover(e.target.value)}
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-xs text-default focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="David Chen (CMDB Manager)">David Chen (CMDB Manager)</option>
                  <option value="Marcus Vance (CMDB Manager)">Marcus Vance (CMDB Manager)</option>
                  <option value="Rachel Moore (Lead Auditor)">Rachel Moore (Lead Auditor)</option>
                  <option value="Priya Sharma (Data Steward Lead)">Priya Sharma (Data Steward Lead)</option>
                </select>
                <p className="text-[10px] text-muted">
                  Per Zero Trust policy, modifying the core enforcement posture requires verification from an authorized second custodian.
                </p>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Confirm & Log Mode Change
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zero Trust Computed Controls Modal */}
      {showZeroTrustModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-modal max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-default">
                  Zero Trust Architecture - Computed Controls
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowZeroTrustModal(false)}
                className="text-muted hover:text-default text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg border border-border bg-sunken space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-default flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Standing Administrator Limit
                  </span>
                  <span className="font-mono font-bold text-amber-600">4 / 3 (Alert)</span>
                </div>
                <p className="text-secondary text-[11px]">
                  Enterprise policy recommends a ceiling of 3 permanent administrators. Current count is 4 (review Michael Vance for offboarding).
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-sunken space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-default flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Separation of Duties (SoD) Engine
                  </span>
                  <span className="font-mono font-bold text-emerald-600">6 Active Rules</span>
                </div>
                <p className="text-secondary text-[11px]">
                  Actively enforces admin_cannot_approve, four_eyes_for_production, rule_author_cannot_approve, and role administration separation.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-sunken space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-default flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    JIT Auto-Expiring Exceptions
                  </span>
                  <span className="font-mono font-bold text-emerald-600">Enforced</span>
                </div>
                <p className="text-secondary text-[11px]">
                  All emergency and temporary role assignments require business justification, manager approval, and expire automatically.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-sunken space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-default flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Cross-Tenant Boundary Isolation
                  </span>
                  <span className="font-mono font-bold text-emerald-600">404 Not Found</span>
                </div>
                <p className="text-secondary text-[11px]">
                  Requests targeting foreign tenant CIs fail with 404 Not Found rather than 403, preventing metadata discovery across organizations.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setShowZeroTrustModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
