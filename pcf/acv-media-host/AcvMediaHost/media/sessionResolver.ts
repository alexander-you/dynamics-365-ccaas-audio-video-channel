// Dynamic acsGroupId resolution for the PCF media host.
//
// Adapted from src/agent-media-panel/src/sessionResolver.ts. The only change vs the panel is that
// the relay base URL is derived from an explicitly-passed tokenUrl (a PCF input) instead of a Vite
// build-time env var, so nothing is hardcoded and the PCF bundle carries no tenant value.
//
// No static/hardcoded acsGroupId, conversationId, liveWorkItemId, sessionId, contactId, caseId, or
// tenant value is ever used here — every id comes from the live URL / PCF input, and the acsGroupId
// comes from the relay lookup. If nothing resolves, the caller keeps the control in its waiting state.

/** Candidate URL/input parameter names that may carry the supported context id, in resolution order. */
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
function relayBaseFromTokenUrl(tokenUrl: string): string {
  return tokenUrl.replace(/\/api\/token\/?$/i, "");
}

/**
 * Resolve the acsGroupId for an explicit context id via the relay session endpoint.
 * Returns the acsGroupId string, or undefined if it could not be resolved. Never throws.
 */
export async function resolveAcsGroupIdById(
  idName: string,
  idValue: string,
  tokenUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<string | undefined> {
  if (!idValue || idValue.trim() === "") return undefined;
  const base = relayBaseFromTokenUrl(tokenUrl);
  const url = `${base}/api/session?${encodeURIComponent(idName)}=${encodeURIComponent(idValue.trim())}`;
  try {
    const res = await fetchImpl(url, { method: "GET" });
    if (!res.ok) return undefined;
    const body = (await res.json()) as { acsGroupId?: string };
    const groupId = typeof body.acsGroupId === "string" ? body.acsGroupId.trim() : "";
    return groupId !== "" ? groupId : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve the acsGroupId from a URL query string (reads the first supported context id, then asks
 * the relay). Returns undefined when no id is present or the lookup fails.
 */
export async function resolveAcsGroupIdFromSearch(
  search: string,
  tokenUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<string | undefined> {
  const id = readContextId(search);
  if (!id) return undefined;
  return resolveAcsGroupIdById(id.name, id.value, tokenUrl, fetchImpl);
}
