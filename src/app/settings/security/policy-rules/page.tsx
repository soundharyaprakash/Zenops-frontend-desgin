"use client";

import React, { useState } from "react";
import { Scale, ShieldAlert, CheckCircle2, Lock, Eye, AlertOctagon, SlidersHorizontal, UserCheck, Shield } from "lucide-react";
import { Lozenge } from "@/components/ui/Lozenge";
import { Button } from "@/components/ui/Button";
import { SOD_RULES, PERMISSIONS, AccessAuditService } from "@/lib/rbac";
import { usePermission } from "@/components/rbac/usePermission";

export default function PolicyRulesPage() {
  const sodEditPerm = usePermission(PERMISSIONS.SECURITY_SOD_EDIT);
  const canEditSod = sodEditPerm.allowed;

  const [modalOpen, setModalOpen] = useState(false);
  const [targetRule, setTargetRule] = useState<any>(null);
  const [changeReason, setChangeReason] = useState("");
  const [secondApprover, setSecondApprover] = useState("David Chen (CMDB Manager)");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleOpenEdit = (rule: any) => {
    setTargetRule(rule);
    setChangeReason("Calibrating rule severity threshold per annual audit review.");
    setModalOpen(true);
  };

  const handleSavePolicyChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeReason.trim() || !targetRule) return;

    AccessAuditService.append({
      actorId: "usr-admin-01",
      actorEmail: "sarah.jenkins@gmail.com",
      actorName: "Sarah Jenkins",
      actorRole: "CMDB Administrator",
      permission: PERMISSIONS.SECURITY_SOD_EDIT,
      tenantId: "CMP_1001_ZENDEV",
      allowed: true,
      reason: `Separation of Duties rule '${targetRule.name}' (${targetRule.id}) modified. Reason: ${changeReason.trim()}. Dual-approved by: ${secondApprover}.`,
      auditFlag: "SOD_RULE_POLICY_MODIFIED",
      metadata: { ruleId: targetRule.id, secondApprover },
    });

    setToastMessage(`Policy rule "${targetRule.name}" updated with dual-approval.`);
    setModalOpen(false);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-default">Separation of Duties (SoD) Policy Rules</h2>
          <p className="text-xs text-secondary">
            Active governance rules preventing toxic privilege accumulation and enforcing dual-custody approval gates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!canEditSod && (
            <span className="text-[11px] text-muted flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-muted" /> Read-Only (Requires security.sod.edit)
            </span>
          )}
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Rules Cards */}
      <div className="space-y-4">
        {SOD_RULES.map((rule) => (
          <div
            key={rule.id}
            className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-xs text-left"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-default">{rule.name}</h3>
                  <p className="text-[11px] font-mono text-muted">ID: {rule.id}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Lozenge variant={rule.severity === "Critical" ? "danger" : "warning"} size="xs">
                  {rule.severity} Severity
                </Lozenge>
                <Lozenge variant="success" size="xs">
                  Active Enforced
                </Lozenge>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canEditSod}
                  onClick={() => handleOpenEdit(rule)}
                  className="text-xs py-1 h-7"
                  title={!canEditSod ? "Requires 'security.sod.edit' permission" : "Edit rule policy"}
                >
                  Edit Rule
                </Button>
              </div>
            </div>

            <p className="text-xs text-secondary leading-relaxed">{rule.description}</p>

            <div className="p-3 bg-sunken rounded-lg border border-border text-xs flex items-center justify-between">
              <span className="text-muted font-semibold">Governance Principle:</span>
              <span className="font-semibold text-default">{rule.riskCategory}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Edit SoD Rule Modal with Dual Custody */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-modal max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                <h3 className="text-base font-bold text-default">
                  Calibrate SoD Rule: {targetRule?.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted hover:text-default text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePolicyChange} className="space-y-4 text-xs">
              <div className="p-3 bg-sunken rounded-lg border border-border space-y-1">
                <span className="font-semibold text-default block">Rule ID: {targetRule?.id}</span>
                <p className="text-secondary text-[11px]">{targetRule?.description}</p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-default block">
                  Mandatory Audit Justification *
                </label>
                <textarea
                  rows={2}
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  required
                  placeholder="Explain why this Separation of Duties threshold is being adjusted..."
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-xs text-default focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-default block flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-primary" />
                  Dual-Custody Approving Officer (Mandatory for SoD Modification) *
                </label>
                <select
                  value={secondApprover}
                  onChange={(e) => setSecondApprover(e.target.value)}
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-xs text-default"
                >
                  <option value="David Chen (CMDB Manager)">David Chen (CMDB Manager)</option>
                  <option value="Marcus Vance (CMDB Manager)">Marcus Vance (CMDB Manager)</option>
                  <option value="Rachel Moore (Lead Compliance Auditor)">Rachel Moore (Lead Compliance Auditor)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Changes with Dual-Approval
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
