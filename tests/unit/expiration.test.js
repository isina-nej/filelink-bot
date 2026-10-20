import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDigits, parseExpirationDays, calculateExpiresAt, isExpired } from '../../tgcloud/lib/expiration.js';

test('normalizes Persian and Arabic digits', () => {
  assert.equal(normalizeDigits('۱۲٣'), '123');
  assert.equal(parseExpirationDays('۳۶۵۰'), 3650);
});

test('accepts only integer durations in range', () => {
  assert.equal(parseExpirationDays('1'), 1);
  assert.equal(parseExpirationDays('0'), null);
  assert.equal(parseExpirationDays('-1'), null);
  assert.equal(parseExpirationDays('1.5'), null);
  assert.equal(parseExpirationDays('3651'), null);
  assert.equal(parseExpirationDays('abc'), null);
});

test('calculates expiry in Unix seconds and handles exact boundary', () => {
  assert.equal(calculateExpiresAt(100, 1), 86500);
  assert.equal(calculateExpiresAt(100, null), null);
  assert.equal(isExpired(100, 99), false);
  assert.equal(isExpired(100, 100), true);
});
