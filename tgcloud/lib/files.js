import { db } from 'sdk';
import { and, desc, eq, or, sql } from 'sdk/db';
import { deliveries, files } from '../schema.js';
import { FILE_STATES } from './constants.js';

const now = () => Math.floor(Date.now() / 1000);

export async function createDraft(ownerId, sourceChatId, sourceMessageId, media) {
  const rows = await db.insert(files).values({
    ownerId,
    sourceChatId,
    sourceMessageId,
    mediaType: media.mediaType,
    fileId: media.fileId,
    fileUniqueId: media.fileUniqueId,
    fileName: media.fileName,
    mimeType: media.mimeType,
    fileSize: media.fileSize,
    originalCaption: media.originalCaption,
    finalCaption: '',
    status: FILE_STATES.DRAFT,
    updatedAt: now(),
  }).returning().run();
  return rows[0] ?? null;
}

export async function getFileById(fileId) {
  return db.select().from(files).where(eq(files.id, fileId)).get();
}

export async function getFileByToken(token) {
  return db.select().from(files).where(eq(files.token, token)).get();
}

export async function markFileArchiving(fileId, ownerId) {
  const rows = await db.update(files).set({ status: FILE_STATES.ARCHIVING, updatedAt: now() })
    .where(and(eq(files.id, fileId), eq(files.ownerId, ownerId), or(eq(files.status, FILE_STATES.DRAFT), eq(files.status, FILE_STATES.ARCHIVE_FAILED)))).returning().run();
  return rows[0] ?? null;
}

export async function markArchiveFailed(fileId, code, message) {
  await db.update(files).set({ status: FILE_STATES.ARCHIVE_FAILED, archiveErrorCode: String(code ?? 'UNKNOWN'), archiveError: String(message ?? '').slice(0, 500), updatedAt: now() }).where(eq(files.id, fileId)).run();
}

export async function markArchived(fileId, storageChatId, storageMessageId, token, archivedAt, expiresAt) {
  const rows = await db.update(files).set({ status: FILE_STATES.ACTIVE, storageChatId, storageMessageId, token, archivedAt, expiresAt, archiveErrorCode: null, archiveError: null, updatedAt: archivedAt })
    .where(and(eq(files.id, fileId), eq(files.status, FILE_STATES.ARCHIVING))).returning().run();
  return rows[0] ?? null;
}

export async function markExpired(fileId) {
  await db.update(files).set({ status: FILE_STATES.EXPIRED, updatedAt: now() }).where(and(eq(files.id, fileId), eq(files.status, FILE_STATES.ACTIVE))).run();
}

export async function disableFile(fileId, ownerId) {
  const rows = await db.update(files).set({ status: FILE_STATES.DISABLED, updatedAt: now() })
    .where(and(eq(files.id, fileId), eq(files.ownerId, ownerId), eq(files.status, FILE_STATES.ACTIVE))).returning().run();
  return rows.length > 0;
}

export async function listOwnerFiles(ownerId, limit = 20, offset = 0) {
  return db.select().from(files).where(eq(files.ownerId, ownerId)).orderBy(desc(files.createdAt)).limit(limit).offset(offset).all();
}

export async function recordDelivery(fileId, receiverChatId, updateId) {
  const rows = await db.insert(deliveries).values({ fileId, receiverChatId, updateId, deliveredAt: now() })
    .onConflictDoNothing().returning().run();
  if (rows.length) {
    await db.update(files).set({ deliveryCount: sql`${files.deliveryCount} + 1`, updatedAt: now() }).where(eq(files.id, fileId)).run();
  }
  return rows.length > 0;
}
