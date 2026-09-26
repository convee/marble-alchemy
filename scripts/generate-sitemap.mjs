#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';

const BASE_URL = 'https://chaoschemy.com';
const STATIC_PATHS = [
  '/',
  '/games/',
  '/privacy.html',
  '/guide.html',
  '/support.html',
  '/terms.html',
  '/refund.html',
];

function xmlEscape(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[character]);
}

export function sitemapPaths(registry) {
  if (!registry || !Array.isArray(registry.games)) throw new TypeError('games registry must contain a games array');
  const paths = new Set(STATIC_PATHS);
  for (const game of registry.games) {
    if (typeof game.slug === 'string' && game.slug) paths.add(`/games/${game.slug}/`);
    for (const variant of game.variants ?? []) {
      if (typeof variant.playPath === 'string' && variant.playPath.startsWith('/')) paths.add(variant.playPath);
    }
  }
  return [...paths];
}

export function renderSitemap(registry, baseUrl = BASE_URL) {
  const base = String(baseUrl).replace(/\/$/, '');
  const urls = sitemapPaths(registry)
    .map((path) => `  <url><loc>${xmlEscape(`${base}${path}`)}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const registryPath = process.argv[2] ?? 'site/games.json';
  const outputPath = process.argv[3] ?? 'site/sitemap.xml';
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  await writeFile(outputPath, renderSitemap(registry));
}
