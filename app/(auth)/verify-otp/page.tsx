import React, { Suspense } from "react";
import { Metadata } from "next";
import { VerifyOtpView } from "@/components/auth/VerifyOtpView";

export const metadata: Metadata = {
  title: "Verify Security Code – ZenOps CMDB",
  description: "Verify your email address or password reset request with your 6-digit code.",
};

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-text-muted">Loading verification...</div>}>
      <VerifyOtpView />
    </Suspense>
  );
}
