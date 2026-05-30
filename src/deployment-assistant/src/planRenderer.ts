// Renders a generated deployment plan as HTML. Phase 3.5 scaffold (extended in Phase 3b).
// All output is clearly marked as NOT YET EXECUTED. No commands are run.
import type { DeploymentPlan, CostLevel, PermissionLevel } from "./deploymentModel";
import { buildAzCliCommands, buildApprovalChecklist, buildCostSummary } from "./deploymentModel";

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

  // Phase 3b: generated az CLI commands, approval checklist, cost summary.
  const azCommands = buildAzCliCommands(inputs);
  const azCliRows = azCommands
    .map(
      (c) => `
      <div class="cmd-block">
        <div class="cmd-desc">${esc(c.description)} ${
          c.changesState
            ? '<span class="tag tag-warn">creates cost / changes state</span>'
            : '<span class="tag tag-safe">read-only</span>'
        }</div>
        <pre class="code">${esc(c.command)}</pre>
      </div>`
    )
    .join("");

  const checklist = buildApprovalChecklist(inputs);
  const checklistRows = checklist
    .map((c) => `<li><span class="area area-${c.area.replace(/\s+/g, "")}">${esc(c.area)}</span> ${esc(c.text)}</li>`)
    .join("");

  const costSummary = buildCostSummary(inputs);
  const costRows = costSummary
    .map(
      (c) => `
      <tr>
        <td>${esc(c.resource)}</td>
        <td><span class="cost cost-${c.level}">${COST_LABEL[c.level]}</span></td>
        <td><small>${esc(c.note)}</small></td>
      </tr>`
    )
    .join("");

  return `
    <div class="plan-banner">
      ⚠️ This is a generated PREVIEW. <strong>Nothing has been created.</strong>
      No Azure or Dynamics 365 calls were made. No deployment has been executed.
      Review with your administrator before any deployment.
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

    <h3>5. Example Azure CLI commands (generated — not executed)</h3>
    <p class="muted">Copy, review, and run manually <strong>only after approval</strong>. The assistant never runs these.</p>
    ${azCliRows}

    <h3>6. Cost warning summary</h3>
    <p class="muted">These resources incur cost. ACS usage (per-minute media + recording + transcription) is the main driver.</p>
    <table>
      <thead><tr><th>Resource</th><th>Cost level</th><th>Note</th></tr></thead>
      <tbody>${costRows}</tbody>
    </table>

    <h3>7. Manual steps if you are not using automation</h3>
    <pre class="code">${esc(manualSteps)}</pre>

    <h3>8. Pre-deployment approval checklist</h3>
    <p class="muted">Every item must be confirmed by the responsible owner before any real deployment.</p>
    <ul class="checklist">${checklistRows}</ul>

    <h3>9. Manual approval gates</h3>
    <ul class="gates">
      <li>✋ Azure subscription, resource group, region, and naming convention approved.</li>
      <li>✋ Cost impact reviewed and accepted (ACS usage is the main driver).</li>
      <li>✋ RBAC / Managed Identity assignments approved by an Owner / User Access Administrator.</li>
      <li>✋ Dynamics 365 environment, solution, publisher, and prefix confirmed (later phase).</li>
      <li>✋ Power Platform managed/unmanaged solution import approved (later phase).</li>
    </ul>

    <h3>10. What you must never commit to Git</h3>
    <ul class="gates">
      <li>🔒 Real subscription IDs, tenant IDs, and resource group names with real values.</li>
      <li>🔒 Connection strings, access keys, ACS keys, and tokens.</li>
      <li>🔒 <code>local.settings.json</code>, <code>.env.local</code>, and filled <code>*.bicepparam</code> files.</li>
      <li>🔒 Any secret value — use Key Vault references instead.</li>
    </ul>

    <h3>11. Next steps</h3>
    <ol>
      <li>Export this plan and review it with your Azure administrator.</li>
      <li>Provision resources via Portal (manual steps above) or the Bicep scaffold under <code>infra/</code> (after approval).</li>
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

  lines.push("");
  lines.push("Example Azure CLI commands (GENERATED — NOT EXECUTED):");
  for (const c of buildAzCliCommands(plan.inputs)) {
    lines.push(`  # ${c.description} [${c.changesState ? "creates cost/changes state" : "read-only"}]`);
    for (const cl of c.command.split("\n")) {
      lines.push(`    ${cl}`);
    }
  }

  lines.push("");
  lines.push("Cost warning summary:");
  for (const c of buildCostSummary(plan.inputs)) {
    lines.push(`  - ${c.resource} [${c.level}]: ${c.note}`);
  }

  lines.push("");
  lines.push("Pre-deployment approval checklist:");
  for (const c of buildApprovalChecklist(plan.inputs)) {
    lines.push(`  [ ] (${c.area}) ${c.text}`);
  }

  lines.push("");
  lines.push("Never commit to Git: subscription/tenant IDs, keys, connection strings, tokens,");
  lines.push("local.settings.json, .env.local, filled *.bicepparam, or any secret value.");
  lines.push("No deployment has been executed by this assistant.");
  return lines.join("\n");
}
