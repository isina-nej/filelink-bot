export const TEXT = Object.freeze({
  welcome: (name = 'دوست عزیز') => `سلام ${name}!\n\nبه FileLink Bot خوش آمدید. یک فایل ارسال کنید تا لینک اختصاصی دریافت آن ساخته شود.`,
  help: 'فایل را مستقیماً ارسال کنید، سپس کپشن و مدت اعتبار را انتخاب کنید.\n\nدستورها:\n/start شروع\n/files فایل‌های من\n/privacy حریم خصوصی\n/cancel لغو عملیات',
  privacy: 'فایل در یک کانال خصوصی تلگرام آرشیو می‌شود و مدیران آن کانال امکان مشاهده فایل‌ها را دارند. برای ساخت لینک، متادیتای لازم در پایگاه داده ذخیره می‌شود. هر دارنده لینک می‌تواند فایل را دریافت کند. غیرفعال‌سازی لینک به معنی حذف فیزیکی فایل از تلگرام نیست.',
  captionPrompt: 'لطفاً کپشن فایل خود را ارسال کنید.\n\nمی‌توانید توضیحی برای این فایل بنویسید یا گزینه بدون کپشن را انتخاب کنید.',
  expiryPrompt: 'فایل شما چند روز قابل دریافت باشد؟\n\nعددی بین ۱ تا ۳۶۵۰ وارد کنید یا گزینه بدون تاریخ انقضا را انتخاب کنید.',
  uploadReady: 'فایل دریافت شد.',
  mediaGroup: 'آلبوم‌ها و مجموعه‌های چندفایلی فعلاً پشتیبانی نمی‌شوند. لطفاً فایل را جداگانه ارسال کنید.',
  unsupportedMedia: 'این نوع رسانه در نسخه فعلی پشتیبانی نمی‌شود. Document، عکس، ویدیو، صوت، انیمیشن یا پیام صوتی ارسال کنید.',
  protectedMedia: 'این فایل قابل کپی نیست و نمی‌توان برای آن لینک ساخت.',
  captionInvalid: 'کپشن خالی است یا بیشتر از ۱۰۲۴ کاراکتر دارد. کپشن دیگری ارسال کنید.',
  expiryInvalid: 'مدت اعتبار باید یک عدد صحیح بین ۱ تا ۳۶۵۰ باشد.',
  cancelled: 'عملیات لغو شد.',
  wait: 'یک عملیات در حال انجام است. لطفاً ابتدا آن را کامل یا لغو کنید.',
  invalidState: 'این عملیات دیگر معتبر نیست. لطفاً از ابتدا شروع کنید.',
  noFiles: 'هنوز فایلی ثبت نکرده‌اید.',
  noAccess: 'این فایل برای شما قابل مدیریت نیست.',
  notFound: 'فایل موردنظر پیدا نشد یا لینک معتبر نیست.',
  expired: 'مهلت دریافت این فایل به پایان رسیده است.',
  disabled: 'صاحب فایل دسترسی به این لینک را غیرفعال کرده است.',
  deliveryFailed: 'در حال حاضر امکان دریافت این فایل وجود ندارد. لطفاً بعداً دوباره تلاش کنید.',
  archiveFailed: 'ذخیره فایل انجام نشد. تنظیمات کانال و دسترسی ربات را بررسی کنید.',
  archiveRetry: 'می‌توانید برای تلاش دوباره دکمه زیر را بزنید.',
});

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'نامشخص';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = units[0];
  for (let i = 1; value >= 1024 && i < units.length; i += 1) {
    value /= 1024;
    unit = units[i];
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}

export function fileStatusLabel(file) {
  if (file.status === 'ACTIVE') return 'فعال';
  if (file.status === 'EXPIRED') return 'منقضی‌شده';
  if (file.status === 'DISABLED') return 'غیرفعال';
  if (file.status === 'ARCHIVE_FAILED') return 'خطای ذخیره‌سازی';
  return 'در حال پردازش';
}

export function successText(file, url) {
  const expiry = file.expirationDays == null ? 'بدون تاریخ انقضا' : `${file.expirationDays} روز`;
  return `✅ فایل شما با موفقیت ذخیره شد.\n\n📄 نام فایل: ${file.fileName || 'بدون نام'}\n💾 حجم: ${formatFileSize(file.fileSize)}\n📝 کپشن: ${file.finalCaption || 'بدون کپشن'}\n⏳ اعتبار: ${expiry}\n\n🔗 لینک دریافت فایل:\n${url}\n\nاین لینک را برای دیگران ارسال کنید.`;
}

export function filesText(files) {
  if (!files.length) return TEXT.noFiles;
  return files.map((file, index) => {
    const expiry = file.expirationDays == null ? 'نامحدود' : `${file.expirationDays} روز`;
    return `${index + 1}. ${file.fileName || 'بدون نام'} — ${fileStatusLabel(file)} — ${expiry}\nشناسه: ${file.id}`;
  }).join('\n\n');
}
