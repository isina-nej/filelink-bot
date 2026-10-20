import { db } from 'sdk';
import { processedUpdates } from '../schema.js';

export async function claimUpdate(updateId) {
  if (!Number.isSafeInteger(updateId)) return true;
  const rows = await db.insert(processedUpdates)
    .values({ updateId, processedAt: Math.floor(Date.now() / 1000) })
    .onConflictDoNothing({ target: processedUpdates.updateId })
    .returning()
    .run();
  return rows.length > 0;
}
