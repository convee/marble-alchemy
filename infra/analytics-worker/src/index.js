const ORIGIN = 'https://chaoschemy.com';
const MAX_EVENTS = 50;
const MAX_BODY_BYTES = 16 * 1024;
const EVENT_NAMES = new Set([
  'page_view',
  'game_ready',
  'landing_view',
  'game_start',
  'shot_attempt',
  'level_complete',
  'volley_settled',
  'run_complete',
  'run_won',
  'run_lost',
  'upgrade_selected',
  'run_restart',
  'ai_challenge_loaded',
  'ai_rule_triggered',
  'daily_challenge_completed',
  'share_attempt',
  'share_completed',
]);

function headers() {
  return {
    'access-control-allow-origin': ORIGIN,
    'access-control-allow-methods': 'POST,GET,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'cache-control': 'no-store',
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers(), 'content-type': 'application/json; charset=utf-8' },
  });
}

function validEvent(value) {
  if (!value || typeof value !== 'object') return null;
  const name = String(value.name ?? '').trim();
  const sessionId = String(value.session_id ?? '').trim();
  const timestamp = new Date(value.ts ?? NaN);
  if (!EVENT_NAMES.has(name) || !sessionId || Number.isNaN(timestamp.getTime())) return null;
  const props = value.props && typeof value.props === 'object' ? value.props : {};
  return {
    name,
    session_id: sessionId.slice(0, 120),
    occurred_at: timestamp.toISOString(),
    path: String(value.path ?? '').slice(0, 200),
    app: String(props.app ?? '').slice(0, 40),
    utm_source: String(value.utm_source ?? '').slice(0, 80),
    utm_campaign: String(value.utm_campaign ?? '').slice(0, 80),
    payload: JSON.stringify({ props }),
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin');
    if (origin && origin !== ORIGIN) return json({ error: 'origin_not_allowed' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers() });
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') return json({ ok: true });
    if (request.method !== 'POST' || url.pathname !== '/events') return json({ error: 'not_found' }, 404);
    const length = Number(request.headers.get('content-length') ?? 0);
    if (length > MAX_BODY_BYTES) return json({ error: 'payload_too_large' }, 413);
    let input;
    try {
      const body = await request.text();
      if (body.length > MAX_BODY_BYTES) return json({ error: 'payload_too_large' }, 413);
      input = JSON.parse(body);
    } catch {
      return json({ error: 'invalid_json' }, 400);
    }
    const values = Array.isArray(input) ? input.slice(0, MAX_EVENTS) : [input];
    const events = values.map(validEvent).filter(Boolean);
    if (!events.length) return json({ error: 'no_valid_events' }, 400);
    if (!env.DB) return json({ error: 'storage_not_configured' }, 503);
    try {
      await env.DB.batch(
        events.map((event) =>
          env.DB.prepare(
            `INSERT INTO events (name, session_id, occurred_at, path, app, utm_source, utm_campaign, payload)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          ).bind(
            event.name,
            event.session_id,
            event.occurred_at,
            event.path,
            event.app,
            event.utm_source,
            event.utm_campaign,
            event.payload,
          ),
        ),
      );
    } catch {
      return json({ error: 'storage_unavailable' }, 503);
    }
    return json({ accepted: events.length });
  },
};
