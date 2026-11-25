import { Suspense } from "react";
import { DataQualityView } from "@/components/cmdb/DataQualityView";

export default function DataQualityPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-text-muted">Loading Data Quality workspace...</div>}>
      <DataQualityView />
    </Suspense>
  );
}
