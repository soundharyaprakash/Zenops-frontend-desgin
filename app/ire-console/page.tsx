import { Metadata } from "next";
import { IREConsoleView } from "@/components/cmdb/IREConsoleView";

export const metadata: Metadata = {
  title: "ZenOps",
  description: "Identification & Reconciliation Engine simulator and attribute precedence tester.",
};

export default function IREConsolePage() {
  return <IREConsoleView />;
}
