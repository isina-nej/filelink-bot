import { api } from 'sdk';
import { FILE_STATES, SESSION_STAGES } from '../lib/constants.js';
import { createDraft, listOwnerFiles } from '../lib/files.js';
import { parseMediaMessage, validateCaption } from '../lib/file-parser.js';
import { parseExpirationDays, calculateExpiresAt } from '../lib/expiration.js';
import { claimUpdate } from '../lib/idempotency.js';
import { rememberUser } from '../lib/users.js';
import { consumeRateLimit } from '../lib/rate-limit.js';
import { beginSession, getSession, moveToExpiry, setExpiryAndClaim, cancelSession } from '../lib/sessions.js';
import { completeArchive } from '../lib/flow.js';
import { buildShareUrl } from '../lib/tokens.js';
import { BOT_USERNAME } from '../lib/config.js';
import { deliverToken } from '../lib/delivery.js';
import { captionKeyboard, expiryKeyboard, mainKeyboard, retryKeyboard, successKeyboard } from '../lib/keyboards.js';
import { TEXT, filesText, successText } from '../lib/messages.js';
import { FileLinkError, publicMessage } from '../lib/errors.js';
import { logEvent } from '../lib/logging.js';

function commandOf(text) {
  if (!text?.startsWith('/')) return { command: null, args: [] };
  const parts = text.trim().split(/\s+/);
  return { command: parts[0].split('@')[0].toLowerCase(), args: parts.slice(1) };
}

async function sendMenu(chatId, text) {
  await api.sendMessage({ chat_id: chatId, text, reply_markup: mainKeyboard });
}

async function sendFiles(chatId, userId) {
  const rows = await listOwnerFiles(userId);
  const buttons = rows.filter((file) => file.status === FILE_STATES.ACTIVE).map((file) => [
    { text: `غیرفعال‌کردن #${file.id}`, callback_data: `file:disable:${file.id}` },
  ]);
  await api.sendMessage({ chat_id: chatId, text: filesText(rows), reply_markup: buttons.length ? { inline_keyboard: buttons } : undefined });
}

async function handleArchive(userId, chatId, fileId) {
  try {
    const { file, url } = await completeArchive(userId, fileId);
    const finalUrl = url || buildShareUrl(BOT_USERNAME, file.token);
    await api.sendMessage({ chat_id: chatId, text: successText(file, finalUrl), reply_markup: successKeyboard(finalUrl) });
    logEvent('archive_completed', { user_id: userId, file_id: fileId, status: 'active' });
  } catch (error) {
    logEvent('archive_failed', { user_id: userId, file_id: fileId, status: 'failed', error_code: error.code || 'INTERNAL_ERROR' });
    const session = await getSession(userId);
    await api.sendMessage({ chat_id: chatId, text: `${publicMessage(error)}\n\n${TEXT.archiveRetry}`, reply_markup: session ? retryKeyboard(fileId, session.version) : mainKeyboard });
  }
}

async function handleMedia(message, userId) {
  if (!(await consumeRateLimit(userId))) {
    await api.sendMessage({ chat_id: message.chat.id, text: 'تعداد آپلودها زیاد است. کمی بعد دوباره تلاش کنید.' });
    return;
  }
  const session = await getSession(userId);
  if (session) {
    await api.sendMessage({ chat_id: message.chat.id, text: TEXT.wait });
    return;
  }
  const media = parseMediaMessage(message);
  if (media?.error === 'MEDIA_GROUP') {
    await api.sendMessage({ chat_id: message.chat.id, text: TEXT.mediaGroup });
    return;
  }
  if (media?.error === 'PROTECTED_MEDIA') {
    await api.sendMessage({ chat_id: message.chat.id, text: TEXT.protectedMedia });
    return;
  }
  if (media?.error || !media) {
    await api.sendMessage({ chat_id: message.chat.id, text: TEXT.unsupportedMedia });
    return;
  }
  const file = await createDraft(userId, message.chat.id, message.message_id, media);
  if (!file) throw new FileLinkError('DATABASE_ERROR', 'ثبت اولیه فایل انجام نشد.');
  const createdSession = await beginSession(userId, file.id);
  if (!createdSession) throw new FileLinkError('DATABASE_ERROR', 'ثبت مرحله فایل انجام نشد.');
  await api.sendMessage({ chat_id: message.chat.id, text: `${TEXT.uploadReady}\n\n${TEXT.captionPrompt}`, reply_markup: captionKeyboard(file.id, createdSession.version) });
}

export default async function messageHandler(message, ctx) {
  const chatId = message?.chat?.id;
  const userId = message?.from?.id ?? chatId;
  if (!chatId || !userId) return;
  const updateId = ctx?.update?.update_id;
  try {
    if (!(await claimUpdate(updateId))) return;
    await rememberUser(message.from ?? { id: userId });
    const text = typeof message.text === 'string' ? message.text.trim() : '';
    const { command, args } = commandOf(text);
    if (command === '/start') {
      const token = args[0];
      if (token) {
        await deliverToken(token, chatId, updateId);
        return;
      }
      await sendMenu(chatId, TEXT.welcome(message.from?.first_name || 'دوست عزیز'));
      return;
    }
    if (command === '/help' || text === '❓ راهنما') {
      await sendMenu(chatId, TEXT.help);
      return;
    }
    if (command === '/privacy') {
      await sendMenu(chatId, TEXT.privacy);
      return;
    }
    if (command === '/files' || text === '📁 فایل‌های من') {
      await sendFiles(chatId, userId);
      return;
    }
    if (command === '/new' || text === '📤 ارسال فایل جدید') {
      await api.sendMessage({ chat_id: chatId, text: 'فایل را ارسال کنید.', reply_markup: mainKeyboard });
      return;
    }
    if (command === '/cancel') {
      const session = await getSession(userId);
      if (session) await cancelSession(userId, session.fileId, session.version);
      await sendMenu(chatId, TEXT.cancelled);
      return;
    }

    const media = parseMediaMessage(message);
    if (media) {
      await handleMedia(message, userId);
      return;
    }
    const session = await getSession(userId);
    if (session?.stage === SESSION_STAGES.WAITING_CAPTION) {
      if (!validateCaption(text)) {
        await api.sendMessage({ chat_id: chatId, text: TEXT.captionInvalid, reply_markup: captionKeyboard(session.fileId, session.version) });
        return;
      }
      const next = await moveToExpiry(userId, session.fileId, session.version, text);
      if (!next) throw new FileLinkError('INVALID_STATE', TEXT.invalidState);
      await api.sendMessage({ chat_id: chatId, text: TEXT.expiryPrompt, reply_markup: expiryKeyboard(session.fileId, next.version) });
      return;
    }
    if (session?.stage === SESSION_STAGES.WAITING_EXPIRY) {
      const days = parseExpirationDays(text);
      if (days == null) {
        await api.sendMessage({ chat_id: chatId, text: TEXT.expiryInvalid, reply_markup: expiryKeyboard(session.fileId, session.version) });
        return;
      }
      const next = await setExpiryAndClaim(userId, session.fileId, session.version, days, calculateExpiresAt(Math.floor(Date.now() / 1000), days));
      if (!next) throw new FileLinkError('INVALID_STATE', TEXT.invalidState);
      await handleArchive(userId, chatId, session.fileId);
      return;
    }
    await sendMenu(chatId, TEXT.help);
  } catch (error) {
    logEvent('message_error', { user_id: userId, operation: 'message', status: 'failed', error_code: error.code || 'INTERNAL_ERROR' });
    await api.sendMessage({ chat_id: chatId, text: publicMessage(error), reply_markup: mainKeyboard });
  }
}
