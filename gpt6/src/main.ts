import Phaser from 'phaser';
import './style.css';
import { AlchemyScene, WIDTH, HEIGHT } from './scene';
import { LEVELS, UPGRADES, type AiChallenge, type UpgradeId } from './game';
import { Synth } from './audio';
import { localTelemetryEnabled, track } from './analytics';
import { debriefFor, effectLabel, loadDailyChallenge } from './ai';
import { completeDailyChallenge, dailyProgress } from './retention';

const star =
  '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M20 3 35 29H5L20 3Z" stroke="currentColor"/><path d="m20 37 15-26H5l15 26Z" stroke="currentColor"/><circle cx="20" cy="20" r="7" stroke="currentColor"/><circle cx="20" cy="20" r="2" fill="currentColor"/></svg>';
const ghost = `<svg viewBox="0 0 240 215" fill="none" aria-hidden="true"><defs><radialGradient id="aura"><stop stop-color="currentColor" stop-opacity=".24"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient><linearGradient id="spirit" x1="85" y1="50" x2="155" y2="175" gradientUnits="userSpaceOnUse"><stop stop-color="#e7ddff"/><stop offset=".52" stop-color="currentColor"/><stop offset="1" stop-color="#51416f"/></linearGradient></defs><circle cx="120" cy="107" r="102" fill="url(#aura)"/><g stroke="currentColor" opacity=".23"><ellipse cx="120" cy="125" rx="93" ry="37" transform="rotate(-25 120 125)"/><ellipse cx="120" cy="125" rx="87" ry="33" transform="rotate(25 120 125)"/><circle cx="120" cy="108" r="76" stroke-dasharray="2 9"/></g><g class="ghost-body"><path d="M86 96c-1-24 14-44 34-44 25 0 40 22 36 49-3 21 6 34 13 49-13-1-20-5-27-12-1 18-9 29-17 36-3-13-9-18-17-22-6 10-17 14-29 14 11-20 10-28 5-42-3-10-1-20 2-28Z" fill="url(#spirit)"/><path d="M97 83c0-9 6-17 15-20" stroke="white" stroke-opacity=".7" stroke-width="3" stroke-linecap="round"/><path d="m100 105 12 3m16 0 12-3" stroke="#252137" stroke-width="5" stroke-linecap="round"/><ellipse cx="121" cy="123" rx="5" ry="7" fill="#35264e"/><path d="m76 47 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Zm103 56 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="currentColor"/></g><ellipse cx="120" cy="194" rx="38" ry="5" fill="currentColor" opacity=".13"/></svg>`;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div class="app-shell">
  <header class="topbar">
    <a class="brand" href="./" aria-label="Marble Alchemy home"><span class="brand-mark">${star}</span><span><strong>Marble Alchemy</strong><small>MARBLE ALCHEMY</small></span></a>
    <div class="edition"><span></span> INDEPENDENT LAB <b>VOL. 01</b></div>
    <nav class="controls" aria-label="Game controls"><button id="help" class="quiet"><span>?</span><i>How to play</i></button><button id="sound" class="quiet" aria-label="Mute sound"></button><button id="pause" class="quiet"><span>Ⅱ</span><i>Pause</i></button><button id="restart" class="quiet" aria-label="Restart"><span>↻</span></button></nav>
  </header>
  <main>
    <section class="intro"><div><p class="eyebrow">THE TRANSMUTATION CHAMBER</p><h1>Every collision is <em>alchemy.</em></h1></div><p class="intro-note">The AI Director writes one challenge each day.<br>Answer it across five trials.</p></section>
    <section class="ai-director" aria-labelledby="ai-director-title"><div class="ai-director-badge"><span>✦</span> AI Director</div><div><p class="ai-director-label">TODAY’S ALCHEMY PROTOCOL</p><h2 id="ai-director-title">Waiting for the AI Director…</h2><p id="ai-prophecy">Once loaded, the challenge changes one real rule this run.</p></div><div class="ai-director-status"><span id="ai-effect" class="ai-effect">AI RULE LOADING</span><span id="ai-source" class="ai-streak">MODEL PENDING</span><span id="ai-streak" class="ai-streak">STREAK 0</span></div></section>
    <div class="journey" aria-label="Five-stage progress">${LEVELS.map((l, i) => `<div class="stage" data-stage="${i}"><span class="stage-dot">${i + 1}</span><span>${l.name}</span>${i === 4 ? '<small>Finale</small>' : ''}</div>`).join('')}</div>
    <div class="workbench">
      <aside class="left-column">
        <section class="panel enemy-panel"><div class="panel-label"><span>CURRENT TRIAL</span><span id="level-number">01 / 05</span></div><div id="enemy-art" class="enemy-art">${ghost}<span class="enemy-type" id="enemy-type">WISP · I</span></div><p id="enemy-subtitle" class="micro"></p><h2 id="enemy-name"></h2><p id="enemy-description" class="enemy-description"></p><div class="health-label"><span>Enemy health</span><strong id="enemy-health"></strong></div><div class="health-track"><div id="enemy-health-fill"></div><div id="damage-preview"></div></div><p class="retaliation"><span>⚔</span> Retaliates for <b id="enemy-attack"></b></p></section>
        <section class="panel life-panel"><div class="panel-label"><span>Alchemist health</span><span id="hp-number">5 / 5</span></div><div id="hearts" class="hearts" aria-label="health 5 / 5"></div><p>Protect your last spark.</p></section>
        <div class="lab-note"><span>✧</span><p id="tip">Damage is stored in the alchemy vessel,<br>then released when every marble lands.</p></div>
      </aside>
      <section class="board-panel" aria-label="Marble alchemy board"><div class="board-top"><span><b class="status-dot"></b><span id="phase-label">Ready to launch</span></span><span id="shot-number">EXPERIMENT 001</span></div><div id="game" role="application" aria-label="Board. Aim with the mouse and click to launch; drag on touch and release; or use arrow keys and Space." tabindex="0"></div><div class="board-bottom"><span id="board-hint">Aim · click to launch</span><span class="mobile-score" id="mobile-score">0 DMG · 0 collisions</span><span class="key-hint">← → <kbd>SPACE</kbd></span></div><div class="board-paused" id="board-paused" hidden><span>Ⅱ</span><strong>EXPERIMENT PAUSED</strong></div></section>
      <aside class="right-column">
        <section class="panel damage-panel"><div class="panel-label"><span>DAMAGE THIS VOLLEY</span><span class="tiny-star">✧</span></div><div class="damage-value"><strong id="damage">0</strong><span>DMG</span></div><div class="damage-meta"><span>Collisions <b id="hits">0</b></span><span>Marbles <b id="balls">1</b></span></div><div id="damage-status" class="damage-status">Waiting for the first spark</div></section>
        <section class="panel recipe-panel"><div class="panel-label"><span>MY FORMULAS</span><span id="recipe-count">0 </span></div><div class="base-recipe"><span class="recipe-icon">◉</span><div><strong>Prime marble</strong><small>Base collision damage <b id="base-damage">1</b></small></div><span class="base-tag">STARTER</span></div><div id="recipes"></div><div id="recipe-empty" class="recipe-empty">${star}<p>No formula written yet</p><small>Defeat an enemy and choose your path.</small></div></section>
        <section class="next-panel"><span class="small-diamond">◇</span><div><strong>COLLIDE · CHARGE · TRANSMUTE</strong><p>Six upgrades, endless builds.<br>Turn a small marble into a masterpiece.</p></div></section>
      </aside>
    </div>
    <div class="action-row"><p id="notice" role="status" aria-live="polite">A new experiment begins · aim at a peg and make your first strike</p><button id="launch" class="primary">Launch marble <span>↗</span></button></div>
    <section class="seo-panel" aria-labelledby="about-title">
      <div><p class="eyebrow">ABOUT THE GAME</p><h2 id="about-title">A free physics roguelite for one focused minute.</h2></div>
      <p>Marble Alchemy is an original browser game built around aim, real collisions, and meaningful upgrade choices. Play without an account, finish a five-stage run, then try a new build. The game is lightweight, touch-friendly, and free to play.</p>
    </section>
  </main>
  <footer><span>✦ One small workshop, infinite possibilities.</span><span><a href="../privacy.html">Privacy</a> · Procedural art · pure collisions <b>EST. 2026</b></span></footer>
</div>
<dialog id="modal" aria-labelledby="modal-title"><div id="modal-content"></div></dialog>`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!,
  );
const sound = new Synth();
let paused = false;
let firstShotTracked = false;
let lastScrolledShot = 0;
let modalKind: 'help' | 'pause' | 'restart' | 'upgrade' | 'end' | null = null;
const aiEnabled =
  import.meta.env.VITE_TEST_MODE !== 'true' ||
  new URLSearchParams(window.location.search).get('ai') === '1';
let aiChallenge: AiChallenge | undefined;
let challengeReady = !aiEnabled;
const modal = $<HTMLDialogElement>('modal');
const scene = new AlchemyScene(
  {
    change: render,
    notice: (message) => {
      $('notice').textContent = message;
    },
    settled: (killed) => {
      track('volley_settled', {
        app: 'gpt6',
        level: scene.run.level + 1,
        killed,
        damage: scene.run.damage,
        hp: scene.run.hp,
        shots: scene.run.shots,
        ai_challenge: aiChallenge?.id ?? 'none',
      });
      if (killed && scene.run.lastAiTrigger === 'heal_after_settlement')
        track('ai_rule_triggered', {
          app: 'gpt6',
          challenge: aiChallenge?.id ?? 'none',
          effect: scene.run.lastAiTrigger,
          level: scene.run.level + 1,
        });
      $('enemy-art').classList.remove('shaken');
      void $('enemy-art').offsetWidth;
      $('enemy-art').classList.add('shaken');
      $('notice').textContent = killed
        ? `${LEVELS[scene.run.level].name} purified · choose a new formula`
        : `Released ${scene.run.damage} damage · enemy retaliates for ${LEVELS[scene.run.level].attack} health`;
    },
    launched: () => {
      track('shot_attempt', {
        app: 'gpt6',
        level: scene.run.level + 1,
        shot: scene.run.shots,
        ai_challenge: aiChallenge?.id ?? 'none',
        ai_effect: aiChallenge?.effect ?? 'none',
      });
      if (!firstShotTracked) {
        firstShotTracked = true;
        track('game_start', {
          app: 'gpt6',
          level: scene.run.level + 1,
          ai_challenge: aiChallenge?.id ?? 'none',
        });
      }
    },
    aiTriggered: (effect) => {
      track('ai_rule_triggered', {
        app: 'gpt6',
        challenge: aiChallenge?.id ?? 'none',
        effect,
        level: scene.run.level + 1,
      });
    },
    readyToLaunch: () => challengeReady,
  },
  sound,
  aiChallenge,
);
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  transparent: true,
  antialias: true,
  powerPreference: 'low-power',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 0.8 },
      enableSleeping: false,
      positionIterations: 8,
      velocityIterations: 8,
    },
  },
  scene: [scene],
  audio: { noAudio: true },
  banner: false,
});

track('page_view', { app: 'gpt6' });
track('game_ready', {
  app: 'gpt6',
  version: '1.0.0',
  stages: LEVELS.length,
  ai_enabled: aiEnabled,
});
track('landing_view', {
  app: 'gpt6',
  version: '1.0.0',
  stages: LEVELS.length,
  ai_enabled: aiEnabled,
});
if (localTelemetryEnabled()) {
  document
    .querySelector<HTMLElement>('footer')
    ?.insertAdjacentHTML('beforeend', '<span class="telemetry-badge">Telemetry: local only</span>');
}

function renderAiChallenge(challenge: AiChallenge) {
  $('ai-director-title').textContent = challenge.title;
  $('ai-prophecy').textContent = challenge.prophecy;
  $('ai-effect').textContent = effectLabel(challenge.effect);
  $('ai-source').textContent =
    challenge.source === 'model'
      ? `${challenge.generatedBy ?? 'AI'} · model challenge`
      : 'LOCAL FALLBACK · offline challenge';
  const progress = dailyProgress();
  $('ai-streak').textContent = progress.completedToday
    ? `STREAK ${progress.streak} · COMPLETE`
    : `STREAK ${progress.streak}`;
}

if (aiEnabled) {
  void loadDailyChallenge().then((challenge) => {
    if (!scene.setChallenge(challenge)) return;
    aiChallenge = challenge;
    challengeReady = true;
    renderAiChallenge(challenge);
    track('ai_challenge_loaded', {
      app: 'gpt6',
      challenge: challenge.id,
      effect: challenge.effect,
      source: challenge.source ?? 'fallback',
      generated_by: challenge.generatedBy ?? 'local-fallback',
      generated_at: challenge.generatedAt ?? 'none',
    });
    render();
  });
}

function render() {
  const run = scene.run,
    level = LEVELS[run.level];
  $('level-number').textContent = `0${run.level + 1} / 05`;
  $('enemy-name').textContent = level.name;
  $('enemy-subtitle').textContent = level.title;
  $('enemy-description').textContent = level.description;
  $('enemy-art').style.color = level.color;
  $('enemy-type').textContent =
    `${['WISP', 'CONSTRUCT', 'REFRACTION', 'MUTANT', 'SAGE'][run.level]} · ${['I', 'II', 'III', 'IV', 'V'][run.level]}`;
  $('enemy-health').textContent = `${run.enemyHp} / ${level.hp}`;
  $('enemy-health-fill').style.width = `${(run.enemyHp / level.hp) * 100}%`;
  $('damage-preview').style.width =
    `${(Math.min(run.enemyHp, ['flying', 'settling'].includes(run.phase) ? run.damage : 0) / level.hp) * 100}%`;
  $('damage-preview').style.right = `${(1 - run.enemyHp / level.hp) * 100}%`;
  $('enemy-attack').textContent = `−${level.attack} health`;
  $('hp-number').textContent = `${run.hp} / 5`;
  $('hearts').innerHTML = Array.from(
    { length: 5 },
    (_, i) => `<span class="${i < run.hp ? 'full' : ''}">${i < run.hp ? '♥' : '♡'}</span>`,
  ).join('');
  $('hearts').setAttribute('aria-label', `health ${run.hp} / 5`);
  $('mobile-score').textContent = `${run.damage} DMG · ${run.hits} collisions`;
  if (run.phase === 'flying' && run.shots !== lastScrolledShot && window.innerWidth <= 820) {
    lastScrolledShot = run.shots;
    document.querySelector('.board-panel')!.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  $('damage').textContent = String(run.damage);
  $('hits').textContent = String(run.hits);
  const state = scene.snapshot();
  $('balls').textContent = String(run.phase === 'aiming' ? 1 : state.balls.length);
  $('phase-label').textContent = paused
    ? 'Experiment paused'
    : {
        aiming: 'Ready to launch',
        flying: 'Transmuting',
        settling: 'Releasing damage',
        upgrade: 'Choose a formula',
        won: 'Alchemy complete',
        lost: 'Experiment over',
      }[run.phase];
  $('shot-number').textContent =
    `EXPERIMENT ${String(run.shots + (run.phase === 'aiming' ? 1 : 0)).padStart(3, '0')}`;
  $('damage-status').textContent =
    run.phase === 'flying'
      ? run.damage >= run.enemyHp
        ? '✦ Purification damage reached'
        : 'Energy stored · released when marbles settle'
      : run.phase === 'settling'
        ? '✧ Marbles recovered · releasing damage'
        : run.damage
          ? `Previous volley dealt ${run.damage} damage`
          : 'Waiting for the first spark';
  $('damage-status').classList.toggle(
    'lethal',
    run.phase === 'flying' && run.damage >= run.enemyHp,
  );
  $('board-hint').textContent =
    run.phase === 'flying'
      ? 'Hold steady · damage settles when all marbles land'
      : run.phase === 'aiming'
        ? 'Aim · click or release to launch'
        : 'Every collision is alchemy';
  $<HTMLButtonElement>('launch').disabled = paused || run.phase !== 'aiming' || !challengeReady;
  $('launch').innerHTML =
    run.phase === 'aiming'
      ? 'Launch marble <span>↗</span>'
      : run.phase === 'flying'
        ? 'Transmuting <span>✧</span>'
        : 'AWAITING NEXT STEP <span>◇</span>';
  $('base-damage').textContent = String(1 + run.build.power);
  const acquired = UPGRADES.filter((u) => u.id !== 'heal' && Boolean(run.build[u.id]));
  $('recipe-count').textContent = `${acquired.length} `;
  $('recipe-empty').hidden = acquired.length > 0;
  $('recipes').innerHTML = acquired
    .map(
      (u) =>
        `<div class="acquired-recipe" style="--upgrade:${u.color}" title="${u.description}"><span class="recipe-icon">${u.symbol}</span><div><strong>${u.name}</strong><small>${u.id === 'power' ? `Base damage +${run.build.power}` : u.id === 'fire' ? `Fire damage +${run.build.fire}` : u.id === 'lightning' ? 'Nearest two pegs · +1 each' : u.id === 'split' ? 'First collision · +2 marbles' : '20% chance · double damage'}</small></div><b>×${u.id === 'power' || u.id === 'fire' ? run.build[u.id] : 1}</b></div>`,
    )
    .join('');
  document.querySelectorAll<HTMLElement>('.stage').forEach((el, i) => {
    el.classList.toggle('active', i === run.level);
    el.classList.toggle('complete', i < run.level || run.phase === 'won');
    el.querySelector('.stage-dot')!.textContent =
      i < run.level || run.phase === 'won' ? '✓' : String(i + 1);
  });
  if (run.phase === 'upgrade' && !paused && modalKind !== 'upgrade') showUpgrade();
  if ((run.phase === 'won' || run.phase === 'lost') && modalKind !== 'end') showEnd();
}
function openModal(kind: typeof modalKind, html: string) {
  modalKind = kind;
  $('modal-content').innerHTML = html;
  if (!modal.open) modal.showModal();
}
function closeModal() {
  modal.close();
  modalKind = null;
  $('modal-content').replaceChildren();
  // Continue the game keyboard flow instead of reactivating the button that opened the dialog.
  $('game').focus({ preventScroll: true });
}
function suspend() {
  paused = true;
  scene.pauseGame();
  $('board-paused').hidden = false;
  render();
}
function resume() {
  closeModal();
  paused = false;
  $('board-paused').hidden = true;
  scene.resumeGame();
  render();
}
function reset() {
  track('run_restart', {
    app: 'gpt6',
    from_phase: scene.run.phase,
    level: scene.run.level + 1,
    ai_challenge: aiChallenge?.id ?? 'none',
  });
  closeModal();
  paused = false;
  lastScrolledShot = 0;
  firstShotTracked = false;
  $('board-paused').hidden = true;
  scene.resetRun();
}
function showPause() {
  if (modalKind || !scene.ready) return;
  suspend();
  openModal(
    'pause',
    `<p class="eyebrow">TAKE A BREATH</p><h2 id="modal-title">Let the sparks rest for a moment.</h2><p class="modal-copy">The marbles, timer, and settlement are waiting for you.</p><div class="modal-actions"><button class="primary" id="resume">Resume experiment <span>▷</span></button><button class="secondary" id="pause-restart">Restart</button></div>`,
  );
  $('resume').onclick = resume;
  $('pause-restart').onclick = showRestart;
}
function showRestart() {
  if (!scene.ready) return;
  suspend();
  openModal(
    'restart',
    `<p class="eyebrow">A FRESH FORMULA</p><h2 id="modal-title">Start a fresh experiment?</h2><p class="modal-copy">The current level and formulas will reset; health returns to 5.</p><div class="modal-actions"><button class="primary" id="confirm-restart">Restart</button><button class="secondary" id="cancel-restart">Return to experiment</button></div>`,
  );
  $('confirm-restart').onclick = reset;
  $('cancel-restart').onclick = resume;
}
function showHelp() {
  if (modalKind || !scene.ready) return;
  suspend();
  openModal(
    'help',
    `<p class="eyebrow">THE ALCHEMIST’S HANDBOOK</p><h2 id="modal-title">Start with one marble.</h2><div class="instructions"><div><b>01</b><p><strong>Aim and launch</strong>Move the mouse to aim and click the board; drag on touch and release. You can also use ← → and Space.</p></div><div><b>02</b><p><strong>Turn collisions into damage</strong>Every peg hit adds damage; all marbles attack together after they land. The aim line previews only the first collision. Peg colors are cosmetic.</p></div><div><b>03</b><p><strong>Upgrade through five trials</strong>Living enemies retaliate; after each victory choose 1 of 3 random formulas. Choose the final formula after stage five to win. Reach zero health and the run ends.</p></div></div><div class="help-upgrades">${UPGRADES.map((u) => `<p><b style="color:${u.color}">${u.symbol} ${u.name}</b><span>${u.description}</span></p>`).join('')}</div><p class="help-footnote">P / Esc pauses or resumes · switching tabs pauses automatically · stalled marbles are nudged and recovered after 16 seconds (paused time does not count).</p><button class="primary" id="help-close">Got it, continue <span>↗</span></button>`,
  );
  $('help-close').onclick = resume;
}
function showUpgrade() {
  const final = scene.run.level === 4;
  openModal(
    'upgrade',
    `<p class="eyebrow">TRANSMUTATION SUCCESSFUL · 0${scene.run.level + 1}</p><div class="modal-emblem">✦</div><h2 id="modal-title">${final ? 'One final formula, offered to victory.' : 'A new power awaits transmutation.'}</h2><p class="modal-copy">${LEVELS[scene.run.level].name} purified. Choose a formula${final ? ' to complete your philosopher’s stone' : ' to power the next trial'}.</p><div class="upgrade-grid">${scene.run.offers
      .map((id) => {
        const u = UPGRADES.find((u) => u.id === id)!;
        return `<button class="upgrade-card" data-upgrade="${id}" style="--upgrade:${u.color}"><span class="upgrade-symbol">${u.symbol}</span><small>${u.tag}</small><h3>${u.name}</h3><p>${u.description}</p>${id === 'heal' ? `<p class="heal-preview">health ${scene.run.hp} → ${Math.min(5, scene.run.hp + 2)} / 5</p>` : ''}<span class="select-upgrade">Choose a formula <b>↗</b></span></button>`;
      })
      .join('')}</div><p class="choice-note">Choose one · the formula takes effect immediately</p>`,
  );
  document.querySelectorAll<HTMLButtonElement>('[data-upgrade]').forEach((button) => {
    button.onclick = () => {
      const levelBefore = scene.run.level + 1;
      if (!scene.run.choose(button.dataset.upgrade as UpgradeId)) return;
      track('upgrade_selected', {
        app: 'gpt6',
        challenge: aiChallenge?.id ?? 'none',
        level_before: levelBefore,
        level_after: scene.run.level + 1,
        upgrade: button.dataset.upgrade || 'unknown',
        history_length: scene.run.history.length,
      });
      sound.unlock();
      sound.tone('upgrade');
      closeModal();
      $('notice').textContent =
        `New formula active · ${LEVELS[scene.run.level].name} awaits your challenge`;
      render();
    };
  });
}
function showEnd() {
  const won = scene.run.phase === 'won';
  const challenge = aiChallenge;
  const daily =
    won && challenge
      ? completeDailyChallenge(challenge.id)
      : challenge
        ? dailyProgress()
        : undefined;
  if (daily && challenge && won) {
    $('ai-streak').textContent = `STREAK ${daily.streak} · COMPLETE`;
    track('daily_challenge_completed', {
      app: 'gpt6',
      challenge: challenge.id,
      result: won ? 'won' : 'lost',
      streak: daily.streak,
      source: challenge.source ?? 'fallback',
    });
  }
  track('run_complete', {
    app: 'gpt6',
    result: won ? 'won' : 'lost',
    level: won ? LEVELS.length : scene.run.level + 1,
    total_damage: scene.run.totalDamage,
    shots: scene.run.shots,
    upgrades: scene.run.history.join(','),
    ai_challenge: challenge?.id ?? 'none',
    ai_source: challenge?.source ?? 'none',
  });
  const aiDebrief = challenge
    ? debriefFor(challenge, {
        won,
        levelsCleared: won ? LEVELS.length : scene.run.level,
        totalDamage: scene.run.totalDamage,
        shots: scene.run.shots,
        hp: scene.run.hp,
      })
    : 'The AI challenge did not load; the next experiment starts fresh.';
  openModal(
    'end',
    `<p class="eyebrow">${won ? 'THE PHILOSOPHER’S STONE' : 'EVERY EXPERIMENT TEACHES'}</p><div class="modal-emblem">${won ? star : '◇'}</div><h2 id="modal-title">${won ? 'You forged your own miracle.' : 'The spark is out, but the inspiration remains.'}</h2><p class="modal-copy">${won ? 'All five trials are complete. Your philosopher’s stone is shining.' : 'Your health reached zero. This collision becomes the next idea.'}</p><div class="ai-debrief"><small>AI Director debrief · ${escapeHtml(challenge?.title ?? 'Challenge not loaded')}</small><p>${escapeHtml(aiDebrief)}</p></div><div class="end-stats"><div><b>${won ? 5 : scene.run.level}</b><span>Trials cleared</span></div><div><b>${scene.run.totalDamage}</b><span>Total damage</span></div><div><b>${scene.run.shots}</b><span>Launches</span></div></div><div class="modal-actions"><button class="primary" id="play-again">Run the experiment again <span>↻</span></button><button class="secondary" id="share-result">Share result <span>↗</span></button><a class="secondary support-result" id="support-result" href="../support.html?utm_source=game&amp;utm_campaign=post_run&amp;utm_content=gpt6">Support the workshop</a></div>`,
  );
  $('play-again').onclick = reset;
  $('support-result').onclick = () =>
    track('cta_click', { app: 'gpt6', target: 'post_run_support', result: won ? 'won' : 'lost' });
  $('share-result').onclick = async () => {
    const text = `I just scored ${scene.run.totalDamage} damage in Marble Alchemy${challenge ? ` during ${challenge.title}` : ''}. Can you beat it?`;
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set('utm_source', 'player_share');
    shareUrl.searchParams.set('utm_campaign', 'viral_loop');
    shareUrl.searchParams.set('utm_content', won ? 'gpt6_won' : 'gpt6_lost');
    track('share_attempt', {
      app: 'gpt6',
      result: won ? 'won' : 'lost',
      score: scene.run.totalDamage,
      challenge: challenge?.id || 'none',
    });
    try {
      if (navigator.share)
        await navigator.share({ title: 'Marble Alchemy', text, url: shareUrl.href });
      else {
        await navigator.clipboard.writeText(`${text} ${shareUrl.href}`);
        $('notice').textContent = 'Result copied · share it with another alchemist';
      }
      track('share_completed', {
        app: 'gpt6',
        result: won ? 'won' : 'lost',
        score: scene.run.totalDamage,
        challenge: challenge?.id || 'none',
      });
    } catch {
      // The user can dismiss a native share sheet without affecting the run.
    }
  };
}
function updateSound() {
  $('sound').innerHTML = `<span>${sound.enabled ? '♫' : '♪'}</span>`;
  $('sound').setAttribute('aria-label', sound.enabled ? 'Mute sound' : 'Enable sound');
  $('sound').setAttribute('aria-pressed', String(sound.enabled));
  $('sound').classList.toggle('muted', !sound.enabled);
}
$('help').onclick = showHelp;
$('pause').onclick = showPause;
$('restart').onclick = showRestart;
$('launch').onclick = () => {
  scene.launch();
};
$('sound').onclick = () => {
  sound.toggle();
  updateSound();
};
updateSound();
modal.addEventListener('cancel', (event) => {
  event.preventDefault();
  if (['pause', 'help', 'restart'].includes(modalKind ?? '')) resume();
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' || event.key.toLowerCase() === 'p') {
    if (modalKind && ['pause', 'help', 'restart'].includes(modalKind)) {
      event.preventDefault();
      resume();
    } else if (!modalKind) {
      event.preventDefault();
      showPause();
    }
    return;
  }
  if (modalKind || !scene.ready || paused) return;
  if (
    (event.code === 'Space' || event.key.startsWith('Arrow')) &&
    !(event.target instanceof HTMLButtonElement)
  ) {
    event.preventDefault();
    if (event.code === 'Space' && !event.repeat) scene.launch();
    else if (event.key === 'ArrowLeft') scene.adjustAim(-0.045);
    else if (event.key === 'ArrowRight') scene.adjustAim(0.045);
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && !paused && !modalKind) showPause();
});
window.addEventListener('pagehide', () => {
  if (!paused && !modalKind) showPause();
});
// Explicit opt-in fixture controls for automated boundary tests, absent from production builds.
if (import.meta.env.DEV && import.meta.env.VITE_TEST_MODE === 'true') {
  Object.assign(window, {
    __alchemyTest: {
      snapshot: () => scene.snapshot(),
      configure: (data: {
        hp?: number;
        enemyHp?: number;
        build?: Partial<typeof scene.run.build>;
      }) => {
        if (data.hp !== undefined) scene.run.hp = data.hp;
        if (data.enemyHp !== undefined) scene.run.enemyHp = data.enemyHp;
        if (data.build) Object.assign(scene.run.build, data.build);
        render();
      },
      hit: (index = 0) => scene.testHit(index),
      recall: () => scene.testRecall(),
      stall: () => scene.testStall(),
      rest: () => scene.testRest(),
      release: () => scene.testRelease(),
      random: (value: number) => {
        scene.run.random = () => value;
      },
      settleAgain: () => scene.run.settle(),
    },
  });
}
// Keep a reference so HMR can release canvas, event listeners, and WebGL resources.
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    game.destroy(true);
    window.location.reload();
  });
