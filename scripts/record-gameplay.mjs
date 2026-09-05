/** Records the real production UI. No fixture bridge, RNG patch, or game-state writes. */
import { chromium } from '@playwright/test';
import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const hashFile = async (path) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
const hashTree = async (root) => {
  const entries = (await readdir(root, { recursive: true })).sort();
  const files = {};
  const hash = createHash('sha256');
  for (const path of entries) {
    const fullPath = `${root}/${path}`;
    const details = await stat(fullPath);
    if (!details.isFile()) continue;
    const portablePath = path.replaceAll('\\', '/');
    const sha256 = await hashFile(fullPath);
    files[portablePath] = { sha256, size: details.size };
    hash.update(portablePath).update('\0').update(sha256).update('\0');
  }
  return { sha256: hash.digest('hex'), files };
};
const target = process.env.GAME_URL || 'http://127.0.0.1:4173/';
const targetUrl = new URL(target);
const targetOrigin = targetUrl.origin;
const targetBasePath = targetUrl.pathname.endsWith('/')
  ? targetUrl.pathname
  : targetUrl.pathname.slice(0, targetUrl.pathname.lastIndexOf('/') + 1);
const distPathForUrl = (url) => {
  const parsed = new URL(url);
  if (parsed.origin !== targetOrigin || !parsed.pathname.startsWith(targetBasePath)) return null;
  const relativePath = decodeURIComponent(parsed.pathname.slice(targetBasePath.length));
  return relativePath || 'index.html';
};
const requiredDistPaths = async (distFiles) => {
  const html = await readFile('dist/index.html', 'utf8');
  const required = new Set(['index.html']);
  for (const match of html.matchAll(/(?:src|href)\s*=\s*["']([^"'#?]+)["']/gi)) {
    const pathname = decodeURIComponent(new URL(match[1], targetUrl).pathname);
    const candidates = [
      pathname.startsWith(targetBasePath) ? pathname.slice(targetBasePath.length) : '',
      pathname.replace(/^\/+/, ''),
    ];
    const distPath = candidates.find((candidate) => candidate && distFiles[candidate]);
    if (distPath && /\.(?:css|m?js)$/i.test(distPath)) required.add(distPath);
  }
  return [...required].sort();
};
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const sourceSnapshot = async () => {
  const status = git('status', '--porcelain', '--untracked-files=all');
  const dist = await hashTree('dist');
  dist.requiredPaths = await requiredDistPaths(dist.files);
  return {
    head: git('rev-parse', 'HEAD'),
    dirty: Boolean(status),
    status,
    packageLockSha256: await hashFile('package-lock.json'),
    recorderSha256: await hashFile('scripts/record-gameplay.mjs'),
    dist,
  };
};

const sourceBefore = await sourceSnapshot();
if (sourceBefore.dirty && process.env.ALLOW_DIRTY_RECORD !== 'true') {
  throw new Error(
    'Refusing to record a dirty worktree. Commit the build inputs first, or set ALLOW_DIRTY_RECORD=true and preserve the status in the manifest.',
  );
}

const take =
  process.env.TAKE ||
  new Date()
    .toISOString()
    .replaceAll(':', '-')
    .replace(/\.\d+Z$/, 'Z');
if (!/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(take)) {
  throw new Error('TAKE must contain only letters, digits, dots, underscores, and hyphens.');
}
const folder = `artifacts/recordings/${take}`;
await mkdir('artifacts/recordings', { recursive: true });
await mkdir(folder);
const browserChannel = process.env.PLAYWRIGHT_CHANNEL || 'chrome';
const browser = await chromium.launch({
  channel: browserChannel,
  headless: true,
});
const browserVersion = browser.version();
const viewport = { width: 1440, height: 900 };
const context = await browser.newContext({
  viewport,
  deviceScaleFactor: 1,
  recordVideo: { dir: folder, size: viewport },
});
const page = await context.newPage();
const video = page.video();
const started = Date.now();
const events = [],
  errors = [],
  consoleErrors = [],
  requestFailures = [],
  requests = [],
  externalRequests = [];
const responses = [];
const responseTasks = [];
const mark = (action, data = {}) => {
  const event = { seconds: +((Date.now() - started) / 1000).toFixed(3), action, ...data };
  events.push(event);
  console.log(JSON.stringify(event));
};
const state = () =>
  page.evaluate(() => ({
    phase: document.querySelector('#phase-label').textContent,
    level: document.querySelector('#level-number').textContent,
    damage: Number(document.querySelector('#damage').textContent),
    hits: Number(document.querySelector('#hits').textContent),
    life: document.querySelector('#hp-number').textContent,
  }));
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('request', (request) => {
  const record = {
    url: request.url(),
    method: request.method(),
    resourceType: request.resourceType(),
  };
  requests.push(record);
  const parsed = new URL(request.url());
  if (
    (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
    parsed.origin !== targetOrigin
  ) {
    externalRequests.push(record);
  }
});
page.on('requestfailed', (request) =>
  requestFailures.push({ url: request.url(), error: request.failure()?.errorText }),
);
page.on('response', (response) => {
  const sameOrigin = new URL(response.url()).origin === targetOrigin;
  const distPath = sameOrigin ? distPathForUrl(response.url()) : null;
  const expected = distPath ? sourceBefore.dist.files[distPath] : undefined;
  const record = {
    url: response.url(),
    status: response.status(),
    sameOrigin,
    distPath,
    expectedSha256: expected?.sha256,
  };
  responses.push(record);
  if (sameOrigin && response.status() < 400) {
    responseTasks.push(
      response
        .body()
        .then((body) => {
          record.sha256 = createHash('sha256').update(body).digest('hex');
          record.matchesDist = Boolean(expected && record.sha256 === expected.sha256);
        })
        .catch((error) => {
          record.bodyError = String(error);
          record.matchesDist = false;
        }),
    );
  }
});
let finalUrl = target,
  result = 'unfinished',
  failure;
try {
  await page.goto(target);
  await page.locator('canvas').waitFor();
  if (await page.evaluate(() => typeof window.__alchemyTest !== 'undefined'))
    throw new Error('Refusing to record a page with a fixture bridge.');
  mark('ready', await state());
  await page.screenshot({ path: `${folder}/initial.png` });
  await page.waitForTimeout(900);
  await page.locator('#help').click();
  mark('help-open');
  await page.waitForTimeout(1800);
  await page.locator('#help-close').click();
  mark('help-close');
  for (let shot = 1; shot <= 25; shot++) {
    const box = await page.locator('canvas').boundingBox();
    const aim = 0.3,
      y = box.y + (300 / 660) * box.height;
    const x = box.x + ((260 + Math.tan(aim) * 224) / 520) * box.width;
    if (shot === 1) {
      await page.mouse.move(box.x + box.width * 0.35, y, { steps: 16 });
      await page.waitForTimeout(400);
      await page.mouse.move(box.x + box.width * 0.75, y, { steps: 20 });
      await page.waitForTimeout(400);
    }
    await page.mouse.move(x, y, { steps: 16 });
    await page.waitForTimeout(500);
    mark('shoot', { shot, aimRadians: aim, ...(await state()) });
    await page.mouse.click(x, y);
    if (shot === 1) {
      await page.waitForTimeout(950);
      await page.locator('#pause').click();
      mark('pause', await state());
      await page.waitForTimeout(1400);
      await page.locator('#resume').click();
      mark('resume', await state());
    }
    await page.waitForFunction(
      () => !document.querySelector('#launch').disabled || document.querySelector('#modal').open,
      {},
      { timeout: 24000 },
    );
    mark('settled', { shot, ...(await state()) });
    if (await page.locator('[data-upgrade]').count()) {
      const offers = await page
        .locator('[data-upgrade]')
        .evaluateAll((elements) => elements.map((el) => el.dataset.upgrade));
      const hp = Number((await page.locator('#hp-number').textContent()).split('/')[0]);
      const order =
        hp <= 2
          ? ['heal', 'split', 'lightning', 'fire', 'power', 'critical']
          : ['split', 'lightning', 'fire', 'power', 'critical', 'heal'];
      const choice = order.find((id) => offers.includes(id));
      await page.screenshot({ path: `${folder}/upgrade-${shot}.png` });
      mark('upgrade-offers', { shot, offers });
      await page.waitForTimeout(1900);
      await page.locator(`[data-upgrade="${choice}"]`).hover();
      await page.waitForTimeout(550);
      await page.locator(`[data-upgrade="${choice}"]`).click();
      mark('upgrade-picked', { shot, choice });
      await page.waitForTimeout(600);
    }
    if (await page.locator('#play-again').count()) {
      result = (await state()).phase;
      mark('run-finished', await state());
      await page.screenshot({ path: `${folder}/result.png` });
      await page.waitForTimeout(2500);
      await page.locator('#play-again').click();
      mark('restart', await state());
      await page.waitForTimeout(1000);
      break;
    }
  }
} catch (error) {
  failure = String(error);
  mark('recording-error', { error: failure });
  process.exitCode = 1;
} finally {
  await Promise.allSettled(responseTasks);
  finalUrl = page.url();
  await context.close();
  const originalVideoPath = await video.path();
  await video.saveAs(`${folder}/codex-raw.webm`);
  if (originalVideoPath !== `${folder}/codex-raw.webm`) await unlink(originalVideoPath);
  await browser.close();
  const rawVideoSha256 = await hashFile(`${folder}/codex-raw.webm`);
  const outcome = result === '炼金完成' ? 'won' : result === '实验结束' ? 'lost' : 'unfinished';
  const sourceAfter = await sourceSnapshot();
  const sourceUnchanged = JSON.stringify(sourceBefore) === JSON.stringify(sourceAfter);
  const httpErrors = responses.filter((response) => response.status >= 400);
  const responseMismatches = responses.filter(
    (response) => response.sameOrigin && response.status < 400 && !response.matchesDist,
  );
  const matchedDistPaths = new Set(
    responses.filter((response) => response.matchesDist).map((response) => response.distPath),
  );
  const unservedDistPaths = Object.keys(sourceBefore.dist.files).filter(
    (path) => !matchedDistPaths.has(path),
  );
  const unservedRequiredDistPaths = sourceBefore.dist.requiredPaths.filter(
    (path) => !matchedDistPaths.has(path),
  );
  const validationErrors = [];
  if (failure) validationErrors.push(`capture failure: ${failure}`);
  if (outcome !== 'won') validationErrors.push(`expected won outcome, received ${outcome}`);
  if (errors.length) validationErrors.push(`${errors.length} page error(s)`);
  if (consoleErrors.length) validationErrors.push(`${consoleErrors.length} console error(s)`);
  if (requestFailures.length) validationErrors.push(`${requestFailures.length} failed request(s)`);
  if (externalRequests.length)
    validationErrors.push(`${externalRequests.length} external request(s)`);
  if (httpErrors.length) validationErrors.push(`${httpErrors.length} HTTP response(s) >= 400`);
  if (responseMismatches.length) {
    validationErrors.push(`${responseMismatches.length} same-origin response/dist mismatch(es)`);
  }
  if (unservedRequiredDistPaths.length) {
    validationErrors.push(
      `${unservedRequiredDistPaths.length} required dist entry file(s) were not requested`,
    );
  }
  if (!sourceUnchanged) validationErrors.push('source snapshot changed during recording');
  const validation = {
    passed: validationErrors.length === 0,
    errors: validationErrors,
    externalRequests,
    httpErrors,
    responseMismatches,
    unservedDistPaths,
    unservedRequiredDistPaths,
  };
  await writeFile(
    `${folder}/manifest.json`,
    JSON.stringify(
      {
        schemaVersion: 2,
        take,
        target,
        finalUrl,
        capturedAt: new Date(started).toISOString(),
        completedAt: new Date().toISOString(),
        label: 'Codex 版',
        source: { before: sourceBefore, after: sourceAfter, unchanged: sourceUnchanged },
        runtime: { node: process.version },
        browser: { engine: 'Chromium', channel: browserChannel, version: browserVersion },
        viewport,
        result,
        outcome,
        events,
        errors,
        consoleErrors,
        requestFailures,
        requests,
        responses,
        validation,
        failure,
        rawVideo: {
          path: 'codex-raw.webm',
          sha256: rawVideoSha256,
          editing: 'none',
        },
        audio: 'silent: Playwright video records the browser image, not system audio',
        integrity:
          'Normal UI inputs only. No test bridge, random seed override, life/damage edit, speed-up, or generated gameplay frames.',
      },
      null,
      2,
    ),
  );
  console.log(
    `Recording: ${folder}/codex-raw.webm\nSource: ${sourceBefore.head}\nResult: ${result}\nValidation: ${validation.passed ? 'passed' : 'failed'}`,
  );
  if (!validation.passed) process.exitCode = 1;
}
