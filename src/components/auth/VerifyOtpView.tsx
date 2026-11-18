"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthService } from "@/services/auth-service";
import { cn } from "@/lib/utils";

export function VerifyOtpView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const flow = (searchParams.get("flow") as "register" | "reset") || "register";
  const email = searchParams.get("email") || "user@gmail.com";

  // 6 separate digit inputs
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isSuccess, setIsSuccess] = useState(false);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer for Resend Code
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Mask email for display: e.g. sarah.jenkins@zenops.io -> s***s@zenops.io
  const maskedEmail = (raw: string) => {
    if (!raw.includes("@")) return raw;
    const [local, domain] = raw.split("@");
    if (local.length <= 2) return `${local.charAt(0)}***@${domain}`;
    return `${local.charAt(0)}***${local.charAt(local.length - 1)}@${domain}`;
  };

  const handleDigitChange = (index: number, val: string) => {
    // Only accept numeric characters
    const char = val.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setErrorMessage("");

    // Auto-advance to next input if digit entered
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits entered
    if (char && index === 5 && newDigits.every((d) => d !== "")) {
      executeVerify(newDigits.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Move back and clear previous
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = "";
        setDigits(newDigits);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setDigits(newDigits);

    if (pasted.length === 6) {
      inputRefs.current[5]?.focus();
      executeVerify(pasted);
    } else {
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const executeVerify = async (otpCode: string) => {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await AuthService.verifyOtp({
        email,
        otp: otpCode,
        flow,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Invalid verification code.");
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);

      // Transition after brief confirmation animation
      setTimeout(() => {
        if (flow === "register") {
          router.push("/login?banner=verified");
        } else {
          router.push(res.redirectUrl || `/reset-password?email=${encodeURIComponent(email)}&token=verified`);
        }
      }, 1200);
    } catch {
      setErrorMessage("Could not verify OTP. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length !== 6) {
      setErrorMessage("Please enter the full 6-digit verification code.");
      return;
    }
    executeVerify(code);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setDigits(["", "", "", "", "", ""]);
    setErrorMessage("");
    setResendCooldown(60);
    inputRefs.current[0]?.focus();

    await AuthService.resendOtp(email, flow);
  };

  const handleAutoFillDemo = () => {
    const demoCode = "123456";
    setDigits(demoCode.split(""));
    executeVerify(demoCode);
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------- */}
      {/* HEADER */}
      {/* ------------------------------------------------------------------- */}
      <div className="text-center sm:text-left space-y-2">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto sm:mx-0 border border-primary/20">
          <Mail className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-default">
          Check your email
        </h2>
        <p className="text-sm text-secondary leading-relaxed">
          We sent a 6-digit confirmation code to{" "}
          <span className="font-semibold text-default font-mono">{maskedEmail(email)}</span>.
        </p>
        <div>
          <Link
            href={flow === "register" ? "/register" : "/forgot-password"}
            className="text-xs text-primary font-semibold hover:underline"
          >
            Change email address &rarr;
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* SUCCESS CONFIRMATION */}
      {/* ------------------------------------------------------------------- */}
      {isSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-600 dark:text-emerald-400 animate-in zoom-in-95 duration-200">
          <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm">Code verified successfully!</p>
            <p className="text-xs opacity-90">Redirecting to {flow === "register" ? "sign in" : "password reset"}...</p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* ERROR MESSAGE */}
      {/* ------------------------------------------------------------------- */}
      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-danger/10 border border-danger/30 flex items-start gap-2.5 text-xs text-danger animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="font-semibold">{errorMessage}</p>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 6-DIGIT OTP INPUT FORM */}
      {/* ------------------------------------------------------------------- */}
      {!isSuccess && (
        <form onSubmit={handleManualSubmit} className="space-y-5">
          <div className="flex justify-between gap-2 sm:gap-2.5">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                className={cn(
                  "w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-mono font-bold rounded-lg border bg-surface transition-all focus:outline-none focus:ring-2",
                  digit
                    ? "border-primary text-primary bg-selected/20 focus:ring-primary"
                    : "border-border text-default focus:border-primary focus:ring-primary"
                )}
                aria-label={`Digit ${idx + 1}`}
              />
            ))}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            disabled={digits.some((d) => d === "")}
            className="w-full text-sm font-semibold justify-center h-10 shadow-xs"
          >
            Confirm Verification Code
          </Button>

          {/* Resend Code Section */}
          <div className="flex items-center justify-between text-xs text-secondary pt-1">
            <span>Didn&apos;t receive the code?</span>
            {resendCooldown > 0 ? (
              <span className="font-mono text-muted">
                Resend in {resendCooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resend Code</span>
              </button>
            )}
          </div>
        </form>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* DEV HELPER: AUTO-FILL DEMO CODE */}
      {/* ------------------------------------------------------------------- */}
      <div className="border border-border/80 rounded-lg p-3 bg-sunken/40 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-muted font-medium">Demo Testing Code: <strong className="font-mono text-default">123456</strong></span>
        </div>
        <button
          type="button"
          onClick={handleAutoFillDemo}
          className="font-semibold text-primary hover:underline"
        >
          Auto-fill &rarr;
        </button>
      </div>

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
