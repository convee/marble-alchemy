import Phaser from 'phaser';
import './style.css';
import { AlchemyScene, WIDTH, HEIGHT } from './scene';
import { LEVELS, UPGRADES, type UpgradeId } from './game';
import { Synth } from './audio';

const star =
  '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M20 3 35 29H5L20 3Z" stroke="currentColor"/><path d="m20 37 15-26H5l15 26Z" stroke="currentColor"/><circle cx="20" cy="20" r="7" stroke="currentColor"/><circle cx="20" cy="20" r="2" fill="currentColor"/></svg>';
const ghost = `<svg viewBox="0 0 240 215" fill="none" aria-hidden="true"><defs><radialGradient id="aura"><stop stop-color="currentColor" stop-opacity=".24"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient><linearGradient id="spirit" x1="85" y1="50" x2="155" y2="175" gradientUnits="userSpaceOnUse"><stop stop-color="#e7ddff"/><stop offset=".52" stop-color="currentColor"/><stop offset="1" stop-color="#51416f"/></linearGradient></defs><circle cx="120" cy="107" r="102" fill="url(#aura)"/><g stroke="currentColor" opacity=".23"><ellipse cx="120" cy="125" rx="93" ry="37" transform="rotate(-25 120 125)"/><ellipse cx="120" cy="125" rx="87" ry="33" transform="rotate(25 120 125)"/><circle cx="120" cy="108" r="76" stroke-dasharray="2 9"/></g><g class="ghost-body"><path d="M86 96c-1-24 14-44 34-44 25 0 40 22 36 49-3 21 6 34 13 49-13-1-20-5-27-12-1 18-9 29-17 36-3-13-9-18-17-22-6 10-17 14-29 14 11-20 10-28 5-42-3-10-1-20 2-28Z" fill="url(#spirit)"/><path d="M97 83c0-9 6-17 15-20" stroke="white" stroke-opacity=".7" stroke-width="3" stroke-linecap="round"/><path d="m100 105 12 3m16 0 12-3" stroke="#252137" stroke-width="5" stroke-linecap="round"/><ellipse cx="121" cy="123" rx="5" ry="7" fill="#35264e"/><path d="m76 47 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Zm103 56 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="currentColor"/></g><ellipse cx="120" cy="194" rx="38" ry="5" fill="currentColor" opacity=".13"/></svg>`;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div class="app-shell">
  <header class="topbar">
    <a class="brand" href="./" aria-label="弹珠炼金工坊首页"><span class="brand-mark">${star}</span><span><strong>弹珠炼金工坊</strong><small>MARBLE ALCHEMY</small></span></a>
    <div class="edition"><span></span> 独立实验室 <b>VOL. 01</b></div>
    <nav class="controls" aria-label="游戏控制"><button id="help" class="quiet"><span>?</span><i>玩法说明</i></button><button id="sound" class="quiet" aria-label="关闭音效"></button><button id="pause" class="quiet"><span>Ⅱ</span><i>暂停</i></button><button id="restart" class="quiet" aria-label="重新开始"><span>↻</span></button></nav>
  </header>
  <main>
    <section class="intro"><div><p class="eyebrow">THE TRANSMUTATION CHAMBER</p><h1>每一次碰撞，<em>皆是炼金。</em></h1></div><p class="intro-note">瞄准微光，让混沌化为力量。<br>五场试炼，一颗贤者之石。</p></section>
    <div class="journey" aria-label="五关进度">${LEVELS.map((l, i) => `<div class="stage" data-stage="${i}"><span class="stage-dot">${i + 1}</span><span>${l.name}</span>${i === 4 ? '<small>终章</small>' : ''}</div>`).join('')}</div>
    <div class="workbench">
      <aside class="left-column">
        <section class="panel enemy-panel"><div class="panel-label"><span>当前试炼</span><span id="level-number">01 / 05</span></div><div id="enemy-art" class="enemy-art">${ghost}<span class="enemy-type" id="enemy-type">游离体 · I</span></div><p id="enemy-subtitle" class="micro"></p><h2 id="enemy-name"></h2><p id="enemy-description" class="enemy-description"></p><div class="health-label"><span>敌人生命</span><strong id="enemy-health"></strong></div><div class="health-track"><div id="enemy-health-fill"></div><div id="damage-preview"></div></div><p class="retaliation"><span>⚔</span> 存活反击 <b id="enemy-attack"></b></p></section>
        <section class="panel life-panel"><div class="panel-label"><span>炼金师生命</span><span id="hp-number">5 / 5</span></div><div id="hearts" class="hearts" aria-label="生命 5 / 5"></div><p>保护好你最后的火种。</p></section>
        <div class="lab-note"><span>✧</span><p id="tip">伤害会先储存在炼金容器中，<br>所有弹珠落下后统一释放。</p></div>
      </aside>
      <section class="board-panel" aria-label="弹珠炼金弹盘"><div class="board-top"><span><b class="status-dot"></b><span id="phase-label">等待发射</span></span><span id="shot-number">EXPERIMENT 001</span></div><div id="game" role="application" aria-label="弹盘。移动鼠标瞄准并点击发射；触屏拖动瞄准后松手；也可用方向键和空格。" tabindex="0"></div><div class="board-bottom"><span id="board-hint">移动瞄准 · 点击发射</span><span class="mobile-score" id="mobile-score">0 DMG · 0 次碰撞</span><span class="key-hint">← → <kbd>SPACE</kbd></span></div><div class="board-paused" id="board-paused" hidden><span>Ⅱ</span><strong>实验已暂停</strong></div></section>
      <aside class="right-column">
        <section class="panel damage-panel"><div class="panel-label"><span>本轮炼成伤害</span><span class="tiny-star">✧</span></div><div class="damage-value"><strong id="damage">0</strong><span>DMG</span></div><div class="damage-meta"><span>碰撞次数 <b id="hits">0</b></span><span>弹珠 <b id="balls">1</b></span></div><div id="damage-status" class="damage-status">等待第一道火花</div></section>
        <section class="panel recipe-panel"><div class="panel-label"><span>我的炼金配方</span><span id="recipe-count">0 种</span></div><div class="base-recipe"><span class="recipe-icon">◉</span><div><strong>原初弹珠</strong><small>基础碰撞伤害 <b id="base-damage">1</b></small></div><span class="base-tag">初始</span></div><div id="recipes"></div><div id="recipe-empty" class="recipe-empty">${star}<p>配方尚未书写</p><small>击败敌人，选择你的炼金之路。</small></div></section>
        <section class="next-panel"><span class="small-diamond">◇</span><div><strong>碰撞 · 累积 · 蜕变</strong><p>六种升级，自由组合。<br>让小小弹珠成为你的杰作。</p></div></section>
      </aside>
    </div>
    <div class="action-row"><p id="notice" role="status" aria-live="polite">新的实验开始了 · 瞄准钉子，炼成你的第一击</p><button id="launch" class="primary">发射弹珠 <span>↗</span></button></div>
  </main>
  <footer><span>✦ 一间小工坊，无限种可能。</span><span>程序绘制 · 纯粹碰撞 <b>EST. 2026</b></span></footer>
</div>
<dialog id="modal" aria-labelledby="modal-title"><div id="modal-content"></div></dialog>`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const sound = new Synth();
let paused = false;
let lastScrolledShot = 0;
let modalKind: 'help' | 'pause' | 'restart' | 'upgrade' | 'end' | null = null;
const modal = $<HTMLDialogElement>('modal');
const scene = new AlchemyScene(
  {
    change: render,
    notice: (message) => {
      $('notice').textContent = message;
    },
    settled: (killed) => {
      $('enemy-art').classList.remove('shaken');
      void $('enemy-art').offsetWidth;
      $('enemy-art').classList.add('shaken');
      $('notice').textContent = killed
        ? `${LEVELS[scene.run.level].name}已净化 · 选择一份新的炼金配方`
        : `释放 ${scene.run.damage} 点伤害 · 敌人反击，失去 ${LEVELS[scene.run.level].attack} 点生命`;
    },
  },
  sound,
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

function render() {
  const run = scene.run,
    level = LEVELS[run.level];
  $('level-number').textContent = `0${run.level + 1} / 05`;
  $('enemy-name').textContent = level.name;
  $('enemy-subtitle').textContent = level.title;
  $('enemy-description').textContent = level.description;
  $('enemy-art').style.color = level.color;
  $('enemy-type').textContent =
    `${['游离体', '构装体', '折光体', '异变体', '贤者'][run.level]} · ${['I', 'II', 'III', 'IV', 'V'][run.level]}`;
  $('enemy-health').textContent = `${run.enemyHp} / ${level.hp}`;
  $('enemy-health-fill').style.width = `${(run.enemyHp / level.hp) * 100}%`;
  $('damage-preview').style.width =
    `${(Math.min(run.enemyHp, ['flying', 'settling'].includes(run.phase) ? run.damage : 0) / level.hp) * 100}%`;
  $('damage-preview').style.right = `${(1 - run.enemyHp / level.hp) * 100}%`;
  $('enemy-attack').textContent = `−${level.attack} 生命`;
  $('hp-number').textContent = `${run.hp} / 5`;
  $('hearts').innerHTML = Array.from(
    { length: 5 },
    (_, i) => `<span class="${i < run.hp ? 'full' : ''}">${i < run.hp ? '♥' : '♡'}</span>`,
  ).join('');
  $('hearts').setAttribute('aria-label', `生命 ${run.hp} / 5`);
  $('mobile-score').textContent = `${run.damage} DMG · ${run.hits} 次碰撞`;
  if (run.phase === 'flying' && run.shots !== lastScrolledShot && window.innerWidth <= 820) {
    lastScrolledShot = run.shots;
    document.querySelector('.board-panel')!.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  $('damage').textContent = String(run.damage);
  $('hits').textContent = String(run.hits);
  const state = scene.snapshot();
  $('balls').textContent = String(run.phase === 'aiming' ? 1 : state.balls.length);
  $('phase-label').textContent = paused
    ? '实验暂停'
    : {
        aiming: '等待发射',
        flying: '炼成进行中',
        settling: '释放伤害',
        upgrade: '选择配方',
        won: '炼金完成',
        lost: '实验结束',
      }[run.phase];
  $('shot-number').textContent =
    `EXPERIMENT ${String(run.shots + (run.phase === 'aiming' ? 1 : 0)).padStart(3, '0')}`;
  $('damage-status').textContent =
    run.phase === 'flying'
      ? run.damage >= run.enemyHp
        ? '✦ 已达到净化所需伤害'
        : '能量储存中 · 落底后释放'
      : run.phase === 'settling'
        ? '✧ 弹珠已回收，正在释放'
        : run.damage
          ? `上一轮完成 ${run.damage} 点伤害`
          : '等待第一道火花';
  $('damage-status').classList.toggle(
    'lethal',
    run.phase === 'flying' && run.damage >= run.enemyHp,
  );
  $('board-hint').textContent =
    run.phase === 'flying'
      ? '静候炼成 · 所有弹珠落底后结算'
      : run.phase === 'aiming'
        ? '移动瞄准 · 点击或松手发射'
        : '每一次碰撞，皆是炼金';
  $<HTMLButtonElement>('launch').disabled = paused || run.phase !== 'aiming';
  $('launch').innerHTML =
    run.phase === 'aiming'
      ? '发射弹珠 <span>↗</span>'
      : run.phase === 'flying'
        ? '炼成中 <span>✧</span>'
        : '等待下一步 <span>◇</span>';
  $('base-damage').textContent = String(1 + run.build.power);
  const acquired = UPGRADES.filter((u) => u.id !== 'heal' && Boolean(run.build[u.id]));
  $('recipe-count').textContent = `${acquired.length} 种`;
  $('recipe-empty').hidden = acquired.length > 0;
  $('recipes').innerHTML = acquired
    .map(
      (u) =>
        `<div class="acquired-recipe" style="--upgrade:${u.color}" title="${u.description}"><span class="recipe-icon">${u.symbol}</span><div><strong>${u.name}</strong><small>${u.id === 'power' ? `基础伤害 +${run.build.power}` : u.id === 'fire' ? `火焰伤害 +${run.build.fire}` : u.id === 'lightning' ? '最近两钉 · 各 +1' : u.id === 'split' ? '首次碰撞 · 弹珠 +2' : '20% 概率 · 伤害翻倍'}</small></div><b>×${u.id === 'power' || u.id === 'fire' ? run.build[u.id] : 1}</b></div>`,
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
  closeModal();
  paused = false;
  lastScrolledShot = 0;
  $('board-paused').hidden = true;
  scene.resetRun();
}
function showPause() {
  if (modalKind || !scene.ready) return;
  suspend();
  openModal(
    'pause',
    `<p class="eyebrow">TAKE A BREATH</p><h2 id="modal-title">让火花，稍作停留。</h2><p class="modal-copy">实验已暂停。弹珠、计时与结算都将等待你回来。</p><div class="modal-actions"><button class="primary" id="resume">继续实验 <span>▷</span></button><button class="secondary" id="pause-restart">重新开始</button></div>`,
  );
  $('resume').onclick = resume;
  $('pause-restart').onclick = showRestart;
}
function showRestart() {
  if (!scene.ready) return;
  suspend();
  openModal(
    'restart',
    `<p class="eyebrow">A FRESH FORMULA</p><h2 id="modal-title">开启一次新的实验？</h2><p class="modal-copy">当前关卡与配方将清空，生命恢复至 5 点。</p><div class="modal-actions"><button class="primary" id="confirm-restart">重新开始</button><button class="secondary" id="cancel-restart">返回实验</button></div>`,
  );
  $('confirm-restart').onclick = reset;
  $('cancel-restart').onclick = resume;
}
function showHelp() {
  if (modalKind || !scene.ready) return;
  suspend();
  openModal(
    'help',
    `<p class="eyebrow">THE ALCHEMIST’S HANDBOOK</p><h2 id="modal-title">从一颗弹珠开始。</h2><div class="instructions"><div><b>01</b><p><strong>瞄准与发射</strong>鼠标移动瞄准、点击弹盘发射；触屏按住拖动、松手发射。也可按 ← → 调整方向，空格发射。</p></div><div><b>02</b><p><strong>让碰撞炼成伤害</strong>每次撞钉累计伤害，所有弹珠落到底部后统一攻击。瞄准线只预览首次碰撞前的路径。钉子颜色仅为装饰。</p></div><div><b>03</b><p><strong>升级，穿越五场试炼</strong>敌人存活则反击；击败后从 3 张随机配方中选 1 张。第五关选取最后一份配方后获胜。生命归零则失败。</p></div></div><div class="help-upgrades">${UPGRADES.map((u) => `<p><b style="color:${u.color}">${u.symbol} ${u.name}</b><span>${u.description}</span></p>`).join('')}</div><p class="help-footnote">P / Esc 暂停或继续 · 切换到后台自动暂停 · 滞留弹珠会轻推，16 秒后自动回收（暂停不计时）。</p><button class="primary" id="help-close">明白了，继续实验 <span>↗</span></button>`,
  );
  $('help-close').onclick = resume;
}
function showUpgrade() {
  const final = scene.run.level === 4;
  openModal(
    'upgrade',
    `<p class="eyebrow">TRANSMUTATION SUCCESSFUL · 0${scene.run.level + 1}</p><div class="modal-emblem">✦</div><h2 id="modal-title">${final ? '最后的配方，献给胜利。' : '新的力量，等待炼成。'}</h2><p class="modal-copy">${LEVELS[scene.run.level].name}已净化。选择一份配方${final ? '，完成你的贤者之石' : '，为下一场试炼注入力量'}。</p><div class="upgrade-grid">${scene.run.offers
      .map((id) => {
        const u = UPGRADES.find((u) => u.id === id)!;
        return `<button class="upgrade-card" data-upgrade="${id}" style="--upgrade:${u.color}"><span class="upgrade-symbol">${u.symbol}</span><small>${u.tag}</small><h3>${u.name}</h3><p>${u.description}</p>${id === 'heal' ? `<p class="heal-preview">生命 ${scene.run.hp} → ${Math.min(5, scene.run.hp + 2)} / 5</p>` : ''}<span class="select-upgrade">选择配方 <b>↗</b></span></button>`;
      })
      .join('')}</div><p class="choice-note">每次只能选择一份 · 配方将立即生效</p>`,
  );
  document.querySelectorAll<HTMLButtonElement>('[data-upgrade]').forEach((button) => {
    button.onclick = () => {
      if (!scene.run.choose(button.dataset.upgrade as UpgradeId)) return;
      sound.unlock();
      sound.tone('upgrade');
      closeModal();
      $('notice').textContent = `新配方已生效 · ${LEVELS[scene.run.level].name}等待你的挑战`;
      render();
    };
  });
}
function showEnd() {
  const won = scene.run.phase === 'won';
  openModal(
    'end',
    `<p class="eyebrow">${won ? 'THE PHILOSOPHER’S STONE' : 'EVERY EXPERIMENT TEACHES'}</p><div class="modal-emblem">${won ? star : '◇'}</div><h2 id="modal-title">${won ? '你炼成了，属于自己的奇迹。' : '火种暂熄，灵感未尽。'}</h2><p class="modal-copy">${won ? '五场试炼全部完成。贤者之石在你的工坊里熠熠生辉。' : '生命已归零。这一次的碰撞，会成为下一次的灵感。'}</p><div class="end-stats"><div><b>${won ? 5 : scene.run.level}</b><span>净化试炼</span></div><div><b>${scene.run.totalDamage}</b><span>累计伤害</span></div><div><b>${scene.run.shots}</b><span>发射次数</span></div></div><button class="primary" id="play-again">再来一次实验 <span>↻</span></button>`,
  );
  $('play-again').onclick = reset;
}
function updateSound() {
  $('sound').innerHTML = `<span>${sound.enabled ? '♫' : '♪'}</span>`;
  $('sound').setAttribute('aria-label', sound.enabled ? '关闭音效' : '开启音效');
  $('sound').setAttribute('aria-pressed', String(sound.enabled));
  $('sound').classList.toggle('muted', !sound.enabled);
}
$('help').onclick = showHelp;
$('pause').onclick = showPause;
$('restart').onclick = showRestart;
$('launch').onclick = () => scene.launch();
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
