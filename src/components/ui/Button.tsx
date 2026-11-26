"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "teal" | "subtle" | "link";
  size?: "xs" | "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Glass / Mirror-Style Button Component
 *
 * Implements:
 * - Translucent surface with diagonal brand gradient
 * - Frosted backdrop blur (14px) with @supports fallback
 * - Mirror highlight: soft top-left specular reflection sheen
 * - 1px hairline gradient border (25% top edge fading to 5% bottom)
 * - Soft brand-tinted glow shadow (0 8px 24px rgba(31, 107, 255, 0.24))
 * - Consistent rounded-button (12px) radius
 * - Micro-interactions: lift 1-2px on hover, scale 0.97 on press
 * - Accessible WCAG AA 4.5:1 text/icon contrast
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "sm",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isLink = variant === "link";

    const baseStyles = isLink
      ? "inline-flex items-center justify-center font-medium text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 hover:underline transition-colors p-0 h-auto border-0 bg-transparent disabled:opacity-40 disabled:pointer-events-none"
      : "group relative inline-flex items-center justify-center font-semibold rounded-button transition-all duration-200 select-none overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-app active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none disabled:cursor-not-allowed";

    const variantStyles = {
      primary:
        "btn-glass-mirror btn-glass-primary bg-gradient-to-br from-brand-500 via-brand-500 to-brand-600 text-white shadow-glass hover:shadow-glass-hover hover:-translate-y-0.5 active:translate-y-0 border border-white/25 hover:border-white/40",
      secondary:
        "btn-glass-mirror btn-glass-secondary bg-white/75 dark:bg-white/[0.05] hover:bg-white/95 dark:hover:bg-white/[0.09] text-text-default hover:text-text-default shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 border border-black/[0.08] dark:border-white/[0.08] hover:border-black/[0.14] dark:hover:border-white/[0.14]",
      outline:
        "btn-glass-mirror bg-transparent hover:bg-brand-500/[0.06] dark:hover:bg-brand-500/[0.12] text-text-default hover:text-brand-500 dark:hover:text-brand-400 border border-border hover:border-brand-500/40 hover:-translate-y-0.5 active:translate-y-0",
      ghost:
        "bg-transparent hover:bg-slate-500/[0.08] dark:hover:bg-white/[0.06] text-text-secondary hover:text-text-default border border-transparent hover:-translate-y-0.5 active:translate-y-0",
      subtle:
        "btn-glass-mirror bg-brand-500/[0.08] hover:bg-brand-500/[0.14] text-brand-500 dark:text-brand-400 border border-brand-500/15 hover:border-brand-500/30 hover:-translate-y-0.5 active:translate-y-0",
      danger:
        "btn-glass-mirror bg-gradient-to-br from-red-600/90 via-red-600 to-red-700/95 text-white shadow-glass-danger hover:shadow-glass-danger-hover hover:-translate-y-0.5 active:translate-y-0 border border-white/25 hover:border-white/35",
      teal:
        "btn-glass-mirror bg-gradient-to-br from-emerald-600/90 to-emerald-700/95 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 border border-white/20 hover:border-white/30",
      link: "",
    };

    const sizeStyles = {
      xs: "h-7 px-2.5 text-xs gap-1 rounded-[10px]",
      sm: "h-8 px-3 text-xs sm:text-sm gap-1.5 rounded-button",
      md: "h-9 px-3.5 text-sm gap-2 rounded-button",
      lg: "h-10 px-4 text-sm sm:text-base gap-2 rounded-button-lg",
      icon: "h-8 w-8 p-0 text-sm rounded-button shrink-0",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], !isLink && sizeStyles[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {/* Specular Mirror Highlight Sheen */}
        {!isLink && (variant === "primary" || variant === "secondary" || variant === "danger" || variant === "teal") && (
          <span
            className="absolute inset-x-0 top-0 h-[48%] rounded-[inherit] pointer-events-none bg-gradient-to-b from-white/20 via-white/5 to-transparent opacity-85 transition-opacity duration-200 group-hover:opacity-100"
            aria-hidden="true"
          />
        )}

        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5 shrink-0 relative z-10" />}
        {!isLoading && leftIcon && <span className="flex-shrink-0 relative z-10">{leftIcon}</span>}
        <span className="relative z-10 inline-flex items-center gap-1.5 truncate">{children}</span>
        {!isLoading && rightIcon && <span className="flex-shrink-0 relative z-10">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
