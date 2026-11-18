import { Metadata } from "next";
import { BusinessServicesView } from "@/components/cmdb/BusinessServicesView";

export const metadata: Metadata = {
  title: "ZenOps",
  description: "Enterprise Business Service catalog, aggregated trust scores, and revenue impact.",
};

export default function ServicesPage() {
  return <BusinessServicesView />;
}
