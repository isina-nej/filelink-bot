# Architecture

Telegram routes `message` updates to `tgcloud/handlers/message.js` and callback
button updates to `tgcloud/handlers/callback_query.js`. Both handlers claim `update_id` in
`processed_updates` before changing state. They use the platform's `api` proxy
and asynchronous SQLite builder.

Upload flow:

1. `file-parser.js` accepts one supported media object, extracts dimensions,
   duration, thumbnail ids and caption entities, and rejects albums or
   protected media.
2. `tgcloud/lib/files.js` writes a `DRAFT`; `tgcloud/lib/sessions.js` writes `WAITING_CAPTION`.
3. Caption and expiry callbacks/text are guarded by session version and stage.
4. The session is claimed as `ARCHIVING`; `archive.js` checks channel admin
   access and calls `api.copyMessage` with an explicit caption.
5. A 128-bit random token is stored only after the archive message succeeds.
6. `/start <token>` calls `delivery.js`, checks status and expiry, copies the
   stored message, reserves the update in `PENDING`, and marks it `SENT` only
   after the copy succeeds. A pending reservation blocks a duplicate send when
   database confirmation fails; definite Bot API 400/403 failures release the
   reservation so the same update can retry.

Update idempotency uses `PROCESSING`, `FAILED`, and `COMPLETED` states plus a
short processing lease, so failed invocations can be retried while duplicates
already in flight are ignored. Session/file changes use conditional updates and restore
the previous Session stage when the companion file update cannot be applied.

If archive completion succeeds but Session cleanup fails, the active file stays
usable and the next Session read removes the stale Session linked to that active
file.

There is no process-global session state, worker, cron, HTTP server, or binary
transfer in the product flow. `lib/` modules contain the database and Bot API
boundaries; validation and formatting helpers remain pure where possible.
