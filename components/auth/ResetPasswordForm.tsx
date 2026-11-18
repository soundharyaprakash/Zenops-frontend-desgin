"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LockKeyhole,
  Check,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthService } from "@/services/auth-service";
import { cn } from "@/lib/utils";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Live password validation checklist
  const passwordRules = useMemo(() => {
    const emailPrefix = email.includes("@") ? email.split("@")[0].toLowerCase() : "";
    return {
      minLength: newPassword.length >= 10,
      hasUpper: /[A-Z]/.test(newPassword),
      hasLower: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecial: /[^A-Za-z0-9]/.test(newPassword),
      notContainsEmail: !emailPrefix || !newPassword.toLowerCase().includes(emailPrefix),
    };
  }, [newPassword, email]);

  const passwordScore = useMemo(() => {
    return Object.values(passwordRules).filter(Boolean).length;
  }, [passwordRules]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email) {
      setErrorMessage("Missing email verification context. Please restart reset request.");
      return;
    }
    if (passwordScore < 6) {
      setErrorMessage("New password does not meet all complexity requirements.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await AuthService.resetPassword({
        email,
        resetToken: token,
        newPassword,
        confirmPassword,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to update password.");
        setIsSubmitting(false);
        return;
      }

      // Success -> Redirect to /login with password-updated banner
      router.push("/login?banner=password-updated");
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center sm:text-left space-y-2">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto sm:mx-0 border border-primary/20">
          <LockKeyhole className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-default">
          Set a new password
        </h2>
        <p className="text-sm text-secondary leading-relaxed">
          Your security code was confirmed. Choose a strong, new password for{" "}
          <span className="font-semibold text-default font-mono">{email}</span>.
        </p>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-danger/10 border border-danger/30 flex items-start gap-2.5 text-xs text-danger animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="font-semibold">{errorMessage}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-default uppercase tracking-wider block">
            New Password *
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 10 characters"
              required
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

          {/* Strength Checklist */}
          {newPassword.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all",
                    passwordScore <= 2
                      ? "bg-danger"
                      : passwordScore <= 4
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  )}
                />
                <div
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all",
                    passwordScore >= 4 ? (passwordScore === 6 ? "bg-emerald-500" : "bg-amber-500") : "bg-sunken"
                  )}
                />
                <div
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all",
                    passwordScore === 6 ? "bg-emerald-500" : "bg-sunken"
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-1 text-[11px] p-2.5 rounded-md bg-sunken/60 border border-border/60">
                <div className="flex items-center gap-1.5">
                  {passwordRules.minLength ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-muted/50" />
                  )}
                  <span className={cn(passwordRules.minLength ? "text-default font-medium" : "text-muted")}>
                    Min 10 characters
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {passwordRules.hasUpper ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-muted/50" />
                  )}
                  <span className={cn(passwordRules.hasUpper ? "text-default font-medium" : "text-muted")}>
                    Uppercase letter
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {passwordRules.hasLower ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-muted/50" />
                  )}
                  <span className={cn(passwordRules.hasLower ? "text-default font-medium" : "text-muted")}>
                    Lowercase letter
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {passwordRules.hasNumber ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-muted/50" />
                  )}
                  <span className={cn(passwordRules.hasNumber ? "text-default font-medium" : "text-muted")}>
                    Number (0-9)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {passwordRules.hasSpecial ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-muted/50" />
                  )}
                  <span className={cn(passwordRules.hasSpecial ? "text-default font-medium" : "text-muted")}>
                    Special character
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {passwordRules.notContainsEmail ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-muted/50" />
                  )}
                  <span className={cn(passwordRules.notContainsEmail ? "text-default font-medium" : "text-muted")}>
                    No email words
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-default uppercase tracking-wider block">
            Confirm New Password *
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            required
            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-default placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
          {confirmPassword.length > 0 && newPassword !== confirmPassword && (
            <p className="text-[11px] text-danger font-medium mt-1">Passwords do not match.</p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          disabled={passwordScore < 6 || newPassword !== confirmPassword}
          className="w-full text-sm font-semibold justify-center h-10 mt-2 shadow-xs"
        >
          Update Password & Sign In
        </Button>
      </form>

      {/* Return to Sign in */}
      <div className="text-center text-xs text-secondary pt-2 border-t border-border/60">
        <Link
          href="/login"
          className="text-muted hover:text-default transition-colors"
        >
          &larr; Back to Sign in
        </Link>
      </div>
    </div>
  );
}
