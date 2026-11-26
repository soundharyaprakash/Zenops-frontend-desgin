"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Building2,
  Check,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthService } from "@/services/auth-service";
import { RegisterData } from "@/types/auth";
import { cn } from "@/lib/utils";

const PERSONAL_EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com"];

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"] as const;
const ROLES = ["IT Manager", "DevOps/SRE", "CTO/Founder", "Service Desk Lead", "Other"] as const;
const PRIMARY_GOALS = [
  "Impact analysis",
  "Change risk",
  "Incident triage",
  "Compliance/audit",
  "Asset visibility",
];

export function RegisterStepper() {
  const router = useRouter();

  // Current Step: 1 = Account, 2 = Workspace
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Account State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Step 2: Workspace State
  const [companyName, setCompanyName] = useState("");
  const [companySize, setCompanySize] = useState<typeof COMPANY_SIZES[number]>("11-50");
  const [role, setRole] = useState<typeof ROLES[number]>("DevOps/SRE");
  const [primaryGoals, setPrimaryGoals] = useState<string[]>(["Impact analysis", "Asset visibility"]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSocialSubmitting, setIsSocialSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  // Soft personal email warning
  const isPersonalEmail = useMemo(() => {
    if (!email.includes("@")) return false;
    const domain = email.split("@")[1]?.toLowerCase();
    return PERSONAL_EMAIL_DOMAINS.includes(domain);
  }, [email]);

  // Live password validation checklist
  const passwordRules = useMemo(() => {
    const emailPrefix = email.includes("@") ? email.split("@")[0].toLowerCase() : "";
    return {
      minLength: password.length >= 10,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
      notContainsEmail: !emailPrefix || !password.toLowerCase().includes(emailPrefix),
    };
  }, [password, email]);

  const passwordScore = useMemo(() => {
    const rules = Object.values(passwordRules);
    const passed = rules.filter(Boolean).length;
    return passed;
  }, [passwordRules]);

  const isPasswordValid = passwordScore === 6 && password === confirmPassword;

  // Toggle goal multi-select chip
  const toggleGoal = (goal: string) => {
    setPrimaryGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  // Step 1 -> Step 2 transition
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please provide a valid email address (e.g. name@gmail.com).");
      return;
    }
    if (passwordScore < 6) {
      setErrorMessage("Password does not meet all security criteria.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (!agreeToTerms) {
      setErrorMessage("You must accept the Terms of Service and Privacy Policy to continue.");
      return;
    }

    // Auto-populate company name from email if empty
    if (!companyName && email.includes("@")) {
      const userPrefix = email.split("@")[0].replace(/[._-]/g, " ");
      const capitalized = userPrefix.charAt(0).toUpperCase() + userPrefix.slice(1);
      setCompanyName(`${capitalized}'s Workspace`);
    }

    setStep(2);
  };

  // Step 2 Final Submission
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setAlreadyRegistered(false);

    if (!companyName.trim()) {
      setErrorMessage("Please provide your company or workspace name.");
      return;
    }
    if (primaryGoals.length === 0) {
      setErrorMessage("Please select at least one primary goal.");
      return;
    }

    setIsSubmitting(true);

    const payload: RegisterData = {
      name,
      email,
      password,
      confirmPassword,
      agreeToTerms,
      companyName,
      companySize,
      role,
      primaryGoals,
    };

    try {
      const res = await AuthService.register(payload);

      if (!res.success) {
        setErrorMessage(res.error || "Registration failed.");
        if (res.error?.includes("already registered")) {
          setAlreadyRegistered(true);
        }
        setIsSubmitting(false);
        return;
      }

      // Success: redirect to OTP verification screen
      router.push(`/verify-otp?flow=register&email=${encodeURIComponent(email)}`);
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------- */}
      {/* STEP PROGRESS HEADER */}
      {/* ------------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-primary font-bold">
            Step {step} of 2: {step === 1 ? "Account Credentials" : "Workspace Setup"}
          </span>
          <span className="text-muted">
            {step === 1 ? "50% Completed" : "Almost Done"}
          </span>
        </div>

        {/* Brand Gradient Stepper Progress Bar */}
        <div className="w-full h-1.5 bg-sunken rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full bg-gradient-to-r from-brand-500 via-brand-cyan to-brand-mint transition-all duration-300 ease-out",
              step === 1 ? "w-1/2" : "w-full"
            )}
          />
        </div>

        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-bold tracking-tight text-default">
            {step === 1 ? "Create your ZenOps account" : "Configure your CMDB workspace"}
          </h2>
          <p className="text-sm text-secondary mt-1">
            {step === 1
              ? "Get started with enterprise topology mapping and impact analysis"
              : "Tell us about your organization to set up your isolated tenant"}
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* ERROR ALERT */}
      {/* ------------------------------------------------------------------- */}
      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-danger/10 border border-danger/30 flex items-start gap-2.5 text-xs text-danger animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">{errorMessage}</p>
            {alreadyRegistered && (
              <p className="pt-1">
                <Link
                  href="/login"
                  className="font-bold underline text-danger hover:text-danger/80"
                >
                  Click here to sign in instead &rarr;
                </Link>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* STEP 1: ACCOUNT DETAILS */}
      {/* ------------------------------------------------------------------- */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Quick 1-Click Google Access */}
          <div className="space-y-3 pb-1">
            <button
              type="button"
              disabled={isSocialSubmitting || isSubmitting}
              onClick={async () => {
                setIsSocialSubmitting(true);
                try {
                  await AuthService.socialLogin("google");
                  window.location.href = "/dashboard";
                } catch {
                  window.location.href = "/dashboard";
                } finally {
                  setIsSocialSubmitting(false);
                }
              }}
              className="w-full flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-md border border-border bg-surface text-default text-xs font-semibold hover:bg-surface-hover hover:border-primary/50 hover:shadow-xs active:scale-[0.99] transition-all cursor-pointer group"
            >
              {isSocialSubmitting ? (
                <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span>Continue with Google (@gmail.com)</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold ml-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Direct Access
              </span>
            </button>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative bg-app px-3 text-[11px] uppercase tracking-wider text-muted font-semibold">
                or register with email
              </div>
            </div>
          </div>

          <form onSubmit={handleProceedToStep2} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-default uppercase tracking-wider block">
                Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                required
                className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-default placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-default uppercase tracking-wider block">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. alex.chen@gmail.com"
                required
                className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-default placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />

              {email.toLowerCase().includes("@gmail.com") && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 mt-1 bg-emerald-500/10 p-1.5 rounded border border-emerald-500/20">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Gmail address detected — Google Workspace instant access enabled</span>
                </p>
              )}
            </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-default uppercase tracking-wider block">
              Create Password *
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
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Live Password Strength Meter */}
            {password.length > 0 && (
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
                  <span className="text-[10px] font-mono text-muted pl-1">
                    {passwordScore <= 2 ? "Weak" : passwordScore <= 4 ? "Fair" : "Strong"}
                  </span>
                </div>

                {/* Password Rule Checklist */}
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
                      Symbol (!@#$)
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
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="text-[11px] text-danger font-medium mt-1">Passwords do not match.</p>
            )}
          </div>

          {/* Agreement Checkbox */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-secondary leading-relaxed">
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                required
                className="rounded border-border text-primary focus:ring-primary h-4 w-4 mt-0.5"
              />
              <span>
                I agree to the ZenOps{" "}
                <a href="#terms" className="text-primary hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#privacy" className="text-primary hover:underline">
                  Privacy Policy
                </a>
                .
              </span>
            </label>
          </div>

          {/* Continue Button */}
          <Button
            type="submit"
            variant="primary"
            size="md"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full text-sm font-semibold justify-center h-10 mt-2 shadow-xs"
          >
            Continue to Workspace Setup
          </Button>
        </form>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* STEP 2: WORKSPACE SETUP */}
      {/* ------------------------------------------------------------------- */}
      {step === 2 && (
        <form onSubmit={handleFinalSubmit} className="space-y-4 animate-in fade-in duration-200">
          {/* Company Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-default uppercase tracking-wider block">
              Company / Workspace Name *
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corp / SpaceZen"
              required
              className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-default placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          {/* Company Size */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-default uppercase tracking-wider block">
              Company Size
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {COMPANY_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setCompanySize(size)}
                  className={cn(
                    "py-2 px-1 text-xs font-semibold rounded-md border text-center transition-all",
                    companySize === size
                      ? "bg-selected text-primary border-primary shadow-xs"
                      : "bg-surface border-border text-secondary hover:border-border-strong hover:bg-sunken"
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Your Role */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-default uppercase tracking-wider block">
              Your Professional Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof ROLES[number])}
              className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-default focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Primary CMDB Goals (Multi-select chips) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-default uppercase tracking-wider block">
              Primary CMDB Goals (Select all that apply)
            </label>
            <div className="flex flex-wrap gap-2">
              {PRIMARY_GOALS.map((goal) => {
                const isSelected = primaryGoals.includes(goal);
                return (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => toggleGoal(goal)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5",
                      isSelected
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "bg-surface text-secondary border-border hover:border-border-strong hover:bg-sunken"
                    )}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    <span>{goal}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Admin Role Notice Banner */}
          <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2.5 text-xs text-secondary">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p>
              As the founding workspace registrant, you will be assigned the <strong>CMDB Admin</strong> role with full authority over reconciliation rules, cloud discovery, and user invites.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => setStep(1)}
              className="flex-1 text-sm font-semibold justify-center h-10"
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              className="flex-1 text-sm font-semibold justify-center h-10 shadow-xs"
            >
              Create Account
            </Button>
          </div>
        </form>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SIGN IN FOOTER */}
      {/* ------------------------------------------------------------------- */}
      <div className="text-center text-xs text-secondary pt-2 border-t border-border/60">
        Already have a ZenOps workspace?{" "}
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
