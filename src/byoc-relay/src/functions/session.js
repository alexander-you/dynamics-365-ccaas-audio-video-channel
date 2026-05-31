import { app } from '@azure/functions';
import { getMapping, isStoreEnabled } from '../lib/sessionStore.js';

// Session-correlation resolver (POC): the agent media panel calls this with the
// supported context id it received from the D365 session-template slug
// (LiveWorkItemId / conversationId / sessionId) and gets back the ACS group id the
// customer minted, so it can join the SAME ACS group at runtime.
//
//   GET /api/session?conversationId=<id>
//   GET /api/session?liveWorkItemId=<id>
//   GET /api/session?sessionId=<id>
//   GET /api/session?id=<id>
//
// Anonymous so the static panel (GitHub Pages) can resolve; platform CORS restricts
// origins. Returns only { acsGroupId } \u2014 no business data, tokens, or secrets.
app.http('session', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'session',
  handler: async (request, context) => {
    const q = request.query;
    const id =
      q.get('conversationId') ||
      q.get('liveWorkItemId') ||
      q.get('sessionId') ||
      q.get('id');

    if (!id) {
      return {
        status: 400,
        jsonBody: {
          error:
            'Provide one of: conversationId, liveWorkItemId, sessionId, or id.',
        },
      };
    }

    if (!isStoreEnabled()) {
      return {
        status: 503,
        jsonBody: {
          error:
            'Session-correlation store is not configured (STORAGE_TABLE_ENDPOINT missing).',
        },
      };
    }

    const mapping = await getMapping(id, context);
    if (!mapping || !mapping.acsGroupId) {
      return {
        status: 404,
        jsonBody: { error: 'No active A/V session mapping for the supplied id.' },
      };
    }

    return {
      status: 200,
      jsonBody: {
        acsGroupId: mapping.acsGroupId,
        status: mapping.status,
        expiresOn: mapping.expiresOn,
      },
    };
  },
});
