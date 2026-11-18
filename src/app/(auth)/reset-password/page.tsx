import React, { Suspense } from "react";
import { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set New Password – ZenOps CMDB",
  description: "Set a new secure password for your ZenOps CMDB account.",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-text-muted">Loading reset password...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
