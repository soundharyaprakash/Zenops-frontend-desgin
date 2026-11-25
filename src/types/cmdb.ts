export type CIClass =
  | "Server/VM"
  | "Container/Pod"
  | "Database"
  | "Application"
  | "Network Device"
  | "Cloud Resource"
  | "SaaS Subscription"
  | "Business Service"
  | "Service Offering";

export type LifecycleStatus =
  | "Pipeline"
  | "Ordered"
  | "In Stock"
  | "In Test"
  | "In Use"
  | "Maintenance"
  | "Retired"
  | "Disposed";

export type OperationalStatus =
  | "Operational"
  | "Degraded"
  | "Maintenance"
  | "Non-operational"
  | "Offline";

export type Environment =
  | "Production"
  | "Staging"
  | "QA / Test"
  | "Development"
  | "DR / Disaster Recovery";

export type BusinessCriticality =
  | "Tier 1 - Mission Critical"
  | "Tier 2 - Business Critical"
  | "Tier 3 - Business Operational"
  | "Tier 4 - Non-Critical";

export type DataClassification =
  | "Public"
  | "Internal"
  | "Confidential"
  | "Restricted"
  | "PII / PCI";

export interface IdentificationKeys {
  macAddress?: string;
  ipAddress?: string;
  fqdn?: string;
  cloudResourceId?: string;
  uuid?: string;
  serialNumber?: string;
}

export interface ScoreComponents {
  completeness: number; // 0-100
  freshness: number;    // 0-100
  accuracy: number;     // 0-100
  reconciliation: number; // 0-100
}

export interface DynamicAttributes {
  // Server / VM
  osName?: string;
  osVersion?: string;
  cpuCores?: number;
  ramGb?: number;
  diskGb?: number;
  ipAddress?: string;
  fqdn?: string;
  virtualizationType?: string;
  isVirtual?: boolean;

  // Container / Pod
  clusterName?: string;
  namespace?: string;
  containerImage?: string;
  imageTag?: string;
  podReplicas?: number;
  restartCount?: number;
  cpuLimit?: string;
  memLimit?: string;

  // Database
  dbEngine?: string;
  dbVersion?: string;
  port?: number;
  dbInstanceCount?: number;
  backupPolicy?: string;
  storageGb?: number;
  connectionString?: string;
  encryptionEnabled?: boolean;

  // Application
  appVersion?: string;
  runtimeStack?: string;
  architectureType?: string;
  apiEndpoint?: string;
  slaTier?: string;
  activeUsers?: number;
  releaseCycle?: string;

  // Network Device
  deviceType?: "Switch" | "Router" | "Firewall" | "Load Balancer" | "Gateway";
  firmwareVersion?: string;
  portCount?: number;
  managementIp?: string;
  vlanCount?: number;
  highAvailability?: boolean;

  // Cloud Resource
  cloudProvider?: "AWS" | "Azure" | "GCP" | "DigitalOcean";
  region?: string;
  zone?: string;
  accountId?: string;
  arn?: string;
  instanceType?: string;
  vpcId?: string;

  // SaaS Subscription
  vendorPortalUrl?: string;
  licenseType?: string;
  totalSeats?: number;
  assignedSeats?: number;
  renewalDate?: string;
  ssoProvider?: string;
  billingCycle?: "Monthly" | "Annual" | "Multi-Year";

  // Business Service
  serviceTier?: "Gold" | "Silver" | "Bronze" | "Platinum";
  businessOwner?: string;
  technicalOwner?: string;
  businessHours?: string;
  rto?: string;
  rpo?: string;
  disasterRecoveryPlan?: string;

  // Service Offering
  targetAudience?: string;
  pricingModel?: string;
  slaCommitment?: string;
  availabilityTarget?: string;
  supportWindow?: string;
  provisioningTime?: string;

  // Catch-all for extra attributes
  [key: string]: any;
}

export interface RelatedITSMRecord {
  id: string;
  type: "Incident" | "Change" | "Problem" | "Request";
  number: string;
  shortDescription: string;
  priority: "P1" | "P2" | "P3" | "P4";
  state: "New" | "In Progress" | "Pending Approval" | "Scheduled" | "Resolved" | "Closed";
  assignedTo?: string;
  openedAt: string;
}

export interface BusinessServiceItem {
  id: string;
  name: string;
  owner: string;
  technicalOwner?: string;
  tier: "Tier 0 - Mission Critical" | "Tier 1 - High" | "Tier 2 - Medium" | "Tier 3 - Low";
  serviceTier?: string;
  trustScore: number;
  ciCount: number;
  availabilityTarget: string;
  rto: string;
  rpo: string;
  revenuePerHour: number | string;
  userCount: number;
  slaReference: string;
  operationalStatus: OperationalStatus;
  status?: string;
  warning?: string;
  companyId?: string;
  description?: string;
  businessOwner?: string;
  dependentCIs?: string[];
}

export interface StagingDiscoveryRecord {
  id: string;
  source: string;
  rawPayload: Record<string, any>;
  receivedAt: string;
  reconcileStatus: "New" | "Matched" | "Needs review" | "Rejected";
  matchedCiId?: string;
  companyId: string;
  companyName: string;
  sourceFeed?: string;
  className?: string;
  externalId?: string;
  status?: "Pending" | "Processed" | "Error" | string;
  discoveredAt?: string;
  payload?: Record<string, any>;
}

export interface IREPayloadItem {
  className: string;
  values: Record<string, any>;
}

export interface IREPayload {
  source: string;
  company_id?: string;
  items: IREPayloadItem[];
}

export interface IRESimulationResult {
  matchedRule: string;
  action: "Create" | "Update" | "Review Required";
  confidenceScore: number;
  winningAttributes: { field: string; winnerSource: string; source?: string; weight: number; value: any }[];
  resultingCI: Partial<CIItem>;
  matchedCI?: CIItem;
  auditEntry: Record<string, any>;
}

export type ConfigurationItem = CIItem;
export type BusinessService = BusinessServiceItem;

export interface CIItem {
  id: string;
  sys_id?: string;
  name: string;
  sys_class_name?: string;
  sys_class_path?: string;
  company?: string;
  company_id?: string;
  sys_domain?: string;
  department?: string;
  ciClass: CIClass;
  description: string;
  lifecycleStatus: LifecycleStatus;
  install_status?: string | number;
  operationalStatus: OperationalStatus;
  environment: Environment;
  businessCriticality: BusinessCriticality;

  // Ownership
  owner: string;
  owned_by?: string;
  managed_by?: string;
  supported_by?: string;
  supportGroup: string;
  support_group?: string;
  assignment_group?: string;
  vendor?: string;
  manufacturer?: string;
  model?: string;
  model_id?: string;
  serialNumber?: string;
  serial_number?: string;
  assetTag?: string;
  asset_tag?: string;
  location?: string;
  costCenter?: string;
  cost_center?: string;
  installDate?: string;
  warrantyEnd?: string;
  warranty_expiration?: string;

  // Hardware & OS Specs
  os?: string;
  os_version?: string;
  cpu_name?: string;
  cpu_count?: number;
  cpu_core_count?: number;
  cpu_speed?: string;
  ram?: string;
  disk_space?: string;
  form_factor?: string;

  // Network & Identifiers
  ip_address?: string;
  mac_address?: string;
  fqdn?: string;
  default_gateway?: string;
  dns_domain?: string;
  correlation_id?: string;

  // Financial & Asset
  po_number?: string;
  invoice_number?: string;
  purchase_date?: string;
  cost?: number;
  currency?: string;
  gl_account?: string;
  lease_id?: string;

  // Security & Compliance
  dataClassification: DataClassification;
  complianceFlags: string[];
  identificationKeys: IdentificationKeys;
  maintenance_schedule?: string;
  skip_sync?: boolean;
  unverified?: boolean;
  fault_count?: number;
  hardware_status?: string;
  tags?: string[];
  watch_list?: string[];

  // Data Quality & Discovery
  discoverySource: string;
  firstDiscovered: string;
  lastDiscovered: string;
  lastVerified: string;
  sourceRanking: number; // 1-5
  trustScore: number;    // 0-100
  scoreComponents: ScoreComponents;
  scoreReasons: string[];
  qualityFlags: string[];

  // Dynamic Attributes
  attributes: DynamicAttributes;
  field_sources?: Record<string, { source: string; timestamp: string; conflict?: boolean }>;
  related_records?: RelatedITSMRecord[];

  // Metadata
  changeRecord?: string;
  createdAt: string;
  updatedAt: string;
}

export type RelationshipType =
  | "Depends on"
  | "Hosted on"
  | "Runs on"
  | "Connects to"
  | "Contains"
  | "Provides to"
  | "Managed by";

export type DirectionType = "Upstream" | "Downstream" | "Bidirectional";
export type CriticalityWeight = "Critical" | "High" | "Medium" | "Low";

export interface CIRelationship {
  id: string;
  parentCiId: string;
  parentCiName: string;
  parentCiClass: CIClass;
  childCiId: string;
  childCiName: string;
  childCiClass: CIClass;
  relationshipType: RelationshipType;
  direction: DirectionType;
  criticalityWeight: CriticalityWeight;
  notes?: string;
  createdAt: string;
}

export interface DiscoverySource {
  id: string;
  name: string;
  type: "Cloud Provider" | "Agent-based" | "Network Scanner" | "Kubernetes Operator" | "API Integration" | "Directory Service";
  credentialsRef: string;
  scope: string;
  schedule: string;
  lastRun: string;
  result: "Success" | "Partial" | "Failed" | "In Progress";
  cisDiscovered: number;
  cisUpdated: number;
  status: "Active" | "Paused" | "Error";
}

export interface ReconciliationRule {
  id: string;
  name: string;
  ciClass: CIClass;
  identifierAttributes: string[];
  sourcePriority: string[];
  mergeAction: "Auto Merge" | "Require Approval" | "Overwrite" | "Create Alias";
  staleThreshold: number; // in days
  active: boolean;
  matchCount?: number;
  author?: string;
  authorId?: string;
  approvalStatus?: "Draft" | "Pending Approval" | "Approved";
  approvedBy?: string;
}

export type DataQualityStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Applied"
  | "Awaiting owner acceptance"
  | "Dismissed";

export interface DataQualityDiff {
  field: string;
  before: string;
  after: string;
}

export interface AlternativeFixOption {
  id: string;
  label: string;
  description: string;
  actionType: "remediate" | "retire";
  isDestructive?: boolean;
}

export interface DataQualityTask {
  id: string;
  ciId: string;
  ciName: string;
  ciClass: CIClass;
  issueType:
    | "Missing Required Ownership"
    | "Stale Discovery"
    | "Attribute Conflict"
    | "Duplicate Suspect"
    | "Compliance Mismatch"
    | "Unassigned Support Group";
  proposedFix: string;
  confidence: number;
  confidenceBasis?: string;
  approver: string;
  approverRole?: string;
  status: DataQualityStatus;
  severity: "Critical" | "High" | "Medium" | "Low";
  createdAt: string;
  dueDate?: string;
  decidedAt?: string;
  dismissReason?: string;
  dismissCategory?: string;
  evidenceRef?: string;
  diff?: DataQualityDiff;
  scoreGain?: number;
  alternativeFixes?: AlternativeFixOption[];
  proposedOwner?: {
    name: string;
    team: string;
    email?: string;
  };
}

export interface AttestationCampaign {
  id: string;
  name: string;
  scope: string;
  ownerList: string[];
  dueDate: string;
  outcome: "In Progress" | "Completed" | "Overdue" | "Draft";
  completionPercentage: number;
  totalCIs: number;
  certifiedCIs: number;
  rejectedCIs: number;
}

export interface CIAuditHistory {
  id: string;
  ciId: string;
  ciName: string;
  fieldChanged: string;
  beforeValue: string;
  afterValue: string;
  changedBy: string;
  timestamp: string;
  changeRecord?: string;
  changeType: "Update" | "Create" | "Retire" | "Reconcile" | "Attestation";
}

export interface DashboardMetrics {
  totalCIs: number;
  operationalCIs: number;
  nonOperationalCIs: number;
  averageTrustScore: number;
  staleCIPercentage: number;
  staleCount?: number;
  duplicateRate: number;
  duplicateSuspects?: number;
  missingOwnerCount?: number;
  missingOwnerPercent?: number;
  attestationCompletion: number;
  completenessScore?: number;
  discoveryCoverage?: number;
  impactAccuracy?: number;
}

export type StandardRole =
  | "CMDB Manager"
  | "CMDB Administrator"
  | "Data Steward"
  | "Discovery / Integration Admin"
  | "CI Owner"
  | "Service Owner"
  | "Service Desk Agent"
  | "Change Manager"
  | "Incident / Problem Analyst"
  | "Auditor"
  | "Executive / Report Viewer"
  | "Integration service account"
  | "Break-glass Administrator";

export type LegacyRole = "Admin" | "CMDB Owner" | "Editor" | "Viewer";

export type UserRole = StandardRole | LegacyRole;

export interface TenantInfo {
  id: string;
  name: string;
  domain: string;
  shortName: string;
}

