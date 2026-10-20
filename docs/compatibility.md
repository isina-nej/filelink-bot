# Telegram Serverless compatibility

Research checked 20 October 2026 against the current public `@tgcloud/cli`
package metadata (0.2.0) and the maintained Telegram Serverless template and
SDK reference.

Confirmed platform facts:

- Handlers are default exports and receive the update payload; the full update
  is available through the context object.
- Runtime SDK imports use bare names (`sdk`, `sdk/db`); project modules use
  relative `.js` imports inside `tgcloud/`.
- `api.<method>()` returns the unwrapped Bot API result and throws `BotApiError`.
- Database operations are asynchronous; schema foreign keys are unsupported.
- File bytes cannot be downloaded/uploaded in a handler, so this project uses
  `copyMessage` for both archival and delivery.
- `fetch` is textual and is not used by this bot.
- `crypto.getRandomValues` is required for secure share tokens. If the isolate
  does not expose it, deployment must stop rather than use `Math.random()`.

Sources: [Telegram Serverless](https://core.telegram.org/bots/serverless),
[tgcloud CLI](https://github.com/justwasm/tgcloud), and the
[SDK reference/template](https://github.com/erfnzdeh/Telegram-Serverless-Bot-Template).

Not verified in this repository: a live Bot API archive channel, production
quota values, and the exact behavior of a particular bot's permissions. Those
require credentials and a non-production smoke test.
