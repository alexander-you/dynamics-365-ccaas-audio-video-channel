// Azure Communication Services helper for the BYOC relay (POC, C5).
//
// Mints short-lived ACS identities + VoIP access tokens so the agent media panel
// (browser, GitHub Pages) can join a real ACS call. Uses the ACS connection string
// resolved from Key Vault via the relay's app settings (ACS_CONNECTION_STRING).
//
// NOTE (POC): the /api/token endpoint is anonymous so the static panel can call it.
// A production deployment must protect token issuance (authenticated caller, per-user
// identity reuse, abuse throttling). Tokens are scoped to `voip` only.

import { CommunicationIdentityClient } from '@azure/communication-identity';

let cachedClient;

function getClient() {
  if (!cachedClient) {
    const connectionString = process.env.ACS_CONNECTION_STRING;
    if (!connectionString || connectionString.startsWith('@') || connectionString.startsWith('{')) {
      throw new Error(
        'ACS_CONNECTION_STRING is not configured (Key Vault reference unresolved). ' +
          'Set it to the ACS resource connection string.',
      );
    }
    cachedClient = new CommunicationIdentityClient(connectionString);
  }
  return cachedClient;
}

/**
 * Create a fresh ACS user and issue a VoIP access token for it.
 * Returns { userId, token, expiresOn, endpoint }.
 */
export async function issueVoipToken() {
  const { user, token, expiresOn } = await getClient().createUserAndToken(['voip']);
  return {
    userId: user.communicationUserId,
    token,
    expiresOn: expiresOn instanceof Date ? expiresOn.toISOString() : expiresOn,
    endpoint: process.env.ACS_ENDPOINT || null,
  };
}
