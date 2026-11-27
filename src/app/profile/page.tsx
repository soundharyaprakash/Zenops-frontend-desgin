import { UserProfileView } from "@/components/profile/UserProfileView";

export const metadata = {
  title: "User Profile & Identity | ZenOps CMDB",
  description: "View and manage user profile details, enterprise RBAC role scopes, and demo personas.",
};

export default function ProfilePage() {
  return <UserProfileView />;
}
