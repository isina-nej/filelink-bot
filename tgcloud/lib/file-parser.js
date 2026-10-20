import { MAX_CAPTION_LENGTH } from './constants.js';

const MEDIA_FIELDS = [
  ['document', (value) => value],
  ['photo', (value) => Array.isArray(value) ? value[value.length - 1] : null],
  ['video', (value) => value],
  ['audio', (value) => value],
  ['animation', (value) => value],
  ['voice', (value) => value],
];

export function parseMediaMessage(message) {
  if (!message || typeof message !== 'object') return { error: 'UNSUPPORTED_MEDIA' };
  if (message.media_group_id) return { error: 'MEDIA_GROUP' };
  if (message.has_protected_content) return { error: 'PROTECTED_MEDIA' };
  for (const [mediaType, pick] of MEDIA_FIELDS) {
    const media = pick(message[mediaType]);
    if (media?.file_id) {
      const thumbnail = media.thumbnail ?? media.thumb ?? null;
      return {
        mediaType,
        fileId: media.file_id,
        fileUniqueId: media.file_unique_id ?? null,
        fileName: media.file_name ?? null,
        mimeType: media.mime_type ?? null,
        fileSize: Number.isSafeInteger(media.file_size) ? media.file_size : null,
        width: Number.isSafeInteger(media.width) ? media.width : null,
        height: Number.isSafeInteger(media.height) ? media.height : null,
        duration: Number.isSafeInteger(media.duration) ? media.duration : null,
        thumbnailFileId: thumbnail?.file_id ?? null,
        thumbnailFileUniqueId: thumbnail?.file_unique_id ?? null,
        mediaMetadata: {
          mediaType,
          mimeType: media.mime_type ?? null,
          fileName: media.file_name ?? null,
          fileUniqueId: media.file_unique_id ?? null,
        },
        originalCaption: typeof message.caption === 'string' ? message.caption : '',
        captionEntities: Array.isArray(message.caption_entities) ? message.caption_entities : null,
      };
    }
  }
  if (message.sticker || message.video_note) return { error: 'UNSUPPORTED_MEDIA' };
  return null;
}

export function validateCaption(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > MAX_CAPTION_LENGTH) return false;
  return true;
}
