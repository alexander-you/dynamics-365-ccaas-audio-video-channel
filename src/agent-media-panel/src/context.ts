// A/V conversation context resolution for the agent media panel (Phase 4A, C3).
//
// PURPOSE: read the incoming Audio/Video interaction context that the BYOC relay attaches to the
// routed conversation, so the panel renders the right case/contact and launches the correct media
// type (audio vs audio-video) instead of using only build-time mock defaults.
//
// WHERE THE CONTEXT COMES FROM (mock-safe, no tenant data, no secrets):
//   - The relay puts these variables into the Messaging API `conversationcontext` when it creates a
//     conversation: `mode`, `requestedMedia`, `sessionRef` (see src/byoc-relay/src/lib/omnichannel.js).
//   - When the panel is opened as a CIF v2 widget, Dynamics appends context to the landing URL query
//     string and/or exposes it via Microsoft.CIFramework.getEnvironment(). We read the URL query
//     string here (works both inside Dynamics and for standalone testing) and let cif.ts merge any
//     CIF-environment values on top.
//
// Precedence (highest first): URL query string → Vite build env (VITE_MOCK_*) → hard defaults.

export type RequestedMedia = "audio" | "audio-video";

/** The resolved A/V context the panel renders and launches from. Display-only; no record IDs. */
export interface AvContext {
  /** Relay mode that created the conversation: "mock" or "live". Display-only. */
  mode: string;
  /** Media the customer requested. Drives the agent's initial camera state. */
  requestedMedia: RequestedMedia;
  /** Correlation reference from the relay (conversationrequestid / sessionRef). */
  sessionRef: string;
  /**
   * ACS group-call GUID to join, resolved dynamically per session from the relay/CIF conversation
   * context. The customer entry point joins the same group. Empty = no session context yet → the
   * live panel shows a waiting state and does NOT start a call (there is no static fallback group).
   */
  acsGroupId: string;
  caseNumber: string;
  caseTitle: string;
  contactName: string;
}

const DEFAULTS: AvContext = {
  mode: "mock",
  requestedMedia: "audio-video",
  sessionRef: "",
  acsGroupId: "",
  caseNumber: "CAS-01234-ABCDE",
  caseTitle: "Sample support case (mock)",
  contactName: "Sample Customer"
};

function envDefaults(): Partial<AvContext> {
  const env = import.meta.env as Record<string, string | undefined>;
  const out: Partial<AvContext> = {};
  if (env.VITE_MOCK_CASE_NUMBER) out.caseNumber = env.VITE_MOCK_CASE_NUMBER;
  if (env.VITE_MOCK_CONTACT_NAME) out.contactName = env.VITE_MOCK_CONTACT_NAME;
  return out;
}

function coerceMedia(value: string | null | undefined): RequestedMedia | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase();
  if (v === "audio" || v === "audio-only" || v === "audioonly") return "audio";
  if (v === "audio-video" || v === "audiovideo" || v === "video" || v === "av") return "audio-video";
  return undefined;
}

/**
 * Parse an A/V context from a URL query string. Unknown/missing values fall back to env then
 * defaults. Pure function (no globals) so it is trivially testable.
 */
export function parseAvContext(search: string): AvContext {
  const params = new URLSearchParams(search);
  const env = envDefaults();
  const get = (key: string): string | undefined => {
    const raw = params.get(key);
    return raw && raw.trim() !== "" ? raw.trim() : undefined;
  };

  return {
    mode: get("mode") ?? DEFAULTS.mode,
    requestedMedia:
      coerceMedia(get("requestedMedia")) ?? DEFAULTS.requestedMedia,
    sessionRef: get("sessionRef") ?? DEFAULTS.sessionRef,
    acsGroupId: get("acsGroupId") ?? DEFAULTS.acsGroupId,
    caseNumber: get("caseNumber") ?? env.caseNumber ?? DEFAULTS.caseNumber,
    caseTitle: get("caseTitle") ?? DEFAULTS.caseTitle,
    contactName: get("contactName") ?? env.contactName ?? DEFAULTS.contactName
  };
}

/** Read the A/V context from the current page URL. Safe in any environment. */
export function readAvContext(): AvContext {
  const search = typeof window !== "undefined" ? window.location.search : "";
  return parseAvContext(search);
}

/**
 * True when the panel is running inside an iframe — e.g. the Dynamics 365 application tab. Inside
 * that iframe, camera/microphone capture is frequently blocked by the host's Permissions Policy
 * (the app-tab iframe has no `allow="camera; microphone"`), so WebRTC capture must happen in a
 * top-level window instead. A cross-origin parent throws on access, which also means "embedded".
 */
export function isEmbeddedIframe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/** The minimum context needed to launch the top-level call window. */
export interface CallWindowContext {
  acsGroupId: string;
  mode: string;
  requestedMedia: RequestedMedia;
  sessionRef: string;
}

/**
 * Build the top-level "call window" URL: the SAME hosted panel, carrying the SAME dynamic
 * acsGroupId so the pop-out joins the exact ACS group the customer (and the embedded tab) joined.
 *
 * Security: this URL never contains a token or any secret. ACS access tokens are minted at runtime
 * by the relay `/api/token` endpoint inside the pop-out; only the (non-secret) group GUID and
 * display-only routing hints travel on the query string. No static/hardcoded group is ever used —
 * if acsGroupId is empty the caller must not open the window.
 */
export function buildCallWindowUrl(ctx: CallWindowContext): string {
  const origin = window.location.origin;
  const path = window.location.pathname;
  const params = new URLSearchParams();
  params.set("mode", ctx.mode || "live");
  // surface=tab makes the pop-out act as the media stage (it joins the call); popout=1 marks it as
  // the top-level publishing window so the UI can adjust its messaging.
  params.set("surface", "tab");
  params.set("popout", "1");
  params.set("acsGroupId", ctx.acsGroupId);
  params.set("requestedMedia", ctx.requestedMedia);
  if (ctx.sessionRef) params.set("sessionRef", ctx.sessionRef);
  return `${origin}${path}?${params.toString()}`;
}
