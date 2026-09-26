import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';

function fakeDb() {
  const rows = [];
  return {
    rows,
    prepare(sql) {
      return {
        bind(...values) {
          return { sql, values };
        },
      };
    },
    async batch(statements) {
      rows.push(...statements);
    },
  };
}

test('health endpoint is public and storage-free', async () => {
  const response = await worker.fetch(new Request('https://analytics.example/health'), {});
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test('accepts only known anonymous events and writes a D1 batch', async () => {
  const DB = fakeDb();
  const response = await worker.fetch(
    new Request('https://analytics.example/events', {
      method: 'POST',
      headers: { origin: 'https://chaoschemy.com', 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'game_start',
        props: { app: 'gpt6' },
        ts: '2026-09-26T00:00:00Z',
        path: '/gpt6/',
        session_id: 'test-session',
      }),
    }),
    { DB },
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { accepted: 1 });
  assert.equal(DB.rows.length, 1);
  assert.equal(DB.rows[0].values[0], 'game_start');
});

test('accepts the AI challenge loop events', async () => {
  const DB = fakeDb();
  const response = await worker.fetch(
    new Request('https://analytics.example/events', {
      method: 'POST',
      headers: { origin: 'https://chaoschemy.com', 'content-type': 'application/json' },
      body: JSON.stringify([
        {
          name: 'ai_challenge_loaded',
          props: { app: 'gpt6', challenge: 'daily_one', source: 'model' },
          ts: '2026-09-26T00:00:00Z',
          path: '/gpt6/',
          session_id: 'ai-session',
        },
        {
          name: 'daily_challenge_completed',
          props: { app: 'gpt6', challenge: 'daily_one', streak: 1 },
          ts: '2026-09-26T00:01:00Z',
          path: '/gpt6/',
          session_id: 'ai-session',
        },
      ]),
    }),
    { DB },
  );
  assert.deepEqual(await response.json(), { accepted: 2 });
  assert.deepEqual(DB.rows.map((row) => row.values[0]), [
    'ai_challenge_loaded',
    'daily_challenge_completed',
  ]);
});

test('accepts attributable landing-page calls to action', async () => {
  const DB = fakeDb();
  const response = await worker.fetch(
    new Request('https://analytics.example/events', {
      method: 'POST',
      headers: { origin: 'https://chaoschemy.com', 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'cta_click',
        props: { app: 'landing', target: 'gpt6' },
        ts: '2026-09-26T00:00:00Z',
        path: '/',
        session_id: 'landing-session',
        utm_source: 'x',
        utm_campaign: 'ai_director_launch',
        utm_content: 'gpt6',
      }),
    }),
    { DB },
  );
  assert.deepEqual(await response.json(), { accepted: 1 });
  assert.equal(DB.rows[0].values[0], 'cta_click');
  assert.equal(DB.rows[0].values[5], 'x');
  assert.equal(DB.rows[0].values[7], 'gpt6');
});

test('accepts anonymous Paddle checkout lifecycle events', async () => {
  const DB = fakeDb();
  const response = await worker.fetch(
    new Request('https://analytics.example/events', {
      method: 'POST',
      headers: { origin: 'https://chaoschemy.com', 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'paddle_checkout_event',
        props: { app: 'landing', event: 'checkout.completed' },
        ts: '2026-09-26T00:02:00Z',
        path: '/',
        session_id: 'payment-session',
      }),
    }),
    { DB },
  );
  assert.deepEqual(await response.json(), { accepted: 1 });
  assert.equal(DB.rows[0].values[0], 'paddle_checkout_event');
});

test('accepts anonymous Kids Game Garden AI events', async () => {
  const DB = fakeDb();
  const response = await worker.fetch(
    new Request('https://analytics.example/events', {
      method: 'POST',
      headers: { origin: 'https://chaoschemy.com', 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'kids_ai_coach',
        props: { app: 'kids-games', game_id: 'sweet-match', cloud: false },
        ts: '2026-09-26T00:02:00Z',
        path: '/kids-games/sweet-match/',
        session_id: 'kids-session',
      }),
    }),
    { DB },
  );
  assert.deepEqual(await response.json(), { accepted: 1 });
  assert.equal(DB.rows[0].values[0], 'kids_ai_coach');
  assert.equal(DB.rows[0].values[4], 'kids-games');
});

test('rejects another origin before touching storage', async () => {
  const DB = fakeDb();
  const response = await worker.fetch(
    new Request('https://analytics.example/events', {
      method: 'POST',
      headers: { origin: 'https://evil.example' },
      body: '{}',
    }),
    { DB },
  );
  assert.equal(response.status, 403);
  assert.equal(DB.rows.length, 0);
});
