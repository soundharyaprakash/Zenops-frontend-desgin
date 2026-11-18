"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { useCMDB, ToastMessage } from "@/context/cmdb-context";
import { cn } from "@/lib/utils";

export function ToastContainer() {
  const { toasts, removeToast } = useCMDB();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: () => void;
}) {
  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-danger flex-shrink-0" />,
    info: <Info className="w-4 h-4 text-primary flex-shrink-0" />,
  };

  const borderStyles = {
    success: "border-l-4 border-l-success",
    warning: "border-l-4 border-l-warning",
    error: "border-l-4 border-l-danger",
    info: "border-l-4 border-l-primary",
  };

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 p-3.5 rounded-md bg-surface text-foreground border border-border dark:border-white/[0.08] shadow-dropdown animate-in slide-in-from-bottom-3 fade-in duration-200 transition-all",
        borderStyles[toast.type]
      )}
    >
      <div className="mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0 pr-1">
        <h5 className="text-xs font-bold text-foreground tracking-tight leading-none">
          {toast.title}
        </h5>
        {toast.message && (
          <p className="text-[11px] text-secondary mt-1 leading-snug break-words">
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="p-1 rounded text-muted hover:text-foreground hover:bg-elevated hover:scale-110 active:scale-95 transition-all -mr-1 -mt-1"
        aria-label="Dismiss toast"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
