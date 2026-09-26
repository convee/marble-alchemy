/*
 * Kids Games AI companion
 *
 * The browser never receives a model key. When KIDS_AI_ENDPOINT is configured
 * it sends a small, child-safe game state payload to the proxy. If the proxy is
 * unavailable the same UI falls back to deterministic, offline coaching.
 */
(function () {
  'use strict';

  var meta = document.querySelector('meta[name="kids-game"]');
  var endpointMeta = document.querySelector('meta[name="kids-ai-endpoint"]');
  var game = {
    id: meta ? (meta.getAttribute('content') || 'kids-game') : 'kids-game',
    name: meta ? ((window.KidsLocale && window.KidsLocale.english && meta.getAttribute('data-name-en')) || meta.getAttribute('data-name') || document.title) : document.title,
    icon: meta ? (meta.getAttribute('data-icon') || '✨') : '✨'
  };
  var config = window.KIDS_AI_CONFIG || {};
  var endpoint = config.endpoint || (endpointMeta && endpointMeta.content) || window.KIDS_AI_ENDPOINT || '';
  var MODEL = 'glm-5.3-flash';
  var english = window.KidsLocale && window.KidsLocale.english;
  var STORE = 'kids-games-ai-profile-v1';
  var today = new Date().toISOString().slice(0, 10);
  var state = readState();
  var context = {};
  var panel;
  var message;
  var status;
  var stats;
  var quest;
  var busy = false;

  function readState() {
    var value = {};
    try { value = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) {}
    var previous = value.lastPlayed || '';
    if (previous !== today) {
      var delta = previous ? Math.round((Date.parse(today) - Date.parse(previous)) / 86400000) : 0;
      if (delta > 1) value.streak = 0;
      value.lastPlayed = today;
      value.sessions = value.sessions || 0;
      value.stars = value.stars || 0;
      value.todayQuest = makeQuest(game.id);
      value.questProgress = 0;
      persist(value);
    }
    value.streak = value.streak || 0;
    value.sessions = value.sessions || 0;
    value.stars = value.stars || 0;
    value.questProgress = value.questProgress || 0;
    value.todayQuest = value.todayQuest || makeQuest(game.id);
    return value;
  }

  function persist(value) {
    try { localStorage.setItem(STORE, JSON.stringify(value)); } catch (e) {}
  }

  function makeQuest(id) {
    var quests = {
      'sweet-adventure': '收集 8 颗糖果，找到彩虹门。',
      'mxq-history': '答对 3 道题，把一个时代放进图鉴。',
      'mxq-school': '完成 2 个校园场景，写下一句日记。',
      'block-park': '放置 6 个方块，造一个自己的小角落。',
      'mxq-platform': '安全通过 1 个关卡，收集 3 本课本。',
      'sweet-match': '完成 2 次四连消除，获得一颗星。'
    };
    return quests[id] || '玩一局并告诉 AI 你最喜欢的部分。';
  }

  function questText() {
    if (!english) return state.todayQuest;
    var quests = {
      'sweet-adventure': 'Collect 8 treats and find the rainbow gate.',
      'mxq-history': 'Answer 3 questions and add an era to your collection.',
      'mxq-school': 'Finish 2 school scenes and write one diary line.',
      'block-park': 'Place 6 blocks to build your own little corner.',
      'mxq-platform': 'Clear one level and collect 3 school books.',
      'sweet-match': 'Make 2 four-matches and earn an encouragement star.'
    };
    return quests[game.id] || 'Play one round and tell AI what you liked most.';
  }

  function event(type, data) {
    data = data || {};
    context = safeContext(Object.assign({}, context, data));
    if (type === 'round_start') {
      state.sessions += 1;
      state.streak = Math.max(1, state.streak);
    }
    if (type === 'round_complete') {
      state.stars += Math.max(0, Number(data.stars || 1));
      state.questProgress = Math.min(100, state.questProgress + 34);
    }
    if (type === 'progress') state.questProgress = Math.min(100, state.questProgress + 16);
    persist(state);
    renderStats();
    try {
      window.dispatchEvent(new CustomEvent('kids-analytics', { detail: {
        event: type, game_id: game.id, model: MODEL, state: safeContext(data)
      }}));
    } catch (e) {}
  }

  function safeContext(data) {
    var clean = {};
    Object.keys(data || {}).slice(0, 12).forEach(function (key) {
      var value = data[key];
      if (typeof value === 'string') clean[key] = value.slice(0, 120);
      else if (typeof value === 'number' || typeof value === 'boolean') clean[key] = value;
    });
    return clean;
  }

  function fallback(action) {
    if (english) {
      var en = {
        hint: {
          'sweet-adventure': 'Watch the color and distance ahead. A short jump is safer than tapping too fast.',
          'mxq-history': 'Circle the time, person, and place in the question, then remove the choices that do not fit.',
          'mxq-school': 'Finish the small task in front of you, then see who needs a little help.',
          'block-park': 'Lay a flat floor first, then use colors for doors and windows.',
          'mxq-platform': 'Check the platform edge before jumping. Save the double jump for a tricky moment.',
          'sweet-match': 'Look for a swap that makes four in a row. Special candy helps you reach the goal.'
        },
      quest: { all: "Today's quest: " + questText() + ' Come back for an encouragement star when you finish.' },
        cheer: { all: 'You are practicing observation and persistence. Every try makes the next round smarter!' }
      };
      return (en[action] && (en[action][game.id] || en[action].all)) || en.cheer.all;
    }
    var messages = {
      hint: {
        'sweet-adventure': '先观察前方的颜色和距离，短跳比连续猛点更稳。看到护盾时先留住，它能帮你冲过难点。',
        'mxq-history': '把题目里的时间、人物和地点圈出来，再排除明显不符合时代的选项。',
        'mxq-school': '先完成眼前的小任务，再看看下一位同学需要什么帮助。',
        'block-park': '先铺一块平地，再用不同颜色做门窗；小动物喜欢有空隙的院子。',
        'mxq-platform': '起跳前看清平台边缘，二段跳留到真正需要时再用。',
        'sweet-match': '先找能制造四连的交换，特殊糖比单次消除更容易完成目标。'
      },
      quest: { all: '今日任务：' + state.todayQuest + ' 完成后记得回来领取一颗鼓励星。' },
      cheer: { all: '你已经在练习观察和坚持了！每次尝试都会让下一局更聪明。' }
    };
    return (messages[action] && (messages[action][game.id] || messages[action].all)) || messages.cheer.all;
  }

  function request(action) {
    var payload = {
      model: MODEL,
      language: english ? 'en' : 'zh-CN',
      game: { id: game.id, name: game.name },
      action: action,
      context: safeContext(Object.assign({}, context, {
        streak: state.streak, sessions: state.sessions, quest: questText(),
        quest_progress: state.questProgress
      })),
      safety: { audience: 'children', max_chars: 120, no_personal_data: true }
    };
    if (!endpoint) return Promise.resolve({ text: fallback(action), cloud: false });
    var controller = window.AbortController ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 4200) : null;
    return fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: controller && controller.signal
    }).then(function (response) {
      if (!response.ok) throw new Error('AI proxy ' + response.status);
      return response.json();
    }).then(function (data) {
      var text = data.reply || (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content);
      if (!text) throw new Error('empty AI reply');
      return { text: String(text).replace(/^\s+|\s+$/g, '').slice(0, 220), cloud: true };
    }).catch(function () {
      return { text: fallback(action), cloud: false };
    }).then(function (result) {
      if (timer) clearTimeout(timer);
      return result;
    });
  }

  function renderStats() {
    if (!stats) return;
    stats.innerHTML = '<div class="kids-ai-stat"><b>' + state.streak + '</b><span>连续天数</span></div>' +
      '<div class="kids-ai-stat"><b>' + state.stars + '</b><span>鼓励星</span></div>' +
      '<div class="kids-ai-stat"><b>' + state.sessions + '</b><span>游玩次数</span></div>';
    if (quest) quest.innerHTML = '<b>' + (english ? "Today's quest" : '今日小任务') + '</b><br>' + questText() + '<br><span>' + (english ? 'Progress ' : '进度 ') + state.questProgress + '%</span>';
  }

  function ask(action) {
    if (busy) return;
    busy = true;
    message.classList.add('is-loading');
    message.textContent = 'AI 小伙伴正在想一个适合你的办法…';
    document.querySelectorAll('.kids-ai-action').forEach(function (button) { button.disabled = true; });
    request(action).then(function (result) {
      message.classList.remove('is-loading');
      message.textContent = result.text;
      status.textContent = result.cloud ? (english ? 'GLM-5.3 Flash cloud companion connected' : 'GLM-5.3 Flash 云端陪玩已连接') : (english ? 'Offline safe mode · still playable' : '离线安全模式 · 仍可继续玩');
      event('ai_coach', { action: action, cloud: result.cloud });
    }).finally(function () {
      busy = false;
      document.querySelectorAll('.kids-ai-action').forEach(function (button) { button.disabled = false; });
    });
  }

  function toggle(open) {
    if (!panel) return;
    panel.hidden = typeof open === 'boolean' ? !open : !panel.hidden;
    if (!panel.hidden) event('ai_open');
  }

  function build() {
    var launcher = document.createElement('button');
    launcher.className = 'kids-ai-launcher'; launcher.type = 'button';
    launcher.innerHTML = '<span class="kids-ai-face">🤖</span>AI 小伙伴';
    launcher.setAttribute('aria-label', english ? 'Open AI Companion' : '打开 AI 小伙伴');
    document.body.appendChild(launcher);
    if (window.KidsLocale) window.KidsLocale.translate(launcher);
    panel = document.createElement('section'); panel.className = 'kids-ai-panel'; panel.hidden = true;
    panel.setAttribute('aria-label', 'AI 小伙伴');
    panel.innerHTML = '<div class="kids-ai-head"><div class="kids-ai-avatar">🤖</div><div class="kids-ai-title"><strong>AI 小伙伴</strong><small id="kids-ai-status">' + (english ? 'Offline safe mode · still playable' : 'GLM-5.3 Flash · 可选云端') + '</small></div><button class="kids-ai-close" type="button" aria-label="关闭">×</button></div>' +
      '<div class="kids-ai-stats"></div><div class="kids-ai-message">我会给你小提示、每日任务和鼓励。你可以随时关闭我。</div>' +
      '<div class="kids-ai-actions"><button class="kids-ai-action" data-ai-action="hint" type="button">给个提示</button><button class="kids-ai-action" data-ai-action="quest" type="button">今日任务</button><button class="kids-ai-action" data-ai-action="cheer" type="button">夸夸我</button></div>' +
      '<div class="kids-ai-quest"></div><div class="kids-ai-parent">🔒 只发送游戏状态，不发送姓名、语音或聊天记录。家长可在站点首页查看支持方式。</div>';
    document.body.appendChild(panel);
    message = panel.querySelector('.kids-ai-message'); status = panel.querySelector('#kids-ai-status'); stats = panel.querySelector('.kids-ai-stats'); quest = panel.querySelector('.kids-ai-quest');
    launcher.addEventListener('click', function () { toggle(); });
    panel.querySelector('.kids-ai-close').setAttribute('aria-label', english ? 'Close' : '关闭');
    panel.querySelector('.kids-ai-close').addEventListener('click', function () { toggle(false); });
    panel.querySelectorAll('.kids-ai-action').forEach(function (button) { button.addEventListener('click', function () { ask(button.getAttribute('data-ai-action')); }); });
    if (window.KidsLocale) window.KidsLocale.translate(panel);
    renderStats();
    if (new URLSearchParams(location.search).get('quest') === '1') { toggle(true); ask('quest'); }
  }

  document.addEventListener('click', function (ev) {
    var node = ev.target && ev.target.closest ? ev.target.closest('button,a') : null;
    if (!node) return;
    var id = node.id || '';
    if (/^(btnStart|btnGo|startBtn|btnRetry|againBtn)$/.test(id)) event('round_start');
    if (/^(btnNext|btnNextLv|btnNextEra|btnFinish)$/.test(id)) event('progress');
  }, true);
  window.addEventListener('kids-game-event', function (ev) { if (ev.detail) event(ev.detail.type || 'progress', ev.detail); });
  window.KidsAI = {
    model: MODEL, game: game, event: event,
    setContext: function (data) { context = safeContext(Object.assign({}, context, data || {})); },
    reportState: function (data) { context = safeContext(Object.assign({}, context, data || {})); },
    ask: ask, open: function () { toggle(true); }, getState: function () { return state; }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
}());
