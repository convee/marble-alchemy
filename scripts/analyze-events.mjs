#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const REPLAY_EVENTS = new Set(['run_restart']);
const COMPLETION_EVENTS = new Set(['run_complete', 'run_won']);

function usage() {
  console.error('Usage: node scripts/analyze-events.mjs <events.json|events.ndjson> [--pretty]');
  process.exitCode = 2;
}

export function parseInput(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const value = JSON.parse(trimmed);
      if (Array.isArray(value)) {
        // `wrangler d1 execute --json` returns an array of result envelopes.
        // Flatten those envelopes while leaving ordinary event arrays intact.
        return value.flatMap((item) => {
          if (Array.isArray(item?.results)) return item.results;
          if (Array.isArray(item?.result?.results)) return item.result.results;
          return [item];
        });
      }
      if (Array.isArray(value.events)) return value.events;
      if (Array.isArray(value.results)) return value.results;
      if (Array.isArray(value.result?.results)) return value.result.results;
      return [value];
    } catch (error) {
      if (!trimmed.includes('\n')) throw error;
      // Multiple JSON objects are newline-delimited JSON.
    }
  }
  return trimmed
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSON on line ${index + 1}: ${error.message}`);
      }
    });
}

function normalize(value, index) {
  const parseObject = (candidate) => {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) return candidate;
    if (typeof candidate !== 'string' || !candidate.trim()) return {};
    try {
      const parsed = JSON.parse(candidate);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  };
  const directProps = parseObject(value?.props);
  const payload = parseObject(value?.payload);
  const props = Object.keys(directProps).length
    ? directProps
    : parseObject(payload.props);
  const name = String(value?.name ?? value?.event ?? '').trim();
  const sessionId = String(value?.session_id ?? value?.sessionId ?? '').trim();
  const timestamp = new Date(value?.ts ?? value?.timestamp ?? value?.occurred_at ?? NaN);
  if (!name || !sessionId || Number.isNaN(timestamp.getTime())) return null;
  return {
    name,
    props,
    sessionId,
    timestamp,
    source: String(value?.utm_source ?? props.utm_source ?? '').trim() || '(direct)',
    campaign: String(value?.utm_campaign ?? props.utm_campaign ?? '').trim() || '(none)',
    index,
  };
}

const LEGACY_VARIANTS = {
  gpt6: { game_id: 'marble-alchemy', variant: 'gpt6' },
  'fable5.1': { game_id: 'marble-alchemy', variant: 'fable5.1' },
};

function eventIdentity(event) {
  const explicitGameId = String(event.props.game_id ?? event.props.gameId ?? '').trim();
  const explicitVariant = String(event.props.variant ?? '').trim();
  if (explicitGameId) {
    return { game_id: explicitGameId, variant: explicitVariant || '(all)' };
  }
  const legacy = LEGACY_VARIANTS[String(event.props.app ?? '').trim()];
  if (legacy) return legacy;
  return { game_id: '(unattributed)', variant: '(all)' };
}

function utcDay(date) {
  return date.toISOString().slice(0, 10);
}

function ratio(numerator, denominator) {
  return denominator ? Number((numerator / denominator).toFixed(4)) : null;
}

function summarizeScope(events) {
  const byName = Object.fromEntries(
    [...new Set(events.map((event) => event.name))]
      .sort()
      .map((name) => [name, events.filter((event) => event.name === name).length]),
  );
  const sessions = new Map();
  for (const event of events) {
    const current = sessions.get(event.sessionId) ?? [];
    current.push(event);
    sessions.set(event.sessionId, current);
  }
  const started = [...sessions.values()].filter((items) => items.some((event) => event.name === 'game_start'));
  const replayed = started.filter((items) =>
    items.some((event) => REPLAY_EVENTS.has(event.name)) ||
    items.filter((event) => event.name === 'game_start').length > 1,
  );
  const completed = started.filter((items) => items.some((event) => COMPLETION_EVENTS.has(event.name)));
  return {
    events: events.length,
    sessions: sessions.size,
    event_counts: byName,
    funnel: {
      page_views: byName.page_view ?? 0,
      game_start_sessions: started.length,
      start_rate: ratio(started.length, byName.page_view ?? 0),
      completed_sessions: completed.length,
      completion_rate: ratio(completed.length, started.length),
      replay_sessions: replayed.length,
      replay_rate: ratio(replayed.length, started.length),
    },
  };
}

export function analyze(values) {
  const events = values.map(normalize).filter(Boolean).sort((a, b) => a.timestamp - b.timestamp);
  const summary = summarizeScope(events);
  const sessions = new Map();
  for (const event of events) {
    const current = sessions.get(event.sessionId) ?? [];
    current.push(event);
    sessions.set(event.sessionId, current);
  }
  const firstDay = new Map(
    [...sessions].map(([id, items]) => [id, utcDay(items[0].timestamp)]),
  );
  const retention = (days) => {
    const eligible = [...sessions].filter(([, items]) => {
      const age = (Date.now() - items[0].timestamp.getTime()) / 86_400_000;
      return age >= days;
    });
    const retained = eligible.filter(([, items]) => {
      const start = items[0].timestamp.getTime();
      return items.some((event) => (event.timestamp.getTime() - start) / 86_400_000 >= days);
    });
    return { eligible: eligible.length, retained: retained.length, rate: ratio(retained.length, eligible.length) };
  };
  const attribution = {};
  for (const event of events.filter((item) => item.name === 'page_view')) {
    attribution[event.source] ??= { page_views: 0, sessions: new Set() };
    attribution[event.source].page_views += 1;
    attribution[event.source].sessions.add(event.sessionId);
  }
  const attributionSummary = Object.fromEntries(
    Object.entries(attribution)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([source, value]) => [source, { page_views: value.page_views, sessions: value.sessions.size }]),
  );
  const gameGroups = new Map();
  for (const event of events) {
    const identity = eventIdentity(event);
    const key = `${identity.game_id}/${identity.variant}`;
    const current = gameGroups.get(key) ?? { ...identity, events: [] };
    current.events.push(event);
    gameGroups.set(key, current);
  }
  const breakdownByGame = Object.fromEntries(
    [...gameGroups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, group]) => [key, { game_id: group.game_id, variant: group.variant, ...summarizeScope(group.events) }]),
  );
  return {
    generated_at: new Date().toISOString(),
    ...summary,
    attribution: attributionSummary,
    breakdown_by_game: breakdownByGame,
    cohort_days: {
      first_seen_utc_days: [...new Set(firstDay.values())].sort(),
      d1: retention(1),
      d7: retention(7),
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) {
    usage();
  } else {
    try {
      const values = parseInput(await readFile(file, 'utf8'));
      const report = analyze(values);
      console.log(JSON.stringify(report, null, process.argv.includes('--pretty') ? 2 : 0));
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
