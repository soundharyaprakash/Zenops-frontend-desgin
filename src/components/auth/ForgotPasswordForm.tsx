"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthService } from "@/services/auth-service";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid work email address.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const res = await AuthService.requestPasswordReset(email);
      if (!res.success) {
        setErrorMessage(res.error || "Could not process password reset request.");
        setIsSubmitting(false);
        return;
      }

      // Redirect to OTP verification with flow=reset
      router.push(`/verify-otp?flow=reset&email=${encodeURIComponent(email)}`);
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
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-default">
          Reset your password
        </h2>
        <p className="text-sm text-secondary leading-relaxed">
          Enter the email address associated with your ZenOps account. We will dispatch a 6-digit verification code to reset your password.
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
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-default uppercase tracking-wider block">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. alex.chen@gmail.com"
            required
            autoComplete="email"
            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-default placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          rightIcon={<ArrowRight className="w-4 h-4" />}
          className="w-full text-sm font-semibold justify-center h-10 shadow-xs"
        >
          Send Verification Code
        </Button>
      </form>

      {/* Return to Sign in */}
      <div className="text-center text-xs text-secondary pt-2 border-t border-border/60">
        <Link
          href="/login"
          className="font-medium text-secondary hover:text-default transition-colors flex items-center justify-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign in</span>
        </Link>
      </div>
    </div>
  );
}
