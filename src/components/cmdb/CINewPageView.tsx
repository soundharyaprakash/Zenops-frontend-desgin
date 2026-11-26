"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, PlusCircle, FileSpreadsheet } from "lucide-react";
import { CIForm } from "@/components/cmdb/CIForm";
import { CIBulkUpload } from "@/components/cmdb/CIBulkUpload";
import { cn } from "@/lib/utils";

export function CINewPageView() {
  const router = useRouter();
  const [mode, setMode] = useState<"single" | "bulk">("single");

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header with Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/cis"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to CI Inventory
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-default tracking-tight">
            {mode === "single" ? "New Configuration Item" : "Bulk Upload Configuration Items (CSV)"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {mode === "single"
              ? "Register a single CI with discovery attributes, lifecycle status, and relationship metadata."
              : "Ingest dozens or hundreds of Configuration Items at once using standard CSV spreadsheet files."}
          </p>
        </div>

        {/* Mode Switcher Pill */}
        <div className="inline-flex p-1 bg-sunken rounded-xl border border-border shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
              mode === "single"
                ? "bg-surface text-default border border-border shadow-xs"
                : "text-muted hover:text-default"
            )}
          >
            <PlusCircle className="w-3.5 h-3.5 text-primary" />
            Single CI Form
          </button>
          <button
            type="button"
            onClick={() => setMode("bulk")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
              mode === "bulk"
                ? "bg-surface text-default border border-border shadow-xs"
                : "text-muted hover:text-default"
            )}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
            Bulk Upload CSV
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      {mode === "single" ? (
        <CIForm isEdit={false} />
      ) : (
        <div className="bg-surface rounded-2xl border border-border shadow-card p-6 sm:p-8 max-w-5xl mx-auto">
          <CIBulkUpload
            onSuccess={() => router.push("/cis")}
            onCancel={() => setMode("single")}
          />
        </div>
      )}
    </div>
  );
}
