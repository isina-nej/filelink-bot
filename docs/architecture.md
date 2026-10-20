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
   stored message, and records a delivery after success.

Update idempotency uses a short processing lease and a separate `COMPLETED`
state, so a failed invocation can be reclaimed while a duplicate in-flight
invocation is ignored. Session/file changes use conditional updates and restore
the previous Session stage when the companion file update cannot be applied.

There is no process-global session state, worker, cron, HTTP server, or binary
transfer in the product flow. `lib/` modules contain the database and Bot API
boundaries; validation and formatting helpers remain pure where possible.
