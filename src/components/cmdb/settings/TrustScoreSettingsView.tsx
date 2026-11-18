"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Award,
  Sliders,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  Calculator,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lozenge } from "@/components/ui/Lozenge";
import { Button } from "@/components/ui/Button";
import { TrustScoreRing } from "@/components/ui/TrustScoreRing";
import { useCMDB } from "@/context/cmdb-context";

export function TrustScoreSettingsView() {
  const { activeTenant, showToast } = useCMDB();

  // 5 Pillar weights (must sum to 100)
  const [freshness, setFreshness] = useState<number>(30);
  const [completeness, setCompleteness] = useState<number>(25);
  const [consistency, setConsistency] = useState<number>(20);
  const [relationships, setRelationships] = useState<number>(15);
  const [ownership, setOwnership] = useState<number>(10);

  const totalWeight = freshness + completeness + consistency + relationships + ownership;
  const isValid = totalWeight === 100;

  // Worked example calculation for sample CI: PROD-DB-MUMBAI-01
  // Pillar raw scores: Freshness 100%, Completeness 95%, Consistency 90%, Relationships 80%, Ownership 100%
  const sampleRaw = {
    freshness: 95,
    completeness: 90,
    consistency: 92,
    relationships: 85,
    ownership: 100,
  };

  const calculatedSampleScore = Math.round(
    (sampleRaw.freshness * freshness +
      sampleRaw.completeness * completeness +
      sampleRaw.consistency * consistency +
      sampleRaw.relationships * relationships +
      sampleRaw.ownership * ownership) /
      100
  );

  const handleReset = () => {
    setFreshness(30);
    setCompleteness(25);
    setConsistency(20);
    setRelationships(15);
    setOwnership(10);
    showToast("info", "Weights Reset", "Restored standard enterprise default Trust Score weights.");
  };

  const handleSave = () => {
    if (!isValid) {
      showToast("error", "Invalid Total", "Total weight sum must equal exactly 100%.");
      return;
    }
    showToast("success", "Trust Weights Saved", `Updated 5-pillar calculation weights for ${activeTenant}.`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 text-text-default">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-default">
              Trust Score Weight Configuration
            </h1>
            <Lozenge appearance="subtle" variant="info" size="sm">
              5-Pillar Algorithm
            </Lozenge>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-muted bg-sunken px-2.5 py-1 rounded border border-border/60">
              <Lock className="w-3.5 h-3.5 text-text-muted" />
              {activeTenant}
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Configure algorithmic weighting factors across freshness, attribute completeness, identifier consistency, topology, and ownership
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" leftIcon={<RotateCcw className="w-3.5 h-3.5" />} onClick={handleReset}>
            Reset Defaults
          </Button>
          <Button size="sm" variant="primary" leftIcon={<Save className="w-3.5 h-3.5" />} onClick={handleSave}>
            Save Weights
          </Button>
        </div>
      </div>

      {/* Total Weight Validation Alert */}
      {!isValid && (
        <div className="p-3.5 rounded-lg bg-danger/10 border border-danger/30 flex items-center justify-between text-sm text-danger">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Weights must sum to exactly 100%. Current sum: {totalWeight}%</span>
          </div>
          <span className="font-mono font-bold">{totalWeight > 100 ? `+${totalWeight - 100}%` : `-${100 - totalWeight}%`}</span>
        </div>
      )}

      {/* Weight Editor Sliders */}
      <Card className="bg-surface border-border">
        <CardHeader>
          <CardTitle className="text-base font-bold">5-Pillar Scoring Weights</CardTitle>
          <CardDescription className="text-sm">Adjust the slider values to reflect your organization's governance priorities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          {/* Pillar 1: Freshness */}
          <div className="space-y-2">
            <div className="flex justify-between font-semibold">
              <span className="text-text-default">1. Telemetry Freshness</span>
              <span className="font-mono text-primary font-bold text-base">{freshness}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              value={freshness}
              onChange={(e) => setFreshness(Number(e.target.value))}
              className="w-full h-2 bg-sunken rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <p className="text-xs text-text-muted">
              Penalizes CIs with last discovered timestamp older than 14 days or missing live sensor heartbeats.
            </p>
          </div>

          {/* Pillar 2: Completeness */}
          <div className="space-y-2">
            <div className="flex justify-between font-semibold">
              <span className="text-text-default">2. Attribute Completeness</span>
              <span className="font-mono text-primary font-bold text-base">{completeness}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              value={completeness}
              onChange={(e) => setCompleteness(Number(e.target.value))}
              className="w-full h-2 bg-sunken rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <p className="text-xs text-text-muted">
              Evaluates presence of required fields: IP address, OS, model, environment, and business criticality tier.
            </p>
          </div>

          {/* Pillar 3: Consistency */}
          <div className="space-y-2">
            <div className="flex justify-between font-semibold">
              <span className="text-text-default">3. Identifier Consistency & IRE</span>
              <span className="font-mono text-primary font-bold text-base">{consistency}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              value={consistency}
              onChange={(e) => setConsistency(Number(e.target.value))}
              className="w-full h-2 bg-sunken rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <p className="text-xs text-text-muted">
              Checks for zero conflicting MAC addresses, valid FQDNs, serial numbers, and absence of duplicate flags.
            </p>
          </div>

          {/* Pillar 4: Relationships */}
          <div className="space-y-2">
            <div className="flex justify-between font-semibold">
              <span className="text-text-default">4. Topology & Relationship Mapping</span>
              <span className="font-mono text-primary font-bold text-base">{relationships}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              value={relationships}
              onChange={(e) => setRelationships(Number(e.target.value))}
              className="w-full h-2 bg-sunken rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <p className="text-xs text-text-muted">
              Rewards CIs mapped into upstream services or hosting clusters; penalizes orphaned assets.
            </p>
          </div>

          {/* Pillar 5: Ownership */}
          <div className="space-y-2">
            <div className="flex justify-between font-semibold">
              <span className="text-text-default">5. Ownership Designation</span>
              <span className="font-mono text-primary font-bold text-base">{ownership}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              value={ownership}
              onChange={(e) => setOwnership(Number(e.target.value))}
              className="w-full h-2 bg-sunken rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <p className="text-xs text-text-muted">
              Verifies assigned individual technical owner and support group accountability.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Worked Example Box */}
      <Card className="bg-surface border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-bold">Worked Example: PROD-DB-MUMBAI-01 (CI-000492)</CardTitle>
          </div>
          <CardDescription className="text-sm">
            Live demonstration of composite Trust Score derivation using the configured weights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs sm:text-sm py-1.5 border-b border-border/60">
                <span>Freshness ({sampleRaw.freshness}% &times; {freshness}%):</span>
                <span className="font-mono font-semibold">+{((sampleRaw.freshness * freshness) / 100).toFixed(1)} pts</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm py-1.5 border-b border-border/60">
                <span>Completeness ({sampleRaw.completeness}% &times; {completeness}%):</span>
                <span className="font-mono font-semibold">+{((sampleRaw.completeness * completeness) / 100).toFixed(1)} pts</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm py-1.5 border-b border-border/60">
                <span>Consistency ({sampleRaw.consistency}% &times; {consistency}%):</span>
                <span className="font-mono font-semibold">+{((sampleRaw.consistency * consistency) / 100).toFixed(1)} pts</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm py-1.5 border-b border-border/60">
                <span>Topology ({sampleRaw.relationships}% &times; {relationships}%):</span>
                <span className="font-mono font-semibold">+{((sampleRaw.relationships * relationships) / 100).toFixed(1)} pts</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm py-1.5 border-b border-border/60">
                <span>Ownership ({sampleRaw.ownership}% &times; {ownership}%):</span>
                <span className="font-mono font-semibold">+{((sampleRaw.ownership * ownership) / 100).toFixed(1)} pts</span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-5 bg-sunken rounded-lg border border-border">
              <TrustScoreRing score={calculatedSampleScore} size="lg" />
              <span className="font-bold text-sm text-text-default mt-2.5">Derived Composite Score</span>
              <span className="text-xs text-text-muted">Target SLA: 80%+</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
