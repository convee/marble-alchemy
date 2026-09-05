import { expect, test } from '@playwright/test';
import { boot, collectErrors, gamePoint, getState, volley, waitOverlay, waitPhase } from './helpers';
import { computeLayout } from '../src/core/screen';
import { BOARD, LEVELS, RULES } from '../src/core/balance';

test.describe('弹珠炼金工坊 端到端', () => {
  test('加载无报错，开始菜单可进入第一关', async ({ page }) => {
    const errors = collectErrors(page);
    const s = await boot(page);
    expect(s.phase).toBe('ready');
    expect(s.level).toBe(1);
    expect(s.playerHp).toBe(RULES.maxHp);
    expect(s.enemyHp).toBe(LEVELS[0].hp);
    expect(s.activePegs).toBe(s.totalPegs);
    expect(s.overlay).toBeNull();
    expect(errors).toEqual([]);
  });

  test('一轮发射：累计伤害只结算一次，敌人存活则反击一次', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => window.__marble!.setEnemyHp(9999));
    const s = await volley(page, 90);
    expect(s.stats.launches).toBe(1);
    expect(s.stats.hits).toBeGreaterThan(0);
    expect(s.stats.totalDamage).toBe(s.stats.hits);
    expect(s.enemyHp).toBe(9999 - s.stats.totalDamage);
    expect(s.playerHp).toBe(RULES.maxHp - LEVELS[0].atk);
    expect(s.stats.damageTaken).toBe(LEVELS[0].atk);
    expect(s.volley.total).toBe(0);
    expect(s.marbles).toBe(0);
    expect(s.activePegs).toBe(s.totalPegs);
  });

  test('鼠标在弹盘内按下拖动松开即发射，触屏点按同样发射', async ({ page, browser }) => {
    await boot(page);
    const L = computeLayout(false);
    const p1 = await gamePoint(page, L.board.x + BOARD.width / 2, L.board.y + 200);
    const p2 = await gamePoint(page, L.board.x + BOARD.width / 2 + 80, L.board.y + 320);
    await page.mouse.move(p1.x, p1.y);
    await page.mouse.down();
    await page.mouse.move(p2.x, p2.y, { steps: 5 });
    await page.mouse.up();
    const s = await waitPhase(page, ['flying', 'settle', 'enemyTurn', 'ready', 'upgrading']);
    expect(s.stats.launches).toBe(1);

    const ctx = await browser.newContext({ hasTouch: true, viewport: { width: 1280, height: 800 } });
    const tp = await ctx.newPage();
    await boot(tp);
    const tap = await gamePoint(tp, L.board.x + BOARD.width / 2 - 60, L.board.y + 260);
    await tp.touchscreen.tap(tap.x, tap.y);
    const ts = await waitPhase(tp, ['flying', 'settle', 'enemyTurn', 'ready', 'upgrading']);
    expect(ts.stats.launches).toBe(1);
    await ctx.close();
  });

  test('弹盘外点击不会发射；HUD 暂停按钮可暂停', async ({ page }) => {
    await boot(page);
    const L = computeLayout(false);
    const outside = await gamePoint(page, L.enemy.x, L.enemy.y);
    await page.mouse.click(outside.x, outside.y);
    await page.waitForTimeout(300);
    expect((await getState(page)).stats.launches).toBe(0);
    const pauseBtn = await gamePoint(page, L.buttons.x, L.buttons.y);
    await page.mouse.click(pauseBtn.x, pauseBtn.y);
    await waitOverlay(page, 'pause');
    expect((await getState(page)).paused).toBe(true);
    await page.getByTestId('pause-resume').click();
    await page.waitForFunction(() => window.__marble!.getState()!.paused === false);
    expect((await getState(page)).overlay).toBeNull();
  });

  test('强化：每次碰撞伤害变为 2', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      window.__marble!.grant('strengthen');
      window.__marble!.setEnemyHp(9999);
    });
    const s = await volley(page, 100);
    expect(s.upgrades.strengthen).toBe(1);
    expect(s.stats.hits).toBeGreaterThan(0);
    expect(s.stats.totalDamage).toBe(s.stats.hits * 2);
  });

  test('火焰：每次碰撞额外累计 1 点火焰伤害', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      window.__marble!.grant('fire');
      window.__marble!.setEnemyHp(9999);
    });
    await page.evaluate(() => window.__marble!.fire(85));
    let sawFire = false;
    for (let i = 0; i < 400; i++) {
      const s = await getState(page);
      if (s.volley.fire > 0 && s.volley.fire === s.volley.hits) sawFire = true;
      if (s.phase === 'ready' && s.stats.launches === 1) break;
      await page.waitForTimeout(100);
    }
    const s = await getState(page);
    expect(sawFire).toBe(true);
    expect(s.stats.totalDamage).toBe(s.stats.hits * 2);
  });

  test('闪电：每次碰撞最多对另外两个钉子各 1 点', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      window.__marble!.grant('lightning');
      window.__marble!.setEnemyHp(9999);
    });
    await page.evaluate(() => window.__marble!.fire(95));
    let maxLightning = 0;
    let hitsAtMax = 0;
    for (let i = 0; i < 400; i++) {
      const s = await getState(page);
      if (s.volley.lightning > maxLightning) {
        maxLightning = s.volley.lightning;
        hitsAtMax = s.volley.hits;
      }
      if (s.phase === 'ready' && s.stats.launches === 1) break;
      await page.waitForTimeout(100);
    }
    const s = await getState(page);
    expect(maxLightning).toBeGreaterThan(0);
    expect(maxLightning).toBeLessThanOrEqual(hitsAtMax * 2);
    expect(s.stats.totalDamage).toBeGreaterThan(s.stats.hits);
    expect(s.stats.totalDamage).toBeLessThanOrEqual(s.stats.hits * 3);
  });

  test('分裂：首次碰撞后同时存在 3 颗弹珠，且只分裂一次', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      window.__marble!.grant('split');
      window.__marble!.setEnemyHp(9999);
    });
    await page.evaluate(() => window.__marble!.fire(90));
    await page.waitForFunction(() => window.__marble!.getState()!.marbles >= 3, null, { timeout: 20_000 });
    const s = await waitPhase(page, ['ready']);
    expect(s.maxMarblesThisVolley).toBe(3);
    expect(s.marbles).toBe(0);
  });

  test('暴击：总伤害 = 碰撞数 + 暴击数（基础 1 点翻倍即多 1 点）', async ({ page }) => {
    await boot(page, '?seed=3');
    await page.evaluate(() => window.__marble!.grant('crit'));
    let s = await getState(page);
    for (let i = 0; i < 2; i++) {
      await page.evaluate(() => window.__marble!.setEnemyHp(9999));
      s = await volley(page, 70 + i * 40);
    }
    expect(s.stats.hits).toBeGreaterThan(10);
    expect(s.stats.totalDamage).toBe(s.stats.hits + s.stats.crits);
  });

  test('治疗：恢复 2 点且不超过上限', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => window.__marble!.setPlayerHp(2));
    await page.evaluate(() => window.__marble!.grant('heal'));
    expect((await getState(page)).playerHp).toBe(4);
    await page.evaluate(() => window.__marble!.grant('heal'));
    expect((await getState(page)).playerHp).toBe(RULES.maxHp);
  });

  test('击败敌人后出现 3 张互不相同的升级卡，选择后进入下一关', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => window.__marble!.setEnemyHp(1));
    await page.evaluate(() => window.__marble!.fire(90));
    await waitOverlay(page, 'upgrade');
    const cards = page.locator('[data-overlay="upgrade"] .card');
    await expect(cards).toHaveCount(3);
    const ids = await cards.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.id));
    expect(new Set(ids).size).toBe(3);
    await cards.nth(0).click();
    const s = await waitPhase(page, ['ready']);
    expect(s.level).toBe(2);
    expect(s.enemyHp).toBe(LEVELS[1].hp);
    expect(s.overlay).toBeNull();
    const owned = s.upgrades;
    const total = owned.strengthen + owned.fire + (owned.lightning ? 1 : 0) + (owned.split ? 1 : 0) + (owned.crit ? 1 : 0);
    expect(total + (ids[0] === 'heal' ? 1 : 0)).toBe(1);
  });

  test('生命归零进入失败结算，重新开始后状态干净', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      window.__marble!.grant('fire');
      window.__marble!.setPlayerHp(1);
      window.__marble!.setEnemyHp(99999);
    });
    await page.evaluate(() => window.__marble!.fire(90));
    await waitOverlay(page, 'gameover');
    expect((await getState(page)).playerHp).toBe(0);
    await page.getByTestId('restart-btn').click();
    const s = await waitPhase(page, ['ready']);
    expect(s.level).toBe(1);
    expect(s.playerHp).toBe(RULES.maxHp);
    expect(s.enemyHp).toBe(LEVELS[0].hp);
    expect(s.upgrades).toEqual({ strengthen: 0, fire: 0, lightning: false, split: false, crit: false });
    expect(s.stats.launches).toBe(0);
    expect(s.marbles).toBe(0);
    expect(s.activePegs).toBe(s.totalPegs);
    expect(s.overlay).toBeNull();
  });

  test('第五关击败即胜利', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => window.__marble!.jumpToLevel(5));
    await page.waitForTimeout(600);
    await page.evaluate(() => window.__marble!.setEnemyHp(1));
    await page.evaluate(() => window.__marble!.fire(90));
    await waitOverlay(page, 'victory');
    await expect(page.getByTestId('restart-btn')).toBeVisible();
    await page.getByTestId('restart-btn').click();
    const s = await waitPhase(page, ['ready']);
    expect(s.level).toBe(1);
  });

  test('暂停冻结弹珠与计时，继续后从原处接着飞', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => window.__marble!.setEnemyHp(9999));
    await page.evaluate(() => window.__marble!.fire(90));
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
    await waitOverlay(page, 'pause');
    const a = await getState(page);
    expect(a.paused).toBe(true);
    expect(a.marbles).toBe(1);
    await page.waitForTimeout(800);
    const b = await getState(page);
    expect(b.marblePositions).toEqual(a.marblePositions);
    expect(b.volley.total).toBe(a.volley.total);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__marble!.getState()!.paused === false);
    await page.waitForTimeout(400);
    const c = await getState(page);
    expect(c.phase === 'flying' ? c.marblePositions : []).not.toEqual(a.marblePositions);
    const d = await waitPhase(page, ['ready']);
    expect(d.stats.launches).toBe(1);
  });

  test('飞行中重新开始：不残留弹珠与旧升级', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      window.__marble!.grant('split');
      window.__marble!.grant('strengthen');
      window.__marble!.setEnemyHp(9999);
    });
    await page.evaluate(() => window.__marble!.fire(90));
    await page.waitForTimeout(600);
    expect((await getState(page)).marbles).toBeGreaterThan(0);
    await page.evaluate(() => window.__marble!.restart());
    const s = await waitPhase(page, ['ready']);
    expect(s.marbles).toBe(0);
    expect(s.stats.launches).toBe(0);
    expect(s.upgrades.split).toBe(false);
    expect(s.upgrades.strengthen).toBe(0);
    expect(s.volley.total).toBe(0);
    await page.evaluate(() => window.__marble!.setEnemyHp(9999));
    const t = await volley(page, 90);
    expect(t.maxMarblesThisVolley).toBe(1);
    expect(t.stats.totalDamage).toBe(t.stats.hits);
  });

  test('音效开关持久化到 localStorage', async ({ page }) => {
    await boot(page);
    await page.keyboard.press('m');
    expect((await getState(page)).muted).toBe(true);
    await page.reload();
    await page.waitForFunction(() => !!window.__marble?.getState());
    expect((await getState(page)).muted).toBe(true);
    await page.evaluate(() => window.__marble!.setMuted(false));
    expect((await getState(page)).muted).toBe(false);
  });

  test('竖屏布局可加载并可发射', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 480, height: 900 }, hasTouch: true });
    const page = await ctx.newPage();
    const errors = collectErrors(page);
    const s = await boot(page, '?seed=5');
    expect(s.layout).toBe('portrait');
    await page.evaluate(() => window.__marble!.setEnemyHp(9999));
    const t = await volley(page, 90);
    expect(t.stats.hits).toBeGreaterThan(0);
    expect(errors).toEqual([]);
    await ctx.close();
  });
});

test.describe('自动对局', () => {
  test('纯逻辑快进一整局到终局，过程无报错、状态机不卡死', async ({ page }) => {
    const errors = collectErrors(page);
    await boot(page, '?seed=777');
    await page.evaluate(() => window.__marble!.stopLoop());
    const priority = ['lightning', 'split', 'strengthen', 'fire', 'crit', 'heal'];
    let s = await getState(page);
    let volleys = 0;
    let steps = 0;
    while (!['gameover', 'victory'].includes(s.phase) && steps < 60 * 60 * 20) {
      if (s.phase === 'ready') {
        await page.evaluate((a) => window.__marble!.fire(a), 45 + ((volleys * 37) % 90));
        volleys += 1;
      } else if (s.phase === 'upgrading') {
        const ids = await page.locator('[data-overlay="upgrade"] .card').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.id));
        const pick = priority.find((p) => ids.includes(p)) ?? ids[0]!;
        await page.evaluate((id) => window.__marble!.pickUpgrade(id as never), pick);
      }
      await page.evaluate(() => window.__marble!.simulate(60));
      steps += 60;
      s = await getState(page);
    }
    expect(['gameover', 'victory']).toContain(s.phase);
    expect(volleys).toBeGreaterThan(0);
    expect(s.stats.launches).toBe(volleys);
    expect(s.marbles).toBe(0);
    if (s.phase === 'victory') expect(s.level).toBe(RULES.levelCount);
    else expect(s.playerHp).toBe(0);
    expect(errors).toEqual([]);
  });
});
