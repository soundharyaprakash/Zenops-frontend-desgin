"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "lg",
  showCloseButton = true,
  header,
  footer,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen || typeof document === "undefined") return null;

  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto overscroll-contain flex items-center justify-center p-3 sm:p-5 md:p-8 animate-in fade-in duration-150"
      style={{ margin: 0 }}
    >
      {/* Backdrop: covers full viewport, clicking closes */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card: always centered vertically and horizontally in viewport */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full bg-surface text-foreground rounded-2xl border border-border-strong shadow-2xl z-10 transition-all pointer-events-auto flex flex-col text-left my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] overflow-hidden",
          maxWidthStyles[maxWidth]
        )}
      >
        {/* Header: either custom header prop or standard title/close button */}
        {header ? (
          <div className="shrink-0">{header}</div>
        ) : (title || showCloseButton) ? (
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
        ) : null}

        {/* Dialog Body: scrollable inside the dialog with its own scroll container */}
        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 flex flex-col">
          {children}
        </div>

        {/* Footer: pinned cleanly at bottom */}
        {footer && <div className="shrink-0">{footer}</div>}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
