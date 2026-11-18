import { Metadata } from "next";
import { TrustScoreSettingsView } from "@/components/cmdb/settings/TrustScoreSettingsView";

export const metadata: Metadata = {
  title: "Trust Score Settings | ZenOps CMDB",
  description: "Configure 5-pillar composite Trust Score weights and view live calculation derivations.",
};

export default function TrustScoreSettingsPage() {
  return <TrustScoreSettingsView />;
}
