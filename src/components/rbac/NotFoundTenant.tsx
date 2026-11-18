"use client";

import React from "react";
import Link from "next/link";
import { HelpCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function NotFoundTenant({ resourceId = "Requested item" }: { resourceId?: string }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-surface border border-border rounded-xl p-6 text-center space-y-4 shadow-card">
        <div className="w-12 h-12 rounded-xl bg-sunken text-muted flex items-center justify-center mx-auto border border-border">
          <HelpCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-default">404: Configuration Item Not Found</h2>
          <p className="text-xs text-secondary leading-relaxed">
            "{resourceId}" was not found in your active workspace tenant. Configuration items in other tenants are strictly isolated.
          </p>
        </div>
        <div className="pt-2">
          <Link href="/cis">
            <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Return to CI Catalog
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
