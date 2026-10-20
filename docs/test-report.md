# Test report

The repository includes local tests for media parsing and metadata extraction,
caption limits, Persian and Arabic digit normalization, expiry boundaries, and
deep-link token format. The runtime state changes now use conditional database
updates, claim ownership, delivery reservations, and compensating rollback
paths for Session/file changes.

Run:

```bash
npm test
npm run check
npm run lint
```

These checks do not exercise a live Telegram bot, the hosted SQLite adapter,
concurrent callbacks, or channel permissions. Those remain deployment smoke-test
items and are not reported as passed here.
