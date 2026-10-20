import { api } from 'sdk';
import { calculateExpiresAt } from './expiration.js';
import { buildShareUrl, generateShareToken } from './tokens.js';
import { requireStorageConfig, BOT_USERNAME } from './config.js';
import { markArchiveFailed, markArchived } from './files.js';
import { assertStorageReady } from './permissions.js';
import { classifyTelegramError, FileLinkError } from './errors.js';

function storageMessageId(result) {
  if (Number.isSafeInteger(result)) return result;
  if (Number.isSafeInteger(result?.message_id)) return result.message_id;
  throw new FileLinkError('ARCHIVE_FAILED', 'پاسخ آرشیو تلگرام معتبر نبود.');
}

export async function archiveFile(file) {
  let bot;
  try {
    const channelId = requireStorageConfig();
    ({ bot } = await assertStorageReady());
    const copied = await api.copyMessage({
      chat_id: channelId,
      from_chat_id: file.sourceChatId,
      message_id: file.sourceMessageId,
      // An explicit empty caption prevents the original caption being copied.
      caption: file.finalCaption ?? '',
    });
    const archivedAt = Math.floor(Date.now() / 1000);
    const copiedMessageId = storageMessageId(copied);
    let archived = null;
    let lastError;
    for (let attempt = 0; attempt < 3 && !archived; attempt += 1) {
      try {
        const token = generateShareToken();
        const expiresAt = calculateExpiresAt(archivedAt, file.expirationDays);
        archived = await markArchived(file.id, channelId, copiedMessageId, token, archivedAt, expiresAt);
      } catch (error) {
        lastError = error;
      }
    }
    if (!archived) throw lastError ?? new FileLinkError('DATABASE_ERROR', 'ثبت اطلاعات فایل انجام نشد.');
    const username = bot?.username || BOT_USERNAME;
    const url = buildShareUrl(username, archived.token);
    return { file: archived, url };
  } catch (error) {
    const classified = error instanceof FileLinkError ? error : classifyTelegramError(error, 'archive');
    try { await markArchiveFailed(file.id, classified.code, classified.cause?.description || classified.message); } catch (persistError) {
      console.error('archive failure could not be persisted', persistError);
    }
    throw classified;
  }
}
