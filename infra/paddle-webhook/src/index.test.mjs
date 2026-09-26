import test from 'node:test';
import assert from 'node:assert/strict';
import worker, {
  createD1Store,
  createMemoryStore,
  handlePaddleWebhook,
  verifyPaddleSignature,
} from './index.js';

const SECRET = 'test-webhook-secret';
const NOW = Date.parse('2026-09-26T00:00:00.000Z');

async function sign(body, timestamp = Math.floor(NOW / 1000)) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}:${body}`)),
  );
  return `ts=${timestamp};h1=${Buffer.from(signature).toString('hex')}`;
}

function event(eventType = 'transaction.completed', eventId = 'evt_001') {
  return JSON.stringify({
    event_id: eventId,
    event_type: eventType,
    occurred_at: '2026-09-26T00:00:00Z',
    data: { id: 'txn_001' },
  });
}

test('verifies Paddle timestamped HMAC signatures', async () => {
  const body = event();
  const signature = await sign(body);
  assert.equal(await verifyPaddleSignature(body, signature, SECRET, { now: NOW }), true);
  assert.equal(await verifyPaddleSignature(body, signature, 'wrong', { now: NOW }), false);
  assert.equal(await verifyPaddleSignature(body, signature, SECRET, { now: NOW + 301_000 }), false);
});

test('persists an allowed event and treats retries as idempotent', async () => {
  const store = createMemoryStore();
  const body = event();
  const signature = await sign(body);
  const firstRequest = new Request('https://example.test/webhooks/paddle', {
    method: 'POST',
    headers: { 'paddle-signature': signature },
    body,
  });
  const first = await handlePaddleWebhook(firstRequest, { secret: SECRET, store, now: () => NOW });
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { accepted: true, duplicate: false, event_id: 'evt_001' });
  const second = await handlePaddleWebhook(
    new Request('https://example.test/webhooks/paddle', {
      method: 'POST',
      headers: { 'paddle-signature': signature },
      body,
    }),
    { secret: SECRET, store, now: () => NOW },
  );
  assert.equal(second.status, 200);
  assert.deepEqual(await second.json(), { accepted: true, duplicate: true, event_id: 'evt_001' });
  assert.equal(store.records.size, 1);
});

test('acknowledges valid but unsupported event types without writing them', async () => {
  const store = createMemoryStore();
  const body = event('subscription.created', 'evt_subscription');
  const response = await handlePaddleWebhook(
    new Request('https://example.test/webhooks/paddle', {
      method: 'POST',
      headers: { 'paddle-signature': await sign(body) },
      body,
    }),
    { secret: SECRET, store, now: () => NOW },
  );
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), {
    accepted: false,
    ignored: true,
    event_type: 'subscription.created',
  });
  assert.equal(store.records.size, 0);
});

test('rejects invalid signatures before touching storage', async () => {
  const store = createMemoryStore();
  const response = await handlePaddleWebhook(
    new Request('https://example.test/webhooks/paddle', {
      method: 'POST',
      headers: { 'paddle-signature': 'ts=178;h1=bad' },
      body: event(),
    }),
    { secret: SECRET, store, now: () => NOW },
  );
  assert.equal(response.status, 401);
  assert.equal(store.records.size, 0);
});

test('D1 adapter claims a key using INSERT OR IGNORE', async () => {
  const calls = [];
  const db = {
    prepare(sql) {
      calls.push({ sql });
      return {
        bind(...values) {
          calls.at(-1).values = values;
          return { async run() { return { meta: { changes: 1 } }; } };
        },
      };
    },
  };
  const claimed = await createD1Store(db).claim('paddle:evt_001', {
    eventId: 'evt_001',
    eventType: 'transaction.completed',
    occurredAt: '2026-09-26T00:00:00Z',
    receivedAt: '2026-09-26T00:00:01Z',
    payload: '{}',
  });
  assert.equal(claimed, true);
  assert.match(calls[0].sql, /INSERT OR IGNORE/);
  assert.equal(calls[0].values[0], 'paddle:evt_001');
});

test('worker exposes health and requires webhook secret', async () => {
  const health = await worker.fetch(new Request('https://example.test/health'));
  assert.equal(health.status, 200);
  const response = await worker.fetch(
    new Request('https://example.test/webhooks/paddle', { method: 'POST', body: '{}' }),
    {},
  );
  assert.equal(response.status, 503);
});
