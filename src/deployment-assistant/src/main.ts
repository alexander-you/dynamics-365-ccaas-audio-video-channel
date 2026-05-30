// Deployment Assistant entry point. Phase 3.5 scaffold.
// LOCAL-ONLY: collects inputs, validates locally, and renders a deployment plan preview.
// It does NOT call Azure or Dynamics 365 and it does NOT store secrets.
import { DEFAULT_INPUTS, SUGGESTED_REGIONS, buildPlan, type DeploymentInputs } from "./deploymentModel";
import { validate, looksLikeSecret } from "./validation";
import { renderPlan, renderPlanText } from "./planRenderer";

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
};

const state: DeploymentInputs = { ...DEFAULT_INPUTS };

// --- populate region options ----------------------------------------------
function initRegions(): void {
  const select = $<HTMLSelectElement>("region");
  for (const r of SUGGESTED_REGIONS) {
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.textContent = `${r.label} (${r.id})`;
    if (r.id === state.region) opt.selected = true;
    select.appendChild(opt);
  }
}

// --- bind inputs to state --------------------------------------------------
function bindInputs(): void {
  $<HTMLInputElement>("subscriptionId").value = state.subscriptionId;
  $<HTMLInputElement>("subscriptionLabel").value = state.subscriptionLabel;
  $<HTMLInputElement>("resourceGroup").value = state.resourceGroup;
  $<HTMLInputElement>("prefix").value = state.prefix;
  $<HTMLSelectElement>("environment").value = state.environment;
  $<HTMLInputElement>("createResourceGroup").checked = state.createResourceGroup;
  $<HTMLInputElement>("useKeyVault").checked = state.useKeyVault;
  $<HTMLInputElement>("enableRecordingByos").checked = state.enableRecordingByos;

  const on = (id: string, handler: (el: HTMLInputElement | HTMLSelectElement) => void) => {
    const el = $<HTMLInputElement>(id);
    el.addEventListener("input", () => handler(el));
    el.addEventListener("change", () => handler(el));
  };

  on("subscriptionId", (el) => {
    state.subscriptionId = el.value.trim();
    warnIfSecret("subscriptionId", el.value);
  });
  on("subscriptionLabel", (el) => (state.subscriptionLabel = el.value.trim()));
  on("resourceGroup", (el) => (state.resourceGroup = el.value.trim()));
  on("prefix", (el) => (state.prefix = el.value.trim().toLowerCase()));
  on("region", (el) => (state.region = (el as HTMLSelectElement).value));
  on("environment", (el) => (state.environment = (el as HTMLSelectElement).value as DeploymentInputs["environment"]));
  on("createResourceGroup", (el) => (state.createResourceGroup = (el as HTMLInputElement).checked));
  on("useKeyVault", (el) => (state.useKeyVault = (el as HTMLInputElement).checked));
  on("enableRecordingByos", (el) => (state.enableRecordingByos = (el as HTMLInputElement).checked));
}

function warnIfSecret(field: string, value: string): void {
  const warn = looksLikeSecret(value);
  const el = document.getElementById(`warn-${field}`);
  if (el) {
    el.textContent = warn ?? "";
    el.classList.toggle("hidden", !warn);
  }
}

// --- generate plan ---------------------------------------------------------
function generate(): void {
  const errors = validate(state);
  const errEl = $("errors");
  if (errors.length > 0) {
    errEl.innerHTML = errors.map((e) => `<li>${e.message}</li>`).join("");
    errEl.classList.remove("hidden");
    $("plan-output").innerHTML = "";
    $("export-plan").classList.add("hidden");
    return;
  }
  errEl.classList.add("hidden");

  const plan = buildPlan(state);
  $("plan-output").innerHTML = renderPlan(plan);
  const exportBtn = $("export-plan");
  exportBtn.classList.remove("hidden");
  exportBtn.onclick = () => downloadText("acv-deployment-plan.txt", renderPlanText(plan));
  $("plan-output").scrollIntoView({ behavior: "smooth", block: "start" });
}

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- bootstrap -------------------------------------------------------------
initRegions();
bindInputs();
$("generate").addEventListener("click", generate);
