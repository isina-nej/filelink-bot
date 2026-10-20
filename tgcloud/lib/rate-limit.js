import { db } from 'sdk';
import { rateLimits } from '../schema.js';
import { eq } from 'sdk/db';
import { RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_SECONDS } from './constants.js';

export async function consumeRateLimit(userId, limit = RATE_LIMIT_REQUESTS) {
  const now = Math.floor(Date.now() / 1000);
  const row = await db.select().from(rateLimits).where(eq(rateLimits.userId, userId)).get();
  if (!row || now - row.windowStartedAt >= RATE_LIMIT_WINDOW_SECONDS) {
    await db.insert(rateLimits).values({ userId, windowStartedAt: now, requestCount: 1 })
      .onConflictDoUpdate({ target: rateLimits.userId, set: { windowStartedAt: now, requestCount: 1 } }).run();
    return true;
  }
  if (row.requestCount >= limit) return false;
  await db.update(rateLimits).set({ requestCount: row.requestCount + 1 }).where(eq(rateLimits.userId, userId)).run();
  return true;
}
