import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGamePages, renderGamePage } from './generate-game-pages.mjs';

test('renders an English canonical game page with playable variants', () => {
  const html = renderGamePage({
    slug: 'marble-alchemy',
    title: 'Marble Alchemy',
    tagline: 'AI-directed browser roguelite',
    description: 'A free browser roguelite.',
    status: 'published',
    variants: [{
      title: 'Codex build',
      description: 'A bounded AI challenge.',
      playPath: '/gpt6/',
      sourcePath: 'https://github.com/convee/marble-alchemy/tree/main/gpt6',
    }],
  });
  assert.match(html, /<html lang="en">/);
  assert.match(html, /https:\/\/chaoschemy\.com\/games\/marble-alchemy\//);
  assert.match(html, /href="\/gpt6\/">Play/);
  assert.match(html, /href="https:\/\/github\.com\/convee\/marble-alchemy\/tree\/main\/gpt6">Source/);
});

test('rejects unsafe game slugs before writing pages', async () => {
  await assert.rejects(
    buildGamePages({ games: [{ slug: '../escape', variants: [] }] }, '/tmp/chaoschemy-pages-test'),
    /invalid game slug/,
  );
});
