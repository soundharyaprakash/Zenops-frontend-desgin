"use client";

import React from "react";
import { Scale, ShieldAlert, CheckCircle2, Lock, Eye, AlertOctagon } from "lucide-react";
import { Lozenge } from "@/components/ui/Lozenge";
import { SOD_RULES } from "@/lib/rbac";

export default function PolicyRulesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-default">Separation of Duties (SoD) Policy Rules</h2>
        <p className="text-xs text-secondary">
          Active governance rules preventing toxic privilege accumulation and enforcing dual-custody approval gates.
        </p>
      </div>

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
    </div>
  );
}
