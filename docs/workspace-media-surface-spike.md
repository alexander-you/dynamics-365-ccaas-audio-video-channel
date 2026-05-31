# Workspace media-surface spike — which Dynamics 365 surface can publish camera/mic for ACS

> **Type:** READ-ONLY feasibility spike. **No** Dynamics 365 / Power Platform components were created
> or modified, **no** PCF was built or deployed, **no** web resources / custom pages were created in
> the environment, **no** Azure resources were provisioned, **no** app profiles / workstreams / queues
> / routing / session templates were changed, and **no** new product features were added.
> **Date:** 2026-05-31.

## Decision constraint (carried from prior turn)

The top-level browser **pop-out window is REJECTED as the agent UX** and must not be the target
solution. It remains only as a hidden developer diagnostic behind `?debug=1`. The target UX is
**native Omnichannel chat in the Communication Panel + the Visual Engagement media experience INSIDE
the Dynamics 365 workspace.** Every recommendation below honors that constraint.

Related: [workspace-media-publishing-findings.md](workspace-media-publishing-findings.md) ·
[cif-v2-configuration.md](cif-v2-configuration.md) §10 ·
[d365-agent-workspace-integration.md](d365-agent-workspace-integration.md) ·
[known-limitations.md](known-limitations.md).

---

## 1. Why the current embedded tab fails (confirmed)

The Visual Engagement panel is a **third-party-website Application Tab** — our hosted panel runs in a
**cross-origin iframe** owned by the Dynamics workspace. Publishing video requires `getUserMedia`
(camera/mic capture); receiving remote video does not. A cross-origin iframe is **denied**
camera/microphone unless the **parent** frame delegates them via `allow="camera; microphone"`, and we
cannot set the host's iframe attribute.

**Confirmed by live in-tab diagnostics (2026-05-31):**

| Diagnostic | Value |
|---|---|
| Camera permission | denied |
| Microphone permission | denied |
| getUserMedia | **failed** — `NotAllowedError: Permission denied` |
| Permissions Policy | `NotAllowedError … (likely the Dynamics app-tab iframe missing allow="camera; microphone")` |
| LocalVideoStream created | Yes |
| startVideo | success |
| Local preview rendered | No |
| Video published to ACS | Yes (object attached — **no frames**, because capture was denied) |

→ Root cause is the **cross-origin iframe Permissions Policy**, not our code or hosting. The black
Agent tile is the visible symptom: a `LocalVideoStream` is attached to the call but carries no frames.

**Key implication for surface selection:** the fix is to host the publishing code on a surface that is
**not a cross-origin iframe to our domain** — i.e. a surface that runs in the **Dynamics page's own
origin/DOM**, so capture is governed by the top-level model-driven app page's policy rather than a
denied cross-origin delegation.

---

## 2. PCF code component — is it likely to support getUserMedia?

**Most promising — but a hypothesis until tested.**

What is **verified** (Microsoft Learn, code-components best practices):

- A PCF code component renders into a **container `<div>` in the host model-driven app page** — it runs
  **in the app's own DOM and origin** (`*.crm.dynamics.com`), not in a cross-origin iframe to our
  domain. This removes the cross-origin Permissions-Policy delegation gate that blocks the current tab.
- PCF **bundles** its dependencies into a single component bundle; external `<script src>` tags are
  **not supported** ("Always bundle the modules… `<script>` … isn't supported inside a code
  component"). The ACS Calling SDK must therefore be **bundled** (npm import), not script-tag loaded.
- Accessing the **host DOM outside the component boundary is unsupported**, and `window.localStorage` /
  `window.sessionStorage` use is discouraged. The ACS SDK must operate within the component's own
  container and avoid reaching into host DOM.
- Code components run in **model-driven apps, canvas apps, and Power Pages**; Customer Service
  workspace / Copilot Service workspace are model-driven hosts, so a **field/dataset or (preferably) a
  form/tab-hosted** control is in scope.

What is **NOT verified** and must be validated:

- Whether the **top-level model-driven app page** (`*.crm.dynamics.com`) sets a **Permissions-Policy
  response header** that allows `camera; microphone` for itself. If the host page's own policy disables
  these features document-wide, even same-origin/in-DOM code cannot call `getUserMedia`. This is the
  single most important unknown.
- Whether the ACS Calling SDK runs cleanly inside PCF: it uses **Web Workers / WASM**, a large bundle
  (our current single-file build is ~5.7 MB), and a long-lived call/`AudioContext`. PCF guidance warns
  against large/development bundles and unsupported framework methods; ACS needs validation against
  these constraints, plus the PCF `destroy` lifecycle must tear the call down.
- Whether **microphone autoplay / audio output** and screen-share (`display-capture`) behave inside the
  PCF container.

**Verdict:** PCF is the strongest candidate because it eliminates the cross-origin iframe. Feasibility
is **a well-grounded hypothesis, not yet proven** — it hinges on the host page's Permissions-Policy
header and on ACS-SDK-in-PCF runtime constraints (worker/WASM/bundle/lifecycle).

---

## 3. HTML Web Resource — is it likely to support getUserMedia?

**Plausible and the cheapest first test — but with a real caveat.**

What is **verified** (Microsoft Learn, web resources):

- An HTML web resource is served from **`<env>.crm.dynamics.com/WebResources/…`** — i.e. the **same
  origin** as the model-driven app. A **same-origin** subframe **inherits** the parent's permission by
  default (unlike the current cross-origin third-party tab), so it is far more likely to be allowed to
  capture — **if** the parent page's Permissions-Policy permits camera/microphone at all (§2 unknown).
- Web resources are **static browser-processed files** (HTML/JS/CSS) — no server code. Our panel is a
  static bundle, so it is hostable in principle. External `<script src>` to a third-party CDN is best
  avoided; bundle the ACS SDK into the uploaded JS (and mind the **5 MB** default
  `MaxUploadFileSize` — our ~5.7 MB bundle likely needs the org file-size limit raised or
  code-splitting).

Caveats / unknowns:

- Microsoft explicitly notes web resources are intended for content **not behind an authentication
  boundary** and recommends **PCF / custom pages** for "tighter external integrations." A web resource
  is still typically rendered **inside an iframe** on a form/tab; whether Dynamics applies a restrictive
  **`sandbox`** attribute or a document **Permissions-Policy** that strips camera/microphone on that
  same-origin frame is **not documented** and must be tested.
- CSP: the page may restrict connect/worker sources; ACS needs WebSocket/HTTPS to ACS + workers/WASM.

**Verdict:** A web resource is the **smallest, lowest-ceremony surface to empirically test** whether a
same-origin Dynamics surface can call `getUserMedia`. It may publish where the cross-origin tab cannot,
but it shares the same top-level Permissions-Policy unknown as PCF and adds a possible `sandbox`/CSP
constraint. Good **first probe**; PCF is the better **target** if both work.

---

## 4. Custom Page — is it viable?

**Viable as a host; same unknowns as PCF, plus context-flow questions.**

- A **custom page** (embedded canvas app in a model-driven app) is hosted by the Power Apps platform on
  the Dynamics origin and can be opened in the workspace (navigation / page). It can host a PCF code
  component or call out to ACS via a control, so it does not introduce a cross-origin iframe to our
  domain.
- **Camera/mic:** governed by the same top-level Permissions-Policy unknown as §2. No separate
  advantage over PCF for capture; its value is **layout/host** (a full-page media stage with platform
  navigation), not a different permission model.
- **Session context:** a custom page can receive parameters and call Dataverse / client APIs, but
  wiring it to the **live conversation's `acsGroupId`** (currently delivered via the relay into
  `conversationcontext`) needs design — it is **not** a CIF provider by default. This is solvable but is
  extra plumbing compared to PCF on a form already in the session.

**Verdict:** Viable, but it offers **no capture advantage over PCF** and adds context-flow work. Prefer
it only if a full-page media stage or canvas composition is specifically wanted.

---

## 5. App Tab / App Side Pane — can the iframe `allow` be fixed?

**No supported maker/admin control over the iframe `allow` attribute — document as a limitation.**

- The current Visual Engagement tab is an **Application Tab (Third-Party Website)** → a cross-origin
  iframe whose `allow` / `sandbox` attributes are **set by the Dynamics host**, not by configuration we
  can author. There is **no documented admin/maker setting** to add `camera; microphone` to that
  iframe's `allow` list.
- An **App Side Pane** is a host **container** that displays a page / web resource / custom page; it
  inherits whatever the **hosted surface** permits. A side pane that hosts a **same-origin web resource
  or a PCF/custom page** could work (per §2–§4); a side pane pointing at our **third-party URL** has the
  **same cross-origin block** as today's tab.

**Verdict (limitation):** For a **third-party (our-domain) URL**, neither the App Tab nor the App Side
Pane exposes a supported way to grant camera/microphone — this is a **platform limitation** and is
recorded as such. The path forward is to change the **hosted surface type** (to a same-origin/in-DOM
surface), not to try to fix the third-party iframe's permissions.

---

## 6. Risks and unknowns

1. **Top-level Permissions-Policy header (highest risk).** If the model-driven app page
   (`*.crm.dynamics.com`) disables `camera`/`microphone` at the **document** level, then PCF, web
   resource, custom page, and side pane **all fail equally** — being same-origin only helps if the host
   document allows the feature in the first place. This must be measured/validated before any build.
2. **ACS SDK runtime inside PCF/web resource.** Web Workers, WASM, AudioContext, long-lived call,
   ~5.7 MB bundle vs PCF size guidance and web-resource 5 MB upload limit; CSP `connect-src` /
   `worker-src` for ACS endpoints.
3. **Sandbox attribute** on the web-resource/custom-page iframe possibly stripping media even
   same-origin.
4. **Context flow** (`acsGroupId`) to a non-CIF surface (custom page / web resource) — solvable but
   unbuilt.
5. **Duplicate agent endpoint** (separate problem, carried from the pop-out test): any design must
   ensure **exactly one** agent media endpoint per session, or the customer can subscribe to a
   video-less endpoint and still see black.
6. **Supportability.** Even if it works technically, whether Microsoft **supports** publishing WebRTC
   media from an embedded workspace surface for a custom A/V channel is a separate question (§7).

---

## 7. Microsoft validation questions

1. Does the model-driven app page (Customer Service / Copilot Service workspace, `*.crm.dynamics.com`)
   emit a **Permissions-Policy** that allows `camera; microphone; display-capture` at the document
   level? If not, is there a supported way to enable it?
2. Can a **PCF code component** legitimately call `navigator.mediaDevices.getUserMedia` and run the ACS
   Calling SDK (Web Workers / WASM / long-lived call) inside Customer Service / Copilot Service
   workspace? Any size/lifecycle constraints?
3. Is an **HTML web resource** iframe given a `sandbox` attribute or a restrictive Permissions-Policy
   that would block camera/microphone even though it is same-origin?
4. Is there a supported way to add `allow="camera; microphone"` to an **Application Tab / Side Pane**
   iframe (third-party website page type)?
5. Is publishing **custom ACS WebRTC media** from any embedded Dynamics workspace surface a **supported
   scenario** for a custom audio/video channel today, or a platform limitation / roadmap item?
6. Recommended surface for an in-workspace custom media experience that needs camera/mic (PCF vs custom
   page vs web resource)?

> Items 1–5 from [known-limitations.md](known-limitations.md) §3 remain open and are tightened by this
> spike: the embed question is now specifically **"which same-origin/in-DOM surface gets document-level
> camera/microphone permission."**

---

## 8. Recommended next implementation step (smallest safe step)

**Recommendation (no pop-out):** move the camera/mic-publishing surface **off the cross-origin
third-party app tab** and onto a **same-origin / in-DOM Dynamics surface**, validated empirically and
with Microsoft, in this order:

1. **First, a tiny same-origin probe — HTML web resource (cheapest test).** Upload a minimal HTML/JS
   web resource (≈ the existing diagnostics probe: `navigator.permissions.query` + a guarded
   `getUserMedia({audio,video})` that stops tracks immediately) and read the same diagnostics from
   **inside the workspace**. This answers Risk #1 (document Permissions-Policy) and Risk #3 (sandbox)
   with the least effort and **no ACS dependency**. *(Requires approval to create one web resource — not
   done in this spike.)*
2. **If the probe captures successfully, build the PCF target.** Wrap the existing `IMediaSession` /
   agent panel as a **PCF code component** (the `IMediaSession` boundary means no UI rewrite), bundling
   the ACS Calling SDK, hosted on a form/tab in the agent session. PCF is the better **product** surface
   (in-DOM, solution-managed, lifecycle-aware) than a raw web resource.
3. **In parallel, get Microsoft answers to §7** so the chosen surface is **supported**, not just
   technically working.

**Why this order:** the web-resource probe is the **smallest reversible experiment** that converts the
biggest unknown (does any same-origin Dynamics surface get document-level camera permission?) into a
fact, before investing in a PCF build. The pop-out is **not** part of this path.

---

## 9. Is a proof-of-concept build justified?

**Not yet a full build.** Justified next step is the **minimal same-origin web-resource capture probe**
(step 1) — a few-line HTML/JS file, no ACS, fully reversible — to confirm the permission model. A
**PCF POC build is justified only after** (a) the probe shows same-origin capture works and/or
(b) Microsoft confirms the supported surface. Until then, building PCF risks discovering the same
document-level Permissions-Policy block at much higher cost.

---

## 10. Pause / summary

Per instruction, **stop here and await approval.** Summary of the five required points:

1. **Most likely surface to support camera/mic publishing:** a **same-origin / in-DOM** surface — **PCF
   code component** (target) or **HTML web resource** (probe). Both avoid the cross-origin iframe that
   blocks the current tab; both still depend on the host page's document-level Permissions-Policy.
2. **Is PCF genuinely feasible or only a hypothesis?** A **well-grounded hypothesis**: verified that PCF
   runs in the host DOM/origin and can bundle the ACS SDK; **not yet proven** for `getUserMedia` +
   ACS-SDK runtime (worker/WASM/bundle/lifecycle) and the document Permissions-Policy.
3. **Is an HTML web resource a better first test?** **Yes** — it is the smallest, cheapest same-origin
   probe to confirm the permission model before any PCF investment, though PCF is the better final
   product surface.
4. **Is Microsoft validation required?** **Yes** — specifically the document-level Permissions-Policy on
   the workspace page, PCF/web-resource media support, sandbox behavior, and whether embedded custom
   WebRTC publishing is a supported scenario (§7).
5. **Smallest safe next step:** a **minimal same-origin web-resource capture probe** (no ACS, stops
   tracks immediately, reads the same diagnostics) — **pending your approval to create one web
   resource**. No PCF build, no Azure, no schema, no routing changes until the probe + Microsoft answers
   are in.

---

## 11. Probe APPROVED + DEPLOYED (2026-05-31) — `alex_acv_capture_probe.html`

> **Status:** the same-origin capture probe (step 1) was **approved and created**. This is the only
> change made: **one HTML web resource**, additive and unbound. No ACS, no Dataverse writes from the
> probe, no storage, no tokens, no secrets; no routing / workstream / queue / app-profile / session-
> template / capacity change; no Azure provisioning; nothing bound to navigation or any template.

**What was created**

| Item | Value |
|---|---|
| Component | HTML web resource (`webresourcetype = 1`) |
| Name | `alex_acv_capture_probe.html` |
| Web resource id | *(per-environment GUID; resolve by name — not committed to the public repo)* |
| Solution | `alex_visual_engagement_channel` (unmanaged, prefix `alex`) |
| Environment | **Demo Contact Center EN** only (`demo-contact-center-en.crm4.dynamics.com`) — Demo Contact Center HE untouched |
| Source of truth | [dataverse/webresources/alex_acv_capture_probe.html](../dataverse/webresources/alex_acv_capture_probe.html) |
| Deploy script | [scripts/deploy-capture-probe.ps1](../scripts/deploy-capture-probe.ps1) (create/update + publish) |

**What the probe does** — displays origin, iframe status, "inside Dynamics" detection, secure-context,
and `document.featurePolicy.allowsFeature('camera'|'microphone')`; runs `navigator.permissions.query`
for camera/microphone on load (no prompt); and on an explicit **button click** runs one guarded
`getUserMedia({ video: true, audio: true })`, renders a local preview if possible, then **stops all
tracks immediately**. It reports getUserMedia success/failure, exact error name + message, and whether
a Permissions-Policy block is likely. It never calls ACS, Dataverse data APIs, storage, or tokens.

**How to test (no binding required — both are safe, reversible launch methods)**

1. **Inside the model-driven app shell (recommended — closest to the real embedded surface):** while
   signed in to the workspace app, open
   `https://demo-contact-center-en.crm4.dynamics.com/main.aspx?pagetype=webresource&webresourceName=alex_acv_capture_probe.html`
   — this hosts the web resource in the app's content frame (same origin) without adding it to any
   site map, form, or session template.
2. **Direct top-level (control comparison):**
   `https://demo-contact-center-en.crm4.dynamics.com/WebResources/alex_acv_capture_probe.html` — loads
   the same page top-level on the Dynamics origin. Comparing (1) vs (2) isolates whether the **app
   shell frame** (sandbox / document policy) changes the result versus a plain same-origin page.

Click **Run capture test** in each and record the diagnostics.

**RESULT (live runs, 2026-05-31).** The top-level test (test 2) was run twice: first with the camera
held by another process (`NotReadableError`), then again with the camera free — **clean success**. The
app-shell test (test 1) still needs a live run.

| Diagnostic | App-shell (test 1) | Top-level (test 2) |
|---|---|---|
| Inside iframe | _tbd_ | **No** |
| Permissions-Policy allows camera | _tbd_ | **Yes** |
| Permissions-Policy allows microphone | _tbd_ | **Yes** |
| Camera permission | _tbd_ | **granted** |
| Microphone permission | _tbd_ | **granted** |
| getUserMedia | _tbd_ | **SUCCESS** |
| Local preview created | _tbd_ | **Yes** |
| Permissions Policy blocking | _tbd_ | **No — capture succeeded** |
| Exact error (name + message) | _tbd_ | _(none — first run was `NotReadableError: Device in use` = device contention; cleared on re-run)_ |

**Reading of the top-level result (confirmed):** on the same-origin Dynamics origin, a custom HTML
surface **can fully capture camera + microphone** — `getUserMedia({video,audio})` **succeeded** and a
**local preview rendered**. The earlier `NotReadableError: Device in use` was pure **device
contention** (camera held by another tab/app), not a policy denial; freeing the device produced a clean
success. This is the **opposite** of the cross-origin app-tab (`NotAllowedError: Permission denied`)
and confirms the Dynamics origin's document policy does **not** disable capture.

**One read still needed to close this out:**
- **Run the app-shell test (test 1)** so the `Inside iframe = Yes` row is filled —
  `…/main.aspx?pagetype=webresource&webresourceName=alex_acv_capture_probe.html`. This mirrors the real
  embedded workspace document policy and is the decisive read for **PCF / web-resource-on-a-form**
  viability. (Free the camera first so contention doesn't mask the result.)

**Interpretation rules (decided in advance, to avoid bias):**

- **If getUserMedia SUCCEEDS in the app shell (test 1):** same-origin Dynamics hosting **can** access
  camera/microphone → proceed to a **PCF or web-resource media host**; the cross-origin app-tab was the
  only blocker. PCF becomes the recommended product surface.
- **If it FAILS in the app shell but SUCCEEDS top-level (test 2):** the **app shell frame**
  (sandbox / document Permissions-Policy) is the blocker even same-origin → escalate to Microsoft
  (validation §7 item 1/3); a raw web resource on a form may not be enough; re-scope.
- **If it FAILS in both:** the **browser/OS or the Dynamics origin's document policy** blocks capture →
  strong evidence the workspace document-level policy disables camera/microphone for custom surfaces →
  **Microsoft validation is mandatory** before any PCF build.

**Rollback (one step):** delete the web resource and publish.

```powershell
# Remove the probe (Demo Contact Center EN). Requires an authenticated pac/az session.
$dv = "https://demo-contact-center-en.crm4.dynamics.com"
$tok = az account get-access-token --resource $dv --query accessToken -o tsv
$h = @{ Authorization = "Bearer $tok"; Accept = "application/json" }
$wr = Invoke-RestMethod -Headers $h `
  -Uri "$dv/api/data/v9.2/webresourceset?`$filter=name eq 'alex_acv_capture_probe.html'&`$select=webresourceid"
$id = $wr.value[0].webresourceid
Invoke-RestMethod -Method Delete -Headers $h -Uri "$dv/api/data/v9.2/webresourceset($id)"
# then PublishXml the deletion
```

The probe is **not** referenced by any site map, form, dashboard, ribbon, session template, or app
profile, so deleting it changes no other behavior.
