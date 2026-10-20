# Database

`tgcloud/schema.js` defines these tables:

- `users`: Telegram identity and display metadata.
- `files`: source media identifiers, dimensions/duration, thumbnail identifiers,
  caption entities, archive message id, token, status, expiry, timestamps, and
  delivery count.
- `sessions`: one active versioned workflow per user.
- `processed_updates`: unique update ids with `PROCESSING`, `FAILED`, and
  `COMPLETED` states for webhook idempotency and retry recovery.
- `deliveries`: update reservations with `PENDING`/`SENT` state, unique update
  keys, and delivery timestamps.
- `rate_limits`: a short per-user request window.

Telegram Serverless migrations are explicit. `tgcloud push` uploads code and
schema declarations but does not apply database changes; run `tgcloud migrate`
after reviewing its dry run. Foreign keys are deliberately absent because the
runtime rejects them; application queries scope every mutation by owner and id.
