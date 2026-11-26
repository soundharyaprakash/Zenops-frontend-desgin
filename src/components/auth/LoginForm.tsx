"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LogIn,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Lozenge } from "@/components/ui/Lozenge";
import { AuthService } from "@/services/auth-service";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextUrl = searchParams.get("next") || "/dashboard";
  const bannerParam = searchParams.get("banner");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [capsLockActive, setCapsLockActive] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSocialSubmitting, setIsSocialSubmitting] = useState<"google" | "microsoft" | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState(false);

  // Lockout countdown state
  const [lockedRemainingSec, setLockedRemainingSec] = useState<number | null>(null);

  // Dev demo helper box
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);
  const demoAccounts = AuthService.getDemoAccounts();

  // Handle countdown interval if account is locked
  useEffect(() => {
    if (lockedRemainingSec === null || lockedRemainingSec <= 0) return;
    const interval = setInterval(() => {
      setLockedRemainingSec((prev) => {
        if (!prev || prev <= 1) {
          clearInterval(interval);
          setErrorMessage("");
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedRemainingSec]);

  // Caps lock detection on password field
  const handlePasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState("CapsLock"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setUnverifiedEmail(false);
    setIsSubmitting(true);

    try {
      const targetEmail = email.trim() || "admin@gmail.com";
      const targetPassword = password || "Password@123";

      await AuthService.login({
        email: targetEmail,
        password: targetPassword,
        rememberMe,
      });

      // Pure frontend design demo: always go inside directly to nextUrl or dashboard
      const targetDestination =
        nextUrl && nextUrl !== "/" && nextUrl !== "/login" ? nextUrl : "/dashboard";
      window.location.href = targetDestination;
    } catch {
      const targetDestination =
        nextUrl && nextUrl !== "/" && nextUrl !== "/login" ? nextUrl : "/dashboard";
      window.location.href = targetDestination;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "microsoft") => {
    setIsSocialSubmitting(provider);
    setErrorMessage("");
    try {
      await AuthService.socialLogin(provider);
      const targetDestination =
        nextUrl && nextUrl !== "/" && nextUrl !== "/login" ? nextUrl : "/dashboard";
      window.location.href = targetDestination;
    } catch {
      const targetDestination =
        nextUrl && nextUrl !== "/" && nextUrl !== "/login" ? nextUrl : "/dashboard";
      window.location.href = targetDestination;
    } finally {
      setIsSocialSubmitting(null);
    }
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage("");
    setUnverifiedEmail(false);
  };

  const handleResendAndVerify = async () => {
    await AuthService.resendOtp(email, "register");
    router.push(`/verify-otp?flow=register&email=${encodeURIComponent(email)}`);
  };

  const formatLockTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------- */}
      {/* HEADER */}
      {/* ------------------------------------------------------------------- */}
      <div className="space-y-1.5 text-center sm:text-left">
        <h2 className="text-2xl font-bold tracking-tight text-default">
          Sign in to your account
        </h2>
        <p className="text-sm text-secondary">
          Enter your work email and password to access the CMDB workspace
        </p>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* QUERY PARAM NOTIFICATION BANNERS */}
      {/* ------------------------------------------------------------------- */}
      {bannerParam === "verified" && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Email verified successfully.</p>
            <p className="mt-0.5 opacity-90">Please sign in with your credentials to access your workspace.</p>
          </div>
        </div>
      )}

      {bannerParam === "password-updated" && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Password updated successfully.</p>
            <p className="mt-0.5 opacity-90">Please sign in with your newly configured password.</p>
          </div>
        </div>
      )}

      {bannerParam === "signed-out" && (
        <div className="p-3.5 rounded-lg bg-primary/10 border border-primary/20 flex items-start gap-2.5 text-xs text-primary">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">You have been signed out.</p>
            <p className="mt-0.5 opacity-90">Your session was closed safely. Sign in anytime to resume.</p>
          </div>
        </div>
      )}

      {bannerParam === "session-expired" && (
        <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Session expired.</p>
            <p className="mt-0.5 opacity-90">For security your session has ended. Please sign in again.</p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* ERROR & LOCKOUT ALERTS */}
      {/* ------------------------------------------------------------------- */}
      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-danger/10 border border-danger/30 flex items-start gap-2.5 text-xs text-danger animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <p className="font-semibold">{errorMessage}</p>
            {lockedRemainingSec !== null && (
              <p className="font-mono text-xs font-bold text-danger">
                Lock release countdown: {formatLockTime(lockedRemainingSec)}
              </p>
            )}
            {unverifiedEmail && (
              <div className="pt-2">
                <Button
                  size="xs"
                  variant="primary"
                  onClick={handleResendAndVerify}
                  className="text-xs"
                >
                  Verify your email now &rarr;
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* FRONTEND DEMO NOTICE */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-brand-blue flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-text-default">Pure Frontend Prototype</p>
          <p className="text-text-secondary mt-0.5">
            Enna credential kuduthalum ullam pogum — enter any email & password, or click Sign In directly.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* LOGIN FORM */}
      {/* ------------------------------------------------------------------- */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-default uppercase tracking-wider block">
            Email Address / Username
          </label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. admin@gmail.com or any username"
            autoComplete="username"
            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-default placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-default uppercase tracking-wider block">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handlePasswordKey}
              onKeyUp={handlePasswordKey}
              placeholder="Enter any password"
              autoComplete="current-password"
              className="w-full bg-surface border border-border rounded-md px-3 py-2 pr-10 text-sm text-default placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-default transition-colors p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Caps Lock Warning */}
          {capsLockActive && (
            <p className="text-[11px] text-amber-500 font-medium flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3" /> Caps Lock is ON
            </p>
          )}
        </div>

        {/* Remember Me */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-secondary">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            <span>Remember this device for 30 days</span>
          </label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          className="w-full text-sm font-semibold justify-center h-10 shadow-xs"
        >
          Sign In &rarr;
        </Button>
      </form>

      {/* ------------------------------------------------------------------- */}
      {/* SOCIAL SSO PROVIDERS (Active Demo Access) */}
      {/* ------------------------------------------------------------------- */}
      <div className="space-y-3 pt-2">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative bg-app px-3 text-[11px] uppercase tracking-wider text-muted font-semibold">
            or continue with
          </div>
        </div>

        <div className="space-y-2">
          {/* Google SSO */}
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => handleSocialLogin("google")}
            disabled={isSocialSubmitting !== null || isSubmitting}
            className="w-full justify-center gap-2.5 cursor-pointer group"
          >
            {isSocialSubmitting === "google" ? (
              <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span className="font-medium text-default">Continue with Google</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold ml-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              Active Access
            </span>
          </Button>

          {/* Microsoft SSO */}
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => handleSocialLogin("microsoft")}
            disabled={isSocialSubmitting !== null || isSubmitting}
            className="w-full justify-center gap-2.5 cursor-pointer group"
          >
            {isSocialSubmitting === "microsoft" ? (
              <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 transition-transform group-hover:scale-110" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
            )}
            <span className="font-medium text-default">Continue with Microsoft</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold ml-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              Active Access
            </span>
          </Button>

          {/* Enterprise SSO (SAML/OIDC) Placeholder */}
          <button
            type="button"
            disabled
            className="w-full flex items-center justify-center gap-2.5 px-3 py-2 rounded-md border border-border bg-surface text-secondary text-xs font-semibold opacity-60 cursor-not-allowed hover:bg-surface"
            title="Enterprise Single Sign-On via SAML 2.0 / OIDC with SCIM 2.0 directory group provisioning."
          >
            <Lock className="w-3.5 h-3.5 text-muted" />
            <span>SSO (SAML / OIDC)</span>
            <span className="text-[10px] text-muted font-normal">(Enterprise IdP)</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* SIGN UP REDIRECT */}
      {/* ------------------------------------------------------------------- */}
      <div className="text-center text-xs text-secondary pt-2 border-t border-border/60">
        New to ZenOps?{" "}
        <Link
          href="/register"
          className="font-semibold text-primary hover:underline transition-colors"
        >
          Create account &rarr;
        </Link>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* DEV HELPER: DEMO ACCOUNTS QUICK-FILL */}
      {/* ------------------------------------------------------------------- */}
      <div className="border border-border/80 rounded-lg p-3 bg-sunken/40 space-y-2">
        <button
          type="button"
          onClick={() => setShowDemoAccounts(!showDemoAccounts)}
          className="w-full flex items-center justify-between text-xs font-semibold text-secondary hover:text-default transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Developer Demo Accounts (1-Click Fill)</span>
          </span>
          <ChevronDown
            className={cn("w-3.5 h-3.5 transition-transform", showDemoAccounts && "rotate-180")}
          />
        </button>

        {showDemoAccounts && (
          <div className="pt-2 space-y-1.5 border-t border-border/60 animate-in fade-in duration-100">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => handleFillDemo(account.email, account.password)}
                className="w-full text-left p-2 rounded-md hover:bg-surface border border-transparent hover:border-border text-xs transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-default">{account.name}</p>
                  <p className="text-[11px] text-muted font-mono">{account.email}</p>
                </div>
                <Lozenge
                  variant={
                    account.role.includes("Admin")
                      ? "info"
                      : account.role.includes("Owner")
                      ? "success"
                      : "neutral"
                  }
                  size="xs"
                >
                  {account.role.split(" ")[0]}
                </Lozenge>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
