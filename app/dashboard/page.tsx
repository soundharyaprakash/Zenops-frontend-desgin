import { Metadata } from "next";
import { CMDBDashboardView } from "@/components/cmdb/CMDBDashboardView";

export const metadata: Metadata = {
  title: "ZenOps",
  description: "Configuration Management Database Health Dashboard",
};

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return <CMDBDashboardView />;
}

