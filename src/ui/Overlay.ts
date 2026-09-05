import { RULES } from '../core/balance';
import { UPGRADES, type UpgradeId } from '../core/upgrades';

/**
 * 前端组件：DOM 覆盖层（开始/说明/暂停/升级/失败/胜利）。
 * 职责：负责菜单与卡片的展示和点击回调；不负责任何游戏规则（规则在 core/ 与 GameScene）。
 * 约束：同一时刻只有一个覆盖层；覆盖层打开时拦截全部指针事件，画布收不到输入。
 */
export type OverlayKind = 'start' | 'help' | 'pause' | 'upgrade' | 'gameover' | 'victory';

export interface RunSummary {
  level: number;
  totalDamage: number;
  launches: number;
  bestVolley: number;
  hits: number;
  crits: number;
}

export interface UpgradeCardData {
  id: UpgradeId;
  owned: number;
}

interface SoundCtl {
  muted: boolean;
  onToggleSound: () => boolean;
}

const ICONS: Record<UpgradeId, string> = {
  strengthen:
    '<svg viewBox="0 0 24 24"><path d="M12 3l6 6M12 3L6 9M12 10l6 6M12 10l-6 6"/><path d="M6 21h12"/></svg>',
  fire:
    '<svg viewBox="0 0 24 24"><path d="M12 2.5c.8 3.2 4.5 5 4.5 9.5A4.5 4.5 0 0 1 7.5 12c0-1.6.7-2.8 1.6-3.7.1 1.5 1 2.4 1.9 2.2 1-.3.6-3.4 1-8z"/><path class="f" d="M12 21a3 3 0 0 1-3-3c0-1.6 1.3-2.5 3-4.6 1.7 2.1 3 3 3 4.6a3 3 0 0 1-3 3z"/></svg>',
  lightning: '<svg viewBox="0 0 24 24"><path d="M13 2L5 14h6l-1 8 8-12h-6l1-8z"/></svg>',
  split:
    '<svg viewBox="0 0 24 24"><circle class="f" cx="12" cy="5.5" r="2.6"/><circle class="f" cx="5.5" cy="18.5" r="2.6"/><circle class="f" cx="18.5" cy="18.5" r="2.6"/><path d="M12 8.2L7 15.8M12 8.2l5 7.6"/></svg>',
  crit:
    '<svg viewBox="0 0 24 24"><path d="M12 2l2.2 6.3L20.5 10l-6.3 1.7L12 18l-2.2-6.3L3.5 10l6.3-1.7z"/><path d="M19 17l2 2M5 17l-2 2M12 20v2"/></svg>',
  heal:
    '<svg viewBox="0 0 24 24"><path d="M9 2.5h6M10 2.5v5.2l-5.2 9A3 3 0 0 0 7.4 21h9.2a3 3 0 0 0 2.6-4.3L14 7.7V2.5"/><path d="M12 11v6M9 14h6"/></svg>',
};

export class Overlay {
  private root: HTMLElement;
  private el: HTMLElement | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private toastTimer: number | null = null;
  current: OverlayKind | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  get isOpen(): boolean {
    return this.current !== null;
  }

  hide(): void {
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    this.current = null;
  }

  private mount(kind: OverlayKind, html: string): HTMLElement {
    this.hide();
    const el = document.createElement('div');
    el.className = 'overlay';
    el.dataset.overlay = kind;
    el.innerHTML = html;
    this.root.appendChild(el);
    this.el = el;
    this.current = kind;
    return el;
  }

  private bind(el: HTMLElement, id: string, fn: () => void): void {
    const btn = el.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    if (btn) btn.addEventListener('click', fn);
  }

  private soundButton(ctl: SoundCtl, el: HTMLElement): void {
    const btn = el.querySelector<HTMLButtonElement>('[data-testid="sound-toggle"]');
    if (!btn) return;
    const render = (muted: boolean) => {
      btn.textContent = muted ? '音效：关' : '音效：开';
    };
    render(ctl.muted);
    btn.addEventListener('click', () => render(ctl.onToggleSound()));
  }

  private rulesHtml(): string {
    return `
      <div class="rules">
        <h3>怎么玩</h3>
        <ul>
          <li>在弹盘里<b>按住拖动</b>瞄准，<b>松开</b>发射弹珠（鼠标、触屏都行；键盘空格按当前瞄准线发射）。</li>
          <li>弹珠每撞到一个钉子累计 <span class="k">1 点</span>伤害，被撞过的钉子会暂时熄灭，下一次发射前全部点亮。</li>
          <li><b>绿色回充石</b>被撞到时，会立刻点亮所有熄灭的钉子。</li>
          <li>所有弹珠落到底部后统一结算：累计伤害一次性打在敌人身上。</li>
          <li>敌人没死就会<b>反击</b>，你失去它攻击力那么多生命。生命归零，炼金失败。</li>
          <li>击败敌人后从 3 张升级里选 1 张，然后进入下一关。共 <span class="k">5 关</span>，打倒炉心魔像即胜利。</li>
        </ul>
        <h3>升级</h3>
        <ul>
          <li><b>强化</b>（可叠加）：每次碰撞基础伤害 +1，基础伤害会被暴击翻倍。</li>
          <li><b>火焰</b>（可叠加）：每次碰撞额外累计 1 点火焰伤害，不受暴击影响。</li>
          <li><b>闪电</b>：每次碰撞对最近的另外两个钉子各触发 1 点伤害，连锁不再连锁。</li>
          <li><b>分裂</b>：每次发射的首次碰撞额外分出 2 颗弹珠，分出的不再分裂。</li>
          <li><b>暴击</b>：每次碰撞 20% 概率让本次碰撞伤害翻倍。</li>
          <li><b>治疗</b>：立刻恢复 2 点生命，上限 ${RULES.maxHp} 点。</li>
        </ul>
        <h3>快捷键</h3>
        <ul>
          <li>Esc / P 暂停或继续，M 切换音效，空格发射，升级时按 1 / 2 / 3 选牌。</li>
        </ul>
      </div>`;
  }

  showStart(o: { onStart: () => void } & SoundCtl): void {
    const el = this.mount(
      'start',
      `<div class="panel">
        <h1 class="title">弹珠炼金工坊</h1>
        <p class="subtitle">瞄准 · 发射 · 累计 · 结算 · 升级</p>
        ${this.rulesHtml()}
        <div class="btn-row">
          <button class="btn primary" data-testid="start-btn">开始炼金</button>
          <button class="btn ghost" data-testid="sound-toggle"></button>
        </div>
      </div>`,
    );
    this.bind(el, 'start-btn', o.onStart);
    this.soundButton(o, el);
  }

  showHelp(onClose: () => void): void {
    const el = this.mount(
      'help',
      `<div class="panel">
        <h1 class="title">玩法说明</h1>
        ${this.rulesHtml()}
        <div class="btn-row"><button class="btn primary" data-testid="help-close">知道了</button></div>
      </div>`,
    );
    this.bind(el, 'help-close', onClose);
    this.keys({ Escape: onClose, Enter: onClose });
  }

  showPause(o: { onResume: () => void; onRestart: () => void; onHelp: () => void } & SoundCtl): void {
    const el = this.mount(
      'pause',
      `<div class="panel">
        <h1 class="title">已暂停</h1>
        <p class="subtitle">炉火暂歇，弹珠停在半空</p>
        <div class="btn-row">
          <button class="btn primary" data-testid="pause-resume">继续</button>
          <button class="btn" data-testid="pause-help">玩法说明</button>
          <button class="btn" data-testid="sound-toggle"></button>
          <button class="btn ghost" data-testid="pause-restart">重新开始</button>
        </div>
      </div>`,
    );
    this.bind(el, 'pause-resume', o.onResume);
    this.bind(el, 'pause-help', o.onHelp);
    this.bind(el, 'pause-restart', o.onRestart);
    this.soundButton(o, el);
    this.keys({ Escape: o.onResume, p: o.onResume, P: o.onResume });
  }

  showUpgrades(cards: UpgradeCardData[], hp: number, onPick: (id: UpgradeId) => void): void {
    const cardHtml = cards
      .map((c, i) => {
        const def = UPGRADES[c.id];
        let owned = '';
        if (def.tag === '可叠加') owned = c.owned > 0 ? `当前 ${c.owned} 层，选后 ${c.owned + 1} 层` : '尚未获得';
        else if (def.tag === '即时') owned = `当前生命 ${hp} / ${RULES.maxHp}`;
        return `<button class="card" style="--c:${def.color}" data-testid="card-${def.id}" data-id="${def.id}">
          <span class="key">${i + 1}</span>
          <div class="icon">${ICONS[def.id]}</div>
          <div class="name">${def.name}</div>
          <span class="tag">${def.tag}</span>
          <div class="desc">${def.desc}</div>
          <div class="owned">${owned}</div>
        </button>`;
      })
      .join('');
    const el = this.mount(
      'upgrade',
      `<div class="panel wide">
        <h1 class="title gold">炼成一项升级</h1>
        <p class="subtitle">三选一，选择后进入下一关</p>
        <div class="cards">${cardHtml}</div>
        <p class="note">升级会真实改变弹珠的行为，试试看</p>
      </div>`,
    );
    let picked = false;
    const pick = (id: UpgradeId) => {
      if (picked) return;
      picked = true;
      onPick(id);
    };
    el.querySelectorAll<HTMLButtonElement>('.card').forEach((b) => {
      b.addEventListener('click', () => pick(b.dataset.id as UpgradeId));
    });
    const keyMap: Record<string, () => void> = {};
    cards.forEach((c, i) => {
      keyMap[String(i + 1)] = () => pick(c.id);
    });
    this.keys(keyMap);
  }

  private summaryHtml(s: RunSummary): string {
    return `<div class="stats">
      <div class="stat"><span class="v">${s.level}</span><span class="l">到达关卡</span></div>
      <div class="stat"><span class="v">${s.totalDamage}</span><span class="l">总伤害</span></div>
      <div class="stat"><span class="v">${s.bestVolley}</span><span class="l">最高单轮</span></div>
      <div class="stat"><span class="v">${s.launches}</span><span class="l">发射次数</span></div>
      <div class="stat"><span class="v">${s.hits}</span><span class="l">碰撞次数</span></div>
      <div class="stat"><span class="v">${s.crits}</span><span class="l">暴击次数</span></div>
    </div>`;
  }

  showGameOver(s: RunSummary, onRestart: () => void): void {
    const el = this.mount(
      'gameover',
      `<div class="panel">
        <h1 class="title danger">炼金失败</h1>
        <p class="subtitle">坩埚炸了。整理思路，再来一炉。</p>
        ${this.summaryHtml(s)}
        <div class="btn-row"><button class="btn primary" data-testid="restart-btn">重新开始</button></div>
      </div>`,
    );
    this.bind(el, 'restart-btn', onRestart);
    this.keys({ Enter: onRestart, r: onRestart, R: onRestart });
  }

  showVictory(s: RunSummary, onRestart: () => void): void {
    const el = this.mount(
      'victory',
      `<div class="panel">
        <h1 class="title gold">炼金大成</h1>
        <p class="subtitle">炉心魔像化为灰烬，工坊重归安宁。</p>
        ${this.summaryHtml(s)}
        <div class="btn-row"><button class="btn primary" data-testid="restart-btn">再来一局</button></div>
      </div>`,
    );
    this.bind(el, 'restart-btn', onRestart);
    this.keys({ Enter: onRestart, r: onRestart, R: onRestart });
  }

  toast(text: string, ms = 1400): void {
    const old = this.root.querySelector('.toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    this.root.appendChild(t);
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => t.remove(), ms);
  }

  private keys(map: Record<string, () => void>): void {
    if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler);
    this.keyHandler = (e: KeyboardEvent) => {
      const fn = map[e.key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }
}
