"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "5xl";
  showCloseButton?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "lg",
  showCloseButton = true,
}: ModalProps) {
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

  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Screen Centering & Scroll Shell: ensures modal is centered both vertically and horizontally */}
      <div className="flex min-h-screen items-center justify-center p-3 sm:p-5 md:p-8 pointer-events-none text-center">
        {/* Modal Dialog Card */}
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "relative w-full bg-surface text-foreground rounded-2xl border border-border-strong shadow-2xl z-10 transition-all pointer-events-auto flex flex-col text-left my-auto max-h-[calc(100vh-2.5rem)] sm:max-h-[calc(100vh-4rem)]",
            maxWidthStyles[maxWidth]
          )}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4.5 border-b border-border bg-elevated/40 shrink-0 rounded-t-2xl">
              <div className="min-w-0 flex-1 pr-3">
                {title && (
                  <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight truncate">
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="text-xs sm:text-sm text-secondary mt-0.5 truncate">{description}</p>
                )}
              </div>
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-elevated transition-colors shrink-0"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Dialog Body (scrollable inside the dialog) */}
          <div className="flex-1 overflow-y-auto overscroll-contain flex flex-col">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
