import { api } from 'sdk';
import { claimUpdate, completeUpdate, releaseUpdate } from '../lib/idempotency.js';
import { rememberUser } from '../lib/users.js';
import { disableFile, listOwnerFiles } from '../lib/files.js';
import { getSession, moveToExpiry, setExpiryAndClaim, cancelSession, claimArchive } from '../lib/sessions.js';
import { calculateExpiresAt, parseExpirationDays } from '../lib/expiration.js';
import { completeArchive } from '../lib/flow.js';
import { expiryKeyboard, retryKeyboard, mainKeyboard, successKeyboard } from '../lib/keyboards.js';
import { TEXT, successText } from '../lib/messages.js';
import { FileLinkError, publicMessage } from '../lib/errors.js';
import { logEvent } from '../lib/logging.js';

const int = (value) => /^\d+$/.test(value) ? Number(value) : null;

async function answer(id, text) {
  try { await api.answerCallbackQuery({ callback_query_id: id, ...(text ? { text } : {}) }); } catch (error) { console.warn('callback answer failed', error); }
}

async function archiveAndReply(query, userId, fileId) {
  try {
    const { file, url } = await completeArchive(userId, fileId);
    await api.sendMessage({ chat_id: query.message.chat.id, text: successText(file, url), reply_markup: successKeyboard(url) });
  } catch (error) {
    const session = await getSession(userId);
    await api.sendMessage({ chat_id: query.message.chat.id, text: `${publicMessage(error)}\n\n${TEXT.archiveRetry}`, reply_markup: session ? retryKeyboard(fileId, session.version) : mainKeyboard });
  }
}

export default async function callbackQueryHandler(query, ctx) {
  const updateId = ctx?.update?.update_id;
  let claimed;
  try {
    claimed = await claimUpdate(updateId);
  } catch (error) {
    logEvent('callback_claim_error', { operation: 'idempotency', status: 'failed', error_code: error.code || 'DATABASE_ERROR' });
    await answer(query.id, TEXT.internalError || 'خطای داخلی رخ داد.');
    return;
  }
  if (!claimed) {
    await answer(query.id, 'این درخواست قبلاً پردازش شده است');
    return;
  }
  const message = query.message;
  await answer(query.id);
  if (!message?.chat?.id || !query.from?.id) {
    await completeUpdate(updateId);
    return;
  }
  if (message.chat.type && message.chat.type !== 'private') {
    await completeUpdate(updateId);
    return;
  }
  const userId = query.from.id;
  try {
    await rememberUser(query.from);
    const parts = String(query.data || '').split(':');
    const action = parts[0];
    if (action === 'caption' && parts[1] === 'none') {
      const fileId = int(parts[2]);
      const version = int(parts[3]);
      const session = await getSession(userId);
      if (!fileId || !version || !session || session.fileId !== fileId || session.version !== version) throw new FileLinkError('INVALID_STATE', TEXT.invalidState);
      const next = await moveToExpiry(userId, fileId, version, '');
      if (!next) throw new FileLinkError('INVALID_STATE', TEXT.invalidState);
      await answer(query.id, 'کپشن حذف شد');
      await api.sendMessage({ chat_id: message.chat.id, text: TEXT.expiryPrompt, reply_markup: expiryKeyboard(fileId, next.version) });
      await completeUpdate(updateId);
      return;
    }
    if (action === 'cancel') {
      const fileId = int(parts[1]);
      const version = int(parts[2]);
      if (!fileId || !version || !(await cancelSession(userId, fileId, version))) {
        throw new FileLinkError('INVALID_STATE', TEXT.invalidState);
      }
      await answer(query.id, 'لغو شد');
      await api.sendMessage({ chat_id: message.chat.id, text: TEXT.cancelled, reply_markup: mainKeyboard });
      await completeUpdate(updateId);
      return;
    }
    if (action === 'expiry') {
      const rawDays = parts[1];
      const fileId = int(parts[2]);
      const version = int(parts[3]);
      const session = await getSession(userId);
      if (!fileId || !version || !session || session.fileId !== fileId || session.version !== version || session.stage !== 'WAITING_EXPIRY') throw new FileLinkError('INVALID_STATE', TEXT.invalidState);
      const days = rawDays === 'none' ? null : parseExpirationDays(rawDays);
      if (rawDays !== 'none' && days == null) throw new FileLinkError('INVALID_STATE', TEXT.expiryInvalid);
      const next = await setExpiryAndClaim(userId, fileId, version, days, calculateExpiresAt(Math.floor(Date.now() / 1000), days));
      if (!next) throw new FileLinkError('INVALID_STATE', TEXT.invalidState);
      await answer(query.id, 'در حال ذخیره‌سازی');
      await archiveAndReply(query, userId, fileId);
      await completeUpdate(updateId);
      return;
    }
    if (action === 'retry') {
      const fileId = int(parts[1]);
      const version = int(parts[2]);
      const session = await getSession(userId);
      if (!fileId || !version || !session || session.fileId !== fileId || session.version !== version) throw new FileLinkError('INVALID_STATE', TEXT.invalidState);
      const next = await claimArchive(userId, fileId, version);
      if (!next) throw new FileLinkError('INVALID_STATE', TEXT.invalidState);
      await answer(query.id, 'تلاش دوباره آغاز شد');
      await archiveAndReply(query, userId, fileId);
      await completeUpdate(updateId);
      return;
    }
    if (action === 'file' && parts[1] === 'disable') {
      const fileId = int(parts[2]);
      if (!fileId || !(await disableFile(fileId, userId))) throw new FileLinkError('NO_ACCESS', TEXT.noAccess);
      await answer(query.id, 'لینک غیرفعال شد');
      await api.sendMessage({ chat_id: message.chat.id, text: 'لینک فایل غیرفعال شد.', reply_markup: mainKeyboard });
      await completeUpdate(updateId);
      return;
    }
    if (action === 'menu' && parts[1] === 'files') {
      const rows = await listOwnerFiles(userId);
      await answer(query.id, 'فایل‌های شما');
      await api.sendMessage({ chat_id: message.chat.id, text: rows.length ? rows.map((file) => `${file.id}. ${file.fileName || 'بدون نام'} — ${file.status}`).join('\n') : TEXT.noFiles, reply_markup: mainKeyboard });
      await completeUpdate(updateId);
      return;
    }
    if (action === 'menu' && parts[1] === 'new') {
      await answer(query.id, 'فایل را ارسال کنید');
      await api.sendMessage({ chat_id: message.chat.id, text: 'فایل را ارسال کنید.', reply_markup: mainKeyboard });
      await completeUpdate(updateId);
      return;
    }
    await answer(query.id, TEXT.invalidState);
    await completeUpdate(updateId);
  } catch (error) {
    logEvent('callback_error', { user_id: userId, operation: 'callback', status: 'failed', error_code: error.code || 'INTERNAL_ERROR' });
    try {
      await answer(query.id, publicMessage(error));
    } finally {
      if (error instanceof FileLinkError && ['INVALID_STATE', 'NOT_FOUND', 'EXPIRED', 'DISABLED', 'NO_ACCESS'].includes(error.code)) {
        await completeUpdate(updateId);
      } else {
        await releaseUpdate(updateId);
      }
    }
  }
}
