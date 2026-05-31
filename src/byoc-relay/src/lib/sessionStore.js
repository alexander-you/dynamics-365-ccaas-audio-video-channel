// Temporary session-correlation store for the BYOC A/V relay (POC).
//
// PURPOSE (and ONLY purpose): correlate a Dynamics 365 conversation / live work item
// id with the ACS group id the customer minted, so the agent media panel can resolve
// the correct ACS group at runtime instead of receiving a static/hardcoded group.
//
//   key (RowKey)  -> conversationId (or liveWorkItemId / sessionId — whatever the
//                    session-template slug emits; they are stored under the same key space)
//   value         -> { acsGroupId, createdOn, expiresOn, status, correlationId? }
//
// It MUST NOT be used for recordings, transcripts, business metadata, tokens, or secrets.
//
// Storage: a single Table in the EXISTING storage account (no new Azure resource).
// Access uses the function app's managed identity (DefaultAzureCredential) against the
// table endpoint — no shared keys or connection strings are read here.
//
// Configuration (app settings):
//   STORAGE_TABLE_ENDPOINT  e.g. https://<account>.table.core.windows.net
//   STORAGE_TABLE_NAME      default 'acvSessionMap'
//   SESSION_MAP_TTL_HOURS   default 8 (how long a mapping stays resolvable)
//
// When STORAGE_TABLE_ENDPOINT is absent the store is DISABLED and all operations are
// safe no-ops, so the relay still runs (mock/local) without the table.

import { TableClient } from '@azure/data-tables';
import { DefaultAzureCredential } from '@azure/identity';

const PARTITION_KEY = 'session';

function ttlHours() {
  const raw = Number.parseInt(process.env.SESSION_MAP_TTL_HOURS || '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 8;
}

export function isStoreEnabled() {
  return Boolean(process.env.STORAGE_TABLE_ENDPOINT);
}

let cachedClient;
let ensureTablePromise;

function getClient() {
  if (!isStoreEnabled()) {
    return undefined;
  }
  if (!cachedClient) {
    const endpoint = process.env.STORAGE_TABLE_ENDPOINT.replace(/\/+$/, '');
    const tableName = process.env.STORAGE_TABLE_NAME || 'acvSessionMap';
    // The function app runs under a USER-assigned managed identity. DefaultAzureCredential
    // defaults to the system-assigned identity (which does not exist here), so pass the
    // user-assigned client id explicitly. Reuse the same client id the host uses for
    // AzureWebJobsStorage to avoid configuring a second value.
    const managedIdentityClientId =
      process.env.STORAGE_TABLE_CLIENT_ID ||
      process.env.AzureWebJobsStorage__clientId ||
      process.env.AZURE_CLIENT_ID;
    const credential = new DefaultAzureCredential(
      managedIdentityClientId ? { managedIdentityClientId } : undefined,
    );
    cachedClient = new TableClient(endpoint, tableName, credential);
  }
  return cachedClient;
}

async function ensureTable(client, log) {
  if (!ensureTablePromise) {
    ensureTablePromise = client.createTable().catch((err) => {
      // 409 = table already exists; anything else is a real failure.
      if (err?.statusCode !== 409 && err?.statusCode !== 'TableAlreadyExists') {
        log?.warn?.(`[sessionStore] createTable warning: ${err.message}`);
      }
    });
  }
  return ensureTablePromise;
}

// Normalise an id into a Table-safe RowKey (no /, \, #, ? and not too long).
function toRowKey(id) {
  return String(id).replace(/[\\/#?\u0000-\u001f]/g, '_').slice(0, 1024);
}

/**
 * Store/refresh a conversationId -> acsGroupId mapping. Non-throwing: returns
 * { stored: boolean } and logs on failure so it never blocks conversation creation.
 */
export async function putMapping({ id, acsGroupId, correlationId }, log) {
  const client = getClient();
  if (!client) {
    log?.info?.('[sessionStore] disabled (no STORAGE_TABLE_ENDPOINT); skipping put');
    return { stored: false };
  }
  if (!id || !acsGroupId) {
    return { stored: false };
  }
  try {
    await ensureTable(client, log);
    const now = Date.now();
    const expiresOn = new Date(now + ttlHours() * 3600_000).toISOString();
    await client.upsertEntity(
      {
        partitionKey: PARTITION_KEY,
        rowKey: toRowKey(id),
        acsGroupId: String(acsGroupId),
        createdOn: new Date(now).toISOString(),
        expiresOn,
        status: 'active',
        correlationId: correlationId ? String(correlationId) : '',
      },
      'Replace',
    );
    log?.info?.(`[sessionStore] mapped ${toRowKey(id)} -> acsGroup (expires ${expiresOn})`);
    return { stored: true };
  } catch (err) {
    log?.error?.(`[sessionStore] putMapping failed: ${err.message}`);
    return { stored: false };
  }
}

/**
 * Resolve a mapping by id. Returns { acsGroupId, status, expiresOn } or null.
 * Expired rows are treated as not found and best-effort deleted (lazy TTL).
 */
export async function getMapping(id, log) {
  const client = getClient();
  if (!client || !id) {
    return null;
  }
  const rowKey = toRowKey(id);
  try {
    const entity = await client.getEntity(PARTITION_KEY, rowKey);
    const expiresOn = entity.expiresOn ? Date.parse(entity.expiresOn) : 0;
    if (expiresOn && expiresOn < Date.now()) {
      client
        .deleteEntity(PARTITION_KEY, rowKey)
        .catch((e) => log?.warn?.(`[sessionStore] lazy delete failed: ${e.message}`));
      return null;
    }
    return {
      acsGroupId: entity.acsGroupId,
      status: entity.status || 'active',
      expiresOn: entity.expiresOn,
    };
  } catch (err) {
    if (err?.statusCode === 404) {
      return null;
    }
    log?.error?.(`[sessionStore] getMapping failed: ${err.message}`);
    return null;
  }
}

/**
 * Delete all expired rows. Used by the scheduled cleanup function so old mappings
 * do not accumulate. Returns the number of rows removed.
 */
export async function purgeExpired(log) {
  const client = getClient();
  if (!client) {
    return 0;
  }
  let removed = 0;
  try {
    await ensureTable(client, log);
    const nowIso = new Date().toISOString();
    const entities = client.listEntities({
      queryOptions: { filter: `PartitionKey eq '${PARTITION_KEY}' and expiresOn lt '${nowIso}'` },
    });
    for await (const entity of entities) {
      try {
        await client.deleteEntity(entity.partitionKey, entity.rowKey);
        removed += 1;
      } catch (e) {
        log?.warn?.(`[sessionStore] purge delete failed for ${entity.rowKey}: ${e.message}`);
      }
    }
  } catch (err) {
    log?.error?.(`[sessionStore] purgeExpired failed: ${err.message}`);
  }
  return removed;
}
