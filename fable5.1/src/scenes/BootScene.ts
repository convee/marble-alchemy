import Phaser from 'phaser';
import { BOARD } from '../core/balance';

/**
 * 文件模块：启动场景，程序化生成全部纹理（弹珠、钉子、光斑、药瓶、五个敌人），不加载任何外部图片。
 * 约束：纹理只生成一次；重开游戏（GameScene.restart）不会回到本场景。
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.makeRadial('glow', 128, [
      [0, 'rgba(255,255,255,0.9)'],
      [0.3, 'rgba(255,255,255,0.35)'],
      [1, 'rgba(255,255,255,0)'],
    ]);
    this.makeRadial('spark', 16, [
      [0, 'rgba(255,255,255,1)'],
      [0.5, 'rgba(255,255,255,0.6)'],
      [1, 'rgba(255,255,255,0)'],
    ]);
    this.makeDot();
    this.makeMarble();
    this.makePeg();
    this.makeOrb();
    this.makeFlask('flask-full', true);
    this.makeFlask('flask-empty', false);
    this.makeEnemies();
    this.scene.start('Game', { seed: this.registry.get('seed') as number | undefined });
  }

  private canvas(key: string, w: number, h: number): CanvasRenderingContext2D {
    const tex = this.textures.createCanvas(key, w, h);
    if (!tex) throw new Error(`createCanvas failed: ${key}`);
    return tex.context;
  }

  private refresh(key: string): void {
    const tex = this.textures.get(key) as Phaser.Textures.CanvasTexture;
    tex.refresh();
  }

  private makeRadial(key: string, size: number, stops: Array<[number, string]>): void {
    const ctx = this.canvas(key, size, size);
    const r = size / 2;
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    for (const [o, c] of stops) g.addColorStop(o, c);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    this.refresh(key);
  }

  private makeDot(): void {
    const ctx = this.canvas('dot', 12, 12);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(6, 6, 4.5, 0, Math.PI * 2);
    ctx.fill();
    this.refresh('dot');
  }

  private makeMarble(): void {
    const s = 36;
    const r = BOARD.marbleRadius;
    const ctx = this.canvas('marble', s, s);
    const c = s / 2;
    const g = ctx.createRadialGradient(c - 4, c - 4, 1, c, c, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.3, '#b9f3ff');
    g.addColorStop(0.75, '#3aa7ff');
    g.addColorStop(1, '#1b4fa8');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(c - 4, c - 5, 3.2, 2, -0.6, 0, Math.PI * 2);
    ctx.fill();
    this.refresh('marble');
  }

  private makePeg(): void {
    const s = 28;
    const r = BOARD.pegRadius;
    const ctx = this.canvas('peg', s, s);
    const c = s / 2;
    const g = ctx.createRadialGradient(c - 2.5, c - 2.5, 1, c, c, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, '#dcdcdc');
    g.addColorStop(1, '#8a8a8a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    this.refresh('peg');
  }

  private makeOrb(): void {
    const s = 48;
    const ctx = this.canvas('orb', s, s);
    const c = s / 2;
    const g = ctx.createRadialGradient(c, c, 2, c, c, c);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, '#ffe9a8');
    g.addColorStop(0.7, 'rgba(255,211,107,0.7)');
    g.addColorStop(1, 'rgba(255,211,107,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    this.refresh('orb');
  }

  private makeFlask(key: string, full: boolean): void {
    const w = 30;
    const h = 40;
    const ctx = this.canvas(key, w, h);
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(11, 3);
      ctx.lineTo(19, 3);
      ctx.lineTo(19, 13);
      ctx.bezierCurveTo(27, 18, 28, 30, 22, 36);
      ctx.lineTo(8, 36);
      ctx.bezierCurveTo(2, 30, 3, 18, 11, 13);
      ctx.closePath();
    };
    if (full) {
      path();
      ctx.save();
      ctx.clip();
      const g = ctx.createLinearGradient(0, 14, 0, 36);
      g.addColorStop(0, '#ff8ac2');
      g.addColorStop(1, '#ff3fa0');
      ctx.fillStyle = g;
      ctx.fillRect(0, 15, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(11, 26, 3, 6, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    path();
    ctx.strokeStyle = full ? '#ffd1e8' : 'rgba(142,162,200,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = full ? '#ffd1e8' : 'rgba(142,162,200,0.5)';
    ctx.fillRect(9, 1, 12, 3);
    if (full) {
      ctx.shadowColor = '#ff5fa2';
      ctx.shadowBlur = 8;
      path();
      ctx.stroke();
    }
    this.refresh(key);
  }

  /* 五个敌人，全部用 Graphics 画后生成纹理，尺寸统一 260x260，脚底在 y=232 附近。 */
  private makeEnemies(): void {
    const S = 260;
    const draw = (key: string, fn: (g: Phaser.GameObjects.Graphics) => void) => {
      const g = this.add.graphics();
      fn(g);
      g.generateTexture(key, S, S);
      g.destroy();
    };

    draw('enemy-slime', (g) => {
      g.fillStyle(0x1f6f33, 0.9);
      g.fillEllipse(130, 186, 200, 120);
      g.fillStyle(0x5fe36b);
      g.fillEllipse(130, 170, 182, 128);
      g.fillStyle(0x8cff92, 0.55);
      g.fillEllipse(98, 128, 66, 34);
      g.fillStyle(0x5fe36b);
      g.fillEllipse(62, 236, 26, 16);
      g.fillEllipse(196, 240, 20, 12);
      g.fillEllipse(146, 246, 16, 10);
      g.lineStyle(3, 0xc9ffc4, 0.7);
      g.strokeEllipse(130, 170, 182, 128);
      g.fillStyle(0xffffff);
      g.fillCircle(104, 156, 18);
      g.fillCircle(158, 156, 18);
      g.fillStyle(0x0a1a12);
      g.fillCircle(108, 159, 9);
      g.fillCircle(162, 159, 9);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(104, 154, 3);
      g.fillCircle(158, 154, 3);
      g.lineStyle(5, 0x0a1a12, 1);
      g.beginPath();
      g.arc(131, 188, 24, Math.PI * 0.15, Math.PI * 0.85, false);
      g.strokePath();
      g.fillStyle(0x0a1a12);
      g.fillCircle(52, 150, 5);
      g.fillCircle(210, 140, 4);
    });

    draw('enemy-goblin', (g) => {
      // 身体
      g.fillStyle(0x4a3b2a);
      g.fillRoundedRect(92, 150, 76, 82, 14);
      g.fillStyle(0x6a5238);
      g.fillRoundedRect(100, 158, 60, 30, 8);
      // 手 + 贤者之石碎片
      g.fillStyle(0x7bb342);
      g.fillCircle(84, 206, 13);
      g.fillCircle(176, 206, 13);
      g.fillStyle(0xffd36b);
      g.fillPoints([{ x: 176, y: 172 }, { x: 194, y: 196 }, { x: 176, y: 220 }, { x: 158, y: 196 }], true);
      g.lineStyle(2, 0xfff3c4, 0.9);
      g.strokePoints([{ x: 176, y: 172 }, { x: 194, y: 196 }, { x: 176, y: 220 }, { x: 158, y: 196 }], true, true);
      // 头
      g.fillStyle(0x7bb342);
      g.fillPoints(
        [
          { x: 70, y: 96 },
          { x: 130, y: 60 },
          { x: 190, y: 96 },
          { x: 180, y: 150 },
          { x: 130, y: 166 },
          { x: 80, y: 150 },
        ],
        true,
      );
      // 耳朵
      g.fillTriangle(72, 100, 20, 70, 78, 132);
      g.fillTriangle(188, 100, 240, 70, 182, 132);
      g.fillStyle(0x4e7a2a);
      g.fillTriangle(70, 104, 36, 84, 76, 126);
      g.fillTriangle(190, 104, 224, 84, 184, 126);
      // 眼
      g.fillStyle(0xffe94a);
      g.fillTriangle(88, 112, 122, 104, 116, 126);
      g.fillTriangle(172, 112, 138, 104, 144, 126);
      g.fillStyle(0x1a1a0a);
      g.fillCircle(108, 116, 4);
      g.fillCircle(152, 116, 4);
      // 嘴与牙
      g.lineStyle(4, 0x1e2a10, 1);
      g.lineBetween(100, 144, 160, 144);
      g.fillStyle(0xfff6d6);
      g.fillTriangle(104, 144, 112, 144, 108, 154);
      g.fillTriangle(124, 144, 134, 144, 129, 156);
      g.fillTriangle(146, 144, 156, 144, 151, 154);
      g.lineStyle(3, 0xd7ff9a, 0.55);
      g.strokePoints(
        [
          { x: 70, y: 96 },
          { x: 130, y: 60 },
          { x: 190, y: 96 },
          { x: 180, y: 150 },
          { x: 130, y: 166 },
          { x: 80, y: 150 },
        ],
        true,
        true,
      );
    });

    draw('enemy-gargoyle', (g) => {
      // 翅膀
      g.fillStyle(0x3a3f52);
      g.fillPoints([{ x: 96, y: 130 }, { x: 14, y: 70 }, { x: 30, y: 150 }, { x: 60, y: 130 }, { x: 88, y: 176 }], true);
      g.fillPoints([{ x: 164, y: 130 }, { x: 246, y: 70 }, { x: 230, y: 150 }, { x: 200, y: 130 }, { x: 172, y: 176 }], true);
      g.lineStyle(2, 0x6b7390, 0.8);
      g.lineBetween(96, 130, 14, 70);
      g.lineBetween(96, 130, 30, 150);
      g.lineBetween(164, 130, 246, 70);
      g.lineBetween(164, 130, 230, 150);
      // 身体
      g.fillStyle(0x7d8797);
      g.fillRoundedRect(86, 110, 88, 120, 22);
      g.fillStyle(0x99a3b5);
      g.fillRoundedRect(96, 120, 68, 48, 14);
      // 脚
      g.fillStyle(0x5e6779);
      g.fillRoundedRect(92, 216, 30, 22, 6);
      g.fillRoundedRect(138, 216, 30, 22, 6);
      // 头 + 角
      g.fillStyle(0x8d97a8);
      g.fillCircle(130, 92, 36);
      g.fillStyle(0x5e6779);
      g.fillTriangle(104, 66, 92, 30, 118, 60);
      g.fillTriangle(156, 66, 168, 30, 142, 60);
      // 眼
      g.fillStyle(0xff3b3b);
      g.fillCircle(116, 92, 7);
      g.fillCircle(144, 92, 7);
      g.fillStyle(0xffd0d0, 0.9);
      g.fillCircle(116, 90, 2.5);
      g.fillCircle(144, 90, 2.5);
      // 嘴
      g.lineStyle(3, 0x2c3040, 1);
      g.lineBetween(114, 112, 146, 112);
      g.fillStyle(0xe6ecf5);
      g.fillTriangle(118, 112, 126, 112, 122, 104);
      g.fillTriangle(134, 112, 142, 112, 138, 104);
      // 裂纹与符文
      g.lineStyle(2, 0x2c3040, 0.9);
      g.lineBetween(100, 180, 112, 200);
      g.lineBetween(112, 200, 108, 216);
      g.lineBetween(154, 150, 164, 176);
      g.lineStyle(2, 0x35f2ff, 0.9);
      g.strokeCircle(130, 190, 12);
      g.lineBetween(122, 190, 138, 190);
      g.lineBetween(130, 182, 130, 198);
    });

    draw('enemy-warlock', (g) => {
      // 悬浮法球
      g.fillStyle(0xff3fd8, 0.9);
      g.fillCircle(52, 120, 9);
      g.fillCircle(208, 100, 8);
      g.fillCircle(40, 190, 6);
      g.fillStyle(0xff3fd8, 0.25);
      g.fillCircle(52, 120, 18);
      g.fillCircle(208, 100, 16);
      g.fillCircle(40, 190, 12);
      // 法杖
      g.lineStyle(5, 0x2a1b48, 1);
      g.lineBetween(196, 128, 208, 236);
      g.fillStyle(0xc58bff);
      g.fillCircle(194, 122, 11);
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(191, 119, 4);
      // 长袍
      g.fillStyle(0x3a1f70);
      g.fillPoints([{ x: 130, y: 44 }, { x: 196, y: 236 }, { x: 64, y: 236 }], true);
      g.fillStyle(0x4d2b90);
      g.fillPoints([{ x: 130, y: 60 }, { x: 176, y: 232 }, { x: 84, y: 232 }], true);
      // 兜帽与面孔黑洞
      g.fillStyle(0x2a1550);
      g.fillCircle(130, 92, 40);
      g.fillStyle(0x0a0614);
      g.fillEllipse(130, 100, 50, 46);
      g.fillStyle(0xff3fd8);
      g.fillEllipse(118, 98, 12, 7);
      g.fillEllipse(142, 98, 12, 7);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(118, 97, 2);
      g.fillCircle(142, 97, 2);
      // 袍上的符纹
      g.lineStyle(2, 0xc58bff, 0.8);
      g.lineBetween(130, 140, 130, 210);
      g.lineBetween(116, 160, 144, 160);
      g.lineBetween(120, 190, 140, 190);
      g.lineStyle(3, 0xc58bff, 0.45);
      g.strokePoints([{ x: 130, y: 44 }, { x: 196, y: 236 }, { x: 64, y: 236 }], true, true);
    });

    draw('enemy-golem', (g) => {
      // 肩与臂
      g.fillStyle(0x5a4636);
      g.fillRoundedRect(22, 96, 56, 120, 16);
      g.fillRoundedRect(182, 96, 56, 120, 16);
      g.fillStyle(0x7a5f48);
      g.fillRoundedRect(30, 104, 40, 60, 12);
      g.fillRoundedRect(190, 104, 40, 60, 12);
      // 腿
      g.fillStyle(0x4a3828);
      g.fillRoundedRect(84, 196, 38, 44, 8);
      g.fillRoundedRect(138, 196, 38, 44, 8);
      // 躯干
      g.fillStyle(0x6e5642);
      g.fillRoundedRect(72, 80, 116, 130, 22);
      g.fillStyle(0x8a6f56);
      g.fillRoundedRect(82, 88, 96, 40, 14);
      // 炉心
      g.fillStyle(0xff8a3d, 0.35);
      g.fillCircle(130, 150, 40);
      g.fillStyle(0xff8a3d);
      g.fillCircle(130, 150, 26);
      g.fillStyle(0xffd36b);
      g.fillCircle(130, 150, 16);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(126, 146, 6);
      // 头
      g.fillStyle(0x7a5f48);
      g.fillRoundedRect(96, 30, 68, 58, 14);
      g.fillStyle(0xff8a3d);
      g.fillRect(108, 52, 16, 8);
      g.fillRect(136, 52, 16, 8);
      g.fillStyle(0xffd36b, 0.9);
      g.fillRect(112, 54, 6, 4);
      g.fillRect(140, 54, 6, 4);
      // 裂纹发光
      g.lineStyle(2, 0xff8a3d, 0.9);
      g.lineBetween(96, 120, 108, 140);
      g.lineBetween(108, 140, 100, 160);
      g.lineBetween(166, 116, 156, 136);
      g.lineBetween(156, 136, 164, 166);
      g.lineBetween(130, 176, 122, 200);
      g.lineStyle(3, 0xffb27a, 0.5);
      g.strokeRoundedRect(72, 80, 116, 130, 22);
    });
  }
}
