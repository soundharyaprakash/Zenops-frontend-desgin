import React from "react";
import { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password – ZenOps CMDB",
  description: "Request a password reset code for your ZenOps CMDB account.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
