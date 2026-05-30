import { app } from '@azure/functions';

// Outbound webhook (D365 -> relay). Dynamics 365 Contact Center delivers agent
// messages, typing indicators, and conversation-state changes here as POST requests
// following the Bot Framework Activity Schema.
//
//   Route: POST /api/v3/conversations/{conversationId}/activities
//
// Register this base URL ({webhook_url}) on the msdyn_occustommessagingchannel record.
// The platform appends /v3/conversations/{conversationId}/activities.
//
// For the POC this handler validates shape, logs the activity, and returns 200. It
// does NOT drive real media. Production webhook auth uses Power Platform managed
// identity federated credentials (FIC) — see docs/d365-workstream-and-channel-strategy.md.
app.http('webhook', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'v3/conversations/{conversationId}/activities',
  handler: async (request, context) => {
    const conversationId = request.params.conversationId;

    let activity;
    try {
      activity = await request.json();
    } catch {
      return { status: 400, jsonBody: { error: 'Activity body must be valid JSON.' } };
    }

    context.info(
      `[webhook] conversation=${conversationId} type=${activity?.type ?? 'unknown'} ` +
        `text=${activity?.text ? JSON.stringify(activity.text) : '<none>'}`,
    );

    // Bot Framework expects a 200/201 acknowledgement with an optional resource id.
    return {
      status: 200,
      jsonBody: { id: `ack-${Date.now()}` },
    };
  },
});
