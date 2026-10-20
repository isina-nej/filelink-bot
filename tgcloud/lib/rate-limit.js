import { db } from 'sdk';
import { rateLimits } from '../schema.js';
import { and, eq, lte, lt, or, sql } from 'sdk/db';
import { RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_SECONDS } from './constants.js';

export async function consumeRateLimit(userId, limit = RATE_LIMIT_REQUESTS) {
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - RATE_LIMIT_WINDOW_SECONDS;
  const updated = await db.update(rateLimits).set({
    windowStartedAt: sql`CASE WHEN ${rateLimits.windowStartedAt} <= ${cutoff} THEN ${now} ELSE ${rateLimits.windowStartedAt} END`,
    requestCount: sql`CASE WHEN ${rateLimits.windowStartedAt} <= ${cutoff} THEN 1 ELSE ${rateLimits.requestCount} + 1 END`,
  }).where(and(eq(rateLimits.userId, userId), or(lte(rateLimits.windowStartedAt, cutoff), lt(rateLimits.requestCount, limit)))).returning().run();
  if (updated.length) return true;
  const inserted = await db.insert(rateLimits).values({ userId, windowStartedAt: now, requestCount: 1 })
    .onConflictDoNothing({ target: rateLimits.userId }).returning().run();
  if (inserted.length) return true;
  return false;
}
