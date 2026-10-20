import { api } from 'sdk';
import { requireStorageConfig } from './config.js';
import { FileLinkError } from './errors.js';

export async function assertStorageReady() {
  const channelId = requireStorageConfig();
  const me = await api.getMe();
  const member = await api.getChatMember({ chat_id: channelId, user_id: me.id });
  const isAdmin = member?.status === 'administrator' || member?.status === 'creator';
  if (!isAdmin || (member.status === 'administrator' && member.can_post_messages === false)) {
    throw new FileLinkError('STORAGE_UNAVAILABLE', 'ربات در کانال آرشیو دسترسی لازم را ندارد.');
  }
  return { channelId, bot: me };
}
