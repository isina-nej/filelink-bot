# Test report

The repository includes local tests for media parsing, caption limits, Persian
and Arabic digit normalization, expiry boundaries, and deep-link token format.

Run:

```bash
npm test
npm run check
npm run lint
```

These checks do not exercise a live Telegram bot, the hosted SQLite adapter, or
channel permissions. Those remain deployment smoke-test items and are not
reported as passed here.
