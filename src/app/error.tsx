"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ShieldAlert, RefreshCw, ArrowLeft } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("ZenOps Runtime Error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-app text-default">
      <div className="max-w-md w-full bg-surface border border-border rounded-xl p-8 text-center space-y-5 shadow-card">
        <div className="w-14 h-14 rounded-2xl bg-danger/10 border border-danger/20 text-danger flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-default">Application Exception</h1>
          <p className="text-xs text-secondary leading-relaxed">
            An unexpected error occurred while rendering this CMDB view.
          </p>
        </div>
        <div className="pt-2 flex items-center gap-2 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-border text-default text-xs font-semibold hover:bg-surface-hover transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
