// Telegram Serverless handlers have no Node environment-variable API. Set these values
// before deployment (or use the platform's supported project configuration).
// Keeping placeholders here makes missing production configuration fail closed.
export const OWNER_TELEGRAM_ID = null;
export const STORAGE_CHANNEL_ID = null;
export const BOT_USERNAME = '';

export function requireStorageConfig() {
  if (!Number.isSafeInteger(STORAGE_CHANNEL_ID)) {
    throw new Error('STORAGE_CHANNEL_ID is not configured');
  }
  return STORAGE_CHANNEL_ID;
}

export function isOwner(userId) {
  return Number.isSafeInteger(OWNER_TELEGRAM_ID) && userId === OWNER_TELEGRAM_ID;
}
