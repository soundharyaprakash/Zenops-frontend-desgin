import { Metadata } from "next";
import { ClassHierarchyView } from "@/components/cmdb/settings/ClassHierarchyView";

export const metadata: Metadata = {
  title: "Class Hierarchy & Schema | ZenOps CMDB",
  description: "ServiceNow-compatible CI class hierarchy, object inheritance, and schema designer.",
};

export default function ClassHierarchyPage() {
  return <ClassHierarchyView />;
}
