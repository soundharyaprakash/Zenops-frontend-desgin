"use client";

import React, { useState } from "react";
import { Button, ButtonProps } from "@/components/ui/Button";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PrimaryButtonProps extends Omit<ButtonProps, "variant"> {
  disabledReason?: string;
  icon?: React.ReactNode;
}

/**
 * High-Contrast Glass Primary Button
 *
 * Implements the frosted mirror glass styling with brand-500 fill,
 * soft top specular sheen, and brand-tinted glow shadow.
 *
 * If disabled (e.g., RBAC restriction), keeps the button visible with a lock icon
 * and displays an accessible explanation tooltip on hover.
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

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => disabled && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Button
        variant="primary"
        size={size}
        disabled={disabled}
        onClick={disabled ? (e) => e.preventDefault() : onClick}
        leftIcon={disabled ? <Lock className="w-3.5 h-3.5 text-white/70 shrink-0" /> : icon}
        className={cn("whitespace-nowrap", className)}
        {...props}
      >
        {children}
      </Button>

      {disabled && showTooltip && disabledReason && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 px-3 py-1.5 bg-neutral-900 border border-border text-neutral-100 text-[11px] rounded-lg shadow-dropdown whitespace-normal max-w-xs text-center pointer-events-none animate-in fade-in zoom-in-95 duration-150">
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
