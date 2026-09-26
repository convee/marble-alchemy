import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, parseInput } from './analyze-events.mjs';

test('builds a funnel and replay report from event records', () => {
  const report = analyze([
    { name: 'page_view', session_id: 'a', ts: '2026-09-01T00:00:00Z', utm_source: 'x' },
    { name: 'game_start', session_id: 'a', ts: '2026-09-01T00:01:00Z', utm_source: 'x' },
    { name: 'run_restart', session_id: 'a', ts: '2026-09-01T00:04:00Z', utm_source: 'x' },
    { name: 'run_won', session_id: 'a', ts: '2026-09-02T00:01:00Z', utm_source: 'x' },
    { name: 'page_view', session_id: 'b', ts: '2026-09-01T00:00:00Z' },
    { name: 'game_start', session_id: 'b', ts: '2026-09-01T00:01:00Z' },
  ]);

  assert.equal(report.sessions, 2);
  assert.equal(report.funnel.page_views, 2);
  assert.equal(report.funnel.game_start_sessions, 2);
  assert.equal(report.funnel.replay_sessions, 1);
  assert.equal(report.funnel.replay_rate, 0.5);
  assert.deepEqual(report.attribution.x, { page_views: 1, sessions: 1 });
  assert.equal(report.breakdown_by_game['(unattributed)/(all)'].sessions, 2);
});

test('breaks down game and variant telemetry without losing legacy app data', () => {
  const report = analyze([
    { name: 'page_view', session_id: 'gpt', ts: '2026-09-01T00:00:00Z', props: { game_id: 'marble-alchemy', variant: 'gpt6' } },
    { name: 'game_start', session_id: 'gpt', ts: '2026-09-01T00:01:00Z', props: { app: 'gpt6' } },
    { name: 'run_complete', session_id: 'gpt', ts: '2026-09-01T00:02:00Z', props: { game_id: 'marble-alchemy', variant: 'gpt6' } },
  ]);
  assert.equal(report.breakdown_by_game['marble-alchemy/gpt6'].funnel.completed_sessions, 1);
});

test('keeps a mixed visitor split across variants instead of using the first session identity', () => {
  const report = analyze([
    { name: 'page_view', session_id: 'mixed', ts: '2026-09-01T00:00:00Z', props: { app: 'landing' } },
    { name: 'game_start', session_id: 'mixed', ts: '2026-09-01T00:01:00Z', props: { app: 'gpt6' } },
    { name: 'page_view', session_id: 'mixed', ts: '2026-09-01T00:02:00Z', props: { app: 'landing' } },
    { name: 'game_start', session_id: 'mixed', ts: '2026-09-01T00:03:00Z', props: { app: 'fable5.1' } },
    { name: 'run_complete', session_id: 'mixed', ts: '2026-09-01T00:04:00Z', props: { app: 'fable5.1' } },
  ]);

  assert.equal(report.breakdown_by_game['(unattributed)/(all)'].funnel.page_views, 2);
  assert.equal(report.breakdown_by_game['marble-alchemy/gpt6'].funnel.game_start_sessions, 1);
  assert.equal(report.breakdown_by_game['marble-alchemy/fable5.1'].funnel.game_start_sessions, 1);
  assert.equal(report.breakdown_by_game['marble-alchemy/fable5.1'].funnel.completed_sessions, 1);
  assert.equal(report.breakdown_by_game['marble-alchemy/gpt6'].funnel.page_views, 0);
});

test('accepts NDJSON-compatible alternate event keys', () => {
  const report = analyze([
    { event: 'page_view', sessionId: 'one', timestamp: '2026-09-01T00:00:00Z' },
    { event: 'game_start', sessionId: 'one', timestamp: '2026-09-01T00:01:00Z' },
  ]);
  assert.equal(report.funnel.start_rate, 1);
});

test('accepts Cloudflare D1 result exports', () => {
  const report = analyze(parseInput(JSON.stringify([
    {
      results: [
        { name: 'page_view', session_id: 'd1', occurred_at: '2026-09-01T00:00:00Z' },
        { name: 'game_start', session_id: 'd1', occurred_at: '2026-09-01T00:01:00Z' },
      ],
    },
  ])));
  assert.equal(report.sessions, 1);
  assert.equal(report.funnel.start_rate, 1);
});

test('reads props from D1 payload JSON strings', () => {
  const report = analyze(parseInput(JSON.stringify([
    {
      results: [
        {
          name: 'game_start',
          session_id: 'd1-game',
          occurred_at: '2026-09-01T00:00:00Z',
          payload: JSON.stringify({ props: { app: 'gpt6', game_id: 'marble-alchemy', variant: 'gpt6' } }),
        },
      ],
    },
  ])));
  assert.equal(report.breakdown_by_game['marble-alchemy/gpt6'].events, 1);
});
