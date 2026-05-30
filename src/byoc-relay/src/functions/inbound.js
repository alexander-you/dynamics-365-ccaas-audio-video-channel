import { app } from '@azure/functions';
import { createConversation, isLive } from '../lib/omnichannel.js';

// Inbound bootstrap (C2): the relay creates a routed Custom Messaging conversation
// in Dynamics 365 Contact Center carrying a mock Audio/Video context. In mock mode
// it logs the intent and returns a synthetic conversation id; in live mode it calls
// the Messaging API /conversation/create + /conversation/{id} endpoints.
//
// POST /api/inbound
// Body: { "customerName": "Jane Doe", "avContext": { "callId": "...", "mode": "mock" } }
app.http('inbound', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'inbound',
  handler: async (request, context) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { error: 'Request body must be valid JSON.' } };
    }

    const { customerName, avContext } = body || {};

    try {
      const result = await createConversation({ customerName, avContext }, context);
      return {
        status: 202,
        jsonBody: {
          accepted: true,
          mode: result.mode,
          conversationId: result.conversationId,
        },
      };
    } catch (err) {
      context.error(`[inbound] failed: ${err.message}`);
      // Surface a configuration hint when running mock-first without live settings.
      const hint = isLive()
        ? undefined
        : 'Relay is in mock mode; set RELAY_MODE=live and Messaging API settings to inject real conversations.';
      return { status: 500, jsonBody: { error: err.message, hint } };
    }
  },
});
