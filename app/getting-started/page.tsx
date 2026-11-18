import { Metadata } from "next";
import { GettingStartedView } from "@/components/cmdb/GettingStartedView";

export const metadata: Metadata = {
  title: "ZenOps",
  description: "Guided 6-step setup roadmap for the ZenOps CMDB platform.",
};

export default function GettingStartedPage() {
  return <GettingStartedView />;
}
