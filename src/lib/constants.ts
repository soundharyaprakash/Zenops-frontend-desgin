import { CIClass, Environment, LifecycleStatus, OperationalStatus, BusinessCriticality, DataClassification, TenantInfo } from "@/types/cmdb";

export const AVAILABLE_TENANTS: TenantInfo[] = [
  { id: "CMP_1001_ZENDEV", name: "ZenDev Software Technologies", domain: "zendev.zenops.io", shortName: "ZenDev" },
  { id: "CMP_1009_CHOOSECY", name: "Choose My Career", domain: "choosecy.zenops.io", shortName: "ChooseMyCareer" },
  { id: "CMP_1015_SPACEZEN", name: "SpaceZen LLC", domain: "spacezen.zenops.io", shortName: "SpaceZen" },
];

export const CI_CLASSES: CIClass[] = [
  "Server/VM",
  "Container/Pod",
  "Database",
  "Application",
  "Network Device",
  "Cloud Resource",
  "SaaS Subscription",
  "Business Service",
  "Service Offering",
];

export const LIFECYCLE_STATUSES: LifecycleStatus[] = [
  "Pipeline",
  "Ordered",
  "In Stock",
  "In Test",
  "In Use",
  "Maintenance",
  "Retired",
  "Disposed",
];

export const OPERATIONAL_STATUSES: OperationalStatus[] = [
  "Operational",
  "Degraded",
  "Maintenance",
  "Non-operational",
  "Offline",
];

export const ENVIRONMENTS: Environment[] = [
  "Production",
  "Staging",
  "QA / Test",
  "Development",
  "DR / Disaster Recovery",
];

export const BUSINESS_CRITICALITIES: BusinessCriticality[] = [
  "Tier 1 - Mission Critical",
  "Tier 2 - Business Critical",
  "Tier 3 - Business Operational",
  "Tier 4 - Non-Critical",
];

export const DATA_CLASSIFICATIONS: DataClassification[] = [
  "Public",
  "Internal",
  "Confidential",
  "Restricted",
  "PII / PCI",
];

export const SUPPORT_GROUPS = [
  "Core Infrastructure & Cloud Ops",
  "Platform Reliability Engineering",
  "Database Administration (DBA)",
  "Network & Security Operations",
  "Enterprise Billing & FinOps",
  "Identity & Access Management",
  "Enterprise Workplace Systems",
  "Incident Management Tier 3",
];

export const COMMON_OWNERS = [
  "Sarah Jenkins (Platform Eng)",
  "David Chen (Enterprise Architect)",
  "Amara Okafor (SecOps Lead)",
  "Marcus Vance (Cloud Director)",
  "Priya Sharma (Data Ops)",
  "Elena Rostova (DevOps)",
  "Robert Taylor (NetOps)",
];

export const DISCOVERY_SOURCES = [
  "AWS Discovery Connector",
  "Azure Resource Graph",
  "Google Cloud Asset Inventory",
  "Kubernetes Cluster Operator",
  "Dynatrace APM Agent",
  "CrowdStrike Falcon Sensor",
  "ServiceNow Agent",
  "Manual Provisioning",
];

