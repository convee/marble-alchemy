# Paddle webhook handoff

The repository now contains an isolated webhook skeleton at
`infra/paddle-webhook/`. It is deliberately independent from the existing
anonymous analytics Worker so a payment notification cannot widen the public
browser event surface.

## What is implemented

- `Paddle-Signature` verification over the exact raw body using HMAC-SHA256.
- Five minute timestamp replay tolerance and constant-time digest comparison.
- An explicit allowlist for one-time transaction and adjustment lifecycle events.
- Idempotency keyed by Paddle `event_id`.
- A `createD1Store()` adapter using `INSERT OR IGNORE` and a memory adapter for tests.
- Payload size limits, malformed request handling, health endpoint, and tests.

The endpoint path is `/webhooks/paddle`. A valid but unsupported event returns
HTTP 202 and is ignored, avoiding an endless Paddle retry loop. A duplicate
allowlisted event returns HTTP 200 with `duplicate: true`.

## Remaining production handoff

1. In Paddle, create a notification destination owned by the account operator.
2. Copy its signing secret into the deployment secret store as
   `PADDLE_WEBHOOK_SECRET`; never commit or paste the value into source control.
3. Bind a D1 database, apply `infra/paddle-webhook/schema.sql`, and expose it as
   `DB` (or provide an equivalent object implementing `claim(key, record)`).
4. Deploy the worker and send a Paddle test notification. Verify a first insert,
   a retry returning `duplicate: true`, and an unsupported event returning 202.
5. Add reconciliation and refund reporting only after the first live payloads
   have been reviewed. The skeleton does not mark an order paid in the site or
   trigger fulfillment by itself.

No Paddle notification destination or real secret has been created by this
change.
