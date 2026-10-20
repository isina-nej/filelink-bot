import { getFileById, markFileArchiving } from './files.js';
import { archiveFile } from './archive.js';
import { finishSession, markArchiveFailedSession } from './sessions.js';
import { FileLinkError } from './errors.js';

export async function completeArchive(userId, fileId) {
  const file = await getFileById(fileId);
  if (!file || file.ownerId !== userId) throw new FileLinkError('NOT_FOUND', 'فایل موردنظر پیدا نشد.');
  const claimed = await markFileArchiving(fileId, userId);
  if (!claimed) throw new FileLinkError('INVALID_STATE', 'این عملیات قبلاً پردازش شده یا دیگر معتبر نیست.');
  try {
    const result = await archiveFile(claimed);
    await finishSession(userId, fileId);
    return result;
  } catch (error) {
    await markArchiveFailedSession(userId, fileId);
    throw error;
  }
}
