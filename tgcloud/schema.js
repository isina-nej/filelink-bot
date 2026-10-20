import { table, integer, text, json, index, uniqueIndex, sql } from 'sdk/db';

// Telegram Serverless does not support foreign keys. The ids below are logical
// links and are scoped in every query in lib/.
export const users = table('users', {
  tgId: integer('tg_id').primaryKey(),
  username: text('username'),
  firstName: text('first_name'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
});

export const files = table('files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerId: integer('owner_id').notNull(),
  sourceChatId: integer('source_chat_id').notNull(),
  sourceMessageId: integer('source_message_id').notNull(),
  mediaType: text('media_type').notNull(),
  fileId: text('file_id').notNull(),
  fileUniqueId: text('file_unique_id'),
  fileName: text('file_name'),
  mimeType: text('mime_type'),
  fileSize: integer('file_size'),
  width: integer('width'),
  height: integer('height'),
  duration: integer('duration'),
  thumbnailFileId: text('thumbnail_file_id'),
  thumbnailFileUniqueId: text('thumbnail_file_unique_id'),
  mediaMetadata: json('media_metadata'),
  originalCaption: text('original_caption'),
  captionEntities: json('caption_entities'),
  finalCaption: text('final_caption').notNull().default(''),
  storageChatId: integer('storage_chat_id'),
  storageMessageId: integer('storage_message_id'),
  token: text('token'),
  status: text('status').notNull().default('DRAFT'),
  expirationDays: integer('expiration_days'),
  expiresAt: integer('expires_at'),
  archivedAt: integer('archived_at'),
  receivedAt: integer('received_at').notNull().default(sql`(unixepoch())`),
  lastDeliveredAt: integer('last_delivered_at'),
  deliveryCount: integer('delivery_count').notNull().default(0),
  archiveErrorCode: text('archive_error_code'),
  archiveError: text('archive_error'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
}, (t) => ({
  ownerStatusIdx: index('idx_files_owner_status').on(t.ownerId, t.status),
  sourceIdx: uniqueIndex('uidx_files_source').on(t.sourceChatId, t.sourceMessageId),
  tokenIdx: uniqueIndex('uidx_files_token').on(t.token),
}));

export const sessions = table('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  fileId: integer('file_id').notNull(),
  stage: text('stage').notNull(),
  version: integer('version').notNull().default(1),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
}, (t) => ({
  userIdx: uniqueIndex('uidx_sessions_user').on(t.userId),
  stageIdx: index('idx_sessions_stage').on(t.stage),
}));

export const processedUpdates = table('processed_updates', {
  updateId: integer('update_id').primaryKey(),
  state: text('state').notNull().default('PROCESSING'),
  claimToken: text('claim_token'),
  claimedAt: integer('claimed_at').notNull().default(sql`(unixepoch())`),
  completedAt: integer('completed_at'),
  processedAt: integer('processed_at').notNull().default(sql`(unixepoch())`),
});

export const deliveries = table('deliveries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fileId: integer('file_id').notNull(),
  receiverChatId: integer('receiver_chat_id').notNull(),
  updateId: integer('update_id'),
  state: text('state').notNull().default('SENT'),
  deliveredAt: integer('delivered_at').notNull().default(sql`(unixepoch())`),
  sentAt: integer('sent_at'),
}, (t) => ({
  receiverIdx: index('idx_deliveries_file_receiver').on(t.fileId, t.receiverChatId),
  updateIdx: uniqueIndex('uidx_deliveries_update').on(t.updateId),
  fileUpdateIdx: uniqueIndex('uidx_deliveries_file_update').on(t.fileId, t.updateId),
}));

export const rateLimits = table('rate_limits', {
  userId: integer('user_id').primaryKey(),
  windowStartedAt: integer('window_started_at').notNull(),
  requestCount: integer('request_count').notNull().default(0),
});
