// Dynamic acsGroupId resolution for the agent media panel (Option A wiring).
//
// PURPOSE: when the Visual Engagement media tab opens, the D365 session-template slug puts a
// SUPPORTED context id on this panel's URL (one of: convId / conversationId / liveWorkItemId /
// sessionId). This module reads that id and asks the relay (GET /api/session) for the ACS group
// the customer minted, so the agent joins the SAME ACS group at runtime.
//
// No static/hardcoded acsGroupId, conversationId, liveWorkItemId, sessionId, contactId, caseId, or
// tenant value is ever used here — every id comes from the live URL, and the acsGroupId comes from
// the relay lookup. If nothing resolves, the caller keeps the panel in its safe waiting state.

/** Candidate URL parameter names that may carry the supported context id, in resolution order. */
const ID_PARAM_NAMES = ["liveWorkItemId", "conversationId", "convId", "sessionId"] as const;

/** Read the first present supported context id from a URL query string. */
export function readContextId(search: string): { name: string; value: string } | undefined {
  const params = new URLSearchParams(search);
  for (const name of ID_PARAM_NAMES) {
    const raw = params.get(name);
    if (raw && raw.trim() !== "") {
      return { name, value: raw.trim() };
    }
  }
  return undefined;
}

/** Derive the relay base URL from the configured token endpoint (strip the trailing /api/token). */
function relayBaseFromTokenUrl(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const tokenUrl =
    env.VITE_TOKEN_URL ??
    "https://func-acv-byoc-relay-vnusoc.azurewebsites.net/api/token";
  return tokenUrl.replace(/\/api\/token\/?$/i, "");
}

/**
 * Resolve the acsGroupId for the supplied context id via the relay session endpoint.
 * Returns the acsGroupId string, or undefined if it could not be resolved (no id, network
 * failure, 404, or store disabled). Never throws.
 */
export async function resolveAcsGroupId(
  search: string,
  fetchImpl: typeof fetch = fetch
): Promise<string | undefined> {
  const id = readContextId(search);
  if (!id) {
    return undefined;
  }
  const base = relayBaseFromTokenUrl();
  const url = `${base}/api/session?${encodeURIComponent(id.name)}=${encodeURIComponent(id.value)}`;
  try {
    const res = await fetchImpl(url, { method: "GET" });
    if (!res.ok) {
      return undefined;
    }
    const body = (await res.json()) as { acsGroupId?: string };
    const groupId = typeof body.acsGroupId === "string" ? body.acsGroupId.trim() : "";
    return groupId !== "" ? groupId : undefined;
  } catch {
    return undefined;
  }
}
