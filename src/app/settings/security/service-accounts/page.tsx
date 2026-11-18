"use client";

import React, { useState, useEffect } from "react";
import { Cpu, KeyRound, RefreshCw, Shield, AlertTriangle, CheckCircle2, Globe } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Lozenge } from "@/components/ui/Lozenge";
import {
  ServiceAccountService,
  ServiceAccount,
} from "@/lib/rbac";

export default function ServiceAccountsPage() {
  const [accounts, setAccounts] = useState<ServiceAccount[]>([]);
  const [rotatedMessage, setRotatedMessage] = useState<string | null>(null);

  useEffect(() => {
    setAccounts(ServiceAccountService.getAccounts());
  }, []);

  const handleRotate = (id: string, name: string) => {
    const updated = ServiceAccountService.rotateSecret(id);
    if (updated) {
      setAccounts(ServiceAccountService.getAccounts());
      setRotatedMessage(`Rotated token secret for '${name}' successfully. Next rotation due in 90 days.`);
      setTimeout(() => setRotatedMessage(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-default">Non-Human Service Accounts</h2>
          <p className="text-xs text-secondary">
            Machine credentials for automated discovery connectors. Constrained strictly to staging payload writes (staging.write) with mandatory 90-day secret rotation.
          </p>
        </div>
      </div>

      {rotatedMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{rotatedMessage}</span>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map((sa) => {
          const daysSince = Math.floor(
            (Date.now() - new Date(sa.lastRotated).getTime()) / (1000 * 60 * 60 * 24)
          );
          const isOverdue = daysSince > sa.rotationIntervalDays;

          return (
            <div
              key={sa.id}
              className="bg-surface border border-border rounded-xl p-5 space-y-4 shadow-xs text-left"
            >
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm font-mono text-default">{sa.name}</span>
                    <Lozenge
                      variant={isOverdue ? "danger" : sa.status === "active" ? "success" : "neutral"}
                      size="xs"
                    >
                      {isOverdue ? "Rotation Overdue" : sa.status === "active" ? "Compliant" : "Disabled"}
                    </Lozenge>
                  </div>
                  <p className="text-xs text-muted">{sa.connectorName}</p>
                </div>

                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
              </div>

              <p className="text-xs text-secondary leading-relaxed">{sa.description}</p>

              {/* Attributes */}
              <div className="grid grid-cols-2 gap-2 text-[11px] p-3 bg-sunken rounded-lg border border-border">
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Account Owner</span>
                  <span className="font-semibold text-default truncate block">{sa.owner}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Last Token Rotation</span>
                  <span className={isOverdue ? "text-danger font-bold" : "font-semibold text-default"}>
                    {daysSince} days ago ({new Date(sa.lastRotated).toLocaleDateString()})
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t border-border/50">
                  <span className="text-muted block text-[10px] uppercase font-semibold">IP Allow-List</span>
                  <span className="font-mono text-default text-[10px]">
                    {sa.ipAllowList.join(", ")}
                  </span>
                </div>
              </div>

              {/* Scope & Permissions */}
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="text-muted">Scope:</span>
                  <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                    staging.write only
                  </span>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<RefreshCw className="w-3 h-3" />}
                  onClick={() => handleRotate(sa.id, sa.name)}
                >
                  Rotate Secret
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
