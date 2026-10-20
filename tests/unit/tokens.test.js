import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShareUrl, generateShareToken, isValidShareToken } from '../../tgcloud/lib/tokens.js';

test('generates a cryptographically random deep-link token', () => {
  const token = generateShareToken();
  assert.equal(isValidShareToken(token), true);
  assert.equal(token.length, 24);
});

test('validates deep-link token alphabet and length', () => {
  assert.equal(isValidShareToken(`f_${'a'.repeat(22)}`), true);
  assert.equal(isValidShareToken('f_short'), false);
  assert.equal(isValidShareToken(`f_${'!'.repeat(22)}`), false);
});

test('builds a Telegram deep link without private data', () => {
  const url = buildShareUrl('@filelink_bot', `f_${'a'.repeat(22)}`);
  assert.equal(url, `https://t.me/filelink_bot?start=f_${'a'.repeat(22)}`);
});
