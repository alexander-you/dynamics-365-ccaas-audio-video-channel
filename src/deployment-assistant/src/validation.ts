// Local, client-side validation for the Deployment Assistant. Phase 3.5 scaffold.
// These checks are advisory only — they do NOT validate anything against Azure.
import type { DeploymentInputs } from "./deploymentModel";

export interface FieldError {
  field: keyof DeploymentInputs;
  message: string;
}

// Azure resource group: letters, digits, '.', '_', '-', '(', ')'; 1-90 chars; cannot end with '.'.
const RG_RE = /^[-\w.()]{1,90}$/;
// Subscription IDs are GUIDs. We accept blank (entered later) but if present, sanity-check shape.
const GUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
// Prefix used in names: lowercase alphanumeric, short.
const PREFIX_RE = /^[a-z][a-z0-9]{1,9}$/;
// Region: lowercase letters + digits (e.g., westeurope, eastus2).
const REGION_RE = /^[a-z][a-z0-9]{2,30}$/;

export function validate(inputs: DeploymentInputs): FieldError[] {
  const errors: FieldError[] = [];

  if (!inputs.region || !REGION_RE.test(inputs.region)) {
    errors.push({ field: "region", message: "Enter a valid Azure region id (e.g., westeurope)." });
  }

  if (!inputs.prefix || !PREFIX_RE.test(inputs.prefix)) {
    errors.push({
      field: "prefix",
      message: "Prefix must be 2–10 chars, start with a letter, lowercase alphanumeric (e.g., acv)."
    });
  }

  if (!inputs.resourceGroup) {
    errors.push({ field: "resourceGroup", message: "Provide a resource group name." });
  } else if (!RG_RE.test(inputs.resourceGroup) || inputs.resourceGroup.endsWith(".")) {
    errors.push({ field: "resourceGroup", message: "Invalid resource group name per Azure rules." });
  }

  // Subscription id is optional at this stage, but if provided it should look like a GUID.
  if (inputs.subscriptionId && !GUID_RE.test(inputs.subscriptionId)) {
    errors.push({
      field: "subscriptionId",
      message: "Subscription ID should be a GUID, or leave it blank to fill in later."
    });
  }

  return errors;
}

/**
 * Heuristic guard against pasting secrets into the page. Returns a warning string if the value
 * looks like a connection string, key, SAS token, or bearer token. Advisory only.
 */
export function looksLikeSecret(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (/AccountKey=|SharedAccessSignature|connectionstring|endpoint=.*accesskey/i.test(v)) {
    return "This looks like a connection string. Do not paste secrets here.";
  }
  if (/\bsig=|[?&]sv=\d{4}-\d{2}-\d{2}/i.test(v)) {
    return "This looks like a SAS token. Do not paste secrets here.";
  }
  if (/^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\./.test(v)) {
    return "This looks like a JWT/bearer token. Do not paste secrets here.";
  }
  if (v.length > 60 && /[A-Za-z0-9+/]{40,}=*/.test(v)) {
    return "This looks like a key or secret. Do not paste secrets here.";
  }
  return null;
}
