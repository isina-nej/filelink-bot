import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMediaMessage, validateCaption } from '../../tgcloud/lib/file-parser.js';

test('parses the largest photo and preserves the original caption', () => {
  const parsed = parseMediaMessage({
    chat: { id: 1 },
    photo: [{ file_id: 'small' }, { file_id: 'large', file_unique_id: 'u', file_size: 42, width: 100, height: 80 }],
    caption: 'توضیح',
  });
  assert.equal(parsed.fileId, 'large');
  assert.equal(parsed.mediaType, 'photo');
  assert.equal(parsed.originalCaption, 'توضیح');
  assert.equal(parsed.width, 100);
  assert.equal(parsed.height, 80);
});

test('rejects albums and protected media', () => {
  assert.equal(parseMediaMessage({ media_group_id: 'a', document: { file_id: 'x' } }).error, 'MEDIA_GROUP');
  assert.equal(parseMediaMessage({ has_protected_content: true, document: { file_id: 'x' } }).error, 'PROTECTED_MEDIA');
});

test('accepts supported types and rejects unsupported media', () => {
  assert.equal(parseMediaMessage({ voice: { file_id: 'v' } }).mediaType, 'voice');
  assert.equal(parseMediaMessage({ sticker: { file_id: 's' } }).error, 'UNSUPPORTED_MEDIA');
});

test('caption validation is plain text and bounded', () => {
  assert.equal(validateCaption('سلام 🌱'), true);
  assert.equal(validateCaption('   '), false);
  assert.equal(validateCaption('x'.repeat(1025)), false);
});
