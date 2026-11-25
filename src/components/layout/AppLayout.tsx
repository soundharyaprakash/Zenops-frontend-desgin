"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileBottomNav } from "./MobileBottomNav";
import { ToastContainer } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AuthService } from "@/services/auth-service";
import { AlertCircle, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AUTH_PATHS = [
  "/login",
  "/register",
  "/verify-otp",
  "/forgot-password",
  "/reset-password",
  "/accept-invite",
  "/logout",
];

export function AppLayout({ children }: AppLayoutProps) {
  const rawPathname = usePathname();
  const pathname = rawPathname || "";
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const isAuthRoute = AUTH_PATHS.some(
    (path) => pathname === path || pathname?.startsWith(path + "/")
  );

  // Periodic active session validator (only runs when on protected application pages)
  useEffect(() => {
    if (isAuthRoute) return;

    const validateSession = () => {
      // Pure frontend design: active session is always preserved
      const session = AuthService.getSession();
    };

    // Check on mount and periodically every 20 seconds
    validateSession();
    const interval = setInterval(validateSession, 20000);
    return () => clearInterval(interval);
  }, [isAuthRoute]);

  const handleSignInAgain = () => {
    setSessionExpired(false);
    AuthService.clearSession();
    const nextParam = pathname && pathname !== "/" && pathname !== "/login" ? `?next=${encodeURIComponent(pathname)}` : "";
    router.push(`/login${nextParam}${nextParam ? "&" : "?"}banner=session-expired`);
  };

  // If on an auth route, bypass app shell (sidebar & header)
  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-app text-foreground font-sans antialiased">
        {children}
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app text-foreground font-sans antialiased flex selection:bg-primary/20">
      {/* Sidebar - fixed left navigation */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Viewport */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out w-full",
          collapsed ? "lg:pl-16" : "lg:pl-64 xl:pl-72"
        )}
      >
        {/* Top Header Navigation */}
        <Header
          collapsed={collapsed}
          onOpenMobileSidebar={() => setMobileOpen(true)}
        />

        {/* Page Content Viewport */}
        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 pb-24 sm:pb-24 lg:pb-6 min-w-0 overflow-x-hidden">
          <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto space-y-5 w-full min-w-0">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Hidden on lg+ desktops & auth routes) */}
      <MobileBottomNav onOpenMore={() => setMobileOpen(true)} />

      {/* Session Expired Safeguard Modal */}
      <Modal
        isOpen={sessionExpired}
        onClose={() => {}}
        title="Session Expired"
        description="Your security session has ended"
        maxWidth="sm"
      >
        <div className="p-5 space-y-4 text-foreground">
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-foreground">Authentication Expired</p>
              <p className="text-secondary leading-relaxed">
                For security reasons, your active session has expired. Please sign in again to continue your work without losing state.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<LogIn className="w-4 h-4" />}
              onClick={handleSignInAgain}
              className="w-full sm:w-auto"
            >
              Sign In Again
            </Button>
          </div>
        </div>
      </Modal>

      {/* Global Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

