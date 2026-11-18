"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UserCheck,
  Building2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Lozenge } from "@/components/ui/Lozenge";
import { AuthService } from "@/services/auth-service";

export function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token") || "INV_DEMO_99";
  const emailParam = searchParams.get("email") || "teammate@gmail.com";
  const tenantParam = searchParams.get("tenant") || "ZenDev Software Technologies";
  const roleParam = searchParams.get("role") || "Editor";

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (password.length < 10) {
      setErrorMessage("Password must be at least 10 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await AuthService.acceptInvite({
        token,
        email: emailParam,
        name,
        password,
        confirmPassword,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Could not accept workspace invitation.");
        setIsSubmitting(false);
        return;
      }

      router.push("/login?banner=verified");
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
          <UserCheck className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-default">
          Join your CMDB workspace
        </h2>
        <p className="text-sm text-secondary leading-relaxed">
          You have been invited to collaborate on Configuration Items, Topology, and Attestations.
        </p>

        {/* Workspace & Role Card */}
        <div className="p-3.5 rounded-lg bg-sunken border border-border flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-default">{tenantParam}</span>
          </div>
          <Lozenge variant="info" size="sm">
            Role: {roleParam}
          </Lozenge>
        </div>
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
        {/* Email Read-only */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-default uppercase tracking-wider block">
            Work Email
          </label>
          <input
            type="email"
            value={emailParam}
            readOnly
            className="w-full bg-sunken border border-border/80 rounded-md px-3 py-2 text-sm text-muted cursor-not-allowed select-none font-mono"
          />
        </div>

        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-default uppercase tracking-wider block">
            Your Full Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Maya Lin"
            required
            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-default placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-default uppercase tracking-wider block">
            Set Password *
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 10 characters"
              required
              className="w-full bg-surface border border-border rounded-md px-3 py-2 pr-10 text-sm text-default placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-default transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-default uppercase tracking-wider block">
            Confirm Password *
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            required
            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-default placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          rightIcon={<ArrowRight className="w-4 h-4" />}
          className="w-full text-sm font-semibold justify-center h-10 mt-2 shadow-xs"
        >
          Accept Invitation & Join
        </Button>
      </form>

      {/* Return to Sign in */}
      <div className="text-center text-xs text-secondary pt-2 border-t border-border/60">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary hover:underline transition-colors"
        >
          Sign in &rarr;
        </Link>
      </div>
    </div>
  );
}
