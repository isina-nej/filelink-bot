export const mainKeyboard = {
  keyboard: [
    [{ text: '📤 ارسال فایل جدید' }, { text: '📁 فایل‌های من' }],
    [{ text: '❓ راهنما' }],
  ],
  resize_keyboard: true,
};

export function captionKeyboard(fileId, version) {
  return { inline_keyboard: [
    [{ text: 'بدون کپشن', callback_data: `caption:none:${fileId}:${version}` }],
    [{ text: 'لغو عملیات', callback_data: `cancel:${fileId}:${version}` }],
  ] };
}

export function expiryKeyboard(fileId, version) {
  return { inline_keyboard: [
    [{ text: '۱ روز', callback_data: `expiry:1:${fileId}:${version}` }, { text: '۷ روز', callback_data: `expiry:7:${fileId}:${version}` }],
    [{ text: '۳۰ روز', callback_data: `expiry:30:${fileId}:${version}` }, { text: '۳۶۵ روز', callback_data: `expiry:365:${fileId}:${version}` }],
    [{ text: 'بدون تاریخ انقضا', callback_data: `expiry:none:${fileId}:${version}` }],
    [{ text: 'لغو عملیات', callback_data: `cancel:${fileId}:${version}` }],
  ] };
}

export function retryKeyboard(fileId, version) {
  return { inline_keyboard: [
    [{ text: 'تلاش دوباره', callback_data: `retry:${fileId}:${version}` }],
    [{ text: 'لغو عملیات', callback_data: `cancel:${fileId}:${version}` }],
  ] };
}

export function fileManagementKeyboard(fileId) {
  return { inline_keyboard: [[{ text: 'غیرفعال‌کردن لینک', callback_data: `file:disable:${fileId}` }]] };
}

export function successKeyboard(url) {
  return { inline_keyboard: [
    [{ text: 'اشتراک‌گذاری', url: `https://t.me/share/url?url=${encodeURIComponent(url)}` }],
    [{ text: 'فایل‌های من', callback_data: 'menu:files' }, { text: 'ارسال فایل جدید', callback_data: 'menu:new' }],
  ] };
}
