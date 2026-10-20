const TOKEN_BYTES = 16;

function base64Url(bytes) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    out += alphabet[a >> 2];
    out += alphabet[((a & 3) << 4) | (b >> 4)];
    if (i + 1 < bytes.length) out += alphabet[((b & 15) << 2) | (c >> 6)];
    if (i + 2 < bytes.length) out += alphabet[c & 63];
  }
  return out.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function generateShareToken() {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== 'function') {
    throw new Error('SECURITY_BLOCKER: crypto.getRandomValues is unavailable');
  }
  const bytes = new Uint8Array(TOKEN_BYTES);
  cryptoApi.getRandomValues(bytes);
  return `f_${base64Url(bytes)}`;
}

export function isValidShareToken(token) {
  return typeof token === 'string' && /^f_[A-Za-z0-9_-]{22,62}$/.test(token);
}

export function buildShareUrl(username, token) {
  if (!isValidShareToken(token)) throw new Error('Invalid share token');
  const cleanUsername = String(username || '').replace(/^@/, '');
  if (!/^[A-Za-z0-9_]{5,32}$/.test(cleanUsername)) throw new Error('Bot username is unavailable');
  return `https://t.me/${cleanUsername}?start=${token}`;
}
