"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { CIItem } from "@/types/cmdb";
import { useCMDB } from "@/context/cmdb-context";
import { AlertTriangle, AlertOctagon, Link2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface CIRetireModalProps {
  ci: CIItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CIRetireModal({ ci, isOpen, onClose }: CIRetireModalProps) {
  const { retireCI, getImpactAnalysis } = useCMDB();
  const [changeRecord, setChangeRecord] = useState("");
  const [retirementReason, setRetirementReason] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!ci) return null;

  const isProduction = ci.environment === "Production";
  const impact = getImpactAnalysis(ci.id);
  const dependentCis = impact?.dependentCis || [];

  const handleRetire = () => {
    setError("");

    // Business Rule 2 Check: Production CI retirement strictly requires a Change Record ID
    if (isProduction && (!changeRecord || changeRecord.trim() === "")) {
      setError("Production CI retirement strictly requires an authorized Change Record (e.g. CHG-008912).");
      return;
    }

    setIsSubmitting(true);
    const result = retireCI(ci.id, changeRecord, retirementReason, "Sarah Jenkins (Platform Eng)");
    setIsSubmitting(false);

    if (result.success) {
      onClose();
      setChangeRecord("");
      setRetirementReason("");
    } else if (result.error) {
      setError(result.error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Retire Configuration Item: ${ci.name}`}
      description={`Decommissioning safeguard workflow for ${ci.id} (${ci.ciClass})`}
      maxWidth="xl"
    >
      <div className="p-5 space-y-4 text-foreground">
        {/* Environment Alert */}
        {isProduction ? (
          <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <h4 className="font-bold text-rose-600 dark:text-rose-400">
                Production CI Decommissioning Safeguard (Rule #2)
              </h4>
              <p className="text-secondary mt-1 leading-relaxed text-xs sm:text-sm">
                This item is active in <strong>Production</strong>. Enterprise governance policy mandates an authorized <strong>Change Record (CHG-...)</strong> before retirement to prevent untracked outages.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <h4 className="font-bold text-amber-600 dark:text-amber-400">Retirement Confirmation</h4>
              <p className="mt-1 text-secondary text-xs sm:text-sm">
                Setting this CI to <strong>Retired</strong> will update operational status to <strong>Non-operational</strong> and record an immutable audit entry.
              </p>
            </div>
          </div>
        )}

        {/* Business Rule: Dependent CIs Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-primary" />
              Impacted Dependent Nodes ({dependentCis.length})
            </h4>
            {impact && (
              <Badge
                variant={impact.riskLevel === "Severe" ? "danger" : "warning"}
                size="sm"
              >
                Blast Radius: {impact.riskLevel} ({impact.blastRadiusScore}%)
              </Badge>
            )}
          </div>

          {dependentCis.length > 0 ? (
            <div className="max-h-40 overflow-y-auto rounded-md border border-border divide-y divide-border/60 bg-elevated/30">
              {dependentCis.map((dep, idx) => (
                <div key={idx} className="p-2.5 text-sm flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-foreground">{dep.ci.name}</span>
                    <span className="text-xs text-muted font-mono ml-2">
                      {dep.ci.id} • {dep.ci.ciClass}
                    </span>
                  </div>
                  <Badge variant="danger" size="sm">
                    {dep.impactSeverity}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3.5 rounded-md bg-elevated/20 border border-border text-center text-xs sm:text-sm text-muted">
              Zero downstream dependents detected in topology.
            </div>
          )}
        </div>

        {/* Form Inputs */}
        <div className="space-y-3.5">
          <Input
            label={isProduction ? "Authorized Change Record ID (Required for Prod)" : "Change Record ID (Optional)"}
            placeholder="e.g. CHG-008912"
            value={changeRecord}
            onChange={(e) => setChangeRecord(e.target.value)}
            required={isProduction}
            error={error}
          />

          <Input
            label="Decommission Reason"
            placeholder="e.g. Modernized to Aurora v3 / Service consolidated"
            value={retirementReason}
            onChange={(e) => setRetirementReason(e.target.value)}
          />
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleRetire}
            isLoading={isSubmitting}
            leftIcon={<AlertOctagon className="w-3.5 h-3.5" />}
          >
            Confirm CI Retirement
          </Button>
        </div>
      </div>
    </Modal>
  );
}
