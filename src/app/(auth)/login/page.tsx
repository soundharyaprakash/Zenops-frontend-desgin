import React, { Suspense } from "react";
import { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "ZenOps",
  description: "Sign in to access your ZenOps Service Management and CMDB workspace.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-text-muted">Loading sign in...</div>}>
      <LoginForm />
    </Suspense>
  );
}
