(function () {
  'use strict';

  var ENDPOINT = 'https://chaoschemy-analytics.convee-cn.workers.dev/events';
  var SESSION_KEY = 'chaoschemy:kids-session:v1';
  var meta = document.querySelector('meta[name="kids-game"]');
  var gameId = meta ? (meta.getAttribute('content') || 'kids-games') : 'kids-games';
  var app = 'kids-games';
  var eventMap = {
    round_start: 'game_start',
    round_complete: 'run_complete',
    round_fail: 'run_lost',
    progress: 'level_complete',
    ai_open: 'cta_click',
    ai_coach: 'kids_ai_coach'
  };

  function sessionId() {
    try {
      var existing = localStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      var value = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, value);
      return value;
    } catch (e) {
      return 'kids-' + Date.now();
    }
  }

  function attribution() {
    var query = new URLSearchParams(location.search);
    function read(key) {
      var value = query.get(key);
      return value ? value.trim().slice(0, 80) : undefined;
    }
    return {
      utm_source: read('utm_source'),
      utm_campaign: read('utm_campaign'),
      utm_content: read('utm_content')
    };
  }

  function safeProps(value) {
    var props = { app: app, game_id: gameId };
    Object.keys(value || {}).slice(0, 16).forEach(function (key) {
      var item = value[key];
      if (typeof item === 'string') props[key] = item.slice(0, 120);
      else if (typeof item === 'number' || typeof item === 'boolean') props[key] = item;
    });
    return props;
  }

  function track(name, props) {
    var event = {
      name: name,
      props: safeProps(props),
      ts: new Date().toISOString(),
      path: location.pathname,
      session_id: sessionId()
    };
    Object.assign(event, attribution());
    try {
      var body = new Blob([JSON.stringify(event)], { type: 'text/plain;charset=UTF-8' });
      if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, body)) return;
      void fetch(ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(event),
        keepalive: true
      });
    } catch (e) {}
  }

  track('page_view');
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target.closest('[data-track]') : null;
    if (!target) return;
    track('cta_click', {
      target: target.getAttribute('data-track'),
      variant: target.getAttribute('data-variant') || undefined
    });
  });
  window.addEventListener('kids-analytics', function (event) {
    var detail = event.detail || {};
    var original = String(detail.event || '').slice(0, 40);
    var state = detail.state && typeof detail.state === 'object' ? detail.state : {};
    var props = safeProps(Object.assign({}, state, {
      event_type: original,
      model: detail.model,
      action: detail.action,
      cloud: detail.cloud
    }));
    if (original === 'ai_open') props.target = 'kids_ai_open';
    track(eventMap[original] || original, props);
  });
}());
