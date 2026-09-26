(function () {
  const ENDPOINT = 'https://chaoschemy-analytics.convee-cn.workers.dev/events';
  const SESSION_KEY = 'chaoschemy:session:v1';
  const GAME_PROPS = { app: 'angry-birds', game_id: 'angry-birds', variant: 'matter-js' };

  function sessionId() {
    try {
      const existing = localStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      const value = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, value);
      return value;
    } catch {
      return `angry-birds-${Date.now()}`;
    }
  }

  function attribution() {
    const query = new URLSearchParams(location.search);
    const read = (key) => query.get(key)?.trim().slice(0, 80) || undefined;
    return { utm_source: read('utm_source'), utm_campaign: read('utm_campaign'), utm_content: read('utm_content') };
  }

  function send(event) {
    const body = JSON.stringify(event);
    try {
      const beacon = navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'text/plain;charset=UTF-8' }));
      if (beacon) return;
      void fetch(ENDPOINT, { method: 'POST', body, keepalive: true });
    } catch {
      // Analytics must never block a playable session.
    }
  }

  function track(name, props = {}) {
    send({ name, props: { ...GAME_PROPS, ...props }, ts: new Date().toISOString(), path: location.pathname, session_id: sessionId(), ...attribution() });
  }

  track('page_view');
  track('game_ready');
  window.chaoschemyTrack = track;
})();
