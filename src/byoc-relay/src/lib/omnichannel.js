// Omnichannel Messaging API client for the BYOC relay (POC).
//
// Contract (Dynamics 365 Contact Center "Messaging API"):
//   Base URL:  https://m-{org_id}.{geo}.omnichannelengagementhub.com
//   Auth:      OAuth 2.0 client-credentials, scope
//              https://{org_id_without_dash}-c.{zone}.dynamics.com/.default
//   Headers:   Authorization: Bearer {token}
//              channel-id: {custom_channel_id_guid}
//              organization-id: {org_id_guid}
//   Endpoints: POST /conversation/create        -> start a conversation
//              POST /conversation/{id}           -> send message / typing / end
//              GET  /conversations               -> list active conversations
//              GET  /conversation/{id}/messages  -> retrieve messages
//              GET  /conversation/{id}/context   -> fetch context
//
// Ref: https://learn.microsoft.com/en-us/dynamics365/contact-center/extend/intro-messaging-apis
//      https://learn.microsoft.com/en-us/dynamics365/contact-center/extend/configure-custom-messaging-channel
//
// This module is mock-aware: when RELAY_MODE !== 'live', no real token is acquired and
// no outbound HTTP call is made — calls are logged and a synthetic conversation id is
// returned so the relay can be exercised end-to-end without touching D365.

import { ClientSecretCredential } from '@azure/identity';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || value.startsWith('{')) {
    throw new Error(`Missing required configuration: ${name}`);
  }
  return value;
}

export function isLive() {
  return (process.env.RELAY_MODE || 'mock').toLowerCase() === 'live';
}

let cachedCredential;

function getCredential() {
  if (!cachedCredential) {
    cachedCredential = new ClientSecretCredential(
      requiredEnv('OC_TENANT_ID'),
      requiredEnv('OC_CLIENT_ID'),
      requiredEnv('OC_CLIENT_SECRET'),
    );
  }
  return cachedCredential;
}

async function getToken() {
  const scope = requiredEnv('OC_TOKEN_SCOPE');
  const { token } = await getCredential().getToken(scope);
  if (!token) {
    throw new Error('Failed to acquire an access token for the Messaging API.');
  }
  return token;
}

function baseHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'channel-id': requiredEnv('OC_CHANNEL_ID'),
    'organization-id': requiredEnv('OC_ORG_ID'),
    'Content-Type': 'application/json',
  };
}

async function call(path, method, body, log) {
  const baseUrl = requiredEnv('OC_BASE_URL').replace(/\/+$/, '');
  const token = await getToken();
  const url = `${baseUrl}${path}`;
  log?.info(`[omnichannel] ${method} ${url}`);
  const res = await fetch(url, {
    method,
    headers: baseHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Messaging API ${method} ${path} failed: ${res.status} ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

/**
 * Start a new routed conversation and post the opening customer message that
 * carries the mock A/V context. Returns { conversationId, mode }.
 */
export async function createConversation({ customerName, avContext }, log) {
  const opening =
    `Audio/Video session requested by ${customerName || 'a customer'}.`;

  if (!isLive()) {
    const conversationId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    log?.info(`[omnichannel:mock] would create conversation -> ${conversationId}`);
    log?.info(`[omnichannel:mock] opening message: ${opening}`);
    log?.info(`[omnichannel:mock] avContext: ${JSON.stringify(avContext || {})}`);
    return { conversationId, mode: 'mock' };
  }

  const created = await call('/conversation/create', 'POST', {
    channelData: { source: 'acv-byoc-relay', avContext: avContext || {} },
    customer: { displayName: customerName || 'Audio/Video customer' },
  }, log);

  const conversationId = created.conversationId || created.id;
  await call(`/conversation/${conversationId}`, 'POST', {
    activity: {
      type: 'message',
      text: opening,
      channelData: { avContext: avContext || {} },
    },
  }, log);

  return { conversationId, mode: 'live' };
}
