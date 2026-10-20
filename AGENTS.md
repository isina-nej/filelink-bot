# FileLink Bot project rules

This repository targets Telegram Serverless and is intentionally not a Node.js
HTTP application.

- Runtime surface is `tgcloud/schema.js`, `tgcloud/handlers/*.js`, and
  `tgcloud/lib/*.js`.
- Runtime SDK imports use the platform's bare module names `sdk` and `sdk/db`.
  Project-relative imports inside `tgcloud/` use `.js` extensions (for example
  `../schema.js` and `../lib/files.js`). Do not add npm runtime packages.
- Handlers default-export one async function and receive the update payload.
- Persistent state belongs in the built-in SQLite database. Every query is
  asynchronous and must be awaited. Foreign keys are not supported.
- Files are archived and delivered with Bot API `copyMessage`; file bytes are
  never downloaded into the isolate.
- All state transitions are conditional on owner, state, and session version.
- Do not store tokens, credentials, full share tokens, or file contents in logs.
- Schema changes require `tgcloud migrate`; code deployment uses `tgcloud push`.

Before changing a handler, inspect its callers through the state/session helpers,
then update the pure unit tests when validation or token/expiry behavior changes.
