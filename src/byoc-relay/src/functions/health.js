import { app } from '@azure/functions';
import { isLive } from '../lib/omnichannel.js';

// Liveness/readiness probe. Confirms the relay is reachable and reports its mode
// without acquiring tokens or calling D365.
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: async () => {
    return {
      status: 200,
      jsonBody: {
        service: 'byoc-relay',
        mode: isLive() ? 'live' : 'mock',
        time: new Date().toISOString(),
      },
    };
  },
});
