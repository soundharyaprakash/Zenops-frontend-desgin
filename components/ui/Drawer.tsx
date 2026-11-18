"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl" | "2xl";
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  width,
  size = "md",
}: DrawerProps) {
  const effectiveWidth = width || size || "md";
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "w-screen bg-surface border-l border-border shadow-dropdown flex flex-col text-foreground transition-all duration-200 transform translate-x-0",
            widthStyles[effectiveWidth]
          )}
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-border bg-elevated/40 flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-3">
              {title && (
                <h3 className="text-base font-bold text-foreground truncate tracking-tight">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-sm text-secondary mt-0.5 truncate">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-muted hover:text-foreground hover:bg-elevated transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
