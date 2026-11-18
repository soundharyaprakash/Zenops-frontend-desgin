"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useCMDB } from "@/context/cmdb-context";
import { CIDetailView } from "@/components/cmdb/CIDetailView";
import { Button } from "@/components/ui";
import { AlertCircle, ArrowLeft } from "lucide-react";

export function CIDetailPageView() {
  const params = useParams();
  const router = useRouter();
  const { getCIById } = useCMDB();

  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const ci = getCIById(id);

  if (!ci) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-[#0A192F]">
          Configuration Item Not Found
        </h2>
        <p className="text-sm text-slate-500">
          The requested CI &quot;{id}&quot; does not exist in the active catalog.
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push("/cis")}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to CI Inventory
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CIDetailView ci={ci} />
    </div>
  );
}

