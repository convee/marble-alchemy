import { RULES } from "../core/balance";
import { UPGRADES, type UpgradeId } from "../core/upgrades";
import { track } from "../analytics";

/**
 * 前端组件：DOM 覆盖层（开始/说明/暂停/升级/失败/胜利）。
 * 职责：负责菜单与卡片的展示和点击回调；不负责任何游戏规则（规则在 core/ 与 GameScene）。
 * 约束：同一时刻只有一个覆盖层；覆盖层打开时拦截全部指针事件，画布收不到输入。
 */
export type OverlayKind =
  | "start"
  | "help"
  | "pause"
  | "upgrade"
  | "gameover"
  | "victory";

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
  fire: '<svg viewBox="0 0 24 24"><path d="M12 2.5c.8 3.2 4.5 5 4.5 9.5A4.5 4.5 0 0 1 7.5 12c0-1.6.7-2.8 1.6-3.7.1 1.5 1 2.4 1.9 2.2 1-.3.6-3.4 1-8z"/><path class="f" d="M12 21a3 3 0 0 1-3-3c0-1.6 1.3-2.5 3-4.6 1.7 2.1 3 3 3 4.6a3 3 0 0 1-3 3z"/></svg>',
  lightning:
    '<svg viewBox="0 0 24 24"><path d="M13 2L5 14h6l-1 8 8-12h-6l1-8z"/></svg>',
  split:
    '<svg viewBox="0 0 24 24"><circle class="f" cx="12" cy="5.5" r="2.6"/><circle class="f" cx="5.5" cy="18.5" r="2.6"/><circle class="f" cx="18.5" cy="18.5" r="2.6"/><path d="M12 8.2L7 15.8M12 8.2l5 7.6"/></svg>',
  crit: '<svg viewBox="0 0 24 24"><path d="M12 2l2.2 6.3L20.5 10l-6.3 1.7L12 18l-2.2-6.3L3.5 10l6.3-1.7z"/><path d="M19 17l2 2M5 17l-2 2M12 20v2"/></svg>',
  heal: '<svg viewBox="0 0 24 24"><path d="M9 2.5h6M10 2.5v5.2l-5.2 9A3 3 0 0 0 7.4 21h9.2a3 3 0 0 0 2.6-4.3L14 7.7V2.5"/><path d="M12 11v6M9 14h6"/></svg>',
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
      window.removeEventListener("keydown", this.keyHandler);
      this.keyHandler = null;
    }
    this.current = null;
  }

  private mount(kind: OverlayKind, html: string): HTMLElement {
    this.hide();
    const el = document.createElement("div");
    el.className = "overlay";
    el.dataset.overlay = kind;
    el.innerHTML = html;
    this.root.appendChild(el);
    this.el = el;
    this.current = kind;
    return el;
  }

  private bind(el: HTMLElement, id: string, fn: () => void): void {
    const btn = el.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    if (btn) btn.addEventListener("click", fn);
  }

  private soundButton(ctl: SoundCtl, el: HTMLElement): void {
    const btn = el.querySelector<HTMLButtonElement>(
      '[data-testid="sound-toggle"]',
    );
    if (!btn) return;
    const render = (muted: boolean) => {
      btn.textContent = muted ? "Sound: off" : "Sound: on";
    };
    render(ctl.muted);
    btn.addEventListener("click", () => render(ctl.onToggleSound()));
  }

  private rulesHtml(): string {
    return `
      <div class="rules">
        <h3>How to play</h3>
        <ul>
          <li><b>Drag and hold</b> inside the board to aim, then <b>release</b> to launch (mouse and touch both work; Space launches along the current aim line).</li>
          <li>Each peg hit adds <span class="k">1 damage</span>. Hit pegs go dark and relight before the next launch.</li>
          <li>Hitting a <b>green recharge stone</b> immediately relights every dark peg.</li>
          <li>When all marbles land, the stored damage is dealt to the enemy at once.</li>
          <li>If the enemy survives, it <b>retaliates</b> and removes its attack value from your health. At zero health, the run ends.</li>
          <li>After defeating an enemy, choose 1 of 3 upgrades and enter the next stage. There are <span class="k">5 stages</span>; defeat the Core Golem to win.</li>
        </ul>
        <h3>Upgrades</h3>
        <ul>
          <li><b>Strengthen</b> (stackable): +1 base damage per collision; critical hits double base damage.</li>
          <li><b>Fire</b> (stackable): +1 fire damage per collision, unaffected by critical hits.</li>
          <li><b>Lightning</b>: each collision deals 1 damage to the two nearest other pegs; chains do not chain.</li>
          <li><b>Split</b>: the first collision of each shot creates 2 extra marbles; new marbles do not split.</li>
          <li><b>Critical</b>: each collision has a 20% chance to double its damage.</li>
          <li><b>Heal</b>: restore 2 health immediately, up to ${RULES.maxHp}.</li>
        </ul>
        <h3>Shortcuts</h3>
        <ul>
          <li>Esc / P pauses or resumes, M toggles sound, Space launches, and 1 / 2 / 3 choose an upgrade.</li>
        </ul>
      </div>`;
  }

  showStart(o: { onStart: () => void } & SoundCtl): void {
    const el = this.mount(
      "start",
      `<div class="panel">
        <h1 class="title">Marble Alchemy</h1>
        <p class="subtitle">Aim · Launch · Charge · Settle · Upgrade</p>
        ${this.rulesHtml()}
        <div class="btn-row">
          <button class="btn primary" data-testid="start-btn">Start alchemy</button>
          <button class="btn ghost" data-testid="sound-toggle"></button>
        </div>
      </div>`,
    );
    this.bind(el, "start-btn", o.onStart);
    this.soundButton(o, el);
  }

  showHelp(onClose: () => void): void {
    const el = this.mount(
      "help",
      `<div class="panel">
        <h1 class="title">How to play</h1>
        ${this.rulesHtml()}
        <div class="btn-row"><button class="btn primary" data-testid="help-close">Got it</button></div>
      </div>`,
    );
    this.bind(el, "help-close", onClose);
    this.keys({ Escape: onClose, Enter: onClose });
  }

  showPause(
    o: {
      onResume: () => void;
      onRestart: () => void;
      onHelp: () => void;
    } & SoundCtl,
  ): void {
    const el = this.mount(
      "pause",
      `<div class="panel">
        <h1 class="title">Paused</h1>
        <p class="subtitle">The furnace rests; the marbles hang in midair</p>
        <div class="btn-row">
          <button class="btn primary" data-testid="pause-resume">Resume</button>
          <button class="btn" data-testid="pause-help">How to play</button>
          <button class="btn" data-testid="sound-toggle"></button>
          <button class="btn ghost" data-testid="pause-restart">Restart</button>
        </div>
      </div>`,
    );
    this.bind(el, "pause-resume", o.onResume);
    this.bind(el, "pause-help", o.onHelp);
    this.bind(el, "pause-restart", o.onRestart);
    this.soundButton(o, el);
    this.keys({ Escape: o.onResume, p: o.onResume, P: o.onResume });
  }

  showUpgrades(
    cards: UpgradeCardData[],
    hp: number,
    onPick: (id: UpgradeId) => void,
  ): void {
    const cardHtml = cards
      .map((c, i) => {
        const def = UPGRADES[c.id];
        let owned = "";
        if (def.tag === "Stackable")
          owned =
            c.owned > 0
              ? `${c.owned} stacks now, ${c.owned + 1} after picking`
              : "Not owned yet";
        else if (def.tag === "Instant") owned = `Health ${hp} / ${RULES.maxHp}`;
        return `<button class="card" style="--c:${def.color}" data-testid="card-${def.id}" data-id="${def.id}">
          <span class="key">${i + 1}</span>
          <div class="icon">${ICONS[def.id]}</div>
          <div class="name">${def.name}</div>
          <span class="tag">${def.tag}</span>
          <div class="desc">${def.desc}</div>
          <div class="owned">${owned}</div>
        </button>`;
      })
      .join("");
    const el = this.mount(
      "upgrade",
      `<div class="panel wide">
        <h1 class="title gold">Transmute an upgrade</h1>
        <p class="subtitle">Choose 1 of 3, then enter the next stage</p>
        <div class="cards">${cardHtml}</div>
        <p class="note">Upgrades change how the marbles behave. Try one.</p>
      </div>`,
    );
    let picked = false;
    const pick = (id: UpgradeId) => {
      if (picked) return;
      picked = true;
      onPick(id);
    };
    el.querySelectorAll<HTMLButtonElement>(".card").forEach((b) => {
      b.addEventListener("click", () => pick(b.dataset.id as UpgradeId));
    });
    const keyMap: Record<string, () => void> = {};
    cards.forEach((c, i) => {
      keyMap[String(i + 1)] = () => pick(c.id);
    });
    this.keys(keyMap);
  }

  private summaryHtml(s: RunSummary): string {
    return `<div class="stats">
      <div class="stat"><span class="v">${s.level}</span><span class="l">Stage reached</span></div>
      <div class="stat"><span class="v">${s.totalDamage}</span><span class="l">Total damage</span></div>
      <div class="stat"><span class="v">${s.bestVolley}</span><span class="l">Best volley</span></div>
      <div class="stat"><span class="v">${s.launches}</span><span class="l">Launches</span></div>
      <div class="stat"><span class="v">${s.hits}</span><span class="l">Collisions</span></div>
      <div class="stat"><span class="v">${s.crits}</span><span class="l">Critical hits</span></div>
    </div>`;
  }

  showGameOver(
    s: RunSummary,
    onRestart: () => void,
    onShare?: () => void,
  ): void {
    const el = this.mount(
      "gameover",
      `<div class="panel">
        <h1 class="title danger">Alchemy failed</h1>
        <p class="subtitle">The crucible blew. Regroup and try another run.</p>
        ${this.summaryHtml(s)}
        <div class="btn-row"><button class="btn primary" data-testid="restart-btn">Restart</button>${onShare ? '<button class="btn ghost" data-testid="share-btn">Share result</button>' : ""}<a class="btn secondary" data-testid="support-btn" href="../support.html?utm_source=game&amp;utm_campaign=post_run&amp;utm_content=fable5_1">Support the workshop</a></div>
      </div>`,
    );
    this.bind(el, "restart-btn", onRestart);
    if (onShare) this.bind(el, "share-btn", onShare);
    this.bindSupport(el, "lost");
    this.keys({ Enter: onRestart, r: onRestart, R: onRestart });
  }

  showVictory(
    s: RunSummary,
    onRestart: () => void,
    onShare?: () => void,
  ): void {
    const el = this.mount(
      "victory",
      `<div class="panel">
        <h1 class="title gold">Alchemy complete</h1>
        <p class="subtitle">The Core Golem turns to ash and the workshop is at peace.</p>
        ${this.summaryHtml(s)}
        <div class="btn-row"><button class="btn primary" data-testid="restart-btn">Play again</button>${onShare ? '<button class="btn ghost" data-testid="share-btn">Share result</button>' : ""}<a class="btn secondary" data-testid="support-btn" href="../support.html?utm_source=game&amp;utm_campaign=post_run&amp;utm_content=fable5_1">Support the workshop</a></div>
      </div>`,
    );
    this.bind(el, "restart-btn", onRestart);
    if (onShare) this.bind(el, "share-btn", onShare);
    this.bindSupport(el, "won");
    this.keys({ Enter: onRestart, r: onRestart, R: onRestart });
  }

  private bindSupport(el: HTMLElement, result: "won" | "lost"): void {
    const button = el.querySelector<HTMLElement>('[data-testid="support-btn"]');
    button?.addEventListener("click", () =>
      track("cta_click", { target: "post_run_support", result }),
    );
  }

  toast(text: string, ms = 1400): void {
    const old = this.root.querySelector(".toast");
    if (old) old.remove();
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = text;
    this.root.appendChild(t);
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => t.remove(), ms);
  }

  private keys(map: Record<string, () => void>): void {
    if (this.keyHandler) window.removeEventListener("keydown", this.keyHandler);
    this.keyHandler = (e: KeyboardEvent) => {
      const fn = map[e.key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener("keydown", this.keyHandler);
  }
}
