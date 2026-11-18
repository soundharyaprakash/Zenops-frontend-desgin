"use client";

import React from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-lg bg-surface/50",
        className
      )}
    >
      <div className="w-10 h-10 rounded-full bg-elevated border border-border flex items-center justify-center text-muted mb-3">
        {icon || <Inbox className="w-5 h-5" />}
      </div>
      <h4 className="text-xs font-bold text-foreground tracking-tight">{title}</h4>
      {description && (
        <p className="text-xs text-secondary mt-1 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
