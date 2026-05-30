import { app } from '@azure/functions';
import { issueVoipToken } from '../lib/acs.js';

// ACS token endpoint (C5): mints a real ACS identity + VoIP access token for the
// agent media panel. Anonymous so the static panel (GitHub Pages) can fetch a token;
// platform CORS restricts the allowed origins. Tokens are `voip`-scoped only.
//
// POST /api/token  ->  { userId, token, expiresOn, endpoint }
app.http('token', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'token',
  handler: async (_request, context) => {
    try {
      const result = await issueVoipToken();
      context.info(`[token] issued VoIP token for ${result.userId}`);
      return { status: 200, jsonBody: result };
    } catch (err) {
      context.error(`[token] failed: ${err.message}`);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});
