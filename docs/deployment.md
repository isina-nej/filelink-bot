# Deployment checklist

1. Create the bot and enable Serverless in BotFather.
2. Create a private channel and make the bot an administrator with post
   permission. Copy its numeric id to `tgcloud/lib/config.js`.
3. Set the numeric owner id in the same file.
4. Run `npm install`, then `npx tgcloud login`.
5. Run `npx tgcloud status` and `npx tgcloud diff`.
6. Run `npx tgcloud push`.
7. Run `npx tgcloud migrate --dry-run`; apply with `npx tgcloud migrate` only
   after review.
8. Use `npx tgcloud run handlers/message '{ chat: { id: 1 }, text: "/start" }'`
   for a non-production handler smoke test where supported.
9. Test an actual upload and deep link with a dedicated test bot/channel.

The CLI access credential is local CLI state under `.tgcloud/` and is ignored by
Git. This project never asks for or stores a Bot API token.
