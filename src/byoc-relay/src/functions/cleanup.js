import { app } from '@azure/functions';
import { purgeExpired, isStoreEnabled } from '../lib/sessionStore.js';

// Scheduled cleanup (POC): removes expired session-correlation rows so old mappings
// do not accumulate in the table. Runs daily at 03:00 UTC. This complements the lazy
// per-read TTL delete in the store. Uses the existing storage account; no new resource.
app.timer('sessionCleanup', {
  schedule: '0 0 3 * * *',
  handler: async (_myTimer, context) => {
    if (!isStoreEnabled()) {
      context.info('[sessionCleanup] store disabled; nothing to purge');
      return;
    }
    const removed = await purgeExpired(context);
    context.info(`[sessionCleanup] purged ${removed} expired mapping(s)`);
  },
});
