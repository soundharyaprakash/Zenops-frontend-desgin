"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, RefreshCw, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCMDB } from "@/context/cmdb-context";

interface AccessDeniedProps {
  requiredPermission?: string;
  reason?: string;
  title?: string;
}

export function AccessDenied({
  requiredPermission,
  reason,
  title = "Access Restricted by Policy",
}: AccessDeniedProps) {
  const { userRole, setUserRole } = useCMDB();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-surface border border-border rounded-xl p-6 sm:p-8 text-center space-y-5 shadow-card">
        <div className="w-14 h-14 rounded-2xl bg-danger/10 border border-danger/20 text-danger flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-default">{title}</h2>
          <p className="text-xs text-secondary leading-relaxed">
            {reason ||
              "Your current role does not possess the requisite permissions or scope boundary to access this CMDB capability."}
          </p>
        </div>

        <div className="p-3 bg-sunken rounded-lg border border-border text-left text-xs space-y-1.5 font-mono">
          <div className="flex justify-between text-muted">
            <span>Current Role:</span>
            <span className="font-semibold text-primary">{userRole}</span>
          </div>
          {requiredPermission && (
            <div className="flex justify-between text-muted">
              <span>Required Permission:</span>
              <span className="font-semibold text-danger">{requiredPermission}</span>
            </div>
          )}
          <div className="flex justify-between text-muted">
            <span>Enforcement Mode:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Enforce (Least Privilege)</span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center gap-2 justify-center">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />} className="w-full">
              Back to Dashboard
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => setUserRole("CMDB Administrator")}
            className="w-full sm:w-auto"
          >
            Switch to Admin (Demo)
          </Button>
        </div>
      </div>
    </div>
  );
}
