import React, { Suspense } from "react";
import { Metadata } from "next";
import { AcceptInviteForm } from "@/components/auth/AcceptInviteForm";

export const metadata: Metadata = {
  title: "Accept Workspace Invitation – ZenOps CMDB",
  description: "Join your team's ZenOps CMDB workspace.",
};

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-text-muted">Loading invite...</div>}>
      <AcceptInviteForm />
    </Suspense>
  );
}
