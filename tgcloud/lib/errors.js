export class FileLinkError extends Error {
  constructor(code, userMessage, cause) {
    super(userMessage);
    this.name = 'FileLinkError';
    this.code = code;
    this.userMessage = userMessage;
    this.cause = cause;
  }
}

export const ERROR_MESSAGES = Object.freeze({
  INVALID_STATE: 'این عملیات دیگر معتبر نیست. لطفاً از ابتدا شروع کنید.',
  NOT_FOUND: 'فایل موردنظر پیدا نشد یا لینک معتبر نیست.',
  EXPIRED: 'مهلت دریافت این فایل به پایان رسیده است.',
  DISABLED: 'صاحب فایل دسترسی به این لینک را غیرفعال کرده است.',
  STORAGE_UNAVAILABLE: 'در حال حاضر امکان ذخیره فایل وجود ندارد. لطفاً بعداً دوباره تلاش کنید.',
  ARCHIVE_FAILED: 'ذخیره فایل انجام نشد. لطفاً دوباره تلاش کنید.',
  DELIVERY_FAILED: 'در حال حاضر امکان دریافت این فایل وجود ندارد. لطفاً بعداً دوباره تلاش کنید.',
  RATE_LIMITED: 'تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.',
  INTERNAL_ERROR: 'خطای داخلی رخ داد. لطفاً بعداً دوباره تلاش کنید.',
});

export function publicMessage(error) {
  if (error instanceof FileLinkError) return error.userMessage;
  return ERROR_MESSAGES.INTERNAL_ERROR;
}

export function classifyTelegramError(error, operation) {
  const code = error?.code;
  if (code === 429) return new FileLinkError('TELEGRAM_RATE_LIMIT', ERROR_MESSAGES.STORAGE_UNAVAILABLE, error);
  if (code === 400 || code === 403) {
    return new FileLinkError(operation === 'delivery' ? 'DELIVERY_FAILED' : 'ARCHIVE_FAILED',
      operation === 'delivery' ? ERROR_MESSAGES.DELIVERY_FAILED : ERROR_MESSAGES.STORAGE_UNAVAILABLE, error);
  }
  return new FileLinkError(operation === 'delivery' ? 'DELIVERY_FAILED' : 'ARCHIVE_FAILED',
    operation === 'delivery' ? ERROR_MESSAGES.DELIVERY_FAILED : ERROR_MESSAGES.ARCHIVE_FAILED, error);
}
