# FileLink Bot

FileLink Bot is a Persian Telegram file-sharing bot for Telegram Serverless.
Users send a supported media message, choose a caption and expiry, and receive
a random deep link. The file is copied into a private Telegram channel and is
later copied to a recipient when the link is opened. The serverless runtime
never downloads the binary.

## Features

- Document, photo, video, audio, animation, and voice uploads.
- Optional plain-text captions, including Persian and emoji.
- Expiry from 1 to 3650 days or no expiry.
- Private-channel archival and delivery through `copyMessage`.
- 128-bit Web Crypto share tokens, lazy expiration, owner disable action.
- SQLite-backed sessions, update idempotency, delivery counters, and rate limit.
- Persian user messages and privacy notice.

## Requirements

- A Telegram bot with Telegram Serverless enabled.
- A private channel where the bot is an administrator with permission to post.
- Node.js 18+ and `@tgcloud/cli` 0.2.x for local commands.

Set `OWNER_TELEGRAM_ID` and `STORAGE_CHANNEL_ID` in `tgcloud/lib/config.js` before
deployment. `STORAGE_CHANNEL_ID` may be a channel id such as `-100...`; do not
put a Bot API token or CLI credential in the repository.

## Local checks

```bash
npm install
npm test
npm run check
npm run lint
```

The tests are local pure-function tests. They do not contact Telegram or a
production database.

## Deployment

1. Create a bot with BotFather and enable Telegram Serverless.
2. Create a private archive channel, add the bot as administrator, and set the
   channel id in `tgcloud/lib/config.js`.
3. Run `npx tgcloud login` and select the bot.
4. Review `npx tgcloud status` and `npx tgcloud diff`.
5. Deploy code with `npx tgcloud push`.
6. Preview the schema with `npx tgcloud migrate --dry-run`, then explicitly run
   `npx tgcloud migrate` to create/update tables.
7. Smoke-test `/start`, an upload, a caption, an expiry, and the generated link.

Never use `--force` or a destructive migration without reviewing the CLI output.
The platform manages the webhook from the handler files; no server or polling
process is required.

## Commands

`npm run deploy`, `npm run status`, `npm run diff`, `npm run migrate`, and
`npm run run` are aliases for the corresponding `tgcloud` commands.

## Limitations

- Albums/media groups, stickers, and video notes are rejected in the MVP.
- Telegram Serverless exposes byte helpers, but this project deliberately uses
  `copyMessage`; Bot API `getFile` downloads are capped at 20 MB.
- Expiration is lazy: a link is marked expired when a recipient requests it.
- A retry after an unknown external Bot API outcome can leave an extra archive
  message; the project records failure and does not retry automatically.
- Physical deletion from the archive channel is intentionally not promised.
- Upload, management, and deep-link delivery are processed only in private chats.

See [docs/architecture.md](docs/architecture.md), [docs/database.md](docs/database.md),
[docs/compatibility.md](docs/compatibility.md), and [docs/deployment.md](docs/deployment.md).
