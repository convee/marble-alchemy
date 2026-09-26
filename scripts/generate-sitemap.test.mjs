import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSitemap, sitemapPaths } from './generate-sitemap.mjs';

test('builds stable static and registry-backed game URLs', () => {
  const registry = {
    games: [{ variants: [{ playPath: '/alpha/' }, { playPath: '/beta/' }, { playPath: '/alpha/' }] }],
  };
  assert.deepEqual(sitemapPaths(registry), [
    '/',
    '/games/',
    '/privacy.html',
    '/guide.html',
    '/support.html',
    '/terms.html',
    '/refund.html',
    '/alpha/',
    '/beta/',
  ]);
});

test('renders XML safely for a custom base URL', () => {
  const xml = renderSitemap({ games: [{ variants: [{ playPath: '/a?x=1&y=2/' }] }] }, 'https://example.test/');
  assert.match(xml, /https:\/\/example\.test\/a\?x=1&amp;y=2\//);
  assert.match(xml, /<urlset xmlns=/);
});
