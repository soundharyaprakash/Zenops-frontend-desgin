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
    const baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-button transition-all duration-150 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

    const variantStyles = {
      primary:
        "bg-primary text-white hover:bg-[var(--primary-hover)] active:opacity-90 shadow-subtle border border-transparent",
      secondary:
        "bg-sunken text-default border border-border hover:bg-border/70 active:bg-border text-secondary hover:text-default",
      outline:
        "bg-transparent border border-border text-default hover:bg-sunken active:bg-border/40",
      ghost:
        "bg-transparent text-secondary hover:text-default hover:bg-sunken active:bg-border/40",
      subtle:
        "bg-transparent text-secondary hover:text-default hover:bg-sunken active:bg-border/40",
      danger:
        "bg-danger text-white hover:opacity-90 active:opacity-80 shadow-subtle border border-transparent",
      teal:
        "bg-success text-white hover:opacity-90 active:opacity-80 shadow-subtle border border-transparent",
      link:
        "bg-transparent text-primary hover:underline p-0 h-auto font-medium shadow-none border-0",
    };

    const sizeStyles = {
      xs: "h-7 px-2.5 text-xs gap-1",
      sm: "h-8 px-3 text-sm gap-1.5",
      md: "h-9 px-3.5 text-sm gap-2",
      lg: "h-10 px-4 text-base gap-2",
      icon: "h-8 w-8 p-0 text-sm",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
        {!isLoading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
