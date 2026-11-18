"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  GitMerge,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Code2,
  Sliders,
  Check,
  Zap,
  Activity,
  Layers,
  Server,
  Lock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lozenge } from "@/components/ui/Lozenge";
import { Button } from "@/components/ui/Button";
import { IREPayload, IRESimulationResult } from "@/types/cmdb";
import { CMDBService } from "@/services/cmdb-service";
import { useCMDB } from "@/context/cmdb-context";
import { cn } from "@/lib/utils";

const SAMPLE_PAYLOAD_EC2: IREPayload = {
  source: "AWS CloudTrail",
  company_id: "CMP_1001_ZENDEV",
  items: [
    {
      className: "cmdb_ci_server",
      values: {
        name: "PROD-DB-MUMBAI-01",
        ip_address: "10.0.1.42",
        mac_address: "02:42:0a:f0:00:0c",
        serial_number: "SRV-AWS-99120",
        os: "Amazon Linux 2023",
        cpu_count: 32,
        ram: "128GB",
      },
    },
  ],
};

const SAMPLE_PAYLOAD_K8S: IREPayload = {
  source: "Kubernetes Operator",
  company_id: "CMP_1001_ZENDEV",
  items: [
    {
      className: "cmdb_ci_kubernetes_cluster",
      values: {
        name: "auth-service-pod-01",
        ip_address: "10.242.1.9",
        mac_address: "02:42:0a:f2:01:09",
        image: "registry.zenops.io/auth:v2.4",
        namespace: "production-services",
      },
    },
  ],
};

export function IREConsoleView() {
  const { activeTenant, showToast } = useCMDB();
  const [jsonText, setJsonText] = useState(JSON.stringify(SAMPLE_PAYLOAD_EC2, null, 2));
  const [simulationResults, setSimulationResults] = useState<IRESimulationResult[] | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [datadogEventSent, setDatadogEventSent] = useState(false);

  const handleSimulate = async () => {
    try {
      const parsed = JSON.parse(jsonText) as IREPayload;
      setIsSimulating(true);
      setActiveStep(1);

      // Simulate step-by-step progress
      setTimeout(async () => {
        setActiveStep(2);
        setTimeout(async () => {
          setActiveStep(3);
          const results = await CMDBService.simulateIRE(parsed);
          setSimulationResults(results);
          setIsSimulating(false);
          showToast("success", "IRE Simulation Completed", `Matched ${results.length} incoming items against active rules.`);
        }, 400);
      }, 400);
    } catch {
      showToast("error", "Invalid JSON", "Please ensure your payload is valid JSON.");
      setIsSimulating(false);
    }
  };

  const handleLoadSample = (type: "ec2" | "k8s") => {
    if (type === "ec2") {
      setJsonText(JSON.stringify(SAMPLE_PAYLOAD_EC2, null, 2));
    } else {
      setJsonText(JSON.stringify(SAMPLE_PAYLOAD_K8S, null, 2));
    }
    setSimulationResults(null);
    setActiveStep(0);
  };

  const handleSendDatadogEvent = () => {
    setDatadogEventSent(true);
    showToast(
      "warning",
      "Datadog Alert Triggered",
      "CPU spike webhook received for PROD-DB-MUMBAI-01 (CI-000492). Correlating with Change record..."
    );
    setTimeout(() => setDatadogEventSent(false), 5000);
  };

  return (
    <div className="space-y-6 pb-12 text-text-default">
      {/* ----------------------------------------------------------------------- */}
      {/* HEADER */}
      {/* ----------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-default">
              Identification & Reconciliation Engine (IRE) Simulator
            </h1>
            <Lozenge appearance="subtle" variant="info" size="sm">
              IRE v3.2 Active
            </Lozenge>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-muted bg-sunken px-2.5 py-0.5 rounded border border-border/60">
              <Lock className="w-3.5 h-3.5 text-text-muted" />
              {activeTenant}
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Test incoming discovery payloads against multi-attribute identification rules and source precedence weights
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleLoadSample("ec2")}
          >
            Load AWS EC2
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleLoadSample("k8s")}
          >
            Load K8s Pod
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Play className="w-4 h-4" />}
            onClick={handleSimulate}
            isLoading={isSimulating}
          >
            Run Simulation
          </Button>
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* 2-COLUMN LAYOUT: JSON PAYLOAD EDITOR (5 COLS) + RULE SIMULATOR (7 COLS) */}
      {/* ----------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: JSON Payload Editor */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="bg-surface border-border flex flex-col justify-between shadow-card">
            <CardHeader className="pb-2.5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">Incoming Discovery Payload (JSON)</CardTitle>
                <Code2 className="w-4 h-4 text-primary" />
              </div>
              <CardDescription className="text-xs">
                Simulate a raw webhook or scheduled collector payload
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={16}
                className="w-full bg-sunken border border-border rounded-md font-mono text-xs p-3 text-text-default focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent leading-relaxed"
              />

              <div className="flex justify-between items-center text-xs text-text-muted">
                <span>Schema: ServiceNow IRE Compliant</span>
                <button
                  onClick={() => setJsonText(JSON.stringify(SAMPLE_PAYLOAD_EC2, null, 2))}
                  className="text-primary hover:underline font-medium"
                >
                  Reset Sample
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Datadog Webhook Simulation Card */}
          <Card className="bg-surface border-border shadow-card">
            <CardHeader className="pb-2.5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">Datadog Event Webhook Demo</CardTitle>
                <Activity className="w-4 h-4 text-danger" />
              </div>
              <CardDescription className="text-xs">
                Simulate an automated observability alert triggering incident correlation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-text-secondary leading-relaxed text-xs">
                Sends a synthetic CPU spike webhook for <strong>PROD-DB-MUMBAI-01 (CI-000492)</strong> to demonstrate automated CI correlation.
              </p>

              <Button
                size="sm"
                variant={datadogEventSent ? "secondary" : "danger"}
                leftIcon={<Zap className="w-3.5 h-3.5" />}
                onClick={handleSendDatadogEvent}
              >
                {datadogEventSent ? "Webhook Dispatched" : "Fire Datadog Alert Webhook"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Step-by-Step Rule Matching & Attribute Winners */}
        <div className="lg:col-span-7 space-y-4">
          {/* Rule Evaluation Sequence */}
          <Card className="bg-surface border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs">Step-by-Step Rule Evaluation Hierarchy</CardTitle>
              <CardDescription className="text-xs">
                Ordered identification cascade evaluating identifiers from highest to lowest specificity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div
                className={cn(
                  "p-2.5 rounded border transition-all flex items-center justify-between",
                  activeStep >= 1
                    ? "bg-selected-bg border-primary ring-1 ring-primary/30"
                    : "bg-sunken border-border/70"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-primary text-[11px]">Rule 1</span>
                  <span className="font-medium text-text-default">Exact MAC Address Match (mac_address)</span>
                </div>
                <Lozenge appearance="subtle" variant="info">
                  Confidence 98%
                </Lozenge>
              </div>

              <div
                className={cn(
                  "p-2.5 rounded border transition-all flex items-center justify-between",
                  activeStep >= 2
                    ? "bg-selected-bg border-primary ring-1 ring-primary/30"
                    : "bg-sunken border-border/70"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-primary text-[11px]">Rule 2</span>
                  <span className="font-medium text-text-default">Hardware Serial Number Match (serial_number)</span>
                </div>
                <Lozenge appearance="subtle" variant="info">
                  Confidence 94%
                </Lozenge>
              </div>

              <div
                className={cn(
                  "p-2.5 rounded border transition-all flex items-center justify-between",
                  activeStep >= 3
                    ? "bg-selected-bg border-primary ring-1 ring-primary/30"
                    : "bg-sunken border-border/70"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-primary text-[11px]">Rule 3</span>
                  <span className="font-medium text-text-default">Composite Name + sys_class_name Match</span>
                </div>
                <Lozenge appearance="subtle" variant="info">
                  Confidence 88%
                </Lozenge>
              </div>

              <div className="p-2.5 rounded border bg-sunken border-border/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-text-muted text-[11px]">Rule 4</span>
                  <span className="font-medium text-text-secondary">Fallback: No Match &rarr; Create New CI</span>
                </div>
                <Lozenge appearance="subtle" variant="neutral">
                  Confidence 100%
                </Lozenge>
              </div>
            </CardContent>
          </Card>

          {/* Simulation Output */}
          {simulationResults && simulationResults.length > 0 ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              {simulationResults.map((res, i) => (
                <Card key={i} className="bg-surface border-border">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Lozenge
                          appearance="bold"
                          variant={res.action === "Update" ? "success" : "info"}
                        >
                          Action: {res.action} Existing CI
                        </Lozenge>
                        <span className="text-[11px] font-mono text-text-muted">
                          Confidence: {res.confidenceScore}%
                        </span>
                      </div>
                      <CardTitle className="text-xs mt-1">
                        Matched Rule: {res.matchedRule}
                      </CardTitle>
                    </div>

                    {res.matchedCI && (
                      <Link href={`/cis/${res.matchedCI.id}`}>
                        <Button size="xs" variant="outline">
                          View {res.matchedCI.id} &rarr;
                        </Button>
                      </Link>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-text-muted block">
                      Attribute Winners (Source Precedence Authority)
                    </span>
                    <div className="border border-border/70 rounded overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-sunken border-b border-border text-[11px] uppercase text-text-secondary">
                          <tr>
                            <th className="py-2 px-3">Field</th>
                            <th className="py-2 px-3">Incoming Value</th>
                            <th className="py-2 px-3">Winning Source</th>
                            <th className="py-2 px-3 text-right">Weight</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {res.winningAttributes.map((attr) => (
                            <tr key={attr.field} className="hover:bg-sunken/40">
                              <td className="py-2 px-3 font-mono text-[11px] font-medium text-text-default">
                                {attr.field}
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] text-text-secondary truncate max-w-xs">
                                {String(attr.value)}
                              </td>
                              <td className="py-2 px-3">
                                <Lozenge appearance="subtle" variant="info">
                                  {attr.winnerSource || attr.source}
                                </Lozenge>
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-success">
                                {attr.weight}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-surface border-border p-8 text-center text-xs text-text-secondary">
              <p className="font-semibold text-text-default">No simulation results yet.</p>
              <p className="text-[11px] text-text-muted mt-1">
                Click "Run Simulation" above to parse the JSON payload and execute the rule cascade.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
