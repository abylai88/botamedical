// Run via npm run db:purge-spam (BOTA_DATA_DIR selects the data folder). Deletes quarantined spam orders older than
// SPAM_KEEP_DAYS, as the privacy policy promises, even when nobody opens the admin page. On the server it runs daily
// from bota-spam-purge.timer. Prints only a count, never order contents.
import { purgeOldSpam, SPAM_KEEP_DAYS } from '../lib/db.ts';
try {
  console.log(`Spam cleanup: removed ${purgeOldSpam()} spam orders older than ${SPAM_KEEP_DAYS} days`);
} catch { console.error('FAILED: the database cannot be opened'); process.exitCode = 1; }
