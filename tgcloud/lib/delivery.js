import { api } from 'sdk';
import { FILE_STATES } from './constants.js';
import { ERROR_MESSAGES, FileLinkError, classifyTelegramError } from './errors.js';
import { getFileByToken, markExpired, recordDelivery } from './files.js';
import { isExpired } from './expiration.js';
import { isValidShareToken } from './tokens.js';

export async function deliverToken(token, receiverChatId, updateId) {
  if (!isValidShareToken(token)) throw new FileLinkError('NOT_FOUND', ERROR_MESSAGES.NOT_FOUND);
  const file = await getFileByToken(token);
  if (!file) throw new FileLinkError('NOT_FOUND', ERROR_MESSAGES.NOT_FOUND);
  if (file.status === FILE_STATES.DISABLED) throw new FileLinkError('DISABLED', ERROR_MESSAGES.DISABLED);
  if (file.status === FILE_STATES.EXPIRED || isExpired(file.expiresAt)) {
    if (file.status === FILE_STATES.ACTIVE) await markExpired(file.id);
    throw new FileLinkError('EXPIRED', ERROR_MESSAGES.EXPIRED);
  }
  if (file.status !== FILE_STATES.ACTIVE || file.storageChatId == null || file.storageMessageId == null) {
    throw new FileLinkError('NOT_FOUND', ERROR_MESSAGES.NOT_FOUND);
  }
  try {
    await api.copyMessage({ chat_id: receiverChatId, from_chat_id: file.storageChatId, message_id: file.storageMessageId });
  } catch (error) {
    throw error instanceof FileLinkError ? error : classifyTelegramError(error, 'delivery');
  }
  await recordDelivery(file.id, receiverChatId, updateId);
  return file;
}
