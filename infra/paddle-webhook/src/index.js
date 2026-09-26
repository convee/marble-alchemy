const MAX_BODY_BYTES = 256 * 1024;
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

// Keep this list deliberately narrow. Adding a type here means the event is
// persisted and becomes part of the payment ledger contract.
export const ALLOWED_EVENT_TYPES = new Set([
  'transaction.completed',
  'transaction.paid',
  'transaction.billed',
  'transaction.canceled',
  'transaction.payment_failed',
  'transaction.past_due',
  'transaction.updated',
  'adjustment.created',
  'adjustment.updated',
]);

const textEncoder = new TextEncoder();

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

function hex(bytes) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fromHex(value) {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null;
  const bytes = new Uint8Array(32);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function constantTimeEqual(left, right) {
  if (!left || !right || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export function parsePaddleSignature(value) {
  if (typeof value !== 'string') return null;
  const fields = {};
  for (const part of value.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 1) continue;
    const key = part.slice(0, separator).trim();
    const entry = part.slice(separator + 1).trim();
    if (key === 'h1') {
      fields.h1 ??= [];
      fields.h1.push(entry);
    } else if (key === 'ts' && !fields.ts) {
      fields.ts = entry;
    }
  }
  if (!/^\d+$/.test(fields.ts ?? '') || !fields.h1?.length) return null;
  return { timestamp: Number(fields.ts), signatures: fields.h1 };
}

export async function verifyPaddleSignature(
  rawBody,
  signatureHeader,
  secret,
  { now = Date.now(), toleranceSeconds = SIGNATURE_TOLERANCE_SECONDS } = {},
) {
  const parsed = parsePaddleSignature(signatureHeader);
  if (!parsed || typeof secret !== 'string' || !secret) return false;
  const age = Math.abs(Math.floor(now / 1000) - parsed.timestamp);
  if (age > toleranceSeconds) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const expected = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, textEncoder.encode(`${parsed.timestamp}:${rawBody}`)),
  );
  return parsed.signatures.some((candidate) => {
    const actual = fromHex(candidate);
    return actual ? constantTimeEqual(expected, actual) : false;
  });
}

function extractEvent(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const eventType = String(body.event_type ?? '').trim();
  const eventId = String(body.event_id ?? '').trim();
  if (!eventType || !eventId) return null;
  return {
    eventId: eventId.slice(0, 200),
    eventType,
    occurredAt: String(body.occurred_at ?? '').slice(0, 80),
    dataId: String(body.data?.id ?? '').slice(0, 200),
  };
}

function assertStore(store) {
  if (!store || typeof store.claim !== 'function') throw new TypeError('store.claim is required');
  return store;
}

/**
 * A storage adapter only needs one atomic operation. It must return true when
 * the key was newly claimed, and false when the key already exists.
 */
export function createMemoryStore() {
  const records = new Map();
  return {
    records,
    async claim(key, record) {
      if (records.has(key)) return false;
      records.set(key, record);
      return true;
    },
  };
}

export function createD1Store(db, { table = 'paddle_webhook_events' } = {}) {
  if (!db || typeof db.prepare !== 'function' || !/^[a-z_][a-z0-9_]*$/i.test(table)) {
    throw new TypeError('a D1 database and safe table name are required');
  }
  return {
    async claim(key, record) {
      const result = await db
        .prepare(
          `INSERT OR IGNORE INTO ${table}
           (idempotency_key, event_id, event_type, occurred_at, received_at, payload)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          key,
          record.eventId,
          record.eventType,
          record.occurredAt,
          record.receivedAt,
          record.payload,
        )
        .run();
      return Number(result?.meta?.changes ?? 0) === 1;
    },
  };
}

export async function handlePaddleWebhook(
  request,
  { secret, store, now = () => Date.now(), maxBodyBytes = MAX_BODY_BYTES } = {},
) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!secret) return json({ error: 'webhook_not_configured' }, 503);
  let rawBody;
  try {
    rawBody = await request.text();
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }
  if (new TextEncoder().encode(rawBody).byteLength > maxBodyBytes) {
    return json({ error: 'payload_too_large' }, 413);
  }
  const validSignature = await verifyPaddleSignature(
    rawBody,
    request.headers.get('paddle-signature'),
    secret,
    { now: now() },
  );
  if (!validSignature) return json({ error: 'invalid_signature' }, 401);

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const event = extractEvent(body);
  if (!event) return json({ error: 'invalid_event' }, 400);
  // A valid but unsupported notification is acknowledged so Paddle does not
  // retry it forever. It is intentionally not written to the payment ledger.
  if (!ALLOWED_EVENT_TYPES.has(event.eventType)) {
    return json({ accepted: false, ignored: true, event_type: event.eventType }, 202);
  }

  let storage;
  try {
    storage = assertStore(store);
    const idempotencyKey = `paddle:${event.eventId}`;
    const claimed = await storage.claim(idempotencyKey, {
      idempotencyKey,
      eventId: event.eventId,
      eventType: event.eventType,
      occurredAt: event.occurredAt,
      receivedAt: new Date(now()).toISOString(),
      payload: rawBody,
    });
    return json({ accepted: true, duplicate: !claimed, event_id: event.eventId });
  } catch {
    return json({ error: 'storage_unavailable' }, 503);
  }
}

const worker = {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') return json({ ok: true });
    if (url.pathname !== '/webhooks/paddle') return json({ error: 'not_found' }, 404);
    const store = env.STORE ?? (env.DB ? createD1Store(env.DB) : null);
    return handlePaddleWebhook(request, { secret: env.PADDLE_WEBHOOK_SECRET, store });
  },
};

export default worker;
