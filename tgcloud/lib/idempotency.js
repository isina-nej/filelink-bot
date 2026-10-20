import { db } from 'sdk';
import { processedUpdates } from '../schema.js';
import { and, eq, lt } from 'sdk/db';

const LEASE_SECONDS = 5 * 60;
const now = () => Math.floor(Date.now() / 1000);

function makeClaimToken() {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== 'function') throw new Error('SECURITY_BLOCKER: crypto.getRandomValues is unavailable');
  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function claimUpdate(updateId) {
  if (!Number.isSafeInteger(updateId)) return true;
  const timestamp = now();
  const claimToken = makeClaimToken();
  const rows = await db.insert(processedUpdates)
    .values({ updateId, state: 'PROCESSING', claimToken, claimedAt: timestamp, processedAt: timestamp })
    .onConflictDoNothing({ target: processedUpdates.updateId })
    .returning()
    .run();
  if (rows.length) return claimToken;
  const reclaimed = await db.update(processedUpdates)
    .set({ state: 'PROCESSING', claimToken, claimedAt: timestamp, completedAt: null, processedAt: timestamp })
    .where(and(eq(processedUpdates.updateId, updateId), eq(processedUpdates.state, 'FAILED')))
    .returning()
    .run();
  if (reclaimed.length) return claimToken;
  const expired = await db.update(processedUpdates)
    .set({ state: 'PROCESSING', claimToken, claimedAt: timestamp, completedAt: null, processedAt: timestamp })
    .where(and(eq(processedUpdates.updateId, updateId), eq(processedUpdates.state, 'PROCESSING'), lt(processedUpdates.claimedAt, timestamp - LEASE_SECONDS)))
    .returning()
    .run();
  if (expired.length) return claimToken;
  return null;
}

export async function releaseUpdate(updateId, claimToken) {
  if (!Number.isSafeInteger(updateId) || !claimToken || claimToken === true) return;
  await db.update(processedUpdates)
    .set({ state: 'FAILED', completedAt: null, processedAt: now() })
    .where(and(eq(processedUpdates.updateId, updateId), eq(processedUpdates.state, 'PROCESSING'), eq(processedUpdates.claimToken, claimToken)))
    .run();
}

export async function completeUpdate(updateId, claimToken) {
  if (!Number.isSafeInteger(updateId) || !claimToken || claimToken === true) return;
  await db.update(processedUpdates)
    .set({ state: 'COMPLETED', completedAt: now(), processedAt: now() })
    .where(and(eq(processedUpdates.updateId, updateId), eq(processedUpdates.state, 'PROCESSING'), eq(processedUpdates.claimToken, claimToken)))
    .run();
}
