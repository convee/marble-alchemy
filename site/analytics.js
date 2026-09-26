(function () {
  const ENDPOINT = 'https://chaoschemy-analytics.convee-cn.workers.dev/events';
  const SESSION_KEY = 'chaoschemy:landing-session:v1';

  function sessionId() {
    try {
      const existing = localStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      const value = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, value);
      return value;
    } catch {
      return `landing-${Date.now()}`;
    }
  }

  function attribution() {
    const query = new URLSearchParams(location.search);
    const read = (key) => query.get(key)?.trim().slice(0, 80) || undefined;
    return { utm_source: read('utm_source'), utm_campaign: read('utm_campaign'), utm_content: read('utm_content') };
  }

  function track(name, props) {
    const event = { name, props: { app: 'landing', ...props }, ts: new Date().toISOString(), path: location.pathname, session_id: sessionId(), ...attribution() };
    try {
      const body = new Blob([JSON.stringify(event)], { type: 'text/plain;charset=UTF-8' });
      if (navigator.sendBeacon?.(ENDPOINT, body)) return;
      void fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(event), keepalive: true });
    } catch {
      // Analytics must never block the landing page.
    }
  }

  track('page_view');
  track('landing_view');
  window.addEventListener('chaoschemy:paddle-event', (event) => {
    const name = event.detail?.name;
    if (typeof name === 'string' && name) track('paddle_checkout_event', { event: name });
  });
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-track]') : null;
    if (target) {
      const props = { target: target.dataset.track };
      if (target.dataset.gameId) props.game_id = target.dataset.gameId;
      if (target.dataset.variant) props.variant = target.dataset.variant;
      track('cta_click', props);
    }
  });
})();
