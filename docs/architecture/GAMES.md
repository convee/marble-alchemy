# Multi-game catalog

The public catalog is driven by [`site/games.json`](../../site/games.json). A top-level entry represents a game brand; its `variants` hold playable builds such as an AI Director build and a deterministic baseline.

The first catalog page is [`/games/`](https://chaoschemy.com/games/). Each registered game also receives a generated detail page such as [`/games/marble-alchemy/`](https://chaoschemy.com/games/marble-alchemy/). Existing `/gpt6/` and `/fable5.1/` URLs remain stable aliases while the catalog grows.

The catalog also carries the six-game `Kids Game Garden` collection from [`convee/kids-games`](https://github.com/convee/kids-games). Its lobby is `/kids-games/`, and each English-first game keeps its own path under `/kids-games/` while reusing the collection's shared locale, parent gate and AI companion runtime.

To add a game in phase one:

1. Add a new top-level entry to `site/games.json` with a stable `slug`, title, description, status, source path and one or more variants.
2. Add the build directory and its explicit Pages workflow copy/check step. The workflow validates every registry path, source URL and cover image at build time.
3. Run `node scripts/generate-game-pages.mjs` and `node scripts/generate-sitemap.mjs` to include the registry's detail and playable paths, then verify the public path, canonical, image and analytics app.

Game telemetry now includes `game_id` and `variant` alongside the existing `app` field. `scripts/analyze-events.mjs` keeps the overall funnel and adds `breakdown_by_game` so new games can be compared without relying on path names. The Pages workflow regenerates the sitemap from the registry during every build.
