import { Metadata } from "next";
import { RolesPermissionsView } from "@/components/cmdb/settings/RolesPermissionsView";

export const metadata: Metadata = {
  title: "Role Permissions Matrix | ZenOps CMDB",
  description: "Governance authority and RBAC permissions matrix for Viewer, Editor, CMDB Owner, and Admin.",
};

export default function RolesSettingsPage() {
  return <RolesPermissionsView />;
}
