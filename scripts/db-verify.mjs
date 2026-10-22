// Run via npm run db:verify (BOTA_DATA_DIR selects the data folder). Checks that the database opens and that the
// every order decrypts with the order-key next to it. Prints only counts, never order contents.
// Exit code 1 on any problem; a database without orders is fine.
import { hasOrderKey, ready, verifyOrders } from '../lib/db.ts';
let code = 0;
try {
  if (!hasOrderKey()) { console.error('FAILED: order-key is missing'); code = 1; }
  else {
    const { checked, failed } = verifyOrders();
    if (failed || !ready()) { console.error(`FAILED: ${failed} of ${checked} orders cannot be decrypted with this order-key`); code = 1; }
    else console.log(`OK: database opens, order-key works, ${checked} orders decrypted`);
  }
} catch { console.error('FAILED: the database or order-key cannot be read'); code = 1; }
process.exitCode = code;
