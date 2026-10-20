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
    width: media.width,
    height: media.height,
    duration: media.duration,
    thumbnailFileId: media.thumbnailFileId,
    thumbnailFileUniqueId: media.thumbnailFileUniqueId,
    mediaMetadata: media.mediaMetadata,
    originalCaption: media.originalCaption,
    captionEntities: media.captionEntities,
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
  await db.update(files).set({ status: FILE_STATES.ARCHIVE_FAILED, archiveErrorCode: String(code ?? 'UNKNOWN'), archiveError: String(message ?? '').slice(0, 500), updatedAt: now() })
    .where(and(eq(files.id, fileId), eq(files.status, FILE_STATES.ARCHIVING))).run();
}

export async function abandonDraft(fileId, ownerId) {
  await db.update(files).set({ status: FILE_STATES.CANCELLED, updatedAt: now() })
    .where(and(eq(files.id, fileId), eq(files.ownerId, ownerId), eq(files.status, FILE_STATES.DRAFT))).run();
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
  const rows = await db.insert(deliveries).values({ fileId, receiverChatId, updateId, state: 'SENT', deliveredAt: now(), sentAt: now() })
    .onConflictDoNothing().returning().run();
  if (rows.length) {
    try {
      await db.update(files).set({ deliveryCount: sql`${files.deliveryCount} + 1`, lastDeliveredAt: now(), updatedAt: now() }).where(eq(files.id, fileId)).run();
    } catch (error) {
      console.error('delivery count pending reconciliation', error);
    }
  }
  return rows.length > 0;
}

export async function releaseDelivery(fileId, updateId) {
  if (!Number.isSafeInteger(updateId)) return false;
  const rows = await db.delete(deliveries)
    .where(and(eq(deliveries.fileId, fileId), eq(deliveries.updateId, updateId), eq(deliveries.state, 'PENDING')))
    .returning().run();
  return rows.length > 0;
}

export async function syncDeliveryCount(fileId) {
  const count = await db.$count(deliveries, and(eq(deliveries.fileId, fileId), eq(deliveries.state, 'SENT')));
  await db.update(files).set({ deliveryCount: count, updatedAt: now() }).where(eq(files.id, fileId)).run();
  return count;
}

export async function reserveDelivery(fileId, receiverChatId, updateId) {
  if (!Number.isSafeInteger(updateId)) return { status: 'UNTRACKED' };
  const rows = await db.insert(deliveries).values({ fileId, receiverChatId, updateId, state: 'PENDING', deliveredAt: now() })
    .onConflictDoNothing().returning().run();
  if (rows.length) return { status: 'NEW' };
  const existing = await db.select().from(deliveries).where(eq(deliveries.updateId, updateId)).get();
  return { status: existing?.state === 'SENT' ? 'SENT' : 'PENDING' };
}

export async function completeDelivery(fileId, updateId) {
  const timestamp = now();
  const rows = await db.update(deliveries).set({ state: 'SENT', sentAt: timestamp, deliveredAt: timestamp })
    .where(and(eq(deliveries.fileId, fileId), eq(deliveries.updateId, updateId), eq(deliveries.state, 'PENDING'))).returning().run();
  if (rows.length) {
    try {
      await db.update(files).set({ deliveryCount: sql`${files.deliveryCount} + 1`, lastDeliveredAt: timestamp, updatedAt: timestamp }).where(eq(files.id, fileId)).run();
    } catch (error) {
      console.error('delivery count pending reconciliation', error);
    }
  }
  return rows.length > 0;
}
