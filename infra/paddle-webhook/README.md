# Paddle webhook worker

This is an isolated Cloudflare Worker skeleton for Paddle payment notifications.
It is intentionally separate from the anonymous browser analytics Worker.

The worker verifies Paddle's `Paddle-Signature` header against the raw request
body, acknowledges only the allowlisted event types, and atomically claims each
`event_id` through a storage adapter. It does not send money, create Paddle
notification destinations, or contain a real secret.

Run the local tests with:

```sh
npm test
```

The D1 schema is in `schema.sql`. A production deployment still needs a user
owned Paddle notification destination, the destination's signing secret, and a
review of retention and reconciliation rules before it is connected.
