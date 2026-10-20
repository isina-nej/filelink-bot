import { db } from 'sdk';
import { users } from '../schema.js';
import { eq } from 'sdk/db';

export async function rememberUser(user) {
  if (!user?.id) return;
  const now = Math.floor(Date.now() / 1000);
  await db.insert(users).values({
    tgId: user.id,
    username: user.username ?? null,
    firstName: user.first_name ?? null,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: users.tgId,
    set: {
      username: user.username ?? null,
      firstName: user.first_name ?? null,
      updatedAt: now,
    },
  }).run();
}

export async function getUser(userId) {
  return db.select().from(users).where(eq(users.tgId, userId)).get();
}
