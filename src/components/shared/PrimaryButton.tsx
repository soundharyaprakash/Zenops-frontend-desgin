"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

export interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  disabledReason?: string;
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

/**
 * High-Contrast Primary Button (Phase 0, Item 0.9 & G2)
 *
 * Real, high-contrast action button (never pale grey).
 * If disabled, keeps button visible and renders a high-contrast explanation tooltip
 * explaining why the action is disabled (e.g. RBAC permission lacking or condition not met).
 */
export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  disabled,
  disabledReason,
  icon,
  size = "md",
  className,
  onClick,
  ...props
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs h-8 gap-1.5",
    md: "px-4 py-2 text-xs font-semibold h-9 gap-2",
    lg: "px-5 py-2.5 text-sm font-bold h-10 gap-2.5",
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => disabled && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        {...props}
        disabled={disabled}
        onClick={disabled ? (e) => e.preventDefault() : onClick}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-lg transition-all select-none whitespace-nowrap shadow-xs",
          sizeClasses[size],
          disabled
            ? "bg-neutral-800 text-neutral-400 border border-neutral-700 cursor-not-allowed opacity-80"
            : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border border-blue-700 shadow-sm hover:shadow",
          className
        )}
      >
        {disabled && <Lock className="w-3.5 h-3.5 mr-1 text-neutral-400 shrink-0" />}
        {!disabled && icon && <span className="shrink-0">{icon}</span>}
        <span>{children}</span>
      </button>

      {disabled && showTooltip && disabledReason && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 px-3 py-1.5 bg-neutral-900 border border-neutral-700 text-neutral-100 text-[11px] rounded shadow-xl whitespace-normal max-w-xs text-center pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="font-semibold text-amber-400 flex items-center justify-center gap-1 mb-0.5">
            <Lock className="w-3 h-3" /> Action Restricted
          </div>
          {disabledReason}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900" />
        </div>
      )}
    </div>
  );
};
