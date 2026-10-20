import { db } from 'sdk';
import { and, eq } from 'sdk/db';
import { files, sessions } from '../schema.js';
import { FILE_STATES, SESSION_IDLE_SECONDS, SESSION_STAGES } from './constants.js';

const now = () => Math.floor(Date.now() / 1000);

export async function getSession(userId) {
  const row = await db.select().from(sessions).where(eq(sessions.userId, userId)).get();
  if (row && now() - row.updatedAt > SESSION_IDLE_SECONDS) {
    await db.delete(sessions).where(eq(sessions.id, row.id)).run();
    await db.update(files).set({ status: FILE_STATES.CANCELLED, updatedAt: now() })
      .where(and(eq(files.id, row.fileId), eq(files.ownerId, userId), eq(files.status, FILE_STATES.DRAFT))).run();
    return null;
  }
  return row;
}

export async function beginSession(userId, fileId) {
  const existing = await db.select().from(sessions).where(eq(sessions.userId, userId)).get();
  const values = { userId, fileId, stage: SESSION_STAGES.WAITING_CAPTION, version: (existing?.version ?? 0) + 1, updatedAt: now() };
  if (existing) {
    const rows = await db.update(sessions).set(values).where(eq(sessions.id, existing.id)).returning().run();
    return rows[0] ?? null;
  }
  const rows = await db.insert(sessions).values(values).returning().run();
  return rows[0] ?? null;
}

export async function moveToExpiry(userId, fileId, version, finalCaption) {
  const fileRows = await db.update(files).set({ finalCaption, updatedAt: now() })
    .where(and(eq(files.id, fileId), eq(files.ownerId, userId), eq(files.status, FILE_STATES.DRAFT))).returning().run();
  if (!fileRows.length) return null;
  const rows = await db.update(sessions).set({ stage: SESSION_STAGES.WAITING_EXPIRY, version: version + 1, updatedAt: now() })
    .where(and(eq(sessions.userId, userId), eq(sessions.fileId, fileId), eq(sessions.version, version), eq(sessions.stage, SESSION_STAGES.WAITING_CAPTION))).returning().run();
  return rows[0] ?? null;
}

export async function setExpiryAndClaim(userId, fileId, version, expirationDays, expiresAt) {
  const fileRows = await db.update(files).set({ expirationDays, expiresAt, updatedAt: now() })
    .where(and(eq(files.id, fileId), eq(files.ownerId, userId), eq(files.status, FILE_STATES.DRAFT))).returning().run();
  if (!fileRows.length) return null;
  const rows = await db.update(sessions).set({ stage: SESSION_STAGES.ARCHIVING, version: version + 1, updatedAt: now() })
    .where(and(eq(sessions.userId, userId), eq(sessions.fileId, fileId), eq(sessions.version, version), eq(sessions.stage, SESSION_STAGES.WAITING_EXPIRY))).returning().run();
  return rows[0] ?? null;
}

export async function claimArchive(userId, fileId, version) {
  const rows = await db.update(sessions).set({ stage: SESSION_STAGES.ARCHIVING, version: version + 1, updatedAt: now() })
    .where(and(eq(sessions.userId, userId), eq(sessions.fileId, fileId), eq(sessions.version, version), eq(sessions.stage, SESSION_STAGES.ARCHIVE_FAILED))).returning().run();
  return rows[0] ?? null;
}

export async function markArchiveFailedSession(userId, fileId) {
  await db.update(sessions).set({ stage: SESSION_STAGES.ARCHIVE_FAILED, updatedAt: now() })
    .where(and(eq(sessions.userId, userId), eq(sessions.fileId, fileId), eq(sessions.stage, SESSION_STAGES.ARCHIVING))).run();
}

export async function cancelSession(userId, fileId, version) {
  const rows = await db.delete(sessions).where(and(eq(sessions.userId, userId), eq(sessions.fileId, fileId), eq(sessions.version, version))).returning().run();
  await db.update(files).set({ status: FILE_STATES.CANCELLED, updatedAt: now() })
    .where(and(eq(files.id, fileId), eq(files.ownerId, userId), eq(files.status, FILE_STATES.DRAFT))).run();
  return rows.length > 0;
}

export async function finishSession(userId, fileId) {
  await db.delete(sessions).where(and(eq(sessions.userId, userId), eq(sessions.fileId, fileId))).run();
}
