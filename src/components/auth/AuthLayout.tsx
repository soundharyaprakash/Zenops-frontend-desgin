"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Layers,
  Network,
  Award,
  Sun,
  Moon,
  Laptop,
  HelpCircle,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  return (
    <div className="min-h-screen w-full flex bg-app text-default font-sans antialiased selection:bg-primary/20">
      {/* ------------------------------------------------------------------- */}
      {/* LEFT BRAND PANEL (Hidden on mobile/tablet, visible on lg+) */}
      {/* ------------------------------------------------------------------- */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 bg-surface border-r border-border flex-col justify-between p-8 xl:p-12 relative overflow-hidden">
        {/* Subtle Brand Gradient Top Border Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 via-brand-cyan to-brand-mint" />

        {/* Ambient background blur circles */}
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-brand-cyan/5 blur-3xl pointer-events-none" />

        {/* Header Logo */}
        <div className="relative z-10">
          <Logo size="md" />
        </div>

        {/* Center Content: Headline, Value Props & Dependency Graph Vector */}
        <div className="relative z-10 space-y-8 my-auto py-8">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Enterprise CMDB Platform
            </span>
            <h1 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-default leading-tight">
              Know what you run. <br />
              <span className="bg-gradient-to-r from-primary to-brand-cyan bg-clip-text text-transparent">
                See the impact
              </span>{" "}
              before you change it.
            </h1>
            <p className="text-sm text-secondary leading-relaxed max-w-md">
              A modern, Jira-inspired Configuration Management platform designed for agile startups and high-growth mid-market engineering teams.
            </p>
          </div>

          {/* Three Short Value Points */}
          <div className="space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary/20">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-default">Single source of truth</p>
                <p className="text-xs text-muted leading-relaxed">
                  Consolidated multi-cloud telemetry, SaaS subscriptions, containers, and databases.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20">
                <Network className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-default">Impact analysis before changes</p>
                <p className="text-xs text-muted leading-relaxed">
                  Real-time dependency graphs map blast radiuses and alert downstream business service owners.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/20">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-default">Data reliability Trust Score</p>
                <p className="text-xs text-muted leading-relaxed">
                  Algorithmic scoring across freshness, attribute completeness, and identifier consistency.
                </p>
              </div>
            </div>
          </div>

          {/* Low-contrast Subtle Dependency Graph Illustration (Pure SVG) */}
          <div className="pt-2">
            <div className="p-4 rounded-xl bg-sunken/60 border border-border/80">
              <svg
                viewBox="0 0 380 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-auto text-muted/40"
              >
                {/* Connecting Lines */}
                <path
                  d="M 60 60 L 140 35 L 240 35 L 320 60"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <path
                  d="M 60 60 L 140 85 L 240 85 L 320 60"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <path d="M 140 35 L 240 85" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
                <path d="M 140 85 L 240 35" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />

                {/* Node 1: Edge Ingress */}
                <circle cx="60" cy="60" r="16" className="fill-surface stroke-primary" strokeWidth="2" />
                <text x="60" y="64" textAnchor="middle" className="text-[9px] fill-current font-mono font-bold">
                  INGRESS
                </text>

                {/* Node 2: API Gateway */}
                <rect x="115" y="20" width="50" height="30" rx="6" className="fill-surface stroke-border" strokeWidth="1.5" />
                <text x="140" y="38" textAnchor="middle" className="text-[9px] fill-current font-semibold">
                  API-GW
                </text>

                {/* Node 3: Auth Service */}
                <rect x="115" y="70" width="50" height="30" rx="6" className="fill-surface stroke-border" strokeWidth="1.5" />
                <text x="140" y="88" textAnchor="middle" className="text-[9px] fill-current font-semibold">
                  AUTH
                </text>

                {/* Node 4: Aurora Database */}
                <rect x="215" y="20" width="50" height="30" rx="6" className="fill-surface stroke-border" strokeWidth="1.5" />
                <text x="240" y="38" textAnchor="middle" className="text-[9px] fill-current font-semibold">
                  AURORA
                </text>

                {/* Node 5: Redis Cache */}
                <rect x="215" y="70" width="50" height="30" rx="6" className="fill-surface stroke-border" strokeWidth="1.5" />
                <text x="240" y="88" textAnchor="middle" className="text-[9px] fill-current font-semibold">
                  REDIS
                </text>

                {/* Node 6: Payments Core */}
                <circle cx="320" cy="60" r="18" className="fill-primary/10 stroke-primary" strokeWidth="2" />
                <text x="320" y="64" textAnchor="middle" className="text-[9px] fill-primary font-mono font-bold">
                  PAYMENTS
                </text>
              </svg>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40 text-[11px] text-muted font-mono">
                <span>Topology: LIVE</span>
                <span className="text-emerald-500 font-semibold">Zero Critical Incidents</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-muted pt-4 border-t border-border/60">
          <span>&copy; {new Date().getFullYear()} ZenDev Software Technologies</span>
          <span className="font-mono text-[11px]">v3.2.0 • ISO 27001 Certified</span>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* RIGHT FORM CONTAINER (Full width on mobile, 50% / 60% on desktop) */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col justify-between p-4 sm:p-8 lg:p-12 min-h-screen overflow-y-auto">
        {/* Top Bar Utilities: Theme Toggle & Help */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto sm:max-w-xl">
          {/* Mobile-only logo */}
          <div className="lg:hidden">
            <Logo size="sm" />
          </div>
          <div className="hidden lg:block" />

          {/* Utility Tools */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                className="p-2 rounded-md hover:bg-sunken text-secondary hover:text-default transition-colors border border-border text-xs flex items-center gap-1.5"
                title="Toggle Theme"
                aria-label="Toggle Theme"
              >
                {mounted && (
                  <>
                    {theme === "dark" ? (
                      <Moon className="w-3.5 h-3.5 text-primary" />
                    ) : theme === "light" ? (
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <Laptop className="w-3.5 h-3.5 text-secondary" />
                    )}
                    <span className="capitalize hidden sm:inline">{theme || "system"}</span>
                  </>
                )}
              </button>

              {themeMenuOpen && (
                <div className="absolute right-0 mt-1 w-32 bg-surface border border-border rounded-md shadow-dropdown p-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      setTheme("light");
                      setThemeMenuOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between",
                      theme === "light" ? "bg-selected text-primary font-semibold" : "hover:bg-sunken text-default"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Sun className="w-3.5 h-3.5" /> Light
                    </span>
                    {theme === "light" && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => {
                      setTheme("dark");
                      setThemeMenuOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between",
                      theme === "dark" ? "bg-selected text-primary font-semibold" : "hover:bg-sunken text-default"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Moon className="w-3.5 h-3.5" /> Dark
                    </span>
                    {theme === "dark" && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => {
                      setTheme("system");
                      setThemeMenuOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between",
                      theme === "system" ? "bg-selected text-primary font-semibold" : "hover:bg-sunken text-default"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Laptop className="w-3.5 h-3.5" /> System
                    </span>
                    {theme === "system" && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>

            {/* Help / Docs Link */}
            <a
              href="mailto:support@gmail.com"
              className="p-2 rounded-md hover:bg-sunken text-secondary hover:text-default transition-colors text-xs flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5 text-muted" />
              <span className="hidden sm:inline">Help</span>
            </a>
          </div>
        </div>

        {/* Form Body Centered */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-6">
          {children}
        </div>

        {/* Mobile footer */}
        <div className="lg:hidden text-center text-xs text-muted pt-4 border-t border-border/40 w-full max-w-md mx-auto">
          &copy; {new Date().getFullYear()} ZenDev Software Technologies
        </div>
      </div>
    </div>
  );
}
