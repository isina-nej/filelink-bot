import { DAY_SECONDS, MAX_EXPIRY_DAYS, MIN_EXPIRY_DAYS } from './constants.js';

export function normalizeDigits(value) {
  return String(value)
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

export function parseExpirationDays(value) {
  const normalized = normalizeDigits(value).trim();
  if (!/^\d+$/.test(normalized)) return null;
  const days = Number(normalized);
  return Number.isSafeInteger(days) && days >= MIN_EXPIRY_DAYS && days <= MAX_EXPIRY_DAYS ? days : null;
}

export function calculateExpiresAt(publishedAt, days) {
  if (days == null) return null;
  return publishedAt + days * DAY_SECONDS;
}

export function isExpired(expiresAt, now = Math.floor(Date.now() / 1000)) {
  return expiresAt != null && now >= expiresAt;
}
