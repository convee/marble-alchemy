# Marble Alchemy

[![CI](https://github.com/convee/marble-alchemy/actions/workflows/ci.yml/badge.svg)](https://github.com/convee/marble-alchemy/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-c3a6fb.svg)](LICENSE)

Marble Alchemy is an open-source browser roguelite built around real marble collisions and meaningful upgrade choices. The Codex build uses GLM-5.3 Flash as a bounded AI Director: it writes a daily challenge before the build is published, while the browser executes the resulting rule locally and deterministically. The fable 5.1 build is the deterministic comparison baseline.

| Build | Source | Play | Description |
|---|---|---|---|
| Codex · GPT-6 AI Director | [`gpt6/`](gpt6/) | https://chaoschemy.com/gpt6/ | AI-authored daily challenge and debrief |
| Claude Code · fable 5.1 | [`fable5.1/`](fable5.1/) | https://chaoschemy.com/fable5.1/ | Deterministic baseline |

Comparison home: https://chaoschemy.com/
Game catalog: https://chaoschemy.com/games/

## What is shared

- Aim and launch a marble into a peg board. Each collision adds damage; all marbles settle before the enemy is hit.
- Surviving enemies retaliate. Defeat one to choose 1 of 3 upgrades.
- Five stages, six upgrades, mouse and touch input, procedural visuals, and synthesized audio.
- No account and no download. The AI Director never receives a browser-exposed key or controls individual physics frames.

## AI Director loop

The GPT-6 build follows: model challenge → bounded validator → local deterministic rule → five-stage run → AI debrief → daily completion and share. The project keeps model participation, game rules, retention records, and anonymous analytics separate so each claim can be audited independently.

## Evidence

| Check | GPT-6 | fable 5.1 |
|---|---:|---:|
| Automated tests | 13 rule tests, 19 browser tests | 24 unit tests, 18 end-to-end tests |
| Playable evidence | Five-stage UI run | 12 random-aim runs: 5 wins, 0 stalls |
| Additional checks | Prettier, npm audit, AI challenge validation | Per-stage hit counts and stuck-run watchdog |

The two builds use different evidence protocols; the repository does not present the results as a single score.

## Run locally

Each build has its own `package.json` and lockfile. Use Node 22.12 or newer.

```sh
cd gpt6 && npm ci && npm run dev
cd fable5.1 && npm ci && npm run dev
```

Run checks with `npm test`, `npm run test:e2e`, and `npm run build` inside either build directory.

## Repository layout

```
gpt6/          Codex GPT-6 build, tests, and evaluation evidence
fable5.1/      Claude Code fable 5.1 build, tests, and report
site/          English comparison home and SEO pages
site/games.json Single catalog registry for published games and build variants
site/games/    Public multi-game catalog page
infra/         First-party analytics Worker and D1 schema
docs/growth/   Acquisition, monitoring, and monetization records
docs/architecture/ Multi-game, account, and integration boundaries
```

Pushing `main` runs CI and assembles the two builds into `/gpt6/` and `/fable5.1/` on GitHub Pages.

## License

MIT. See [LICENSE](LICENSE).
