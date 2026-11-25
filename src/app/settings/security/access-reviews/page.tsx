"use client";

import React, { useState } from "react";
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Calendar,
  Shield,
  Download,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Lozenge } from "@/components/ui/Lozenge";
import { RoleHoldersService, RoleHolder, AccessAuditService, PERMISSIONS } from "@/lib/rbac";
import { cn } from "@/lib/utils";

interface ReviewDecision {
  holderId: string;
  status: "certified" | "revoked" | "pending";
  decisionBy?: string;
  decisionAt?: string;
  notes?: string;
}

export default function AccessReviewsPage() {
  const allHolders = RoleHoldersService.getAllHolders();
  const [decisions, setDecisions] = useState<Record<string, ReviewDecision>>({
    "usr-admin-01": { holderId: "usr-admin-01", status: "certified", decisionBy: "Sarah Jenkins", decisionAt: "2026-11-18T10:00:00Z" },
    "usr-mgr-01": { holderId: "usr-mgr-01", status: "certified", decisionBy: "David Chen", decisionAt: "2026-11-18T10:05:00Z" },
    "usr-admin-04": { holderId: "usr-admin-04", status: "revoked", decisionBy: "Sarah Jenkins", decisionAt: "2026-11-19T14:20:00Z", notes: "Dormant account (>90 days inactive); access revoked" },
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleDecision = (holder: RoleHolder, status: "certified" | "revoked") => {
    setDecisions((prev) => ({
      ...prev,
      [holder.id]: {
        holderId: holder.id,
        status,
        decisionBy: "Current Reviewer",
        decisionAt: new Date().toISOString(),
        notes: status === "certified" ? "Recertified for Q4 cycle" : "Revocation flagged due to access review",
      },
    }));

    AccessAuditService.append({
      actorId: "usr-current",
      actorEmail: "reviewer@zenops.local",
      actorName: "Access Campaign Reviewer",
      actorRole: "CMDB Manager",
      permission: PERMISSIONS.ATTESTATION_MANAGE,
      tenantId: "CMP_1001_ZENDEV",
      allowed: true,
      reason: `Access Review Decision: User '${holder.name}' (${holder.email}) role '${holder.roleKey}' was ${status.toUpperCase()} in Q4 2026 Recertification Campaign.`,
      auditFlag: status === "certified" ? "ACCESS_REVIEW_CERTIFIED" : "ACCESS_REVIEW_REVOKED",
      metadata: { targetUserId: holder.id, roleKey: holder.roleKey, status },
    });

    setToastMessage(`Decision saved: ${holder.name} marked as ${status.toUpperCase()}.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const certifiedCount = Object.values(decisions).filter((d) => d.status === "certified").length;
  const revokedCount = Object.values(decisions).filter((d) => d.status === "revoked").length;
  const totalCount = allHolders.length;
  const reviewedCount = certifiedCount + revokedCount;
  const progressPercent = Math.round((reviewedCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-default">Quarterly Privileged Access Recertification</h2>
          <p className="text-xs text-secondary">
            Formal governance review ensuring all human and automated role assignments comply with least privilege principles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Lozenge variant="info" size="xs">
            Q4 2026 Active Campaign
          </Lozenge>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Campaign Progress KPI Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4 space-y-1.5 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-muted">Campaign Completion</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-default">{progressPercent}%</span>
            <span className="text-xs text-secondary">{reviewedCount} / {totalCount} Reviewed</span>
          </div>
          <div className="w-full bg-sunken rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-muted">Recertified Compliant</span>
          <div className="text-2xl font-bold text-emerald-600">{certifiedCount}</div>
          <p className="text-[11px] text-secondary">Validated for continued operational need</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-muted">Revocations Flagged</span>
          <div className="text-2xl font-bold text-rose-600">{revokedCount}</div>
          <p className="text-[11px] text-secondary">Dormant or excessive privilege revocations</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-muted">Campaign Deadline</span>
          <div className="text-sm font-bold text-default">December 31, 2026</div>
          <p className="text-[11px] text-secondary">Quarterly audit sign-off requirement</p>
        </div>
      </div>

      {/* Access Review Roster */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-default uppercase tracking-wider">
            Active Principal Review Queue ({allHolders.length} Assignments)
          </h3>
          <span className="text-xs text-muted">Dual-signed by CMDB Manager & Auditor</span>
        </div>

        <div className="space-y-2">
          {allHolders.map((holder) => {
            const decision = decisions[holder.id]?.status || "pending";

            return (
              <div
                key={holder.id}
                className={cn(
                  "p-3.5 rounded-lg border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors",
                  decision === "certified"
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : decision === "revoked"
                    ? "bg-rose-500/5 border-rose-500/20"
                    : "bg-surface border-border"
                )}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-default">{holder.name}</span>
                    <span className="text-muted text-[11px]">({holder.email})</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-sunken text-default border border-border">
                      {holder.roleKey}
                    </span>
                    <Lozenge variant="neutral" size="xs">
                      {holder.assignmentSource}
                    </Lozenge>
                  </div>
                  <p className="text-[11px] text-secondary">{holder.title} &bull; {holder.sourceDetail}</p>
                  <p className="text-[10px] text-muted">
                    Last active: {holder.lastUsed} {holder.inactiveDays >= 90 && `(⚠️ Inactive ${holder.inactiveDays} days)`}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {decision === "certified" ? (
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Certified
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDecision(holder, "revoked")}
                        className="text-xs py-1 h-7"
                      >
                        Change to Revoke
                      </Button>
                    </div>
                  ) : decision === "revoked" ? (
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/30 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Revoked
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDecision(holder, "certified")}
                        className="text-xs py-1 h-7"
                      >
                        Change to Certify
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDecision(holder, "revoked")}
                        className="text-xs py-1 h-7 text-rose-600 hover:text-rose-700"
                      >
                        Revoke
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleDecision(holder, "certified")}
                        className="text-xs py-1 h-7"
                      >
                        Certify Access
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
