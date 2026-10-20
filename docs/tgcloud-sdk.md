# SDK notes used by FileLink Bot

The runtime imports `api`, `db`, and `BotApiError` from `sdk`; schema builders
and operators come from `sdk/db`. `api.copyMessage`, `api.sendMessage`,
`api.getMe`, and `api.getChatMember` use Bot API snake_case parameters. API
success values are unwrapped, and failures throw `BotApiError` with `code`,
`description`, and optional `parameters`.

Database builders are asynchronous and must be awaited. `.returning().run()` is
used whenever the affected row is needed. The SDK also provides `InputFile`,
`api.getFileContent(file_id)`, and `api.getFileStream(file_id)` for byte access;
the bot intentionally does not use them because `copyMessage` is sufficient.
The schema contains no foreign keys.

This summary is kept with the project; the authoritative reference is the
version shipped with the installed CLI and the official Telegram Serverless
documentation.
