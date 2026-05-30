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

// Shape returned by the relay's POST /api/token (C5): { userId, token, expiresOn, endpoint }.
interface RelayTokenResponse {
  userId: string;
  token: string;
  expiresOn: string;
  endpoint: string | null;
}

// Real-mode token fetch. The relay endpoint is anonymous and only mints an ACS VoIP token,
// so the customer page calls it directly (no session/consent endpoints in the POC relay).
export async function issueRelayToken(): Promise<TokenResponse> {
  const data = await postJson<Record<string, never>, RelayTokenResponse>("/api/token", {});
  return {
    acsUserId: data.userId,
    token: data.token,
    expiresOn: data.expiresOn,
    sessionId: "",
    isMock: false
  };
}

// Routing plane: create a routed D365 Contact Center conversation so an agent receives a
// work item. The relay POST /api/inbound is anonymous in the POC and maps avContext into the
// Messaging API conversationcontext. Returns the conversation id (or a mock id in mock mode).
export interface InboundResult {
  accepted: boolean;
  mode: string;
  conversationId?: string;
}

export async function requestInbound(
  customerName: string,
  avContext: Record<string, string>
): Promise<InboundResult> {
  return postJson<{ customerName: string; avContext: Record<string, string> }, InboundResult>(
    "/api/inbound",
    { customerName, avContext }
  );
}
