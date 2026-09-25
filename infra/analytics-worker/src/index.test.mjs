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

