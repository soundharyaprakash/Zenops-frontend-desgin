import React from "react";
import { Metadata } from "next";
import { RegisterStepper } from "@/components/auth/RegisterStepper";

export const metadata: Metadata = {
  title: "Create Account – ZenOps CMDB",
  description: "Create your ZenOps CMDB account and configure your organization's workspace.",
};

export default function RegisterPage() {
  return <RegisterStepper />;
}
