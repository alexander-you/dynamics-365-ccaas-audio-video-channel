// Deployment model for the ACV Deployment Assistant. Phase 3.5 scaffold.
//
// This file describes the SHAPE of a deployment plan and the static catalog of Azure resources
// the solution needs. It contains NO tenant-specific values and performs NO network calls.

export type Environment = "dev" | "test" | "prod";

/** User-provided inputs collected by the wizard. All optional until validated. */
export interface DeploymentInputs {
  subscriptionId: string; // entered manually; treated as non-secret identifier, not validated against Azure
  subscriptionLabel: string; // friendly name the admin types for their own reference
  region: string; // e.g., westeurope
  resourceGroup: string; // existing or to-be-created
  createResourceGroup: boolean;
  prefix: string; // customization/workload prefix, e.g., acv
  environment: Environment;
  useKeyVault: boolean;
  enableRecordingByos: boolean; // Blob BYOS for recordings (MVP default true)
}

export const DEFAULT_INPUTS: DeploymentInputs = {
  subscriptionId: "",
  subscriptionLabel: "",
  region: (import.meta.env.VITE_DEFAULT_REGION as string) ?? "westeurope",
  resourceGroup: "",
  createResourceGroup: true,
  prefix: (import.meta.env.VITE_DEFAULT_WORKLOAD as string) ?? "acv",
  environment: ((import.meta.env.VITE_DEFAULT_ENV as Environment) ?? "dev"),
  useKeyVault: true,
  enableRecordingByos: true
};

/** Suggested Azure regions (subset; the admin can type any valid region name). */
export const SUGGESTED_REGIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "westeurope", label: "West Europe" },
  { id: "northeurope", label: "North Europe" },
  { id: "uksouth", label: "UK South" },
  { id: "eastus", label: "East US" },
  { id: "eastus2", label: "East US 2" },
  { id: "westus2", label: "West US 2" },
  { id: "australiaeast", label: "Australia East" }
];

/** A region short code for the naming convention (best-effort; falls back to first 3 chars). */
const REGION_SHORT: Record<string, string> = {
  westeurope: "weu",
  northeurope: "neu",
  uksouth: "uks",
  eastus: "eus",
  eastus2: "eus2",
  westus2: "wus2",
  australiaeast: "aue"
};

export function regionShort(region: string): string {
  return REGION_SHORT[region] ?? region.slice(0, 3);
}

export type CostLevel = "none" | "low" | "variable" | "usage";
export type PermissionLevel = "contributor" | "owner-or-uaa" | "admin";

/** A planned Azure resource. `name` is derived from the naming convention. */
export interface PlannedResource {
  key: string;
  kind: string; // human-readable Azure resource kind
  purpose: string;
  /** Naming pattern builder given the inputs. */
  name: (i: DeploymentInputs) => string;
  cost: CostLevel;
  costNote: string;
  permission: PermissionLevel;
  /** True when this resource may be skipped depending on inputs (e.g., Key Vault). */
  optional?: boolean;
  /** Predicate to include this resource based on inputs. */
  include?: (i: DeploymentInputs) => boolean;
  /** What an admin must do manually if not using automation. */
  manualStep: string;
}

// Naming convention: <type>-<workload>-<env>-<region>[-nn]
// Storage accounts strip dashes and must be globally unique + lowercase alphanumeric.
const n = (type: string, i: DeploymentInputs, nn?: string) =>
  `${type}-${i.prefix}-${i.environment}-${regionShort(i.region)}${nn ? `-${nn}` : ""}`;

const storageName = (purpose: string, i: DeploymentInputs) =>
  `st${i.prefix}${purpose}${i.environment}${regionShort(i.region)}01`.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Static catalog of resources the solution needs (MVP). */
export const RESOURCE_CATALOG: ReadonlyArray<PlannedResource> = [
  {
    key: "rg",
    kind: "Resource Group",
    purpose: "Logical container for all ACV resources in this environment.",
    name: (i) => i.resourceGroup || n("rg", i),
    cost: "none",
    costNote: "No direct cost.",
    permission: "contributor",
    manualStep: "Azure Portal → Resource groups → Create."
  },
  {
    key: "acs",
    kind: "Azure Communication Services",
    purpose: "Real-time audio/video media, ACS Rooms, Call Automation, recording, transcription.",
    name: (i) => n("acs", i),
    cost: "usage",
    costNote: "Pay-per-use: per-minute media + recording + transcription. Main usage cost driver.",
    permission: "contributor",
    manualStep: "Azure Portal → Communication Services → Create; pick a data location."
  },
  {
    key: "func",
    kind: "Function App (token service + orchestration)",
    purpose: "Issues ACS tokens, manages sessions, orchestrates recording metadata events.",
    name: (i) => n("func", i, "01"),
    cost: "variable",
    costNote: "Consumption/Flex plan: low at idle, scales with traffic.",
    permission: "contributor",
    manualStep: "Azure Portal → Function App → Create (.NET 8 isolated, Linux/Windows per plan)."
  },
  {
    key: "stfunc",
    kind: "Storage Account (Functions runtime)",
    purpose: "Required backing storage for the Function App runtime (AzureWebJobsStorage).",
    name: (i) => storageName("func", i),
    cost: "low",
    costNote: "Minimal storage + transaction cost.",
    permission: "contributor",
    manualStep: "Azure Portal → Storage accounts → Create (Standard LRS)."
  },
  {
    key: "strec",
    kind: "Storage Account + Blob container (recordings, BYOS)",
    purpose: "Bring-Your-Own-Storage for recording media files (the physical bytes).",
    name: (i) => storageName("rec", i),
    cost: "variable",
    costNote: "Grows with retained recordings; lifecycle policy recommended.",
    permission: "contributor",
    include: (i) => i.enableRecordingByos,
    manualStep: "Azure Portal → Storage accounts → Create; add a private 'recordings' container."
  },
  {
    key: "eventgrid",
    kind: "Event Grid (system topic + subscription)",
    purpose: "Delivers ACS call lifecycle / recording events to the orchestration Functions.",
    name: (i) => n("evgt", i),
    cost: "low",
    costNote: "Per-operation; very low at expected volumes.",
    permission: "contributor",
    manualStep: "Azure Portal → Event Grid System Topics → Create on the ACS resource; add subscription."
  },
  {
    key: "appinsights",
    kind: "Application Insights",
    purpose: "Telemetry, distributed tracing, and diagnostics for the Functions and clients.",
    name: (i) => n("appi", i),
    cost: "variable",
    costNote: "Ingestion-based; control with sampling.",
    permission: "contributor",
    manualStep: "Azure Portal → Application Insights → Create (workspace-based)."
  },
  {
    key: "loganalytics",
    kind: "Log Analytics Workspace",
    purpose: "Backing workspace for Application Insights and platform logs.",
    name: (i) => n("log", i),
    cost: "variable",
    costNote: "Ingestion + retention based.",
    permission: "contributor",
    manualStep: "Azure Portal → Log Analytics workspaces → Create."
  },
  {
    key: "keyvault",
    kind: "Key Vault",
    purpose: "Stores secret references (e.g., storage credential names) — never raw secrets in app settings.",
    name: (i) => n("kv", i, "01"),
    cost: "low",
    costNote: "Per-operation; negligible at expected volumes.",
    permission: "owner-or-uaa",
    optional: true,
    include: (i) => i.useKeyVault,
    manualStep: "Azure Portal → Key Vault → Create (RBAC authorization model)."
  }
];

/** Managed Identity + RBAC summary the assistant explains (no assignments are made). */
export interface RbacAssignment {
  identity: string;
  role: string;
  scope: string;
  why: string;
}

export const RBAC_MODEL: ReadonlyArray<RbacAssignment> = [
  {
    identity: "Function App system-assigned Managed Identity",
    role: "Storage Blob Data Contributor",
    scope: "Recordings storage account",
    why: "Write/read recording media files (BYOS) without storing keys."
  },
  {
    identity: "Function App system-assigned Managed Identity",
    role: "Key Vault Secrets User",
    scope: "Key Vault",
    why: "Read secret references at runtime instead of embedding secrets in settings."
  },
  {
    identity: "Function App system-assigned Managed Identity",
    role: "ACS data-plane role (validate exact role with Microsoft)",
    scope: "ACS resource",
    why: "Mint tokens and manage rooms/recording via identity instead of connection strings."
  },
  {
    identity: "Event Grid system topic",
    role: "Event delivery to Function endpoint",
    scope: "Function App",
    why: "Deliver ACS lifecycle events to orchestration Functions."
  }
];

/** Environment variables / app settings template (placeholders only). */
export interface AppSetting {
  key: string;
  value: (i: DeploymentInputs) => string;
  note: string;
  secret?: boolean; // if true, value must come from Key Vault reference, never inline
}

export const APP_SETTINGS_TEMPLATE: ReadonlyArray<AppSetting> = [
  { key: "FUNCTIONS_WORKER_RUNTIME", value: () => "dotnet-isolated", note: "Runtime worker." },
  { key: "USE_MOCKS", value: () => "false", note: "Set false only once real services are approved & wired." },
  { key: "ACS_ENDPOINT", value: (i) => `https://${n("acs", i)}.communication.azure.com`, note: "ACS endpoint (no key)." },
  { key: "ACS_USE_MANAGED_IDENTITY", value: () => "true", note: "Prefer Managed Identity over connection strings." },
  { key: "TOKEN_TTL_MINUTES", value: () => "60", note: "Token lifetime." },
  { key: "RECORDING_STORAGE_MODE", value: () => "AzureBlobBYOS", note: "MVP default storage mode." },
  { key: "RECORDINGS_STORAGE_ACCOUNT", value: (i) => storageName("rec", i), note: "BYOS account name." },
  { key: "RECORDINGS_CONTAINER", value: () => "recordings", note: "Blob container name." },
  { key: "RECORDINGS_STORAGE_AUTH", value: () => "ManagedIdentity", note: "Auth mode for storage." },
  { key: "KEYVAULT_URI", value: (i) => `https://${n("kv", i, "01")}.vault.azure.net/`, note: "Key Vault base URI." },
  { key: "DATAVERSE_URL", value: () => "", note: "Left blank until Dynamics 365 / Phase 5 approval." },
  { key: "APPLICATIONINSIGHTS_CONNECTION_STRING", value: () => "<set-from-app-insights>", note: "Set after App Insights is created.", secret: true }
];

/** A fully-resolved plan produced from validated inputs. */
export interface DeploymentPlan {
  inputs: DeploymentInputs;
  resources: Array<{ resource: PlannedResource; name: string }>;
  rbac: ReadonlyArray<RbacAssignment>;
  appSettings: Array<{ key: string; value: string; note: string; secret: boolean }>;
}

export function buildPlan(inputs: DeploymentInputs): DeploymentPlan {
  const resources = RESOURCE_CATALOG.filter((r) => (r.include ? r.include(inputs) : true)).map((r) => ({
    resource: r,
    name: r.name(inputs)
  }));

  const appSettings = APP_SETTINGS_TEMPLATE.map((s) => ({
    key: s.key,
    value: s.value(inputs),
    note: s.note,
    secret: Boolean(s.secret)
  }));

  return { inputs, resources, rbac: RBAC_MODEL, appSettings };
}

// =====================================================================================
// Phase 3b additions — example az CLI commands, approval checklist, cost summary.
// All of the below is GENERATED TEXT for human review. Nothing here executes anything.
// =====================================================================================

/** A generated, copy-pasteable command line plus a description. Never auto-executed. */
export interface GeneratedCommand {
  description: string;
  command: string;
  /** True when running this command would create cost or change cloud state. */
  changesState: boolean;
}

/**
 * Build illustrative `az` CLI commands for the plan. These mirror the Bicep scaffold under
 * /infra and the /scripts helpers. They are intended to be reviewed and run manually by an
 * administrator AFTER approval — the assistant never runs them.
 */
export function buildAzCliCommands(inputs: DeploymentInputs): GeneratedCommand[] {
  const rg = inputs.resourceGroup || n("rg", inputs);
  const acsName = n("acs", inputs);
  const env = inputs.environment;

  const cmds: GeneratedCommand[] = [];

  cmds.push({
    description: "Select the target subscription (replace with your subscription).",
    command: `az account set --subscription "<your-subscription-id>"`,
    changesState: false
  });

  if (inputs.createResourceGroup) {
    cmds.push({
      description: "Create the resource group (admin action; creates state).",
      command: `az group create --name ${rg} --location ${inputs.region}`,
      changesState: true
    });
  }

  cmds.push({
    description: "Preview the full deployment with what-if (no changes are made).",
    command:
      `az deployment group what-if \\\n` +
      `  --resource-group ${rg} \\\n` +
      `  --template-file infra/bicep/main.bicep \\\n` +
      `  --parameters infra/bicep/parameters/${env}.bicepparam`,
    changesState: false
  });

  cmds.push({
    description: "Deploy the infrastructure (ONLY after explicit approval; creates cost).",
    command:
      `az deployment group create \\\n` +
      `  --resource-group ${rg} \\\n` +
      `  --template-file infra/bicep/main.bicep \\\n` +
      `  --parameters infra/bicep/parameters/${env}.bicepparam`,
    changesState: true
  });

  cmds.push({
    description: "Show the ACS endpoint after deployment (read-only).",
    command: `az communication show --name ${acsName} --resource-group ${rg} --query "hostName" -o tsv`,
    changesState: false
  });

  return cmds;
}

/** A single item in the pre-deployment approval checklist. */
export interface ChecklistItem {
  area: "Azure" | "Dynamics 365" | "Security" | "Cost";
  text: string;
}

/** Approval checklist that must be confirmed before any real deployment. */
export function buildApprovalChecklist(inputs: DeploymentInputs): ChecklistItem[] {
  const items: ChecklistItem[] = [
    { area: "Azure", text: "Subscription, resource group, region, and naming convention approved." },
    { area: "Azure", text: "An Owner / User Access Administrator is available to assign RBAC roles." },
    { area: "Cost", text: "Cost impact reviewed and accepted (ACS usage is the main driver)." },
    { area: "Security", text: "No secrets, tenant IDs, or subscription IDs will be committed to Git." },
    { area: "Security", text: "Key Vault will hold secret references; app settings contain no raw secrets." },
    { area: "Dynamics 365", text: "Dynamics 365 environment, solution, publisher, and prefix confirmed (later phase)." },
    { area: "Dynamics 365", text: "Power Platform solution import approved (later phase)." }
  ];
  if (inputs.enableRecordingByos) {
    items.push({
      area: "Security",
      text: "Recording retention / lifecycle policy and consent handling reviewed for BYOS storage."
    });
  }
  if (!inputs.useKeyVault) {
    items.push({
      area: "Security",
      text: "Key Vault is DISABLED — confirm an alternative approved secret-handling approach."
    });
  }
  return items;
}

/** A cost-impacting line for the cost warning summary. */
export interface CostLine {
  resource: string;
  level: CostLevel;
  note: string;
}

/** Build the cost warning summary from the plan's resources. */
export function buildCostSummary(inputs: DeploymentInputs): CostLine[] {
  return RESOURCE_CATALOG.filter((r) => (r.include ? r.include(inputs) : true))
    .filter((r) => r.cost !== "none")
    .map((r) => ({ resource: r.kind, level: r.cost, note: r.costNote }));
}
