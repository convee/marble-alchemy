import Phaser from 'phaser';
import type { VolleyTally } from '../core/runState';
import type { ScreenLayout, Pt } from '../core/screen';
import { ownedCount, UPGRADES, type Owned, type UpgradeId } from '../core/upgrades';
import { tallyTotal } from '../core/runState';
import { FONT } from './Effects';

export interface HudCallbacks {
  onPause: () => void;
  onToggleSound: () => boolean;
  onHelp: () => void;
}

type IconKind = 'pause' | 'sound' | 'help';

/**
 * 前端组件：画布内 HUD（关卡、敌人血条与反击意图、本轮蓄能、玩家生命药瓶、已获升级徽章、三个圆形按钮、提示与横幅）。
 * 职责：只展示传入的数值；不持有游戏状态。
 */
export class Hud {
  private scene: Phaser.Scene;
  private layout: ScreenLayout;
  private levelText: Phaser.GameObjects.Text;
  private nameText: Phaser.GameObjects.Text;
  private hpBar: Phaser.GameObjects.Graphics;
  private hpText: Phaser.GameObjects.Text;
  private intentText: Phaser.GameObjects.Text;
  private chargeValue: Phaser.GameObjects.Text;
  private chargeDetail: Phaser.GameObjects.Text;
  private flavorText: Phaser.GameObjects.Text;
  private flasks: Phaser.GameObjects.Image[] = [];
  private badgeLayer: Phaser.GameObjects.Container;
  private hintText: Phaser.GameObjects.Text;
  private soundIcon: Phaser.GameObjects.Graphics | null = null;
  private hpShown = { v: 0, max: 1 };
  private hpTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, layout: ScreenLayout, cb: HudCallbacks, muted: boolean) {
    this.scene = scene;
    this.layout = layout;
    const L = layout;
    const style = (size: number, color = '#e8f4ff'): Phaser.Types.GameObjects.Text.TextStyle => ({
      fontFamily: FONT,
      fontSize: `${size}px`,
      color,
      fontStyle: 'bold',
    });

    this.levelText = scene.add.text(L.levelLabel.x, L.levelLabel.y, '', style(20, '#9df7ff')).setOrigin(L.portrait ? 0 : 0.5, 0.5).setDepth(50);
    this.levelText.setShadow(0, 0, '#35f2ff', 12, false, true);
    this.nameText = scene.add.text(L.enemyName.x, L.enemyName.y, '', style(28, '#ffffff')).setOrigin(0.5).setDepth(50);
    this.nameText.setShadow(0, 0, '#ff3fd8', 14, false, true);
    this.hpBar = scene.add.graphics().setDepth(50);
    this.hpText = scene.add.text(L.enemyHpBar.x, L.enemyHpBar.y, '', style(14, '#ffffff')).setOrigin(0.5).setDepth(51);
    this.intentText = scene.add.text(L.intent.x, L.intent.y, '', style(15, '#ffb0d9')).setOrigin(0.5).setDepth(50);

    scene.add.text(L.charge.x, L.charge.y - 30, '本轮蓄能', style(14, '#8ea2c8')).setOrigin(0.5).setDepth(50);
    this.chargeValue = scene.add.text(L.charge.x, L.charge.y + 6, '0', style(40, '#ffffff')).setOrigin(0.5).setDepth(50);
    this.chargeValue.setShadow(0, 0, '#ffd36b', 16, false, true);
    this.chargeDetail = scene.add
      .text(L.chargeDetail.x, L.chargeDetail.y + 8, '', { ...style(13, '#8ea2c8'), wordWrap: { width: L.chargeDetailWidth }, align: 'center' })
      .setOrigin(0.5, 0)
      .setDepth(50);
    this.flavorText = scene.add
      .text(L.flavor?.x ?? 0, L.flavor?.y ?? 0, '', { ...style(13, '#8ea2c8'), fontStyle: 'normal', wordWrap: { width: 520 }, align: 'center' })
      .setOrigin(0.5)
      .setDepth(50)
      .setVisible(!!L.flavor);

    scene.add.text(L.playerHp.x, L.playerHp.y, '生命', style(15, '#ff9fcf')).setOrigin(0, 0.5).setDepth(50);
    for (let i = 0; i < 5; i++) {
      const img = scene.add.image(L.playerHp.x + 62 + i * 36, L.playerHp.y, 'flask-full').setDepth(50);
      this.flasks.push(img);
    }
    scene.add.text(L.upgrades.x, L.upgrades.y, '炼成', style(15, '#9df7ff')).setOrigin(0, 0.5).setDepth(50);
    this.badgeLayer = scene.add.container(L.upgrades.x + 62, L.upgrades.y).setDepth(50);

    this.hintText = scene.add
      .text(L.hint.x, L.hint.y, '', { ...style(15, '#9df7ff'), fontStyle: 'normal' })
      .setOrigin(0.5)
      .setDepth(50)
      .setAlpha(0.9);
    scene.tweens.add({ targets: this.hintText, alpha: 0.45, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    this.makeButton({ x: L.buttons.x, y: L.buttons.y }, 'pause', cb.onPause, 'btn-pause');
    this.makeButton({ x: L.buttons.x - L.buttons.gap, y: L.buttons.y }, 'sound', () => this.setMuted(cb.onToggleSound()), 'btn-sound');
    this.makeButton({ x: L.buttons.x - L.buttons.gap * 2, y: L.buttons.y }, 'help', cb.onHelp, 'btn-help');
    this.setMuted(muted);
  }

  get chargePos(): Pt {
    return { x: this.layout.charge.x, y: this.layout.charge.y + 6 };
  }

  private makeButton(at: Pt, kind: IconKind, onClick: () => void, name: string): void {
    const c = this.scene.add.container(at.x, at.y).setDepth(55);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0f1a36, 0.95);
    bg.fillCircle(0, 0, 22);
    bg.lineStyle(2, 0x35f2ff, 0.8);
    bg.strokeCircle(0, 0, 22);
    const icon = this.scene.add.graphics();
    this.drawIcon(icon, kind, false);
    if (kind === 'sound') this.soundIcon = icon;
    c.add([bg, icon]);
    if (kind === 'help') {
      c.add(this.scene.add.text(0, 0, '?', { fontFamily: FONT, fontSize: '22px', color: '#e8f4ff', fontStyle: 'bold' }).setOrigin(0.5));
    }
    c.setName(name);
    c.setSize(48, 48);
    // Container 的命中测试会先加上 displayOrigin（= 尺寸的一半），所以命中圆要以左上角为原点
    c.setInteractive(new Phaser.Geom.Circle(24, 24, 24), Phaser.Geom.Circle.Contains);
    if (c.input) c.input.cursor = 'pointer';
    c.on('pointerover', () => c.setScale(1.1));
    c.on('pointerout', () => c.setScale(1));
    c.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      onClick();
    });
  }

  private drawIcon(g: Phaser.GameObjects.Graphics, kind: IconKind, muted: boolean): void {
    g.clear();
    g.fillStyle(0xe8f4ff, 1);
    g.lineStyle(2.5, 0xe8f4ff, 1);
    if (kind === 'pause') {
      g.fillRoundedRect(-8, -9, 6, 18, 2);
      g.fillRoundedRect(2, -9, 6, 18, 2);
    } else if (kind === 'help') {
      // 问号用文本绘制，见 makeButton
    } else {
      g.fillRect(-11, -5, 6, 10);
      g.fillTriangle(-5, -5, 3, -11, 3, 11);
      g.fillTriangle(-5, 5, 3, 11, 3, -11);
      if (muted) {
        g.lineStyle(2.5, 0xff5fa2, 1);
        g.lineBetween(6, -6, 13, 6);
        g.lineBetween(13, -6, 6, 6);
      } else {
        g.lineStyle(2, 0x9df7ff, 1);
        g.beginPath();
        g.arc(4, 0, 7, -Math.PI / 3, Math.PI / 3, false);
        g.strokePath();
        g.beginPath();
        g.arc(4, 0, 11, -Math.PI / 3, Math.PI / 3, false);
        g.strokePath();
      }
    }
  }

  setMuted(muted: boolean): void {
    if (this.soundIcon) this.drawIcon(this.soundIcon, 'sound', muted);
  }

  setLevel(level: number, total: number, name: string): void {
    this.levelText.setText(`第 ${level} 关 / ${total}`);
    this.nameText.setText(name);
  }

  setFlavor(text: string): void {
    this.flavorText.setText(text);
  }

  setEnemyHp(hp: number, max: number, animate = true): void {
    this.hpShown.max = max;
    this.hpTween?.remove();
    if (!animate) {
      this.hpShown.v = hp;
      this.drawHp();
      return;
    }
    this.hpTween = this.scene.tweens.add({
      targets: this.hpShown,
      v: hp,
      duration: 420,
      ease: 'Cubic.Out',
      onUpdate: () => this.drawHp(),
      onComplete: () => this.drawHp(),
    });
  }

  private drawHp(): void {
    const L = this.layout.enemyHpBar;
    const g = this.hpBar;
    const w = L.w;
    const h = 20;
    const x = L.x - w / 2;
    const y = L.y - h / 2;
    const ratio = Phaser.Math.Clamp(this.hpShown.v / this.hpShown.max, 0, 1);
    g.clear();
    g.fillStyle(0x0a0f22, 0.95);
    g.fillRoundedRect(x, y, w, h, 10);
    if (ratio > 0) {
      g.fillGradientStyle(0xff3fd8, 0x8b5cff, 0xff3fd8, 0x8b5cff, 1, 1, 1, 1);
      g.fillRoundedRect(x + 2, y + 2, Math.max(8, (w - 4) * ratio), h - 4, 8);
    }
    g.lineStyle(2, 0xff3fd8, 0.7);
    g.strokeRoundedRect(x, y, w, h, 10);
    this.hpText.setText(`${Math.round(this.hpShown.v)} / ${this.hpShown.max}`);
  }

  setIntent(atk: number, alive: boolean): void {
    this.intentText.setText(alive ? `存活则反击 ${atk} 点生命` : '已被击败');
  }

  setCharge(t: VolleyTally, pop: boolean): void {
    const total = tallyTotal(t);
    this.chargeValue.setText(String(total));
    const parts: string[] = [];
    if (t.hit > 0) parts.push(`打击 ${t.hit}`);
    if (t.fire > 0) parts.push(`火焰 ${t.fire}`);
    if (t.lightning > 0) parts.push(`闪电 ${t.lightning}`);
    if (t.crits > 0) parts.push(`暴击 ${t.crits} 次`);
    this.chargeDetail.setText(parts.length ? parts.join(' · ') : '弹珠每撞一个钉子累计 1 点');
    if (pop) {
      this.scene.tweens.killTweensOf(this.chargeValue);
      this.chargeValue.setScale(1.3);
      this.scene.tweens.add({ targets: this.chargeValue, scale: 1, duration: 160, ease: 'Back.Out' });
    }
  }

  setPlayerHp(hp: number, max: number, animateLoss: boolean): void {
    this.flasks.forEach((f, i) => {
      const full = i < hp;
      const wasFull = f.texture.key === 'flask-full';
      f.setVisible(i < max);
      if (full && !wasFull) {
        f.setTexture('flask-full');
        f.setScale(0.4);
        this.scene.tweens.add({ targets: f, scale: 1, duration: 320, ease: 'Back.Out' });
      } else if (!full && wasFull) {
        if (animateLoss) {
          this.scene.tweens.add({
            targets: f,
            angle: 18,
            scale: 1.35,
            duration: 140,
            yoyo: true,
            onComplete: () => {
              f.setAngle(0).setScale(1);
              f.setTexture('flask-empty');
            },
          });
        } else {
          f.setTexture('flask-empty');
        }
      }
    });
  }

  setUpgrades(owned: Owned): void {
    this.badgeLayer.removeAll(true);
    const ids: UpgradeId[] = ['strengthen', 'fire', 'lightning', 'split', 'crit'];
    let x = 0;
    for (const id of ids) {
      const count = ownedCount(owned, id);
      if (count <= 0) continue;
      const def = UPGRADES[id];
      const stack = def.tag === '可叠加' ? ` ×${count}` : '';
      const label = `${def.short}${stack}`;
      const t = this.scene.add.text(0, 0, label, { fontFamily: FONT, fontSize: '14px', color: def.color, fontStyle: 'bold' }).setOrigin(0.5);
      const w = t.width + 16;
      const g = this.scene.add.graphics();
      g.fillStyle(0x0f1a36, 0.95);
      g.fillRoundedRect(-w / 2, -13, w, 26, 8);
      g.lineStyle(1.5, def.tint, 0.9);
      g.strokeRoundedRect(-w / 2, -13, w, 26, 8);
      const c = this.scene.add.container(x + w / 2, 0, [g, t]);
      this.badgeLayer.add(c);
      x += w + 8;
    }
  }

  setHint(text: string): void {
    this.hintText.setText(text);
  }

  banner(title: string, sub: string, onDone?: () => void): void {
    const L = this.layout.banner;
    const bg = this.scene.add.graphics().setDepth(60);
    bg.fillStyle(0x06101f, 0.78);
    bg.fillRect(L.x - 270, L.y - 60, 540, 120);
    bg.lineStyle(2, 0xffd36b, 0.8);
    bg.lineBetween(L.x - 240, L.y - 60, L.x + 240, L.y - 60);
    bg.lineBetween(L.x - 240, L.y + 60, L.x + 240, L.y + 60);
    const t1 = this.scene.add.text(L.x, L.y - 16, title, { fontFamily: FONT, fontSize: '40px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(61);
    t1.setShadow(0, 0, '#ffd36b', 18, false, true);
    const t2 = this.scene.add.text(L.x, L.y + 28, sub, { fontFamily: FONT, fontSize: '18px', color: '#9df7ff' }).setOrigin(0.5).setDepth(61);
    const all = [bg, t1, t2];
    all.forEach((o) => o.setAlpha(0));
    t1.setScale(1.4);
    this.scene.tweens.add({ targets: all, alpha: 1, duration: 220 });
    this.scene.tweens.add({ targets: t1, scale: 1, duration: 320, ease: 'Back.Out' });
    this.scene.tweens.add({
      targets: all,
      alpha: 0,
      delay: 1000,
      duration: 260,
      onComplete: () => {
        all.forEach((o) => o.destroy());
        onDone?.();
      },
    });
  }
}
