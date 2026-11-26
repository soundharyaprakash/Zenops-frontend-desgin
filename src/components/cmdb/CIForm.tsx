"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Save,
  FileText,
  X,
  AlertTriangle,
  Server,
  Database as DbIcon,
  Layers,
  Radio,
  Cloud,
  CheckCircle2,
  Shield,
  HelpCircle,
  Award,
  DollarSign,
  Key,
  Users,
  HardDrive,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lozenge } from "@/components/ui/Lozenge";
import { TrustScoreRing } from "@/components/ui/TrustScoreRing";
import {
  CIItem,
  CIClass,
  LifecycleStatus,
  OperationalStatus,
  Environment,
  BusinessCriticality,
  DataClassification,
  DynamicAttributes,
} from "@/types/cmdb";
import {
  CI_CLASSES,
  LIFECYCLE_STATUSES,
  OPERATIONAL_STATUSES,
  ENVIRONMENTS,
  BUSINESS_CRITICALITIES,
  DATA_CLASSIFICATIONS,
  SUPPORT_GROUPS,
  COMMON_OWNERS,
  DISCOVERY_SOURCES,
} from "@/lib/constants";
import { useCMDB } from "@/context/cmdb-context";
import { cn } from "@/lib/utils";

interface CIFormProps {
  initialCI?: CIItem;
  isEdit?: boolean;
}

export function CIForm({ initialCI, isEdit = false }: CIFormProps) {
  const router = useRouter();
  const { addCI, updateCI, showToast, activeTenant, canEdit } = useCMDB();

  // Section 1: Identity & Classification
  const [name, setName] = useState(initialCI?.name || "");
  const [ciClass, setCiClass] = useState<CIClass>(initialCI?.ciClass || "Server/VM");
  const [description, setDescription] = useState(initialCI?.description || "");
  const [lifecycleStatus, setLifecycleStatus] = useState<LifecycleStatus>(
    initialCI?.lifecycleStatus || "In Use"
  );
  const [operationalStatus, setOperationalStatus] = useState<OperationalStatus>(
    initialCI?.operationalStatus || "Operational"
  );
  const [environment, setEnvironment] = useState<Environment>(
    initialCI?.environment || "Production"
  );
  const [businessCriticality, setBusinessCriticality] = useState<BusinessCriticality>(
    initialCI?.businessCriticality || "Tier 1 - Mission Critical"
  );

  // Section 2: Ownership & Support
  const [owner, setOwner] = useState(initialCI?.owner || COMMON_OWNERS[0]);
  const [supportGroup, setSupportGroup] = useState(
    initialCI?.supportGroup || SUPPORT_GROUPS[0]
  );
  const [managedByGroup, setManagedByGroup] = useState(
    initialCI?.attributes?.managedByGroup || "Infrastructure Engineering"
  );

  // Section 3: Asset & Financial
  const [vendor, setVendor] = useState(initialCI?.vendor || "Amazon Web Services");
  const [manufacturer, setManufacturer] = useState(initialCI?.manufacturer || "AWS");
  const [model, setModel] = useState(initialCI?.model || "Enterprise Tier");
  const [serialNumber, setSerialNumber] = useState(initialCI?.serialNumber || "");
  const [assetTag, setAssetTag] = useState(initialCI?.assetTag || "");
  const [location, setLocation] = useState(initialCI?.location || "AWS us-east-1");
  const [costCenter, setCostCenter] = useState(initialCI?.costCenter || "CC-INFRA-01");
  const [cost, setCost] = useState(initialCI?.cost ? String(initialCI.cost) : "1200");
  const [currency, setCurrency] = useState(initialCI?.currency || "USD");
  const [revenuePerHour, setRevenuePerHour] = useState<string>(
    initialCI?.revenuePerHour !== undefined ? String(initialCI.revenuePerHour) : ""
  );
  const [poNumber, setPoNumber] = useState(initialCI?.po_number || "PO-99201");
  const [installDate, setInstallDate] = useState(
    initialCI?.installDate || new Date().toISOString().split("T")[0]
  );
  const [warrantyEnd, setWarrantyEnd] = useState(initialCI?.warrantyEnd || "2028-12-31");

  // Section 4: Security & Compliance
  const [dataClassification, setDataClassification] = useState<DataClassification>(
    initialCI?.dataClassification || "Internal"
  );
  const [complianceFlags, setComplianceFlags] = useState<string[]>(
    initialCI?.complianceFlags || ["SOC2"]
  );

  // Section 5: Identification Keys
  const [fqdn, setFqdn] = useState(initialCI?.identificationKeys?.fqdn || "");
  const [ipAddress, setIpAddress] = useState(
    initialCI?.identificationKeys?.ipAddress || initialCI?.ip_address || ""
  );
  const [macAddress, setMacAddress] = useState(
    initialCI?.identificationKeys?.macAddress || initialCI?.mac_address || ""
  );
  const [cloudResourceId, setCloudResourceId] = useState(
    initialCI?.identificationKeys?.cloudResourceId || ""
  );
  const [uuid, setUuid] = useState(initialCI?.identificationKeys?.uuid || "");

  // Section 6: Discovery & Quality
  const [discoverySource, setDiscoverySource] = useState(
    initialCI?.discoverySource || DISCOVERY_SOURCES[0]
  );
  const [sourceRanking, setSourceRanking] = useState(initialCI?.sourceRanking || 5);

  // Section 7: Dynamic Class Attributes
  const [dynamicAttrs, setDynamicAttrs] = useState<DynamicAttributes>(
    initialCI?.attributes || {}
  );

  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Business Rule: Live CI needs Owner & Support Group
  const isLive = operationalStatus === "Operational" || lifecycleStatus === "In Use";
  const hasOwner = owner && owner.trim() !== "" && owner !== "Unassigned";
  const hasSupport = supportGroup && supportGroup.trim() !== "" && supportGroup !== "Unassigned";
  const missingOwnerWarning = isLive && (!hasOwner || !hasSupport);

  // Live Trust Score calculation preview
  const previewTrustScore = useMemo(() => {
    let score = 90;
    if (missingOwnerWarning) {
      score = Math.max(30, score - 30);
    }
    if (!ipAddress && !fqdn && !macAddress) {
      score = Math.max(20, score - 15);
    }
    return score;
  }, [missingOwnerWarning, ipAddress, fqdn, macAddress]);

  // Class inheritance path display
  const classInheritancePath = useMemo(() => {
    switch (ciClass) {
      case "Server/VM":
        return "cmdb_ci > cmdb_ci_hardware > cmdb_ci_computer > cmdb_ci_server";
      case "Container/Pod":
        return "cmdb_ci > cmdb_ci_software > cmdb_ci_container";
      case "Database":
        return "cmdb_ci > cmdb_ci_appl > cmdb_ci_database";
      case "Application":
        return "cmdb_ci > cmdb_ci_appl > cmdb_ci_service";
      case "Network Device":
        return "cmdb_ci > cmdb_ci_hardware > cmdb_ci_netgear";
      case "Cloud Resource":
        return "cmdb_ci > cmdb_ci_cloud > cmdb_ci_cloud_resource";
      case "SaaS Subscription":
        return "cmdb_ci > cmdb_ci_service > cmdb_ci_saas";
      default:
        return "cmdb_ci > cmdb_ci_hardware";
    }
  }, [ciClass]);

  const handleDynamicChange = (key: string, value: any) => {
    setDynamicAttrs((prev) => ({ ...prev, [key]: value }));
  };

  const handleComplianceToggle = (flag: string) => {
    setComplianceFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    );
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "CI Name is required";
    if (!ciClass) errs.ciClass = "CI Class is required";

    if (isLive) {
      if (!hasOwner) {
        errs.owner = "Live CIs mandate an assigned Owner (Governance Rule)";
      }
      if (!hasSupport) {
        errs.supportGroup = "Live CIs mandate an assigned Support Group (Governance Rule)";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      showToast("error", "Validation Failed", "Please fix errors before saving.");
      return;
    }

    setIsSubmitting(true);

    const ciPayload = {
      name,
      ciClass,
      description,
      lifecycleStatus,
      operationalStatus,
      environment,
      businessCriticality,
      owner: owner || "Unassigned",
      supportGroup: supportGroup || "Unassigned",
      vendor,
      manufacturer,
      model,
      serialNumber,
      assetTag,
      location,
      costCenter,
      cost: Number(cost) || 0,
      currency,
      revenuePerHour:
        (ciClass === "Business Service" || ciClass === "Service Offering") && revenuePerHour.trim() !== ""
          ? Number(revenuePerHour)
          : undefined,
      po_number: poNumber,
      installDate,
      warrantyEnd,
      dataClassification,
      complianceFlags,
      identificationKeys: {
        fqdn: fqdn || undefined,
        ipAddress: ipAddress || undefined,
        macAddress: macAddress || undefined,
        cloudResourceId: cloudResourceId || undefined,
        uuid: uuid || undefined,
      },
      ip_address: ipAddress || undefined,
      mac_address: macAddress || undefined,
      fqdn: fqdn || undefined,
      discoverySource,
      firstDiscovered: initialCI?.firstDiscovered || new Date().toISOString(),
      lastDiscovered: new Date().toISOString(),
      lastVerified: new Date().toISOString(),
      sourceRanking: Number(sourceRanking),
      trustScore: previewTrustScore,
      scoreComponents: initialCI?.scoreComponents || {
        completeness: hasOwner && hasSupport ? 95 : 65,
        freshness: 95,
        accuracy: 94,
        reconciliation: 90,
      },
      scoreReasons: initialCI?.scoreReasons || [
        hasOwner && hasSupport
          ? "Form entry with complete ownership and identification"
          : "Live CI created without complete ownership (-30 pts)",
      ],
      qualityFlags: missingOwnerWarning ? ["Missing Required Owner"] : [],
      attributes: {
        ...dynamicAttrs,
        managedByGroup,
      },
    };

    if (isEdit && initialCI) {
      const res = updateCI(initialCI.id, ciPayload, "Enterprise Admin");
      setIsSubmitting(false);
      if (res.success) {
        router.push(`/cis/${initialCI.id}`);
      }
    } else {
      const res = addCI(ciPayload, "Enterprise Admin");
      setIsSubmitting(false);
      if (res.success && res.ci) {
        router.push(`/cis/${res.ci.id}`);
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 text-text-default">
      {/* ----------------------------------------------------------------------- */}
      {/* HEADER WITH TRUST SCORE PREVIEW */}
      {/* ----------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-default">
              {isEdit ? `Edit Configuration Item (${initialCI?.id})` : "Create Configuration Item"}
            </h1>
            <Lozenge appearance="subtle" variant="info" size="sm">
              {activeTenant}
            </Lozenge>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Fill in identity, ownership, telemetry keys, and asset financials for CMDB catalog registration
          </p>
        </div>

        {/* Live Trust Score Preview Gauge */}
        <div className="flex items-center gap-3 bg-surface border border-border rounded-lg p-3 shadow-xs flex-shrink-0">
          <TrustScoreRing score={previewTrustScore} size="md" showLabel={false} />
          <div className="text-sm">
            <span className="font-semibold text-text-default block">Live Trust Score</span>
            <span className="font-mono text-text-secondary text-xs">
              {previewTrustScore}% {previewTrustScore >= 80 ? "(Healthy)" : "(Needs Attention)"}
            </span>
          </div>
        </div>
      </div>

      {/* Warning Alert if Live CI lacks Owner or Support Group */}
      {missingOwnerWarning && (
        <div className="p-4 rounded-lg bg-danger/10 border border-danger/30 flex items-start gap-3 animate-in fade-in duration-200">
          <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-danger">Governance Rule Breach: Live CI Missing Ownership</p>
            <p className="text-text-secondary mt-0.5 leading-relaxed text-xs sm:text-sm">
              Operational/In-Use CIs must have a designated Owner and Support Group. Leaving them unassigned drops the
              Trust Score by <strong>30 points</strong> and automatically logs a Data Quality remediation task upon creation.
            </p>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* SECTION 1: IDENTITY & CLASSIFICATION */}
      {/* ----------------------------------------------------------------------- */}
      <Card className="bg-surface border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            <CardTitle className="text-base font-bold">1. Identity & Classification</CardTitle>
          </div>
          <CardDescription className="text-sm">
            Core asset naming, class inheritance, and operational lifecycle state
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Configuration Item Name *"
                placeholder="e.g. prod-api-gateway-01 / payments-db"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
              />
              {errors.name && <p className="text-xs text-danger mt-1">{errors.name}</p>}
            </div>

            <div>
              <Select
                label="CI Class *"
                value={ciClass}
                onChange={(e) => setCiClass(e.target.value as CIClass)}
              >
                {CI_CLASSES.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Class Inheritance Path Pill */}
          <div className="p-2.5 rounded-md bg-sunken border border-border/60 flex items-center justify-between text-xs sm:text-sm">
            <span className="text-xs text-text-muted">Class Inheritance Path:</span>
            <span className="font-mono text-xs text-primary font-medium">{classInheritancePath}</span>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-text-default block mb-1">
              Architectural Description
            </label>
            <textarea
              rows={2}
              placeholder="Primary purpose, hosting location, and dependent business service roles..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-surface border border-border rounded-md p-2.5 text-sm text-text-default focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            <Select
              label="Environment"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as Environment)}
            >
              {ENVIRONMENTS.map((env) => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </Select>

            <Select
              label="Business Criticality"
              value={businessCriticality}
              onChange={(e) => setBusinessCriticality(e.target.value as BusinessCriticality)}
            >
              {BUSINESS_CRITICALITIES.map((crit) => (
                <option key={crit} value={crit}>
                  {crit}
                </option>
              ))}
            </Select>

            <Select
              label="Operational Status"
              value={operationalStatus}
              onChange={(e) => setOperationalStatus(e.target.value as OperationalStatus)}
            >
              {OPERATIONAL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>

            <Select
              label="Lifecycle Status"
              value={lifecycleStatus}
              onChange={(e) => setLifecycleStatus(e.target.value as LifecycleStatus)}
            >
              {LIFECYCLE_STATUSES.map((life) => (
                <option key={life} value={life}>
                  {life}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------------- */}
      {/* SECTION 2: OWNERSHIP & SUPPORT */}
      {/* ----------------------------------------------------------------------- */}
      <Card className="bg-surface border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <CardTitle className="text-base font-bold">2. Ownership & Support Accountability</CardTitle>
          </div>
          <CardDescription className="text-sm">
            Designated technical owner, support groups, and change authority
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Select
                label="Primary Owner / Engineer *"
                value={owner}
                onChange={(e) => {
                  setOwner(e.target.value);
                  if (errors.owner) setErrors((prev) => ({ ...prev, owner: "" }));
                }}
              >
                {COMMON_OWNERS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
                <option value="Unassigned">Unassigned (Violates Rule)</option>
              </Select>
              {errors.owner && <p className="text-xs text-danger mt-1">{errors.owner}</p>}
            </div>

            <div>
              <Select
                label="Support Group *"
                value={supportGroup}
                onChange={(e) => {
                  setSupportGroup(e.target.value);
                  if (errors.supportGroup) setErrors((prev) => ({ ...prev, supportGroup: "" }));
                }}
              >
                {SUPPORT_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
                <option value="Unassigned">Unassigned (Violates Rule)</option>
              </Select>
              {errors.supportGroup && (
                <p className="text-xs text-danger mt-1">{errors.supportGroup}</p>
              )}
            </div>

            <div>
              <Input
                label="Managed By Group"
                value={managedByGroup}
                onChange={(e) => setManagedByGroup(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------------- */}
      {/* SECTION 3: IDENTIFICATION KEYS (IRE ENGINE) */}
      {/* ----------------------------------------------------------------------- */}
      <Card className="bg-surface border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            <CardTitle className="text-base font-bold">3. Identification Keys (IRE Fingerprints)</CardTitle>
          </div>
          <CardDescription className="text-sm">
            Hardware MAC, serial numbers, IP addresses, and cloud resource IDs used for automated reconciliation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="IP Address"
              placeholder="e.g. 10.240.0.12"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
            />

            <Input
              label="MAC Address"
              placeholder="e.g. 02:42:0a:f0:00:0c"
              value={macAddress}
              onChange={(e) => setMacAddress(e.target.value)}
            />

            <Input
              label="FQDN / Hostname"
              placeholder="e.g. api-gw-01.us-east-1.zenops.io"
              value={fqdn}
              onChange={(e) => setFqdn(e.target.value)}
            />

            <Input
              label="Serial Number"
              placeholder="e.g. SRV-AWS-99120"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
            />

            <Input
              label="Cloud Resource ID / ARN"
              placeholder="e.g. i-08a1b2c3d4e5f6789"
              value={cloudResourceId}
              onChange={(e) => setCloudResourceId(e.target.value)}
            />

            <Input
              label="Hardware UUID"
              placeholder="e.g. 4a12b345-67c8-90de-f123-456789abcdef"
              value={uuid}
              onChange={(e) => setUuid(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------------- */}
      {/* SECTION 4: CLASS-SPECIFIC ATTRIBUTES */}
      {/* ----------------------------------------------------------------------- */}
      <Card className="bg-surface border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            <CardTitle className="text-base font-bold">4. Technical Specifications ({ciClass})</CardTitle>
          </div>
          <CardDescription className="text-sm">
            Runtime configurations and class-specific architecture fields
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ciClass === "Server/VM" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="OS Name"
                placeholder="e.g. Amazon Linux 2023 / Ubuntu 22.04"
                value={dynamicAttrs.osName || ""}
                onChange={(e) => handleDynamicChange("osName", e.target.value)}
              />
              <Input
                label="CPU Cores"
                type="number"
                placeholder="e.g. 16"
                value={dynamicAttrs.cpuCores || ""}
                onChange={(e) => handleDynamicChange("cpuCores", Number(e.target.value))}
              />
              <Input
                label="RAM (GB)"
                type="number"
                placeholder="e.g. 64"
                value={dynamicAttrs.ramGb || ""}
                onChange={(e) => handleDynamicChange("ramGb", Number(e.target.value))}
              />
            </div>
          )}

          {ciClass === "Database" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="DB Engine"
                placeholder="e.g. PostgreSQL 15.4"
                value={dynamicAttrs.dbEngine || ""}
                onChange={(e) => handleDynamicChange("dbEngine", e.target.value)}
              />
              <Input
                label="Port Number"
                type="number"
                placeholder="e.g. 5432"
                value={dynamicAttrs.port || ""}
                onChange={(e) => handleDynamicChange("port", Number(e.target.value))}
              />
              <Input
                label="Storage Size (GB)"
                type="number"
                placeholder="e.g. 500"
                value={dynamicAttrs.storageGb || ""}
                onChange={(e) => handleDynamicChange("storageGb", Number(e.target.value))}
              />
            </div>
          )}

          {ciClass === "Container/Pod" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Container Image"
                placeholder="e.g. registry.zenops.io/auth:v2.4"
                value={dynamicAttrs.image || ""}
                onChange={(e) => handleDynamicChange("image", e.target.value)}
              />
              <Input
                label="Namespace"
                placeholder="e.g. production-services"
                value={dynamicAttrs.namespace || ""}
                onChange={(e) => handleDynamicChange("namespace", e.target.value)}
              />
              <Input
                label="Replica Count"
                type="number"
                placeholder="e.g. 3"
                value={dynamicAttrs.replicas || ""}
                onChange={(e) => handleDynamicChange("replicas", Number(e.target.value))}
              />
            </div>
          )}

          {ciClass !== "Server/VM" && ciClass !== "Database" && ciClass !== "Container/Pod" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Primary Provider / Hosting"
                placeholder="e.g. AWS / Cloudflare / Okta"
                value={dynamicAttrs.provider || ""}
                onChange={(e) => handleDynamicChange("provider", e.target.value)}
              />
              <Input
                label="Service Tier / Capacity"
                placeholder="e.g. Platinum / 500 Seats / Multi-AZ"
                value={dynamicAttrs.capacity || ""}
                onChange={(e) => handleDynamicChange("capacity", e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------------- */}
      {/* SECTION 5: ASSET & FINANCIAL */}
      {/* ----------------------------------------------------------------------- */}
      <Card className="bg-surface border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <CardTitle className="text-base font-bold">5. Asset & Financial Management</CardTitle>
          </div>
          <CardDescription className="text-sm">
            Cost accounting, purchase order records, depreciation, and warranty terms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Asset Tag"
              placeholder="e.g. AT-2024-991"
              value={assetTag}
              onChange={(e) => setAssetTag(e.target.value)}
            />

            <Input
              label="Cost Center"
              placeholder="e.g. CC-INFRA-01"
              value={costCenter}
              onChange={(e) => setCostCenter(e.target.value)}
            />

            <Input
              label="Acquisition Cost"
              type="number"
              placeholder="1200"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />

            <Input
              label="PO Number"
              placeholder="e.g. PO-99201"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
            />

            <Input
              label="Vendor"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
            />

            <Input
              label="Model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />

            <Input
              label="Installation Date"
              type="date"
              value={installDate}
              onChange={(e) => setInstallDate(e.target.value)}
            />

            <Input
              label="Warranty Expiration"
              type="date"
              value={warrantyEnd}
              onChange={(e) => setWarrantyEnd(e.target.value)}
            />

            {/* Business Service Revenue Exposure (Visible only to users with edit permissions) */}
            {(ciClass === "Business Service" || ciClass === "Service Offering") && canEdit && (
              <div className="col-span-full p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-xs text-text-default flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-primary" />
                      Business Service Revenue Exposure (CMDB Topology)
                    </h5>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      Estimated hourly financial downtime exposure used for Topology Graph blast radius &amp; risk calculations.
                    </p>
                  </div>
                  <Lozenge appearance="subtle" variant="info" size="xs">
                    Editor Only
                  </Lozenge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Revenue per Hour"
                    type="number"
                    placeholder="e.g. 85000"
                    value={revenuePerHour}
                    onChange={(e) => setRevenuePerHour(e.target.value)}
                    helperText="Hourly gross revenue reliant on this business service"
                  />
                  <div>
                    <label className="block text-xs font-semibold text-text-default mb-1">
                      Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-surface border border-border rounded-input px-3 py-2 text-xs text-text-default focus:outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="JPY">JPY (¥)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------------- */}
      {/* SECTION 6: CLASSIFICATION & COMPLIANCE */}
      {/* ----------------------------------------------------------------------- */}
      <Card className="bg-surface border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <CardTitle className="text-base font-bold">6. Classification & Compliance Scopes</CardTitle>
          </div>
          <CardDescription className="text-sm">
            Data sensitivity levels and active regulatory governance tags
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <Select
              label="Data Classification"
              value={dataClassification}
              onChange={(e) => setDataClassification(e.target.value as DataClassification)}
            >
              {DATA_CLASSIFICATIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-text-default block mb-2">
              Compliance Frameworks
            </label>
            <div className="flex flex-wrap gap-2">
              {["SOC2", "PCI-DSS", "HIPAA", "ISO27001", "GDPR", "FedRAMP"].map((flag) => {
                const isSelected = complianceFlags.includes(flag);
                return (
                  <button
                    key={flag}
                    type="button"
                    onClick={() => handleComplianceToggle(flag)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-semibold border transition-all",
                      isSelected
                        ? "bg-primary text-white border-primary"
                        : "bg-surface text-text-secondary border-border hover:border-primary/50"
                    )}
                  >
                    {flag}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------------- */}
      {/* FORM ACTIONS */}
      {/* ----------------------------------------------------------------------- */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-border">
        <Link href="/cis" className="w-full sm:w-auto">
          <Button variant="outline" size="sm" className="w-full sm:w-auto justify-center">
            Cancel
          </Button>
        </Link>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Save className="w-4 h-4" />}
          onClick={handleSave}
          isLoading={isSubmitting}
          className="w-full sm:w-auto justify-center"
        >
          {isEdit ? "Save Changes" : "Create CI"}
        </Button>
      </div>
    </div>
  );
}
