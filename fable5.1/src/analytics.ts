type Value = string | number | boolean;

const QUEUE_KEY = "chaoschemy:analytics:v1";
const SESSION_KEY = "chaoschemy:session:v1";
const endpoint = (
  import.meta.env.VITE_ANALYTICS_ENDPOINT as string | undefined
)?.trim();

function sessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next =
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return "ephemeral";
  }
}

function queue(event: unknown): void {
  try {
    const current = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
    const next = Array.isArray(current)
      ? [...current.slice(-99), event]
      : [event];
    localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be disabled by privacy mode; gameplay must continue.
  }
}

export function track(name: string, props: Record<string, Value> = {}): void {
  const event = {
    name,
    props,
    ts: new Date().toISOString(),
    path: location.pathname,
    session_id: sessionId(),
  };
  if (!endpoint) {
    queue(event);
    return;
  }
  const body = JSON.stringify(event);
  try {
    const sent = navigator.sendBeacon?.(
      endpoint,
      new Blob([body], { type: "application/json" }),
    );
    if (!sent)
      void fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        keepalive: true,
      });
  } catch {
    queue(event);
  }
}
