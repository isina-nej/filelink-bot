import { db } from 'sdk';
import { processedUpdates } from '../schema.js';
import { and, eq, lt } from 'sdk/db';

const LEASE_SECONDS = 5 * 60;
const now = () => Math.floor(Date.now() / 1000);

export async function claimUpdate(updateId) {
  if (!Number.isSafeInteger(updateId)) return true;
  const timestamp = now();
  const rows = await db.insert(processedUpdates)
    .values({ updateId, state: 'PROCESSING', claimedAt: timestamp, processedAt: timestamp })
    .onConflictDoNothing({ target: processedUpdates.updateId })
    .returning()
    .run();
  if (rows.length) return true;
  const reclaimed = await db.update(processedUpdates)
    .set({ state: 'PROCESSING', claimedAt: timestamp, completedAt: null, processedAt: timestamp })
    .where(and(eq(processedUpdates.updateId, updateId), eq(processedUpdates.state, 'FAILED')))
    .returning()
    .run();
  if (reclaimed.length) return true;
  const expired = await db.update(processedUpdates)
    .set({ state: 'PROCESSING', claimedAt: timestamp, completedAt: null, processedAt: timestamp })
    .where(and(eq(processedUpdates.updateId, updateId), eq(processedUpdates.state, 'PROCESSING'), lt(processedUpdates.claimedAt, timestamp - LEASE_SECONDS)))
    .returning()
    .run();
  if (expired.length) return true;
  const existing = await db.select().from(processedUpdates).where(eq(processedUpdates.updateId, updateId)).get();
  return existing?.state !== 'COMPLETED' && existing?.claimedAt < timestamp - LEASE_SECONDS;
}

export async function releaseUpdate(updateId) {
  if (!Number.isSafeInteger(updateId)) return;
  await db.update(processedUpdates)
    .set({ state: 'FAILED', completedAt: null, processedAt: now() })
    .where(and(eq(processedUpdates.updateId, updateId), eq(processedUpdates.state, 'PROCESSING')))
    .run();
}

export async function completeUpdate(updateId) {
  if (!Number.isSafeInteger(updateId)) return;
  await db.update(processedUpdates)
    .set({ state: 'COMPLETED', completedAt: now(), processedAt: now() })
    .where(and(eq(processedUpdates.updateId, updateId), eq(processedUpdates.state, 'PROCESSING')))
    .run();
}
