import { db } from 'sdk';
import { and, eq } from 'sdk/db';
import { files, sessions } from '../schema.js';
import { FILE_STATES, SESSION_IDLE_SECONDS, SESSION_STAGES } from './constants.js';

const now = () => Math.floor(Date.now() / 1000);

export async function getSession(userId) {
  const row = await db.select().from(sessions).where(eq(sessions.userId, userId)).get();
  if (row && (row.stage === SESSION_STAGES.ARCHIVING || row.stage === SESSION_STAGES.ARCHIVE_FAILED)) {
    const linkedFile = await db.select().from(files).where(and(eq(files.id, row.fileId), eq(files.ownerId, userId))).get();
    if (linkedFile?.status === FILE_STATES.ACTIVE) {
      const deleted = await db.delete(sessions).where(and(eq(sessions.id, row.id), eq(sessions.userId, userId), eq(sessions.fileId, row.fileId), eq(sessions.version, row.version), eq(sessions.stage, row.stage))).returning().run();
      if (deleted.length) return null;
      return db.select().from(sessions).where(eq(sessions.userId, userId)).get();
    }
  }
  if (row && now() - row.updatedAt > SESSION_IDLE_SECONDS) {
    const deleted = await db.delete(sessions).where(and(eq(sessions.id, row.id), eq(sessions.userId, userId), eq(sessions.fileId, row.fileId), eq(sessions.version, row.version), eq(sessions.stage, row.stage))).returning().run();
    if (deleted.length) {
      await db.update(files).set({ status: FILE_STATES.CANCELLED, updatedAt: now() })
        .where(and(eq(files.id, row.fileId), eq(files.ownerId, userId), eq(files.status, FILE_STATES.DRAFT))).run();
      return null;
    }
    return db.select().from(sessions).where(eq(sessions.userId, userId)).get();
  }
  return row;
}

export async function beginSession(userId, fileId) {
  const existing = await db.select().from(sessions).where(eq(sessions.userId, userId)).get();
  if (existing) return existing;
  const rows = await db.insert(sessions).values({ userId, fileId, stage: SESSION_STAGES.WAITING_CAPTION, version: 1, updatedAt: now() })
    .onConflictDoNothing({ target: sessions.userId }).returning().run();
  if (rows.length) return rows[0];
  return db.select().from(sessions).where(eq(sessions.userId, userId)).get();
}

export async function moveToExpiry(userId, fileId, version, finalCaption) {
  const rows = await db.update(sessions).set({ stage: SESSION_STAGES.WAITING_EXPIRY, version: version + 1, updatedAt: now() })
    .where(and(eq(sessions.userId, userId), eq(sessions.fileId, fileId), eq(sessions.version, version), eq(sessions.stage, SESSION_STAGES.WAITING_CAPTION))).returning().run();
  if (!rows.length) return null;
  let fileRows;
  try {
    fileRows = await db.update(files).set({ finalCaption, updatedAt: now() })
      .where(and(eq(files.id, fileId), eq(files.ownerId, userId), eq(files.status, FILE_STATES.DRAFT))).returning().run();
  } catch (error) {
    await db.update(sessions).set({ stage: SESSION_STAGES.WAITING_CAPTION, version, updatedAt: now() })
      .where(and(eq(sessions.id, rows[0].id), eq(sessions.version, version + 1), eq(sessions.stage, SESSION_STAGES.WAITING_EXPIRY))).run();
    throw error;
  }
  if (fileRows.length) return rows[0];
  await db.update(sessions).set({ stage: SESSION_STAGES.WAITING_CAPTION, version, updatedAt: now() })
    .where(and(eq(sessions.id, rows[0].id), eq(sessions.version, version + 1), eq(sessions.stage, SESSION_STAGES.WAITING_EXPIRY))).run();
  return null;
}

export async function setExpiryAndClaim(userId, fileId, version, expirationDays, expiresAt) {
  const rows = await db.update(sessions).set({ stage: SESSION_STAGES.ARCHIVING, version: version + 1, updatedAt: now() })
    .where(and(eq(sessions.userId, userId), eq(sessions.fileId, fileId), eq(sessions.version, version), eq(sessions.stage, SESSION_STAGES.WAITING_EXPIRY))).returning().run();
  if (!rows.length) return null;
  let fileRows;
  try {
    fileRows = await db.update(files).set({ expirationDays, expiresAt, updatedAt: now() })
      .where(and(eq(files.id, fileId), eq(files.ownerId, userId), eq(files.status, FILE_STATES.DRAFT))).returning().run();
  } catch (error) {
    await db.update(sessions).set({ stage: SESSION_STAGES.WAITING_EXPIRY, version, updatedAt: now() })
      .where(and(eq(sessions.id, rows[0].id), eq(sessions.version, version + 1), eq(sessions.stage, SESSION_STAGES.ARCHIVING))).run();
    throw error;
  }
  if (fileRows.length) return rows[0];
  await db.update(sessions).set({ stage: SESSION_STAGES.WAITING_EXPIRY, version, updatedAt: now() })
    .where(and(eq(sessions.id, rows[0].id), eq(sessions.version, version + 1), eq(sessions.stage, SESSION_STAGES.ARCHIVING))).run();
  return null;
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
  if (!rows.length) return false;
  let fileRows;
  try {
    fileRows = await db.update(files).set({ status: FILE_STATES.CANCELLED, updatedAt: now() })
      .where(and(eq(files.id, fileId), eq(files.ownerId, userId), eq(files.status, FILE_STATES.DRAFT))).returning().run();
  } catch (error) {
    await db.insert(sessions).values(rows[0]).run();
    throw error;
  }
  if (fileRows.length) return true;
  await db.insert(sessions).values(rows[0]).run();
  return false;
}

export async function finishSession(userId, fileId) {
  await db.delete(sessions).where(and(eq(sessions.userId, userId), eq(sessions.fileId, fileId))).run();
}
