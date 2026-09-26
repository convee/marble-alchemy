type Value = string | number | boolean;
type EventRecord = {
  name: string;
  props: Record<string, Value>;
  ts: string;
  path: string;
  session_id: string;
  utm_source?: string;
  utm_campaign?: string;
  utm_content?: string;
};

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

function queued(): EventRecord[] {
  try {
    const current = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
    return Array.isArray(current) ? (current as EventRecord[]) : [];
  } catch {
    return [];
  }
}

function send(event: EventRecord): boolean {
  if (!endpoint) return false;
  const body = JSON.stringify(event);
  try {
    // Keep the Beacon request CORS-simple. The Worker parses JSON from the body
    // regardless of the content type, while application/json can trigger a
    // preflight that some browsers do not complete for Beacon requests.
    const sent = navigator.sendBeacon?.(
      endpoint,
      new Blob([body], { type: "text/plain;charset=UTF-8" }),
    );
    if (sent) return true;
    void fetch(endpoint, {
      method: "POST",
      body,
      keepalive: true,
    });
    return true;
  } catch {
    return false;
  }
}

function flushQueue(): void {
  if (!endpoint) return;
  const pending = queued();
  if (!pending.length) return;
  const unsent = pending.filter((event) => !send(event));
  try {
    if (unsent.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(unsent));
    else localStorage.removeItem(QUEUE_KEY);
  } catch {
    // Storage can be disabled by privacy mode; gameplay must continue.
  }
}

function attribution(): Pick<
  EventRecord,
  "utm_source" | "utm_campaign" | "utm_content"
> {
  try {
    const query = new URLSearchParams(location.search);
    const value = (key: string) => query.get(key)?.trim().slice(0, 80) || undefined;
    return {
      utm_source: value("utm_source"),
      utm_campaign: value("utm_campaign"),
      utm_content: value("utm_content"),
    };
  } catch {
    return {};
  }
}

export function track(name: string, props: Record<string, Value> = {}): void {
  const event: EventRecord = {
    name,
    props,
    ts: new Date().toISOString(),
    path: location.pathname,
    session_id: sessionId(),
    ...attribution(),
  };
  if (!endpoint) {
    queue(event);
    return;
  }
  if (!send(event)) queue(event);
}

if (endpoint) flushQueue();
