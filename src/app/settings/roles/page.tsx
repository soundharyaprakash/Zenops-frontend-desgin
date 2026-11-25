import { redirect } from "next/navigation";

/**
 * Legacy /settings/roles route redirects to the centralized
 * Security & Access Control System Roles view (/settings/security/roles)
 * to avoid duplicate stale role definitions.
 */
export default function RolesSettingsPage() {
  redirect("/settings/security/roles");
}
