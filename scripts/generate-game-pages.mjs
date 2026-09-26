#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = 'https://chaoschemy.com';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

export function renderGamePage(game, baseUrl = BASE_URL) {
  const title = escapeHtml(game.title);
  const description = escapeHtml(game.description);
  const lobbyLink = game.lobbyPath
    ? `<p><a class="button" href="${escapeHtml(game.lobbyPath)}">Open collection lobby</a></p>`
    : '';
  const variants = (game.variants ?? []).map((variant) => `
        <article class="variant">
          <h2>${escapeHtml(variant.title)}</h2>
          <p>${escapeHtml(variant.description)}</p>
          <p><a class="button primary" href="${escapeHtml(variant.playPath)}">Play</a> <a class="button" href="${escapeHtml(variant.sourcePath)}">Source</a></p>
        </article>`).join('');
  const canonical = `${String(baseUrl).replace(/\/$/, '')}/games/${game.slug}/`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <title>${title} · Chaoschemy</title>
    <style>
      :root { color-scheme: dark; --bg: #080c18; --panel: rgba(14, 20, 40, .88); --text: #e8f4ff; --muted: #9aabd0; --cyan: #35f2ff; --gold: #d8c68f; }
      * { box-sizing: border-box; }
      body { min-height: 100vh; margin: 0; padding: 48px 20px; background: radial-gradient(800px 500px at 15% 8%, rgba(195,166,251,.16), transparent 60%), var(--bg); color: var(--text); font: 16px/1.7 system-ui, -apple-system, sans-serif; }
      main { width: min(900px, 100%); margin: 0 auto; }
      h1 { margin: 0 0 8px; color: var(--cyan); letter-spacing: 2px; text-shadow: 0 0 18px rgba(53,242,255,.35); }
      h2 { margin: 0; color: var(--gold); }
      p { color: var(--muted); }
      .status { color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; font-size: 12px; }
      .variants { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 28px; }
      .variant { padding: 20px; border: 1px solid rgba(142,162,200,.3); border-radius: 16px; background: var(--panel); }
      a { color: var(--cyan); }
      a.button { display: inline-block; padding: 7px 12px; border: 1px solid rgba(53,242,255,.45); border-radius: 9px; color: var(--text); text-decoration: none; }
      a.button.primary { border-color: var(--gold); background: rgba(216,198,143,.14); }
      footer { margin-top: 34px; color: var(--muted); font-size: 13px; }
    </style>
  </head>
  <body>
    <main>
      <p class="status">${escapeHtml(game.status ?? 'published')}</p>
      <h1>${title}</h1>
      <p>${escapeHtml(game.tagline ?? '')}</p>
      <p>${description}</p>
      ${lobbyLink}
      <section class="variants" aria-label="Playable variants">${variants}
      </section>
      <footer><a href="../">Game catalog</a> · <a href="../../">Chaoschemy home</a> · <a href="../../privacy.html">Privacy</a> · <a href="../../terms.html">Terms</a></footer>
    </main>
  </body>
</html>
`;
}

export async function buildGamePages(registry, outputRoot) {
  if (!registry || !Array.isArray(registry.games)) throw new TypeError('games registry must contain a games array');
  for (const game of registry.games) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(game.slug || '')) throw new TypeError(`invalid game slug: ${game.slug}`);
    const directory = join(outputRoot, game.slug);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'index.html'), renderGamePage(game));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const registryPath = process.argv[2] ?? 'site/games.json';
  const outputRoot = process.argv[3] ?? 'dist/games';
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  await buildGamePages(registry, outputRoot);
}
