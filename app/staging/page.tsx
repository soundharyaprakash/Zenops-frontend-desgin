import { Metadata } from "next";
import { StagingView } from "@/components/cmdb/StagingView";

export const metadata: Metadata = {
  title: "ZenOps",
  description: "Raw discovery payload ingestion buffer and staging pipeline.",
};

export default function StagingPage() {
  return <StagingView />;
}
