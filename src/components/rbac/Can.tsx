"use client";

import React from "react";
import { PermissionKey, ResourceContext } from "@/lib/rbac";
import { usePermission } from "./usePermission";
import { Info, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CanProps {
  permission: PermissionKey;
  resource?: ResourceContext;
  fallback?: React.ReactNode;
  disableOnly?: boolean;
  tooltipText?: string;
  className?: string;
  children: React.ReactNode;
}

export function Can({
  permission,
  resource,
  fallback = null,
  disableOnly = false,
  tooltipText,
  className,
  children,
}: CanProps) {
  const { allowed, reason, requiresSecondApprover } = usePermission(permission, resource);

  if (allowed && !requiresSecondApprover) {
    return <>{children}</>;
  }

  // If dual-custody is required (Four-Eyes for production)
  if (allowed && requiresSecondApprover) {
    return (
      <div className={cn("relative group inline-block", className)}>
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<any>, {
              className: cn(
                (children as any).props.className,
                "border-amber-500/40 text-amber-600 bg-amber-500/5 hover:bg-amber-500/10"
              ),
            })
          : children}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-900 text-neutral-100 text-[11px] rounded shadow-lg pointer-events-none whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-100">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{reason || "Requires dual custody (second approver confirmation)."}</span>
        </div>
      </div>
    );
  }

  // If not allowed, but we want to render the child in disabled state with reason tooltip
  if (disableOnly && React.isValidElement(children)) {
    const displayTooltip = tooltipText || reason || "Action restricted by RBAC policy.";

    return (
      <div className={cn("relative group inline-block", className)}>
        <div className="opacity-50 cursor-not-allowed pointer-events-none select-none">
          {React.cloneElement(children as React.ReactElement<any>, {
            disabled: true,
            tabIndex: -1,
            "aria-disabled": true,
            onClick: (e: React.MouseEvent) => e.preventDefault(),
          })}
        </div>
        {/* Tooltip on hover */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-900 text-neutral-100 text-[11px] font-medium rounded shadow-dropdown pointer-events-none max-w-xs text-center z-50 animate-in fade-in zoom-in-95 duration-100">
          <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>{displayTooltip}</span>
        </div>
      </div>
    );
  }

  // Fallback if provided, else null (hidden)
  return fallback ? <>{fallback}</> : null;
}
