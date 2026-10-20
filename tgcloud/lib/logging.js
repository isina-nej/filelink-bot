export function logEvent(eventType, fields = {}) {
  const safe = { event_type: eventType, ...fields };
  delete safe.token;
  delete safe.share_token;
  delete safe.bot_token;
  delete safe.file_content;
  try {
    console.info(JSON.stringify(safe));
  } catch {
    console.info(eventType);
  }
}
