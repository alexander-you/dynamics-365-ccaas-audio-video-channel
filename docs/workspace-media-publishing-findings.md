# Workspace media-publishing findings — agent camera/microphone inside the Dynamics 365 workspace

**Date:** 2026-05-31
**Scope:** why the agent's camera/microphone does not publish from the embedded Visual Engagement
panel, and which supported Dynamics 365 surface (if any) can publish WebRTC media without a browser
pop-up. **No new features, recording, transcription, routing, or Dataverse schema** are added until
this is understood.

> **Decision up front:** the top-level pop-out window is **rejected** as the agent UX. It was used
> only as a diagnostic and is now hidden behind `?debug=1`. The target UX is **native Omnichannel
> chat in the Communication Panel + the Visual Engagement media experience INSIDE the Dynamics
> workspace.**

---

## 0. Symptom (observed live)

- Routing/context is solved: the Visual Engagement tab opens in the agent session, resolves the
  dynamic `acsGroupId`, and **joins the same ACS group** as the customer.
- The agent **receives** the customer's video (the customer tile renders in the tab).
- The customer's **"Agent" tile stays black** — the agent never publishes camera video.
- Audio path is established (group call connected).
- In the pop-out diagnostic test, the customer's Agent tile **still** stayed black while a **third**
  participant appeared (two "Agent" endpoints: the embedded tab + the pop-out). This points at two
  separate problems that must not be conflated — see §6.

### 0.1 CONFIRMED live reading (2026-05-31, in-tab Media diagnostics)

| Diagnostic | Value |
|---|---|
| Camera permission | **denied** |
| Microphone permission | **denied** |
| getUserMedia | **failed** |
| LocalVideoStream created | Yes |
| startVideo | success |
| Local preview rendered | **No** |
| Video published to ACS | Yes |
| Browser error | `NotAllowedError: Permission denied` |
| Permissions Policy | `NotAllowedError: Permission denied (likely the Dynamics app-tab iframe missing allow="camera; microphone")` |

**Conclusion: the iframe Permissions-Policy hypothesis (§2) is CONFIRMED.** `getUserMedia` is denied
inside the embedded Dynamics app-tab iframe, with camera/mic permission `denied` and a `NotAllowedError`.

**Important caveat on "startVideo: success" / "Video published to ACS: Yes":** these do **not** mean
frames are flowing. The ACS SDK accepted a `LocalVideoStream` and attached it to the call, but because
`getUserMedia` was denied there are **no camera frames** — which is exactly why `Local preview
rendered = No` and the customer's Agent tile is **black**. "Published" here means *a stream object is
on the call*, not *media is being transmitted*. This is the precise root cause of the black tile.

---

## 1. Why camera publishing fails inside the current Dynamics tab

The Visual Engagement tab is a **third-party-website Application Tab**, i.e. the hosted panel runs in
an **iframe** owned by the Dynamics workspace. Publishing video requires `getUserMedia` (camera/mic
capture). Receiving remote video does **not** require `getUserMedia`, which is exactly why the agent
can see the customer but cannot publish — consistent with the observed symptom.

Inside a browser, `getUserMedia` for `camera`/`microphone` is governed by **Permissions Policy**
(formerly Feature Policy). A cross-origin iframe is **denied** camera/microphone **unless the parent
frame explicitly delegates them** via the iframe's `allow="camera; microphone"` attribute. The
embedding `<iframe>` is rendered by the Dynamics host — **our hosted panel cannot set its own
`allow` attribute** — so if the host does not delegate these features, capture is blocked.

**This is now measured, not assumed.** The panel ships an in-tab **Media diagnostics** section
(`AgentPanel.renderDiagnostics` + `RealMediaSession.runDiagnostics`) that reports, on the embedded
surface itself:

| Diagnostic | What it tells us |
|---|---|
| Camera permission / Microphone permission | Permissions API state (`granted` / `denied` / `prompt` / `unknown`) |
| getUserMedia | Whether a direct capture attempt succeeded or failed on this surface |
| LocalVideoStream created | Whether the ACS `LocalVideoStream` was constructed |
| startVideo | Whether `call.startVideo` / join-with-video published the stream |
| Local preview rendered | Whether the agent self-preview tile rendered |
| Video published to ACS | Whether the agent video is in the group call |
| Browser error | The **exact** error string (e.g. `NotAllowedError: …`) |
| Permissions Policy | The **exact** Permissions-Policy signal, when detected |

Expected reading inside the Dynamics tab if the iframe blocks capture: **getUserMedia = failed**,
**Browser error = `NotAllowedError`**, **Permissions Policy** populated, video published = No. The
same panel opened top-level (debug pop-out or standalone) should read **getUserMedia = success**.

---

## 2. Is the limitation caused by iframe Permissions Policy?

**CONFIRMED — yes** (live reading §0.1). The signature is exactly as predicted:

- receive-only works (no `getUserMedia` needed), publish fails;
- the failure surfaces as `NotAllowedError: Permission denied`, with camera/mic permission `denied`
  **inside the iframe**, even though the OS/browser grants camera access to the site at top level;
- `getUserMedia = failed` in the tab; the same code publishes fine when the panel is loaded
  **top-level** (not in the Dynamics iframe).

The diagnostics ruled out the alternative: this is **not** a case of `getUserMedia = success` in-tab
with a later `startVideo` failure, so the ACS-client hypothesis (§4) stays secondary.

**It is not:**

- **GitHub Pages hosting** — Pages serves over HTTPS with a valid cert; a secure context is satisfied,
  and the same build publishes video fine at top level. Hosting origin is not the blocker.
- **Browser security in general** — top-level capture works; only the embedded frame is constrained.
- **A static-group / token bug** — routing, group join, and token minting all succeed.

---

## 3. Can another Dynamics surface solve it?

The question reduces to: **does any supported Dynamics workspace hosting surface render its content
in a frame whose `allow` list includes `camera; microphone` (or render it same-origin so Permissions
Policy is inherited as allowed)?** Candidate surfaces, with the property that matters:

| Surface | How content is hosted | Can it delegate camera/mic? |
|---|---|---|
| **Application tab — third-party website** (current) | Cross-origin iframe to our URL | **No** in this env (observed). Host controls `allow`. |
| **Channel provider panel (CIF v2)** | Cross-origin iframe to our URL | Same constraint — needs host `allow`; **to verify**. |
| **Web resource (HTML)** | Same-origin (`*.crm.dynamics.com`) iframe/content | **Possibly** — same-origin content can inherit top-level permission, **to verify**; ACS SDK + CSP must be hostable. |
| **Custom page (Power Apps, embedded canvas)** | Hosted by the platform | **To verify** — depends on the page host's frame `allow`. |
| **PCF code component** | Runs **in the app's own DOM** (model-driven host), not our iframe | **Most promising** — code runs in the host page context, so capture is governed by the top-level app's policy, **to verify**. |
| **Side pane / app side pane** | Hosts a page/web resource/custom page | Inherits whatever the hosted surface allows (see above). |

Key insight: the surfaces most likely to publish are the ones that run **in the Dynamics page's own
origin/DOM** (web resource, PCF) rather than a cross-origin third-party iframe, because then there is
no cross-origin Permissions-Policy gate to be denied. This must be **validated**, not assumed —
Dynamics may still apply CSP/sandbox constraints, and the ACS Calling SDK has its own hosting
requirements (workers, WASM, microphone constraints).

---

## 4. Is it Dynamics iframe hosting, GitHub Pages, browser security, or the ACS client?

| Candidate | Verdict |
|---|---|
| **Dynamics iframe hosting (Permissions Policy)** | **Primary suspect.** Cross-origin app-tab iframe not delegated camera/mic → `getUserMedia` denied. |
| GitHub Pages hosting | Ruled out. HTTPS secure context; same build publishes at top level. |
| Browser security (general) | Ruled out as a blanket cause. Top-level capture works in the same browser. |
| ACS client implementation | **Secondary.** The join/publish code is correct (it publishes top-level). Re-open only if diagnostics show `getUserMedia = success` in-tab but `startVideo`/publish still fails. |

---

## 5. Is Microsoft product-group validation required?

**Yes, for the definitive answer.** What our diagnostics establish locally:

- whether the **current** app-tab iframe blocks capture (Permissions Policy / `NotAllowedError`);
- whether a **candidate** surface (web resource / PCF / custom page) allows capture, by loading the
  same probe there and reading the diagnostics.

What requires **Microsoft** confirmation (not determinable from our code alone):

1. Whether Dynamics **intends** to delegate `camera; microphone` on any first-party hosting surface
   (app tab, CIF panel, custom page host) and, if so, how to opt in.
2. Whether there is a **supported** configuration to publish WebRTC media from an embedded workspace
   surface for a custom (non-Microsoft) audio/video channel — i.e. is this a supported scenario or a
   platform limitation today.
3. Any roadmap for camera/mic Permissions-Policy delegation on CIF/app-tab iframes.

> Until Microsoft confirms a supported embedded publishing path, treat embedded agent-camera
> publishing as **unverified / possibly unsupported** on the cross-origin app-tab surface.

---

## 6. Two distinct problems (do not conflate)

1. **Capture is blocked in the embedded iframe** (this document's focus) → agent can't get camera
   bits at all. Fix = a hosting surface that allows `getUserMedia`.
2. **Duplicate "Agent" endpoint** seen in the pop-out test → the embedded tab **and** the pop-out
   both joined the group as separate agent participants, so the customer can subscribe to the
   video-less embedded endpoint and still see black even when another endpoint publishes. Any future
   design must ensure **exactly one** agent media endpoint per session. (Recorded here so it is not
   lost; not actioned in this step.)

---

## 7. Recommended path (avoids a pop-up UX)

1. **Confirm the blocker in-tab (no new build needed):** open the Visual Engagement tab live, run
   **Media diagnostics**, and capture: getUserMedia result, exact Browser error, Permissions-Policy
   string. This converts "almost certainly Permissions Policy" into a recorded fact.
2. **Spike a same-origin / in-DOM surface (read-only investigation first):** evaluate a **PCF code
   component** (runs in the app's own DOM) and/or an **HTML web resource** (same-origin) hosting the
   same ACS publish probe. Load the diagnostics probe there and read getUserMedia/startVideo. PCF is
   the most promising because it does not introduce a cross-origin iframe.
3. **Validate with Microsoft** (§5) in parallel: is embedded camera/mic publishing supported for a
   custom A/V channel on any workspace surface, and how to opt in to camera/mic delegation.
4. **Only if Microsoft confirms there is no supported embedded publishing path** do we revisit a
   non-pop-up alternative (e.g. a docked side-pane that itself hosts a permitted surface). A floating
   browser pop-up remains rejected.

**Net recommendation:** keep native Omnichannel chat in the Communication Panel; keep the Visual
Engagement experience in the workspace; **move the media-publishing surface from the cross-origin
app-tab iframe to a same-origin/in-DOM surface (PCF first, web resource second)** and confirm with
the in-tab diagnostics + Microsoft before building anything further.

---

## 8. What shipped with this finding (diagnostics + UX guardrail only)

- In-tab **Media diagnostics** section (permissions, getUserMedia, LocalVideoStream, startVideo,
  local preview, published, exact error, exact Permissions-Policy error).
- Pop-out call window **removed from the agent UX**, retained only behind `?debug=1` and labelled
  "debug only — not the product UX".
- Documentation updated: [cif-v2-configuration.md](cif-v2-configuration.md) §10.8 marks the pop-out
  **rejected / diagnostic-only**.

No routing, queues, capacity, Dataverse schema, recording, or transcription were changed.
