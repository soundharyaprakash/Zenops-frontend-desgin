"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Plus,
  Calendar,
  Users,
  Award,
  AlertCircle,
  Clock,
  ShieldCheck,
  Check,
  X,
  Lock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lozenge } from "@/components/ui/Lozenge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useCMDB } from "@/context/cmdb-context";
import { AttestationCampaign } from "@/types/cmdb";
import { cn } from "@/lib/utils";
import { usePermission } from "@/components/rbac/usePermission";
import { Can } from "@/components/rbac/Can";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export function AttestationCampaignsView() {
  const { attestationCampaigns, cis, certifyCampaignCI, showToast, activeTenant } = useCMDB();
  const [campaigns, setCampaigns] = useState(attestationCampaigns);
  const [selectedCampaign, setSelectedCampaign] = useState<AttestationCampaign | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New campaign state
  const [name, setName] = useState("");
  const [scope, setScope] = useState("");
  const [dueDate, setDueDate] = useState("2026-12-31");
  const [owners, setOwners] = useState("Sarah Jenkins, David Chen, Marcus Vance");

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCamp: AttestationCampaign = {
      id: `ATT-${Date.now().toString().slice(-4)}`,
      name,
      scope,
      ownerList: owners.split(",").map((s) => s.trim()),
      dueDate,
      outcome: "Draft",
      completionPercentage: 0,
      totalCIs: 30,
      certifiedCIs: 0,
      rejectedCIs: 0,
    };

    setCampaigns([newCamp, ...campaigns]);
    setIsAddOpen(false);
    showToast("success", "Attestation Campaign Launched", `Campaign "${name}" initialized.`);
    setName("");
    setScope("");
  };

  const handleCertify = (campaignId: string, ciId: string, verified: boolean) => {
    certifyCampaignCI(campaignId, ciId, verified ? "Certified" : "Rejected");
    showToast(
      verified ? "success" : "warning",
      verified ? "CI Certified & Attested" : "CI Flagged for Decommission",
      `Recorded owner certification for ${ciId}.`
    );
  };

  return (
    <div className="space-y-6 pb-12 text-text-default">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-default">
              Attestation & Certification Campaigns
            </h1>
            <Lozenge appearance="subtle" variant="info">
              {campaigns.length} Campaigns
            </Lozenge>
            <span className="inline-flex items-center gap-1 text-xs text-text-muted bg-sunken px-2 py-0.5 rounded border border-border/60">
              <Lock className="w-3 h-3 text-text-muted" />
              {activeTenant}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Periodic compliance verification where system owners certify accuracy, live status and operational accountability
          </p>
        </div>

        <Can permission={PERMISSIONS.ATTESTATION_MANAGE}>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddOpen(true)}
          >
            Launch Campaign
          </Button>
        </Can>
      </div>

      {/* Campaign Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {campaigns.map((camp) => (
          <Card key={camp.id} hoverEffect className="bg-surface border-border flex flex-col justify-between">
            <div>
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div className="min-w-0 pr-2 space-y-0.5">
                  <span className="font-mono text-[10px] text-text-muted font-bold">
                    {camp.id}
                  </span>
                  <CardTitle className="text-xs font-bold truncate">
                    {camp.name}
                  </CardTitle>
                </div>
                <Lozenge
                  appearance="bold"
                  variant={
                    camp.outcome === "Completed"
                      ? "success"
                      : camp.outcome === "In Progress"
                      ? "info"
                      : "neutral"
                  }
                >
                  {camp.outcome}
                </Lozenge>
              </CardHeader>

              <CardContent className="space-y-3.5 text-sm">
                <div>
                  <span className="text-xs font-bold uppercase text-text-muted">
                    Scope Description
                  </span>
                  <p className="text-text-secondary text-sm line-clamp-2 mt-0.5 leading-relaxed">
                    {camp.scope}
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between font-medium text-xs">
                    <span className="text-text-secondary">Completion</span>
                    <span className="font-bold text-primary font-mono text-sm">
                      {camp.completionPercentage}%
                    </span>
                  </div>
                  <ProgressBar value={camp.completionPercentage} max={100} variant="brand" size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-border text-xs">
                  <div>
                    <span className="text-text-muted">Due Date</span>
                    <p className="font-semibold text-text-default flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-text-muted" />
                      {camp.dueDate}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-muted">Certified</span>
                    <p className="font-semibold text-success font-mono mt-0.5">
                      {camp.certifiedCIs} / {camp.totalCIs} CIs
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-text-muted text-xs uppercase font-bold">
                    Participating Owners
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {camp.ownerList.map((owner) => (
                      <span
                        key={owner}
                        className="px-2 py-0.5 rounded bg-sunken text-text-secondary text-xs font-medium border border-border/60"
                      >
                        {owner.split(" ")[0]}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </div>

            <div className="p-4 pt-0">
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-center"
                leftIcon={<ShieldCheck className="w-4 h-4 text-primary" />}
                onClick={() => setSelectedCampaign(camp)}
              >
                Open Audit Workspace
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Audit Workspace Modal for Selected Campaign */}
      {selectedCampaign && (
        <Modal
          isOpen={Boolean(selectedCampaign)}
          onClose={() => setSelectedCampaign(null)}
          title={`Attestation Workspace: ${selectedCampaign.name}`}
          description={`Scope: ${selectedCampaign.scope} • Target Deadline: ${selectedCampaign.dueDate}`}
        >
          <div className="p-5 space-y-4 text-sm">
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-sunken border border-border">
              <div>
                <span className="font-bold text-text-default text-sm">Campaign Progress</span>
                <p className="text-xs text-text-muted">
                  {selectedCampaign.certifiedCIs} of {selectedCampaign.totalCIs} CIs verified by owners
                </p>
              </div>
              <span className="font-mono font-bold text-base text-primary">
                {selectedCampaign.completionPercentage}%
              </span>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-xs uppercase tracking-wider text-text-muted block">
                CIs Assigned for Verification
              </span>
              <div className="divide-y divide-border/60 border border-border rounded-lg max-h-60 overflow-y-auto">
                {cis.slice(0, 5).map((ci) => (
                  <div key={ci.id} className="p-3 flex items-center justify-between hover:bg-sunken/40">
                    <div>
                      <span className="font-semibold text-text-default block text-sm">{ci.name}</span>
                      <span className="text-xs font-mono text-text-muted">
                        {ci.id} &bull; Owner: {ci.owner}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Can
                        permission={PERMISSIONS.CI_ATTEST}
                        resource={{
                          id: ci.id,
                          ciClass: ci.ciClass,
                          environment: ci.environment,
                          ownerGroup: ci.supportGroup || ci.owner,
                        }}
                      >
                        <Button
                          size="xs"
                          variant="primary"
                          leftIcon={<Check className="w-3 h-3" />}
                          onClick={() => handleCertify(selectedCampaign.id, ci.id, true)}
                        >
                          Certify Live
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          leftIcon={<X className="w-3 h-3" />}
                          onClick={() => handleCertify(selectedCampaign.id, ci.id, false)}
                        >
                          Flag Stale
                        </Button>
                      </Can>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <Button size="sm" variant="outline" onClick={() => setSelectedCampaign(null)}>
                Close Workspace
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Launch Campaign Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Launch Attestation Campaign"
        description="Schedule a recurring periodic attestation cycle for IT asset owners"
      >
        <form onSubmit={handleCreateCampaign} className="p-5 space-y-4 text-xs">
          <div>
            <label className="text-xs font-semibold text-text-default block mb-1">Campaign Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Q4 2026 Tier-0 Production Attestation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface border border-border rounded p-2 text-xs text-text-default focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-default block mb-1">Scope</label>
            <input
              type="text"
              required
              placeholder="e.g. All Production Tier-1 CIs with Financial ledger dependencies"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full bg-surface border border-border rounded p-2 text-xs text-text-default focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-default block mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-surface border border-border rounded p-2 text-xs text-text-default focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button size="xs" variant="outline" type="button" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button size="xs" variant="primary" type="submit">
              Launch Campaign
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
