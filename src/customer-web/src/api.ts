// Thin client for the token service. Phase 3 scaffold.
import type {
  ConsentRecord,
  ConsentResult,
  SessionRequest,
  SessionResponse,
  TokenRequest,
  TokenResponse
} from "./types";

const BASE_URL = (import.meta.env.VITE_TOKEN_SERVICE_BASE_URL ?? "").replace(/\/$/, "");

function url(path: string): string {
  // Empty base => rely on the Vite dev proxy (/api -> :7071).
  return `${BASE_URL}${path}`;
}

async function postJson<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const res = await fetch(url(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request to ${path} failed (${res.status}): ${text}`);
  }
  return (await res.json()) as TRes;
}

export const tokenService = {
  issueToken: (req: TokenRequest) => postJson<TokenRequest, TokenResponse>("/api/token", req),
  createSession: (req: SessionRequest) => postJson<SessionRequest, SessionResponse>("/api/session", req),
  captureConsent: (req: ConsentRecord) => postJson<ConsentRecord, ConsentResult>("/api/consent", req)
};
