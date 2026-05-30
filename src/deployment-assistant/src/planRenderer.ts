// Renders a generated deployment plan as HTML. Phase 3.5 scaffold.
// All output is clearly marked as NOT YET EXECUTED. No commands are run.
import type { DeploymentPlan, CostLevel, PermissionLevel } from "./deploymentModel";

const COST_LABEL: Record<CostLevel, string> = {
  none: "No cost",
  low: "Low",
  variable: "Variable",
  usage: "Usage-based (main driver)"
};

const PERM_LABEL: Record<PermissionLevel, string> = {
  contributor: "Contributor on RG",
  "owner-or-uaa": "Owner / User Access Administrator (for RBAC)",
  admin: "Privileged admin"
};

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

export function renderPlan(plan: DeploymentPlan): string {
  const { inputs } = plan;

  const resourceRows = plan.resources
    .map(
      ({ resource, name }) => `
      <tr>
        <td><strong>${esc(resource.kind)}</strong>${resource.optional ? ' <span class="tag">optional</span>' : ""}</td>
        <td><code>${esc(name)}</code></td>
        <td>${esc(resource.purpose)}</td>
        <td><span class="cost cost-${resource.cost}">${COST_LABEL[resource.cost]}</span><br/><small>${esc(resource.costNote)}</small></td>
        <td><small>${PERM_LABEL[resource.permission]}</small></td>
      </tr>`
    )
    .join("");

  const rbacRows = plan.rbac
    .map(
      (r) => `
      <tr>
        <td>${esc(r.identity)}</td>
        <td><code>${esc(r.role)}</code></td>
        <td>${esc(r.scope)}</td>
        <td><small>${esc(r.why)}</small></td>
      </tr>`
    )
    .join("");

  const settingsLines = plan.appSettings
    .map((s) => {
      const val = s.secret ? "<from Key Vault reference — DO NOT inline>" : s.value || "<blank>";
      return `${s.key}=${val}`;
    })
    .join("\n");

  const manualSteps = plan.resources
    .map(({ resource }, idx) => `  ${idx + 1}. ${esc(resource.kind)} — ${esc(resource.manualStep)}`)
    .join("\n");

  // Illustrative Bicep parameter example (NOT executed, NOT a complete template).
  const bicepParams = JSON.stringify(
    {
      $schema: "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
      contentVersion: "1.0.0.0",
      parameters: {
        location: { value: inputs.region },
        prefix: { value: inputs.prefix },
        environment: { value: inputs.environment },
        enableRecordingByos: { value: inputs.enableRecordingByos },
        useKeyVault: { value: inputs.useKeyVault }
      }
    },
    null,
    2
  );

  return `
    <div class="plan-banner">
      ⚠️ This is a generated PREVIEW. <strong>Nothing has been created.</strong>
      No Azure or Dynamics 365 calls were made. Review with your administrator before any deployment.
    </div>

    <h3>1. Resource plan preview</h3>
    <table>
      <thead><tr><th>Resource</th><th>Proposed name</th><th>Purpose</th><th>Cost impact</th><th>Permission</th></tr></thead>
      <tbody>${resourceRows}</tbody>
    </table>

    <h3>2. Managed Identity &amp; RBAC (explanation only — not assigned)</h3>
    <table>
      <thead><tr><th>Identity</th><th>Role</th><th>Scope</th><th>Why</th></tr></thead>
      <tbody>${rbacRows}</tbody>
    </table>

    <h3>3. App settings / environment variables template</h3>
    <p class="muted">Placeholders only. Secrets must come from Key Vault references — never inline.</p>
    <pre class="code">${esc(settingsLines)}</pre>

    <h3>4. Example Bicep parameters (illustrative — not executed)</h3>
    <pre class="code">${esc(bicepParams)}</pre>

    <h3>5. Manual steps if you are not using automation</h3>
    <pre class="code">${esc(manualSteps)}</pre>

    <h3>6. Manual approval gates (must be confirmed before any real deployment)</h3>
    <ul class="gates">
      <li>✋ Azure subscription, resource group, region, and naming convention approved.</li>
      <li>✋ Cost impact reviewed and accepted (ACS usage is the main driver).</li>
      <li>✋ RBAC / Managed Identity assignments approved by an Owner / User Access Administrator.</li>
      <li>✋ Dynamics 365 environment, solution, publisher, and prefix confirmed (later phase).</li>
      <li>✋ Power Platform managed/unmanaged solution import approved (later phase).</li>
    </ul>

    <h3>7. Next steps</h3>
    <ol>
      <li>Export this plan and review it with your Azure administrator.</li>
      <li>Provision resources via Portal (manual steps above) or Infrastructure-as-Code (later).</li>
      <li>Fill <code>local.settings.json</code> / app settings from the template (no secrets in source control).</li>
      <li>Import the Power Platform solution and configure the channel (Phase 5/6).</li>
    </ol>
  `;
}

/** Plain-text export of the plan for sharing/review. */
export function renderPlanText(plan: DeploymentPlan): string {
  const lines: string[] = [];
  lines.push("ACV Deployment Plan (PREVIEW — NOTHING CREATED)");
  lines.push("=".repeat(50));
  lines.push(`Region:          ${plan.inputs.region}`);
  lines.push(`Resource group:  ${plan.inputs.resourceGroup} (${plan.inputs.createResourceGroup ? "create" : "existing"})`);
  lines.push(`Prefix / env:    ${plan.inputs.prefix} / ${plan.inputs.environment}`);
  lines.push(`Key Vault:       ${plan.inputs.useKeyVault ? "yes" : "no"}`);
  lines.push(`Recording BYOS:  ${plan.inputs.enableRecordingByos ? "yes" : "no"}`);
  lines.push("");
  lines.push("Resources:");
  for (const { resource, name } of plan.resources) {
    lines.push(`  - ${resource.kind}: ${name}  [cost: ${resource.cost}]`);
  }
  lines.push("");
  lines.push("App settings template (no secrets):");
  for (const s of plan.appSettings) {
    lines.push(`  ${s.key}=${s.secret ? "<from Key Vault reference>" : s.value || "<blank>"}`);
  }
  return lines.join("\n");
}
