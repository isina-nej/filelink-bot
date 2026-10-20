# Database

`tgcloud/schema.js` defines these tables:

- `users`: Telegram identity and display metadata.
- `files`: source media identifiers, archive message id, token, status, expiry,
  caption, and delivery count.
- `sessions`: one active versioned workflow per user.
- `processed_updates`: unique update ids for webhook idempotency.
- `deliveries`: unique file/recipient and update records.
- `rate_limits`: a short per-user request window.

Telegram Serverless migrations are explicit. `tgcloud push` uploads code and
schema declarations but does not apply database changes; run `tgcloud migrate`
after reviewing its dry run. Foreign keys are deliberately absent because the
runtime rejects them; application queries scope every mutation by owner and id.
