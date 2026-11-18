"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Boxes,
  Award,
  Clock,
  Shield,
  DollarSign,
  ArrowRight,
  ExternalLink,
  Layers,
  Network,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lozenge } from "@/components/ui/Lozenge";
import { Button } from "@/components/ui/Button";
import { TrustScoreRing } from "@/components/ui/TrustScoreRing";
import { BusinessServiceItem } from "@/types/cmdb";
import { CMDBService } from "@/services/cmdb-service";
import { useCMDB } from "@/context/cmdb-context";
import { cn } from "@/lib/utils";
import { usePermission } from "@/components/rbac/usePermission";
import { AccessDenied } from "@/components/rbac/AccessDenied";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export function BusinessServicesView() {
  const { activeTenant } = useCMDB();
  const { allowed: canViewCI, reason: denyReason } = usePermission(PERMISSIONS.CI_VIEW);
  const [services, setServices] = useState<BusinessServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    CMDBService.fetchBusinessServices(activeTenant).then((data) => {
      if (isCurrent) {
        setServices(data);
        setLoading(false);
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [activeTenant]);

  if (!canViewCI) {
    return (
      <AccessDenied
        requiredPermission={PERMISSIONS.CI_VIEW}
        reason={denyReason || "Executive / Report Viewer role has dashboard.view only and cannot access business service details."}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12 text-text-default animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-default">
              Business Services Catalog
            </h1>
            <Lozenge appearance="subtle" variant="info" size="sm">
              {services.length} Services
            </Lozenge>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-muted bg-sunken px-2.5 py-0.5 rounded border border-border/60">
              <Lock className="w-3.5 h-3.5 text-text-muted" />
              {activeTenant}
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Top-level business services, aggregated dependency Trust Scores, and downtime financial impact
          </p>
        </div>

        <Link href="/relationships">
          <Button variant="primary" size="sm" rightIcon={<Network className="w-4 h-4" />}>
            Topology Impact Map
          </Button>
        </Link>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {services.map((svc) => {
          const isBreach = svc.trustScore < 70;
          return (
            <Card
              key={svc.id}
              className={cn(
                "bg-surface border-border transition-all flex flex-col justify-between shadow-card",
                isBreach && "border-danger/40 ring-1 ring-danger/20"
              )}
            >
              <div>
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                  <div className="space-y-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-text-muted">{svc.id}</span>
                      <Lozenge
                        appearance="bold"
                        variant={
                          svc.serviceTier === "Tier 0"
                            ? "danger"
                            : svc.serviceTier === "Tier 1"
                            ? "warning"
                            : "info"
                        }
                        size="sm"
                      >
                        {svc.serviceTier}
                      </Lozenge>
                    </div>
                    <CardTitle className="text-base font-bold text-text-default truncate">
                      {svc.name}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm line-clamp-2">
                      {svc.description}
                    </CardDescription>
                  </div>

                  <TrustScoreRing score={svc.trustScore} size="sm" showLabel={false} />
                </CardHeader>

                <CardContent className="space-y-3.5 text-sm">
                  {/* SLA Alert banner if trust score < 70 */}
                  {isBreach && (
                    <div className="p-2.5 rounded bg-danger/10 border border-danger/30 flex items-center gap-2 text-danger font-semibold text-xs">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>SLA Breach: Rolled-up Trust Score &lt; 70%</span>
                    </div>
                  )}

                  {/* Operational SLAs */}
                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-md bg-sunken border border-border/60 dark:border-white/[0.08] text-xs">
                    <div>
                      <span className="text-text-muted block">RTO / RPO</span>
                      <span className="font-semibold text-text-default">
                        {svc.rto} / {svc.rpo}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block">Revenue Risk</span>
                      <span className="font-bold text-warning">{svc.revenuePerHour}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block">Business Owner</span>
                      <span className="font-medium text-text-default truncate block">
                        {svc.businessOwner || svc.owner}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block">Dependent CIs</span>
                      <span className="font-mono text-text-default">
                        {svc.dependentCIs ? svc.dependentCIs.length : svc.ciCount} CIs
                      </span>
                    </div>
                  </div>

                  {/* Dependent CIs pill list */}
                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                      Mapped Infrastructure Nodes
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(svc.dependentCIs || []).map((ciId: string) => (
                        <Link
                          key={ciId}
                          href={`/cis/${ciId}`}
                          className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border dark:border-white/[0.08] text-text-secondary hover:text-primary hover:border-primary transition-colors"
                        >
                          {ciId}
                        </Link>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </div>

              <div className="p-4 pt-2 border-t border-border dark:border-white/[0.06] flex items-center justify-between">
                <Link
                  href={`/relationships?ci=${svc.id}`}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  View Service Topology <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Lozenge
                  appearance="subtle"
                  variant={svc.status === "Operational" ? "success" : "warning"}
                >
                  {svc.status}
                </Lozenge>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
